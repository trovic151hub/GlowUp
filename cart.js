(function() {
  const WHATSAPP_NUMBER = "2347036594806";

  function generateWhatsappPaymentRef() {
    return "WA-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
  }

  // Waits until the page is backgrounded (user left for the WhatsApp app) and then
  // foregrounded again (user returned), so the UI doesn't update while a system
  // "Open with" chooser is still on screen. Requires the hidden state to last at
  // least minHiddenMs — the chooser sheet itself can cause a near-instant
  // hidden→visible blip before the user picks anything, which would otherwise
  // resolve this immediately. Falls back to a timeout in case the user picks
  // something that never backgrounds the tab (e.g. a browser option).
  function waitForAppReturn(maxWait = 8000, minHiddenMs = 5000) {
    return new Promise(resolve => {
      let hiddenAt = null;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        document.removeEventListener("visibilitychange", onVisibilityChange);
        clearTimeout(fallback);
        resolve();
      };
      const onVisibilityChange = () => {
        if (document.hidden) {
          hiddenAt = Date.now();
        } else if (hiddenAt && (Date.now() - hiddenAt) >= minHiddenMs) {
          finish();
        } else {
          // Became visible again too quickly to be a real app switch — likely
          // just the chooser sheet appearing/dismissing. Keep waiting.
          hiddenAt = null;
        }
      };
      document.addEventListener("visibilitychange", onVisibilityChange);
      const fallback = setTimeout(finish, maxWait);
    });
  }

  // ==================== LOADER ====================
  let loader = document.getElementById("cartLoader");
  document.body.style.overflow = "hidden";
  document.body.style.pointerEvents = "none";
  function showLoader() {
  if (!loader) return;

  // If loader was removed, recreate it
  if (!document.body.contains(loader)) {
    loader = document.createElement("div");
    loader.id = "cartLoader";
    loader.innerHTML = `<img src="attached_assets/pearl-skin-care-icon.png" alt="Loading" style="height:56px;width:auto;animation:pearlPulse 1.8s ease-in-out infinite;" />`;
    loader.style = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.4);
      display: flex; align-items: center; justify-content: center;
      z-index: 9999;
      transition: opacity 0.3s ease;
    `;
    document.body.appendChild(loader);
  }

  loader.style.opacity = "1";
  loader.style.display = "flex";
  loader.style.pointerEvents = "";
  document.body.style.overflow = "hidden";
  document.body.style.pointerEvents = "none";
}

  function hideLoader() {
    if (loader) {
      loader.style.opacity = "0";
      loader.style.pointerEvents = "none"; // prevent invisible overlay from blocking clicks
      setTimeout(() => {
        try {
          if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
        } catch(e) { if (loader) loader.style.display = "none"; }
      }, 300);
    }
    document.body.style.overflow = "";
    document.body.style.pointerEvents = "";
  }

  // ==================== FIREBASE ====================
  const firebaseConfig = window.CONFIG.firebase;
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
  const mobileCheckoutBtn = document.getElementById("mobile-checkout-btn");
  const mobileStickyBar = document.getElementById("mobile-sticky-bar");
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

// ==================== TOM SELECT INIT ====================
const countryTomSelect = new TomSelect("#country", {
  placeholder: "Search country...",
  searchField: "text",
  create: false,
  allowEmptyOption: false,
  maxOptions: null,
  closeAfterSelect: true,
  plugins: ["dropdown_input"],
  render: {
    no_results: () => '<div style="padding:10px 14px;color:#9E8E88;font-size:0.88rem;">No countries found</div>'
  }
});

const stateTomSelect = new TomSelect("#state", {
  placeholder: "Select country first",
  searchField: "text",
  create: false,
  allowEmptyOption: false,
  maxOptions: null,
  closeAfterSelect: true,
  plugins: ["dropdown_input"],
  render: {
    no_results: () => '<div style="padding:10px 14px;color:#9E8E88;font-size:0.88rem;">No states found</div>'
  }
});
stateTomSelect.disable();

const lgaTomSelect = new TomSelect("#lga", {
  placeholder: "Select LGA",
  searchField: "text",
  create: false,
  closeAfterSelect: true,
  plugins: ["dropdown_input"],
  render: {
    no_results: () => '<div style="padding:10px 14px;color:#9E8E88;font-size:0.88rem;">No LGA found</div>'
  }
});
lgaTomSelect.disable();

const deliveryCompanyTs = new TomSelect("#delivery-company", {
  placeholder: "Select Delivery Company",
  searchField: "text",
  create: false,
  closeAfterSelect: true,
  render: {
    no_results: () => '<div style="padding:10px 14px;color:#9E8E88;font-size:0.88rem;">No options found</div>'
  }
});

const deliveryTypeTs = new TomSelect("#delivery-type", {
  placeholder: "Select Delivery Type",
  searchField: "text",
  create: false,
  closeAfterSelect: true,
  render: {
    no_results: () => '<div style="padding:10px 14px;color:#9E8E88;font-size:0.88rem;">No options found</div>'
  }
});

const terminalTs = new TomSelect("#terminal", {
  placeholder: "Select Terminal",
  searchField: "text",
  create: false,
  closeAfterSelect: true,
  plugins: ["dropdown_input"],
  render: {
    no_results: () => '<div style="padding:10px 14px;color:#9E8E88;font-size:0.88rem;">No terminals found</div>'
  }
});
terminalTs.disable();

// ==================== INTL-TEL-INPUT INIT ====================
const iti = window.intlTelInput(document.getElementById("phone"), {
  initialCountry: "ng",
  preferredCountries: ["ng", "gh", "gb", "us", "ca", "za"],
  separateDialCode: true,
  utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@18/build/js/utils.js"
});

// ==================== FORM PERSISTENCE ====================
const FORM_STORAGE_KEY = "checkoutFormData";

const persistedFields = [
  { id: "email",            event: "input"  },
  { id: "first-name",       event: "input"  },
  { id: "last-name",        event: "input"  },
  { id: "street",           event: "input"  },
  { id: "phone",            event: "input"  },
  { id: "delivery-company", event: "change" },
  { id: "delivery-type",    event: "change" },
  { id: "terminal",         event: "change" },
  { id: "lga",              event: "change" }
];

function saveFormData() {
  const data = {};
  persistedFields.forEach(({ id }) => {
    if (id === "phone") return;
    const el = document.getElementById(id);
    if (el) data[id] = el.value;
  });
  data.phone = iti ? iti.getNumber() : "";
  data.country = countryTomSelect ? countryTomSelect.getValue() : "";
  data.state = stateTomSelect ? stateTomSelect.getValue() : "";
  localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(data));
}

function restoreFormData() {
  const raw = localStorage.getItem(FORM_STORAGE_KEY);
  if (!raw) return;
  let data;
  try { data = JSON.parse(raw); } catch(e) { return; }
  persistedFields.forEach(({ id }) => {
    if (id === "phone") return;
    const el = document.getElementById(id);
    if (el && data[id] !== undefined) el.value = data[id];
  });
  if (iti && data.phone) iti.setNumber(data.phone);
  // Country/state are restored in loadCountries() after options are populated
}

function clearFormData() {
  localStorage.removeItem(FORM_STORAGE_KEY);
  persistedFields.forEach(({ id }) => {
    if (id === "phone") return;
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  if (iti) iti.setNumber("");
  if (countryTomSelect) countryTomSelect.setValue("", true);
  if (stateTomSelect) { stateTomSelect.clearOptions(); stateTomSelect.setValue("", true); }
}

// Attach save listeners to all persisted fields
persistedFields.forEach(({ id, event }) => {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, saveFormData);
});

// Auto go to checkout if triggered from homepage
window.addEventListener("DOMContentLoaded", () => {
    restoreFormData();

    const gotoCheckout = localStorage.getItem("gotoCheckout");

    if (gotoCheckout === "true") {
        localStorage.removeItem("gotoCheckout");

        // Hide cart view and show checkout step
        cartContainer.classList.add("hidden");
        if (mobileStickyBar) mobileStickyBar.classList.add("hidden");
        checkoutStep.classList.remove("hidden");
        completeStep.classList.add("hidden");
        setActiveBreadcrumb("checkout");

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
    fee = totalWeight <= 2 ? 6800 : 6800 + 800 * Math.ceil(totalWeight - 2);

    if (deliveryType === "home") fee += 800;
  }

  // GUO pricing (terminal only — no home delivery)
  else if (company === "GUO" && guoSupportedStates.includes(state)) {
    const isNorth = guoNorthernStates.includes(state);
    const base = isNorth ? 9000 : 5000;
    if (totalWeight <= 2) fee = base;
    else fee = base + 800 * Math.ceil(totalWeight - 2);
  }

  return fee;
}

  let cartUnsub = null;

  // ==================== HELPERS ====================
  function updateTotals(subtotal){
    const formatted = `₦${subtotal.toLocaleString()}`;
    if(cartSubtotalMain) cartSubtotalMain.textContent = formatted;
    if(cartSubtotalCheckout) cartSubtotalCheckout.textContent = formatted;
    const mobileStickyTotal = document.getElementById("mobile-sticky-total");
    if(mobileStickyTotal) mobileStickyTotal.textContent = formatted;
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
            <p style="font-size:0.875rem;color:#6B5B55;line-height:1.7;margin-bottom:24px;">${item.description}</p>
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
  company: deliveryCompanyTs.getValue()
};

// Calculate shipping fee dynamically
const shippingFee = calculateDeliveryFee(deliveryInfo, totalWeight);

// Update summary totals
if(summarySubtotal) summarySubtotal.textContent = `₦${subtotal.toLocaleString()}`;
if(summaryShipping) summaryShipping.textContent = `₦${shippingFee.toLocaleString()}`;
if(summaryTotal) summaryTotal.textContent = `₦${(subtotal + shippingFee).toLocaleString()}`;
  }

  let selectedPayment = null;

  document.querySelectorAll("#payment-summary-card .payment-option").forEach(option => {
  option.addEventListener("click", () => {

    const isAlreadySelected = option.classList.contains("border-pink-600");

    // Remove highlight + hide all check icons
    document.querySelectorAll("#payment-summary-card .payment-option").forEach(o => {
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
    } else if (option.id === "flutterwave-option") {
      selectedPayment = "flutterwave";
    } else if (option.id === "WhatsApp") {
      selectedPayment = "whatsapp";
    }

    summaryPlaceOrderBtn.disabled = false;
    summaryPlaceOrderBtn.classList.remove("bg-gray-400");
    summaryPlaceOrderBtn.classList.add("bg-pink-600", "hover:bg-pink-700");
  });
});

// ==================== COUNTRY / STATE LOADING ====================
async function loadStatesForCountry(countryName, savedState = null) {
  stateTomSelect.enable();
  stateTomSelect.clearOptions();
  stateTomSelect.setValue("", true);
  if (lgaWrapper) {
    lgaWrapper.classList.add("hidden");
    lgaTomSelect.clear(true);
    lgaTomSelect.clearOptions();
    lgaTomSelect.disable();
  }
  try {
    const res = await fetch("https://countriesnow.space/api/v0.1/countries/states", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country: countryName })
    });
    const data = await res.json();
    stateTomSelect.clearOptions();
    if (data.data && data.data.states && data.data.states.length) {
      data.data.states.forEach(s => stateTomSelect.addOption({ value: s.name, text: s.name }));
    }
    stateTomSelect.refreshOptions(false);
    if (savedState) {
      stateTomSelect.setValue(savedState, true);
      updateLgaVisibility();
    }
  } catch {
    stateTomSelect.addOption({ value: "", text: "Error loading states" });
    stateTomSelect.refreshOptions(false);
  }
}

async function loadCountries() {
  try {
    const res = await fetch("https://countriesnow.space/api/v0.1/countries");
    const data = await res.json();
    countryTomSelect.clearOptions();
    data.data.forEach(c => countryTomSelect.addOption({ value: c.country, text: c.country }));
    countryTomSelect.refreshOptions(false);
    const saved = JSON.parse(localStorage.getItem(FORM_STORAGE_KEY) || "{}");
    if (saved.country) {
      countryTomSelect.setValue(saved.country, true);
      await loadStatesForCountry(saved.country, saved.state || null);
      updatePaymentVisibility();
      updateDeliveryVisibility();
    }
  } catch {
    countryTomSelect.addOption({ value: "", text: "Error loading countries" });
    countryTomSelect.refreshOptions(false);
  }
}

loadCountries();

// Tom Select event callbacks
countryTomSelect.on("change", async (value) => {
  if (!value) return;
  updatePaymentVisibility();
  updateDeliveryVisibility();
  await loadStatesForCountry(value);
  if (iti) {
    const match = (window.intlTelInputGlobals?.getCountryData() || [])
      .find(c => c.name.toLowerCase() === value.toLowerCase());
    if (match) iti.setCountry(match.iso2);
  }
  saveFormData();
});

function updateLgaVisibility(stateValue) {
  const country = (countryTomSelect.getValue() || countrySelect.value || "").toLowerCase();
  const state = (stateValue !== undefined ? stateValue : (stateTomSelect.getValue() || stateSelect.value || "")).toLowerCase();
  if (country === "nigeria" && state.includes("lagos")) {
    lgaWrapper.classList.remove("hidden");
    try {
      if (!lgaTomSelect.options || Object.keys(lgaTomSelect.options).length === 0) {
        Object.keys(lagosLGAs).forEach(lga => lgaTomSelect.addOption({ value: lga, text: lga }));
        lgaTomSelect.refreshOptions(false);
      }
      lgaTomSelect.enable();
    } catch(e) {}
  } else {
    lgaWrapper.classList.add("hidden");
    try {
      lgaTomSelect.clear(true);
      lgaTomSelect.clearOptions();
      lgaTomSelect.disable();
    } catch(e) {}
  }
}

stateTomSelect.on("change", (value) => {
  if (!value) return;
  localStorage.setItem("checkoutState", value);
  updateDeliveryVisibility();
  updateDeliveryCompanyAvailability();
  populateTerminals();
  updateLgaVisibility(value);
  saveFormData();
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
const guoNorthernStates = ["federal capital territory", "kaduna", "kano", "plateau", "yola", "bauchi"];

// const deliveryCompany = document.getElementById("delivery-company");

function updateDeliveryCompanyAvailability() {
  const stateRaw = stateInput.value.trim().toLowerCase();
  const stateKey = stateRaw.replace(" state", "");

  if (!stateKey) return;

  const guoSupportedStates = Object.keys(GUOTerminals);

  if (!guoSupportedStates.includes(stateKey)) {
    deliveryCompanyTs.updateOption("GUO", { value: "GUO", text: "GUO Transport", disabled: true });
    if (deliveryCompanyTs.getValue() === "GUO") deliveryCompanyTs.setValue("GIG", true);
  } else {
    deliveryCompanyTs.updateOption("GUO", { value: "GUO", text: "GUO Transport", disabled: false });
  }
  deliveryCompanyTs.refreshOptions(false);
}


function populateTerminals() {
  const stateRaw = stateInput.value.trim().toLowerCase();
  const company = deliveryCompanyTs.getValue().trim().toUpperCase();
  const type = deliveryTypeTs.getValue();
  const stateKey = stateRaw.replace(" state", "");

  terminalTs.clear(true);
  terminalTs.clearOptions();

  if (!stateKey || !company || type !== "terminal") {
    terminalWrapper.classList.add("hidden");
    terminalTs.disable();
    return;
  }

  terminalWrapper.classList.remove("hidden");

  let terminals = [];
  if (company === "GUO") terminals = GUOTerminals[stateKey] || [];
  if (company === "GIG") terminals = GIGTerminals[stateKey] || [];

  terminals.forEach(t => terminalTs.addOption({ value: t, text: t }));
  terminalTs.refreshOptions(false);
  terminalTs.enable();
}

stateSelect.addEventListener("change", () => {
  localStorage.setItem("checkoutState", stateSelect.value);
  if (deliveryTypeTs.getValue() === "terminal") {
    terminalTs.clear(true);
    terminalTs.clearOptions();
  }
  updateLgaVisibility(stateSelect.value);
});

deliveryCompanyTs.on("change", populateTerminals);
deliveryTypeTs.on("change", populateTerminals);



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
  deliveryCompanyTs.setValue("", true);
  deliveryTypeTs.setValue("", true);
  terminalTs.clear(true);
  terminalTs.clearOptions();
  terminalTs.disable();
  terminalWrapper.classList.add("hidden");
}


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
  try {
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
    phone: iti ? iti.getNumber() : document.getElementById("phone").value,
    country: countrySelect.value
  };

  // Hide the shipping form
  document.getElementById("address-form").classList.add("hidden");

  // Show summary cards
  document.getElementById("shipping-summary-card").classList.remove("hidden");
  document.getElementById("shipment-summary-card").classList.remove("hidden");
  document.getElementById("payment-summary-card").classList.remove("hidden");
  updatePaymentVisibility();

  // Populate shipping summary
  document.getElementById("sum-email").textContent = shippingData.email;
  document.getElementById("sum-name").textContent = `${shippingData.firstName} ${shippingData.lastName}`;
  document.getElementById("sum-phone").textContent = shippingData.phone;
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
  company: deliveryCompanyTs.getValue(),
  lga: lgaTomSelect.getValue(),
  deliveryType: deliveryTypeTs.getValue(),
  terminal: terminalTs.getValue() || ""
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
const isNigeria = deliveryInfo.country?.toLowerCase() === "nigeria";
const isLagos = deliveryInfo.state?.toLowerCase().includes("lagos");

// 🌍 INTERNATIONAL
if (!isNigeria) {
  feeEl.textContent = "Delivery fee will be confirmed via WhatsApp";
}

// 🏙 LAGOS DELIVERY (show exact fee only)
else if (isLagos) {
  feeEl.textContent = `₦${shippingFee.toLocaleString()}`;
}

// 🚚 GUO
else if (deliveryInfo.company === "GUO") {
  minFee = 5000;
  minFee = Math.min(minFee, shippingFee);
  maxFee = shippingFee + buffer;

  feeEl.textContent = `Estimated: ₦${minFee.toLocaleString()} – ₦${maxFee.toLocaleString()}`;
}

// 🚚 GIG
else if (deliveryInfo.company === "GIG") {
  minFee = 6800;
  minFee = Math.min(minFee, shippingFee);
  maxFee = shippingFee + buffer;

  feeEl.textContent = `Estimated: ₦${minFee.toLocaleString()} – ₦${maxFee.toLocaleString()}`;
}

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
  } catch(err) {
    console.error("Place order error:", err);
    showNotification("Something went wrong. Please try again.", "error");
  }
};

document.getElementById("shipping-edit-btn").onclick = () => {
  document.getElementById("address-form").classList.remove("hidden");
  document.getElementById("shipping-summary-card").classList.add("hidden");
  document.getElementById("shipment-summary-card").classList.add("hidden");
  document.getElementById("payment-summary-card").classList.add("hidden");
  document.getElementById("shipping-edit-btn").classList.add("hidden");
  updatePaymentVisibility();
  updateLgaVisibility();
};

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

  try {

  // Collect shipping data
  const shippingData = {
    email: document.getElementById("email").value,
    firstName: document.getElementById("first-name").value,
    lastName: document.getElementById("last-name").value,
    street: document.getElementById("street").value,
    state: document.getElementById("state").value,
    lga: document.getElementById("lga").value,
    phone: iti ? iti.getNumber() : document.getElementById("phone").value,
    country: countrySelect.value
  };

  // Delivery info
  const deliveryInfo = {
    country: countrySelect.value,
    state: stateSelect.value,
    company: deliveryCompanyTs.getValue(),
    type: deliveryTypeTs.getValue(),
    terminal: terminalTs.getValue() || null,
    lga: lgaTomSelect.getValue() || null,
    address: `${shippingData.street}, ${shippingData.lga ? shippingData.lga + ",": ""}${shippingData.state}`
  };

  // Subtotal & shipping
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  const totalWeight = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const shippingFee = calculateDeliveryFee(deliveryInfo, totalWeight);
  const total = subtotal + shippingFee;

  if (selectedPayment === "whatsapp") {
    // --- Build everything synchronously so window.open runs before any await ---
    const whatsappPaymentRef = generateWhatsappPaymentRef();

    const billing = {
      name: `${shippingData.firstName} ${shippingData.lastName}`,
      phone: shippingData.phone,
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

    // Open WhatsApp BEFORE any await — keeps iOS from blocking the popup
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");

    // Save order to Firestore
    const orderRef = db.collection("orders").doc();
    await orderRef.set({
      guestId,
      userId: firebase.auth().currentUser?.uid || null,
      items: cartItems,
      shipping: shippingData,
      delivery: deliveryInfo,
      status: "pending",
      payment: {
        method: "whatsapp",
        reference: whatsappPaymentRef,
        status: "pending"
      },
      pricing: {
        subtotal,
        shippingFee,
        total
      },
      shipment: {
        status: "pending"
      },
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Clear guest cart
    await guestCartRef.set({ guestId, items: [] });
    renderCart([]);
    clearFormData();

    // Wait for the user to leave for WhatsApp and come back (or a fallback
    // timeout) before revealing the success screen, so it doesn't appear
    // underneath the still-open mobile "Open with" app chooser.
    await waitForAppReturn();

    // Show success page
    checkoutStep.classList.add("hidden");
    completeStep.classList.remove("hidden");
    setActiveBreadcrumb("complete");
    hideLoader();
    confetti();
  }

  else if (selectedPayment === "paystack") {
    const totalAmount = total;

    function handlePaystackSuccess(response) {
      (async () => {
        showLoader();
        const orderRef = db.collection("orders").doc();
        await orderRef.set({
          guestId,
          userId: firebase.auth().currentUser?.uid || null,
          items: cartItems,
          shipping: shippingData,
          delivery: deliveryInfo,
          payment: {
            method: "paystack",
            reference: response.reference
          },
          pricing: { subtotal, shippingFee, total: totalAmount },
          status: "pending",
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await guestCartRef.set({ guestId, items: [] });
        renderCart([]);
        clearFormData();
        checkoutStep.classList.add("hidden");
        completeStep.classList.remove("hidden");
        setActiveBreadcrumb("complete");
        hideLoader();
        confetti();
      })();
    }

    function handlePaystackClose() {
      hideLoader();
      showNotification("Payment window closed. You can retry your payment.");
    }

    let handler = PaystackPop.setup({
      key: window.CONFIG.paystackKey,
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
    hideLoader();
    handler.openIframe();
  }

  else if (selectedPayment === "flutterwave") {
    if (typeof FlutterwaveCheckout !== "function") {
      hideLoader();
      showNotification("Payment system not available. Please refresh and try again.", "error");
      return;
    }
    const totalAmount = total;
    const txRef = "FLW-" + Date.now();
    let flwSuccessResponse = null;

    hideLoader();
    FlutterwaveCheckout({
      public_key: window.CONFIG.flutterwaveKey,
      tx_ref: txRef,
      amount: totalAmount,
      currency: "NGN",
      payment_options: "card, banktransfer, ussd",
      customer: {
        email: shippingData.email,
        phone_number: shippingData.phone,
        name: `${shippingData.firstName} ${shippingData.lastName}`
      },
      customizations: {
        title: "Pearl Skin Care",
        description: "Order Payment"
      },
      callback: function(response) {
        // Store response — actual order save happens in onclose
        // so we don't fight Flutterwave's modal lifecycle
        flwSuccessResponse = response;
      },
      onclose: function() {
        if (!flwSuccessResponse) {
          // User cancelled
          hideLoader();
          showNotification("Payment window closed. You can retry your payment.");
          return;
        }
        const response = flwSuccessResponse;
        flwSuccessResponse = null;
        (async () => {
          try {
            showLoader();
            const orderRef = db.collection("orders").doc();
            await orderRef.set({
              guestId,
              userId: firebase.auth().currentUser?.uid || null,
              items: cartItems,
              shipping: shippingData,
              delivery: deliveryInfo,
              payment: {
                method: "flutterwave",
                reference: response.tx_ref,
                transactionId: String(response.transaction_id)
              },
              pricing: { subtotal, shippingFee, total: totalAmount },
              status: "pending",
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            await guestCartRef.set({ guestId, items: [] });
            renderCart([]);
            checkoutStep.classList.add("hidden");
            completeStep.classList.remove("hidden");
            setActiveBreadcrumb("complete");
            hideLoader();
            confetti();
            try { clearFormData(); } catch(e) {}
          } catch (err) {
            hideLoader();
            showNotification("Order save failed. Contact support with ref: " + response.tx_ref, "error");
            console.error("Flutterwave order save error:", err);
          }
        })();
      }
    });
  }

  } catch(err) {
    hideLoader();
    console.error("Payment handler error:", err);
    showNotification("Something went wrong. Please try again.", "error");
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
    "state"
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
    if (!lgaTomSelect.getValue()) {
      isValid = false;
      lgaTomSelect.control.classList.add("border-red-500");
    } else {
      lgaTomSelect.control.classList.remove("border-red-500");
    }
  }

  // Require delivery fields ONLY if delivery options are visible
if (!deliveryOptionsWrapper.classList.contains("hidden")) {
  if (!deliveryCompanyTs.getValue()) {
    deliveryCompanyTs.control.classList.add("border-red-500");
    isValid = false;
  } else {
    deliveryCompanyTs.control.classList.remove("border-red-500");
  }

  if (!deliveryTypeTs.getValue()) {
    deliveryTypeTs.control.classList.add("border-red-500");
    isValid = false;
  } else {
    deliveryTypeTs.control.classList.remove("border-red-500");
  }

  // If terminal selected, ensure terminal chosen
  if (deliveryTypeTs.getValue() === "terminal" && !terminalTs.getValue()) {
    terminalTs.control.classList.add("border-red-500");
    isValid = false;
  } else {
    terminalTs.control.classList.remove("border-red-500");
  }
}

const phoneField = document.getElementById("phone");
if (phoneField) {
  const phoneNumber = iti ? iti.getNumber() : phoneField.value.trim();
  if (!phoneNumber) {
    isValid = false;
    phoneField.closest(".iti") ? phoneField.closest(".iti").classList.add("border-red-500") : phoneField.classList.add("border-red-500");
  } else {
    phoneField.closest(".iti") ? phoneField.closest(".iti").classList.remove("border-red-500") : phoneField.classList.remove("border-red-500");
  }
}

  return isValid;
}

function updatePaymentVisibility() {
  const country = (countrySelect.value || "").toLowerCase();
  const isNigeria = country === "nigeria";

  const paystackOption = document.getElementById("paystack-option");
  const flutterwaveOption = document.getElementById("flutterwave-option");
  const whatsappOption = document.getElementById("WhatsApp");

  // Reset selection
  selectedPayment = null;
  summaryPlaceOrderBtn.disabled = true;
  summaryPlaceOrderBtn.classList.add("bg-gray-400");
  summaryPlaceOrderBtn.classList.remove("bg-pink-600", "hover:bg-pink-700");

  // Remove highlight and check icons
  document.querySelectorAll("#payment-summary-card .payment-option").forEach(o => {
    o.classList.remove("border-pink-600", "bg-pink-50");
    const icon = o.querySelector(".check-icon");
    if (icon) icon.classList.add("hidden");
  });

  if (isNigeria) {
    paystackOption.classList.remove("hidden");
    paystackOption.style.opacity = "0.4";
    paystackOption.style.pointerEvents = "none";
    paystackOption.title = "Paystack activation pending";
    flutterwaveOption.classList.remove("hidden");
    flutterwaveOption.style.opacity = "";
    flutterwaveOption.style.pointerEvents = "";
    whatsappOption.classList.add("hidden");
  } else {
    paystackOption.classList.add("hidden");
    flutterwaveOption.classList.add("hidden");
    whatsappOption.classList.remove("hidden");
  }
}


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
    if (mobileStickyBar) mobileStickyBar.classList.remove("hidden");
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
    if (mobileStickyBar) mobileStickyBar.classList.add("hidden");
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
const goToCheckout = () => {
  showLoader();
  setTimeout(() => {
    cartContainer.classList.add("hidden");
    if (mobileStickyBar) mobileStickyBar.classList.add("hidden");
    checkoutStep.classList.remove("hidden");
    setActiveBreadcrumb("checkout");
    hideLoader();
  }, 200);
};
checkoutBtn.onclick = goToCheckout;
if (mobileCheckoutBtn) mobileCheckoutBtn.onclick = goToCheckout;

  // ==================== INIT ====================
  startCartListener();
  setTimeout(() => hideLoader(), 5000);
})();