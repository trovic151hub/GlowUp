(function() {
  const WHATSAPP_NUMBER = "2349053380773"; // your number

  function generateWhatsappPaymentRef() {
    return "WA-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
  }

  // ==================== LOADER ====================
  let loader = document.getElementById("cartLoader");
  function showLoader() {
  if (!loader) return;

  // If loader was removed, recreate it
  if (!document.body.contains(loader)) {
    loader = document.createElement("div");
    loader.id = "cartLoader";
    loader.className = "fixed inset-0 bg-black backdrop-blur-sm bg-opacity-30 flex items-center justify-center z-50";
    loader.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="fas fa-shopping-cart text-white w-12 h-12 animate-pulse"  viewBox="0 0 16 16"><path fill="currentColor" d="M0 
    2.5A.5.5 0 0 1 .5 2H2a.5.5 0 0 1 .485.379L2.89 4H14.5a.5.5 0 0 1 .485.621l-1.5 6A.5.5 0 0 1 13 11H4a.5.5 0 0 1-.485-.379L1.61 
    3H.5a.5.5 0 0 1-.5-.5M3.14 5l.5 2H5V5zM6 5v2h2V5zm3 0v2h2V5zm3 0v2h1.36l.5-2zm1.11 3H12v2h.61zM11 8H9v2h2zM8 8H6v2h2zM5 8H3.89l.5 2H5zm0 
    5a1 1 0 1 0 0 2a1 1 0 0 0 0-2m-2 1a2 2 0 1 1 4 0a2 2 0 0 1-4 0m9-1a1 1 0 1 0 0 2a1 1 0 0 0 0-2m-2 1a2 2 0 1 1 4 0a2 2 0 0 1-4 0"/></svg>
</div>`;
    loader.style = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.4);
      display: flex; align-items: center; justify-content: center;
      z-index: 9999; font-size: 50px; color: white; 
      transition: opacity 0.3s ease;
    `;
    document.body.appendChild(loader);
  }

  loader.style.opacity = "1";
  loader.style.display = "flex";
}

  function hideLoader() {
    if (loader) {
      loader.style.opacity = "0";
      setTimeout(() => loader.remove(), 300);
    }
  }

  // ==================== FIREBASE ====================
  const firebaseConfig = {
    apiKey: "AIzaSyDdTPmpaIPWSDWOmR-fXgvAb7hoxZUawcc",
    authDomain: "e-commerce-39c74.firebaseapp.com",
    projectId: "e-commerce-39c74",
    storageBucket: "e-commerce-39c74.firebasestorage.app",
    messagingSenderId: "863375033754",
    appId: "1:863375033754:web:7ba248c8dbb1566c83e623"
  };
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();

  // ==================== GUEST ID ====================
  let guestId = localStorage.getItem("guestId");
  if(!guestId){
    guestId = 'guest_' + Date.now() + '-' + Math.floor(Math.random()*1000);
    localStorage.setItem("guestId", guestId);
  }
  const guestCartRef = db.collection("guestCarts").doc(guestId);

  // ---------- Notifications ----------
  const activeNotifications = new Set();
  function showNotification(message, type="info", duration=3000){
    let container = document.getElementById("notification-container");
    if(!container){
      container = document.createElement("div");
      container.id = "notification-container";
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

    setTimeout(()=> removeNotification(notif, message), duration);
  }
  function removeNotification(notif, message){
    if(!notif) return;
    notif.classList.remove("animate-slideIn");
    notif.classList.add("animate-slideOut");
    notif.addEventListener("animationend", ()=> notif.remove());
    activeNotifications.delete(message);
  }

  // Notification Styles
  const style = document.createElement("style");
  style.textContent = `
    #notification-container { display: flex; flex-direction: column; gap: 0.5rem; position: fixed; top: 1rem; right: 1rem; z-index: 9999; }
    @keyframes slideIn { from {opacity:0; transform: translateX(50px);} to {opacity:1; transform:translateX(0);} }
    .animate-slideIn { animation: slideIn 0.3s ease-out forwards; }
    @keyframes slideOut { from {opacity:1; transform:translateX(0);} to {opacity:0; transform:translateX(50px);} }
    .animate-slideOut { animation: slideOut 0.3s ease-in forwards; }
  `;
  document.head.appendChild(style);

  // ==================== ELEMENTS ====================
  const cartItemsContainer = document.getElementById("cart-items");
  const cartSubtotalMain = document.getElementById("cart-subtotal-main");
  const cartSubtotalCheckout = document.getElementById("cart-subtotal-checkout");

  const checkoutBtn = document.getElementById("checkout-btn");
  const continueBtn = document.getElementById("continue-btn");
  const checkoutStep = document.getElementById("checkout-step");
  const cartContainer = document.getElementById("cartContainer");
  const completeStep = document.getElementById("complete-step");

  const placeOrderBtn = document.getElementById("place-order");
  const summaryPlaceOrderBtn = document.getElementById("summary-place-order");

  // Disable summary place order by default
if (summaryPlaceOrderBtn) {
  summaryPlaceOrderBtn.disabled = true;
  summaryPlaceOrderBtn.classList.add("bg-gray-400");
  summaryPlaceOrderBtn.classList.remove("bg-pink-600", "hover:bg-pink-700");
}

  const summaryItems = document.getElementById("summary-items");
  const summarySubtotal = document.getElementById("summary-subtotal");
  const summaryShipping = document.getElementById("summary-shipping");
  const summaryTotal = document.getElementById("summary-total");

  const deliveryCompany = document.getElementById("delivery-company");
const deliveryType = document.getElementById("delivery-type");
const terminalWrapper = document.getElementById("terminal-wrapper");
const terminalSelect = document.getElementById("terminal");
const terminalLabel = document.getElementById("terminal-label"); 

const countrySelect = document.getElementById("country");
const stateSelect = document.getElementById("state");

// LGA Elements
const lgaWrapper = document.getElementById("lga-wrapper");
const lgaSelect = document.getElementById("lga");

// Area Code
countrySelect.addEventListener("change", async () => {
  const selectedCountry = countrySelect.value;

  if (!selectedCountry) return;

  try {
    const res = await fetch(
      `https://restcountries.com/v3.1/name/${selectedCountry}?fullText=true`
    );

    const data = await res.json();

    const root = data[0]?.idd?.root || "";
    const suffix = data[0]?.idd?.suffixes?.[0] || "";

    document.getElementById("area-code").value = root + suffix;

  } catch (err) {
    console.error("Dial code fetch error:", err);
    document.getElementById("area-code").value = "";
  }
});

// Auto go to checkout if triggered from homepage
window.addEventListener("DOMContentLoaded", () => {
    const gotoCheckout = localStorage.getItem("gotoCheckout");

    if (gotoCheckout === "true") {
        localStorage.removeItem("gotoCheckout");

        // Hide cart view and show checkout step
        cartContainer.classList.add("hidden");
        checkoutStep.classList.remove("hidden");
        completeStep.classList.add("hidden");
        setBreadcrumb("checkout");

        // Optional: scroll to checkout section
        checkoutStep.scrollIntoView({ behavior: "smooth" });
    }
});

// Lagos LGAs
const lagosLGAs = {"Agege":3000,"Ajeromi-Ifelodun":3000,
  "Alimosho":3000,"Amuwo-Odofin":3000,"Apapa":3000,"Epe":6000,
  "Eti-Osa":5000,"Ibeju-Lekki":5000,"Lekki Phase":4000,"Sangotedo":4000,
  "Ajah":4000,"Ifako-Ijaiye":3000,"Ikeja":3000,"Ikorodu":4000,"Kosofe":4000,
  "Lagos Island":4000,"Lagos Mainland":4000,"Mushin":3000,"Ojo":3000,
  "Oshodi-Isolo":3000,"Shomolu":3000,"Surulere":3000
};

const deliveryTypeSelect = document.getElementById("delivery-type");
console.log("Delivery Type:", deliveryTypeSelect.value);

function calculateDeliveryFee(deliveryInfo, totalWeight) {
  let fee = 0;

  const stateRaw = (deliveryInfo.state || "").toLowerCase();
  const state = stateRaw.replace(" state", "").trim(); // FIXED
  const company = (deliveryInfo.company || "").toUpperCase();
  const lga = (deliveryInfo.lga || "").trim();
  const deliveryType = (deliveryInfo.deliveryType || "").toLowerCase();
  totalWeight = totalWeight || 1;

  if (deliveryInfo.country?.toLowerCase() !== "nigeria") return 0;

  // Lagos LGA special fee
  if (state.includes("lagos") && lga && lagosLGAs[lga]) {
    fee = lagosLGAs[lga];
    if (deliveryType === "home") fee += 800;
    return fee;
  }

  // GIG pricing
  if (company === "GIG") {
    if (totalWeight <= 3) fee = 6800;
    else if (totalWeight <= 6) fee = 6800 + 900;
    else fee = 6800 + 900 * Math.ceil((totalWeight - 3) / 3);

    if (deliveryType === "home") fee += 800;
  }

  // GUO pricing
  else if (company === "GUO" && guoSupportedStates.includes(state)) {
    if (totalWeight <= 3) fee = 3500;
    else if (totalWeight <= 6) fee = 3500 + 800;
    else fee = 3500 + 800 * Math.ceil((totalWeight - 3) / 3);

    if (deliveryType === "home") fee += 800;
  }

  return fee;
}

  let cartUnsub = null;

  // ==================== HELPERS ====================
  function updateTotals(subtotal){
    const formatted = `₦${subtotal.toLocaleString()}`;
    if(cartSubtotalMain) cartSubtotalMain.textContent = formatted;
    if(cartSubtotalCheckout) cartSubtotalCheckout.textContent = formatted;
  }

  async function saveGuestCart(items){
    await guestCartRef.set({ guestId, items }, { merge: true });
    localStorage.setItem("cart", JSON.stringify(items));
  }

  async function ensureGuestCart(){
    const docSnap = await guestCartRef.get();
    if(!docSnap.exists){
      await guestCartRef.set({ guestId, items: [] });
    }
  }

  // ==================== CART RENDER ====================
  function renderCart(cart){
    if(!cartItemsContainer) return;
    cartItemsContainer.innerHTML = "";

    if(!cart.length){
      cartItemsContainer.innerHTML = `<p class="text-gray-500 text-center">Your cart is empty</p>`;
      updateTotals(0);
      renderOrderSummary([]); // clear checkout summary
      return;
    }

    let subtotal = 0;
    cart.forEach(item => {
      subtotal += (item.price || 0) * item.quantity;

      const card = document.createElement("div");
      card.className = "flex bg-white p-4 rounded-lg shadow mb-3 gap-4";
      card.innerHTML = `
        <img src="${item.image || item.images?.[0] || ''}" alt="${item.name}" class="w-28 h-28 object-cover rounded">
        <div class="flex-1 flex flex-col justify-between">
          <div class="flex justify-between items-start">
            <h4 class="font-medium text-gray-700 leading-tight">${item.name}</h4>
            <button class="remove-btn text-gray-400" data-id="${item.id}"><i class="fas fa-trash-can"></i></button>
          </div>
          <p class="text-sm text-gray-500 mt-1">${item.color || ''}</p>
          <div class="flex justify-between items-center mt-3">
            <p class="font-bold text-lg text-gray-900">₦${(item.price || 0).toLocaleString()}</p>
            <div class="flex items-center gap-2">
              <button class="decrement-btn text-gray-500 px-2 py-1 bg-gray-100 hover:text-gray-900" data-id="${item.id}">−</button>
              <span class="font-medium">${item.quantity}</span>
              <button class="increment-btn text-gray-500 px-2 py-1 bg-gray-100 hover:text-gray-900" data-id="${item.id}">+</button>
            </div>
          </div>
        </div>
      `;
      cartItemsContainer.appendChild(card);

        // GSAP fade-in + slide-up animation
  gsap.from(card, { 
    duration: 0.5, 
    y: 20, 
    opacity: 0, 
    ease: "power2.out" 
  });
    });

    updateTotals(subtotal);
    attachCartEvents(cart);
    renderOrderSummary(cart); // <-- populate checkout summary
  }

  function attachCartEvents(cart){
    document.querySelectorAll(".increment-btn").forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const item = cart.find(i => i.id === id);
        if(item){ item.quantity += 1; await saveGuestCart(cart); }
      };
    });

    document.querySelectorAll(".decrement-btn").forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const item = cart.find(i => i.id === id);
        if(item){
          if(item.quantity > 1) item.quantity -= 1;
          else cart = cart.filter(i => i.id !== id);
          await saveGuestCart(cart);
        }
      };
    });

    document.querySelectorAll(".remove-btn").forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        cart = cart.filter(i => i.id !== id);
        await saveGuestCart(cart);
      };
    });
  }

  // ==================== ORDER SUMMARY RENDER ====================
  function renderOrderSummary(cart){
    if(!summaryItems) return;
    summaryItems.innerHTML = "";
    let subtotal = 0;
    cart.forEach(item => {
      subtotal += (item.price || 0) * item.quantity;

      const div = document.createElement("div");
      div.className = "flex items-center justify-between gap-3";
      div.innerHTML = `
        <div class="flex items-center gap-3">
          <img src="${item.image || item.images?.[0] || ''}" class="w-24 h-24 object-cover rounded">
          <div>
            <p class="text-gray-800 font-medium">${item.name}</p>
            <p class="text-sm text-gray-500">Qty: ${item.quantity}${item.color ? " | " + item.color : ""}</p>
            <p class="font-bold text-gray-900">₦${((item.price || 0) * item.quantity).toLocaleString()}</p>
          </div>
        </div>
      `;
      summaryItems.appendChild(div);
    });

    // Totals
    // Determine total weight
const totalWeight = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);

// Collect delivery info from checkout form
const deliveryInfo = {
  country: countrySelect.value,
  state: stateSelect.value,
  company: deliveryCompany.value
};

// Calculate shipping fee dynamically
const shippingFee = calculateDeliveryFee(deliveryInfo, totalWeight);

// Update summary totals
if(summarySubtotal) summarySubtotal.textContent = `₦${subtotal.toLocaleString()}`;
if(summaryShipping) summaryShipping.textContent = `₦${shippingFee.toLocaleString()}`;
if(summaryTotal) summaryTotal.textContent = `₦${(subtotal + shippingFee).toLocaleString()}`;
  }

  let selectedPayment = null;

  document.querySelectorAll("#payment-summary-card .cursor-pointer").forEach(option => {
  option.addEventListener("click", () => {

    const isAlreadySelected = option.classList.contains("border-pink-600");

    // Remove highlight + hide all check icons
    document.querySelectorAll("#payment-summary-card .cursor-pointer").forEach(o => {
      o.classList.remove("border-pink-600", "bg-pink-50");

      const icon = o.querySelector(".check-icon");
      if (icon) icon.classList.add("hidden");
    });

    // If clicking already selected → unselect
    if (isAlreadySelected) {
      selectedPayment = null;

      summaryPlaceOrderBtn.disabled = true;
      summaryPlaceOrderBtn.classList.add("bg-gray-400");
      summaryPlaceOrderBtn.classList.remove("bg-pink-600", "hover:bg-pink-700");

      return;
    }

    // Select current option
    option.classList.add("border-pink-600", "bg-pink-50");

    const selectedIcon = option.querySelector(".check-icon");
    if (selectedIcon) selectedIcon.classList.remove("hidden");

    gsap.from(selectedIcon, { scale: 0, opacity: 0, duration: 0.3, ease: "back.out(1.7)" });

    if (option.id === "paystack-option") {
      selectedPayment = "paystack";
    } else if (option.id === "WhatsApp") {
      selectedPayment = "whatsapp";
    }

    summaryPlaceOrderBtn.disabled = false;
    summaryPlaceOrderBtn.classList.remove("bg-gray-400");
    summaryPlaceOrderBtn.classList.add("bg-pink-600", "hover:bg-pink-700");
  });
});

// Country
async function loadCountries() {
  try {
    const res = await fetch("https://countriesnow.space/api/v0.1/countries");
    const data = await res.json();

    const countryDatalist = document.getElementById("country-list");
    countryDatalist.innerHTML = ""; // clear old options

    data.data.forEach(c => {
      const option = document.createElement("option");
      option.value = c.country;
      countryDatalist.appendChild(option);
    });

  } catch (error) {
    const countryDatalist = document.getElementById("country-list");
    countryDatalist.innerHTML = `<option value="Error loading countries"></option>`;
  }
}

loadCountries();

// State / Province
country.addEventListener("input", async () => {
  const countryName = country.value;
  const stateDatalist = document.getElementById("state-list");
  stateDatalist.innerHTML = `<option value="Loading states..."></option>`;

  try {
    const res = await fetch("https://countriesnow.space/api/v0.1/countries/states", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country: countryName })
    });
    const data = await res.json();

    stateDatalist.innerHTML = ""; // clear old options
    if(data.data && data.data.states.length){
      data.data.states.forEach(s => {
        const option = document.createElement("option");
        option.value = s.name;
        stateDatalist.appendChild(option);
      });
    } else {
      stateDatalist.innerHTML = `<option value="No states found"></option>`;
    }

    // Hide LGA when country changes
    lgaWrapper.classList.add("hidden");
    lgaSelect.innerHTML = `<option value="">Select LGA</option>`;

  } catch (error) {
    stateDatalist.innerHTML = `<option value="Error loading states"></option>`;
  }
});

// Load states when country changes
countrySelect.addEventListener("change", async () => {
  const country = countrySelect.value;

  if (!country) return;

  stateSelect.innerHTML = `<option>Loading states...</option>`;

  try {
    const res = await fetch("https://countriesnow.space/api/v0.1/countries/states", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country })
    });

    const data = await res.json();

    stateSelect.innerHTML = `<option value="">Select State</option>`;

    data.data.states.forEach(s => {
      const option = document.createElement("option");
      option.value = s.name;
      option.textContent = s.name;
      stateSelect.appendChild(option);
    });

    // Hide LGA when country changes
if (lgaWrapper) {
  lgaWrapper.classList.add("hidden");
  lgaSelect.innerHTML = `<option value="">Select LGA</option>`;
}

  } catch (error) {
    stateSelect.innerHTML = `<option>Error loading states</option>`;
  }
});

// State Select
stateSelect.addEventListener("change", () => {

  const country = countrySelect.value;
  const state = stateSelect.value; 
    localStorage.setItem("checkoutState", state); // store selected state
  updateDeliveryVisibility();

  if (
    country === "Nigeria" &&
    state.toLowerCase().includes("lagos")
  ) {

    lgaWrapper.classList.remove("hidden");
    lgaSelect.innerHTML = `<option value="">Select LGA</option>`;

    Object.keys(lagosLGAs).forEach(lga => {
  const option = document.createElement("option");
  option.value = lga;
  option.textContent = lga;
  lgaSelect.appendChild(option);
});

  } else {
    lgaWrapper.classList.add("hidden");
    lgaSelect.innerHTML = `<option value="">Select LGA</option>`;
  }

});

// ==================== TERMINALS DATA ====================
const GUOTerminals = {
  "federal capital territory": ["Kubwa", "Utako", "Gwarinpa", "Mararaba", "Wuse2", "Zuba"],
  abia: ["Aba", "Umuahia"],
  anambra: ["Awka", "Awkuzu", "Ihiala", "Nnewi", "Onitsha", "Umunze", "Ekwulobia"],
  enugu: ["Enugu (Holy Ghost / Ogbete)"],
  imo: ["Akokwa", "Orlu", "Owerri", "Umuaka"],
  rivers: ["Port Harcourt (Aba Road)"],
  delta: ["Asaba (Head Bridge, Okpanam Road)"],
  edo: ["Benin City (Ugbowo–Lagos Road)"],
  kaduna: ["Kaduna", "Zaria", "Mando"],
  kano: ["Kano (Sabon Gari)"],
  ebonyi: ["Abakaliki", "Afikpo"],
  plateau: ["Jos (Old Railway Station)"],
  yola: ["Jambutu Park"],
  bauchi: ["Bauchi"]
};

const GIGTerminals = {
  abia: ["Aba 1", "Aba 2", "Umuahia-1", "Umuahia-2"],
  adamawa: ["Yola"],
  "akwa ibom": ["Uyo 1", "Uyo 2", "Eket"],
  anambra: ["Awka", "Onitsha", "Nnewi"],
  bauchi: ["Bauchi"],
  bayelsa: ["Yenagoa"],
  benue: ["Makurdi"],
  borno: ["Maiduguri"],
  "cross river": ["Calabar"],
  delta: ["Asaba", "Warri", "Ughelli"],
  ebonyi: ["Abakaliki"],
  edo: ["Airport Road Benin", "Auchi", "Akpakpava", "Ekpoma"],
  ekiti: ["Ado-Ekiti"],
  enugu: ["Enugu", "Nsukka"],
  gombe: ["Gombe"],
  imo: ["Owerri"],
  jigawa: ["Dutse"],
  kaduna: ["Kaduna"],
  kano: ["Kano"],
  katsina: ["Katsina"],
  kebbi: ["Birnin Kebbi"],
  kogi: ["Lokoja"],
  kwara: ["Ilorin"],
  lagos: ["Ikeja", "Ajah", "Lekki", "Yaba", "Ikotun"],
  nasarawa: ["Lafia"],
  niger: ["Minna"],
  ogun: ["Abeokuta FUNAAB", "Ijebu-Ode", "Ota"],
  ondo: ["Akure", "Ondo Town"],
  osun: ["Osogbo", "Ile-Ife"],
  oyo: ["Ibadan", "Ogbomosho"],
  plateau: ["Jos"],
  rivers: ["Ada George", "Alakahia", "Elelenwon", "Woji", "Artillery", "Aliozu", "Olu Obasanjo", "Peter odili", "Stadium Road", "Tombia"],
  sokoto: ["Sokoto"],
  taraba: ["Jalingo"],
  yobe: ["Damaturu"],
  zamfara: ["Gusau"],
  "federal capital territory": ["Garki", "Utako 1", "Utako 2", "Wuse 1", "Wuse 2", "Gwagwaglada", "Garki", "Gudu", "Gwarinpa 1", "Gwarinpa 2", "Kubwa 1", "Kubwa 2", "Kubwa 3", "Lugbe", "Mararaba", "Madalla", "Zuba"]
};

const stateInput = document.getElementById("state");
// Auto-generate supported states from GUO terminals object
const guoSupportedStates = Object.keys(GUOTerminals);

// const deliveryCompany = document.getElementById("delivery-company");

function updateDeliveryCompanyAvailability() {
  const stateRaw = stateInput.value.trim().toLowerCase();
  const stateKey = stateRaw.replace(" state", "");

  if (!stateKey) return;

  const guoOption = deliveryCompany.querySelector('option[value="GUO"]');
  const gigOption = deliveryCompany.querySelector('option[value="GIG"]');

  if (!guoOption || !gigOption) return; // safety check

  const guoSupportedStates = Object.keys(GUOTerminals);

  if (!guoSupportedStates.includes(stateKey)) {
    // Disable GUO
    guoOption.disabled = true;

    // If GUO was selected, switch to GIG
    if (deliveryCompany.value === "GUO") {
      deliveryCompany.value = "GIG";
    }
  } else {
    // Enable GUO if supported
    guoOption.disabled = false;
  }
}

stateInput.addEventListener("input", () => {
  updateDeliveryCompanyAvailability();
  populateTerminals();
});

function populateTerminals() {
  const stateRaw = stateInput.value.trim().toLowerCase();
  const company = deliveryCompany.value.trim().toUpperCase();
  const type = deliveryType.value;

  // reset terminal dropdown
  terminalSelect.innerHTML = `<option value="">Select Terminal</option>`;

  // Only show terminals if terminal pickup is selected
  if (!stateRaw || !company || type !== "terminal") {
    terminalWrapper.classList.add("hidden");
    return;
  }

  // Map state input to key
  const stateKey = stateKeyMap[stateRaw];
  if (!stateKey || skipTerminalStates.includes(stateKey)) {
    terminalWrapper.classList.add("hidden");
    return; // do not populate for skip-list states
  }

  // Only populate terminals if there is data
  let terminals = [];
  if (company === "GUO") terminals = GUOTerminals[stateKey] || [];
  if (company === "GIG") terminals = GIGTerminals[stateKey] || [];

  if (terminals.length === 0) {
    terminalWrapper.classList.add("hidden");
    return;
  }

  // Show and populate terminals
  terminalWrapper.classList.remove("hidden");
  terminals.forEach(t => {
    const option = document.createElement("option");
    option.value = t;
    option.textContent = t;
    terminalSelect.appendChild(option);
  });
}

function populateTerminals() {
  const stateRaw = stateInput.value.trim().toLowerCase();
  const company = deliveryCompany.value.trim().toUpperCase();
  const type = deliveryType.value;

  // Normalize state key
  const stateKey = stateRaw.replace(" state", ""); // removes " state" if typed

  terminalSelect.innerHTML = `<option value="">Select Terminal</option>`; // reset

  // Only show terminals if terminal pickup is selected
  if (!stateKey || !company || type !== "terminal") {
    terminalWrapper.classList.add("hidden");
    return;
  }

  terminalWrapper.classList.remove("hidden"); // show terminal select

  let terminals = [];

  if (company === "GUO") terminals = GUOTerminals[stateKey] || [];
  if (company === "GIG") terminals = GIGTerminals[stateKey] || [];

  terminals.forEach(t => {
    const option = document.createElement("option");
    option.value = t;
    option.textContent = t;
    terminalSelect.appendChild(option);
  });
}

stateSelect.addEventListener("change", () => {
  localStorage.setItem("checkoutState", stateSelect.value);
  if (deliveryType.value === "terminal") {
    terminalSelect.innerHTML = `<option value="">Select Terminal</option>`;
  }
});

stateInput.addEventListener("input", populateTerminals);
deliveryCompany.addEventListener("change", populateTerminals);
deliveryType.addEventListener("change", populateTerminals);



// Update Delivery Visibility
const deliveryOptionsWrapper = document.getElementById("delivery-options");

function updateDeliveryVisibility() {
  const country = (countrySelect.value || "").toLowerCase();
  const state = (stateSelect.value || "").toLowerCase();

  const isNigeria = country === "nigeria";
  const isLagos = state.includes("lagos");

  // Nigeria + Other States → SHOW delivery options
  if (isNigeria && state && !isLagos) {
    deliveryOptionsWrapper.classList.remove("hidden");
    return;
  }

  // Otherwise → HIDE and RESET everything
  deliveryOptionsWrapper.classList.add("hidden");

  // Clear values
  deliveryCompany.value = "";
  deliveryType.value = "";
  terminalSelect.innerHTML = `<option value="">Select Terminal</option>`;
  deliveryOptionsWrapper.classList.add("hidden");
}

countrySelect.addEventListener("input", updateDeliveryVisibility);
stateSelect.addEventListener("input", updateDeliveryVisibility);

  // ==================== CART LISTENER ====================
  async function startCartListener() {
    if(cartUnsub) cartUnsub();
    await ensureGuestCart();

    cartUnsub = guestCartRef.onSnapshot(doc => {
      const data = doc.exists ? doc.data() : { items: [] };
      renderCart(data.items || []);
      hideLoader();
    }, err => {
      console.error("Cart listener error:", err);
      hideLoader();
      showNotification("Failed to load cart — check Firestore rules!");
    });
  }

    const btn = document.getElementById("goPageBtn");
  btn.addEventListener("click", () => {
    // Replace with your target page
    window.location.href = "index.html";
  });

  // ==================== PLACE ORDER ====================
  placeOrderBtn.onclick = async () => {
  // 1️⃣ Validate shipping form first
  if (!validateShippingForm()) {
    showNotification("Please fill in all required fields.");
    return;
  }
  
  // Enable summary place order button
  summaryPlaceOrderBtn.disabled = false;
  summaryPlaceOrderBtn.classList.remove("bg-gray-400");
  summaryPlaceOrderBtn.classList.add("bg-pink-600", "hover:bg-pink-700");

  // 2️⃣ Gather shipping form data
  const shippingData = {
    email: document.getElementById("email").value,
    firstName: document.getElementById("first-name").value,
    lastName: document.getElementById("last-name").value,
    street: document.getElementById("street").value,
    state: document.getElementById("state").value,
    lga: document.getElementById("lga").value,
    areaCode: document.getElementById("area-code").value,
    phone: document.getElementById("phone").value,
    country: countrySelect.value
  };

  // Hide the shipping form
  document.getElementById("address-form").classList.add("hidden");

  // Show summary cards
  document.getElementById("shipping-summary-card").classList.remove("hidden");
  document.getElementById("shipment-summary-card").classList.remove("hidden");
  document.getElementById("payment-summary-card").classList.remove("hidden");

  // Populate shipping summary
  document.getElementById("sum-email").textContent = shippingData.email;
  document.getElementById("sum-name").textContent = `${shippingData.firstName} ${shippingData.lastName}`;
  document.getElementById("sum-phone").textContent = shippingData.areaCode + shippingData.phone;
  document.getElementById("sum-address").textContent = `${shippingData.street}, ${shippingData.lga}, ${shippingData.state}`;

  // 3️⃣ Build shipment summary with shipping fee
  const shipmentContainer = document.getElementById("sum-shipment");
  shipmentContainer.innerHTML = "";

  const cartItems = JSON.parse(localStorage.getItem("cart") || "[]");

  // Subtotal
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);

  // Total weight
  const totalWeight = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

  // Delivery info
const deliveryInfo = {
  country: countrySelect.value,
  state: stateSelect.value,
  company: deliveryCompany.value,
  lga: lgaSelect.value,
  deliveryType: deliveryTypeSelect.value ,
  terminal: terminalSelect?.value || ""
};

// Calculate shipping fee
const shippingFee = calculateDeliveryFee(deliveryInfo, totalWeight);

  // Create card for shipment summary
  const card = document.createElement("div");
  card.className = "bg-white shadow rounded-lg p-4 space-y-2";

  // Top row: Title left, Fee right
  const topRow = document.createElement("div");
  // topRow.className = "flex justify-between items-start";
  topRow.className = "flex flex-col sm:flex-row sm:justify-between sm:items-start";
  const title = document.createElement("p");
  title.className = "font-semibold text-gray-800";
  title.textContent = "Standard Shipment:";
  const feeEl = document.createElement("p");
  feeEl.className = "text-gray-900 font-bold";
  let minFee = 0;
let maxFee = 0;

const buffer = 4000;

if (deliveryInfo.company === "GUO") {
  minFee = 3500;

  // Ensure the minimum is not above the real fee
  minFee = Math.min(minFee, shippingFee);

  maxFee = shippingFee + buffer;
}

else if (deliveryInfo.company === "GIG") {
  minFee = 6800;

  minFee = Math.min(minFee, shippingFee);

  maxFee = shippingFee + buffer;
}

feeEl.textContent = 
  `Estimated: ₦${minFee.toLocaleString()} – ₦${maxFee.toLocaleString()}`;
  // feeEl.textContent = `₦${shippingFee.toLocaleString()}`;
  topRow.appendChild(title);
  topRow.appendChild(feeEl);
  card.appendChild(topRow);

  // Content below top row
  if (shippingData.country.toLowerCase() === "nigeria" &&
      shippingData.state.toLowerCase().includes("lagos") &&
      shippingData.lga) {
    // Lagos delivery block
    const address = document.createElement("p");
    address.className = "text-gray-700";
    address.textContent = `${shippingData.street}, ${shippingData.lga}, ${shippingData.state}`;
    card.appendChild(address);
  } else {
    // Other deliveries
const companyEl = document.createElement("p");
companyEl.className = "text-gray-700";
companyEl.textContent = `Delivery Company: ${deliveryInfo.company || "N/A"}`;

const typeEl = document.createElement("p");
typeEl.className = "text-gray-700";
typeEl.textContent = `Type: ${deliveryInfo.deliveryType === "terminal" ? "Terminal Pickup" : "Home Delivery"}`;

const stateEl = document.createElement("p");
stateEl.className = "text-gray-700";
stateEl.textContent = `State: ${deliveryInfo.state || "N/A"}`;

card.appendChild(companyEl);
card.appendChild(typeEl);
card.appendChild(stateEl);

// ✅ Show terminal only if terminal selected
if (deliveryInfo.deliveryType === "terminal") {
  const terminalEl = document.createElement("p");
  terminalEl.className = "text-gray-700";
  terminalEl.textContent = `Terminal: ${deliveryInfo.terminal || "N/A"}`;
  card.appendChild(terminalEl);
}

// ✅ Show home charge only if home selected
if (deliveryInfo.deliveryType === "home") {
  const homeFeeEl = document.createElement("p");
  homeFeeEl.className = "text-gray-700";
  homeFeeEl.textContent = `Home Delivery Charge: ₦800`;
  card.appendChild(homeFeeEl);
}
  }

  // Weight row
const weightEl = document.createElement("p");
weightEl.className = "text-gray-700";
weightEl.textContent = `Total Weight: ${totalWeight} kg`; // <-- show total weight
card.appendChild(weightEl);

  // Append to shipment summary container
  shipmentContainer.appendChild(card);

  // Update totals in the summary
  if (summarySubtotal) summarySubtotal.textContent = `₦${subtotal.toLocaleString()}`;
  if (summaryShipping) summaryShipping.textContent = `₦${shippingFee.toLocaleString()}`;
  if (summaryTotal) summaryTotal.textContent = `₦${(subtotal + shippingFee).toLocaleString()}`;

  // Show edit button
  document.getElementById("shipping-edit-btn").classList.remove("hidden");

  // Clear temporary shipping data from localStorage
  localStorage.removeItem("checkoutState");
};

document.getElementById("shipping-edit-btn").onclick = () => {
  document.getElementById("address-form").classList.remove("hidden");
  document.getElementById("shipping-summary-card").classList.add("hidden");
  document.getElementById("shipment-summary-card").classList.add("hidden");
  document.getElementById("payment-summary-card").classList.add("hidden");
  document.getElementById("shipping-edit-btn").classList.add("hidden");

// Disable summaryPlaceOrderBtn again
  summaryPlaceOrderBtn.disabled = true;
  summaryPlaceOrderBtn.classList.add("bg-gray-400");
  summaryPlaceOrderBtn.classList.remove("bg-pink-600", "hover:bg-pink-700");
};

// // Summary Place Order Button
// Summary Place Order Button
summaryPlaceOrderBtn.addEventListener("click", async () => {
  if (!selectedPayment) {
    showNotification("Please select a payment method.");
    return;
  }

  const cartItems = JSON.parse(localStorage.getItem("cart") || "[]");
  if (!cartItems.length) {
    showNotification("Your cart is empty!");
    return;
  }

  showLoader();

  // Collect shipping data
  const shippingData = {
    email: document.getElementById("email").value,
    firstName: document.getElementById("first-name").value,
    lastName: document.getElementById("last-name").value,
    street: document.getElementById("street").value,
    state: document.getElementById("state").value,
    lga: document.getElementById("lga").value,
    areaCode: document.getElementById("area-code").value,
    phone: document.getElementById("phone").value,
    country: countrySelect.value
  };

  // Delivery info
  const deliveryInfo = {
    country: countrySelect.value,
    state: stateSelect.value,
    company: deliveryCompany.value,
    type: deliveryType.value,
    terminal: terminalSelect.value || null,
    lga: lgaSelect.value || null,
    address: `${shippingData.street}, ${shippingData.lga ? shippingData.lga + ",": ""}${shippingData.state}`
  };

  // Subtotal & shipping
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  const totalWeight = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const shippingFee = calculateDeliveryFee(deliveryInfo, totalWeight);
  const total = subtotal + shippingFee;

  if (selectedPayment === "whatsapp") {
    // Generate order reference
    const whatsappPaymentRef = generateWhatsappPaymentRef();

    // Save order to Firestore
    const orderRef = db.collection("orders").doc();
    await orderRef.set({
      guestId,
      items: cartItems,
      shipping: shippingData,
      delivery: deliveryInfo,
      status: "processing",
      payment: {
        method: "whatsapp",
        reference: whatsappPaymentRef,
        status: "paid"
      },
      pricing: {
        subtotal,
        shippingFee,
        total
      },
      shipment: {
  status: "pending"
},
      // status: "pending",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Clear guest cart
    await guestCartRef.set({ guestId, items: [] });
    renderCart([]);

    // Build WhatsApp message
    const billing = {
      name: `${shippingData.firstName} ${shippingData.lastName}`,
      phone: shippingData.areaCode + shippingData.phone,
      email: shippingData.email
    };

    const itemsText = cartItems.map(i => `- ${i.name} x${i.quantity} - ₦${(i.price * i.quantity).toLocaleString()}`).join("%0A");

    const isInternational = shippingData.country.toLowerCase() !== "nigeria";

    const message = `
*🛒 New ${isInternational ? "International" : "Local"} Order*
*🧾 Payment Ref:* ${whatsappPaymentRef}

*👤 Customer Details*
- Name: ${billing.name}
- Phone: ${billing.phone}
- Email: ${billing.email}

*🌍 Delivery Info*
- Country: ${deliveryInfo.country}
- Address: ${deliveryInfo.address}
- Delivery Type: ${deliveryInfo.type || "Home Delivery"}

*📦 Order Items*
${itemsText}

*💰 Payment Summary*
- Subtotal: ₦${subtotal.toLocaleString()}
- Delivery Fee: ${isInternational ? "To be confirmed" : `₦${shippingFee.toLocaleString()}`}
- Total: ₦${total.toLocaleString()}

⚠️ Please confirm stock availability and delivery cost with the customer.
Thank you! 🙏
`;

    // Open WhatsApp with message
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");

    // Show success page
    checkoutStep.classList.add("hidden");
    completeStep.classList.remove("hidden");
    setActiveBreadcrumb("complete");
    confetti();
  }

  else if (selectedPayment === "paystack") {
    const totalAmount = total;

    // Paystack callback function
    function handlePaystackSuccess(response) {
      (async () => {
        // showNotification("Payment successful! Transaction ref: " + response.reference);

        const orderRef = db.collection("orders").doc();
        await orderRef.set({
          guestId,
          items: cartItems,
          shipping: shippingData,
          delivery: deliveryInfo,
          payment: {
            method: "paystack",
            reference: response.reference
          },
          pricing: {
            subtotal,
            shippingFee,
            total: totalAmount
          },
          status: "pending",
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Clear guest cart
        await guestCartRef.set({ guestId, items: [] });
        renderCart([]);

        // Show success page
        checkoutStep.classList.add("hidden");
        completeStep.classList.remove("hidden");
        setActiveBreadcrumb("complete");
        hideLoader();
        confetti();
      })();
    }

    function handlePaystackClose() {
      showNotification("Payment window closed. You can retry your payment.");
    }

    let handler = PaystackPop.setup({
      key: "pk_test_0ed65a8011643dd303600706cb990c9ba067f199",
      email: shippingData.email,
      amount: totalAmount * 100,
      currency: "NGN",
      ref: "PS-" + Date.now(),
      metadata: {
        custom_fields: [
          { display_name: "Full Name", variable_name: "full_name", value: `${shippingData.firstName} ${shippingData.lastName}` },
          { display_name: "Phone Number", variable_name: "phone", value: shippingData.phone }
        ]
      },
      callback: handlePaystackSuccess,
      onClose: handlePaystackClose
    });

    handler.openIframe();
  }

});

  // Validate Shipping Form
  function validateShippingForm() {
  const requiredFields = [
    "email",
    "first-name",
    "last-name",
    "street",
    "country",
    "state",
    "area-code",
    "phone"
  ];

  let isValid = true;

  requiredFields.forEach(id => {
    const field = document.getElementById(id);
    if (!field || !field.value.trim()) {
      isValid = false;
      if (field) field.classList.add("border-red-500");
    } else {
      field.classList.remove("border-red-500");
    }
  });

  // Special case: Nigeria + Lagos must have LGA
  if (
    countrySelect.value === "Nigeria" &&
    stateSelect.value.toLowerCase().includes("lagos")
  ) {
    if (!lgaSelect.value) {
      isValid = false;
      lgaSelect.classList.add("border-red-500");
    } else {
      lgaSelect.classList.remove("border-red-500");
    }
  }

  // Require delivery fields ONLY if delivery options are visible
if (!deliveryOptionsWrapper.classList.contains("hidden")) {
  if (!deliveryCompany.value) {
    deliveryCompany.classList.add("border-red-500");
    isValid = false;
  } else {
    deliveryCompany.classList.remove("border-red-500");
  }

  if (!deliveryType.value) {
    deliveryType.classList.add("border-red-500");
    isValid = false;
  } else {
    deliveryType.classList.remove("border-red-500");
  }

  // If terminal selected, ensure terminal chosen
  if (deliveryType.value === "terminal" && !terminalSelect.value) {
    terminalSelect.classList.add("border-red-500");
    isValid = false;
  } else {
    terminalSelect.classList.remove("border-red-500");
  }
}

// Inside validateShippingForm()
const phoneField = document.getElementById("phone");
if (phoneField) {
  const phoneValue = phoneField.value.trim();
  // Check if it's exactly 11 digits
  const phoneRegex = /^\d{11}$/;
  if (!phoneRegex.test(phoneValue)) {
    isValid = false;
    phoneField.classList.add("border-red-500");
  } else {
    phoneField.classList.remove("border-red-500");
  }
}

  return isValid;
}

function updatePaymentVisibility() {
  const country = (countrySelect.value || "").toLowerCase();
  const isNigeria = country === "nigeria";

  const paystackOption = document.getElementById("paystack-option");
  const whatsappOption = document.getElementById("WhatsApp");

  // Reset selection
  selectedPayment = null;
  summaryPlaceOrderBtn.disabled = true;
  summaryPlaceOrderBtn.classList.add("bg-gray-400");
  summaryPlaceOrderBtn.classList.remove("bg-pink-600", "hover:bg-pink-700");

  // Remove highlight
  document.querySelectorAll("#payment-summary-card .cursor-pointer").forEach(o => {
    o.classList.remove("border-pink-600", "bg-pink-50");
  });

  if (isNigeria) {
    paystackOption.style.display = "block";
    whatsappOption.style.display = "none";
  } else {
    paystackOption.style.display = "none";
    whatsappOption.style.display = "block";
  }
}

countrySelect.addEventListener("change", updatePaymentVisibility);

  // ==================== BREADCRUMBS ====================
const bcGuestCarts = document.getElementById("bc-guestCarts");
const bcCheckout = document.getElementById("bc-checkout");
const bcComplete = document.getElementById("bc-complete");

// ==================== BREADCRUMB ====================
const steps = {
  cart: document.getElementById("bc-cart"),
  checkout: document.getElementById("bc-checkout"),
  complete: document.getElementById("bc-complete")
};

function setBreadcrumb(activeStep) {
  // remove active class from all steps
  Object.values(steps).forEach(el => {
    if (el) el.classList.remove("font-semibold", "text-gray-900");
  });

  // add active class to the current step
  if (steps[activeStep]) {
    steps[activeStep].classList.add("font-semibold", "text-gray-900");
  }
}

// Helper to update active breadcrumb
function setActiveBreadcrumb(step) {
  [bcGuestCarts, bcCheckout, bcComplete].forEach(el => {
    el.classList.remove("font-bold", "text-pink-600");
    el.classList.add("text-gray-500");
  });

  switch(step) {
    case "cart":
      bcGuestCarts.classList.add("font-bold", "text-pink-600");
      bcGuestCarts.classList.remove("text-gray-500");
      break;
    case "checkout":
      bcCheckout.classList.add("font-bold", "text-pink-600");
      bcCheckout.classList.remove("text-gray-500");
      break;
    case "complete":
      bcComplete.classList.add("font-bold", "text-pink-600");
      bcComplete.classList.remove("text-gray-500");
      break;
  }
}

// ==================== BREADCRUMB CLICK EVENTS ====================
bcGuestCarts.onclick = () => {
  showLoader();
  setTimeout(() => {
    cartContainer.classList.remove("hidden");
    checkoutStep.classList.add("hidden");
    completeStep.classList.add("hidden");
    setActiveBreadcrumb("cart");
    hideLoader();
  }, 200); //

  gsap.from(completeStep, { 
  y: 50, 
  opacity: 0, 
  duration: 0.8, 
  ease: "bounce.out" 
});
};

bcCheckout.onclick = () => {
  showLoader();
  setTimeout(() => {
    cartContainer.classList.add("hidden");
    checkoutStep.classList.remove("hidden");
    completeStep.classList.add("hidden");
    setActiveBreadcrumb("checkout");
    hideLoader();
  }, 200);
};

// bcComplete.onclick = () => {
//   showLoader();
//   setTimeout(() => {
//     cartContainer.classList.add("hidden");
//     checkoutStep.classList.add("hidden");
//     completeStep.classList.remove("hidden");
//     setActiveBreadcrumb("complete");
//     hideLoader();
//   }, 200);
// };

// ==================== UPDATE BREADCRUMB ON INIT ====================
// Start on Cart view
setActiveBreadcrumb("cart");

// Update breadcrumb when checkout button clicked
checkoutBtn.onclick = () => {
  showLoader();
  setTimeout(() => {
    cartContainer.classList.add("hidden");
    checkoutStep.classList.remove("hidden");
    setActiveBreadcrumb("checkout");
    hideLoader();
  }, 200);
};

  // ==================== INIT ====================
  startCartListener();
  setTimeout(() => hideLoader(), 5000);
})();