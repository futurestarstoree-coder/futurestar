require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const nodemailer = require("nodemailer");

const app = express();

app.use(cors());

// 1. Configuramos la carpeta pública con path.join para evitar errores en Render
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// 2. Ruta principal explícita: esto soluciona el error "Cannot GET /"
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ==========================================
// CONFIGURACIÓN DE PAYPAL
// ==========================================
// Es correcto y seguro que estas variables vengan de tu archivo .env
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;

const paypalBaseUrl = "https://api-m.paypal.com";

async function generatePayPalAccessToken() {
  const auth = Buffer.from(PAYPAL_CLIENT_ID + ":" + PAYPAL_SECRET).toString("base64");
  
  const response = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
    method: "POST",
    body: "grant_type=client_credentials",
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });
  const data = await response.json();
  return data.access_token;
}

app.post("/create-paypal-order", async (req, res) => {
  try {
    const { amount } = req.body; 
    const accessToken = await generatePayPalAccessToken();
    
    const response = await fetch(`${paypalBaseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "MXN", 
              value: amount, 
            },
          },
        ],
      }),
    });
    
    const order = await response.json();
    res.json(order); 
  } catch (error) {
    console.error("Error creando la orden de PayPal:", error);
    res.status(500).json({ error: "No se pudo crear la orden" });
  }
});

app.post("/capture-paypal-order", async (req, res) => {
  try {
    const { orderID } = req.body;
    const accessToken = await generatePayPalAccessToken();
    
    const response = await fetch(`${paypalBaseUrl}/v2/checkout/orders/${orderID}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    const captureData = await response.json();
    res.json(captureData);
  } catch (error) {
    console.error("Error capturando el pago de PayPal:", error);
    res.status(500).json({ error: "No se pudo capturar el pago" });
  }
});

// ==========================================
// CONFIGURACIÓN DE STRIPE (Checkout Session)
// ==========================================
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

app.post("/create-stripe-checkout", async (req, res) => {
  try {
    const { items } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items.map(item => ({
        price_data: {
          currency: 'mxn',
          product_data: {
            name: item.title,
          },
          // Corregido: tu frontend envía 'item.price', no 'item.unit_price'
          unit_amount: Math.round(item.price * 100), 
        },
        quantity: item.quantity,
      })),
      mode: 'payment',
      // URLs dinámicas para que funcionen perfecto en Render
      success_url: `${req.headers.origin}/exito.html`,
      cancel_url: `${req.headers.origin}/`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Error creando la sesión de Stripe:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// CONFIGURACIÓN DE MERCADO PAGO
// ==========================================
const { MercadoPagoConfig, Preference } = require("mercadopago");
const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN});

app.post("/crear-preferencia-mp", async (req, res) => {
  const { items } = req.body;

  try {
    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        items: items || [
          {
            title: "Prenda LEVSTARK",
            quantity: 1,
            unit_price: 350,
          }
        ],
        back_urls: {
          success: `${req.headers.origin}/exito.html`,
          failure: `${req.headers.origin}/`,
          pending: `${req.headers.origin}/`
        },
        auto_return: "approved",
      }
    });

    res.json({ id: result.id });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==========================================
// SISTEMA DE RESEÑAS POR CORREO
// ==========================================

const reviewTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

app.post("/send-review", async (req, res) => {
  try {
    const { product, name, stars, text } = req.body;

    if (!product || !name || !stars || !text) {
      return res.status(400).json({
        error: "Faltan datos de la reseña."
      });
    }

    const starsNumber = Number(stars);

    if (starsNumber < 1 || starsNumber > 5) {
      return res.status(400).json({
        error: "La calificación no es válida."
      });
    }

    const starsDisplay =
      "★".repeat(starsNumber) +
      "☆".repeat(5 - starsNumber);

    await reviewTransporter.sendMail({
      from: `"FUTURESTAR - Reseñas" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      subject: `Nueva reseña de ${product}`,

      text: `
Nueva reseña recibida en FUTURESTAR

Producto: ${product}
Nombre: ${name}
Calificación: ${starsDisplay} (${starsNumber}/5)

Reseña:
${text}

Esta reseña NO fue guardada automáticamente en el sitio.
      `
    });

    res.json({
      success: true,
      message: "Reseña enviada correctamente."
    });

  } catch (error) {
    console.error("Error enviando la reseña:", error);

    res.status(500).json({
      error: "No se pudo enviar la reseña."
    });
  }
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================
const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`Servidor ejecutándose en puerto ${PORT}`));