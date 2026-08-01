// ============================================================
// LIQUORBELLE — UTILITY FUNCTIONS (Shared across all pages)
// ============================================================

// ============================================================
// AUTO-UPDATE VERSION CHECK
// ============================================================
(function checkForUpdates() {
  var currentVersion = '20260801';
  var storedVersion = localStorage.getItem('liquorbelle_version');
  
  if (storedVersion !== currentVersion) {
    localStorage.setItem('liquorbelle_version', currentVersion);
    if ('caches' in window) {
      caches.keys().then(function(names) {
        for (var i = 0; i < names.length; i++) {
          if (names[i].includes('liquorbelle')) {
            caches.delete(names[i]);
            console.log('[Utils] Cache deleted:', names[i]);
          }
        }
      });
    }
    console.log('[Utils] Version updated to:', currentVersion);
  }
})();

// ============================================================
// CONFIG
// ============================================================
const API_BASE = 'https://liquorbelle-mpesa-backend.onrender.com';
const CART_KEY = 'liquorbelle_cart';
const WISHLIST_KEY = 'liquorbelle_wishlist';
const FALLBACK_IMG = 'https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_300,c_fit/v1781119164/liqbb_goc41e.png';
const CACHE_KEY = 'liquorbelle_products_cache';
const CACHE_DURATION = 300000;

// ============================================================
// CART + WISHLIST STATE
// ============================================================
var cart = JSON.parse(localStorage.getItem(CART_KEY) || '{}');
var wishlist = JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]');

// ============================================================
// UTILITY FUNCTIONS
// ============================================================
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, function(m) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(email);
}

function validatePhone(phone) {
  var cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10 && (cleaned.startsWith('07') || cleaned.startsWith('01'))) return true;
  if (cleaned.length === 12 && cleaned.startsWith('254')) return true;
  return false;
}

function formatPhoneForAPI(phone) {
  var cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10 && (cleaned.startsWith('07') || cleaned.startsWith('01'))) {
    return '254' + cleaned.slice(1);
  }
  if (cleaned.length === 12 && cleaned.startsWith('254')) {
    return cleaned;
  }
  return cleaned;
}

function formatPhoneForDisplay(phone) {
  var cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 12 && cleaned.startsWith('254')) {
    return '0' + cleaned.slice(3);
  }
  return phone;
}

// ===== TOAST / SNACK (works on both toast and snack elements) =====
function toast(msg, isError) {
  // Try toast element first (used on most pages)
  var t = document.getElementById('toast');
  if (t) {
    t.innerText = msg;
    t.className = 'toast';
    if (isError) t.classList.add('error');
    t.style.opacity = '1';
    clearTimeout(t._timer);
    t._timer = setTimeout(function() { t.style.opacity = '0'; }, 3000);
    return;
  }
  
  // Fallback to snack element (used on checkout page)
  var s = document.getElementById('snack');
  if (s) {
    s.textContent = msg;
    s.className = 'snack show' + (isError ? ' error' : '');
    clearTimeout(s._timeout);
    s._timeout = setTimeout(function() { s.classList.remove('show'); }, 3000);
    return;
  }
  
  // Ultimate fallback - alert
  alert(msg);
}

function getQueryParam(name) {
  var params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function optimizeImage(url, width) {
  if (!url) return '';
  if (!url.includes('cloudinary.com')) return url;
  var parts = url.split('/upload/');
  if (parts.length !== 2) return url;
  var w = width || 300;
  return parts[0] + '/upload/f_auto,q_auto,w_' + w + ',c_fit/' + parts[1];
}

function getResponsiveImage(url) {
  if (!url || typeof url !== 'string') return { src: '', srcset: '', sizes: '' };
  if (!url.includes('cloudinary.com')) return { src: url, srcset: '', sizes: '' };
  var parts = url.split('/upload/');
  if (parts.length !== 2) return { src: url, srcset: '', sizes: '' };
  var publicId = parts[1].replace(/^(f_auto|q_auto|w_\d+|c_\w+|[,\/]+)+/, '');
  var base = parts[0] + '/upload/f_auto,q_auto,fl_progressive,c_fit/';
  return {
    src: base + 'w_400/' + publicId,
    srcset: base + 'w_200/' + publicId + ' 200w, ' + base + 'w_400/' + publicId + ' 400w, ' + base + 'w_600/' + publicId + ' 600w, ' + base + 'w_800/' + publicId + ' 800w',
    sizes: '(max-width: 400px) 200px, (max-width: 800px) 400px, 600px'
  };
}

function renderStars(rating) {
  rating = rating || 0;
  var full = Math.round(rating);
  var html = '<div class="pc-rating">';
  for (var i = 1; i <= 5; i++) {
    html += '<i class="ph' + (i <= full ? '-fill' : '') + ' ph-star"></i>';
  }
  html += '<span>' + rating.toFixed(1) + '</span></div>';
  return html;
}

// ============================================================
// STOCK STATUS HELPER
// ============================================================
function getStockStatus(variants) {
  if (!variants || variants.length === 0) {
    return { status: 'unknown', label: 'Check stock', color: '#6B7280', icon: 'ph-question' };
  }
  
  // Check if any variant is in stock
  var hasInStock = variants.some(function(v) {
    return v.stock === 'inStock' || (!v.stock && v.stockQuantity > 0) || (!v.stock && v.stockQuantity === undefined);
  });
  
  // Check if all variants are out of stock
  var allOutOfStock = variants.every(function(v) {
    return v.stock === 'outOfStock' || (v.stockQuantity !== undefined && v.stockQuantity <= 0);
  });
  
  if (allOutOfStock || !hasInStock) {
    return { status: 'out-of-stock', label: 'Out of Stock', color: '#DC2626', icon: 'ph-x-circle' };
  }
  
  // Check if low stock (some variants with quantity < 5)
  var lowStock = variants.some(function(v) {
    return v.stockQuantity !== undefined && v.stockQuantity > 0 && v.stockQuantity < 5;
  });
  if (lowStock) {
    return { status: 'low-stock', label: 'Low Stock', color: '#F59E0B', icon: 'ph-warning' };
  }
  
  return { status: 'in-stock', label: 'In Stock', color: '#22C55E', icon: 'ph-check-circle' };
}

// ============================================================
// PIN & AUTH HELPERS
// ============================================================

function validatePin(pin) {
  return /^\d{4}$/.test(pin);
}

function getAuthToken() {
  return localStorage.getItem('liquorbelle_token') || null;
}

function isLoggedIn() {
  var token = getAuthToken();
  var user = localStorage.getItem('liquorbelle_user');
  return !!(token && user);
}

function getCurrentUser() {
  try {
    var user = localStorage.getItem('liquorbelle_user');
    return user ? JSON.parse(user) : null;
  } catch (e) {
    return null;
  }
}

function logoutUser() {
  localStorage.removeItem('liquorbelle_user');
  localStorage.removeItem('liquorbelle_token');
  if (window.location.pathname.indexOf('accounts.html') === -1) {
    window.location.href = 'accounts.html';
  } else {
    window.location.reload();
  }
}

function fetchWithAuth(url, options) {
  var token = getAuthToken();
  if (!token) {
    return Promise.reject(new Error('Not authenticated'));
  }
  options = options || {};
  options.headers = options.headers || {};
  options.headers['Content-Type'] = 'application/json';
  options.headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, options);
}

function isTokenExpired(token) {
  if (!token) return true;
  try {
    var payload = token.split('.')[1];
    var decoded = JSON.parse(atob(payload));
    return decoded.exp * 1000 < Date.now();
  } catch (e) {
    return true;
  }
}

function refreshAuthToken(token) {
  return fetch(API_BASE + '/api/auth/refresh-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: token })
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (data.success && data.token) {
      localStorage.setItem('liquorbelle_token', data.token);
      if (data.customer) {
        var user = getCurrentUser() || {};
        user.name = data.customer.name || user.name;
        user.email = data.customer.email || user.email;
        user.phone = data.customer.phone || user.phone;
        localStorage.setItem('liquorbelle_user', JSON.stringify(user));
      }
      return data.token;
    }
    throw new Error('Token refresh failed');
  });
}

// ============================================================
// CHECK USER EXISTS (For Registration Validation)
// ============================================================
async function checkUserExists(name, email, phone) {
  try {
    const response = await fetch(API_BASE + '/api/auth/check-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone })
    });
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Check user error:', error);
    return { exists: false, error: error.message };
  }
}

// ============================================================
// REAL-TIME FIELD VALIDATION WITH EXISTENCE CHECK
// ============================================================
function validateNameInput(input) {
  const errorEl = document.getElementById('regNameError');
  const name = input.value.trim();
  
  if (name.length > 0 && name.length < 2) {
    input.classList.add('error');
    input.classList.remove('valid');
    if (errorEl) {
      errorEl.textContent = 'Name must be at least 2 characters';
      errorEl.classList.add('show');
    }
  } else if (name.length >= 2) {
    input.classList.remove('error');
    input.classList.add('valid');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.remove('show');
    }
  } else {
    input.classList.remove('error', 'valid');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.remove('show');
    }
  }
  updateSubmitButtons();
}

function validatePhoneInput(input) {
  const errorEl = document.getElementById('regPhoneError');
  const phone = input.value.replace(/\D/g, '');
  input.value = phone;
  
  if (phone.length > 0 && phone.length < 10) {
    input.classList.add('error');
    input.classList.remove('valid');
    if (errorEl) {
      errorEl.textContent = 'Phone must be at least 10 digits';
      errorEl.classList.add('show');
    }
  } else if (phone.length >= 10) {
    input.classList.remove('error');
    input.classList.add('valid');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.remove('show');
    }
  } else {
    input.classList.remove('error', 'valid');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.remove('show');
    }
  }
  updateSubmitButtons();
}

function validateEmailInput(input) {
  const errorEl = document.getElementById('regEmailError');
  const email = input.value.trim();
  
  if (email.length > 0 && !isValidEmail(email)) {
    input.classList.add('error');
    input.classList.remove('valid');
    if (errorEl) {
      errorEl.textContent = 'Please enter a valid email address';
      errorEl.classList.add('show');
    }
  } else if (email.length > 0 && isValidEmail(email)) {
    input.classList.remove('error');
    input.classList.add('valid');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.remove('show');
    }
  } else {
    input.classList.remove('error', 'valid');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.remove('show');
    }
  }
  updateSubmitButtons();
}

function validateLoginEmail(input) {
  const errorEl = document.getElementById('loginEmailError');
  const email = input.value.trim();
  
  if (email.length > 0 && !isValidEmail(email)) {
    input.classList.add('error');
    input.classList.remove('valid');
    if (errorEl) {
      errorEl.textContent = 'Please enter a valid email address';
      errorEl.classList.add('show');
    }
  } else if (email.length > 0 && isValidEmail(email)) {
    input.classList.remove('error');
    input.classList.add('valid');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.remove('show');
    }
  } else {
    input.classList.remove('error', 'valid');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.remove('show');
    }
  }
  updateSubmitButtons();
}

function updateSubmitButtons() {
  // This function is also in accounts.html - it's shared across pages
  // If on account page, use the account page's version
  if (document.getElementById('loginSubmitBtn')) {
    // Login button
    const loginEmail = document.getElementById('loginEmail');
    const loginPin = getPinValue ? getPinValue('login') : '';
    const loginBtn = document.getElementById('loginSubmitBtn');
    if (loginBtn && loginEmail) {
      loginBtn.disabled = !(loginEmail.value.length > 0 && isValidEmail(loginEmail.value) && loginPin.length === 4);
    }
  }
  
  if (document.getElementById('registerSubmitBtn')) {
    // Register button
    const regName = document.getElementById('regName');
    const regPhone = document.getElementById('regPhone');
    const regEmail = document.getElementById('regEmail');
    const regPin = getPinValue ? getPinValue('reg') : '';
    const regOtp = document.getElementById('regOtp');
    const regBtn = document.getElementById('registerSubmitBtn');
    if (regBtn && regName && regPhone && regEmail) {
      const nameValid = regName.value.length >= 2;
      const phoneValid = regPhone.value.replace(/\D/g, '').length >= 10;
      const emailValid = regEmail.value.length > 0 && isValidEmail(regEmail.value);
      const pinValid = regPin.length === 4;
      const otpValid = regOtp && regOtp.value.length === 6;
      regBtn.disabled = !(nameValid && phoneValid && emailValid && pinValid && otpValid);
    }
  }
}

// ============================================================
// CART FUNCTIONS
// ============================================================
function getCart() {
  try {
    var stored = localStorage.getItem(CART_KEY);
    if (!stored) return [];
    var data = JSON.parse(stored);
    if (Array.isArray(data)) return data;
    return Object.values(data);
  } catch(e) {
    return [];
  }
}

function getCartTotal(cart) {
  var subtotal = 0;
  for (var i = 0; i < cart.length; i++) {
    var item = cart[i];
    var price = parseFloat(item.price) || 0;
    var qty = parseInt(item.quantity) || parseInt(item.qty) || 1;
    subtotal += price * qty;
  }
  return subtotal;
}

function saveCart(cartArray) {
  try {
    var cartObj = {};
    for (var i = 0; i < cartArray.length; i++) {
      var item = cartArray[i];
      var id = item.id || item._id || 'item_' + i;
      cartObj[id] = {
        id: id,
        name: item.name || 'Product',
        price: parseFloat(item.price) || 0,
        qty: parseInt(item.quantity) || parseInt(item.qty) || 1,
        capacity: item.capacity || item.size || '',
        size: item.size || item.capacity || ''
      };
    }
    localStorage.setItem(CART_KEY, JSON.stringify(cartObj));
  } catch(e) {
    console.error('Error saving cart:', e);
  }
}

function updateCartBadges() {
  var cart = getCart();
  var count = 0;
  for (var i = 0; i < cart.length; i++) {
    var qty = parseInt(cart[i].quantity) || parseInt(cart[i].qty) || 1;
    count += qty;
  }
  var headerBadge = document.getElementById('headerCartCount');
  var navBadge = document.getElementById('navCartCount');
  var drawerBadge = document.getElementById('cartBadgeCount');
  if (headerBadge) headerBadge.textContent = count;
  if (navBadge) navBadge.textContent = count;
  if (drawerBadge) drawerBadge.textContent = count;
}

function updateCartUI() {
  var cart = getCart();
  var count = 0;
  for (var i = 0; i < cart.length; i++) {
    var qty = parseInt(cart[i].quantity) || parseInt(cart[i].qty) || 1;
    count += qty;
  }

  document.querySelectorAll('.header-cart-badge, .nav-badge, #navCartCount, #cartBadgeCount, #headerCartCount').forEach(function(el) {
    if (el) el.innerText = count;
  });

  var container = document.getElementById('cartItemsList');
  var footer = document.getElementById('cartFooter');
  if (!container || !footer) return;

  if (!cart.length) {
    container.innerHTML =
      '<div class="cart-container">' +
      '<div class="cart-icon-wrapper">' +
      '<svg class="cart-svg" viewBox="0 0 24 24" fill="none"><path d="M2 2h3.5l2.6 11h10.3l2.6-8H6.5" stroke="#111111" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="20" r="1.5" fill="#111111"/><circle cx="17" cy="20" r="1.5" fill="#111111"/></svg>' +
      '<span class="cart-badge">0</span>' +
      '</div>' +
      '<h2 class="cart-message">Your cart is empty!</h2>' +
      '<a href="shop.html" class="shop-button">Start Shopping</a>' +
      '</div>';
    footer.style.display = 'none';
    return;
  }

  footer.style.display = 'block';
  var subtotal = 0;
  for (var i = 0; i < cart.length; i++) {
    var item = cart[i];
    var price = parseFloat(item.price) || 0;
    var qty = parseInt(item.quantity) || parseInt(item.qty) || 1;
    subtotal += price * qty;
  }

  var totalEl = document.getElementById('cartTotalAmount');
  if (totalEl) totalEl.innerHTML = 'KES ' + subtotal.toLocaleString();

  container.innerHTML = cart.map(function(item) {
    var id = item.id || item._id;
    var name = item.name || 'Product';
    var qty = parseInt(item.quantity) || parseInt(item.qty) || 1;
    var price = parseFloat(item.price) || 0;
    var itemTotal = price * qty;
    return '<div class="cart-item"><div><div class="cart-item-name">' + escapeHtml(name) +
      ' <span style="color:var(--primary);">x' + qty + '</span></div>' +
      '<div class="cart-item-price">KES ' + itemTotal.toLocaleString() +
      '</div><div class="cart-qty"><button onclick="updateQty(\'' + id + '\',-1)">−</button>' +
      '<span>' + qty + '</span><button onclick="updateQty(\'' + id + '\',1)">+</button>' +
      '<button onclick="removeCartItem(\'' + id + '\')" class="cart-remove-btn">Remove</button></div></div></div>';
  }).join('');
}

function addToCart(id, name, price, capacity) {
  if (cart[id]) {
    cart[id].qty += 1;
  } else {
    cart[id] = { id: id, name: name, price: price, qty: 1, capacity: capacity || '' };
  }
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartUI();
  toast(name + ' added');
}

function removeCartItem(id) {
  if (cart[id]) {
    delete cart[id];
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartUI();
    toast('Item removed');
  }
}

function updateQty(id, delta) {
  if (cart[id]) {
    cart[id].qty += delta;
    if (cart[id].qty <= 0) delete cart[id];
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartUI();
  }
}

function openCartDrawer() {
  var drawer = document.getElementById('cartDrawer');
  var overlay = document.getElementById('cartOverlay');
  if (drawer) drawer.classList.add('open');
  if (overlay) overlay.classList.add('open');
}

function closeCartDrawer() {
  var drawer = document.getElementById('cartDrawer');
  var overlay = document.getElementById('cartOverlay');
  if (drawer) drawer.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
}

// ============================================================
// WISHLIST FUNCTIONS
// ============================================================
function toggleWishlist(id, name, price, image, capacity, btnElement) {
  var idx = wishlist.findIndex(function(w) { return w.id == id; });
  if (idx > -1) {
    wishlist.splice(idx, 1);
    toast('Removed from wishlist');
    if (btnElement) {
      btnElement.classList.remove('wishlisted');
      var icon = btnElement.querySelector('i');
      if (icon) icon.className = 'ph ph-heart';
    }
  } else {
    wishlist.push({ id: id, name: name, price: price, image: image, capacity: capacity });
    toast(name + ' added to wishlist');
    if (btnElement) {
      btnElement.classList.add('wishlisted');
      var icon = btnElement.querySelector('i');
      if (icon) icon.className = 'ph-fill ph-heart';
    }
  }
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
}

function openWishlistModal() {
  var container = document.getElementById('wishlistItems');
  if (!container) return;
  if (!wishlist.length) {
    container.innerHTML = '<div class="wishlist-empty"><i class="ph ph-heart" style="font-size:40px;display:block;margin-bottom:12px;"></i>No items in your wishlist yet.</div>';
  } else {
    container.innerHTML = wishlist.map(function(w) {
      var imgSrc = w.image ? optimizeImage(w.image, 100) : FALLBACK_IMG;
      return '<div class="wishlist-item"><img src="' + imgSrc + '" onerror="this.src=\'' + FALLBACK_IMG + '\'" loading="lazy">' +
        '<div class="wishlist-item-info"><div class="wishlist-item-name">' + escapeHtml(w.name) +
        '</div><div class="wishlist-item-price">KES ' + w.price.toLocaleString() +
        '</div></div><button class="wishlist-atc" onclick="addToCart(\'' + w.id + '\',\'' +
        escapeHtml(w.name).replace(/'/g, "\\'") + '\',' + w.price + ',\'' + (w.capacity || '') +
        '\');closeWishlistModal();">Add</button></div>';
    }).join('');
  }
  var modal = document.getElementById('wishlistModal');
  if (modal) modal.style.display = 'flex';
}

function closeWishlistModal() {
  var modal = document.getElementById('wishlistModal');
  if (modal) modal.style.display = 'none';
}

// ============================================================
// ACCOUNT & NAVIGATION HELPERS
// ============================================================
function handleAccountClick() {
  var user = getCurrentUser();
  if (user && user.name) {
    window.location.href = 'profile.html';
  } else {
    window.location.href = 'accounts.html';
  }
}

function updateBottomNav() {
  var user = getCurrentUser();
  var accountBtn = document.getElementById('bottomNavAccount');
  var accountLabel = document.getElementById('bottomNavAccountLabel');
  var profileLink = document.getElementById('mobileMenuProfile');
  
  if (accountBtn && accountLabel) {
    if (user && user.name) {
      accountLabel.textContent = 'Profile';
      accountBtn.onclick = function() {
        window.location.href = 'profile.html';
      };
    } else {
      accountLabel.textContent = 'Account';
      accountBtn.onclick = function() {
        window.location.href = 'accounts.html';
      };
    }
  }
  
  if (profileLink) {
    if (user && user.name) {
      profileLink.style.display = 'flex';
    } else {
      profileLink.style.display = 'none';
    }
  }
}

function updateMobileMenuAuth() {
  var user = getCurrentUser();
  var authSection = document.getElementById('mobileMenuAuth');
  if (!authSection) return;
  
  if (user && user.name) {
    authSection.innerHTML = `
      <div style="padding:8px 20px 14px;border-bottom:1px solid var(--border);margin-bottom:4px;">
        <div style="font-weight:700;font-size:.95rem;color:var(--text);">${escapeHtml(user.name)}</div>
        <div style="font-size:.75rem;color:var(--muted);">${escapeHtml(user.email || '')}</div>
        <button onclick="logoutUser();closeMobileMenu();" style="margin-top:8px;padding:6px 16px;background:var(--sale-red);color:white;border:none;border-radius:30px;font-weight:600;font-size:.7rem;cursor:pointer;width:100%;">
          <i class="ph ph-sign-out"></i> Logout
        </button>
      </div>
    `;
  } else {
    authSection.innerHTML = `
      <a href="accounts.html" style="display:flex;align-items:center;gap:12px;padding:13px 20px;font-weight:600;font-size:.9rem;color:var(--text);text-decoration:none;border-bottom:1px solid var(--border);margin-bottom:4px;">
        <i class="ph ph-sign-in" style="font-size:19px;color:var(--gold);width:20px;"></i> Login / Register
      </a>
    `;
  }
}

function updateUserBadge() {
  var user = getCurrentUser();
  var dotEl = document.getElementById('userDot');
  var menuAuth = document.getElementById('mobileMenuAuth');

  if (user && user.name) {
    if (dotEl) { dotEl.className = 'user-dot'; }
    if (menuAuth) {
      menuAuth.innerHTML = `
        <div style="padding:8px 20px 12px;border-bottom:1px solid var(--border);margin-bottom:4px;">
          <div style="font-weight:700;font-size:.85rem;color:var(--primary);">
            <i class="ph ph-user-circle"></i> ${escapeHtml(user.name)}
          </div>
          <div style="font-size:.65rem;color:var(--muted);">${escapeHtml(user.email || 'No email')}</div>
          <button onclick="logoutUser()" style="margin-top:4px;padding:4px 12px;background:var(--sale-red);color:white;border:none;border-radius:40px;font-size:.65rem;font-weight:600;cursor:pointer;">
            <i class="ph ph-sign-out"></i> Logout
          </button>
        </div>
      `;
    }
  } else {
    if (dotEl) { dotEl.className = 'user-dot guest'; }
    if (menuAuth) {
      menuAuth.innerHTML = `
        <a href="accounts.html" style="display:flex;align-items:center;gap:12px;padding:13px 20px;color:var(--text);font-weight:600;font-size:.9rem;text-decoration:none;border-bottom:1px solid var(--border);margin-bottom:4px;">
          <i class="ph ph-user-circle"></i> Login / Register
        </a>
      `;
    }
  }
}

function openMobileMenu() {
  var overlay = document.getElementById('mobileMenuOverlay');
  var menu = document.getElementById('mobileMenu');
  if (overlay) overlay.classList.add('open');
  if (menu) menu.classList.add('open');
}

function closeMobileMenu() {
  var overlay = document.getElementById('mobileMenuOverlay');
  var menu = document.getElementById('mobileMenu');
  if (overlay) overlay.classList.remove('open');
  if (menu) menu.classList.remove('open');
}

function handleHeaderSearch(e) {
  e.preventDefault();
  var q = document.getElementById('headerSearchInput');
  if (q) {
    var val = q.value.trim();
    if (val) window.location.href = 'shop.html?search=' + encodeURIComponent(val);
  }
  return false;
}

// ============================================================
// OFFLINE DETECTION
// ============================================================
window.addEventListener('online', function() {
  var banner = document.getElementById('offlineBanner');
  if (banner) banner.classList.remove('show');
});
window.addEventListener('offline', function() {
  var banner = document.getElementById('offlineBanner');
  if (banner) banner.classList.add('show');
});

// ============================================================
// SCROLL TO TOP
// ============================================================
window.addEventListener('scroll', function() {
  var btn = document.getElementById('scrollTopBtn');
  if (!btn) return;
  if (window.scrollY > 300) btn.classList.add('show');
  else btn.classList.remove('show');
}, { passive: true });

// ============================================================
// SESSION MANAGEMENT - Auto-logout after 30 minutes
// ============================================================
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

function checkSession() {
  const user = localStorage.getItem('liquorbelle_user');
  const token = localStorage.getItem('liquorbelle_token');
  const loginTime = localStorage.getItem('liquorbelle_login_time');

  if (!user || !token) return;

  if (loginTime) {
    const elapsed = Date.now() - parseInt(loginTime);
    if (elapsed > SESSION_TIMEOUT) {
      localStorage.removeItem('liquorbelle_user');
      localStorage.removeItem('liquorbelle_token');
      localStorage.removeItem('liquorbelle_login_time');
      
      // Redirect to login with expired message
      if (!window.location.pathname.includes('accounts.html') && 
          !window.location.pathname.includes('login.html') &&
          !window.location.pathname.includes('signup.html')) {
        window.location.href = 'accounts.html?session=expired';
      }
      return;
    }
    
    // Welcome back message on homepage
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
      try {
        const userData = JSON.parse(user);
        const name = userData.name || 'Customer';
        toast('Welcome back, ' + name + '! 👋');
      } catch(e) {}
    }
  }
}

// Refresh session timer on user activity
document.addEventListener('click', function() {
  const loginTime = localStorage.getItem('liquorbelle_login_time');
  if (loginTime) {
    localStorage.setItem('liquorbelle_login_time', Date.now().toString());
  }
});

// Run session check on every page load
document.addEventListener('DOMContentLoaded', function() {
  checkSession();
});

// ============================================================
// CLEAR SITE CACHE - FORCE REFRESH (Shared globally)
// ============================================================
function clearSiteCache() {
  // Show loading state
  if (typeof toast === 'function') {
    toast('🧹 Clearing cache...', 'info');
  }
  
  // Clear service workers
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for (var i = 0; i < registrations.length; i++) {
        registrations[i].unregister();
        console.log('[Clear] SW unregistered');
      }
    }).catch(function(e) { console.warn('[Clear] SW error:', e); });
  }
  
  // Clear localStorage
  try {
    localStorage.clear();
    console.log('[Clear] localStorage cleared');
  } catch(e) {}
  
  // Clear sessionStorage
  try {
    sessionStorage.clear();
    console.log('[Clear] sessionStorage cleared');
  } catch(e) {}
  
  // Clear Cache API
  if ('caches' in window) {
    caches.keys().then(function(names) {
      for (var i = 0; i < names.length; i++) {
        caches.delete(names[i]);
        console.log('[Clear] Cache deleted:', names[i]);
      }
    }).catch(function(e) { console.warn('[Clear] Cache error:', e); });
  }
  
  // Force reload with cache bust
  setTimeout(function() {
    window.location.reload(true);
  }, 600);
}

// Expose globally
window.clearSiteCache = clearSiteCache;

console.log('✅ Utils loaded');