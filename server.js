require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const nodemailer = require("nodemailer");
const fs = require("fs");

const app = express();


// ============================================================
// CONFIGURACIÓN GENERAL
// ============================================================

app.use(cors());


// ============================================================
// ARCHIVOS DE INVENTARIO Y ÓRDENES
// ============================================================

const INVENTORY_FILE =
  path.join(__dirname, "inventory.json");

const ORDERS_FILE =
  path.join(__dirname, "orders.json");


// ============================================================
// INVENTARIO INICIAL
// ============================================================
//
// IMPORTANTE:
//
// Estos valores solamente se utilizan si inventory.json
// todavía no existe.
//
// Después, el servidor utiliza inventory.json.
//

const DEFAULT_INVENTORY = {

  SAKURA: {

    price: 350,

    stock: {
      S: 1,
      M: 0,
      L: 0
    }

  },

  VIBES: {

    price: 350,

    stock: {
      S: 1,
      M: 1,
      L: 0
    }

  },

  DREAM: {

    price: 350,

    stock: {
      S: 1,
      M: 1,
      L: 0
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


// ============================================================
// CREAR ARCHIVOS SI NO EXISTEN
// ============================================================

if (!fs.existsSync(INVENTORY_FILE)) {

  fs.writeFileSync(
    INVENTORY_FILE,
    JSON.stringify(
      DEFAULT_INVENTORY,
      null,
      2
    )
  );

}


if (!fs.existsSync(ORDERS_FILE)) {

  fs.writeFileSync(
    ORDERS_FILE,
    JSON.stringify(
      {},
      null,
      2
    )
  );

}


// ============================================================
// FUNCIONES PARA INVENTARIO
// ============================================================

function readInventory() {

  try {

    const data =
      fs.readFileSync(
        INVENTORY_FILE,
        "utf8"
      );

    return JSON.parse(data);

  } catch (error) {

    console.error(
      "Error leyendo inventory.json:",
      error
    );

    throw new Error(
      "No se pudo leer el inventario."
    );

  }

}


function saveInventory(
  inventory
) {

  const tempFile =
    `${INVENTORY_FILE}.tmp`;

  fs.writeFileSync(
    tempFile,
    JSON.stringify(
      inventory,
      null,
      2
    )
  );

  fs.renameSync(
    tempFile,
    INVENTORY_FILE
  );

}


// ============================================================
// FUNCIONES PARA ÓRDENES
// ============================================================

function readOrders() {

  try {

    const data =
      fs.readFileSync(
        ORDERS_FILE,
        "utf8"
      );

    return JSON.parse(data);

  } catch (error) {

    console.error(
      "Error leyendo orders.json:",
      error
    );

    throw new Error(
      "No se pudieron leer las órdenes."
    );

  }

}


function saveOrders(
  orders
) {

  const tempFile =
    `${ORDERS_FILE}.tmp`;

  fs.writeFileSync(
    tempFile,
    JSON.stringify(
      orders,
      null,
      2
    )
  );

  fs.renameSync(
    tempFile,
    ORDERS_FILE
  );

}


// ============================================================
// RESERVAS
// ============================================================
//
// Una reserva dura 30 minutos.
//
// Stripe también se configurará para expirar aproximadamente
// en este mismo periodo.
//

const RESERVATION_TIME =
  30 * 60 * 1000;


// ============================================================
// LIBERAR RESERVAS EXPIRADAS
// ============================================================

function cleanupExpiredReservations() {

  const orders =
    readOrders();

  const inventory =
    readInventory();

  const now =
    Date.now();

  let changed =
    false;


  for (
    const orderId of Object.keys(orders)
  ) {

    const order =
      orders[orderId];


    if (
      !order ||
      order.status !== "reserved"
    ) {

      continue;

    }


    const createdAt =
      Number(order.createdAt) || 0;


    if (
      !createdAt
    ) {

      continue;

    }


    if (
      now - createdAt <
      RESERVATION_TIME
    ) {

      continue;

    }


    // ========================================================
    // DEVOLVER STOCK
    // ========================================================

    for (
      const item of order.items || []
    ) {

      if (
        inventory[item.title] &&
        inventory[item.title].stock &&
        inventory[item.title].stock[item.size] !== undefined
      ) {

        inventory[item.title].stock[item.size] +=
          Number(item.quantity) || 0;

      }

    }


    order.status =
      "expired";

    order.expiredAt =
      new Date().toISOString();

    changed =
      true;

  }


  if (
    changed
  ) {

    saveInventory(
      inventory
    );

    saveOrders(
      orders
    );

  }

}


// ============================================================
// VALIDAR Y CONSTRUIR CARRITO
// ============================================================
//
// EL CLIENTE SOLO PUEDE ENVIAR:
//
// title
// size
// quantity
//
// NO CONFIAMOS EN:
//
// price
// total
// subtotal
//
// El precio siempre sale de inventory.json.
//

function validateAndBuildCart(
  items
) {

  cleanupExpiredReservations();


  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {

    throw new Error(
      "El carrito está vacío."
    );

  }


  if (
    items.length > 50
  ) {

    throw new Error(
      "El carrito contiene demasiados productos."
    );

  }


  const inventory =
    readInventory();

  const requested =
    new Map();


  for (
    const item of items
  ) {

    if (
      !item ||
      typeof item !== "object"
    ) {

      throw new Error(
        "Producto inválido."
      );

    }


    const title =
      typeof item.title === "string"
        ? item.title
            .trim()
            .toUpperCase()
        : "";


    const size =
      typeof item.size === "string"
        ? item.size
            .trim()
            .toUpperCase()
        : "";


    const quantity =
      Number(
        item.quantity
      );


    // ========================================================
    // PRODUCTO
    // ========================================================

    if (
      !title ||
      !inventory[title]
    ) {

      throw new Error(
        `El producto "${title || "desconocido"}" no existe.`
      );

    }


    // ========================================================
    // TALLA
    // ========================================================

    if (
      !["S", "M", "L"].includes(
        size
      )
    ) {

      throw new Error(
        `La talla seleccionada para ${title} no es válida.`
      );

    }


    // ========================================================
    // CANTIDAD
    // ========================================================

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      quantity > 20
    ) {

      throw new Error(
        `La cantidad solicitada para ${title} no es válida.`
      );

    }


    // ========================================================
    // AGRUPAR PRODUCTOS REPETIDOS
    // ========================================================

    const key =
      `${title}__${size}`;


    const previous =
      requested.get(key) || 0;


    const newQuantity =
      previous + quantity;


    if (
      newQuantity > 20
    ) {

      throw new Error(
        `La cantidad total solicitada para ${title} en talla ${size} es demasiado grande.`
      );

    }


    requested.set(
      key,
      newQuantity
    );

  }


  // ========================================================
  // CREAR CARRITO LIMPIO
  // ========================================================

  const cleanItems =
    [];


  for (
    const [key, quantity]
    of requested.entries()
  ) {

    const [
      title,
      size
    ] =
      key.split("__");


    const product =
      inventory[title];


    const availableStock =
      Number(
        product.stock?.[size]
      ) || 0;


    // ======================================================
    // STOCK
    // ======================================================

    if (
      availableStock <= 0
    ) {

      throw new Error(
        `${title} en talla ${size} está agotado.`
      );

    }


    if (
      quantity > availableStock
    ) {

      throw new Error(
        `No hay suficiente stock de ${title} en talla ${size}. ` +
        `Disponible: ${availableStock}.`
      );

    }


    // ======================================================
    // PRECIO DEL SERVIDOR
    // ======================================================

    const price =
      Number(
        product.price
      );


    if (
      !Number.isFinite(price) ||
      price <= 0
    ) {

      throw new Error(
        `El precio de ${title} no es válido.`
      );

    }


    cleanItems.push({

      title,

      size,

      quantity,

      price

    });

  }


  return cleanItems;

}


// ============================================================
// CALCULAR TOTAL
// ============================================================

function calculateCartTotal(
  items
) {

  const total =
    items.reduce(
      (
        sum,
        item
      ) => {

        return (
          sum +
          (
            item.price *
            item.quantity
          )
        );

      },
      0
    );


  return Number(
    total.toFixed(2)
  );

}


// ============================================================
// RESERVAR STOCK
// ============================================================

function reserveStock(
  cleanItems,
  orderId,
  paymentProvider
) {

  cleanupExpiredReservations();


  const inventory =
    readInventory();

  const orders =
    readOrders();


  // ========================================================
  // COMPROBAR QUE TODAS LAS UNIDADES EXISTEN
  // ========================================================

  for (
    const item of cleanItems
  ) {

    const product =
      inventory[item.title];


    if (
      !product
    ) {

      throw new Error(
        `El producto ${item.title} no existe.`
      );

    }


    const available =
      Number(
        product.stock?.[item.size]
      ) || 0;


    if (
      item.quantity > available
    ) {

      throw new Error(
        `No hay suficiente stock de ${item.title} en talla ${item.size}. ` +
        `Disponible: ${available}.`
      );

    }

  }


  // ========================================================
  // DESCONTAR STOCK
  // ========================================================

  for (
    const item of cleanItems
  ) {

    inventory[
      item.title
    ].stock[
      item.size
    ] -= Number(
      item.quantity
    );

  }


  // ========================================================
  // GUARDAR RESERVA
  // ========================================================

  orders[
    orderId
  ] = {

    id:
      orderId,

    provider:
      paymentProvider,

    status:
      "reserved",

    createdAt:
      Date.now(),

    items:
      cleanItems.map(
        item => ({

          title:
            item.title,

          size:
            item.size,

          quantity:
            item.quantity,

          price:
            item.price

        })
      )

  };


  saveInventory(
    inventory
  );

  saveOrders(
    orders
  );

}


// ============================================================
// COMPLETAR ORDEN
// ============================================================

function completeOrder(
  orderId
) {

  const orders =
    readOrders();


  const order =
    orders[orderId];


  if (
    !order
  ) {

    throw new Error(
      "La orden no existe."
    );

  }


  // ========================================================
  // SI YA ESTÁ COMPLETADA
  // ========================================================

  if (
    order.status ===
    "completed"
  ) {

    return order;

  }


  // ========================================================
  // SOLO UNA RESERVA PUEDE COMPLETARSE
  // ========================================================

  if (
    order.status !==
    "reserved"
  ) {

    throw new Error(
      `La orden no puede completarse porque su estado actual es "${order.status}".`
    );

  }


  order.status =
    "completed";

  order.completedAt =
    new Date().toISOString();


  saveOrders(
    orders
  );


  return order;

}


// ============================================================
// LIBERAR ORDEN
// ============================================================

function releaseOrder(
  orderId
) {

  const orders =
    readOrders();

  const inventory =
    readInventory();


  const order =
    orders[orderId];


  if (
    !order
  ) {

    return false;

  }


  if (
    order.status !==
    "reserved"
  ) {

    return false;

  }


  // ========================================================
  // DEVOLVER STOCK
  // ========================================================

  for (
    const item of order.items || []
  ) {

    if (
      inventory[item.title] &&
      inventory[item.title].stock &&
      inventory[item.title].stock[item.size] !== undefined
    ) {

      inventory[
        item.title
      ].stock[
        item.size
      ] += Number(
        item.quantity
      ) || 0;

    }

  }


  order.status =
    "cancelled";

  order.cancelledAt =
    new Date().toISOString();


  saveInventory(
    inventory
  );

  saveOrders(
    orders
  );


  return true;

}


// ============================================================
// STRIPE
// ============================================================

const stripeSecretKey =
  process.env.STRIPE_SECRET_KEY;

console.log(
  "Stripe configurado en modo:",
  stripeSecretKey?.startsWith("sk_test_")
    ? "TEST"
    : stripeSecretKey?.startsWith("sk_live_")
      ? "LIVE"
      : "DESCONOCIDO"
);

const stripeWebhookSecret =
  process.env.STRIPE_WEBHOOK_SECRET;


const stripe =
  stripeSecretKey
    ? require("stripe")(
        stripeSecretKey
      )
    : null;


// ============================================================
// STRIPE WEBHOOK
// ============================================================
//
// IMPORTANTE:
//
// Esta ruta DEBE estar antes de express.json().
//
// Stripe necesita el body original.
//

app.post(
  "/stripe-webhook",
  express.raw({
    type:
      "application/json"
  }),
  (req, res) => {

    if (
      !stripe
    ) {

      return res.status(
        500
      ).send(
        "Stripe no está configurado."
      );

    }


    if (
      !stripeWebhookSecret
    ) {

      console.error(
        "Falta STRIPE_WEBHOOK_SECRET."
      );


      return res.status(
        500
      ).send(
        "Falta STRIPE_WEBHOOK_SECRET."
      );

    }


    let event;


    try {

      const signature =
        req.headers[
          "stripe-signature"
        ];


      event =
        stripe.webhooks.constructEvent(
          req.body,
          signature,
          stripeWebhookSecret
        );

    } catch (
      error
    ) {

      console.error(
        "Error verificando webhook Stripe:",
        error.message
      );


      return res.status(
        400
      ).send(
        `Webhook Error: ${error.message}`
      );

    }


    // ========================================================
    // PAGO COMPLETADO
    // ========================================================

    if (
      event.type ===
      "checkout.session.completed"
    ) {

      const session =
        event.data.object;


      const orderId =
        session.metadata?.order_id;


      if (
        orderId
      ) {

        try {

          const orders =
            readOrders();

          const order =
            orders[orderId];


          if (
            !order
          ) {

            console.error(
              `No se encontró la reserva Stripe ${orderId}.`
            );

          } else if (
            order.provider !==
            "stripe"
          ) {

            console.error(
              `La orden ${orderId} no pertenece a Stripe.`
            );

          } else {

            completeOrder(
              orderId
            );


            console.log(
              `Orden Stripe completada: ${orderId}`
            );

          }

        } catch (
          error
        ) {

          console.error(
            "Error completando orden Stripe:",
            error
          );

        }

      }

    }


    // ========================================================
    // SESIÓN STRIPE EXPIRADA
    // ========================================================

    if (
      event.type ===
      "checkout.session.expired"
    ) {

      const session =
        event.data.object;


      const orderId =
        session.metadata?.order_id;


      if (
        orderId
      ) {

        try {

          const released =
            releaseOrder(
              orderId
            );


          if (
            released
          ) {

            console.log(
              `Reserva Stripe liberada: ${orderId}`
            );

          }

        } catch (
          error
        ) {

          console.error(
            "Error liberando reserva Stripe:",
            error
          );

        }

      }

    }


    res.json({
      received:
        true
    });

  }
);


// ============================================================
// JSON
// ============================================================

app.use(
  express.json()
);


// ============================================================
// ARCHIVOS PÚBLICOS
// ============================================================

app.use(
  express.static(
    path.join(
      __dirname,
      "public"
    )
  )
);


app.get(
  "/",
  (req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        "public",
        "index.html"
      )
    );

  }
);


// ============================================================
// PAYPAL
// ============================================================

const PAYPAL_CLIENT_ID =
  process.env.PAYPAL_CLIENT_ID;

const PAYPAL_SECRET =
  process.env.PAYPAL_SECRET;


const paypalBaseUrl =
  "https://api-m.paypal.com";


// ============================================================
// TOKEN PAYPAL
// ============================================================

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
      .toString(
        "base64"
      );


  const response =
    await fetch(
      `${paypalBaseUrl}/v1/oauth2/token`,
      {

        method:
          "POST",

        headers: {

          Authorization:
            `Basic ${auth}`,

          "Content-Type":
            "application/x-www-form-urlencoded"

        },

        body:
          "grant_type=client_credentials"

      }
    );


  const data =
    await response.json();


  if (
    !response.ok
  ) {

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


// ============================================================
// CREAR ORDEN PAYPAL
// ============================================================

app.post(
  "/create-paypal-order",
  async (req, res) => {

    let reservationId =
      null;


    try {

      const {
        items
      } =
        req.body;


      // ======================================================
      // VALIDAR CARRITO
      // ======================================================

      const cleanItems =
        validateAndBuildCart(
          items
        );


      // ======================================================
      // CALCULAR TOTAL
      // ======================================================

      const total =
        calculateCartTotal(
          cleanItems
        );


      if (
        !Number.isFinite(total) ||
        total <= 0
      ) {

        return res.status(
          400
        ).json({

          error:
            "El total del carrito no es válido."

        });

      }


      // ======================================================
      // CREAR ID DE RESERVA
      // ======================================================

      reservationId =
        `paypal_${Date.now()}_${Math.random()
          .toString(36)
          .substring(
            2,
            10
          )}`;


      // ======================================================
      // RESERVAR STOCK
      // ======================================================

      reserveStock(
        cleanItems,
        reservationId,
        "paypal"
      );


      // ======================================================
      // TOKEN PAYPAL
      // ======================================================

      const accessToken =
        await generatePayPalAccessToken();


      // ======================================================
      // CREAR ORDEN PAYPAL
      // ======================================================

      const response =
        await fetch(
          `${paypalBaseUrl}/v2/checkout/orders`,
          {

            method:
              "POST",

            headers: {

              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${accessToken}`

            },

            body:
              JSON.stringify({

                intent:
                  "CAPTURE",

                purchase_units: [

                  {

                    reference_id:
                      reservationId,

                    amount: {

                      currency_code:
                        "MXN",

                      value:
                        total.toFixed(2)

                    }

                  }

                ]

              })

          }
        );


      const order =
        await response.json();


      // ======================================================
      // ERROR PAYPAL
      // ======================================================

      if (
        !response.ok
      ) {

        releaseOrder(
          reservationId
        );


        reservationId =
          null;


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


      // ======================================================
      // GUARDAR ID REAL DE PAYPAL
      // ======================================================

      const orders =
        readOrders();


      const reservation =
        orders[
          reservationId
        ];


      if (
        !reservation
      ) {

        throw new Error(
          "No se encontró la reserva de PayPal."
        );

      }


      reservation.paypalOrderId =
        order.id;


      orders[
        reservationId
      ] =
        reservation;


      saveOrders(
        orders
      );


      // ======================================================
      // DEVOLVER ORDEN AL FRONTEND
      // ======================================================

      res.json(
        order
      );


    } catch (
      error
    ) {

      console.error(
        "Error creando orden PayPal:",
        error
      );


      if (
        reservationId
      ) {

        try {

          releaseOrder(
            reservationId
          );

        } catch (
          releaseError
        ) {

          console.error(
            "Error liberando reserva PayPal:",
            releaseError
          );

        }

      }


      res.status(
        400
      ).json({

        error:
          error.message ||
          "No se pudo crear la orden de PayPal."

      });

    }

  }
);


// ============================================================
// CAPTURAR ORDEN PAYPAL
// ============================================================

app.post(
  "/capture-paypal-order",
  async (req, res) => {

    try {

      const {
        orderID
      } =
        req.body;


      if (
        !orderID ||
        typeof orderID !==
        "string"
      ) {

        return res.status(
          400
        ).json({

          error:
            "Falta el ID de la orden de PayPal."

        });

      }


      // ======================================================
      // BUSCAR RESERVA
      // ======================================================

      const orders =
        readOrders();


      let reservationId =
        null;

      let reservation =
        null;


      for (
        const id of Object.keys(
          orders
        )
      ) {

        const order =
          orders[id];


        if (
          order &&
          order.provider === "paypal" &&
          order.paypalOrderId === orderID
        ) {

          reservationId =
            id;

          reservation =
            order;

          break;

        }

      }


      if (
        !reservation ||
        !reservationId
      ) {

        return res.status(
          404
        ).json({

          error:
            "No se encontró la reserva asociada a esta orden de PayPal."

        });

      }


      // ======================================================
      // VERIFICAR ESTADO DE RESERVA
      // ======================================================

      if (
        reservation.status !==
        "reserved"
      ) {

        return res.status(
          400
        ).json({

          error:
            `La orden no puede capturarse porque su estado es "${reservation.status}".`

        });

      }


      // ======================================================
      // VERIFICAR EXPIRACIÓN DE RESERVA
      // ======================================================

      const createdAt =
        Number(
          reservation.createdAt
        ) || 0;


      if (
        createdAt &&
        Date.now() - createdAt >=
        RESERVATION_TIME
      ) {

        releaseOrder(
          reservationId
        );


        return res.status(
          400
        ).json({

          error:
            "La reserva de esta compra expiró. Vuelve a iniciar el pago."

        });

      }


      // ======================================================
      // TOKEN PAYPAL
      // ======================================================

      const accessToken =
        await generatePayPalAccessToken();


      // ======================================================
      // CAPTURAR
      // ======================================================

      const response =
        await fetch(

          `${paypalBaseUrl}/v2/checkout/orders/` +
          `${encodeURIComponent(orderID)}/capture`,

          {

            method:
              "POST",

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


      // ======================================================
      // ERROR CAPTURANDO
      // ======================================================

      if (
        !response.ok
      ) {

        console.error(
          "Error capturando PayPal:",
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


      // ======================================================
      // VERIFICAR COMPLETED
      // ======================================================

      if (
        captureData.status !==
        "COMPLETED"
      ) {

        return res.status(
          400
        ).json({

          error:
            "El pago de PayPal no fue completado.",

          status:
            captureData.status

        });

      }


      // ======================================================
      // VERIFICAR MONTO CAPTURADO
      // ======================================================

      const expectedTotal =
        calculateCartTotal(
          reservation.items
        );


      const capturedAmount =
        Number(
          captureData
            ?.purchase_units?.[0]
            ?.payments
            ?.captures?.[0]
            ?.amount
            ?.value
        );


      if (
        !Number.isFinite(
          capturedAmount
        ) ||
        Math.abs(
          capturedAmount -
          expectedTotal
        ) > 0.01
      ) {

        console.error(
          "Monto PayPal inesperado.",
          {
            expectedTotal,
            capturedAmount
          }
        );


        return res.status(
          400
        ).json({

          error:
            "El monto capturado por PayPal no coincide con el total de la orden."

        });

      }


      // ======================================================
      // COMPLETAR ORDEN
      // ======================================================

      const completedOrder =
        completeOrder(
          reservationId
        );


      console.log(
        `Pago PayPal completado: ${orderID}`
      );


      res.json({

        ...captureData,

        orderStatus:
          completedOrder.status,

        internalOrderId:
          reservationId

      });


    } catch (
      error
    ) {

      console.error(
        "Error capturando PayPal:",
        error
      );


      res.status(
        500
      ).json({

        error:
          error.message ||
          "No se pudo capturar el pago de PayPal."

      });

    }

  }
);


// ============================================================
// LIBERAR RESERVA PAYPAL
// ============================================================

app.post(
  "/release-paypal-order",
  (req, res) => {

    try {

      const {
        orderID
      } =
        req.body;


      if (
        !orderID ||
        typeof orderID !==
        "string"
      ) {

        return res.status(
          400
        ).json({

          error:
            "Falta el ID de la orden."

        });

      }


      const orders =
        readOrders();


      let reservationId =
        null;


      for (
        const id of Object.keys(
          orders
        )
      ) {

        const order =
          orders[id];


        if (
          order &&
          order.provider === "paypal" &&
          order.paypalOrderId === orderID
        ) {

          reservationId =
            id;

          break;

        }

      }


      if (
        reservationId
      ) {

        releaseOrder(
          reservationId
        );

      }


      res.json({

        success:
          true

      });


    } catch (
      error
    ) {

      console.error(
        "Error liberando reserva PayPal:",
        error
      );


      res.status(
        500
      ).json({

        error:
          "No se pudo liberar la reserva."

      });

    }

  }
);


// ============================================================
// STRIPE - CREAR CHECKOUT
// ============================================================

app.post(
  "/create-stripe-checkout",
  async (req, res) => {

    let reservationId =
      null;


    try {

      if (
        !stripe
      ) {

        return res.status(
          500
        ).json({

          error:
            "Stripe no está configurado correctamente."

        });

      }


      const {
        items,
        customer
      } =
        req.body;


      // ======================================================
      // VALIDAR CARRITO
      // ======================================================

      const cleanItems =
        validateAndBuildCart(
          items
        );


      // ======================================================
      // TOTAL
      // ======================================================

      const total =
        calculateCartTotal(
          cleanItems
        );


      if (
        !Number.isFinite(total) ||
        total <= 0
      ) {

        return res.status(
          400
        ).json({

          error:
            "El total del carrito no es válido."

        });

      }


      // ======================================================
      // CLIENTE
      // ======================================================

      const customerName =
        typeof customer?.name ===
        "string"
          ? customer.name.trim()
          : "";


      const customerEmail =
        typeof customer?.email ===
        "string"
          ? customer.email.trim()
          : "";


      const customerPhone =
        typeof customer?.phone ===
        "string"
          ? customer.phone.trim()
          : "";


      const customerAddress =
        typeof customer?.address ===
        "string"
          ? customer.address.trim()
          : "";


      if (
        !customerName ||
        !customerEmail ||
        !customerPhone ||
        !customerAddress
      ) {

        return res.status(
          400
        ).json({

          error:
            "Faltan datos del cliente."

        });

      }


      // ======================================================
      // RESERVA
      // ======================================================

      reservationId =
        `stripe_${Date.now()}_${Math.random()
          .toString(36)
          .substring(
            2,
            10
          )}`;


      reserveStock(
        cleanItems,
        reservationId,
        "stripe"
      );


      // ======================================================
      // ORIGEN
      // ======================================================

      const origin =
        req.headers.origin ||
        `${req.protocol}://${req.get("host")}`;


      // ======================================================
      // LINE ITEMS
      // ======================================================

      const lineItems =
        cleanItems.map(
          item => ({

            price_data: {

              currency:
                "mxn",

              product_data: {

                name:
                  `${item.title} - Talla ${item.size}`

              },

              unit_amount:
                Math.round(
                  item.price * 100
                )

            },

            quantity:
              item.quantity

          })
        );


      // ======================================================
      // EXPIRACIÓN STRIPE
      // ======================================================
      //
      // La sesión se hace expirar aproximadamente al mismo
      // tiempo que nuestra reserva.
      //

      const stripeExpiresAt =
        Math.floor(
          (
            Date.now() +
            RESERVATION_TIME
          ) / 1000
        );


      // ======================================================
      // CREAR SESIÓN STRIPE
      // ======================================================

      const session =
        await stripe.checkout.sessions.create({

          payment_method_types: [
            "card"
          ],

          mode:
            "payment",

          line_items:
            lineItems,

          customer_email:
            customerEmail,

          expires_at:
            stripeExpiresAt,

          metadata: {

            // ==================================================
            // IMPORTANTE:
            //
            // Guardamos reservationId.
            //
            // NO cambiamos la llave de orders.
            //
            // Esto permite que el webhook encuentre la orden.
            // ==================================================

            order_id:
              reservationId,

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


      // ======================================================
      // GUARDAR ID DE STRIPE
      // ======================================================
      //
      // MUY IMPORTANTE:
      //
      // NO cambiamos la llave reservationId.
      //
      // El webhook utiliza metadata.order_id.
      //

      const orders =
        readOrders();


      const reservation =
        orders[
          reservationId
        ];


      if (
        !reservation
      ) {

        throw new Error(
          "No se encontró la reserva después de crear la sesión de Stripe."
        );

      }


      reservation.stripeSessionId =
        session.id;

      reservation.stripeStatus =
        "created";


      orders[
        reservationId
      ] =
        reservation;


      saveOrders(
        orders
      );


      // ======================================================
      // DEVOLVER URL
      // ======================================================

      res.json({

        url:
          session.url

      });


    } catch (
      error
    ) {

      console.error(
        "Error creando checkout Stripe:",
        error
      );


      // ======================================================
      // SI STRIPE FALLA:
      // DEVOLVER STOCK
      // ======================================================

      if (
        reservationId
      ) {

        try {

          releaseOrder(
            reservationId
          );

        } catch (
          releaseError
        ) {

          console.error(
            "Error liberando reserva Stripe:",
            releaseError
          );

        }

      }


      res.status(
        400
      ).json({

        error:
          error.message ||
          "No se pudo crear la sesión de Stripe."

      });

    }

  }
);


// ============================================================
// GMAIL
// ============================================================

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


// ============================================================
// ENVIAR RESEÑA
// ============================================================

app.post(
  "/send-review",
  async (req, res) => {

    try {

      if (
        !reviewTransporter
      ) {

        return res.status(
          500
        ).json({

          error:
            "El sistema de reseñas por correo no está configurado."

        });

      }


      const {
        product,
        name,
        stars,
        text
      } =
        req.body;


      if (
        !product ||
        !name ||
        !stars ||
        !text
      ) {

        return res.status(
          400
        ).json({

          error:
            "Faltan datos de la reseña."

        });

      }


      const starsNumber =
        Number(
          stars
        );


      if (
        !Number.isInteger(
          starsNumber
        ) ||
        starsNumber < 1 ||
        starsNumber > 5
      ) {

        return res.status(
          400
        ).json({

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


    } catch (
      error
    ) {

      console.error(
        "Error enviando la reseña:",
        error
      );


      res.status(
        500
      ).json({

        error:
          "No se pudo enviar la reseña."

      });

    }

  }
);


// ============================================================
// API STATUS
// ============================================================

app.get(
  "/api/status",
  (req, res) => {

    try {

      cleanupExpiredReservations();


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

        stripeWebhook:
          !!stripeWebhookSecret,

        mercadoPago:
          false,

        gmail:
          !!GMAIL_USER &&
          !!GMAIL_APP_PASSWORD

      });

    } catch (
      error
    ) {

      console.error(
        "Error en /api/status:",
        error
      );


      res.status(
        500
      ).json({

        success:
          false,

        error:
          "No se pudo consultar el estado del servidor."

      });

    }

  }
);


// ============================================================
// INVENTARIO PÚBLICO
// ============================================================
//
// NO DEVOLVEMOS PRECIOS.
//
// Solo stock.
//

app.get(
  "/api/inventory",
  (req, res) => {

    try {

      cleanupExpiredReservations();


      const inventory =
        readInventory();


      const publicInventory =
        {};


      for (
        const title of Object.keys(
          inventory
        )
      ) {

        publicInventory[
          title
        ] = {

          stock:
            inventory[
              title
            ].stock

        };

      }


      res.json(
        publicInventory
      );


    } catch (
      error
    ) {

      console.error(
        "Error obteniendo inventario:",
        error
      );


      res.status(
        500
      ).json({

        error:
          "No se pudo obtener el inventario."

      });

    }

  }
);


// ============================================================
// MANEJO GENERAL DE ERRORES
// ============================================================

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


    if (
      res.headersSent
    ) {

      return next(
        err
      );

    }


    res.status(
      500
    ).json({

      error:
        "Ocurrió un error interno en el servidor."

    });

  }
);


// ============================================================
// INICIAR SERVIDOR
// ============================================================

const PORT =
  process.env.PORT ||
  4242;


app.listen(
  PORT,
  () => {

    console.log(
      "=========================================="
    );

    console.log(
      "SERVIDOR FUTURESTAR"
    );

    console.log(
      "=========================================="
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
      `Stripe Webhook configurado: ${
        !!stripeWebhookSecret
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

    console.log(
      "=========================================="
    );

  }
);
