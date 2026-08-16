require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const nodemailer = require("nodemailer");

const app = express();

app.use(cors());
app.use(express.json());

// ==========================================
// ARCHIVOS PÚBLICOS
// ==========================================

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ==========================================
// CATÁLOGO SEGURO DEL SERVIDOR
// ==========================================
//
// IMPORTANTE:
// El navegador NO decide estos precios.
// Tampoco decide el stock.
//
// Aunque alguien modifique el JavaScript
// desde DevTools, estos son los valores
// que realmente utilizará el servidor.
//

const PRODUCTS = {
  SAKURA: {
    price: 350,
    stock: {
      S: 5,
      M: 2,
      L: 1
    }
  },

  VIBES: {
    price: 350,
    stock: {
      S: 10,
      M: 15,
      L: 8
    }
  },

  DREAM: {
    price: 350,
    stock: {
      S: 0,
      M: 5,
      L: 4
    }
  },

  HUNTING: {
    price: 0,
    stock: {
      S: 0,
      M: 0,
      L: 0
    }
  }
};


// ==========================================
// VALIDAR CARRITO EN EL SERVIDOR
// ==========================================
//
// El cliente solamente debe mandar:
//
// title
// size
// quantity
//
// NO confiamos en:
// price
// total
// subtotal
//
// El precio se obtiene de PRODUCTS.
//

function validateAndBuildCart(items) {

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("El carrito está vacío.");
  }

  if (items.length > 50) {
    throw new Error("El carrito contiene demasiados productos.");
  }

  const requested = new Map();

  for (const item of items) {

    if (!item || typeof item !== "object") {
      throw new Error("Producto inválido.");
    }

    const title =typeof item.title === "string" ? item.title.trim().toUpperCase(): "";
const size = typeof item.size === "string" ? item.size.trim().toUpperCase(): "";
const quantity = Number(item.quantity);

    // --------------------------------------
    // PRODUCTO
    // --------------------------------------

    if (!title || !PRODUCTS[title]) {
      throw new Error(
        `El producto "${title || "desconocido"}" no existe.`
      );
    }

    const product = PRODUCTS[title];

    // --------------------------------------
    // TALLA
    // --------------------------------------

    if (!["S", "M", "L"].includes(size)) {
      throw new Error(
        `La talla seleccionada para ${title} no es válida.`
      );
    }

    // --------------------------------------
    // CANTIDAD
    // --------------------------------------

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      quantity > 20
    ) {
      throw new Error(
        `La cantidad solicitada para ${title} no es válida.`
      );
    }

    // --------------------------------------
    // AGRUPAR PRODUCTOS REPETIDOS
    // --------------------------------------
    //
    // Esto evita que alguien mande:
    //
    // SAKURA M x 2
    // SAKURA M x 2
    // SAKURA M x 2
    //
    // para intentar superar el stock.

    const key = `${title}__${size}`;

    const previous = requested.get(key) || 0;

    requested.set(
      key,
      previous + quantity
    );
  }


  // ========================================
  // VALIDAR STOCK Y CREAR CARRITO SEGURO
  // ========================================

  const cleanItems = [];

  for (const [key, quantity] of requested.entries()) {

    const [title, size] = key.split("__");

    const product = PRODUCTS[title];

    const availableStock =
      Number(product.stock[size]) || 0;

    // --------------------------------------
    // PRODUCTO AGOTADO
    // --------------------------------------

    if (availableStock <= 0) {
      throw new Error(
        `${title} en talla ${size} está agotado.`
      );
    }

    // --------------------------------------
    // STOCK INSUFICIENTE
    // --------------------------------------

    if (quantity > availableStock) {
      throw new Error(
        `No hay suficiente stock de ${title} en talla ${size}. ` +
        `Disponible: ${availableStock}.`
      );
    }

    // --------------------------------------
    // PRECIO DEL SERVIDOR
    // --------------------------------------
    //
    // MUY IMPORTANTE:
    //
    // Aquí NO usamos item.price.
    //
    // El precio sale de PRODUCTS.

    const serverPrice =
      Number(product.price);

    if (
      !Number.isFinite(serverPrice) ||
      serverPrice <= 0
    ) {
      throw new Error(
        `El precio de ${title} no es válido.`
      );
    }

    cleanItems.push({
      title,
      size,
      quantity,
      price: serverPrice
    });
  }

  return cleanItems;
}


// ==========================================
// CALCULAR TOTAL SEGURO
// ==========================================

function calculateCartTotal(items) {

  return items.reduce(
    (total, item) => {

      return (
        total +
        item.price *
        item.quantity
      );

    },
    0
  );
}


// ==========================================
// CONFIGURACIÓN DE PAYPAL
// ==========================================

const PAYPAL_CLIENT_ID =
  process.env.PAYPAL_CLIENT_ID;

const PAYPAL_SECRET =
  process.env.PAYPAL_SECRET;

const paypalBaseUrl =
  "https://api-m.paypal.com";


async function generatePayPalAccessToken() {

  if (
    !PAYPAL_CLIENT_ID ||
    !PAYPAL_SECRET
  ) {

    throw new Error(
      "Faltan PAYPAL_CLIENT_ID o PAYPAL_SECRET en las variables de entorno."
    );
  }

  const auth =
    Buffer
      .from(
        `${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`
      )
      .toString("base64");


  const response =
    await fetch(
      `${paypalBaseUrl}/v1/oauth2/token`,
      {
        method: "POST",

        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type":
            "application/x-www-form-urlencoded"
        },

        body:
          "grant_type=client_credentials"
      }
    );


  const data =
    await response.json();


  if (!response.ok) {

    console.error(
      "Error de PayPal al obtener token:",
      data
    );

    throw new Error(
      data.error_description ||
      "No se pudo obtener el token de PayPal."
    );
  }


  return data.access_token;
}


// ==========================================
// CREAR ORDEN DE PAYPAL
// ==========================================
//
// IMPORTANTE:
//
// Ya NO recibimos:
//
// amount
//
// Recibimos:
//
// items
//
// Y el servidor calcula el total.
//

app.post(
  "/create-paypal-order",
  async (req, res) => {

    try {

      const {
        items
      } = req.body;


      // ------------------------------------
      // VALIDAR CARRITO
      // ------------------------------------

      const cleanItems =
        validateAndBuildCart(items);


      // ------------------------------------
      // CALCULAR TOTAL REAL
      // ------------------------------------

      const total =
        calculateCartTotal(
          cleanItems
        );


      if (
        !Number.isFinite(total) ||
        total <= 0
      ) {

        return res.status(400).json({
          error:
            "El total del carrito no es válido."
        });
      }


      // ------------------------------------
      // TOKEN PAYPAL
      // ------------------------------------

      const accessToken =
        await generatePayPalAccessToken();


      // ------------------------------------
      // CREAR ORDEN
      // ------------------------------------

const response =
  await fetch(
    "/create-paypal-order",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json"
      },

      body: JSON.stringify({
        items: cart
      })
    }
  );


      const order =
        await response.json();


      if (!response.ok) {

        console.error(
          "Error creando orden PayPal:",
          order
        );

        return res.status(
          response.status
        ).json({

          error:
            order?.details?.[0]
              ?.description ||
            "No se pudo crear la orden de PayPal.",

          details:
            order

        });
      }


      // ------------------------------------
      // DEVOLVER ORDEN
      // ------------------------------------

      res.json(order);

    } catch (error) {

      console.error(
        "Error creando la orden de PayPal:",
        error
      );

      res.status(400).json({

        error:
          error.message ||
          "No se pudo crear la orden de PayPal."

      });
    }
  }
);


// ==========================================
// CAPTURAR ORDEN DE PAYPAL
// ==========================================

app.post(
  "/capture-paypal-order",
  async (req, res) => {

    try {

      const {
        orderID
      } = req.body;


      if (
        !orderID ||
        typeof orderID !== "string"
      ) {

        return res.status(400).json({
          error:
            "Falta el ID de la orden de PayPal."
        });
      }


      const accessToken =
        await generatePayPalAccessToken();


      const response =
        await fetch(

          `${paypalBaseUrl}/v2/checkout/orders/` +
          `${encodeURIComponent(orderID)}/capture`,

          {
            method: "POST",

            headers: {

              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${accessToken}`

            }
          }
        );


      const captureData =
        await response.json();


      if (!response.ok) {

        console.error(
          "Error capturando pago PayPal:",
          captureData
        );

        return res.status(
          response.status
        ).json({

          error:
            captureData?.details?.[0]
              ?.description ||
            "No se pudo capturar el pago.",

          details:
            captureData

        });
      }


      // ------------------------------------
      // VERIFICAR QUE PAYPAL LO COMPLETÓ
      // ------------------------------------

      if (
        captureData.status !==
        "COMPLETED"
      ) {

        return res.status(400).json({

          error:
            "El pago de PayPal no fue completado.",

          status:
            captureData.status

        });
      }


      res.json(
        captureData
      );

    } catch (error) {

      console.error(
        "Error capturando el pago de PayPal:",
        error
      );

      res.status(500).json({

        error:
          "No se pudo capturar el pago de PayPal."

      });
    }
  }
);


// ==========================================
// CONFIGURACIÓN DE STRIPE
// ==========================================

const stripeSecretKey =
  process.env.STRIPE_SECRET_KEY;


if (!stripeSecretKey) {

  console.warn(
    "ADVERTENCIA: STRIPE_SECRET_KEY no está configurada."
  );
}


const stripe = stripeSecretKey ? require("stripe")(stripeSecretKey): null;

// ==========================================
// CREAR CHECKOUT DE STRIPE
// ==========================================
//
// El navegador manda:
//
// title
// size
// quantity
//
// El servidor decide:
//
// precio
// total
//
// De esta forma no se puede modificar
// el precio desde el navegador.
//

app.post(
  "/create-stripe-checkout",
  async (req, res) => {

    try {

      if (!stripe) {

        return res.status(500).json({

          error:
            "Stripe no está configurado correctamente."

        });
      }


      const {
        items,
        customer
      } = req.body;


      // ------------------------------------
      // VALIDAR CARRITO
      // ------------------------------------

      const cleanItems =
        validateAndBuildCart(items);


      // ------------------------------------
      // CALCULAR TOTAL REAL
      // ------------------------------------

      const total =
        calculateCartTotal(
          cleanItems
        );


      if (
        !Number.isFinite(total) ||
        total <= 0
      ) {

        return res.status(400).json({

          error:
            "El total del carrito no es válido."

        });
      }


      // ------------------------------------
      // DATOS DEL CLIENTE
      // ------------------------------------

const customerName = typeof customer?.name === "string" ? customer.name.trim(): "";
const customerEmail =
typeof customer?.email === "string" ? customer.email.trim(): "";
const customerPhone =
typeof customer?.phone === "string" ? customer.phone.trim(): "";

const customerAddress =
typeof customer?.address === "string" ? customer.address.trim(): "";


      if (
        !customerName ||
        !customerEmail ||
        !customerPhone ||
        !customerAddress
      ) {

        return res.status(400).json({

          error:
            "Faltan datos del cliente."

        });
      }


      // ------------------------------------
      // CREAR LINE ITEMS SEGUROS
      // ------------------------------------

      const lineItems =
        cleanItems.map(
          (item) => ({

            price_data: {

              currency: "mxn",

              product_data: {

                name:
                  `${item.title} - Talla ${item.size}`

              },

              // --------------------------------
              // ESTE PRECIO VIENE DEL SERVIDOR
              // --------------------------------

              unit_amount:
                Math.round(
                  item.price * 100
                )

            },

            quantity:
              item.quantity

          })
        );


      // ------------------------------------
      // ORIGEN
      // ------------------------------------

      const origin =
        req.headers.origin ||
        `${req.protocol}://${req.get("host")}`;


      // ------------------------------------
      // CREAR SESIÓN STRIPE
      // ------------------------------------

      const session =
        await stripe.checkout.sessions.create({

          payment_method_types: [
            "card"
          ],

          mode:
            "payment",


          line_items:
            lineItems,


          // --------------------------------
          // CORREO DEL CLIENTE
          // --------------------------------

          customer_email:
            customerEmail,


          // --------------------------------
          // DATOS INTERNOS
          // --------------------------------
          //
          // No usamos esto para calcular
          // el precio.
          //
          // Solo sirve para identificar
          // la compra posteriormente.

          metadata: {

            customer_name:
              customerName.substring(
                0,
                500
              ),

            customer_phone:
              customerPhone.substring(
                0,
                100
              ),

            customer_address:
              customerAddress.substring(
                0,
                500
              )

          },


          success_url:
            `${origin}/exito.html`,

          cancel_url:
            `${origin}/`


        });


      // ------------------------------------
      // DEVOLVER URL DE STRIPE
      // ------------------------------------

      res.json({

        url:
          session.url

      });


    } catch (error) {

      console.error(
        "Error creando la sesión de Stripe:",
        error
      );

      res.status(400).json({

        error:
          error.message ||
          "No se pudo crear la sesión de Stripe."

      });
    }
  }
);


// ==========================================
// SISTEMA DE RESEÑAS POR CORREO
// ==========================================

const GMAIL_USER =
  process.env.GMAIL_USER;

const GMAIL_APP_PASSWORD =
  process.env.GMAIL_APP_PASSWORD;


let reviewTransporter =
  null;


if (
  GMAIL_USER &&
  GMAIL_APP_PASSWORD
) {

  reviewTransporter =
    nodemailer.createTransport({

      service:
        "gmail",

      auth: {

        user:
          GMAIL_USER,

        pass:
          GMAIL_APP_PASSWORD

      }

    });

} else {

  console.warn(
    "ADVERTENCIA: GMAIL_USER o GMAIL_APP_PASSWORD no están configurados."
  );
}


// ==========================================
// ENVIAR RESEÑA
// ==========================================

app.post(
  "/send-review",
  async (req, res) => {

    try {

      if (!reviewTransporter) {

        return res.status(500).json({

          error:
            "El sistema de reseñas por correo no está configurado."

        });
      }


      const {
        product,
        name,
        stars,
        text
      } = req.body;


      if (
        !product ||
        !name ||
        !stars ||
        !text
      ) {

        return res.status(400).json({

          error:
            "Faltan datos de la reseña."

        });
      }


      const starsNumber =
        Number(stars);


      if (
        !Number.isInteger(
          starsNumber
        ) ||
        starsNumber < 1 ||
        starsNumber > 5
      ) {

        return res.status(400).json({

          error:
            "La calificación no es válida."

        });
      }


      const starsDisplay =
        "★".repeat(
          starsNumber
        ) +
        "☆".repeat(
          5 - starsNumber
        );


      await reviewTransporter.sendMail({

        from:
          `"FUTURESTAR - Reseñas" <${GMAIL_USER}>`,

        to:
          GMAIL_USER,

        subject:
          `Nueva reseña de ${String(product).substring(0, 100)}`,

        text: `

Nueva reseña recibida en FUTURESTAR

Producto:
${String(product).substring(0, 200)}

Nombre:
${String(name).substring(0, 200)}

Calificación:
${starsDisplay} (${starsNumber}/5)

Reseña:
${String(text).substring(0, 3000)}

------------------------------------------

Esta reseña fue enviada desde la tienda FUTURESTAR.

        `

      });


      res.json({

        success:
          true,

        message:
          "Reseña enviada correctamente."

      });


    } catch (error) {

      console.error(
        "Error enviando la reseña:",
        error
      );

      res.status(500).json({

        error:
          "No se pudo enviar la reseña."

      });
    }
  }
);


// ==========================================
// RUTA DE PRUEBA DEL SERVIDOR
// ==========================================

app.get(
  "/api/status",
  (req, res) => {

    res.json({

      success:
        true,

      message:
        "Servidor FUTURESTAR funcionando correctamente.",

      paypal:
        !!PAYPAL_CLIENT_ID &&
        !!PAYPAL_SECRET,

      stripe:
        !!stripeSecretKey,

      // Mercado Pago ya NO se utiliza.
      mercadoPago:
        false,

      gmail:
        !!GMAIL_USER &&
        !!GMAIL_APP_PASSWORD

    });
  }
);


// ==========================================
// MANEJO DE ERRORES
// ==========================================

app.use(
  (
    err,
    req,
    res,
    next
  ) => {

    console.error(
      "Error general del servidor:",
      err
    );

    res.status(500).json({

      error:
        "Ocurrió un error interno en el servidor."

    });
  }
);


// ==========================================
// INICIAR SERVIDOR
// ==========================================

const PORT =
  process.env.PORT || 4242;


app.listen(
  PORT,
  () => {

    console.log(
      `Servidor FUTURESTAR ejecutándose en puerto ${PORT}`
    );

    console.log(
      `Puerto: ${PORT}`
    );

    console.log(
      `PayPal configurado: ${
        !!PAYPAL_CLIENT_ID &&
        !!PAYPAL_SECRET
      }`
    );

    console.log(
      `Stripe configurado: ${
        !!stripeSecretKey
      }`
    );

    console.log(
      "Mercado Pago: DESACTIVADO"
    );

    console.log(
      `Gmail configurado: ${
        !!GMAIL_USER &&
        !!GMAIL_APP_PASSWORD
      }`
    );

  }
);