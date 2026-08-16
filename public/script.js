document.addEventListener("DOMContentLoaded", () => {

  // ==========================================
  // ESTADO GLOBAL
  // ==========================================

  let cart = [];
  let currentQuantity = 1;
  let currentAvailableStock = 0;
  let currentProduct = {};
  let selectedRating = 5;
  let paypalRendered = false;


  // ==========================================
  // RESEÑAS
  // ==========================================

  const productReviews = {
    "SAKURA": [
      {
        name: "Andrea L.",
        stars: 5,
        text: "Me gusto, llegó súper rápido."
      },
      {
        name: "Sofía T.",
        stars: 5,
        text: "Muy cómoda y el estampado se ve idéntico a las fotos."
      }
    ],

    "VIBES": [
      {
        name: "Mateo G.",
        stars: 4,
        text: "Excelente si me quedo oversize, la recomiendo al 100%."
      },
      {
        name: "Ozil R.",
        stars: 5,
        text: "la llevo siempre para entrenar, la tela no se siente pesada ni estorba para hacer los ejercicios."
      }
    ],

    "HUNTING": [
      {
        name: "Miriam D.",
        stars: 5,
        text: "Súper cómoda me gusto el diseño, totalmente recomendada."
      },
      {
        name: "Kimy M.",
        stars: 4,
        text: "Nice."
      },
      {
        name: "Ximena M.",
        stars: 5,
        text: "Me encanta, la tela se siente fresca."
      }
    ],

    "DREAM": [
      {
        name: "Matthew S.",
        stars: 4,
        text: "la playera luse bien pero tardo mas de lo esperado en llegar."
      },
      {
        name: "Jean P.",
        stars: 5,
        text: "Tal como las imagenes, la tela se siente de calidad y el estampado tambien."
      }
    ]
  };


  // ==========================================
  // ELEMENTOS DEL DOM
  // ==========================================

  const menuOpen = document.getElementById("menuOpen");
  const cartOpen = document.getElementById("cartOpen");

  const mobileMenu = document.getElementById("mobileMenu");
  const cartDrawer = document.getElementById("cart-drawer");
  const overlay = document.getElementById("overlay");

  const menuClose = document.getElementById("menuClose");
  const closeCart = document.getElementById("closeCart");

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

  const cartCountBadge = document.getElementById("cartCountBadge");
  const cartCountTitle = document.getElementById("cartCountTitle");

  const cartItemsContainer = document.getElementById("cartItemsContainer");
  const cartTotalPrice = document.getElementById("cartTotalPrice");
  const checkoutBtn = document.getElementById("checkoutBtn");

  const checkoutModal = document.getElementById("checkout-modal");
  const closeCheckoutModal = document.getElementById("closeCheckoutModal");

  const checkoutSubtotal = document.getElementById("checkoutSubtotal");
  const checkoutTotalAmount = document.getElementById("checkoutTotalAmount");
  const estimatedDeliveryText = document.getElementById("estimatedDeliveryText");

  const paymentForm = document.getElementById("payment-form");
  const paySubmitBtn = document.getElementById("paySubmitBtn");
  const payBtnText = document.getElementById("payBtnText");
  const paymentMessage = document.getElementById("payment-message");

  const paypalContainer = document.getElementById("paypal-button-container");

  const reviewsList = document.getElementById("reviewsList");
  const toggleReviewFormBtn = document.getElementById("toggleReviewFormBtn");
  const reviewForm = document.getElementById("reviewForm");
  const starBtns = document.querySelectorAll(".star-btn");

  const btnContacto = document.getElementById("btn-contacto");
  const cuadroContacto = document.getElementById("cuadro-contacto");

  const menuLinks = document.querySelectorAll(".menu-link");
  const sectionTitle = document.getElementById("sectionTitle");
  const productCards = document.querySelectorAll(".product-card");


  // ==========================================
  // CERRAR TODO
  // ==========================================

  function closeAll() {

    if (mobileMenu) {
      mobileMenu.classList.remove("open");
    }

    if (cartDrawer) {
      cartDrawer.classList.remove("open");
    }

    if (productModal) {
      productModal.classList.remove("open", "active");
      productModal.style.display = "none";
    }

    if (checkoutModal) {
      checkoutModal.classList.remove("open", "active");
      checkoutModal.style.display = "none";
    }

    if (overlay) {
      overlay.classList.remove("active");
    }
  }


  // ==========================================
  // MENÚ
  // ==========================================

  if (menuOpen && mobileMenu) {

    menuOpen.addEventListener("click", (e) => {

      e.preventDefault();

      closeAll();

      mobileMenu.classList.add("open");

      if (overlay) {
        overlay.classList.add("active");
      }
    });
  }


  // ==========================================
  // ABRIR CARRITO
  // ==========================================

  if (cartOpen && cartDrawer) {

    cartOpen.addEventListener("click", (e) => {

      e.preventDefault();

      closeAll();

      cartDrawer.classList.add("open");

      if (overlay) {
        overlay.classList.add("active");
      }
    });
  }


  // ==========================================
  // CERRAR PANELES
  // ==========================================

  if (menuClose) {
    menuClose.addEventListener("click", closeAll);
  }

  if (closeCart) {
    closeCart.addEventListener("click", closeAll);
  }

  if (overlay) {
    overlay.addEventListener("click", closeAll);
  }

  if (closeModal) {
    closeModal.addEventListener("click", closeAll);
  }

  if (closeCheckoutModal) {

    closeCheckoutModal.addEventListener("click", () => {

      closeAll();

      if (cartDrawer) {
        cartDrawer.classList.add("open");
      }

      if (overlay) {
        overlay.classList.add("active");
      }
    });
  }


  // ==========================================
  // FILTROS
  // ==========================================

  menuLinks.forEach((link) => {

    link.addEventListener("click", (e) => {

      e.preventDefault();

      menuLinks.forEach((l) => {
        l.classList.remove("active");
      });

      link.classList.add("active");

      const filter = link.getAttribute("data-filter");

      if (sectionTitle) {

        if (filter === "inicio") {
          sectionTitle.innerText = "LO NUEVO";
        }

        if (filter === "mujer") {
          sectionTitle.innerText = "MUJER";
        }

        if (filter === "hombre") {
          sectionTitle.innerText = "HOMBRE";
        }
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
  // STOCK
  // ==========================================

  function showStockMessage(message, color) {

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

    msgEl.innerText = message;
    msgEl.style.color = color;
  }


  function updateStockUI(size) {

    if (!size) {

      currentAvailableStock = 0;

      showStockMessage(
        "Selecciona una talla para ver disponibilidad.",
        "#666"
      );

      if (qtyMinus) qtyMinus.disabled = true;
      if (qtyPlus) qtyPlus.disabled = true;

      if (qtyVal) qtyVal.innerText = "1";

      currentQuantity = 1;

      if (addToCartBtn) {

        addToCartBtn.disabled = !!currentProduct.isSoldOut;

        if (currentProduct.isSoldOut) {
          addToCartBtn.innerText = "Agotado";
        } else {
          addToCartBtn.innerText = "Agregar al carrito";
        }
      }

      return;
    }

    const title = currentProduct.title;

    let baseStock = 0;

    if (
      currentProduct.stock &&
      currentProduct.stock[size] !== undefined
    ) {
      baseStock = Number(currentProduct.stock[size]) || 0;
    }

    const cartItem = cart.find((item) => {
      return item.title === title && item.size === size;
    });

    const cartQty = cartItem ? Number(cartItem.quantity): 0;
currentAvailableStock = baseStock - cartQty;
if (currentAvailableStock <= 0) {
currentAvailableStock = 0;
currentQuantity = 0;

     if (qtyVal) {
        qtyVal.innerText = "0";
      }

      if (qtyPlus) {
        qtyPlus.disabled = true;
      }

      if (qtyMinus) {
        qtyMinus.disabled = true;
      }

      if (addToCartBtn) {

        addToCartBtn.disabled = true;
        addToCartBtn.innerText = "Talla agotada";
        addToCartBtn.style.opacity = "0.5";
      }

      showStockMessage(
        "Agotado en esta talla",
        "#ff3333"
      );

      return;
    }

    if (
      currentQuantity <= 0 ||
      currentQuantity > currentAvailableStock
    ) {
      currentQuantity = 1;
    }

    if (qtyVal) {
      qtyVal.innerText = currentQuantity;
    }

    if (qtyMinus) {
      qtyMinus.disabled = currentQuantity <= 1;
    }

    if (qtyPlus) {
      qtyPlus.disabled =
        currentQuantity >= currentAvailableStock;
    }

    if (addToCartBtn) {

      addToCartBtn.disabled = false;
      addToCartBtn.innerText = "Agregar al carrito";
      addToCartBtn.style.opacity = "1";
    }

    if (currentAvailableStock <= 3) {

      showStockMessage(
        `¡Corre! Solo quedan ${currentAvailableStock} unidades.`,
        "#22e600"
      );

    } else {

      showStockMessage(
        `${currentAvailableStock} disponibles`,
        "#28a745"
      );
    }
  }


  if (sizeSelect) {

    sizeSelect.addEventListener("change", (e) => {

      currentQuantity = 1;

      updateStockUI(e.target.value);
    });
  }


  if (qtyMinus) {

    qtyMinus.addEventListener("click", () => {

      if (currentQuantity > 1) {

        currentQuantity--;

        if (qtyVal) {
          qtyVal.innerText = currentQuantity;
        }

        if (qtyPlus) {
          qtyPlus.disabled =
            currentQuantity >= currentAvailableStock;
        }

        if (qtyMinus) {
          qtyMinus.disabled =
            currentQuantity <= 1;
        }
      }
    });
  }


  if (qtyPlus) {

    qtyPlus.addEventListener("click", () => {

      const selectedSize =
        sizeSelect ? sizeSelect.value : "";

      if (!selectedSize) {

        alert(
          "Por favor selecciona una talla primero."
        );

        return;
      }

      if (currentQuantity < currentAvailableStock) {

        currentQuantity++;

        if (qtyVal) {
          qtyVal.innerText = currentQuantity;
        }
      }

      if (currentQuantity >= currentAvailableStock) {
        qtyPlus.disabled = true;
      }

      if (qtyMinus) {
        qtyMinus.disabled = false;
      }
    });
  }


  // ==========================================
  // RESEÑAS
  // ==========================================

  function renderReviews(title) {

    if (!reviewsList) return;

    const reviews = productReviews[title] || [];

    if (reviews.length === 0) {

      reviewsList.innerHTML = `
        <div style="
          text-align:center;
          padding:12px;
          background:#f8f8f8;
          border-radius:4px;
          color:#666;
          font-size:13px;
        ">
          <p>Aún no hay reseñas para esta prenda.</p>

          <p style="
            margin-top:2px;
            font-weight:bold;
          ">
            ¡Sé el primero en opinar!
          </p>
        </div>
      `;

      return;
    }

    reviewsList.innerHTML = "";

    reviews.forEach((review) => {

      const starsHtml =
        "★".repeat(review.stars) +
        "☆".repeat(5 - review.stars);

      const item =
        document.createElement("div");

      item.className = "review-item";

      item.innerHTML = `
        <div class="review-item-header">

          <span class="review-author">
            ${review.name}
          </span>

          <span class="review-stars">
            ${starsHtml}
          </span>

        </div>

        <p class="review-text">
          ${review.text}
        </p>
      `;

      reviewsList.appendChild(item);
    });
  }


  if (toggleReviewFormBtn && reviewForm) {

    toggleReviewFormBtn.addEventListener("click", () => {

      reviewForm.classList.toggle("hidden");
    });
  }


  starBtns.forEach((btn) => {

    btn.addEventListener("click", () => {

      selectedRating =
        parseInt(
          btn.getAttribute("data-value"),
          10
        );

      starBtns.forEach((star) => {

        const value =
          parseInt(
            star.getAttribute("data-value"),
            10
          );

        if (value <= selectedRating) {
          star.classList.add("active");
        } else {
          star.classList.remove("active");
        }
      });
    });
  });


  if (reviewForm) {

    reviewForm.addEventListener("submit", async (e) => {

      e.preventDefault();

      const nameInput =
        document.getElementById("reviewAuthor");

      const textInput =
        document.getElementById("reviewText");

      const name =nameInput ? nameInput.value.trim(): "";

      const text = textInput ? textInput.value.trim(): "";

      const product =
        currentProduct.title ||
        "Producto";

      if (!name || !text) {

        alert(
          "Por favor completa tu nombre y tu reseña."
        );

        return;
      }

      const submitButton =
        reviewForm.querySelector(
          'button[type="submit"]'
        );

      if (submitButton) {

        submitButton.disabled = true;
        submitButton.innerText = "ENVIANDO...";
      }

      try {

        const response =
          await fetch(
            "/send-review",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body: JSON.stringify({
                product,
                name,
                stars: selectedRating,
                text
              })
            }
          );

        const data =
          await response.json();

        if (!response.ok) {

          throw new Error(
            data.error ||
            "No se pudo enviar la reseña."
          );
        }

        reviewForm.reset();

        selectedRating = 5;

        starBtns.forEach((star) => {

          const value =
            parseInt(
              star.getAttribute("data-value"),
              10
            );

          if (value <= 5) {
            star.classList.add("active");
          } else {
            star.classList.remove("active");
          }
        });

        reviewForm.classList.add("hidden");

        alert(
          "¡Gracias por tu reseña! La hemos recibido correctamente."
        );

      } catch (error) {

        console.error(
          "Error enviando reseña:",
          error
        );

        alert(
          "No se pudo enviar la reseña. Por favor intenta nuevamente."
        );

      } finally {

        if (submitButton) {

          submitButton.disabled = false;
          submitButton.innerText = "Enviar Reseña";
        }
      }
    });
  }


  // ==========================================
  // ABRIR PRODUCTO
  // ==========================================

  productCards.forEach((card) => {

    card.addEventListener("click", (e) => {

      if (e.target.tagName === "BUTTON") {
        return;
      }

      const img =
        card.querySelector("img");

      const title =
        card.querySelector(".product-title");

      const price =
        card.querySelector(".product-price");

      const soldOut =
        card.querySelector(".sold-out");

      const isSoldOut =
        !!soldOut;

      let priceText = "$0.00";

      if (isSoldOut) {

        priceText = "Agotado";

      } else if (price) {

        priceText =
          price.innerText;
      }

      let numericPrice = 0;

      if (!isSoldOut) {

        numericPrice =
          parseFloat(
            priceText.replace(
              /[^0-9.]/g,
              ""
            )
          ) || 0;
      }

      const imagesAttr =
        card.getAttribute("data-images");

      let imagesList = [];

      if (imagesAttr) {

        imagesList =
          imagesAttr
            .split(",")
            .map((url) => url.trim())
            .filter(Boolean);

      } else if (img) {

        imagesList = [
          img.src
        ];
      }

      let productStock = {};

      const stockAttr =
        card.getAttribute("data-stock");

      if (stockAttr) {

        try {

          productStock =
            JSON.parse(stockAttr);

        } catch (error) {

          console.error(
            "Error leyendo data-stock:",
            error
          );

          productStock = {};
        }
      }

      currentProduct = {

 title:title ? title.innerText.trim(): "Producto",

 priceText, price:numericPrice,
 image: imagesList[0] ||
 (img ? img.src : ""),

        images:
          imagesList,

        isSoldOut,

        stock:
          productStock
      };


      // ==========================================
      // IMAGEN
      // ==========================================

      if (modalImg) {

        modalImg.src =
          currentProduct.image;
      }


      // ==========================================
      // TÍTULO
      // ==========================================

      if (modalTitle) {

        modalTitle.innerText =
          currentProduct.title;
      }


      // ==========================================
      // PRECIO
      // ==========================================

      if (modalPrice) {

        modalPrice.innerText =
          currentProduct.priceText;
      }


      // ==========================================
      // MINIATURAS
      // ==========================================

      if (modalThumbnails) {

        modalThumbnails.innerHTML = "";

        imagesList.forEach((src, index) => {

          const thumb =
            document.createElement("img");

          thumb.src = src;

thumb.className =
index === 0 ? "thumb-item active"
: "thumb-item";

thumb.addEventListener("click", () => {
if (modalImg) { modalImg.style.opacity =
"0.3";

              setTimeout(() => {

                modalImg.src = src;

                modalImg.style.opacity =
                  "1";

              }, 150);
            }

            modalThumbnails
              .querySelectorAll(
                ".thumb-item"
              )
              .forEach((thumbnail) => {

                thumbnail.classList.remove(
                  "active"
                );
              });

            thumb.classList.add("active");
          });

          modalThumbnails.appendChild(
            thumb
          );
        });
      }


      // ==========================================
      // RESEÑAS
      // ==========================================

      renderReviews(
        currentProduct.title
      );


      // ==========================================
      // REINICIAR TALLA Y CANTIDAD
      // ==========================================

      if (sizeSelect) {
        sizeSelect.value = "";
      }

      currentQuantity = 1;
      currentAvailableStock = 0;

      if (qtyVal) {
        qtyVal.innerText = "1";
      }

      if (qtyMinus) {
        qtyMinus.disabled = true;
      }

      if (qtyPlus) {
        qtyPlus.disabled = true;
      }


      const stockMsgEl =
        document.getElementById(
          "dynamicStockMsg"
        );

      if (stockMsgEl) {
        stockMsgEl.innerText = "";
      }


      // ==========================================
      // BOTÓN AGREGAR
      // ==========================================

      if (addToCartBtn) {

        addToCartBtn.disabled =
          isSoldOut;

        if (isSoldOut) {

          addToCartBtn.innerText =
            "Agotado";

          addToCartBtn.style.opacity =
            "0.5";

        } else {

          addToCartBtn.innerText =
            "Agregar al carrito";

          addToCartBtn.style.opacity =
            "1";
        }
      }


      // ==========================================
      // BOTÓN COMPRAR AHORA
      // ==========================================

      if (buyNowBtn) {

        if (isSoldOut) {

          buyNowBtn.style.display =
            "none";

        } else {

          buyNowBtn.style.display =
            "block";
        }
      }


      // ==========================================
      // ABRIR MODAL
      // ==========================================

      closeAll();

      if (productModal) {

        productModal.classList.add(
          "open",
          "active"
        );

        productModal.style.display =
          "flex";
      }

      if (overlay) {
        overlay.classList.add("active");
      }

    });
  });


  // ==========================================
  // ACTUALIZAR CARRITO
  // ==========================================

  function updateCartUI() {

    const totalItems =
      cart.reduce(
        (total, item) =>
          total +
          Number(item.quantity),
        0
      );

    if (cartCountBadge) {

      cartCountBadge.innerText =
        totalItems;
    }

    if (cartCountTitle) {

      cartCountTitle.innerText =
        totalItems;
    }


    const totalPrice =
      cart.reduce(
        (total, item) =>
          total +
          Number(item.price) *
          Number(item.quantity),
        0
      );

    if (cartTotalPrice) {

      cartTotalPrice.innerText =
        `$${totalPrice.toFixed(2)}`;
    }


    if (!cartItemsContainer) {
      return;
    }


    if (cart.length === 0) {

      cartItemsContainer.innerHTML = `
        <p class="empty-cart-msg">
          Tu carrito está vacío.
        </p>
      `;

      return;
    }


    cartItemsContainer.innerHTML = "";


    cart.forEach((item, index) => {

      const itemEl =
        document.createElement("div");

      itemEl.style.cssText = `
        display:flex;
        align-items:center;
        justify-content:space-between;
        margin-bottom:15px;
        border-bottom:1px solid #eee;
        padding-bottom:10px;
      `;


      const itemTotal =
        Number(item.price) *
        Number(item.quantity);


      itemEl.innerHTML = `

        <div style="
          display:flex;
          align-items:center;
          gap:10px;
        ">

          <img
            src="${item.image}"
            alt="${item.title}"
            style="
              width:50px;
              height:60px;
              object-fit:cover;
              border-radius:4px;
            "
          >

          <div>

            <h4 style="
              font-size:14px;
              margin:0;
              text-transform:uppercase;
            ">
              ${item.title}
            </h4>

            <p style="
              font-size:12px;
              color:#666;
              margin:2px 0;
            ">
              Talla:
              <strong>${item.size}</strong>
              |
              Cant:
              <strong>${item.quantity}</strong>
            </p>

            <p style="
              font-size:13px;
              font-weight:bold;
              margin:0;
            ">
              $${itemTotal.toFixed(2)}
            </p>

          </div>

        </div>


        <button
          class="remove-item-btn"
          data-index="${index}"
          type="button"
          style="
            background:none;
            border:none;
            color:#ff3333;
            font-size:18px;
            cursor:pointer;
            font-weight:bold;
          "
        >
          ✕
        </button>

      `;


      cartItemsContainer.appendChild(
        itemEl
      );
    });


    const removeBtns =
      cartItemsContainer.querySelectorAll(
        ".remove-item-btn"
      );


    removeBtns.forEach((btn) => {

      btn.addEventListener("click", () => {

        const index =
          parseInt(
            btn.getAttribute(
              "data-index"
            ),
            10
          );


        if (
          Number.isInteger(index) &&
          index >= 0 &&
          index < cart.length
        ) {

          cart.splice(index, 1);
        }


        updateCartUI();


        if (
          sizeSelect &&
          sizeSelect.value &&
          currentProduct.title
        ) {

          updateStockUI(
            sizeSelect.value
          );
        }

      });
    });
  }


  // ==========================================
  // AGREGAR AL CARRITO
  // ==========================================

  function addItemToCart() {

    if (currentProduct.isSoldOut) {
      return false;
    }


    const selectedSize =sizeSelect ? sizeSelect.value: "";

    if (!selectedSize) {

      alert(
        "Por favor elige una talla antes de continuar."
      );

      return false;
    }

    updateStockUI(
      selectedSize
    );


    if (currentAvailableStock <= 0) {

      alert(
        "Esta talla está agotada."
      );

      return false;
    }


    if (
      currentQuantity <= 0 ||
      currentQuantity >
        currentAvailableStock
    ) {

      alert(
        "La cantidad seleccionada supera el stock disponible."
      );

      return false;
    }


    const existingIndex =
      cart.findIndex((item) => {

        return (
          item.title ===
            currentProduct.title &&
          item.size ===
            selectedSize
        );
      });


    if (existingIndex > -1) {

      const newQuantity =
        Number(
          cart[existingIndex].quantity
        ) +
        Number(
          currentQuantity
        );


      const maxStock =
        Number(
          currentProduct.stock[
            selectedSize
          ]
        ) || 0;


      if (newQuantity > maxStock) {

        alert(
          "No hay suficiente stock para agregar esa cantidad."
        );

        return false;
      }


      cart[existingIndex].quantity =
        newQuantity;

    } else {

      cart.push({

        title:
          currentProduct.title,

        price:
          currentProduct.price,

        image:
          currentProduct.image,

        size:
          selectedSize,

        quantity:
          currentQuantity
      });
    }


    updateCartUI();

    updateStockUI(
      selectedSize
    );

    return true;
  }


  // ==========================================
  // BOTÓN AGREGAR
  // ==========================================

  if (addToCartBtn) {

    addToCartBtn.addEventListener(
      "click",
      () => {

        if (addItemToCart()) {

          closeAll();

          if (cartDrawer) {

            cartDrawer.classList.add(
              "open"
            );
          }

          if (overlay) {

            overlay.classList.add(
              "active"
            );
          }
        }
      }
    );
  }


  // ==========================================
  // TOTAL DEL CARRITO
  // ==========================================

  function getCartTotal() {

    return cart.reduce(
      (total, item) =>
        total +
        Number(item.price) *
        Number(item.quantity),
      0
    );
  }


  // ==========================================
  // FECHA DE ENTREGA
  // ==========================================

  function updateDeliveryEstimate() {

    if (!estimatedDeliveryText) {
      return;
    }


    const today =
      new Date();


    const deliveryDate =
      new Date(today);


    let businessDays = 0;


    while (businessDays < 5) {

      deliveryDate.setDate(
        deliveryDate.getDate() + 1
      );


      const day =
        deliveryDate.getDay();


      if (
        day !== 0 &&
        day !== 6
      ) {

        businessDays++;
      }
    }


    const options = {
      weekday: "long",
      day: "numeric",
      month: "long"
    };


    const formattedDate =
      deliveryDate.toLocaleDateString(
        "es-MX",
        options
      );


    estimatedDeliveryText.innerText =
      `Entrega estimada: ${formattedDate}`;
  }


  // ==========================================
  // PAYPAL
  // ==========================================

  function renderPayPalButtons() {

    if (!paypalContainer) {

      console.warn(
        "No existe #paypal-button-container."
      );

      return;
    }


    if (!window.paypal) {

      console.warn(
        "PayPal todavía no está cargado."
      );

      paypalContainer.innerHTML = `
        <p style="
          color:#666;
          font-size:13px;
          text-align:center;
        ">
          PayPal no está disponible en este momento.
        </p>
      `;

      return;
    }


    if (paypalRendered) {
      return;
    }


    paypalRendered = true;

    paypalContainer.innerHTML = "";


    window.paypal.Buttons({

      createOrder: async function () {

        const total =
          getCartTotal();


        if (
          !Number.isFinite(total) ||
          total <= 0
        ) {

          throw new Error(
            "El total del carrito no es válido."
          );
        }


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


        const orderData =
          await response.json();


        if (!response.ok) {

          throw new Error(
            orderData.error ||
            "No se pudo crear la orden de PayPal."
          );
        }


        if (!orderData.id) {

          throw new Error(
            "PayPal no devolvió el ID de la orden."
          );
        }


        return orderData.id;
      },


      onApprove: async function (data) {

        try {

          const response =
            await fetch(
              "/capture-paypal-order",
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json"
                },

                body: JSON.stringify({
                  orderID:
                    data.orderID
                })
              }
            );


          const captureData =
            await response.json();


          if (!response.ok) {

            throw new Error(
              captureData.error ||
              "No se pudo confirmar el pago."
            );
          }


          if (
            captureData.status ===
            "COMPLETED"
          ) {

            cart = [];

            updateCartUI();

            window.location.href =
              "/exito.html";

          } else {

            alert(
              "El pago no se pudo completar. Intenta nuevamente."
            );
          }


        } catch (error) {

          console.error(
            "Error capturando PayPal:",
            error
          );


          alert(
            error.message ||
            "Hubo un problema al confirmar tu pago."
          );
        }
      },


      onError: function (error) {

        console.error(
          "Error de PayPal:",
          error
        );


        alert(
          "Ocurrió un error con PayPal. Intenta nuevamente."
        );
      },


      onCancel: function () {

        console.log(
          "El usuario canceló PayPal."
        );
      }

    }).render(
      "#paypal-button-container"
    );
  }


  // ==========================================
  // ABRIR CHECKOUT
  // ==========================================

  async function openCheckoutModal() {

    if (cart.length === 0) {

      alert(
        "Tu carrito está vacío."
      );

      return;
    }


    const total =
      getCartTotal();


    if (checkoutSubtotal) {

      checkoutSubtotal.innerText =
        `$${total.toFixed(2)}`;
    }


    if (checkoutTotalAmount) {

      checkoutTotalAmount.innerText =
        `$${total.toFixed(2)}`;
    }


    updateDeliveryEstimate();


    closeAll();


    if (checkoutModal) {

      checkoutModal.classList.add(
        "open",
        "active"
      );

      checkoutModal.style.display =
        "flex";
    }


    if (overlay) {

      overlay.classList.add(
        "active"
      );
    }


    // ==========================================
    // CARGAR PAYPAL
    // ==========================================

    if (window.paypal) {

      renderPayPalButtons();

    } else {

      let attempts = 0;


      const paypalInterval =
        setInterval(() => {

          attempts++;


          if (window.paypal) {

            clearInterval(
              paypalInterval
            );

            renderPayPalButtons();
          }


          if (attempts >= 20) {

            clearInterval(
              paypalInterval
            );


            if (paypalContainer) {

              paypalContainer.innerHTML = `
                <p style="
                  color:#666;
                  font-size:13px;
                  text-align:center;
                ">
                  PayPal no está disponible en este momento.
                </p>
              `;
            }
          }

        }, 500);
    }
  }


  // ==========================================
  // COMPRAR AHORA
  // ==========================================

  if (buyNowBtn) {

    buyNowBtn.addEventListener(
      "click",
      () => {

        if (addItemToCart()) {

          openCheckoutModal();
        }
      }
    );
  }


  // ==========================================
  // FINALIZAR COMPRA
  // ==========================================

  if (checkoutBtn) {

    checkoutBtn.addEventListener(
      "click",
      () => {

        openCheckoutModal();
      }
    );
  }


  // ==========================================
  // STRIPE
  // ==========================================

  async function startStripeCheckout() {

    if (cart.length === 0) {

      alert(
        "Tu carrito está vacío."
      );

      return;
    }


    try {

      if (paySubmitBtn) {

        paySubmitBtn.disabled =
          true;
      }


      if (payBtnText) {

        payBtnText.innerText =
          "REDIRIGIENDO A STRIPE...";
      }


      if (paymentMessage) {

        paymentMessage.innerText =
          "";
      }


      const customerName =
        document
          .getElementById("custName")
          ?.value
          .trim() || "";


      const customerEmail =
        document
          .getElementById("custEmail")
          ?.value
          .trim() || "";


      const customerPhone =
        document
          .getElementById("custPhone")
          ?.value
          .trim() || "";


      const customerAddress =
        document
          .getElementById("custAddress")
          ?.value
          .trim() || "";


      // ==========================================
      // VALIDAR DATOS DEL CLIENTE
      // ==========================================

      if (
        !customerName ||
        !customerEmail ||
        !customerPhone ||
        !customerAddress
      ) {

        alert(
          "Por favor completa todos tus datos de envío antes de continuar."
        );


        if (paySubmitBtn) {

          paySubmitBtn.disabled =
            false;
        }


        if (payBtnText) {

          payBtnText.innerText =
            "PAGAR AHORA";
        }


        return;
      }


      // ==========================================
      // ENVIAR CARRITO AL SERVIDOR
      // ==========================================

      const response =
        await fetch(
          "/create-stripe-checkout",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({

              items: cart,

              customer: {

                name:
                  customerName,

                email:
                  customerEmail,

                phone:
                  customerPhone,

                address:
                  customerAddress
              }
            })
          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.error ||
          "No se pudo crear el pago."
        );
      }


      if (!data.url) {

        throw new Error(
          "Stripe no devolvió una URL de pago."
        );
      }


      // ==========================================
      // REDIRIGIR A STRIPE
      // ==========================================

      window.location.href =
        data.url;


    } catch (error) {

      console.error(
        "Error Stripe:",
        error
      );


      alert(
        error.message ||
        "Error al conectar con Stripe."
      );


      if (paySubmitBtn) {

        paySubmitBtn.disabled =
          false;
      }


      if (payBtnText) {

        payBtnText.innerText =
          "PAGAR AHORA";
      }
    }
  }


  // ==========================================
  // FORMULARIO STRIPE
  // ==========================================

  if (paymentForm) {

    paymentForm.addEventListener(
      "submit",
      async (e) => {

        e.preventDefault();

        await startStripeCheckout();
      }
    );
  }


  // ==========================================
  // CONTACTO
  // ==========================================

  if (
    btnContacto &&
    cuadroContacto
  ) {

    btnContacto.addEventListener(
      "click",
      () => {

        cuadroContacto.classList.toggle(
          "hidden"
        );
      }
    );
  }


  // ==========================================
  // INICIALIZAR CARRITO
  // ==========================================

  updateCartUI();

});