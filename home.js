(function(){
  // --- SINGLE Firebase App for Users + Admins ---
  const firebaseConfig = {
    apiKey: "AIzaSyDdTPmpaIPWSDWOmR-fXgvAb7hoxZUawcc",
    authDomain: "e-commerce-39c74.firebaseapp.com",
    projectId: "e-commerce-39c74",
    storageBucket: "e-commerce-39c74.firebasestorage.app",
    messagingSenderId: "863375033754",
    appId: "1:863375033754:web:7ba248c8dbb1566c83e623"
  };

  if(!firebase.apps.length){
    firebase.initializeApp(firebaseConfig);
  }

    // ---------- GUEST SESSION ----------
  let guestId = localStorage.getItem("guestId");
  if (!guestId) {
    guestId = "guest_" + crypto.randomUUID();
    localStorage.setItem("guestId", guestId);
  }

  // const userAuth = firebase.auth();
  const userDb = firebase.firestore();
  const adminDb = firebase.firestore();

  // Database reference for hero slides
  const db = userDb;

  // ---------- PAGE LOADER ----------
  let pageLoader = document.getElementById("pageLoader");
  if(!pageLoader){
    pageLoader = document.createElement("div");
    pageLoader.id = "pageLoader";
    pageLoader.style = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
      z-index: 9999; opacity:1; transition: opacity 0.4s ease;
      opacity: 0;
    `;
    pageLoader.innerHTML = `
      <!-- PLACE AT TOP OF BODY -->
<div id="cartLoader" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
  <svg xmlns="http://www.w3.org/2000/svg" class="fas fa-shopping-cart text-white w-12 h-12 animate-pulse"  viewBox="0 0 16 16"><path fill="currentColor" d="M0 
    2.5A.5.5 0 0 1 .5 2H2a.5.5 0 0 1 .485.379L2.89 4H14.5a.5.5 0 0 1 .485.621l-1.5 6A.5.5 0 0 1 13 11H4a.5.5 0 0 1-.485-.379L1.61 
    3H.5a.5.5 0 0 1-.5-.5M3.14 5l.5 2H5V5zM6 5v2h2V5zm3 0v2h2V5zm3 0v2h1.36l.5-2zm1.11 3H12v2h.61zM11 8H9v2h2zM8 8H6v2h2zM5 8H3.89l.5 2H5zm0 
    5a1 1 0 1 0 0 2a1 1 0 0 0 0-2m-2 1a2 2 0 1 1 4 0a2 2 0 0 1-4 0m9-1a1 1 0 1 0 0 2a1 1 0 0 0 0-2m-2 1a2 2 0 1 1 4 0a2 2 0 0 1-4 0"/></svg>
</div>
    `;
    document.body.appendChild(pageLoader);
  }

  function showPageLoader(){
    pageLoader.style.display = "flex";
    pageLoader.style.opacity = "1";
    document.body.style.overflow = "hidden";
  }

  function hidePageLoader(){
    pageLoader.style.opacity = "0";
    setTimeout(()=>{
      pageLoader.style.display = "none";
      document.body.style.overflow = "";
    }, 400);
  }

  // Safety fallback in case everything hangs
  setTimeout(()=> hidePageLoader(), 10000);

  // ---------- STATE ----------
  let currentProducts = [];
  let displayedCount = 0;
  let tipIndex = 0;
  let sliderIndex = 0;
  const perPage = 8;
  let cartUnsub = null;

  const skinTips = [
    "Stay hydrated — drink at least 8 glasses of water daily.",
    "Apply sunscreen every morning, even on cloudy days.",
    "Eat a balanced diet with vitamins for skin health.",
    "Sleep at least 7–8 hours to allow skin repair.",
    "Wash your face twice daily with a gentle cleanser.",
    "Use natural products when possible to avoid irritation."
  ];

  // ---------- NOTIFICATIONS ----------
  const activeNotifications = new Set();
  function showNotification(message, type="info", duration=3000){
    const containerId = "notification-container";
    let container = document.getElementById(containerId);
    if(!container){
      container = document.createElement("div");
      container.id = containerId;
      container.className = "fixed top-4 right-4 z-50 flex flex-col gap-2";
      document.body.appendChild(container);
    }
    if(activeNotifications.has(message)) return;
    activeNotifications.add(message);

    const notif = document.createElement("div");
    notif.className = `
      flex items-center justify-between gap-3 p-4 bg-white rounded-lg shadow-lg
      border border-gray-200 min-w-[250px] max-w-sm
      animate-slideIn
    `;

    const icon = document.createElement("span");
    if(type==="success") icon.innerHTML=`<i class="fas fa-check-circle text-green-500 text-xl"></i>`;
    else if(type==="error") icon.innerHTML=`<i class="fas fa-times-circle text-red-500 text-xl"></i>`;
    else if(type==="warning") icon.innerHTML=`<i class="fas fa-exclamation-triangle text-yellow-500 text-xl"></i>`;
    else icon.innerHTML=`<i class="fas fa-info-circle text-blue-500 text-xl"></i>`;

    const text = document.createElement("span");
    text.className="flex-1 text-gray-800 font-medium";
    text.textContent = message;

    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = "&times;";
    closeBtn.className = "ml-4 text-gray-400 hover:text-gray-600 font-bold text-lg";
    closeBtn.onclick = () => removeNotification(notif, message);

    notif.appendChild(icon);
    notif.appendChild(text);
    notif.appendChild(closeBtn);
    container.appendChild(notif);

    setTimeout(()=> removeNotification(notif,message), duration);
  }

  function removeNotification(notif,message){
    if(!notif) return;
    notif.classList.remove("animate-slideIn");
    notif.classList.add("animate-slideOut");
    notif.addEventListener("animationend", ()=> notif.remove());
    activeNotifications.delete(message);
  }

  // ---------- NOTIFICATION STYLES ----------
  const style = document.createElement("style");
  style.textContent = `
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(50px); }
      to { opacity: 1; transform: translateX(0); }
    }
    .animate-slideIn { animation: slideIn 0.3s ease-out forwards; }

    @keyframes slideOut {
      from { opacity: 1; transform: translateX(0); }
      to { opacity: 0; transform: translateX(50px); }
    }
    .animate-slideOut { animation: slideOut 0.3s ease-in forwards; }
  `;
  document.head.appendChild(style);

  // ---------- UTILS ----------
  function escapeHtml(text){ if(text==null) return ''; return String(text).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function showButtonLoader(button){ if(!button) return null; const original=button.innerHTML; button.disabled=true; button.innerHTML=`<span class="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4 inline-block mr-2"></span> Loading...`; return ()=>{ button.disabled=false; button.innerHTML=original; }; }

  // ---------- ROTATE SKIN TIPS ----------
  function rotateTipsFade(){
    const el = document.getElementById("skinTip");
    if(!el) return;
    el.style.opacity=0;
    setTimeout(()=>{
      el.textContent = skinTips[tipIndex];
      el.style.opacity=1;
      tipIndex = (tipIndex+1) % skinTips.length;
    },300);
  }
  rotateTipsFade();
  setInterval(rotateTipsFade, 5000);

  // ===== HERO SLIDER ELEMENTS =====
const heroSlider = document.querySelector(".hero-slider");
const heroImage = document.getElementById("heroImage");
const heroTitle = document.getElementById("heroTitle");
const heroText = document.getElementById("heroText");
const dotsContainer = document.getElementById("heroDots");

let slides = [];
let currentSlide = 0;
let interval;
let startX = 0;

// ===== FETCH SLIDES FROM FIRESTORE (REAL-TIME) =====
  function loadHeroSlides() {
    const skeleton = document.getElementById("heroSkeleton");

  // Show skeleton while fetching
  skeleton.classList.remove("hidden");

    db.collection("heroSliders")
      .where("active", "==", true)
      .orderBy("order", "asc")
      .onSnapshot(snapshot => {
        slides = snapshot.docs.map(doc => ({
          image: doc.data().imageUrl,
          title: doc.data().title,
          text: doc.data().subtitle
        }));

        createDots();

        // Reset to first slide if currentSlide exceeds length
        if (currentSlide >= slides.length) currentSlide = 0;

        showSlide(currentSlide);
        resetAutoSlide();

             // Hide skeleton once slides are ready
      skeleton.classList.add("hidden");
      
      }, err => {
        console.error("Error loading hero slides:", err);
      });
  } 

// ===== CREATE DOTS =====
function createDots() {
  dotsContainer.innerHTML = "";
  slides.forEach((_, index) => {
    const dot = document.createElement("span");
    dot.addEventListener("click", () => {
      currentSlide = index;
      showSlide(index);
      resetAutoSlide();
    });
    dotsContainer.appendChild(dot);
  });
}

// ===== SHOW SLIDE =====
function showSlide(index) {
  if (slides.length === 0) return;

  heroImage.classList.add("fade-out");

  setTimeout(() => {
    heroImage.src = slides[index].image;
    heroTitle.textContent = slides[index].title;
    heroText.textContent = slides[index].text;

    heroTitle.style.animation = "none";
    heroText.style.animation = "none";
    heroTitle.offsetHeight; // force reflow
    heroText.offsetHeight;
    heroTitle.style.animation = "";
    heroText.style.animation = "";

    heroImage.classList.remove("fade-out");
  }, 300);

  document.querySelectorAll(".hero-dots span").forEach((dot, i) => {
    dot.classList.toggle("active", i === index);
  });
}

// ===== AUTO SLIDE =====
function startAutoSlide() {
  interval = setInterval(() => {
    currentSlide = (currentSlide + 1) % slides.length;
    showSlide(currentSlide);
  }, 5000);
}

function stopAutoSlide() {
  clearInterval(interval);
}

function resetAutoSlide() {
  stopAutoSlide();
  startAutoSlide();
}

// ===== PAUSE ON HOVER =====
heroSlider.addEventListener("mouseenter", stopAutoSlide);
heroSlider.addEventListener("mouseleave", startAutoSlide);

// ===== SWIPE SUPPORT =====
heroSlider.addEventListener("touchstart", e => {
  startX = e.touches[0].clientX;
});

heroSlider.addEventListener("touchend", e => {
  const endX = e.changedTouches[0].clientX;
  const diff = startX - endX;

  if (Math.abs(diff) > 50) {
    if (diff > 0) {
      currentSlide = (currentSlide + 1) % slides.length;
    } else {
      currentSlide = (currentSlide - 1 + slides.length) % slides.length;
    }
    showSlide(currentSlide);
    resetAutoSlide();
  }
});

// ===== INIT HERO SLIDER =====
loadHeroSlides();

    // ---------- Header Scroll ----------
const header = document.getElementById("mainHeader");

window.addEventListener("scroll", () => {
  if (!header) return;

  if (window.scrollY > 50) {
    // Remove white background
    header.classList.remove("bg-white");
    // Add gradient classes individually
    header.classList.add("bg-gradient-to-r", "from-[#fbcfe8]", "to-[#f9a8d4]");
  } else {
    // Remove gradient classes individually
    header.classList.remove("bg-gradient-to-r", "from-[#fbcfe8]", "to-[#f9a8d4]");
    // Add white background
    header.classList.add("bg-white");
  }
});

// ===== Open Email Modal =====
function openPasswordEmailModal() {
  const modal = document.getElementById("passwordEmailModal");
  const content = document.getElementById("passwordEmailContent");
  modal.classList.remove("hidden");
  setTimeout(() => {
    content.classList.remove("scale-90", "opacity-0");
    content.classList.add("scale-100", "opacity-100");
  }, 10);
}

// ===== Close Email Modal =====
function closePasswordEmailModal() {
  const modal = document.getElementById("passwordEmailModal");
  const content = document.getElementById("passwordEmailContent");
  content.classList.add("scale-90", "opacity-0");
  setTimeout(() => {
    modal.classList.add("hidden");
  }, 300);
}

// ===== Success Modal =====
function openPasswordResetModal() {
  const modal = document.getElementById("passwordResetModal");
  const content = document.getElementById("passwordResetContent");
  modal.classList.remove("hidden");
  setTimeout(() => {
    content.classList.remove("scale-90", "opacity-0");
    content.classList.add("scale-100", "opacity-100");
  }, 10);
}

function closePasswordResetModal() {
  const modal = document.getElementById("passwordResetModal");
  const content = document.getElementById("passwordResetContent");
  content.classList.add("scale-90", "opacity-0");
  setTimeout(() => {
    modal.classList.add("hidden");
  }, 300);
}

// ===== Error Modal =====
function showPasswordError(message) {
  document.getElementById("errorMessage").innerText = message;
  document.getElementById("passwordErrorModal").classList.remove("hidden");
}

function closePasswordErrorModal() {
  document.getElementById("passwordErrorModal").classList.add("hidden");
}

// ===== Event Listeners for Modal Buttons =====
document.getElementById("forgotPassword")?.addEventListener("click", openPasswordEmailModal);
document.getElementById("sendResetLinkBtn")?.addEventListener("click", async () => {
  const emailInput = document.getElementById("resetEmailInput");
  const email = emailInput.value.trim();

  if (!email) {
    showPasswordError("Please enter your registered email.");
    return;
  }

  const btn = document.getElementById("sendResetLinkBtn");

  try {
    btn.innerText = "Sending...";
    btn.disabled = true;

    await firebase.auth().sendPasswordResetEmail(email);

    closePasswordEmailModal();
    openPasswordResetModal();

    emailInput.value = "";
  } catch (err) {
    showPasswordError(err.message);
  } finally {
    btn.innerText = "Send Reset Link";
    btn.disabled = false;
  }
});

// Modal close buttons
document.getElementById("cancelPasswordEmail")?.addEventListener("click", closePasswordEmailModal);
document.getElementById("closePasswordResetBtn")?.addEventListener("click", closePasswordResetModal);
document.getElementById("closePasswordErrorBtn")?.addEventListener("click", closePasswordErrorModal);

// ---------- PRODUCTS ----------
async function filterProducts(category="All"){
  displayedCount = 0;
  const productList = document.getElementById("product-list");
  if(!productList) return;

  // skeleton
  productList.innerHTML = "";
  for(let i=0; i<perPage; i++){
    productList.innerHTML += `<div class="animate-pulse border rounded-xl p-4 text-center shadow">
      <div class="h-32 bg-gray-300 mb-2 rounded"></div>
      <div class="h-5 bg-gray-300 mb-1 rounded"></div>
      <div class="h-5 bg-gray-300 w-1/2 mx-auto rounded"></div>
    </div>`;
  }

  showPageLoader();
  try {
    const snapshot = await adminDb.collection("products").get();

    // Map products and ensure weight is included
    const allProducts = snapshot.docs.map(d => ({
      id: d.id,
      name: d.data().name || "Untitled",
      price: Number(d.data().price || 0),
      image: d.data().image || "https://via.placeholder.com/300x200?text=No+Image",
      category: d.data().category || "Misc",
      description: d.data().description || "",
      weight: Number(d.data().weight || 0) // ✅ ensures weight is saved
    }));

    const filtered = category === "All" ? allProducts : allProducts.filter(p => p.category === category);
    currentProducts = filtered || [];

    // category highlight
    document.querySelectorAll(".category-btn").forEach(btn => {
      if(btn.dataset.category === category){
        btn.classList.add("bg-pink-500","text-white");
        btn.classList.remove("bg-pink-100","text-gray-800");
      } else {
        btn.classList.remove("bg-pink-500","text-white");
        btn.classList.add("bg-pink-100","text-gray-800");
      }
    });

    setTimeout(() => { 
      renderProducts(true); 
      hidePageLoader(); 
    }, 300);

  } catch(err) {
    console.error(err);
    showNotification("Failed to load products","error");
    hidePageLoader();
    if(productList) productList.innerHTML = `<div class="text-center text-gray-500 col-span-full">Failed to load products</div>`;
  }
}
  window.filterProducts = filterProducts;

    // ---------- RENDER PRODUCTS ----------
  function renderProducts(reset=false){
    const productList = document.getElementById("product-list");
    if(!productList) return;
    if(displayedCount === 0 || reset) productList.innerHTML = "";

    const start = displayedCount;
    const end = Math.min(displayedCount + perPage, currentProducts.length);
    const chunk = currentProducts.slice(start, end);

    chunk.forEach(product=>{
        const image = product.image || 'https://via.placeholder.com/300x200?text=No+Image';
        const card = document.createElement('div');
        card.className = "border rounded-xl p-4 text-center shadow opacity-0 transition-opacity duration-500";
        card.innerHTML = `
            <img src="${image}" class="mx-auto mb-2 h-32 w-full object-cover rounded" />
            <h4 class="font-semibold">${escapeHtml(product.name||'Untitled')}</h4>
            <p class="text-pink-500 font-bold">₦${(Number(product.price||0)).toLocaleString()}</p>
            <div class="mt-2 space-x-2">
              <button data-id="${product.id}" class="view-btn text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">View</button>
              <button data-id="${product.id}" class="add-btn text-sm px-3 py-1 bg-pink-600 text-white rounded hover:bg-pink-700">Add to Cart</button>
            </div>
        `;
        productList.appendChild(card);
        requestAnimationFrame(()=> card.style.opacity="1");
    });

    displayedCount += chunk.length;

    // Bind buttons
    productList.querySelectorAll('.view-btn').forEach(btn=>{
    if(!btn.dataset.bound){
        btn.dataset.bound='1';
        btn.addEventListener('click', async ()=>{
            const resetLoader = showLoader(btn);      // start loader
            await viewProduct(btn.dataset.id);        // wait for modal creation
            resetLoader && resetLoader();             // stop loader
        });
    }
});

productList.querySelectorAll('.add-btn').forEach(btn=>{
    if(!btn.dataset.bound){
        btn.dataset.bound='1';
        btn.addEventListener('click', async ()=>{
            const resetLoader = showLoader(btn);      // start loader
            await window.addToCart(btn.dataset.id);   // wait for addToCart
            resetLoader && resetLoader();             // stop loader
        });
    }
});

    // Load More button
    const existing = document.getElementById("loadMoreBtn");
    if(displayedCount < currentProducts.length){
        if(!existing){
            const btn = document.createElement("button");
            btn.id="loadMoreBtn";
            btn.textContent="Load More";
            btn.className="mt-4 px-6 py-2 bg-pink-500 text-white rounded hover:bg-pink-600 block mx-auto";
            btn.onclick=()=> renderProducts();
            productList.parentElement.appendChild(btn);
        }
    } else if(existing) existing.remove();
  }

  function viewProduct(productId){
  const product = currentProducts.find(p=>p.id===productId);
  if(!product) return showNotification("Product not found","error");

  let modal = document.getElementById("productModal");

  if(!modal){
      modal = document.createElement("div");
      modal.id = "productModal";
      modal.className = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden";
      document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-lg w-full relative">
      <button id="closeProductModal" class="absolute top-2 right-2 text-gray-500 hover:text-gray-800">&times;</button>
      <img id="modalProductImage" src="" class="w-full h-64 object-cover mb-4 rounded">
      <h2 id="modalProductName" class="text-xl font-bold mb-2"></h2>
      <p id="modalProductPrice" class="text-pink-500 font-semibold mb-4"></p>
      <p id="modalProductDescription" class="text-gray-700 mb-4"></p>

      <button id="modalAddToCartBtn"
        class="w-full mb-2 px-4 py-2 bg-pink-600 text-white rounded hover:bg-pink-700">
        Add to Cart
      </button>

      <button id="buyNowBtn"
        class="w-full px-4 py-2 border rounded hover:bg-gray-100">
        Buy Now
      </button>
    </div>
  `;

  // --- Populate modal content ---
  document.getElementById("modalProductImage").src = product.image || 'https://via.placeholder.com/300x200?text=No+Image';
  document.getElementById("modalProductName").textContent = product.name || "Untitled";
  document.getElementById("modalProductPrice").textContent = `₦${Number(product.price||0).toLocaleString()}`;
  document.getElementById("modalProductDescription").textContent = product.description || "No description available.";

  const addBtn = modal.querySelector("#modalAddToCartBtn");
  const buyBtn = modal.querySelector("#buyNowBtn");

  if(addBtn){
    addBtn.onclick = async ()=>{
      const reset = showButtonLoader(addBtn);
      await window.addToCart(product.id);
      reset && reset();
    };
  }

  if(buyBtn){
    buyBtn.onclick = async ()=>{
      const reset = showButtonLoader(buyBtn);
      await window.addToCart(product.id);
      reset && reset();
      window.location.href = "cart.html";
    };
  }

  // --- Show modal and disable background ---
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden"; // prevent scrolling
  modal.addEventListener("click", (e)=>{
    if(e.target === modal){ // click outside modal content closes it
      closeModal();
    }
  });

  // --- Close button handler ---
  modal.querySelector("#closeProductModal").onclick = closeModal;

  function closeModal(){
    modal.classList.add("hidden");
    document.body.style.overflow = ""; // re-enable scroll
  }
}

  // ---------- BUTTON LOADER ----------
  function showButtonLoader(button){
      if(!button) return null;
      const original = button.innerHTML;
      button.disabled = true;
      button.innerHTML = `<span class="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4 inline-block mr-2"></span> Loading...`;
      return ()=>{ button.disabled=false; button.innerHTML=original; };
  }

// Ensure guest cart exists
async function ensureGuestCart() {
  const cartDocRef = userDb.collection("guestCarts").doc(guestId);
  const snap = await cartDocRef.get();
  if (!snap.exists) {
    await cartDocRef.set({
      guestId,
      items: [],
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
}

// ---------- ADD TO CART ----------
window.addToCart = async function(id){
  const product = currentProducts.find(p => p.id === id);
  if(!product) return showNotification("Product not found","error");

  const cartDocRef = userDb.collection("guestCarts").doc(guestId);

  try {
    // Make sure cart exists
    await ensureGuestCart();

    const snap = await cartDocRef.get();
    let items = snap.exists ? snap.data().items || [] : [];

    const existing = items.find(i => i.id === product.id);

    if(existing){
      existing.quantity += 1;
    } else {
      items.push({
        id: product.id,
        name: product.name,
        price: Number(product.price) || 0,
        image: product.image || "",
        quantity: 1,
        weight: Number(product.weight || 0)
      });
    }

    await cartDocRef.set({
      guestId,
      items,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // ✅ SYNC IMMEDIATELY
localStorage.setItem("cart", JSON.stringify(items));

    showNotification("Added to cart!", "success");
    updateCartCount();

  } catch(err){
    console.error(err);
    showNotification("Failed to add to cart","error");
  }
};

// ---------- UPDATE CART COUNT ----------
function updateCartCount(){
  const el = document.getElementById("cartCount");
  if(!el) return;

  // ✅ Instant count from localStorage
  try {
    const cached = JSON.parse(localStorage.getItem("cart")) || [];
    const cachedTotal = cached.reduce((s,i)=>s+(i.quantity||0),0);
    el.textContent = cachedTotal;
  } catch {
    el.textContent = "0";
  }

  // Unsubscribe previous listener
  if(cartUnsub){
    try{ cartUnsub(); } catch(e){}
    cartUnsub = null;
  }

  const cartDocRef = userDb.collection("guestCarts").doc(guestId);

  // Make sure cart exists first
  ensureGuestCart().then(()=>{
    cartUnsub = cartDocRef.onSnapshot(doc=>{
      if(!doc.exists){
        el.textContent = "0";
        return;
      }
      const items = doc.data().items || [];
      const total = items.reduce((sum,i)=>sum+(i.quantity||0),0);
      el.textContent = total;
    }, err=>{
      console.error(err);
      el.textContent = "0";
    });
  }).catch(err=>{
    console.error(err);
    el.textContent = "0";
  });
}

// ---------- INITIALIZE CART COUNT ----------
updateCartCount();

  // ---------- INITIAL LOAD ----------
  rotateTipsFade();
  setInterval(rotateTipsFade,5000);
  // setInterval(()=>slideImages(true),3000);
  filterProducts("All");

  // ---------- HELPERS ----------
  function escapeHtml(text){ if(text==null) return ''; return String(text).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function showLoader(el){ if(!el) return null; const original=el.innerHTML; el.disabled=true; el.innerHTML=`<span class="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4 inline-block mr-2"></span> Loading...`; return ()=>{ el.disabled=false; el.innerHTML=original; }; }

  // WhatsApp 
  
  // Hamburger Menu
const menuToggle = document.getElementById("menuToggle");
const mobileMenu = document.getElementById("mobileMenu");
const menuOverlay = document.getElementById("menuOverlay");
const closeMenu = document.getElementById("closeMenu");

let scrollPosition = 0;

function openMenu() {
    mobileMenu.classList.remove("-translate-x-full");
    mobileMenu.classList.add("translate-x-0");
    menuOverlay.classList.remove("hidden");

    // Disable background scroll
    scrollPosition = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollPosition}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.overflow = "hidden";
}

function closeMenuFunc() {
    mobileMenu.classList.remove("translate-x-0");
    mobileMenu.classList.add("-translate-x-full");
    menuOverlay.classList.add("hidden");

    // Enable background scroll
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.overflow = "";
    window.scrollTo(0, scrollPosition); // Restore scroll
}

menuToggle.addEventListener("click", openMenu);
closeMenu.addEventListener("click", closeMenuFunc);
menuOverlay.addEventListener("click", closeMenuFunc);
})();









// (function(){
//   // --- SINGLE Firebase App for Users + Admins ---
//   const firebaseConfig = {
//     apiKey: "AIzaSyDdTPmpaIPWSDWOmR-fXgvAb7hoxZUawcc",
//     authDomain: "e-commerce-39c74.firebaseapp.com",
//     projectId: "e-commerce-39c74",
//     storageBucket: "e-commerce-39c74.firebasestorage.app",
//     messagingSenderId: "863375033754",
//     appId: "1:863375033754:web:7ba248c8dbb1566c83e623"
//   };

//   if(!firebase.apps.length){
//     firebase.initializeApp(firebaseConfig);
//   }

//   // const userAuth = firebase.auth();
//   const userDb = firebase.firestore();
//   const adminDb = firebase.firestore();

//   // Use this as the database reference for hero slides
//   const db = userDb;

//   // ---------- PAGE LOADER ----------
//   let pageLoader = document.getElementById("pageLoader");
//   if(!pageLoader){
//     pageLoader = document.createElement("div");
//     pageLoader.id = "pageLoader";
//     pageLoader.style = `
//       position: fixed; inset: 0; background: rgba(0,0,0,0.5);
//       display: flex; align-items: center; justify-content: center;
//       z-index: 9999; opacity:1; transition: opacity 0.4s ease;
//       opacity: 0;
//     `;
//     pageLoader.innerHTML = `
//       <!-- PLACE AT TOP OF BODY -->
// <div id="cartLoader" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
//   <svg xmlns="http://www.w3.org/2000/svg" class="fas fa-shopping-cart text-white w-12 h-12 animate-pulse"  viewBox="0 0 16 16"><path fill="currentColor" d="M0 
//     2.5A.5.5 0 0 1 .5 2H2a.5.5 0 0 1 .485.379L2.89 4H14.5a.5.5 0 0 1 .485.621l-1.5 6A.5.5 0 0 1 13 11H4a.5.5 0 0 1-.485-.379L1.61 
//     3H.5a.5.5 0 0 1-.5-.5M3.14 5l.5 2H5V5zM6 5v2h2V5zm3 0v2h2V5zm3 0v2h1.36l.5-2zm1.11 3H12v2h.61zM11 8H9v2h2zM8 8H6v2h2zM5 8H3.89l.5 2H5zm0 
//     5a1 1 0 1 0 0 2a1 1 0 0 0 0-2m-2 1a2 2 0 1 1 4 0a2 2 0 0 1-4 0m9-1a1 1 0 1 0 0 2a1 1 0 0 0 0-2m-2 1a2 2 0 1 1 4 0a2 2 0 0 1-4 0"/></svg>
// </div>
//     `;
//     document.body.appendChild(pageLoader);
//   }

//   function showPageLoader(){
//     pageLoader.style.display = "flex";
//     pageLoader.style.opacity = "1";
//     document.body.style.overflow = "hidden";
//   }

//   function hidePageLoader(){
//     pageLoader.style.opacity = "0";
//     setTimeout(()=>{
//       pageLoader.style.display = "none";
//       document.body.style.overflow = "";
//     }, 400);
//   }

//   // Safety fallback in case everything hangs
//   setTimeout(()=> hidePageLoader(), 10000);

//   // ---------- STATE ----------
//   let currentProducts = [];
//   let displayedCount = 0;
//   let tipIndex = 0;
//   let sliderIndex = 0;
//   const perPage = 8;
//   let cartUnsub = null;

//   const skinTips = [
//     "Stay hydrated — drink at least 8 glasses of water daily.",
//     "Apply sunscreen every morning, even on cloudy days.",
//     "Eat a balanced diet with vitamins for skin health.",
//     "Sleep at least 7–8 hours to allow skin repair.",
//     "Wash your face twice daily with a gentle cleanser.",
//     "Use natural products when possible to avoid irritation."
//   ];

//   // ---------- NOTIFICATIONS ----------
//   const activeNotifications = new Set();
//   function showNotification(message, type="info", duration=3000){
//     const containerId = "notification-container";
//     let container = document.getElementById(containerId);
//     if(!container){
//       container = document.createElement("div");
//       container.id = containerId;
//       container.className = "fixed top-4 right-4 z-50 flex flex-col gap-2";
//       document.body.appendChild(container);
//     }
//     if(activeNotifications.has(message)) return;
//     activeNotifications.add(message);

//     const notif = document.createElement("div");
//     notif.className = `
//       flex items-center justify-between gap-3 p-4 bg-white rounded-lg shadow-lg
//       border border-gray-200 min-w-[250px] max-w-sm
//       animate-slideIn
//     `;

//     const icon = document.createElement("span");
//     if(type==="success") icon.innerHTML=`<i class="fas fa-check-circle text-green-500 text-xl"></i>`;
//     else if(type==="error") icon.innerHTML=`<i class="fas fa-times-circle text-red-500 text-xl"></i>`;
//     else if(type==="warning") icon.innerHTML=`<i class="fas fa-exclamation-triangle text-yellow-500 text-xl"></i>`;
//     else icon.innerHTML=`<i class="fas fa-info-circle text-blue-500 text-xl"></i>`;

//     const text = document.createElement("span");
//     text.className="flex-1 text-gray-800 font-medium";
//     text.textContent = message;

//     const closeBtn = document.createElement("button");
//     closeBtn.innerHTML = "&times;";
//     closeBtn.className = "ml-4 text-gray-400 hover:text-gray-600 font-bold text-lg";
//     closeBtn.onclick = () => removeNotification(notif, message);

//     notif.appendChild(icon);
//     notif.appendChild(text);
//     notif.appendChild(closeBtn);
//     container.appendChild(notif);

//     setTimeout(()=> removeNotification(notif,message), duration);
//   }

//   function removeNotification(notif,message){
//     if(!notif) return;
//     notif.classList.remove("animate-slideIn");
//     notif.classList.add("animate-slideOut");
//     notif.addEventListener("animationend", ()=> notif.remove());
//     activeNotifications.delete(message);
//   }

//   // ---------- NOTIFICATION STYLES ----------
//   const style = document.createElement("style");
//   style.textContent = `
//     @keyframes slideIn {
//       from { opacity: 0; transform: translateX(50px); }
//       to { opacity: 1; transform: translateX(0); }
//     }
//     .animate-slideIn { animation: slideIn 0.3s ease-out forwards; }

//     @keyframes slideOut {
//       from { opacity: 1; transform: translateX(0); }
//       to { opacity: 0; transform: translateX(50px); }
//     }
//     .animate-slideOut { animation: slideOut 0.3s ease-in forwards; }
//   `;
//   document.head.appendChild(style);

//   // ---------- UTILS ----------
//   function escapeHtml(text){ if(text==null) return ''; return String(text).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
//   function showButtonLoader(button){ if(!button) return null; const original=button.innerHTML; button.disabled=true; button.innerHTML=`<span class="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4 inline-block mr-2"></span> Loading...`; return ()=>{ button.disabled=false; button.innerHTML=original; }; }

//   // ---------- ROTATE SKIN TIPS ----------
//   function rotateTipsFade(){
//     const el = document.getElementById("skinTip");
//     if(!el) return;
//     el.style.opacity=0;
//     setTimeout(()=>{
//       el.textContent = skinTips[tipIndex];
//       el.style.opacity=1;
//       tipIndex = (tipIndex+1) % skinTips.length;
//     },300);
//   }
//   rotateTipsFade();
//   setInterval(rotateTipsFade, 5000);

//   // ===== HERO SLIDER ELEMENTS =====
// const heroSlider = document.querySelector(".hero-slider");
// const heroImage = document.getElementById("heroImage");
// const heroTitle = document.getElementById("heroTitle");
// const heroText = document.getElementById("heroText");
// const dotsContainer = document.getElementById("heroDots");

// let slides = [];
// let currentSlide = 0;
// let interval;
// let startX = 0;

// // ===== FETCH SLIDES FROM FIRESTORE (REAL-TIME) =====
//   function loadHeroSlides() {
//     db.collection("heroSliders")
//       .where("active", "==", true)
//       .orderBy("order", "asc")
//       .onSnapshot(snapshot => {
//         slides = snapshot.docs.map(doc => ({
//           image: doc.data().imageUrl,
//           title: doc.data().title,
//           text: doc.data().subtitle
//         }));

//         createDots();

//         // Reset to first slide if currentSlide exceeds length
//         if (currentSlide >= slides.length) currentSlide = 0;

//         showSlide(currentSlide);
//         resetAutoSlide();
//       }, err => {
//         console.error("Error loading hero slides:", err);
//       });
//   } 

// // ===== CREATE DOTS =====
// function createDots() {
//   dotsContainer.innerHTML = "";
//   slides.forEach((_, index) => {
//     const dot = document.createElement("span");
//     dot.addEventListener("click", () => {
//       currentSlide = index;
//       showSlide(index);
//       resetAutoSlide();
//     });
//     dotsContainer.appendChild(dot);
//   });
// }

// // ===== SHOW SLIDE =====
// function showSlide(index) {
//   if (slides.length === 0) return;

//   heroImage.classList.add("fade-out");

//   setTimeout(() => {
//     heroImage.src = slides[index].image;
//     heroTitle.textContent = slides[index].title;
//     heroText.textContent = slides[index].text;

//     heroTitle.style.animation = "none";
//     heroText.style.animation = "none";
//     heroTitle.offsetHeight; // force reflow
//     heroText.offsetHeight;
//     heroTitle.style.animation = "";
//     heroText.style.animation = "";

//     heroImage.classList.remove("fade-out");
//   }, 300);

//   document.querySelectorAll(".hero-dots span").forEach((dot, i) => {
//     dot.classList.toggle("active", i === index);
//   });
// }

// // ===== AUTO SLIDE =====
// function startAutoSlide() {
//   interval = setInterval(() => {
//     currentSlide = (currentSlide + 1) % slides.length;
//     showSlide(currentSlide);
//   }, 5000);
// }

// function stopAutoSlide() {
//   clearInterval(interval);
// }

// function resetAutoSlide() {
//   stopAutoSlide();
//   startAutoSlide();
// }

// // ===== PAUSE ON HOVER =====
// heroSlider.addEventListener("mouseenter", stopAutoSlide);
// heroSlider.addEventListener("mouseleave", startAutoSlide);

// // ===== SWIPE SUPPORT =====
// heroSlider.addEventListener("touchstart", e => {
//   startX = e.touches[0].clientX;
// });

// heroSlider.addEventListener("touchend", e => {
//   const endX = e.changedTouches[0].clientX;
//   const diff = startX - endX;

//   if (Math.abs(diff) > 50) {
//     if (diff > 0) {
//       currentSlide = (currentSlide + 1) % slides.length;
//     } else {
//       currentSlide = (currentSlide - 1 + slides.length) % slides.length;
//     }
//     showSlide(currentSlide);
//     resetAutoSlide();
//   }
// });

// // ===== INIT HERO SLIDER =====
// loadHeroSlides();

//     // ---------- Header Scroll ----------
// const header = document.getElementById("mainHeader");

// window.addEventListener("scroll", () => {
//   if (!header) return;

//   if (window.scrollY > 50) {
//     // Remove white background
//     header.classList.remove("bg-white");
//     // Add gradient classes individually
//     header.classList.add("bg-gradient-to-r", "from-[#fbcfe8]", "to-[#f9a8d4]");
//   } else {
//     // Remove gradient classes individually
//     header.classList.remove("bg-gradient-to-r", "from-[#fbcfe8]", "to-[#f9a8d4]");
//     // Add white background
//     header.classList.add("bg-white");
//   }
// });

// // ===== Open Email Modal =====
// function openPasswordEmailModal() {
//   const modal = document.getElementById("passwordEmailModal");
//   const content = document.getElementById("passwordEmailContent");
//   modal.classList.remove("hidden");
//   setTimeout(() => {
//     content.classList.remove("scale-90", "opacity-0");
//     content.classList.add("scale-100", "opacity-100");
//   }, 10);
// }

// // ===== Close Email Modal =====
// function closePasswordEmailModal() {
//   const modal = document.getElementById("passwordEmailModal");
//   const content = document.getElementById("passwordEmailContent");
//   content.classList.add("scale-90", "opacity-0");
//   setTimeout(() => {
//     modal.classList.add("hidden");
//   }, 300);
// }

// // ===== Success Modal =====
// function openPasswordResetModal() {
//   const modal = document.getElementById("passwordResetModal");
//   const content = document.getElementById("passwordResetContent");
//   modal.classList.remove("hidden");
//   setTimeout(() => {
//     content.classList.remove("scale-90", "opacity-0");
//     content.classList.add("scale-100", "opacity-100");
//   }, 10);
// }

// function closePasswordResetModal() {
//   const modal = document.getElementById("passwordResetModal");
//   const content = document.getElementById("passwordResetContent");
//   content.classList.add("scale-90", "opacity-0");
//   setTimeout(() => {
//     modal.classList.add("hidden");
//   }, 300);
// }

// // ===== Error Modal =====
// function showPasswordError(message) {
//   document.getElementById("errorMessage").innerText = message;
//   document.getElementById("passwordErrorModal").classList.remove("hidden");
// }

// function closePasswordErrorModal() {
//   document.getElementById("passwordErrorModal").classList.add("hidden");
// }

// // ===== Event Listeners for Modal Buttons =====
// document.getElementById("forgotPassword")?.addEventListener("click", openPasswordEmailModal);
// document.getElementById("sendResetLinkBtn")?.addEventListener("click", async () => {
//   const emailInput = document.getElementById("resetEmailInput");
//   const email = emailInput.value.trim();

//   if (!email) {
//     showPasswordError("Please enter your registered email.");
//     return;
//   }

//   const btn = document.getElementById("sendResetLinkBtn");

//   try {
//     btn.innerText = "Sending...";
//     btn.disabled = true;

//     await firebase.auth().sendPasswordResetEmail(email);

//     closePasswordEmailModal();
//     openPasswordResetModal();

//     emailInput.value = "";
//   } catch (err) {
//     showPasswordError(err.message);
//   } finally {
//     btn.innerText = "Send Reset Link";
//     btn.disabled = false;
//   }
// });

// // Modal close buttons
// document.getElementById("cancelPasswordEmail")?.addEventListener("click", closePasswordEmailModal);
// document.getElementById("closePasswordResetBtn")?.addEventListener("click", closePasswordResetModal);
// document.getElementById("closePasswordErrorBtn")?.addEventListener("click", closePasswordErrorModal);

// // ---------- PRODUCTS ----------
// async function filterProducts(category="All"){
//   displayedCount = 0;
//   const productList = document.getElementById("product-list");
//   if(!productList) return;

//   // skeleton
//   productList.innerHTML = "";
//   for(let i=0; i<perPage; i++){
//     productList.innerHTML += `<div class="animate-pulse border rounded-xl p-4 text-center shadow">
//       <div class="h-32 bg-gray-300 mb-2 rounded"></div>
//       <div class="h-5 bg-gray-300 mb-1 rounded"></div>
//       <div class="h-5 bg-gray-300 w-1/2 mx-auto rounded"></div>
//     </div>`;
//   }

//   showPageLoader();
//   try {
//     const snapshot = await adminDb.collection("products").get();

//     // Map products and ensure weight is included
//     const allProducts = snapshot.docs.map(d => ({
//       id: d.id,
//       name: d.data().name || "Untitled",
//       price: Number(d.data().price || 0),
//       image: d.data().image || "https://via.placeholder.com/300x200?text=No+Image",
//       category: d.data().category || "Misc",
//       description: d.data().description || "",
//       weight: Number(d.data().weight || 0) // ✅ ensures weight is saved
//     }));

//     const filtered = category === "All" ? allProducts : allProducts.filter(p => p.category === category);
//     currentProducts = filtered || [];

//     // category highlight
//     document.querySelectorAll(".category-btn").forEach(btn => {
//       if(btn.dataset.category === category){
//         btn.classList.add("bg-pink-500","text-white");
//         btn.classList.remove("bg-pink-100","text-gray-800");
//       } else {
//         btn.classList.remove("bg-pink-500","text-white");
//         btn.classList.add("bg-pink-100","text-gray-800");
//       }
//     });

//     setTimeout(() => { 
//       renderProducts(true); 
//       hidePageLoader(); 
//     }, 300);

//   } catch(err) {
//     console.error(err);
//     showNotification("Failed to load products","error");
//     hidePageLoader();
//     if(productList) productList.innerHTML = `<div class="text-center text-gray-500 col-span-full">Failed to load products</div>`;
//   }
// }
//   window.filterProducts = filterProducts;

//     // ---------- RENDER PRODUCTS ----------
//   function renderProducts(reset=false){
//     const productList = document.getElementById("product-list");
//     if(!productList) return;
//     if(displayedCount === 0 || reset) productList.innerHTML = "";

//     const start = displayedCount;
//     const end = Math.min(displayedCount + perPage, currentProducts.length);
//     const chunk = currentProducts.slice(start, end);

//     chunk.forEach(product=>{
//         const image = product.image || 'https://via.placeholder.com/300x200?text=No+Image';
//         const card = document.createElement('div');
//         card.className = "border rounded-xl p-4 text-center shadow opacity-0 transition-opacity duration-500";
//         card.innerHTML = `
//             <img src="${image}" class="mx-auto mb-2 h-32 w-full object-cover rounded" />
//             <h4 class="font-semibold">${escapeHtml(product.name||'Untitled')}</h4>
//             <p class="text-pink-500 font-bold">₦${(Number(product.price||0)).toLocaleString()}</p>
//             <div class="mt-2 space-x-2">
//               <button data-id="${product.id}" class="view-btn text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">View</button>
//               <button data-id="${product.id}" class="add-btn text-sm px-3 py-1 bg-pink-600 text-white rounded hover:bg-pink-700">Add to Cart</button>
//             </div>
//         `;
//         productList.appendChild(card);
//         requestAnimationFrame(()=> card.style.opacity="1");
//     });

//     displayedCount += chunk.length;

//     // Bind buttons
//     productList.querySelectorAll('.view-btn').forEach(btn=>{
//     if(!btn.dataset.bound){
//         btn.dataset.bound='1';
//         btn.addEventListener('click', async ()=>{
//             const resetLoader = showLoader(btn);      // start loader
//             await viewProduct(btn.dataset.id);        // wait for modal creation
//             resetLoader && resetLoader();             // stop loader
//         });
//     }
// });

// productList.querySelectorAll('.add-btn').forEach(btn=>{
//     if(!btn.dataset.bound){
//         btn.dataset.bound='1';
//         btn.addEventListener('click', async ()=>{
//             const resetLoader = showLoader(btn);      // start loader
//             await window.addToCart(btn.dataset.id);   // wait for addToCart
//             resetLoader && resetLoader();             // stop loader
//         });
//     }
// });

//     // Load More button
//     const existing = document.getElementById("loadMoreBtn");
//     if(displayedCount < currentProducts.length){
//         if(!existing){
//             const btn = document.createElement("button");
//             btn.id="loadMoreBtn";
//             btn.textContent="Load More";
//             btn.className="mt-4 px-6 py-2 bg-pink-500 text-white rounded hover:bg-pink-600 block mx-auto";
//             btn.onclick=()=> renderProducts();
//             productList.parentElement.appendChild(btn);
//         }
//     } else if(existing) existing.remove();
//   }

//   function viewProduct(productId){
//   const product = currentProducts.find(p=>p.id===productId);
//   if(!product) return showNotification("Product not found","error");

//   let modal = document.getElementById("productModal");

//   if(!modal){
//       modal = document.createElement("div");
//       modal.id = "productModal";
//       modal.className = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden";
//       document.body.appendChild(modal);
//   }

//   modal.innerHTML = `
//     <div class="bg-white rounded-lg p-6 max-w-lg w-full relative">
//       <button id="closeProductModal" class="absolute top-2 right-2 text-gray-500 hover:text-gray-800">&times;</button>
//       <img id="modalProductImage" src="" class="w-full h-64 object-cover mb-4 rounded">
//       <h2 id="modalProductName" class="text-xl font-bold mb-2"></h2>
//       <p id="modalProductPrice" class="text-pink-500 font-semibold mb-4"></p>
//       <p id="modalProductDescription" class="text-gray-700 mb-4"></p>

//       <button id="modalAddToCartBtn"
//         class="w-full mb-2 px-4 py-2 bg-pink-600 text-white rounded hover:bg-pink-700">
//         Add to Cart
//       </button>

//       <button id="buyNowBtn"
//         class="w-full px-4 py-2 border rounded hover:bg-gray-100">
//         Buy Now
//       </button>
//     </div>
//   `;

//   // --- Populate modal content ---
//   document.getElementById("modalProductImage").src = product.image || 'https://via.placeholder.com/300x200?text=No+Image';
//   document.getElementById("modalProductName").textContent = product.name || "Untitled";
//   document.getElementById("modalProductPrice").textContent = `₦${Number(product.price||0).toLocaleString()}`;
//   document.getElementById("modalProductDescription").textContent = product.description || "No description available.";

//   const addBtn = modal.querySelector("#modalAddToCartBtn");
//   const buyBtn = modal.querySelector("#buyNowBtn");

//   if(addBtn){
//     addBtn.onclick = async ()=>{
//       const reset = showButtonLoader(addBtn);
//       await window.addToCart(product.id);
//       reset && reset();
//     };
//   }

//   if(buyBtn){
//     buyBtn.onclick = async ()=>{
//       const reset = showButtonLoader(buyBtn);
//       await window.addToCart(product.id);
//       reset && reset();
//       window.location.href = "cart.html";
//     };
//   }

//   // --- Show modal and disable background ---
//   modal.classList.remove("hidden");
//   document.body.style.overflow = "hidden"; // prevent scrolling
//   modal.addEventListener("click", (e)=>{
//     if(e.target === modal){ // click outside modal content closes it
//       closeModal();
//     }
//   });

//   // --- Close button handler ---
//   modal.querySelector("#closeProductModal").onclick = closeModal;

//   function closeModal(){
//     modal.classList.add("hidden");
//     document.body.style.overflow = ""; // re-enable scroll
//   }
// }

//   // ---------- BUTTON LOADER ----------
//   function showButtonLoader(button){
//       if(!button) return null;
//       const original = button.innerHTML;
//       button.disabled = true;
//       button.innerHTML = `<span class="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4 inline-block mr-2"></span> Loading...`;
//       return ()=>{ button.disabled=false; button.innerHTML=original; };
//   }

//   // ---------- CART ----------
// window.addToCart = async function(id){
//   if(!userAuth.currentUser) return showNotification("Login required","error");

//   // Find product from currentProducts (ensures weight exists)
//   const product = currentProducts.find(p => p.id === id);
//   if(!product) return showNotification("Product not found","error");

//   const uid = userAuth.currentUser.uid;
//   const cartDocRef = userDb.collection("carts").doc(uid);
//   const itemsRef = cartDocRef.collection("items");

//   try {
//     // Create cart if it doesn't exist
//     const cartSnap = await cartDocRef.get();
//     if(!cartSnap.exists) {
//       await cartDocRef.set({ createdAt: firebase.firestore.FieldValue.serverTimestamp() });
//     }

//     // Check if item already in cart
//     const q = await itemsRef.where("id", "==", product.id).get();
//     if(!q.empty) {
//       // Increment quantity if already exists
//       await q.docs[0].ref.update({
//         quantity: firebase.firestore.FieldValue.increment(1)
//       });
//     } else {
//       // Add new item with weight included
//       await itemsRef.add({
//         id: product.id,
//         name: product.name,
//         price: Number(product.price) || 0,
//         image: product.image || 'https://via.placeholder.com/150',
//         quantity: 1,
//         weight: Number(product.weight || 0), // ✅ weight included
//         createdAt: firebase.firestore.FieldValue.serverTimestamp()
//       });
//     }

//     showNotification("Added to cart!","success");
//     updateCartCount();

//   } catch(err) {
//     console.error(err);
//     showNotification("Failed to add to cart","error");
//   }
// }

//   function updateCartCount(){
//     const el = document.getElementById("cartCount");
//     if(!el) return;

//     // Unsubscribe previous snapshot listener if exists
//     if(cartUnsub){
//         try { cartUnsub(); } catch(e) { console.error(e); }
//         cartUnsub = null;
//     }

//     // If user is not logged in, show 0
//     if(!userAuth.currentUser){
//         el.textContent = "0";
//         return;
//     }

//     const itemsRef = userDb.collection("carts")
//         .doc(userAuth.currentUser.uid)
//         .collection("items");

//     // Listen for realtime changes
//     cartUnsub = itemsRef.onSnapshot(snapshot => {
//         let total = 0;
//         snapshot.forEach(doc => {
//             const qty = Number(doc.data().quantity) || 0;
//             total += qty;
//         });
//         el.textContent = total;
//     }, err => {
//         console.error("Cart count update error:", err);
//         el.textContent = "0";
//     });
// }

//   // ---------- USER AUTH UI ----------
//   userAuth.onAuthStateChanged(user=>{
//     const loginBtn = document.getElementById("loginBtn");
//     const logoutBtn = document.getElementById("logoutBtn");
//     const welcomeText = document.getElementById("welcomeText");
//     const welcomeTextMobile = document.getElementById("welcomeTextMobile");

//     if(user){
//       if(loginBtn) loginBtn.classList.add("hidden");
//       if(logoutBtn) logoutBtn.classList.remove("hidden");

//       userDb.collection("users").doc(user.uid).get().then(doc=>{
//         const fullName = doc.exists && doc.data().name ? doc.data().name : (user.email ? user.email.split("@")[0] : "User");
//         const firstName = fullName.split(" ")[0];
//         const firstNameCapitalized = firstName.charAt(0).toUpperCase()+firstName.slice(1).toLowerCase();
//         if(welcomeText) welcomeText.textContent=`Hi, ${firstNameCapitalized}`; welcomeText.classList.remove("hidden");
//         if(welcomeTextMobile) welcomeTextMobile.textContent=`Hi, ${firstNameCapitalized}`; welcomeTextMobile.classList.remove("hidden");
//       }).catch(console.error);

//       updateCartCount();
//     } else {
//       if(loginBtn) loginBtn.classList.remove("hidden");
//       if(logoutBtn) logoutBtn.classList.add("hidden");
//       if(welcomeText) welcomeText.classList.add("hidden");
//       if(welcomeTextMobile) welcomeTextMobile.classList.add("hidden");
//       if(cartUnsub){ try{ cartUnsub(); } catch(e){} cartUnsub=null; }
//       const el = document.getElementById("cartCount"); if(el) el.textContent="0";
//     }
//   });

//   // ---------- LOGIN MODAL ----------
//   function openLoginModal() {
//       const modal = document.getElementById("loginModal");
//       if (modal) {
//           modal.classList.remove("hidden");
//           document.body.style.overflow = "hidden";
//       }
//   }
//   function closeLoginModal() {
//       const modal = document.getElementById("loginModal");
//       if (modal) {
//           modal.classList.add("hidden");
//           document.body.style.overflow = "";
//       }
//   }
//   window.openLoginModal = openLoginModal;
//   window.closeLoginModal = closeLoginModal;

//   const loginBtn = document.getElementById("loginBtn");
//   if(loginBtn) loginBtn.addEventListener("click", openLoginModal);

//   const logoutBtn = document.getElementById("logoutBtn");
//   if(logoutBtn) logoutBtn.addEventListener("click", ()=>{
//       firebase.auth().signOut().then(()=> showNotification("Logged out","success")).catch(err=>{
//           console.error(err); showNotification("Logout failed","error");
//       });
//   });

//   // ---------- LOGIN SUBMIT ----------
//   const loginSubmit = document.getElementById("loginSubmit");
//   if(loginSubmit){
//       loginSubmit.addEventListener("click", async (e)=>{
//           e.preventDefault();
//           const email = document.getElementById("loginEmail").value.trim();
//           const password = document.getElementById("loginPassword").value;
//           const loginErrorEl = document.getElementById("loginError");
//           if(loginErrorEl) loginErrorEl.classList.add("hidden");

//           if(!email || !password){
//               if(loginErrorEl){ loginErrorEl.textContent="Fill both fields."; loginErrorEl.classList.remove("hidden"); }
//               return;
//           }

//           const resetLoader = showLoader(loginSubmit);
//           try{
//               await firebase.auth().signInWithEmailAndPassword(email,password);
//               closeLoginModal();
//               showNotification("Logged in","success");
//           }catch(err){
//               console.error(err);
//               if(loginErrorEl){ loginErrorEl.textContent=err.message||"Login failed"; loginErrorEl.classList.remove("hidden"); }
//           }finally{ resetLoader && resetLoader(); }
//       });
//   }

//   // ===== Password Eye Toggle (Homepage Login) =====
// const loginPassword = document.getElementById("loginPassword");
// const toggleLoginPassword = document.getElementById("toggleLoginPassword");

// toggleLoginPassword.addEventListener("click", () => {
//   if (loginPassword.type === "password") {
//     loginPassword.type = "text";
//     toggleLoginPassword.classList.replace("fa-eye", "fa-eye-slash");
//   } else {
//     loginPassword.type = "password";
//     toggleLoginPassword.classList.replace("fa-eye-slash", "fa-eye");
//   }
// });

//   // ---------- GOOGLE LOGIN ----------
// const googleLoginBtn = document.getElementById("googleLogin");
// if (googleLoginBtn) {
//   googleLoginBtn.disabled = false; // enable button

//   googleLoginBtn.addEventListener("click", async () => {
//     googleLoginBtn.disabled = true;
//     googleLoginBtn.innerHTML = `
//       <span class="loader w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
//       Redirecting...
//     `;

//     const provider = new firebase.auth.GoogleAuthProvider();

//     try {
//       const result = await firebase.auth().signInWithPopup(provider);
//       const user = result.user;

//       // Optional: save/update user in Firestore
//       const userRef = firebase.firestore().collection("users").doc(user.uid);
//       await userRef.set(
//         {
//           name: user.displayName || "",
//           email: user.email || "",
//           photoURL: user.photoURL || "",
//           lastLogin: firebase.firestore.FieldValue.serverTimestamp()
//         },
//         { merge: true }
//       );

//       // Hide login modal
//       const loginModal = document.getElementById("loginModal");
//       if (loginModal) loginModal.classList.add("hidden");

//       // Show success notification
//       showNotification(`Welcome ${user.displayName || "User"}!`, "success", 4000);

//     } catch (err) {
//       console.error("Google Sign-In error:", err);
//       showNotification("Google login failed. Try again.", "error", 4000);
//     } finally {
//       googleLoginBtn.disabled = false;
//       googleLoginBtn.innerHTML = `
//         <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" class="w-6 h-6 mr-2" />
//         Continue with Google
//       `;
//     }
//   });
// }

//   // ---------- INITIAL LOAD ----------
//   rotateTipsFade();
//   setInterval(rotateTipsFade,5000);
//   // setInterval(()=>slideImages(true),3000);
//   filterProducts("All");

//   // ---------- HELPERS ----------
//   function escapeHtml(text){ if(text==null) return ''; return String(text).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
//   function showLoader(el){ if(!el) return null; const original=el.innerHTML; el.disabled=true; el.innerHTML=`<span class="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4 inline-block mr-2"></span> Loading...`; return ()=>{ el.disabled=false; el.innerHTML=original; }; }

//   // Hamburger Menu
// const menuToggle = document.getElementById("menuToggle");
// const mobileMenu = document.getElementById("mobileMenu");
// const menuOverlay = document.getElementById("menuOverlay");
// const closeMenu = document.getElementById("closeMenu");

// let scrollPosition = 0;

// function openMenu() {
//     mobileMenu.classList.remove("-translate-x-full");
//     mobileMenu.classList.add("translate-x-0");
//     menuOverlay.classList.remove("hidden");

//     // Disable background scroll
//     scrollPosition = window.scrollY;
//     document.body.style.position = "fixed";
//     document.body.style.top = `-${scrollPosition}px`;
//     document.body.style.left = "0";
//     document.body.style.right = "0";
//     document.body.style.overflow = "hidden";
// }

// function closeMenuFunc() {
//     mobileMenu.classList.remove("translate-x-0");
//     mobileMenu.classList.add("-translate-x-full");
//     menuOverlay.classList.add("hidden");

//     // Enable background scroll
//     document.body.style.position = "";
//     document.body.style.top = "";
//     document.body.style.left = "";
//     document.body.style.right = "";
//     document.body.style.overflow = "";
//     window.scrollTo(0, scrollPosition); // Restore scroll
// }

// menuToggle.addEventListener("click", openMenu);
// closeMenu.addEventListener("click", closeMenuFunc);
// menuOverlay.addEventListener("click", closeMenuFunc);
// })();