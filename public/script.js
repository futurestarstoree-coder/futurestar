import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-storage.js";

// ------------------------------------------
// CONFIGURACIÓN DE FIREBASE
// ------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyCgn4N-q8kNmNEsj_1WjrKikBgi7R5BJjM",
  authDomain: "futurestar-23fc3.firebaseapp.com",
  projectId: "futurestar-23fc3",
  storageBucket: "futurestar-23fc3.firebasestorage.app",
  messagingSenderId: "198948959895",
  appId: "1:198948959895:web:4759b82aa8927763219bd2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

document.addEventListener("DOMContentLoaded", () => {

  // ------------------------------------------
  // ESTADO GLOBAL Y VARIABLES
  // ------------------------------------------
  let cart = [];
  let currentQuantity = 1;
  let currentAvailableStock = 0; 
  let currentProduct = {};
  let selectedRating = 5;

  // NUEVO: Base de datos simulada de inventario (Stock por producto y talla)
  const productStock = {
    "SAKURA": { "S": 1, "M": 0, "L": 0, "XL": 0 },
    "VIBES": { "S": 1, "M": 1, "L": 0, "XL": 0 },
    "HUNTING": { "S": 0, "M": 0, "L": 0, "FXL": 0 },
    "DREAM": { "S": 1, "M": 1, "L": 0, "XL": 0 }
  };

  // ==========================================
  // 1. ELEMENTOS DEL DOM
  // ==========================================
  const menuOpen = document.getElementById("menuOpen");
  const cartOpen = document.getElementById("cartOpen");
  const mobileMenu = document.getElementById("mobileMenu");
  const cartDrawer = document.getElementById("cart-drawer");
  const overlay = document.getElementById("overlay");
  const menuClose = document.getElementById("menuClose");
  const closeCart = document.getElementById("closeCart");

  // Modal Vista Previa del Producto
  const productModal = document.getElementById("product-modal");
  const modalImg = document.getElementById("modalImg");
  const modalThumbnails = document.getElementById("modalThumbnails");
  const modalTitle = document.getElementById("modalTitle");
  const modalPrice = document.getElementById("modalPrice");
  const closeModal = document.getElementById("closeModal");
  const sizeSelect = document.getElementById("sizeSelect");
  const qtyMinus = document.getElementById("qtyMinus");
  const qtyPlus = document.getElementById("qtyPlus");
  const qtyVal = document.getElementById("qtyVal");
  const addToCartBtn = document.getElementById("addToCartBtn");
  const buyNowBtn = document.getElementById("buyNowBtn");

  // Carrito UI
  const cartCountBadge = document.getElementById("cartCountBadge");
  const cartCountTitle = document.getElementById("cartCountTitle");
  const cartItemsContainer = document.getElementById("cartItemsContainer");
  const cartTotalPrice = document.getElementById("cartTotalPrice");
  const checkoutBtn = document.getElementById("checkoutBtn");

  // Modal Checkout
  const checkoutModal = document.getElementById("checkout-modal");
  const closeCheckoutModal = document.getElementById("closeCheckoutModal");


  // ==========================================
  // 2. ABRIR Y CERRAR PANELES Y MODALES
  // ==========================================
  if (menuOpen && mobileMenu) {
    menuOpen.addEventListener("click", (e) => {
      e.preventDefault();
      closeAll();
      mobileMenu.classList.add("open");
      if (overlay) overlay.classList.add("active");
    });
  }

  if (cartOpen && cartDrawer) {
    cartOpen.addEventListener("click", (e) => {
      e.preventDefault();
      closeAll();
      cartDrawer.classList.add("open");
      if (overlay) overlay.classList.add("active");
    });
  }

  const closeAll = () => {
    if (mobileMenu) mobileMenu.classList.remove("open");
    if (cartDrawer) cartDrawer.classList.remove("open");

    if (productModal) {
      productModal.classList.remove("open", "active");
      productModal.style.display = "none";
    }

    if (checkoutModal) {
      checkoutModal.classList.remove("open", "active");
      checkoutModal.style.display = "none";
    }

    if (overlay) overlay.classList.remove("active");
  };

  if (menuClose) menuClose.addEventListener("click", closeAll);
  if (closeCart) closeCart.addEventListener("click", closeAll);
  if (overlay) overlay.addEventListener("click", closeAll);
  if (closeModal) closeModal.addEventListener("click", closeAll);
  if (closeCheckoutModal) closeCheckoutModal.addEventListener("click", closeAll);


  // ==========================================
  // 3. FILTRADO (INICIO / MUJER / HOMBRE)
  // ==========================================
  const menuLinks = document.querySelectorAll(".menu-link");
  const sectionTitle = document.getElementById("sectionTitle");
  const productCards = document.querySelectorAll(".product-card");

  menuLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();

      menuLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");

      const filter = link.getAttribute("data-filter");

      if (sectionTitle) {
        if (filter === "inicio") sectionTitle.innerText = "LO NUEVO";
        if (filter === "mujer") sectionTitle.innerText = "MUJER";
        if (filter === "hombre") sectionTitle.innerText = "HOMBRE";
      }

      productCards.forEach((card) => {
        const category = card.getAttribute("data-category");

        if (filter === "inicio" || category === filter) {
          card.style.display = "block";
        } else {
          card.style.display = "none";
        }
      });

      closeAll();
    });
  });


  // ==========================================
  // 4. CONTROL DE INVENTARIO Y CANTIDAD
  // ==========================================
  const showStockMessage = (msg, color) => {
    let msgEl = document.getElementById("dynamicStockMsg");
    if (!msgEl) {
      msgEl = document.createElement("p");
      msgEl.id = "dynamicStockMsg";
      msgEl.style.fontSize = "13px";
      msgEl.style.fontWeight = "600";
      msgEl.style.marginTop = "8px";
      msgEl.style.marginBottom = "0";
      if (sizeSelect && sizeSelect.parentNode) {
        sizeSelect.parentNode.appendChild(msgEl);
      }
    }
    msgEl.innerText = msg;
    msgEl.style.color = color;
  };

  const updateStockUI = (size) => {
    if (!size) {
      currentAvailableStock = 0;
      showStockMessage("Selecciona una talla para ver disponibilidad.", "#666");
      if(qtyPlus) qtyPlus.disabled = false;
      if(addToCartBtn) {
        addToCartBtn.disabled = currentProduct.isSoldOut;
        addToCartBtn.innerText = currentProduct.isSoldOut ? "Agotado" : "Agregar al carrito";
      }
      return;
    }

    const title = currentProduct.title;
    const baseStock = (productStock[title] && productStock[title][size] !== undefined)? 
                       productStock[title][size] 
                      : 0;

    const cartItem = cart.find(item => item.title === title && item.size === size);
    const cartQty = cartItem ? cartItem.quantity : 0;
    
    currentAvailableStock = baseStock - cartQty;

    if (currentAvailableStock <= 0) {
      currentQuantity = 0;
      if (qtyVal) qtyVal.innerText = 0;
      if (qtyPlus) qtyPlus.disabled = true;
      if (qtyMinus) qtyMinus.disabled = true;
      
      if (addToCartBtn) {
        addToCartBtn.disabled = true;
        addToCartBtn.innerText = "Talla agotada";
      }
      showStockMessage("Agotado en esta talla", "#ff3333");
    } else {
      if (currentQuantity === 0 || currentQuantity > currentAvailableStock) {
        currentQuantity = 1;
      }
      
      if (qtyVal) qtyVal.innerText = currentQuantity;
      if (qtyMinus) qtyMinus.disabled = false;
      
      if (currentQuantity >= currentAvailableStock) {
        if (qtyPlus) qtyPlus.disabled = true;
      } else {
        if (qtyPlus) qtyPlus.disabled = false;
      }

      if (addToCartBtn) {
        addToCartBtn.disabled = false;
        addToCartBtn.innerText = "Agregar al carrito";
      }

      if (currentAvailableStock <= 3) {
        showStockMessage(`¡Corre! Solo quedan ${currentAvailableStock} unidades.`, "#22e600");
      } else {
        showStockMessage(`${currentAvailableStock} disponibles`, "#28a745");
      }
    }
  };

  if (sizeSelect) {
    sizeSelect.addEventListener("change", (e) => {
      updateStockUI(e.target.value);
    });
  }

  if (qtyMinus && qtyPlus && qtyVal) {
    qtyMinus.addEventListener("click", () => {
      if (currentQuantity > 1) {
        currentQuantity--;
        qtyVal.innerText = currentQuantity;
        qtyPlus.disabled = false;
      }
    });

    qtyPlus.addEventListener("click", () => {
      const selectedSize = sizeSelect ? sizeSelect.value : "";
      if (!selectedSize) {
        alert("Por favor selecciona una talla primero.");
        return;
      }

      if (currentQuantity < currentAvailableStock) {
        currentQuantity++;
        qtyVal.innerText = currentQuantity;
      }

      if (currentQuantity >= currentAvailableStock) {
        qtyPlus.disabled = true;
      }
    });
  }


  // ==========================================
  // 5. VISTA PREVIA Y GALERÍA DE IMÁGENES
  // ==========================================
  productCards.forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.tagName === "BUTTON") return;

      const img = card.querySelector("img");
      const title = card.querySelector(".product-title");
      const price = card.querySelector(".product-price");
      const soldOut = card.querySelector(".sold-out");

      const isSoldOut = !!soldOut;
      const priceText = isSoldOut ? "Agotado" : (price ? price.innerText : "$0.00");
      const numericPrice = isSoldOut ? 0 : parseFloat(priceText.replace(/[^0-9.]/g, "")) || 0;

      const imagesAttr = card.getAttribute("data-images");
      let imagesList = [];
      if (imagesAttr) {
        imagesList = imagesAttr.split(",").map((url) => url.trim());
      } else if (img) {
        imagesList = [img.src];
      }

      currentProduct = {
        title: title ? title.innerText : "Producto",
        priceText: priceText,
        price: numericPrice,
        image: imagesList[0] || (img ? img.src : ""),
        images: imagesList,
        isSoldOut: isSoldOut
      };

      if (modalImg) modalImg.src = currentProduct.image;
      if (modalTitle) modalTitle.innerText = currentProduct.title;
      if (modalPrice) modalPrice.innerText = currentProduct.priceText;

      if (modalThumbnails) {
        modalThumbnails.innerHTML = "";
        imagesList.forEach((src, idx) => {
          const thumb = document.createElement("img");
          thumb.src = src;
          thumb.className = `thumb-item ${idx === 0 ? "active" : ""}`;
          thumb.addEventListener("click", () => {
            if (modalImg) {
              modalImg.style.opacity = "0.3";
              setTimeout(() => {
                modalImg.src = src;
                modalImg.style.opacity = "1";
              }, 150);
            }
            modalThumbnails.querySelectorAll(".thumb-item").forEach((t) => t.classList.remove("active"));
            thumb.classList.add("active");
          });
          modalThumbnails.appendChild(thumb);
        });
      }

      // Cargar reseñas desde Firebase para este producto
      cargarReseñasDeFirebase(currentProduct.title);

      if (sizeSelect) sizeSelect.value = "";
      currentQuantity = 1;
      if (qtyVal) qtyVal.innerText = currentQuantity;
      if (qtyPlus) qtyPlus.disabled = false;
      if (qtyMinus) qtyMinus.disabled = false;
      
      const stockMsgEl = document.getElementById("dynamicStockMsg");
      if(stockMsgEl) stockMsgEl.innerText = "";

      if (addToCartBtn) {
        addToCartBtn.disabled = isSoldOut;
        addToCartBtn.innerText = isSoldOut ? "Agotado" : "Agregar al carrito";
        addToCartBtn.style.opacity = isSoldOut ? "0.5" : "1";
      }
      if (buyNowBtn) {
        buyNowBtn.style.display = isSoldOut ? "none" : "block";
      }

      closeAll();
      if (productModal) {
        productModal.classList.add("open", "active");
        productModal.style.display = "flex";
        if (overlay) overlay.classList.add("active");
      }
    });
  });


  // ==========================================
  // 6. SISTEMA DE RESEÑAS CON FIREBASE (TEXTO + FOTO)
  // ==========================================
  const reviewsList = document.getElementById("reviewsList");
  const toggleReviewFormBtn = document.getElementById("toggleReviewFormBtn");
  const reviewForm = document.getElementById("reviewForm");
  const starBtns = document.querySelectorAll(".star-btn");
  const reviewImageInput = document.getElementById("reviewImage");

  async function cargarReseñasDeFirebase(productTitle) {
    if (!reviewsList) return;
    reviewsList.innerHTML = `<p style='color: #888; font-size: 13px; text-align: center; padding: 10px;'>Cargando opiniones...</p>`;

    try {
      const q = query(collection(db, "reviews"), orderBy("fecha", "desc"));
      const querySnapshot = await getDocs(q);
      
      reviewsList.innerHTML = "";
      let foundAny = false;

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Filtramos solo las reseñas que correspondan a este producto
        if (data.productTitle === productTitle) {
          foundAny = true;
          renderizarItemReseña(data);
        }
      });

      if (!foundAny) {
        reviewsList.innerHTML = `
          <div style="text-align: center; padding: 12px; background: #151515; border-radius: 4px; color: #aaa; font-size: 13px; border: 1px dashed #333;">
            <p>Aún no hay reseñas para esta prenda.</p>
            <p style="margin-top:2px; font-weight:bold; color: #22e600;">¡Sé el primero en opinar!</p>
          </div>
        `;
      }
    } catch (error) {
      console.error("Error al cargar reseñas de Firebase:", error);
      reviewsList.innerHTML = `<p style='color: #ff3333; font-size: 13px;'>Error al cargar las opiniones.</p>`;
    }
  }

  function renderizarItemReseña(data) {
    const starsHtml = "★".repeat(data.stars) + "☆".repeat(5 - data.stars);
    const item = document.createElement("div");
    item.className = "review-item";
    
    // Si la reseña incluye foto, la agregamos
    let imageHtml = data.imageUrl ? `<img src="${data.imageUrl}" class="review-attached-image" alt="Foto del cliente">` : '';

    item.innerHTML = `
      <div class="review-item-header">
        <span class="review-author">${data.name}</span>
        <span class="review-stars">${starsHtml}</span>
      </div>
      <p class="review-text">${data.text}</p>
      ${imageHtml}
    `;
    reviewsList.appendChild(item);
  }

  if (toggleReviewFormBtn && reviewForm) {
    toggleReviewFormBtn.addEventListener("click", () => {
      reviewForm.classList.toggle("hidden");
    });
  }

  starBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedRating = parseInt(btn.getAttribute("data-value"));
      starBtns.forEach((s, idx) => {
        if (idx < selectedRating) s.classList.add("active");
        else s.classList.remove("active");
      });
    });
  });

  if (reviewForm) {
    reviewForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nameInput = document.getElementById("reviewAuthor");
      const textInput = document.getElementById("reviewText");
      const file = reviewImageInput ? reviewImageInput.files[0] : null;

      const title = currentProduct.title || "Producto";
      
      const submitBtn = reviewForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn ? submitBtn.innerText : "Publicar Reseña";
      if (submitBtn) {
        submitBtn.textContent = "PUBLICANDO...";
        submitBtn.disabled = true;
      }

      try {
        let imageUrl = "";

        // Si el usuario subió foto, la guardamos en Firebase Storage
        if (file) {
          const storageRef = ref(storage, `reviews/${Date.now()}_${file.name}`);
          const snapshot = await uploadBytes(storageRef, file);
          imageUrl = await getDownloadURL(snapshot.ref);
        }

        const nuevaReseña = {
          productTitle: title,
          name: nameInput ? nameInput.value : "Anónimo",
          stars: selectedRating,
          text: textInput ? textInput.value : "",
          imageUrl: imageUrl,
          fecha: new Date()
        };

        // Guardamos en Firestore
        await addDoc(collection(db, "reviews"), nuevaReseña);

        reviewForm.reset();
        selectedRating = 5;
        starBtns.forEach(s => s.classList.add("active"));
        reviewForm.classList.add("hidden");

        if (submitBtn) {
          submitBtn.textContent = originalBtnText;
          submitBtn.disabled = false;
        }

        // Recargamos las reseñas en vivo
        cargarReseñasDeFirebase(title);
        alert("¡Gracias por compartir tu opinión sobre la prenda!");

      } catch (error) {
        console.error("Error al guardar reseña en Firebase:", error);
        alert("Hubo un error al publicar tu reseña. Inténtalo de nuevo.");
        if (submitBtn) {
          submitBtn.textContent = originalBtnText;
          submitBtn.disabled = false;
        }
      }
    });
  }


  // ==========================================
  // 7. ACTUALIZAR RENDERIZADO DEL CARRITO
  // ==========================================
  const updateCartUI = () => {
    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

    if (cartCountBadge) cartCountBadge.innerText = totalItems;
    if (cartCountTitle) cartCountTitle.innerText = totalItems;

    const totalPrice = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    if (cartTotalPrice) cartTotalPrice.innerText = `$${totalPrice.toFixed(2)}`;

    if (cartItemsContainer) {
      if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-cart-msg">Tu carrito está vacío.</p>';
      } else {
        cartItemsContainer.innerHTML = "";
        cart.forEach((item, index) => {
          const itemEl = document.createElement("div");
          itemEl.style.cssText = "display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px solid #333; padding-bottom: 10px;";
          itemEl.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
              <img src="${item.image}" alt="${item.title}" style="width: 50px; height: 60px; object-fit: cover; border-radius: 4px;">
              <div>
                <h4 style="font-size: 14px; margin: 0; text-transform: uppercase; color: #fff;">${item.title}</h4>
                <p style="font-size: 12px; color: #aaa; margin: 2px 0;">Talla: <strong>${item.size}</strong> | Cant: <strong>${item.quantity}</strong></p>
                <p style="font-size: 13px; font-weight: bold; margin: 0; color: #22e600;">$${(item.price * item.quantity).toFixed(2)}</p>
              </div>
            </div>
            <button class="remove-item-btn" data-index="${index}" style="background: none; border: none; color: #ff3333; font-size: 18px; cursor: pointer; font-weight: bold;">✕</button>
          `;
          cartItemsContainer.appendChild(itemEl);
        });

        const removeBtns = cartItemsContainer.querySelectorAll(".remove-item-btn");
        removeBtns.forEach((btn) => {
          btn.addEventListener("click", (e) => {
            const idx = parseInt(e.target.getAttribute("data-index"));
            cart.splice(idx, 1);
            updateCartUI();
            
            if (sizeSelect && sizeSelect.value) {
              updateStockUI(sizeSelect.value);
            }
          });
        });
      }
    }
  };


  // ==========================================
  // 8. AÑADIR PRODUCTO
  // ==========================================
  const addItemToCart = () => {
    if (currentProduct.isSoldOut) return false;

    const selectedSize = sizeSelect ? sizeSelect.value : "";
    if (!selectedSize) {
      alert("Por favor elige una talla antes de continuar.");
      return false;
    }

    const existingIndex = cart.findIndex(
      (item) => item.title === currentProduct.title && item.size === selectedSize
    );

    if (existingIndex > -1) {
      cart[existingIndex].quantity += currentQuantity;
    } else {
      cart.push({
        title: currentProduct.title,
        price: currentProduct.price,
        image: currentProduct.image,
        size: selectedSize,
        quantity: currentQuantity
      });
    }

    updateCartUI();
    updateStockUI(selectedSize); 
    
    return true;
  };

  if (addToCartBtn) {
    addToCartBtn.addEventListener("click", () => {
      if (addItemToCart()) {
        closeAll();
        if (cartDrawer) cartDrawer.classList.add("open");
        if (overlay) overlay.classList.add("active");
      }
    });
  }

  if (buyNowBtn) {
    buyNowBtn.addEventListener("click", () => {
      if (addItemToCart()) {
        openCheckoutModal();
      }
    });
  }

  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", () => {
      openCheckoutModal();
    });
  }


  // ==========================================
  // 9. INTEGRACIÓN CON STRIPE (PAGOS)
  // ==========================================
  const stripe = Stripe("pk_live_51Tv7coHDKvggrmJ2CFDE4weGpoxYWAMRtzAGx3AeRK0S5FiQK8b8wN2mOLq9Uk7osICru8FmVcVIr3xelEdeQ9El004TQVqWQA");
  let elements;

  async function openCheckoutModal() {
    if (cart.length === 0) {
      alert("Tu carrito está vacío.");
      return;
    }

    try {
      const response = await fetch("/create-stripe-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart })
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Hubo un error al crear la sesión de pago.");
      }

    } catch (error) {
      alert("Error al conectar con el servidor de pagos.");
      console.error(error);
    }
  }

  const stripeForm = document.getElementById("payment-form");
  if (stripeForm) {
    stripeForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const payBtnText = document.getElementById("payBtnText");
      const paySubmitBtn = document.getElementById("paySubmitBtn");
      
      if (paySubmitBtn) paySubmitBtn.disabled = true;
      if (payBtnText) payBtnText.innerText = "PROCESANDO PAGO SEGURO...";

      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + "/exito.html", 
        },
      });

      if (error) {
        const paymentMsg = document.getElementById("payment-message");
        if (paymentMsg) paymentMsg.innerText = error.message;
        if (paySubmitBtn) paySubmitBtn.disabled = false;
        if (payBtnText) payBtnText.innerText = "PAGAR AHORA";
      }
    });
  }

});


// ==========================================
// 10. INTEGRACIÓN CON PAYPAL (BOTONES)
// ==========================================
if (window.paypal) {
  paypal.Buttons({
    createOrder: async function(data, actions) {
      // Nota: Asegúrate de que 'cart' sea accesible globalmente o pasa el total
      const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      
      try {
        const response = await fetch("/create-paypal-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: total.toFixed(2) })
        });
        
        const orderData = await response.json();
        
        if (orderData.id) {
          return orderData.id;
        } else {
          const errorDetail = orderData?.details?.[0];
          const errorMessage = errorDetail ? `${errorDetail.issue} ${errorDetail.description}` : 'No se pudo iniciar PayPal';
          throw new Error(errorMessage);
        }
      } catch (error) {
        console.error("Error al crear la orden:", error);
        alert("Ocurrió un error al conectar con PayPal.");
      }
    },

    onApprove: async function(data, actions) {
      try {
        const response = await fetch("/capture-paypal-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderID: data.orderID })
        });
        
        const captureData = await response.json();
        
        if (captureData.status === "COMPLETED") {
          window.location.href = window.location.origin + "/exito.html";
        } else {
          alert("El pago no se pudo completar. Intenta nuevamente.");
        }
      } catch (error) {
        console.error("Error al capturar el pago:", error);
        alert("Hubo un problema al confirmar tu pago.");
      }
    },
    
    onError: function(err) {
      console.error("Error de PayPal:", err);
    }
    
  }).render("#paypal-button-container");
}