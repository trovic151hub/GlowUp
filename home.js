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
<div id="cartLoader" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm z-50">
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
const heroImageTrack = document.getElementById("heroImageTrack");
const heroTitle = document.getElementById("heroTitle");
const heroText = document.getElementById("heroText");
const dotsContainer = document.querySelector(".hero-tabs-track");
const skeleton = document.getElementById("heroSkeleton");

const heroPlay = document.getElementById("heroPlay");
const heroPause = document.getElementById("heroPause");

// ===== STATE =====
let slides = [];
let currentSlide = 0;
let trackIndex = 1;
let currentProgress = 0;
let progressInterval = null;
let isPlaying = true;

// ===== SWIPE STATE =====
let startX = 0;
let currentX = 0;
let isDragging = false;
let hasDragged = false;
const dragThreshold = 50;

// ===== FIRESTORE =====
function loadHeroSlides() {
  skeleton.classList.remove("hidden");

  db.collection("heroSliders")
    .where("active", "==", true)
    .orderBy("order", "asc")
    .onSnapshot(snapshot => {
      slides = snapshot.docs.map(doc => ({
        image: doc.data().imageUrl,
        title: doc.data().title,
        text: doc.data().subtitle,
        tab: doc.data().tabLabel || doc.data().title
      }));

      createTabs();
      createImages();
      showSlide(0);

      if (isPlaying) startAutoSlide();
      updateHeroControls();

      skeleton.classList.add("hidden");
    });
}

// ===== TABS =====
function createTabs() {
  dotsContainer.innerHTML = "";

  slides.forEach((slide, index) => {
    const tab = document.createElement("span");
    tab.textContent = slide.tab;
    tab.style.position = "relative";

    const progressBar = document.createElement("div");
    progressBar.className =
      "progress-bar absolute bottom-0 left-0 h-1 bg-pink-500 w-0 rounded-br-lg";
    tab.appendChild(progressBar);

    tab.addEventListener("click", e => {
      e.stopPropagation();
      currentSlide = index;
      showSlide(index);
      if (isPlaying) startAutoSlide();
    });

    dotsContainer.appendChild(tab);
  });
}

// ===== IMAGES + CLONES =====
function createImages() {
  heroImageTrack.innerHTML = "";
  if (!slides.length) return;

  const lastClone = document.createElement("img");
  lastClone.src = slides[slides.length - 1].image;
  heroImageTrack.appendChild(lastClone);

  slides.forEach(slide => {
    const img = document.createElement("img");
    img.src = slide.image;
    heroImageTrack.appendChild(img);
  });

  const firstClone = document.createElement("img");
  firstClone.src = slides[0].image;
  heroImageTrack.appendChild(firstClone);
}

// ===== SHOW SLIDE =====
function showSlide(index) {
  trackIndex = index + 1;

  heroImageTrack.style.transition =
    "transform 0.8s cubic-bezier(0.22,0.61,0.36,1)";
  heroImageTrack.style.transform = `translateX(-${trackIndex * 100}%)`;

  heroTitle.textContent = slides[index].title;
  heroText.textContent = slides[index].text || "";

  document.querySelectorAll(".hero-tabs span").forEach((tab, i) => {
    tab.classList.toggle("active", i === index);
  });

  centerActiveTab(index);
  resetProgress();
}

// ===== CLONE JUMP FIX =====
heroImageTrack.addEventListener("transitionend", () => {
  if (trackIndex === 0) {
    heroImageTrack.style.transition = "none";
    trackIndex = slides.length;
    heroImageTrack.style.transform = `translateX(-${trackIndex * 100}%)`;
  }

  if (trackIndex === slides.length + 1) {
    heroImageTrack.style.transition = "none";
    trackIndex = 1;
    heroImageTrack.style.transform = `translateX(-${trackIndex * 100}%)`;
  }
});

// ===== AUTO SLIDE + PROGRESS =====
function startAutoSlide() {
  stopAutoSlide();

  const duration = 6000;
  const stepTime = 30;
  const increment = (stepTime / duration) * 100;

  progressInterval = setInterval(() => {
    currentProgress += increment;
    updateProgress(currentProgress);

    if (currentProgress >= 100) {
      currentSlide = (currentSlide + 1) % slides.length;
      showSlide(currentSlide);
      currentProgress = 0;
    }
  }, stepTime);
}

function stopAutoSlide() {
  clearInterval(progressInterval);
}

// ===== PROGRESS =====
function resetProgress() {
  currentProgress = 0;
  document.querySelectorAll(".progress-bar").forEach(bar => {
    bar.style.width = "0%";
  });
}

function updateProgress(value) {
  document.querySelectorAll(".hero-tabs span").forEach((tab, i) => {
    const bar = tab.querySelector(".progress-bar");
    bar.style.width = i === currentSlide ? value + "%" : "0%";
  });
}

// ===== PLAY / PAUSE BUTTONS =====
function updateHeroControls() {
  heroPlay.classList.toggle("hidden", isPlaying);
  heroPause.classList.toggle("hidden", !isPlaying);
}

heroPlay.addEventListener("click", e => {
  e.stopPropagation();
  isPlaying = true;
  startAutoSlide();
  updateHeroControls();
});

heroPause.addEventListener("click", e => {
  e.stopPropagation();
  isPlaying = false;
  stopAutoSlide();
  updateHeroControls();
});

// ===== CLICK SLIDE = PLAY / PAUSE =====
heroSlider.addEventListener("click", () => {
  if (hasDragged) return;

  isPlaying = !isPlaying;
  isPlaying ? startAutoSlide() : stopAutoSlide();
  updateHeroControls();
});

// ===== SWIPE (TOUCH) =====
heroSlider.addEventListener("touchstart", e => {
  startX = e.touches[0].clientX;
  currentX = startX;
  isDragging = true;
  hasDragged = false;
  stopAutoSlide();
}, { passive: true });

heroSlider.addEventListener("touchmove", e => {
  if (!isDragging) return;
  currentX = e.touches[0].clientX;
  if (Math.abs(currentX - startX) > 5) hasDragged = true;
}, { passive: true });

heroSlider.addEventListener("touchend", () => {
  if (!isDragging) return;

  const delta = currentX - startX;
  if (Math.abs(delta) > dragThreshold) {
    delta < 0 ? nextSlide() : prevSlide();
  }

  isDragging = false;
  if (isPlaying) startAutoSlide();
});

// ===== SWIPE (MOUSE) =====
heroSlider.addEventListener("mousedown", e => {
  startX = e.clientX;
  currentX = startX;
  isDragging = true;
  hasDragged = false;
  heroSlider.classList.add("dragging");
  stopAutoSlide();
});

heroSlider.addEventListener("mousemove", e => {
  if (!isDragging) return;
  currentX = e.clientX;
  if (Math.abs(currentX - startX) > 5) hasDragged = true;
});

heroSlider.addEventListener("mouseup", () => {
  if (!isDragging) return;

  const delta = currentX - startX;
  if (Math.abs(delta) > dragThreshold) {
    delta < 0 ? nextSlide() : prevSlide();
  }

  isDragging = false;
  heroSlider.classList.remove("dragging");
  if (isPlaying) startAutoSlide();
});

heroSlider.addEventListener("mouseleave", () => {
  isDragging = false;
  heroSlider.classList.remove("dragging");
});

// ===== NAV HELPERS =====
function nextSlide() {
  currentSlide = (currentSlide + 1) % slides.length;
  showSlide(currentSlide);
}

function prevSlide() {
  currentSlide = (currentSlide - 1 + slides.length) % slides.length;
  showSlide(currentSlide);
}

// ===== MOBILE TAB CENTERING =====
function centerActiveTab(index) {
  if (window.innerWidth > 640) return;

  const tabs = document.querySelectorAll(".hero-tabs span");
  const track = document.querySelector(".hero-tabs-track");
  const container = document.getElementById("heroDots");

  if (!tabs[index] || !container) return;

  if (index === 0) {
    track.style.transform = "translateX(0px)";
    return;
  }

  const offset =
    tabs[index].offsetLeft -
    container.offsetWidth / 2 +
    tabs[index].offsetWidth / 2;

  track.style.transform = `translateX(-${Math.max(offset, 0)}px)`;
}

// ===== INIT =====
loadHeroSlides();

    // ---------- Header Scroll ----------
    const header = document.getElementById("mainHeader");

window.addEventListener("scroll", () => {
  if (!header) return;

//   if (window.scrollY > 50) {
//   // Remove semi-transparent black background
//   header.classList.remove("bg-[#0000004D]");

//   // Add gradient background
//   header.classList.add("bg-gradient-to-r", "from-[#fbcfe8]/70", "to-[#f9a8d4]/70");

//   // Add backdrop blur
//   header.classList.add("backdrop-blur-md");

//   // Make text dark
//   header.classList.add("text-black");
//   header.classList.remove("text-white");

// } else {
//   // Remove gradient background
//   header.classList.remove("bg-gradient-to-r", "from-[#fbcfe8]/70", "to-[#f9a8d4]/70");

//   // Add semi-transparent black background with blur
//   header.classList.add("bg-[#0000004D]", "backdrop-blur-md");

//   // Reset text color
//   header.classList.remove("text-black");
//   header.classList.add("text-white");
// }

  if (window.scrollY > 50) {
    // Remove semi-transparent black background
    header.classList.remove("bg-[#0000004D]");

    // Add gradient background
    header.classList.add("bg-gradient-to-r", "from-[#fbcfe8]", "to-[#f9a8d4]");

    // Make text white
    header.classList.add("text-black");
    // Optional: remove black text if applied by default
    header.classList.remove("text-white");
  } else {
    // Remove gradient background
    header.classList.remove("bg-gradient-to-r", "from-[#fbcfe8]", "to-[#f9a8d4]");

    // Add semi-transparent black background
    header.classList.add("bg-[#0000004D]");

    // Reset text color
    header.classList.remove("text-black");
    header.classList.add("text-white");
  }
});

// const header = document.getElementById("mainHeader");

// window.addEventListener("scroll", () => {
//   if (!header) return;

//   if (window.scrollY > 50) {
//     // Remove white background
//     header.classList.remove("bg-[#0000004D]");
//     // Add gradient classes individually
//     header.classList.add("bg-gradient-to-r", "from-[#fbcfe8]", "to-[#f9a8d4]");
//   } else {
//     // Remove gradient classes individually
//     header.classList.remove("bg-gradient-to-r", "from-[#fbcfe8]", "to-[#f9a8d4]");
//     // Add white background
//     header.classList.add("bg-[#0000004D]");
//   }
// });

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

  // ---------- FEATURED PRODUCTS SEARCH ----------
let featuredSearchTerm = "";

// Filter currentProducts for featured search
function filterFeaturedProducts(term){
  featuredSearchTerm = term.toLowerCase();

  // Reset displayed count to 0 for new search
  displayedCount = 0;

  // If input is empty, show all currentProducts
  const filtered = featuredSearchTerm 
    ? currentProducts.filter(p => p.name.toLowerCase().includes(featuredSearchTerm)) 
    : currentProducts;

  // Temporarily replace currentProducts with filtered list for render
  const backup = currentProducts;
  currentProducts = filtered;

  renderProducts(true);

  // Restore currentProducts so Load More still works with full list
  currentProducts = backup;
}

// ---------- RENDER PRODUCTS ----------
const openSearchBtn = document.getElementById("openSearchBtn");
const closeSearchBtn = document.getElementById("closeSearchBtn");
const searchWrapper = document.getElementById("featuredSearchWrapper");
const searchInput = document.getElementById("featuredSearchInput");

// Open search
openSearchBtn.addEventListener("click", () => {
  openSearchBtn.classList.add("hidden");
  searchWrapper.classList.remove("hidden");
  searchInput.focus();
});

// Close search
closeSearchBtn.addEventListener("click", () => {
  searchWrapper.classList.add("hidden");
  openSearchBtn.classList.remove("hidden");
  searchInput.value = "";
  // Reset search and show all featured products
  filterFeaturedProducts("");
});

// Real-time search as user types
searchInput.addEventListener("input", e => {
  filterFeaturedProducts(e.target.value.trim());
});

// Optional: Enter key triggers search
searchInput.addEventListener("keyup", e => {
  if(e.key === "Enter") e.preventDefault();
});

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
      // card.className = "border rounded-xl p-4 text-center shadow opacity-0 transition-opacity duration-500";
      card.className = `
  border rounded-xl p-4 shadow
  flex flex-col
  text-center
  opacity-0 transition-opacity duration-500
`;
      card.innerHTML = `
  <img src="${image}" class="mx-auto mb-2 h-32 w-full object-cover rounded" />

  <h4 class="font-semibold text-sm line-clamp-2 min-h-[2.5em]">
    ${escapeHtml(product.name||'Untitled')}
  </h4>

  <p class="text-pink-500 font-bold mt-1">
    ₦${(Number(product.price||0)).toLocaleString()}
  </p>

  <div class="mt-auto pt-2 flex justify-center gap-2">
    <button data-id="${product.id}"
      class="view-btn text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
      View
    </button>

    <button data-id="${product.id}"
      class="add-btn text-xs px-3 py-1 bg-pink-600 text-white rounded hover:bg-pink-700">
      Cart
    </button>
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
            const resetLoader = showLoader(btn);
            await viewProduct(btn.dataset.id);
            resetLoader && resetLoader();
        });
    }
  });

  productList.querySelectorAll('.add-btn').forEach(btn=>{
    if(!btn.dataset.bound){
        btn.dataset.bound='1';
        btn.addEventListener('click', async ()=>{
            const resetLoader = showLoader(btn);
            await window.addToCart(btn.dataset.id);
            resetLoader && resetLoader();
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

// View Products
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
  <div class="
    bg-white rounded-lg relative
    w-11/12 max-w-lg
    p-4 md:p-6
    max-h-[85vh] overflow-y-auto
  ">
    <button id="closeProductModal"
      class="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-xl">
      &times;
    </button>

    <img id="modalProductImage"
      class="w-full h-40 md:h-64 object-cover mb-3 rounded">

    <h2 id="modalProductName"
      class="text-lg md:text-xl font-bold mb-1"></h2>

    <p id="modalProductPrice"
      class="text-pink-500 font-semibold text-base md:text-lg mb-2"></p>

    <p id="modalProductDescription"
      class="text-sm text-gray-700 mb-3 line-clamp-3 md:line-clamp-none"></p>

    <button id="modalAddToCartBtn"
      class="w-full mb-2 px-4 py-2 text-sm md:text-base bg-pink-600 text-white rounded hover:bg-pink-700">
      Add to Cart
    </button>

    <button id="buyNowBtn"
      class="w-full px-4 py-2 text-sm md:text-base border rounded hover:bg-gray-100">
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

const filterSection = document.getElementById("filterSection");
const toggleFilterBtn = document.getElementById("toggleFilterBtn");
const closeFilterBtn = document.getElementById("closeFilterBtn");

// Open on mobile
toggleFilterBtn?.addEventListener("click", () => {
  filterSection.classList.remove("hidden");
});

// Close on mobile
closeFilterBtn?.addEventListener("click", () => {
  filterSection.classList.add("hidden");
});

menuToggle.addEventListener("click", openMenu);
closeMenu.addEventListener("click", closeMenuFunc);
menuOverlay.addEventListener("click", closeMenuFunc);
})();