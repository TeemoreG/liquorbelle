// ============================================================
// LIQUORBELLE — MASTER APP.JS (ENHANCED)
// All functions exposed to global scope for inline event handlers
// ============================================================

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
// UTILITY FUNCTIONS
// ============================================================
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, function(m) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
  });
}

function toast(msg, isError) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.innerText = msg;
  t.className = 'toast';
  if (isError) t.classList.add('error');
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(function() { t.style.opacity = '0'; }, 3000);
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
    const inStock = variants.some(v => {
        return v.stock === 'inStock' || (!v.stock && v.stockQuantity > 0) || (!v.stock && v.stockQuantity === undefined);
    });
    
    // Check if all variants are out of stock
    const allOutOfStock = variants.every(v => v.stock === 'outOfStock' || (v.stockQuantity !== undefined && v.stockQuantity <= 0));
    
    if (allOutOfStock || !inStock) {
        return { status: 'out-of-stock', label: 'Out of Stock', color: '#DC2626', icon: 'ph-x-circle' };
    }
    
    // Check if low stock (some variants with quantity < 5)
    const lowStock = variants.some(v => v.stockQuantity !== undefined && v.stockQuantity > 0 && v.stockQuantity < 5);
    if (lowStock) {
        return { status: 'low-stock', label: 'Low Stock', color: '#F59E0B', icon: 'ph-warning' };
    }
    
    return { status: 'in-stock', label: 'In Stock', color: '#22C55E', icon: 'ph-check-circle' };
}

// ============================================================
// DEBOUNCE HELPER
// ============================================================
function debounce(func, wait) {
  var timeout;
  return function executedFunction() {
    var context = this;
    var args = arguments;
    var later = function() {
      timeout = null;
      func.apply(context, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
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
// LOGIN & REGISTER FUNCTIONS
// ============================================================

/**
 * Register a new user
 * @param {string} name - Full name
 * @param {string} email - Email address
 * @param {string} phone - Phone number
 * @param {string} pin - 4-digit PIN
 * @param {string} otp - 6-digit OTP
 * @returns {Promise} Registration response
 */
function registerUser(name, email, phone, pin, otp) {
  return fetch(API_BASE + '/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: name,
      email: email,
      phone: phone,
      pin: pin,
      otp: otp
    })
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (data.success) {
      // Auto-login after registration
      if (data.token) {
        localStorage.setItem('liquorbelle_token', data.token);
        localStorage.setItem('liquorbelle_user', JSON.stringify({
          id: data.customer.id,
          email: data.customer.email,
          name: data.customer.name,
          phone: data.customer.phone
        }));
      }
      return data;
    }
    throw new Error(data.message || 'Registration failed');
  });
}

/**
 * Login existing user with email + PIN
 * @param {string} email - Email address
 * @param {string} pin - 4-digit PIN
 * @returns {Promise} Login response
 */
function loginUser(email, pin) {
  // Show loading state if there's a login button
  var loginBtn = document.getElementById('loginBtn');
  var originalText = '';
  if (loginBtn) {
    originalText = loginBtn.textContent;
    loginBtn.textContent = '⏳ Checking email...';
    loginBtn.disabled = true;
  }

  // STEP 1: First check if email exists
  return fetch(API_BASE + '/api/auth/check-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email })
  })
  .then(function(res) { return res.json(); })
  .then(function(emailCheck) {
    // If email doesn't exist
    if (!emailCheck.exists) {
      if (loginBtn) {
        loginBtn.textContent = originalText;
        loginBtn.disabled = false;
      }
      var error = new Error('❌ Email not registered. Please create an account first.');
      error.type = 'email_not_found';
      if (typeof toast === 'function') toast(error.message, true);
      throw error;
    }

    // STEP 2: Email exists, now check PIN
    if (loginBtn) {
      loginBtn.textContent = '⏳ Verifying PIN...';
    }

    return fetch(API_BASE + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        pin: pin
      })
    })
    .then(function(res) { 
      return res.json().then(function(data) {
        return { status: res.status, data: data };
      });
    });
  })
  .then(function(result) {
    // Restore login button
    if (loginBtn) {
      loginBtn.textContent = originalText;
      loginBtn.disabled = false;
    }

    var data = result.data;
    var status = result.status;

    // Success case - email exists and PIN is correct
    if (data.success && status === 200) {
      localStorage.setItem('liquorbelle_token', data.token);
      localStorage.setItem('liquorbelle_user', JSON.stringify({
        id: data.customer.id,
        email: data.customer.email,
        name: data.customer.name,
        phone: data.customer.phone
      }));
      
      // Update UI
      if (typeof updateUserBadge === 'function') updateUserBadge();
      if (typeof toast === 'function') toast('✅ Welcome back, ' + data.customer.name + '!');
      
      return data;
    }

    // PIN is incorrect
    if (status === 401 || (data.message && data.message.toLowerCase().includes('invalid pin'))) {
      var error = new Error('❌ Incorrect PIN. Please try again.');
      error.type = 'wrong_pin';
      if (typeof toast === 'function') toast(error.message, true);
      throw error;
    }
    else if (status === 400 && data.message && data.message.toLowerCase().includes('pin')) {
      var error = new Error('❌ PIN must be exactly 4 digits.');
      error.type = 'invalid_pin_format';
      if (typeof toast === 'function') toast(error.message, true);
      throw error;
    }
    else {
      throw new Error(data.message || '❌ Login failed. Please try again.');
    }
  })
  .catch(function(error) {
    // Restore login button on error
    if (loginBtn) {
      loginBtn.textContent = originalText;
      loginBtn.disabled = false;
    }
    
    // Show toast message if not already shown
    if (error.type !== 'email_not_found' && error.type !== 'wrong_pin' && error.type !== 'invalid_pin_format') {
      if (typeof toast === 'function') {
        toast(error.message || '❌ Login failed. Please try again.', true);
      }
    }
    
    throw error;
  });
}

/**
 * Send OTP to email for registration
 * @param {string} email - Email address
 * @returns {Promise} OTP response
 */
function sendRegisterOtp(email) {
  return fetch(API_BASE + '/api/auth/send-email-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email })
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (!data.success) {
      throw new Error(data.message || 'Failed to send OTP');
    }
    return data;
  });
}

/**
 * Send OTP for forgot PIN
 * @param {string} email - Email address
 * @returns {Promise} OTP response
 */
function sendForgotPinOtp(email) {
  return fetch(API_BASE + '/api/auth/forgot-pin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email })
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (!data.success) {
      throw new Error(data.message || 'Failed to send OTP');
    }
    return data;
  });
}

/**
 * Reset PIN using OTP
 * @param {string} email - Email address
 * @param {string} otp - 6-digit OTP
 * @param {string} newPin - New 4-digit PIN
 * @returns {Promise} Reset response
 */
function resetPin(email, otp, newPin) {
  return fetch(API_BASE + '/api/auth/reset-pin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email,
      otp: otp,
      newPin: newPin
    })
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (!data.success) {
      throw new Error(data.message || 'Failed to reset PIN');
    }
    return data;
  });
}

/**
 * Validate current session token
 * @returns {Promise} Validation response
 */
function validateSession() {
  var token = getAuthToken();
  if (!token) {
    return Promise.resolve({ valid: false });
  }
  
  return fetch(API_BASE + '/api/auth/validate', {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + token
    }
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (!data.valid) {
      localStorage.removeItem('liquorbelle_token');
      localStorage.removeItem('liquorbelle_user');
    }
    return data;
  })
  .catch(function() {
    return { valid: false };
  });
}

// ============================================================
// USER BADGE (Shared)
// ============================================================
window.updateUserBadge = function() {
  var user = getCurrentUser();
  var initialEl = document.getElementById('userInitial');
  var dotEl = document.getElementById('userDot');
  var menuAuth = document.getElementById('mobileMenuAuth');

  if (user && user.name) {
    var initial = user.name.charAt(0).toUpperCase();
    if (initialEl) initialEl.textContent = initial;
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
    if (initialEl) initialEl.textContent = '';
    if (dotEl) { dotEl.className = 'user-dot guest'; }
    // ===== GUEST SECTION - REMOVED =====
    if (menuAuth) {
      menuAuth.innerHTML = '';  // ← Empty - NO Guest section
    }
  }
};

// ============================================================
// BOTTOM NAV & MOBILE MENU AUTH (GLOBAL - USED BY ALL PAGES)
// ============================================================

window.updateBottomNav = function() {
  // ===== HIGHLIGHT ACTIVE PAGE (Simple Version) =====
  var currentPath = window.location.pathname;
  
  // Remove all active classes first
  document.querySelectorAll('.nav-item').forEach(function(el) {
    el.classList.remove('active');
  });
  
  // Add active class based on current page
  if (currentPath.endsWith('index.html') || currentPath === '/' || currentPath.endsWith('/')) {
    var homeBtn = document.querySelector('.nav-item[onclick*="index.html"]');
    if (homeBtn) homeBtn.classList.add('active');
  } else if (currentPath.endsWith('shop.html')) {
    var shopBtn = document.querySelector('.nav-item[onclick*="shop.html"]');
    if (shopBtn) shopBtn.classList.add('active');
  } else if (currentPath.endsWith('accounts.html') || currentPath.endsWith('profile.html')) {
    var accountBtn = document.getElementById('bottomNavAccount');
    if (accountBtn) accountBtn.classList.add('active');
  }

  var user = getCurrentUser();
  var accountBtn = document.getElementById('bottomNavAccount');
  var accountLabel = document.getElementById('bottomNavAccountLabel');
  var profileLink = document.getElementById('mobileMenuProfile');
  
  // Update bottom nav
  if (accountBtn && accountLabel) {
    if (user && user.name) {
      accountLabel.textContent = 'Profile';
      accountBtn.setAttribute('onclick', "window.location.href='profile.html'");
    } else {
      accountLabel.textContent = 'Account';
      accountBtn.setAttribute('onclick', "window.location.href='accounts.html'");
    }
  }
  
  // Update mobile menu - hide/show "My Profile"
  if (profileLink) {
    profileLink.style.display = (user && user.name) ? 'flex' : 'none';
  }
  
  // Also update header user badge if present
  var userInitial = document.getElementById('userInitial');
  if (userInitial) {
    if (user && user.name) {
      userInitial.textContent = user.name.charAt(0).toUpperCase();
    } else {
      userInitial.textContent = 'G';
    }
  }
  
  // Update cart badge in bottom nav
  var cartItems = Object.values(cart);
  var count = cartItems.reduce(function(s, i) { return s + i.qty; }, 0);
  var badge = document.getElementById('navCartCount');
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
};

window.updateMobileMenuAuth = function() {
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
};

// ============================================================
// CART (Shared) - EXPOSED GLOBALLY
// ============================================================
var cart = JSON.parse(localStorage.getItem(CART_KEY) || '{}');

window.updateCartUI = function() {
  var items = Object.values(cart);
  var count = items.reduce(function(s, i) { return s + i.qty; }, 0);

  document.querySelectorAll('.header-cart-badge, .nav-badge, #navCartCount, #cartBadgeCount, #headerCartCount').forEach(function(el) {
    if (el) el.innerText = count;
  });

  var container = document.getElementById('cartItemsList');
  var footer = document.getElementById('cartFooter');
  if (!container || !footer) return;

  if (!items.length) {
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
  var subtotal = items.reduce(function(s, i) { return s + i.price * i.qty; }, 0);

  var totalEl = document.getElementById('cartTotalAmount');
  if (totalEl) totalEl.innerHTML = 'KES ' + subtotal.toLocaleString();

  container.innerHTML = items.map(function(item) {
    return '<div class="cart-item"><div><div class="cart-item-name">' + escapeHtml(item.name) +
      ' <span style="color:var(--primary);">x' + item.qty + '</span></div>' +
      '<div class="cart-item-price">KES ' + (item.price * item.qty).toLocaleString() +
      '</div><div class="cart-qty"><button onclick="updateQty(\'' + item.id + '\',-1)">−</button>' +
      '<span>' + item.qty + '</span><button onclick="updateQty(\'' + item.id + '\',1)">+</button>' +
      '<button onclick="removeCartItem(\'' + item.id + '\')" class="cart-remove-btn">Remove</button></div></div></div>';
  }).join('');
};

window.addToCart = function(id, name, price, capacity) {
  if (cart[id]) {
    cart[id].qty += 1;
  } else {
    cart[id] = { id: id, name: name, price: price, qty: 1, capacity: capacity || '' };
  }
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartUI();
  toast(name + ' added');
};

window.removeCartItem = function(id) {
  if (cart[id]) {
    delete cart[id];
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartUI();
    toast('Item removed');
  }
};

window.updateQty = function(id, delta) {
  if (cart[id]) {
    cart[id].qty += delta;
    if (cart[id].qty <= 0) delete cart[id];
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartUI();
  }
};

window.openCartDrawer = function() {
  var drawer = document.getElementById('cartDrawer');
  var overlay = document.getElementById('cartOverlay');
  if (drawer) drawer.classList.add('open');
  if (overlay) overlay.classList.add('open');
};

window.closeCartDrawer = function() {
  var drawer = document.getElementById('cartDrawer');
  var overlay = document.getElementById('cartOverlay');
  if (drawer) drawer.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
};

// ============================================================
// WISHLIST (Shared) - EXPOSED GLOBALLY
// ============================================================
var wishlist = JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]');

window.toggleWishlist = function(id, name, price, image, capacity, btnElement) {
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
};

window.openWishlistModal = function() {
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
};

window.closeWishlistModal = function() {
  var modal = document.getElementById('wishlistModal');
  if (modal) modal.style.display = 'none';
};

// ============================================================
// OFFLINE DETECTION (Shared)
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
// SCROLL TO TOP (Shared)
// ============================================================
window.addEventListener('scroll', function() {
  var btn = document.getElementById('scrollTopBtn');
  if (!btn) return;
  if (window.scrollY > 300) btn.classList.add('show');
  else btn.classList.remove('show');
}, { passive: true });

// ============================================================
// INDEX.HTML
// ============================================================
if (document.getElementById('categoryGrid')) {
  // Age Gate
  (function initAgeGate() {
    var ageGate = document.getElementById('ageGate');
    var ageYesBtn = document.getElementById('ageYesBtn');
    var ageNoBtn = document.getElementById('ageNoBtn');
    if (localStorage.getItem('lb_age_confirmed') === 'true') {
      if (ageGate) { ageGate.classList.remove('active');
        ageGate.style.display = 'none'; }
      document.body.style.overflow = 'auto';
      return;
    }
    if (ageGate) {
      ageGate.style.display = 'flex';
      setTimeout(function() { ageGate.classList.add('active'); }, 10);
      document.body.style.overflow = 'hidden';
    }
    if (ageYesBtn) {
      ageYesBtn.onclick = function() {
        localStorage.setItem('lb_age_confirmed', 'true');
        if (ageGate) {
          ageGate.classList.remove('active');
          setTimeout(function() { ageGate.style.display = 'none';
            document.body.style.overflow = 'auto'; }, 500);
        }
      };
    }
    if (ageNoBtn) {
      ageNoBtn.onclick = function() {
        document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:Inter,sans-serif;color:#800000;font-size:1.1rem;padding:20px;text-align:center;background:white;">Sorry, you must be 18 or older to visit this site.</div>';
      };
    }
  })();

  // ===== CATEGORIES - ALL 18 =====
  var categories = [
    { name: "All", cat: "all", image: "https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1781861620/360_F_1968789415_ryoi6Go4jg91plfDJTcIIjSWJoQebHb5_ftjnxo.jpg" },
    // ===== NEW CATEGORIES (ADDED) =====
    { name: "Whisky", cat: "whisky", image: "https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1782048542/ARZLR-0_rmmte9.jpg" },
    { name: "Wine", cat: "wine", image: "https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1782048744/Most-popular-beers-in-Kenya-Guinness_a2ggz6.jpg" },
    { name: "Vodka", cat: "vodka", image: "https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1781861620/360_F_1968789415_ryoi6Go4jg91plfDJTcIIjSWJoQebHb5_ftjnxo.jpg" },
    { name: "Gin", cat: "gin", image: "https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1782048367/CHCAS-0_w3c0de.jpg" },
    { name: "Cognac", cat: "cognac", image: "https://res.cloudinary.com/dvqjgbdhp/image/upload/v1782318392/ej-vs-brandy__24539.1752495285.1280.1280__71304.1_bvxpwn.jpg" },
    { name: "Creams", cat: "cream", image: "https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1782318741/What-Is-Drambuie-FT-BLOG0823-a15766cd40da434a8145fe33552e5a9c_i0h8wg.jpg" },
    // ===== EXISTING CATEGORIES =====
    { name: "Beer", cat: "beer", image: "https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1782048744/Most-popular-beers-in-Kenya-Guinness_a2ggz6.jpg" },
    { name: "Brandy", cat: "brandy", image: "https://res.cloudinary.com/dvqjgbdhp/image/upload/v1782318392/ej-vs-brandy__24539.1752495285.1280.1280__71304.1_bvxpwn.jpg" },
    { name: "Bourbon", cat: "bourbon", image: "https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1782318444/a72b554e-5c0b-4ac3-8a66-bdbbf931453c.3c0dcb1f945848aa6629090c307ae781_ksa4md.jpg" },
    { name: "Rum", cat: "rum", image: "https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1782048542/ARZLR-0_rmmte9.jpg" },
    { name: "Spirits", cat: "spirits", image: "https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1782048367/CHCAS-0_w3c0de.jpg" },
    { name: "Liqueur", cat: "liqueur", image: "https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1782318741/What-Is-Drambuie-FT-BLOG0823-a15766cd40da434a8145fe33552e5a9c_i0h8wg.jpg" },
    { name: "Juice", cat: "juice", image: "https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1782318835/Cold_Tea_in_Kenya_600x600_q0ik5i.jpg" },
    { name: "Soda", cat: "soda", image: "https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1782319077/soda_kzknqb.jpg" },
    { name: "Water", cat: "water", image: "https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1782319248/keringet-still-water_fykbf3.jpg" },
    { name: "Energy Drink", cat: "energy", image: "https://res.cloudinary.com/dvqjgbdhp/image/upload/v1782476528/Red-Bull-Energy-Drink-80mg-Caffeine-8-4-fl-oz-Can_c9e445f3-1800-40d0-81ab-6b93a9aaacb3.d2f8d87c58e8287c26cae8b3b6d9e38a_snc71g.jpg" },
    { name: "Cigar", cat: "cigar", image: "https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1782319403/Scene2_fgsgg1.webp" },
    { name: "Accessory", cat: "accessory", image: "https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1782319473/51PDVK6sQzL._AC_UF1000_1000_QL80__cn0azd.jpg" }
  ];

  window.renderCategories = function() {
    var container = document.getElementById('categoryGrid');
    if (!container) return;
    container.innerHTML = categories.map(function(cat) {
      return '<a href="shop.html?cat=' + cat.cat + '" class="cat-card"><img class="cat-img" src="' + cat.image + '" alt="' + cat.name + '" loading="lazy"><span>' + cat.name + '</span></a>';
    }).join('');
  };

  window.populateCategoryDropdown = function(selectId) {
    var select = document.getElementById(selectId);
    if (!select) return;
    var dropdownCats = [
      { id: 'whisky', label: 'Whisky' }, { id: 'wine', label: 'Wine' },
      { id: 'vodka', label: 'Vodka' }, { id: 'gin', label: 'Gin' },
      { id: 'cognac', label: 'Cognac' }, { id: 'cream', label: 'Creams' },
      { id: 'beer', label: 'Beer' }, { id: 'brandy', label: 'Brandy' },
      { id: 'bourbon', label: 'Bourbon' }, { id: 'rum', label: 'Rum' },
      { id: 'spirits', label: 'Spirits' }, { id: 'liqueur', label: 'Liqueur' },
      { id: 'juice', label: 'Juice' }, { id: 'soda', label: 'Soda' },
      { id: 'water', label: 'Water' }, { id: 'energy', label: 'Energy Drink' },
      { id: 'cigar', label: 'Cigar' }, { id: 'accessory', label: 'Accessory' }
    ];
    dropdownCats.forEach(function(cat) {
      var option = document.createElement('option');
      option.value = cat.id;
      option.textContent = cat.label;
      select.appendChild(option);
    });
  };

  var allProductsCache = [];

  // ============================================================
  // USER GREETING ON INDEX PAGE
  // ============================================================
  (function showUserGreeting() {
    var user = getCurrentUser();
    if (user && user.name) {
      var heroOverlay = document.querySelector('.hero-overlay');
      if (heroOverlay) {
        var greetingEl = document.createElement('div');
        greetingEl.style.cssText = 'background:rgba(255,255,255,0.15);padding:8px 20px;border-radius:50px;display:inline-block;margin-bottom:12px;color:white;font-weight:600;font-size:.9rem;backdrop-filter:blur(4px);border:1px solid rgba(255,255,255,0.2);';
        greetingEl.innerHTML = '👋 Welcome back, ' + escapeHtml(user.name) + '!';
        heroOverlay.prepend(greetingEl);
      }
    }
  })();

  // ============================================================
  // SESSION CHECK
  // ============================================================
  (function checkSession() {
    var user = getCurrentUser();
    var token = getAuthToken();
    if (user && token) {
      if (typeof updateUserBadge === 'function') updateUserBadge();
    } else {
      localStorage.removeItem('liquorbelle_token');
      localStorage.removeItem('liquorbelle_user');
      if (typeof updateUserBadge === 'function') updateUserBadge();
    }
  })();

  // ============================================================
  // renderProductCard WITH STOCK STATUS
  // ============================================================
  function renderProductCard(p, index) {
    var imgData = getResponsiveImage(p.image);
    var price = p.variants && p.variants.length ? p.variants[0].price : 0;
    var capacity = p.variants && p.variants.length ? p.variants[0].size : '';
    var ratingHtml = p.rating ? renderStars(p.rating) : '';
    var loadingAttr = index < 12 ? 'loading="eager"' : 'loading="lazy"';
    var fetchPriority = index < 8 ? 'fetchpriority="high"' : '';

    // ===== STOCK STATUS =====
    var stockInfo = getStockStatus(p.variants);
    var isInStock = stockInfo.status === 'in-stock' || stockInfo.status === 'low-stock';
    var stockBadge = '<div class="stock-badge ' + stockInfo.status + '"><i class="ph ' + stockInfo.icon + '"></i> ' + stockInfo.label + '</div>';

    // ===== ADD TO CART BUTTON =====
    var atcHtml = isInStock ? 
      '<button class="atc-btn" onclick="event.stopPropagation();addToCart(\'' + p._id + '\',\'' + escapeHtml(p.name).replace(/'/g, "\\'") + '\',' + price + ',\'' + escapeHtml(capacity) + '\')"><i class="ph ph-plus"></i> Add</button>' :
      '<button class="atc-btn out-of-stock" disabled><i class="ph ph-x-circle"></i> Out of Stock</button>';

    return '<div class="prod-card" data-product-id="' + String(p._id) + '">' +
      '<div class="pc-img-wrap">' +
      (imgData.src ? '<img class="pc-img" src="' + imgData.src + '" srcset="' + imgData.srcset + '" sizes="' + imgData.sizes + '" alt="' + escapeHtml(p.name) + '" ' + loadingAttr + ' ' + fetchPriority + ' decoding="async" onerror="this.src=\'' + FALLBACK_IMG + '\'">' : '') +
      (p.isTrending ? '<span class="badge-new"> Trending</span>' : '') +
      stockBadge +
      '</div>' +
      '<div class="pc-body">' +
      '<div class="pc-name">' + escapeHtml(p.name) + '</div>' +
      (capacity ? '<div class="pc-vol">' + escapeHtml(capacity) + '</div>' : '') +
      ratingHtml +
      '<div class="pc-price-wrap"><span class="pc-price-new">KES ' + price.toLocaleString() + '</span></div>' +
      atcHtml +
      '</div></div>';
  }

  function renderSkeletons(count, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var skeletons = '';
    for (var i = 0; i < count; i++) {
      skeletons += '<div class="skeleton-card"><div class="skeleton-img"></div><div class="skeleton-text"></div><div class="skeleton-text short"></div><div class="skeleton-btn"></div></div>';
    }
    container.innerHTML = skeletons;
  }

  function renderProductSection(products, containerId, limit) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var items = products.slice(0, limit || 8);
    if (!items.length) {
      container.innerHTML = '<div class="empty-state"><i class="ph ph-package"></i><p>No products available</p></div>';
      return;
    }
    allProductsCache = products;
    container.innerHTML = items.map(function(p, idx) { return renderProductCard(p, idx); }).join('');
  }

  window.loadProductsForIndex = function() {
    var featuredGrid = document.getElementById('featuredGrid');
    var trendingGrid = document.getElementById('trendingGrid');
    var newArrivalsGrid = document.getElementById('newArrivalsGrid');

    if (!featuredGrid || !trendingGrid || !newArrivalsGrid) return;

    renderSkeletons(4, 'newArrivalsGrid');
    renderSkeletons(4, 'trendingGrid');
    renderSkeletons(4, 'featuredGrid');

    var controller = new AbortController();
    var timeoutId = setTimeout(function() { controller.abort(); }, 12000);

    fetch(API_BASE + '/api/db/products', { signal: controller.signal })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        clearTimeout(timeoutId);
        if (data.success && data.products) {
          var products = data.products;
          var trending = products.filter(function(p) { return p.isTrending === true; });
          var featured = products.slice(0, 8);
          var newArrivals = products.filter(function(p) { return p.isNew === true; });
          renderProductSection(newArrivals.length ? newArrivals : products.slice(0, 8), 'newArrivalsGrid', 8);
          renderProductSection(trending.length ? trending : products, 'trendingGrid', 8);
          renderProductSection(featured, 'featuredGrid', 8);
        } else {
          var msg = '<div class="empty-state"><i class="ph ph-clock"></i><h3>Loading products</h3><p>Products will appear here shortly.</p></div>';
          newArrivalsGrid.innerHTML = msg;
          trendingGrid.innerHTML = msg;
          featuredGrid.innerHTML = msg;
        }
      })
      .catch(function(err) {
        clearTimeout(timeoutId);
        console.error('Error loading products:', err);
        var msg = '<div class="empty-state"><i class="ph ph-wifi-slash"></i><h3>Connection Error</h3><p>Could not load products. <button onclick="loadProductsForIndex()" style="background:var(--primary);color:white;border:none;padding:6px 16px;border-radius:50px;font-weight:700;cursor:pointer;">Retry</button></p></div>';
        newArrivalsGrid.innerHTML = msg;
        trendingGrid.innerHTML = msg;
        featuredGrid.innerHTML = msg;
      });
  };

  // ============================================================
  // QUICK VIEW
  // ============================================================
  var qvProduct = null;
  var qvSelectedVariant = null;
  var qvQuantity = 1;

  window.quickViewById = function(id) {
    var idStr = String(id);
    var product = allProductsCache.find(function(p) { return String(p._id) === idStr; });
    if (product) {
      qvShowProduct(product);
      return;
    }

    var overlay = document.getElementById('quickviewOverlay');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    document.getElementById('qvName').innerText = 'Loading...';
    document.getElementById('qvCategory').innerText = '';
    document.getElementById('qvImage').src = '';
    document.getElementById('qvPrice').innerHTML = 'Loading...';
    document.getElementById('qvStars').innerHTML = '';
    document.getElementById('qvRatingText').innerText = '';
    document.getElementById('qvVariants').innerHTML = '';
    document.getElementById('qvOldPrice').style.display = 'none';
    document.getElementById('qvDiscount').style.display = 'none';

    fetch(API_BASE + '/api/db/products/' + idStr)
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success && data.product) {
          allProductsCache.push(data.product);
          qvShowProduct(data.product);
        } else {
          toast('Product not found');
          closeQuickView();
        }
      })
      .catch(function() {
        toast('Error loading product');
        closeQuickView();
      });
  };

  function qvShowProduct(product) {
    qvProduct = product;
    qvQuantity = 1;
    document.getElementById('qvQty').innerText = '1';
    document.getElementById('qvName').innerText = product.name;
    document.getElementById('qvCategory').innerText = product.category || '';

    var imgUrl = product.image ? optimizeImage(product.image, 600) : '';
    var imgEl = document.getElementById('qvImage');
    if (imgUrl) {
      imgEl.src = imgUrl;
      imgEl.style.display = 'block';
      imgEl.setAttribute('fetchpriority', 'high');
    } else {
      imgEl.src = '';
      imgEl.style.display = 'none';
    }

    var rating = product.rating || 4.0;
    var fullStars = Math.floor(rating);
    var hasHalf = rating - fullStars >= 0.5;
    var starsHtml = '';
    for (var i = 0; i < fullStars; i++) starsHtml += '<i class="ph ph-star-fill star-filled" style="color:#F59E0B;font-size:13px;"></i>';
    if (hasHalf) starsHtml += '<i class="ph ph-star-half star-filled" style="color:#F59E0B;font-size:13px;"></i>';
    var empty = 5 - Math.ceil(rating);
    for (var i = 0; i < empty; i++) starsHtml += '<i class="ph ph-star star-empty" style="color:#d1d5db;font-size:13px;"></i>';
    document.getElementById('qvStars').innerHTML = starsHtml;
    document.getElementById('qvRatingText').innerText = rating.toFixed(1) + ' out of 5 stars';

    document.getElementById('qvOldPrice').style.display = 'none';
    document.getElementById('qvDiscount').style.display = 'none';

    var variants = product.variants || [];
    variants.sort(function(a, b) {
      if (a.flavour && b.flavour) return a.flavour.localeCompare(b.flavour);
      if (a.flavour) return -1;
      if (b.flavour) return 1;
      return 0;
    });
    var container = document.getElementById('qvVariants');
    container.innerHTML = '';
    if (!variants.length) {
      container.innerHTML = '<p style="color:var(--muted);font-size:.75rem;">No variants available</p>';
      qvSelectedVariant = null;
      document.getElementById('qvPrice').innerHTML = 'KES 0';
      return;
    }
    variants.forEach(function(v) {
      var btn = document.createElement('button');
      btn.className = 'quickview-variant-btn';
      var flavour = v.flavour || 'Original';
      var size = v.size || '';
      var price = v.price || 0;
      var discount = v.discount || 0;
      btn.innerHTML = '<span class="flavour">' + escapeHtml(flavour) + '</span><span class="size">' + escapeHtml(size) + '</span>';
      btn.dataset.flavour = flavour;
      btn.dataset.size = size;
      btn.dataset.price = price;
      btn.dataset.discount = discount;
      btn.onclick = function() {
        qvSelectVariant(flavour, size, price, discount);
      };
      container.appendChild(btn);
    });
    var first = variants[0];
    qvSelectVariant(first.flavour || 'Original', first.size || '', first.price, first.discount || 0);

    var overlay = document.getElementById('quickviewOverlay');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  window.qvSelectVariant = function(flavour, size, price, discount) {
    qvSelectedVariant = { flavour: flavour, size: size, price: price, discount: discount };
    var btns = document.querySelectorAll('.quickview-variant-btn');
    btns.forEach(function(btn) {
      var isSelected = (btn.dataset.flavour === flavour && btn.dataset.size === size);
      btn.classList.toggle('selected', isSelected);
    });
    var hasDiscount = discount > 0;
    var discountedPrice = hasDiscount ? Math.round(price * (100 - discount) / 100) : price;
    document.getElementById('qvPrice').innerHTML = 'KES ' + discountedPrice.toLocaleString();
    document.getElementById('qvOldPrice').style.display = 'none';
    document.getElementById('qvDiscount').style.display = 'none';
  };

  window.qvChangeQty = function(delta) {
    qvQuantity += delta;
    if (qvQuantity < 1) qvQuantity = 1;
    if (qvQuantity > 10) qvQuantity = 10;
    document.getElementById('qvQty').innerText = qvQuantity;
  };

  window.qvAddToCart = function() {
    if (!qvProduct || !qvSelectedVariant) { toast('Select a variant first'); return; }
    var id = qvProduct._id;
    var priceToAdd = qvSelectedVariant.discount > 0 ? Math.round(qvSelectedVariant.price * (100 - qvSelectedVariant.discount) / 100) : qvSelectedVariant.price;
    var variantLabel = qvSelectedVariant.flavour + ' ' + qvSelectedVariant.size;
    if (cart[id]) { cart[id].qty += qvQuantity; } else { cart[id] = { id: id, name: qvProduct.name, price: priceToAdd, qty: qvQuantity, capacity: qvSelectedVariant.size, size: qvSelectedVariant.size, flavour: qvSelectedVariant.flavour }; }
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartUI();
    toast(qvQuantity + '× ' + qvProduct.name + ' (' + variantLabel + ') added ✓');
    closeQuickView();
  };

  window.qvBuyNow = function() {
    if (!qvProduct || !qvSelectedVariant) { toast('Select a variant first'); return; }
    var id = qvProduct._id;
    var priceToAdd = qvSelectedVariant.discount > 0 ? Math.round(qvSelectedVariant.price * (100 - qvSelectedVariant.discount) / 100) : qvSelectedVariant.price;
    if (cart[id]) { cart[id].qty += qvQuantity; } else { cart[id] = { id: id, name: qvProduct.name, price: priceToAdd, qty: qvQuantity, capacity: qvSelectedVariant.size, size: qvSelectedVariant.size, flavour: qvSelectedVariant.flavour }; }
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    window.location.href = 'checkout.html';
  };

  window.closeQuickView = function(e) {
    if (e && e.target !== e.currentTarget) return;
    var overlay = document.getElementById('quickviewOverlay');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  };

  document.addEventListener('click', function(e) {
    var card = e.target.closest('.prod-card');
    if (card && card.dataset.productId) {
      e.preventDefault();
      quickViewById(card.dataset.productId);
    }
  });

  // ============================================================
  // ZONES, SEARCH, WISHLIST
  // ============================================================
  window.renderZones = function() {
    var zonesGrid = document.getElementById('zonesGrid');
    if (!zonesGrid) return;
    var zones = ['Dagoretti', 'Karen', 'Kilimani', 'Westlands', 'CBD', 'Upperhill', 'Lavington', 'Kileleshwa', 'Rongai', 'Ngong', 'South B', 'Langata', 'Waithaka', 'Kikuyu', 'Runda'];
    zonesGrid.innerHTML = zones.map(function(z) { return '<div class="zone-tag"><div class="zone-dot"></div><span>' + z + '</span></div>'; }).join('');
  };

  populateCategoryDropdown('categoryDropdown');
  renderCategories();
  loadProductsForIndex();
  renderZones();

  (function initMainSearch() {
    var input = document.getElementById('mainSearchInput');
    var clearBtn = document.getElementById('mainSearchClear');
    if (!input) return;
    input.addEventListener('input', function() {
      var val = this.value.trim();
      if (clearBtn) clearBtn.style.display = val.length > 0 ? 'block' : 'none';
      var hi = document.getElementById('headerSearchInput');
      if (hi) hi.value = val;
      var mi = document.getElementById('mobileSearchInput');
      if (mi) mi.value = val;
    });
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var val = this.value.trim();
        if (val) window.location.href = 'shop.html?search=' + encodeURIComponent(val);
      }
    });
    if (clearBtn) {
      clearBtn.addEventListener('click', function() {
        input.value = '';
        clearBtn.style.display = 'none';
        input.focus();
        var hi = document.getElementById('headerSearchInput');
        if (hi) hi.value = '';
        var mi = document.getElementById('mobileSearchInput');
        if (mi) mi.value = '';
      });
    }
  })();

  var wishlistModal = document.getElementById('wishlistModal');
  if (wishlistModal) {
    wishlistModal.addEventListener('click', function(e) {
      if (e.target === this) closeWishlistModal();
    });
  }
} // <-- THIS CLOSES THE INDEX.HTML BLOCK

  // ============================================================
  // QUICK VIEW
  // ============================================================
  var qvProduct = null;
  var qvSelectedVariant = null;
  var qvQuantity = 1;

  window.quickViewById = function(id) {
    var idStr = String(id);
    // FIX: Check if allProductsCache exists and is an array
    if (!allProductsCache || !Array.isArray(allProductsCache)) {
      console.warn('allProductsCache not ready yet');
      // Try to load products first
      if (typeof loadProducts === 'function') {
        loadProducts().then(function() {
          window.quickViewById(id);
        });
      }
      return;
    }
    var product = allProductsCache.find(function(p) { return String(p._id) === idStr; });
    if (product) {
      qvShowProduct(product);
      return;
    }

    var overlay = document.getElementById('quickviewOverlay');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    document.getElementById('qvName').innerText = 'Loading...';
    document.getElementById('qvCategory').innerText = '';
    document.getElementById('qvImage').src = '';
    document.getElementById('qvPrice').innerHTML = 'Loading...';
    document.getElementById('qvStars').innerHTML = '';
    document.getElementById('qvRatingText').innerText = '';
    document.getElementById('qvVariants').innerHTML = '';
    document.getElementById('qvOldPrice').style.display = 'none';
    document.getElementById('qvDiscount').style.display = 'none';

    fetch(API_BASE + '/api/db/products/' + idStr)
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success && data.product) {
          allProductsCache.push(data.product);
          qvShowProduct(data.product);
        } else {
          toast('Product not found');
          closeQuickView();
        }
      })
      .catch(function() {
        toast('Error loading product');
        closeQuickView();
      });
  };

  function qvShowProduct(product) {
    qvProduct = product;
    qvQuantity = 1;
    document.getElementById('qvQty').innerText = '1';
    document.getElementById('qvName').innerText = product.name;
    document.getElementById('qvCategory').innerText = product.category || '';

    var imgUrl = product.image ? optimizeImage(product.image, 600) : '';
    var imgEl = document.getElementById('qvImage');
    if (imgUrl) {
      imgEl.src = imgUrl;
      imgEl.style.display = 'block';
      imgEl.setAttribute('fetchpriority', 'high');
    } else {
      imgEl.src = '';
      imgEl.style.display = 'none';
    }

    var rating = product.rating || 4.0;
    var fullStars = Math.floor(rating);
    var hasHalf = rating - fullStars >= 0.5;
    var starsHtml = '';
    for (var i = 0; i < fullStars; i++) starsHtml += '<i class="ph ph-star-fill star-filled" style="color:#F59E0B;font-size:13px;"></i>';
    if (hasHalf) starsHtml += '<i class="ph ph-star-half star-filled" style="color:#F59E0B;font-size:13px;"></i>';
    var empty = 5 - Math.ceil(rating);
    for (var i = 0; i < empty; i++) starsHtml += '<i class="ph ph-star star-empty" style="color:#d1d5db;font-size:13px;"></i>';
    document.getElementById('qvStars').innerHTML = starsHtml;
    document.getElementById('qvRatingText').innerText = rating.toFixed(1) + ' out of 5 stars';

    document.getElementById('qvOldPrice').style.display = 'none';
    document.getElementById('qvDiscount').style.display = 'none';

    var variants = product.variants || [];
    variants.sort(function(a, b) {
      if (a.flavour && b.flavour) return a.flavour.localeCompare(b.flavour);
      if (a.flavour) return -1;
      if (b.flavour) return 1;
      return 0;
    });
    var container = document.getElementById('qvVariants');
    container.innerHTML = '';
    if (!variants.length) {
      container.innerHTML = '<p style="color:var(--muted);font-size:.75rem;">No variants available</p>';
      qvSelectedVariant = null;
      document.getElementById('qvPrice').innerHTML = 'KES 0';
      return;
    }
    variants.forEach(function(v) {
      var btn = document.createElement('button');
      btn.className = 'quickview-variant-btn';
      var flavour = v.flavour || 'Original';
      var size = v.size || '';
      var price = v.price || 0;
      var discount = v.discount || 0;
      btn.innerHTML = '<span class="flavour">' + escapeHtml(flavour) + '</span><span class="size">' + escapeHtml(size) + '</span>';
      btn.dataset.flavour = flavour;
      btn.dataset.size = size;
      btn.dataset.price = price;
      btn.dataset.discount = discount;
      btn.onclick = function() {
        qvSelectVariant(flavour, size, price, discount);
      };
      container.appendChild(btn);
    });
    var first = variants[0];
    qvSelectVariant(first.flavour || 'Original', first.size || '', first.price, first.discount || 0);

    var overlay = document.getElementById('quickviewOverlay');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  window.qvSelectVariant = function(flavour, size, price, discount) {
    qvSelectedVariant = { flavour: flavour, size: size, price: price, discount: discount };
    var btns = document.querySelectorAll('.quickview-variant-btn');
    btns.forEach(function(btn) {
      var isSelected = (btn.dataset.flavour === flavour && btn.dataset.size === size);
      btn.classList.toggle('selected', isSelected);
    });
    var hasDiscount = discount > 0;
    var discountedPrice = hasDiscount ? Math.round(price * (100 - discount) / 100) : price;
    document.getElementById('qvPrice').innerHTML = 'KES ' + discountedPrice.toLocaleString();
    document.getElementById('qvOldPrice').style.display = 'none';
    document.getElementById('qvDiscount').style.display = 'none';
  };

  window.qvChangeQty = function(delta) {
    qvQuantity += delta;
    if (qvQuantity < 1) qvQuantity = 1;
    if (qvQuantity > 10) qvQuantity = 10;
    document.getElementById('qvQty').innerText = qvQuantity;
  };

  window.qvAddToCart = function() {
    if (!qvProduct || !qvSelectedVariant) { toast('Select a variant first'); return; }
    var id = qvProduct._id;
    var priceToAdd = qvSelectedVariant.discount > 0 ? Math.round(qvSelectedVariant.price * (100 - qvSelectedVariant.discount) / 100) : qvSelectedVariant.price;
    var variantLabel = qvSelectedVariant.flavour + ' ' + qvSelectedVariant.size;
    if (cart[id]) { cart[id].qty += qvQuantity; } else { cart[id] = { id: id, name: qvProduct.name, price: priceToAdd, qty: qvQuantity, capacity: qvSelectedVariant.size, size: qvSelectedVariant.size, flavour: qvSelectedVariant.flavour }; }
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartUI();
    toast(qvQuantity + '× ' + qvProduct.name + ' (' + variantLabel + ') added ✓');
    closeQuickView();
  };

  window.qvBuyNow = function() {
    if (!qvProduct || !qvSelectedVariant) { toast('Select a variant first'); return; }
    var id = qvProduct._id;
    var priceToAdd = qvSelectedVariant.discount > 0 ? Math.round(qvSelectedVariant.price * (100 - qvSelectedVariant.discount) / 100) : qvSelectedVariant.price;
    if (cart[id]) { cart[id].qty += qvQuantity; } else { cart[id] = { id: id, name: qvProduct.name, price: priceToAdd, qty: qvQuantity, capacity: qvSelectedVariant.size, size: qvSelectedVariant.size, flavour: qvSelectedVariant.flavour }; }
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    window.location.href = 'checkout.html';
  };

  window.closeQuickView = function(e) {
    if (e && e.target !== e.currentTarget) return;
    var overlay = document.getElementById('quickviewOverlay');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  };

  document.addEventListener('click', function(e) {
    var card = e.target.closest('.prod-card');
    if (card && card.dataset.productId) {
      e.preventDefault();
      quickViewById(card.dataset.productId);
    }
  });

    // ============================================================
  // ZONES, SEARCH, WISHLIST - ENHANCED
  // ============================================================

  /**
   * Render delivery zones with dynamic styling
   */
  window.renderZones = function() {
    var zonesGrid = document.getElementById('zonesGrid');
    if (!zonesGrid) return;
    
    var zones = [
      { name: 'Dagoretti', fee: 0, icon: 'ph-house' },
      { name: 'Karen', fee: 50, icon: 'ph-tree' },
      { name: 'Kilimani', fee: 60, icon: 'ph-buildings' },
      { name: 'Westlands', fee: 100, icon: 'ph-office-building' },
      { name: 'CBD', fee: 80, icon: 'ph-city' },
      { name: 'Upperhill', fee: 70, icon: 'ph-skyscraper' },
      { name: 'Lavington', fee: 80, icon: 'ph-tree' },
      { name: 'Kileleshwa', fee: 70, icon: 'ph-buildings' },
      { name: 'Rongai', fee: 120, icon: 'ph-road' },
      { name: 'Ngong', fee: 150, icon: 'ph-tree' },
      { name: 'South B', fee: 100, icon: 'ph-buildings' },
      { name: 'Langata', fee: 130, icon: 'ph-tree' },
      { name: 'Waithaka', fee: 140, icon: 'ph-road' },
      { name: 'Kikuyu', fee: 160, icon: 'ph-tree' },
      { name: 'Runda', fee: 180, icon: 'ph-tree' }
    ];
    
    zonesGrid.innerHTML = zones.map(function(z) {
      var feeText = z.fee === 0 ? 'FREE' : 'KES ' + z.fee;
      return '<div class="zone-tag" title="Delivery fee: ' + feeText + '" style="cursor:default;">' +
        '<i class="ph ' + z.icon + '" style="font-size:10px;color:var(--gold);"></i>' +
        '<span>' + z.name + '</span>' +
        '<span style="font-size:8px;color:var(--muted);margin-left:2px;">(' + feeText + ')</span>' +
        '</div>';
    }).join('');
  };

  /**
   * Enhanced main search with autocomplete and suggestions
   */
  (function initMainSearch() {
    var input = document.getElementById('mainSearchInput');
    var clearBtn = document.getElementById('mainSearchClear');
    var form = input ? input.closest('.search-box') : null;
    
    if (!input) return;

    // Create suggestions container
    var suggestionsContainer = document.createElement('div');
    suggestionsContainer.id = 'searchSuggestions';
    suggestionsContainer.style.cssText = 'position:absolute;top:100%;left:0;right:0;background:white;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.12);border:1px solid var(--border);display:none;z-index:100;max-height:300px;overflow-y:auto;margin-top:4px;';
    
    if (form) {
      form.style.position = 'relative';
      form.appendChild(suggestionsContainer);
    }

    // Search function with debounce
    var searchTimeout;

    function performSearch(query) {
      var val = query.trim();
      if (clearBtn) clearBtn.style.display = val.length > 0 ? 'block' : 'none';
      
      // Sync with header search
      var hi = document.getElementById('headerSearchInput');
      if (hi) hi.value = val;
      var mi = document.getElementById('mobileSearchInput');
      if (mi) mi.value = val;

      // Show suggestions if we have cached products
      if (val.length > 0 && allProductsCache && allProductsCache.length > 0) {
        var suggestions = allProductsCache.filter(function(p) {
          return p.name.toLowerCase().includes(val.toLowerCase()) || 
                 (p.category && p.category.toLowerCase().includes(val.toLowerCase()));
        }).slice(0, 6);

        if (suggestions.length > 0) {
          suggestionsContainer.innerHTML = suggestions.map(function(p) {
            var price = p.variants && p.variants.length ? p.variants[0].price : 0;
            var img = p.image ? optimizeImage(p.image, 50) : FALLBACK_IMG;
            return '<div class="search-suggestion" data-id="' + p._id + '" style="display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;transition:background 0.15s;border-bottom:1px solid var(--border-light);">' +
              '<img src="' + img + '" style="width:32px;height:32px;object-fit:cover;border-radius:6px;background:var(--bg2);" onerror="this.src=\'' + FALLBACK_IMG + '\'">' +
              '<div style="flex:1;"><div style="font-weight:600;font-size:.8rem;">' + escapeHtml(p.name) + '</div>' +
              '<div style="font-size:.6rem;color:var(--muted);">' + (p.category || '') + '</div></div>' +
              '<div style="font-weight:700;font-size:.75rem;color:var(--sale-red);">KES ' + price.toLocaleString() + '</div>' +
              '</div>';
          }).join('') +
          '<div style="padding:8px 14px;text-align:center;border-top:1px solid var(--border-light);">' +
          '<a href="shop.html?search=' + encodeURIComponent(val) + '" style="color:var(--gold);font-weight:600;font-size:.75rem;text-decoration:none;">View all results →</a>' +
          '</div>';
          
          suggestionsContainer.style.display = 'block';
        } else {
          suggestionsContainer.innerHTML = '<div style="padding:16px;text-align:center;color:var(--muted);font-size:.8rem;">No products found for "' + escapeHtml(val) + '"</div>';
          suggestionsContainer.style.display = 'block';
        }
      } else {
        suggestionsContainer.style.display = 'none';
      }
    }

    input.addEventListener('input', function() {
      clearTimeout(searchTimeout);
      var val = this.value;
      searchTimeout = setTimeout(function() {
        performSearch(val);
      }, 250);
    });

    input.addEventListener('focus', function() {
      if (this.value.trim().length > 0) {
        performSearch(this.value);
      }
    });

    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var val = this.value.trim();
        if (val) window.location.href = 'shop.html?search=' + encodeURIComponent(val);
        suggestionsContainer.style.display = 'none';
      }
      if (e.key === 'Escape') {
        suggestionsContainer.style.display = 'none';
        this.blur();
      }
    });

    // Close suggestions on click outside
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.search-box')) {
        suggestionsContainer.style.display = 'none';
      }
    });

    // Click on suggestion
    suggestionsContainer.addEventListener('click', function(e) {
      var item = e.target.closest('.search-suggestion');
      if (item && item.dataset.id) {
        window.location.href = 'product-details.html?id=' + item.dataset.id;
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', function() {
        input.value = '';
        clearBtn.style.display = 'none';
        suggestionsContainer.style.display = 'none';
        input.focus();
        var hi = document.getElementById('headerSearchInput');
        if (hi) hi.value = '';
        var mi = document.getElementById('mobileSearchInput');
        if (mi) mi.value = '';
      });
    }
  })();

  /**
   * Enhanced wishlist modal with better UX
   */
  var wishlistModal = document.getElementById('wishlistModal');
  if (wishlistModal) {
    // Close on overlay click
    wishlistModal.addEventListener('click', function(e) {
      if (e.target === this) closeWishlistModal();
    });
    
    // Close on Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && wishlistModal.style.display === 'flex') {
        closeWishlistModal();
      }
    });
    
    // Track wishlist count in header
    function updateWishlistBadge() {
      var count = wishlist.length;
      var badge = document.querySelector('.wishlist-badge');
      if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
      }
    }
    
    // Override toggleWishlist to update badge
    var originalToggleWishlist = window.toggleWishlist;
    window.toggleWishlist = function(id, name, price, image, capacity, btnElement) {
      originalToggleWishlist(id, name, price, image, capacity, btnElement);
      updateWishlistBadge();
    };
    
    // Initialize badge
    setTimeout(updateWishlistBadge, 100);
  }

// ============================================================
// SHOP.HTML - ENHANCED WITH MORE FEATURES
// ============================================================
if (document.getElementById('catChips')) {
  
  var ALL_PRODUCTS = [];
  var filteredProducts = [];
  var currentPage = 1;
  var PAGE_SIZE = 12;
  var currentSort = 'featured';
  var currentFilters = { 
    category: 'all', 
    search: '', 
    priceMin: null, 
    priceMax: null, 
    onSale: false,
    minRating: null,
    sizes: [],
    categories: []
  };
  var deliverySettings = { delivery_fee: 150, free_delivery_threshold: 5000, delivery_enabled: true };

  var categoriesShop = [];
  var currentProductView = 'all';

  // ===== AD POSTER - MODERN DYNAMIC VERSION =====
(function initAdPoster() {
  var adData = [
    { 
      icon: 'ph-shield-check', 
      title: '100% Authentic Products', 
      desc: 'Official distributors • Genuine brands • Quality guaranteed', 
      badge: 'Trusted',
      bgGradient: 'linear-gradient(135deg, #1a472a, #2d6a4f)',
      accentColor: '#52b788'
    },
    { 
      icon: 'ph-truck', 
      title: 'Fast & Reliable Delivery', 
      desc: '10–45 minutes across Nairobi • Rider calls before arrival', 
      badge: 'Swift',
      bgGradient: 'linear-gradient(135deg, #1a365d, #2b6cb0)',
      accentColor: '#63b3ed'
    },
    { 
      icon: 'ph-credit-card', 
      title: 'Easy M-PESA Checkout', 
      desc: 'STK Push payment • Secure • Instant confirmation', 
      badge: 'Simple',
      bgGradient: 'linear-gradient(135deg, #6b21a5, #7c3aed)',
      accentColor: '#a78bfa'
    },
    { 
      icon: 'ph-clock', 
      title: 'Open 24/7 — We Never Close', 
      desc: 'Order anytime • Day or night • Always available', 
      badge: 'Always',
      bgGradient: 'linear-gradient(135deg, #9a3412, #c2410c)',
      accentColor: '#fb923c'
    },
    { 
      icon: 'ph-seal-check', 
      title: 'Wide Selection — 100+ Brands', 
      desc: 'Whisky • Cognac • Vodka • Gin • Rum • Wine • Beer', 
      badge: 'Variety',
      bgGradient: 'linear-gradient(135deg, #1e1b4b, #3730a3)',
      accentColor: '#818cf8'
    }
  ];
  
  var adIndex = 0;
  var adInterval = null;
  var isTransitioning = false;

  function renderAd(index) {
    if (isTransitioning) return;
    isTransitioning = true;
    
    var data = adData[index % adData.length];
    
    // Update main poster
    var poster = document.getElementById('adPosterInner');
    if (poster) {
      poster.style.opacity = '0';
      poster.style.transform = 'scale(0.98)';
      
      setTimeout(function() {
        // Update content
        var iconEl = document.getElementById('adIcon');
        if (iconEl) {
          iconEl.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
          iconEl.innerHTML = '<i class="ph ' + data.icon + '"></i>';
          iconEl.style.transform = 'scale(1.2)';
          setTimeout(function() { iconEl.style.transform = 'scale(1)'; }, 300);
        }
        
        var titleEl = document.getElementById('adTitle');
        if (titleEl) {
          titleEl.style.transition = 'all 0.4s ease';
          titleEl.textContent = data.title;
        }
        
        var descEl = document.getElementById('adDesc');
        if (descEl) descEl.textContent = data.desc;
        
        var badgeEl = document.getElementById('adBadge');
        if (badgeEl) {
          badgeEl.textContent = data.badge;
          badgeEl.style.transition = 'all 0.4s ease';
          badgeEl.style.transform = 'scale(1.1)';
          setTimeout(function() { badgeEl.style.transform = 'scale(1)'; }, 300);
        }
        
        // Update gradient background
        var wrapper = document.getElementById('adPosterWrapper');
        if (wrapper) {
          wrapper.style.transition = 'background 0.8s ease';
          wrapper.style.background = data.bgGradient;
          wrapper.style.setProperty('--accent-color', data.accentColor);
        }
        
        // Update dots
        var dots = document.querySelectorAll('.ad-dot');
        dots.forEach(function(d, i) {
          d.classList.toggle('active', i === index);
        });
        
        // Fade back in
        poster.style.opacity = '1';
        poster.style.transform = 'scale(1)';
        
        setTimeout(function() {
          isTransitioning = false;
        }, 400);
      }, 300);
    }
  }

  // Build dots
  var container = document.getElementById('adDots');
  if (container) {
    container.innerHTML = '';
    for (var i = 0; i < adData.length; i++) {
      var dot = document.createElement('span');
      dot.className = 'ad-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('data-index', i);
      dot.style.transition = 'all 0.3s ease';
      dot.style.cursor = 'pointer';
      dot.onclick = (function(idx) {
        return function() {
          if (isTransitioning) return;
          clearInterval(adInterval);
          adIndex = idx;
          renderAd(adIndex);
          adInterval = setInterval(function() { 
            adIndex = (adIndex + 1) % adData.length;
            renderAd(adIndex); 
          }, 5000);
        };
      })(i);
      container.appendChild(dot);
    }
    
    // Set initial background
    var wrapper = document.getElementById('adPosterWrapper');
    if (wrapper) {
      wrapper.style.background = adData[0].bgGradient;
      wrapper.style.setProperty('--accent-color', adData[0].accentColor);
    }
    
    renderAd(0);
    adInterval = setInterval(function() { 
      adIndex = (adIndex + 1) % adData.length;
      renderAd(adIndex); 
    }, 5000);
  }
})();

  // ===== ANNOUNCEMENT BAR =====
  (function initAnnounceBar() {
    var announceMessages = [
      '<i class="ph ph-lightning"></i> 10–45 minute delivery across Nairobi',
      '<i class="ph ph-wallet"></i> Pay safely with M-PESA STK Push',
      '<i class="ph ph-seal-check"></i> 100% authentic — official distributors only',
      '<i class="ph ph-clock"></i> Open 24/7 — we never close'
    ];
    var announceIdx = 0;

    function rotateAnnounce() {
      var el = document.getElementById('announceText');
      if (!el) return;
      announceIdx = (announceIdx + 1) % announceMessages.length;
      el.style.opacity = 0;
      setTimeout(function() {
        el.innerHTML = announceMessages[announceIdx];
        el.style.opacity = 1;
      }, 250);
    }

    if (!sessionStorage.getItem('lb_announce_dismissed')) {
      setInterval(rotateAnnounce, 4500);
    } else {
      var bar = document.getElementById('announceBar');
      if (bar) bar.style.display = 'none';
    }

    window.dismissAnnounceBar = function() {
      var bar = document.getElementById('announceBar');
      if (bar) bar.style.display = 'none';
      try { sessionStorage.setItem('lb_announce_dismissed', '1'); } catch(e) {}
    };
  })();

  // ===== CACHE HELPERS =====
  function getCachedProducts() {
    try {
      var cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      var data = JSON.parse(cached);
      if (Date.now() - data.timestamp > CACHE_DURATION) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
      return data.products;
    } catch (e) { return null; }
  }

  function setCachedProducts(products) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ products: products, timestamp: Date.now() }));
    } catch (e) {}
  }

    // ===== MAP DB PRODUCTS =====
  function mapDbProducts(rawProducts) {
    return rawProducts.map(function(p) {
      var variants = p.variants || [];
      var sizeOrderMap = { '250ml': 1, '350ml': 2, '500ml': 3, '750ml': 4, '1L': 5, '1.5L': 6 };
      var sortedVariants = [...variants].sort(function(a, b) { return (sizeOrderMap[a.size] || 99) - (sizeOrderMap[b.size] || 99); });
      var cheapestVariant = sortedVariants[0] || null;
      var originalPrice = cheapestVariant ? cheapestVariant.price : 0;
      var discountPercent = cheapestVariant?.discount || 0;
      var discountedPrice = discountPercent > 0 ? Math.round(originalPrice * (100 - discountPercent) / 100) : originalPrice;
      
      // ===== STOCK STATUS =====
      // Check if any variant is in stock
      var hasInStock = variants.some(function(v) {
        return v.stock === 'inStock' || (!v.stock && v.stockQuantity > 0) || (!v.stock && v.stockQuantity === undefined);
      });
      
      // Check if all variants are out of stock
      var allOutOfStock = variants.every(function(v) {
        return v.stock === 'outOfStock' || (v.stockQuantity !== undefined && v.stockQuantity <= 0);
      });
      
      // Determine stock status
      var stockStatus = 'in-stock';
      if (allOutOfStock || !hasInStock) {
        stockStatus = 'out-of-stock';
      } else {
        // Check if low stock (some variants with quantity < 5)
        var lowStock = variants.some(function(v) {
          return v.stockQuantity !== undefined && v.stockQuantity > 0 && v.stockQuantity < 5;
        });
        if (lowStock) stockStatus = 'low-stock';
      }
      
      return {
        _id: p._id,
        id: p._id,
        name: p.name,
        capacity: cheapestVariant?.size || '750ml',
        price: discountedPrice,
        originalPrice: originalPrice,
        discountPercent: discountPercent,
        category: p.category || '',
        badge: p.badge || (discountPercent > 10 ? 'hot' : ''),
        image: p.image || '',
        description: p.description || '',
        isTrending: p.isTrending || false,
        isNew: p.isNew || false,
        rating: p.rating || 4,
        country: p.country || '',
        stock: p.stock !== undefined ? p.stock : 999,
        stockStatus: stockStatus,
        variants: variants
      };
    });
  }

  // ===== RENDER SKELETONS =====
  function renderSkeletonsShop(count, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var skeletons = '';
    for (var i = 0; i < count; i++) {
      skeletons += '<div class="skeleton-card"><div class="skeleton-img"></div><div class="skeleton-text"></div><div class="skeleton-text short"></div><div class="skeleton-btn"></div></div>';
    }
    container.innerHTML = skeletons;
  }

        // ===== GET DEFAULT CATEGORIES =====
  function getDefaultCategories() {
    return [
      { name: 'All', cat: 'all' },
      { name: 'Whisky', cat: 'whisky' },
      { name: 'Wine', cat: 'wine' },
      { name: 'Vodka', cat: 'vodka' },
      { name: 'Gin', cat: 'gin' },
      { name: 'Cognac', cat: 'cognac' },
      { name: 'Creams', cat: 'cream' },
      { name: 'Beer', cat: 'beer' },
      { name: 'Brandy', cat: 'brandy' },
      { name: 'Bourbon', cat: 'bourbon' },
      { name: 'Rum', cat: 'rum' },
      { name: 'Spirits', cat: 'spirits' },
      { name: 'Liqueur', cat: 'liqueur' },
      { name: 'Juice', cat: 'juice' },
      { name: 'Soda', cat: 'soda' },
      { name: 'Water', cat: 'water' },
      { name: 'Energy', cat: 'energy' },
      { name: 'Cigar', cat: 'cigar' },
      { name: 'Accessory', cat: 'accessory' }
    ];
  }

  
  // ===== RENDER FEATURED SECTIONS - SAFE =====
  function renderFeaturedSections() {
    var selectedCategory = currentFilters.category;
    var isAll = selectedCategory === 'all';

    var trendingItems = ALL_PRODUCTS.filter(function(p) {
      return p.isTrending === true && (isAll || p.category === selectedCategory);
    }).slice(0, 8);

    var newItems = ALL_PRODUCTS.filter(function(p) {
      return p.isNew === true && (isAll || p.category === selectedCategory);
    }).slice(0, 8);

    function buildFeaturedItem(p) {
      var imgSrc = p.image ? optimizeImage(p.image, 200) : FALLBACK_IMG;
      return '<div class="featured-item" onclick="goToProduct(\'' + p._id + '\',\'' + escapeHtml(p.name).replace(/'/g, "\\'") + '\',' + p.price + ',\'' + (p.image || '') + '\',\'' + (p.capacity || '') + '\')">' +
        '<div class="featured-img-wrap"><img class="featured-img" src="' + imgSrc + '" loading="lazy" alt="' + escapeHtml(p.name) + '"></div>' +
        '<div class="featured-info">' +
        (p.capacity ? '<div class="featured-vol">' + escapeHtml(p.capacity) + '</div>' : '') +
        '<div class="featured-name">' + escapeHtml(p.name) + '</div>' +
        '<div class="featured-price">' + (p.discountPercent > 0 ? '<span style="text-decoration:line-through;font-size:.6rem;color:var(--muted);margin-right:4px;">KES ' + p.originalPrice.toLocaleString() + '</span>' : '') + 'KES ' + p.price.toLocaleString() + '</div>' +
        '</div></div>';
    }

    var trendingScroll = document.getElementById('trendingScroll');
    var newScroll = document.getElementById('newArrivalsScroll');

    if (trendingScroll) {
      if (trendingItems.length) {
        trendingScroll.innerHTML = trendingItems.map(buildFeaturedItem).join('');
      } else {
        trendingScroll.innerHTML = '<div style="padding:16px;color:var(--muted);font-size:.75rem;grid-column:1/-1;text-align:center;">No trending products' + (isAll ? '' : ' in ' + selectedCategory) + '</div>';
      }
    }

    if (newScroll) {
      if (newItems.length) {
        newScroll.innerHTML = newItems.map(buildFeaturedItem).join('');
      } else {
        newScroll.innerHTML = '<div style="padding:16px;color:var(--muted);font-size:.75rem;grid-column:1/-1;text-align:center;">No new arrivals' + (isAll ? '' : ' in ' + selectedCategory) + '</div>';
      }
    }
  }

  // ===== LOAD PRODUCTS =====
  window.loadProductsShop = function() {
    renderSkeletonsShop(10, 'shopGrid');
    var titleEl = document.getElementById('shopTitle');
    if (titleEl) titleEl.textContent = 'Loading…';

    var cached = getCachedProducts();
    if (cached && cached.length > 0) {
      ALL_PRODUCTS = cached;
      renderFeaturedSections();
      applyFiltersShop();
      renderRecentlyViewed();
      fetchFreshProducts();
      return;
    }

    fetch(API_BASE + '/api/db/products')
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success && data.products && data.products.length > 0) {
          ALL_PRODUCTS = mapDbProducts(data.products);
          setCachedProducts(ALL_PRODUCTS);
          renderFeaturedSections();
        } else {
          ALL_PRODUCTS = [];
          toast('No products found in database');
        }
        applyFiltersShop();
        renderRecentlyViewed();
      })
      .catch(function(e) {
        console.error('Error loading products:', e);
        ALL_PRODUCTS = [];
        toast('Could not connect to database');
        applyFiltersShop();
      });
  };

  function fetchFreshProducts() {
    fetch(API_BASE + '/api/db/products')
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success && data.products && data.products.length > 0) {
          ALL_PRODUCTS = mapDbProducts(data.products);
          setCachedProducts(ALL_PRODUCTS);
          renderFeaturedSections();
          applyFiltersShop();
        }
      })
      .catch(function(e) { console.error('Background refresh failed:', e); });
  }

    // ===== RENDER ACTIVE FILTER PILLS =====
  function renderActiveFilterPills() {
    var wrap = document.getElementById('activeFilters');
    if (!wrap) return;
    var pills = [];
    
    if (currentFilters.category !== 'all') {
      var found = categoriesShop.find(function(c) { return c.cat === currentFilters.category; });
      if (found) {
        pills.push('<div class="filter-pill">' + found.name + '<button onclick="selectCategory(\'all\')"><i class="ph ph-x"></i></button></div>');
      } else {
        // Invalid category - reset to all
        currentFilters.category = 'all';
      }
    }
    
    if (currentFilters.search) {
      pills.push('<div class="filter-pill">"' + escapeHtml(currentFilters.search) + '"<button onclick="clearSearchPill()"><i class="ph ph-x"></i></button></div>');
    }
    
    if (currentFilters.priceMin != null || currentFilters.priceMax != null) {
      var label = 'KES ' + (currentFilters.priceMin ?? 0) + ' – ' + (currentFilters.priceMax ?? '∞');
      pills.push('<div class="filter-pill">' + label + '<button onclick="clearPricePill()"><i class="ph ph-x"></i></button></div>');
    }
    
    if (currentFilters.onSale) {
      pills.push('<div class="filter-pill">On Sale<button onclick="clearSalePill()"><i class="ph ph-x"></i></button></div>');
    }
    
    if (currentFilters.sizes && currentFilters.sizes.length > 0) {
      pills.push('<div class="filter-pill">' + currentFilters.sizes.join(', ') + '<button onclick="clearSizePill()"><i class="ph ph-x"></i></button></div>');
    }
    
    wrap.innerHTML = pills.join('');
  }

        // ===== CATEGORY CHIPS =====
  window.renderCatChips = function() {
    var container = document.getElementById('catChips');
    if (!container) return;
    
    // If categories not loaded yet, use cached or default
    if (!categoriesShop || categoriesShop.length === 0) {
      var cached = localStorage.getItem('liquorbelle_categories');
      if (cached) {
        try {
          categoriesShop = JSON.parse(cached);
        } catch(e) {}
      }
      if (!categoriesShop || categoriesShop.length === 0) {
        categoriesShop = getDefaultCategories();
      }
    }
    
    container.innerHTML = categoriesShop.map(function(cat) {
      var active = currentFilters.category === cat.cat ? 'active' : '';
      return '<button class="cat-chip ' + active + '" data-cat="' + cat.cat + '" onclick="selectCategory(\'' + cat.cat + '\')">' + cat.name + '</button>';
    }).join('');
  };

  window.selectCategory = function(cat) {
    currentFilters.category = cat;
    currentCategory = cat;  // <-- ADD THIS LINE
    currentPage = 1;
    var url = new URL(window.location);
    if (cat === 'all') { url.searchParams.delete('cat'); } else { url.searchParams.set('cat', cat); }
    window.history.replaceState({}, '', url);
    renderCatChips();
    
    // Reset view to 'all' when switching category
    currentProductView = 'all';
    document.querySelectorAll('.filter-tab').forEach(function(tab) {
      tab.classList.toggle('active', tab.dataset.view === 'all');
    });
    
    applyFiltersShop();
    document.querySelector('.shop-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ===== PRODUCT VIEW SWITCHER =====
  window.switchProductView = function(view) {
    currentProductView = view;
    
    document.querySelectorAll('.filter-tab').forEach(function(tab) {
      tab.classList.toggle('active', tab.dataset.view === view);
    });
    
    applyFiltersShop();
  };

  // ===== SEARCH =====
  function setSearch(val) {
    val = val.trim();
    currentFilters.search = val;
    var mainInput = document.getElementById('mainSearchInput');
    if (mainInput) mainInput.value = val;
    var h = document.getElementById('headerSearchInput');
    if (h) h.value = val;
    var m = document.getElementById('mobileSearchInput');
    if (m) m.value = val;
    var clearBtn = document.getElementById('mainSearchClear');
    if (clearBtn) {
      if (val.length > 0) { clearBtn.classList.add('visible'); } else { clearBtn.classList.remove('visible'); }
    }
    currentPage = 1;
    applyFiltersShop();
  }

  window.clearMainSearch = function() {
    setSearch('');
    document.getElementById('mainSearchInput').focus();
  };

  (function initMainSearchShop() {
    var input = document.getElementById('mainSearchInput');
    if (!input) return;
    var debounceTimer;
    input.addEventListener('input', function() {
      clearTimeout(debounceTimer);
      var val = this.value;
      debounceTimer = setTimeout(function() {
        setSearch(val);
      }, 300);
    });
    var searchParam = getQueryParam('search');
    if (searchParam) {
      input.value = searchParam;
      setSearch(searchParam);
    }
  })();

  // ===== FILTER DRAWER =====
  window.openFilterDrawer = function() {
    document.getElementById('priceMinInput').value = currentFilters.priceMin ?? '';
    document.getElementById('priceMaxInput').value = currentFilters.priceMax ?? '';
    document.getElementById('filterOnSale').checked = currentFilters.onSale;
    document.getElementById('filterDrawer').classList.add('open');
    document.getElementById('filterOverlay').classList.add('open');
    
    // Update size checkboxes
    document.querySelectorAll('.size-filter').forEach(function(cb) {
      cb.checked = currentFilters.sizes && currentFilters.sizes.indexOf(cb.value) !== -1;
    });
  };

  window.closeFilterDrawer = function() {
    document.getElementById('filterDrawer').classList.remove('open');
    document.getElementById('filterOverlay').classList.remove('open');
  };

  window.applyFiltersFromDrawer = function() {
    var min = document.getElementById('priceMinInput').value;
    var max = document.getElementById('priceMaxInput').value;
    currentFilters.priceMin = min !== '' ? Number(min) : null;
    currentFilters.priceMax = max !== '' ? Number(max) : null;
    currentFilters.onSale = document.getElementById('filterOnSale').checked;
    
    // Get selected sizes
    var sizeCheckboxes = document.querySelectorAll('.size-filter:checked');
    currentFilters.sizes = Array.from(sizeCheckboxes).map(function(cb) { return cb.value; });
    
    currentPage = 1;
    closeFilterDrawer();
    applyFiltersShop();
  };

  window.clearFilters = function() {
    currentFilters.priceMin = null;
    currentFilters.priceMax = null;
    currentFilters.onSale = false;
    currentFilters.sizes = [];
    currentFilters.category = 'all';
    currentFilters.search = '';
    currentFilters.minRating = null;
    currentFilters.inStock = false;
    
    document.getElementById('priceMinInput').value = '';
    document.getElementById('priceMaxInput').value = '';
    document.getElementById('filterOnSale').checked = false;
    document.querySelectorAll('.size-filter:checked').forEach(function(cb) { cb.checked = false; });
    
    var url = new URL(window.location);
    url.searchParams.delete('cat');
    url.searchParams.delete('search');
    window.history.replaceState({}, '', url);
    
    renderCatChips();
    closeFilterDrawer();
    applyFiltersShop();
  };

  // ===== UPDATE FILTER COUNT =====
  function updateFilterCount() {
    var n = 0;
    if (currentFilters.priceMin != null) n++;
    if (currentFilters.priceMax != null) n++;
    if (currentFilters.onSale) n++;
    if (currentFilters.search && currentFilters.search.length > 0) n++;
    if (currentFilters.sizes && currentFilters.sizes.length > 0) n++;
    if (currentFilters.minRating) n++;
    var badge = document.getElementById('filterCount');
    if (n > 0) { badge.style.display = 'flex';
      badge.innerText = n; } else { badge.style.display = 'none'; }
  }

        // ===== APPLY FILTERS =====
  function applyFiltersShop() {
    var f = currentFilters;
    var view = currentProductView || 'all';
    var list = ALL_PRODUCTS.filter(function(p) {
      // Category filter
      if (f.category !== 'all' && (p.category || '').toLowerCase() !== f.category) return false;
      
      // View filter (New/Trending)
      if (view === 'new' && !p.isNew) return false;
      if (view === 'trending' && !p.isTrending) return false;
      
      if (f.search) {
        var q = f.search.toLowerCase();
        var haystack = ((p.name || '') + ' ' + (p.category || '') + ' ' + (p.country || '')).toLowerCase();
        if (haystack.indexOf(q) === -1) return false;
      }
      if (f.priceMin != null && p.price < f.priceMin) return false;
      if (f.priceMax != null && p.price > f.priceMax) return false;
      if (f.onSale && !(p.discountPercent > 0)) return false;
      if (f.minRating && (p.rating || 0) < f.minRating) return false;
      if (f.inStock && (p.stock === 0 || p.stock === undefined)) return false;
      if (f.sizes && f.sizes.length > 0) {
        var size = p.capacity || '';
        var match = f.sizes.some(function(s) { return size.indexOf(s) !== -1; });
        if (!match) return false;
      }
      return true;
    });

    switch (currentSort) {
      case 'price-asc': list.sort(function(a, b) { return a.price - b.price; }); break;
      case 'price-desc': list.sort(function(a, b) { return b.price - a.price; }); break;
      case 'name-asc': list.sort(function(a, b) { return a.name.localeCompare(b.name); }); break;
      case 'name-desc': list.sort(function(a, b) { return b.name.localeCompare(a.name); }); break;
      case 'newest': list.sort(function(a, b) { return (b.isNew === true) - (a.isNew === true); }); break;
      case 'rating': list.sort(function(a, b) { return (b.rating || 0) - (a.rating || 0); }); break;
      default: break;
    }

    filteredProducts = list;
    if (currentPage < 1) currentPage = 1;
    var totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE);
    if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;

    renderFeaturedSections();
    updateTitleBar();
    updateFilterCount();
    renderActiveFilterPills();
    renderShopGrid();
    renderPagination();
    updateResultCount();
  }

    function updateResultCount() {
    var countEl = document.getElementById('resultCount');
    if (countEl) {
      var total = filteredProducts.length;
      var msg = total + ' product' + (total !== 1 ? 's' : '');
      if (currentFilters.search) msg += ' found for "' + currentFilters.search + '"';
      countEl.textContent = msg;
    }
  }

    function updateTitleBar() {
    var titleEl = document.getElementById('shopTitle');
    var breadcrumbEl = document.getElementById('shopBreadcrumbCat');
    var resultTitleEl = document.getElementById('shopResultTitle');
    var displayName = 'All Products';
    
    // Ensure categoriesShop has data
    if (!categoriesShop || categoriesShop.length === 0) {
      var cached = localStorage.getItem('liquorbelle_categories');
      if (cached) {
        try {
          categoriesShop = JSON.parse(cached);
        } catch(e) {}
      }
      if (!categoriesShop || categoriesShop.length === 0) {
        categoriesShop = getDefaultCategories();
      }
    }
    
    if (currentFilters.search) {
      displayName = 'Search: "' + currentFilters.search + '"';
    } else {
      // Get category name from currentFilters.category
      var catName = 'All Products';
      if (currentFilters.category && currentFilters.category !== 'all') {
        var found = categoriesShop.find(function(c) { return c.cat === currentFilters.category; });
        catName = found ? found.name : currentFilters.category;
      }
      
      // Add view label
      if (currentProductView === 'new') {
        if (currentFilters.category === 'all' || !currentFilters.category) {
          displayName = 'New Arrivals';
        } else {
          displayName = catName + ' - New';
        }
      } else if (currentProductView === 'trending') {
        if (currentFilters.category === 'all' || !currentFilters.category) {
          displayName = 'Trending';
        } else {
          displayName = catName + ' - Trending';
        }
      } else {
        displayName = catName;
      }
    }
    
    // Update all title elements
    if (titleEl) titleEl.textContent = displayName;
    if (breadcrumbEl) breadcrumbEl.textContent = displayName;
    if (resultTitleEl) resultTitleEl.textContent = displayName;
  }

  // ===== PAGINATION =====
  window.goToPage = function(page) {
    var totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderShopGrid();
    renderPagination();
    document.querySelector('.shop-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  function renderPagination() {
    var wrap = document.getElementById('paginationWrap');
    if (!wrap) return;
    var totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE);
    if (totalPages <= 1) { wrap.innerHTML = ''; return; }
    var html = '<button class="page-btn" onclick="goToPage(' + (currentPage - 1) + ')" ' + (currentPage === 1 ? 'disabled' : '') + '><i class="ph ph-caret-left"></i></button>';
    var startPage = Math.max(1, currentPage - 2);
    var endPage = Math.min(totalPages, currentPage + 2);
    if (startPage > 1) {
      html += '<button class="page-btn" onclick="goToPage(1)">1</button>';
      if (startPage > 2) html += '<span class="page-ellipsis">…</span>';
    }
    for (var i = startPage; i <= endPage; i++) {
      html += '<button class="page-btn ' + (i === currentPage ? 'active' : '') + '" onclick="goToPage(' + i + ')">' + i + '</button>';
    }
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) html += '<span class="page-ellipsis">…</span>';
      html += '<button class="page-btn" onclick="goToPage(' + totalPages + ')">' + totalPages + '</button>';
    }
    html += '<button class="page-btn" onclick="goToPage(' + (currentPage + 1) + ')" ' + (currentPage === totalPages ? 'disabled' : '') + '><i class="ph ph-caret-right"></i></button>';
    wrap.innerHTML = html;
  }


  // ===== RENDER SHOP GRID =====
  function renderShopGrid() {
    var grid = document.getElementById('shopGrid');
    if (!grid) return;
    if (!filteredProducts.length) {
      grid.innerHTML = '<div class="empty-state"><i class="ph ph-wine"></i><p>No products found.</p><small style="color:var(--muted);">Try adjusting your filters or search terms</small></div>';
      return;
    }
    var start = (currentPage - 1) * PAGE_SIZE;
    var visible = filteredProducts.slice(start, start + PAGE_SIZE);
    grid.innerHTML = visible.map(function(p) { return renderProductCardShop(p); }).join('');
  }

  // ===== SHOP PRODUCT CARD =====
  function renderProductCardShop(p) {
    var original = p.originalPrice || p.price;
    var savePercent = p.discountPercent || 0;
    var isWishlisted = wishlist.some(function(w) { return w.id == p._id; });
    var topBadge = '';
    if (savePercent > 0) {
      topBadge = '<div class="discount-circle">-' + savePercent + '%</div>';
    } else if (p.isNew) {
      topBadge = '<div class="badge-new">NEW</div>';
    } else if (p.isTrending) {
      topBadge = '<div class="badge-bestseller"><i class="ph-fill ph-flame" style="font-size:9px;"></i> BESTSELLER</div>';
    }
    
    var heartIcon = isWishlisted ? 'ph-fill ph-heart' : 'ph ph-heart';
    var wishlistBtn = '<button class="pc-wishlist ' + (isWishlisted ? 'wishlisted' : '') + '" onclick="event.stopPropagation();toggleWishlist(\'' + p._id + '\',\'' + escapeHtml(p.name).replace(/'/g, "\\'") + '\',' + p.price + ',\'' + (p.image || '') + '\',\'' + (p.capacity || '') + '\', this)"><i class="' + heartIcon + '"></i></button>';
    
    var variantHtml = '';
    if (p.variants && p.variants.length > 1) {
      variantHtml = '<div class="variant-select-wrap"><select onchange="updateVariantPrice(this, \'' + p._id + '\')">' +
        p.variants.map(function(v) {
          var selected = (v.size === p.capacity) ? 'selected' : '';
          return '<option value="' + v.size + '" data-price="' + v.price + '" ' + selected + '>' + v.size + ' — KES ' + v.price.toLocaleString() + '</option>';
        }).join('') + '</select></div>';
    }
    
    var imgSrc = p.image ? optimizeImage(p.image, 300) : FALLBACK_IMG;
    var escapedName = escapeHtml(p.name).replace(/'/g, "\\'");
    var stockText = (p.stock !== undefined && p.stock <= 3) ? 'Only ' + p.stock + ' left' : 'In Stock';
    var stockClass = (p.stock !== undefined && p.stock <= 3) ? 'pc-stock low' : 'pc-stock';

    return '<div class="prod-card" data-product-id="' + p._id + '" onclick="goToProduct(\'' + p._id + '\',\'' + escapedName + '\',' + p.price + ',\'' + (p.image || '') + '\',\'' + (p.capacity || '') + '\')">' +
      '<div class="pc-img-wrap">' +
      '<img class="pc-img" src="' + imgSrc + '" alt="' + escapeHtml(p.name) + '" loading="lazy" onerror="this.src=\'' + FALLBACK_IMG + '\'">' +
      topBadge + wishlistBtn +
      '</div>' +
      '<div class="pc-body">' +
      '<div class="pc-name">' + escapeHtml(p.name) + '</div>' +
      renderStars(p.rating) +
      (p.capacity ? '<div class="pc-vol">' + escapeHtml(p.capacity) + '</div>' : '') +
      (p.country ? '<div class="pc-country">' + escapeHtml(p.country) + '</div>' : '') +
      '<div class="pc-price-wrap">' +
      (savePercent > 0 ? '<span class="pc-price-old">KES ' + original.toLocaleString() + '</span>' : '') +
      '<span class="pc-price-new">KES ' + p.price.toLocaleString() + '</span>' +
      '</div>' +
      '<div class="' + stockClass + '">' + stockText + '</div>' +
      variantHtml +
      '<button class="atc-btn" onclick="event.stopPropagation();addToCart(\'' + p._id + '\',\'' + escapedName + '\',' + p.price + ',\'' + (p.capacity || '') + '\')"><i class="ph ph-plus"></i> Add</button>' +
      '<div class="click-hint">Click for details →</div>' +
      '</div></div>';
  }

    window.updateVariantPrice = function(select, productId) {
    var price = parseFloat(select.options[select.selectedIndex].dataset.price);
    var size = select.options[select.selectedIndex].value;
    var product = ALL_PRODUCTS.find(function(p) { return p._id === productId; });
    if (!product) return;
    product.price = price;
    product.capacity = size;
    var card = select.closest('.prod-card');
    if (!card) return;
    var priceNew = card.querySelector('.pc-price-new');
    if (priceNew) priceNew.textContent = 'KES ' + price.toLocaleString();
    var atcBtn = card.querySelector('.atc-btn');
    if (atcBtn) {
      atcBtn.setAttribute('onclick', "event.stopPropagation();addToCart('" + productId + "','" + escapeHtml(product.name).replace(/'/g, "\\'") + "'," + price + ",'" + size + "')");
    }
    card.setAttribute('onclick', "goToProduct('" + productId + "','" + escapeHtml(product.name).replace(/'/g, "\\'") + "'," + price + ",'" + (product.image || '') + "','" + size + "')");
  };

  window.goToProduct = function(id, name, price, image, capacity) {
    trackRecentlyViewed(id, name, price, image, capacity);
    window.location.href = 'product-details.html?id=' + id;
  };

  function trackRecentlyViewed(id, name, price, image, capacity) {
    try {
      var list = JSON.parse(localStorage.getItem('liquorbelle_recently_viewed') || '[]');
      list = list.filter(function(item) { return item.id !== id; });
      list.unshift({ id: id, name: name, price: price, image: image, capacity: capacity });
      if (list.length > 10) list = list.slice(0, 10);
      localStorage.setItem('liquorbelle_recently_viewed', JSON.stringify(list));
    } catch (e) {}
  }

  function renderRecentlyViewed() {
    var section = document.getElementById('recentlyViewedSection');
    var scroll = document.getElementById('recentlyViewedScroll');
    if (!section || !scroll) return;
    var list = [];
    try { list = JSON.parse(localStorage.getItem('liquorbelle_recently_viewed') || '[]'); } catch (e) {}
    if (!list.length) { section.style.display = 'none'; return; }
    section.style.display = 'block';
    scroll.innerHTML = list.map(function(p) {
      var imgSrc = p.image ? optimizeImage(p.image, 200) : FALLBACK_IMG;
      return '<div class="recently-item" onclick="goToProduct(\'' + p.id + '\',\'' + escapeHtml(p.name).replace(/'/g, "\\'") + '\',' + p.price + ',\'' + (p.image || '') + '\',\'' + (p.capacity || '') + '\')">' +
        '<div class="recently-img-wrap"><img class="recently-img" src="' + imgSrc + '" loading="lazy" alt="' + escapeHtml(p.name) + '"></div>' +
        '<div class="recently-info"><div class="recently-name">' + escapeHtml(p.name) + '</div><div class="recently-price">KES ' + p.price.toLocaleString() + '</div></div></div>';
    }).join('');
  }

  // ============================================================
  // INIT BOTTOM NAV
  // ============================================================
  document.addEventListener('DOMContentLoaded', function() {
    updateBottomNav();
    updateMobileMenuAuth();
    updateCartUI();
  });


  window.loadDeliverySettingsShop = function() {
    fetch(API_BASE + '/api/delivery-settings')
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success && data.settings) {
          deliverySettings = data.settings;
          updateCartUI();
        }
      })
      .catch(function() {});
  };

  var catParam = getQueryParam('cat');
  var searchParam = getQueryParam('search');
  
  // Ensure categoriesShop has data first
  if (!categoriesShop || categoriesShop.length === 0) {
    var cached = localStorage.getItem('liquorbelle_categories');
    if (cached) {
      try {
        categoriesShop = JSON.parse(cached);
      } catch(e) {}
    }
    if (!categoriesShop || categoriesShop.length === 0) {
      categoriesShop = getDefaultCategories();
    }
  }
  
  // Set category from URL param or default to 'all'
  if (catParam) {
    var catKey = catParam.toLowerCase();
    var validCategory = categoriesShop.some(function(c) { return c.cat === catKey; });
    currentFilters.category = validCategory ? catKey : 'all';
    currentCategory = currentFilters.category;
  } else {
    currentFilters.category = 'all';
    currentCategory = 'all';
  }
  
  if (searchParam) {
    currentFilters.search = searchParam;
  }

  renderCatChips();
  loadProductsShop();
  loadDeliverySettingsShop();
  updateCartUI();
}
// ============================================================
// PRODUCT-DETAILS.HTML - COMPLETE JAVASCRIPT
// ============================================================
if (document.getElementById('productImage')) {
  
  var productId = getQueryParam('id');
  var currentProduct = null;
  var selectedVariant = null;
  var quantity = 1;
  var allProducts = [];

  function getCachedProduct() {
    try {
      var cached = localStorage.getItem('liquorbelle_product_' + productId);
      if (!cached) return null;
      var data = JSON.parse(cached);
      if (Date.now() - data.timestamp > CACHE_DURATION) {
        localStorage.removeItem('liquorbelle_product_' + productId);
        return null;
      }
      return data.product;
    } catch (e) { return null; }
  }

  function setCachedProduct(product) {
    try {
      localStorage.setItem('liquorbelle_product_' + productId, JSON.stringify({ product: product, timestamp: Date.now() }));
    } catch (e) {}
  }

  // ===== RENDER GOLDEN STARS - Using Phosphor =====
function renderStars(rating) {
  var fullStars = Math.floor(rating);
  var hasHalfStar = rating % 1 >= 0.5;
  var emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  var html = '';
  
  // Full stars
  for (var i = 0; i < fullStars; i++) {
    html += '<i class="ph-fill ph-star" style="color:#F59E0B;font-size:18px;"></i>';
  }
  
  // Half star
  if (hasHalfStar) {
    html += '<i class="ph ph-star-half" style="color:#F59E0B;font-size:18px;"></i>';
  }
  
  // Empty stars
  for (var i = 0; i < emptyStars; i++) {
    html += '<i class="ph ph-star" style="color:#d1d5db;font-size:18px;opacity:0.5;"></i>';
  }
  
  return html;
}

  window.loadProduct = function() {
    if (!productId) { toast('Product not found'); return; }

    var cachedProduct = getCachedProduct();
    if (cachedProduct) {
      currentProduct = cachedProduct;
      renderProductDetails();
      renderRelatedProducts();
      renderDontForgetSuggestions();
      fetchFreshProduct();
      return;
    }

    fetch(API_BASE + '/api/db/products')
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success && data.products) {
          allProducts = data.products;
          currentProduct = allProducts.find(function(p) { return p._id === productId; });
          if (currentProduct) {
            setCachedProduct(currentProduct);
            renderProductDetails();
            renderRelatedProducts();
            renderDontForgetSuggestions();
          } else { toast('Product not found'); }
        }
      })
      .catch(function(e) { toast('Error loading product'); });
  };

  function fetchFreshProduct() {
    fetch(API_BASE + '/api/db/products')
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success && data.products) {
          allProducts = data.products;
          var freshProduct = allProducts.find(function(p) { return p._id === productId; });
          if (freshProduct) {
            currentProduct = freshProduct;
            setCachedProduct(freshProduct);
            renderProductDetails();
            renderRelatedProducts();
            renderDontForgetSuggestions();
          }
        }
      })
      .catch(function() {});
  }

  window.renderProductDetails = function() {
    var name = currentProduct.name;
    var category = currentProduct.category || '';

    document.getElementById('productName').innerText = name;
    document.getElementById('productCategory').innerText = category;

    // ===== DESCRIPTION =====
    var descEl = document.getElementById('productDescription');
    var descText = document.getElementById('descText');

    if (currentProduct.description && currentProduct.description.trim().length > 0) {
      descText.textContent = currentProduct.description;
      descText.className = 'desc-text';
      descEl.style.display = 'block';
    } else {
      descText.textContent = 'No description available for this product.';
      descText.className = 'desc-text desc-empty';
      descEl.style.display = 'block';
    }

    var imgData = getResponsiveImage(currentProduct.image);
    var imgEl = document.getElementById('productImage');
    if (imgData.src) {
      imgEl.src = imgData.src;
      imgEl.srcset = imgData.srcset;
      imgEl.sizes = imgData.sizes;
      imgEl.onerror = function() { this.src = FALLBACK_IMG; };
    } else {
      imgEl.src = FALLBACK_IMG;
    }

    var catSpan = document.getElementById('breadcrumbCategory');
    var prodSpan = document.getElementById('breadcrumbProduct');
    if (catSpan) catSpan.innerText = category.charAt(0).toUpperCase() + category.slice(1);
    if (prodSpan) prodSpan.innerText = name;

    var rating = currentProduct.rating || 4.0;
    document.getElementById('starsContainer').innerHTML = renderStars(rating);
    document.getElementById('ratingText').innerText = rating.toFixed(1) + ' out of 5 stars';

    var badgeContainer = document.getElementById('productBadge');
    if (currentProduct.badge) {
      var badgeText = currentProduct.badge === 'hot' ? '🔥 Hot Deal' : currentProduct.badge === 'local' ? '🇰🇪 Local Favorite' : '⭐ Premium';
      badgeContainer.innerHTML = '<div class="product-badge badge-' + currentProduct.badge + '">' + badgeText + '</div>';
    } else { badgeContainer.innerHTML = ''; }

    var variants = currentProduct.variants || [];
    variants.sort(function(a, b) {
      if (a.flavour && b.flavour) return a.flavour.localeCompare(b.flavour);
      if (a.flavour) return -1;
      if (b.flavour) return 1;
      return 0;
    });

    var variantContainer = document.getElementById('variantButtons');
    if (!variants.length) { variantContainer.innerHTML = '<p>No variants available</p>'; return; }

    var html = '';
    for (var i = 0; i < variants.length; i++) {
      var v = variants[i];
      var flavour = v.flavour || '';
      var size = v.size || '';
      html += '<button class="variant-btn" ' +
        'data-flavour="' + escapeHtml(flavour) + '" ' +
        'data-size="' + escapeHtml(size) + '" ' +
        'data-price="' + v.price + '" ' +
        'data-discount="' + (v.discount || 0) + '" ' +
        'onclick="selectVariant(\'' + escapeHtml(flavour).replace(/'/g, "\\'") + '\', \'' + escapeHtml(size).replace(/'/g, "\\'") + '\', ' + v.price + ', ' + (v.discount || 0) + ')">' +
        (flavour ? '<span class="flavour">' + escapeHtml(flavour) + '</span>' : '') +
        '<span class="size">' + escapeHtml(size) + '</span>' +
        '</button>';
    }
    variantContainer.innerHTML = html;

    if (variants.length) {
      var first = variants[0];
      selectVariant(first.flavour || '', first.size || '', first.price, first.discount || 0);
    }
  };

  window.selectVariant = function(flavour, size, price, discount) {
    selectedVariant = { flavour: flavour, size: size, price: price, discount: discount };

    var btns = document.querySelectorAll('.variant-btn');
    for (var i = 0; i < btns.length; i++) {
      var btn = btns[i];
      var btnFlavour = btn.dataset.flavour || '';
      var btnSize = btn.dataset.size || '';
      var isSelected = (btnFlavour === flavour && btnSize === size);
      btn.classList.toggle('selected', isSelected);
    }

    var hasDiscount = discount > 0;
    var discountedPrice = hasDiscount ? Math.round(price * (100 - discount) / 100) : price;
    var originalPrice = price;

    var priceOld = document.getElementById('priceOld');
    var priceNew = document.getElementById('priceNew');
    var discountBadge = document.getElementById('discountBadge');

    if (hasDiscount) {
      priceOld.style.display = 'inline';
      priceOld.innerHTML = 'KES ' + originalPrice.toLocaleString();
      priceNew.innerHTML = 'KES ' + discountedPrice.toLocaleString();
      discountBadge.style.display = 'inline';
      discountBadge.innerHTML = '-' + discount + '%';
    } else {
      priceOld.style.display = 'none';
      priceNew.innerHTML = 'KES ' + price.toLocaleString();
      discountBadge.style.display = 'none';
    }
  };

  window.increaseQty = function() { if (quantity < 10) { quantity++; document.getElementById('qtyValue').innerText = quantity; } };
  window.decreaseQty = function() { if (quantity > 1) { quantity--; document.getElementById('qtyValue').innerText = quantity; } };

  window.addToCartFromDetail = function() {
    if (!currentProduct || !selectedVariant) { toast('Select a variant'); return; }
    var id = currentProduct._id;
    var priceToAdd = selectedVariant.discount > 0 ? Math.round(selectedVariant.price * (100 - selectedVariant.discount) / 100) : selectedVariant.price;
    var variantLabel = selectedVariant.flavour + ' ' + selectedVariant.size;
    if (cart[id]) { cart[id].qty += quantity; } else { cart[id] = { id: id, name: currentProduct.name, price: priceToAdd, qty: quantity, capacity: selectedVariant.size, size: selectedVariant.size, flavour: selectedVariant.flavour }; }
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartUI();
    toast(quantity + '× ' + currentProduct.name + ' (' + variantLabel + ') added ✓');
  };

  window.buyNow = function() {
    if (!currentProduct || !selectedVariant) { toast('Select a variant'); return; }
    var id = currentProduct._id;
    var priceToAdd = selectedVariant.discount > 0 ? Math.round(selectedVariant.price * (100 - selectedVariant.discount) / 100) : selectedVariant.price;
    if (cart[id]) { cart[id].qty += quantity; } else { cart[id] = { id: id, name: currentProduct.name, price: priceToAdd, qty: quantity, capacity: selectedVariant.size, size: selectedVariant.size, flavour: selectedVariant.flavour }; }
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    window.location.href = 'checkout.html';
  };

  window.shareProductWhatsApp = function() {
    if (!currentProduct || !selectedVariant) return;
    var url = window.location.href;
    var flavour = selectedVariant.flavour || '';
    var size = selectedVariant.size || '';
    var price = selectedVariant.discount > 0 ? Math.round(selectedVariant.price * (100 - selectedVariant.discount) / 100) : selectedVariant.price;
    var text = '🍾 ' + currentProduct.name + (flavour ? ' (' + flavour + ')' : '') + ' at LiquorBelle! ' + size + ' - KES ' + price.toLocaleString() + '\n' + url;
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
  };

  window.copyProductLink = function() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).then(function() {
        var t = document.getElementById('shareToast');
        if (t) { t.innerText = '✅ Link copied!'; t.style.opacity = '1'; setTimeout(function() { t.style.opacity = '0'; }, 2000); }
      });
    } else {
      var input = document.createElement('input');
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      var t = document.getElementById('shareToast');
      if (t) { t.innerText = '✅ Link copied!'; t.style.opacity = '1'; setTimeout(function() { t.style.opacity = '0'; }, 2000); }
    }
  };

  window.renderDontForgetSuggestions = function() {
    if (!allProducts.length || !currentProduct) return;

    var extraCategories = ['accessory', 'juice', 'soda', 'water', 'energy', 'cigar'];
    var suggestions = allProducts.filter(function(p) {
      return p._id !== currentProduct._id && extraCategories.indexOf(p.category) !== -1;
    });
    suggestions = shuffleArray(suggestions).slice(0, 4);

    var section = document.getElementById('dontForgetSection');
    var grid = document.getElementById('dontForgetGrid');
    if (!suggestions.length) {
      if (section) section.style.display = 'none';
      return;
    }
    section.style.display = 'block';

    var html = '';
    for (var i = 0; i < suggestions.length; i++) {
      var p = suggestions[i];
      var price = p.variants?.[0]?.price || 0;
      var imgSrc = p.image ? optimizeImage(p.image, 300) : FALLBACK_IMG;
      var tag = p.category === 'accessory' ? 'Accessory' : p.category === 'juice' ? 'Mixer' : p.category === 'soda' ? 'Fizzy' : p.category === 'water' ? 'Water' : p.category === 'cigar' ? 'Cigar' : 'Extra';

      html += '<div class="dont-forget-card" onclick="window.location.href=\'product-details.html?id=' + p._id + '\'">' +
        '<div class="card-img-wrap">' +
        '<div class="suggestion-tag">' + tag + '</div>' +
        '<img src="' + imgSrc + '" onerror="this.src=\'' + FALLBACK_IMG + '\'" loading="lazy" alt="' + escapeHtml(p.name) + '">' +
        '</div>' + '<div class="card-info">' +
        '<div class="name">' + escapeHtml(p.name) + '</div>' + '<div class="price">KES ' + price.toLocaleString() + '</div>' +
        '<button class="add-btn" onclick="event.stopPropagation();addToCart(\'' + p._id + '\',\'' + escapeHtml(p.name).replace(/'/g, "\\'") + '\',' + price + ',\'' + (p.variants?.[0]?.size || '') + '\')">' +
        '<i class="ph ph-plus"></i> Add' +
        '</button>' +
        '</div>' +
        '</div>';
    }
    grid.innerHTML = html;
  };

  function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return array;
  }

  window.renderRelatedProducts = function() {
    if (!allProducts.length || !currentProduct) return;
    var related = allProducts.filter(function(p) { return p._id !== currentProduct._id && p.category === currentProduct.category; }).slice(0, 4);
    var section = document.getElementById('relatedSection');
    var grid = document.getElementById('relatedGrid');

    if (!related.length) {
      var fallback = allProducts.filter(function(p) { return p._id !== currentProduct._id; }).slice(0, 4);
      if (!fallback.length) return;
      section.style.display = 'block';
      var html = '';
      for (var i = 0; i < fallback.length; i++) {
        var p = fallback[i];
        var price = p.variants?.[0]?.price || 0;
        var imgSrc = p.image ? optimizeImage(p.image, 300) : FALLBACK_IMG;
        html += '<div class="related-card" onclick="window.location.href=\'product-details.html?id=' + p._id + '\'">' +
          '<div class="card-img-wrap"><img src="' + imgSrc + '" onerror="this.src=\'' + FALLBACK_IMG + '\'" loading="lazy" alt="' + escapeHtml(p.name) + '"></div>' +
          '<div class="card-info"><div class="name">' + escapeHtml(p.name) + '</div><div class="price">KES ' + price.toLocaleString() + '</div></div></div>';
      }
      grid.innerHTML = html;
      return;
    }
    section.style.display = 'block';
    var html = '';
    for (var i = 0; i < related.length; i++) {
      var p = related[i];
      var price = p.variants?.[0]?.price || 0;
      var imgSrc = p.image ? optimizeImage(p.image, 300) : FALLBACK_IMG;
      html += '<div class="related-card" onclick="window.location.href=\'product-details.html?id=' + p._id + '\'">' +
        '<div class="card-img-wrap"><img src="' + imgSrc + '" onerror="this.src=\'' + FALLBACK_IMG + '\'" loading="lazy" alt="' + escapeHtml(p.name) + '"></div>' +
        '<div class="card-info"><div class="name">' + escapeHtml(p.name) + '</div><div class="price">KES ' + price.toLocaleString() + '</div></div></div>';
    }
    grid.innerHTML = html;
  };

  loadProduct();
  updateCartUI();
  setInterval(updateCartUI, 3000);
}

// ============================================================
// CHECKOUT.HTML — UPDATED WITH POD SUPPORT
// ============================================================
if (document.getElementById('customerEmail')) {
  
  var deliverySettings = { delivery_fee: 150, free_delivery_threshold: 3000, delivery_enabled: true };
  var selectedPayment = 'mpesa';

  var areaDeliveryFees = {
    'dagoretti': 0,
    'karen': 50,
    'westlands': 100,
    'cbd': 80,
    'upperhill': 70,
    'kilimani': 60,
    'lavington': 80,
    'kileleshwa': 70,
    'rongai': 120,
    'ngong': 150,
    'south b': 100,
    'langata': 130,
    'waithaka': 140,
    'kikuyu': 160,
    'runda': 180
  };

  function getDeliveryFee(area) {
    if (!area) return deliverySettings.delivery_fee;
    var key = area.trim().toLowerCase();
    var fee = areaDeliveryFees[key];
    if (fee !== undefined) return fee;
    return deliverySettings.delivery_fee;
  }

  function calculateTotals() {
    var items = Object.values(cart);
    var subtotal = 0;
    for (var i = 0; i < items.length; i++) {
      subtotal = subtotal + items[i].price * items[i].qty;
    }
    var areaInput = document.getElementById('deliveryArea');
    var area = areaInput ? areaInput.value.trim() : '';
    var baseDelivery = getDeliveryFee(area);
    var delivery = 0;
    var isFreeDelivery = false;

    if (deliverySettings.delivery_enabled) {
      if (subtotal >= deliverySettings.free_delivery_threshold) {
        delivery = 0;
        isFreeDelivery = true;
      } else {
        delivery = baseDelivery;
        if (!area) delivery = deliverySettings.delivery_fee;
      }
    }
    return { subtotal: subtotal, delivery: delivery, total: subtotal + delivery, isFreeDelivery: isFreeDelivery };
  }

  window.renderCartSummary = function() {
    var items = Object.values(cart);
    var container = document.getElementById('cartSummaryItems');
    if (items.length === 0) {
      container.innerHTML = '<div class="empty-cart"><i class="ph ph-shopping-bag-open"></i><p>Your cart is empty</p><a href="shop.html" style="color:var(--primary);font-weight:700;">Continue Shopping →</a></div>';
      document.getElementById('subtotalAmount').innerText = 'KES 0';
      document.getElementById('deliveryFee').innerText = 'KES 0';
      document.getElementById('totalAmount').innerText = 'KES 0';
      document.getElementById('freeDeliveryNote').innerHTML = '';
      document.getElementById('deliveryProgressContainer').innerHTML = '';
      return;
    }
    var html = '';
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      html += '<div class="cart-item-checkout"><span class="item-name">' + escapeHtml(item.name) + ' <small>x' + item.qty + '</small></span><span class="item-price">KES ' + (item.price * item.qty).toLocaleString() + '</span></div>';
    }
    container.innerHTML = html;

    var totals = calculateTotals();
    var subtotal = totals.subtotal;
    var delivery = totals.delivery;
    var total = totals.total;
    var isFree = totals.isFreeDelivery;

    document.getElementById('subtotalAmount').innerText = 'KES ' + subtotal.toLocaleString();
    var deliveryText = (delivery === 0) ? 'FREE' : 'KES ' + delivery.toLocaleString();
    document.getElementById('deliveryFee').innerText = deliveryText;
    document.getElementById('totalAmount').innerText = 'KES ' + total.toLocaleString();

    if (deliverySettings.delivery_enabled && !isFree && subtotal > 0) {
      var remaining = deliverySettings.free_delivery_threshold - subtotal;
      document.getElementById('freeDeliveryNote').innerHTML = '✨ Add KES ' + remaining.toLocaleString() + ' more for FREE delivery';
    } else if (isFree && subtotal > 0) {
      document.getElementById('freeDeliveryNote').innerHTML = '🎉 FREE Delivery applied!';
    } else {
      document.getElementById('freeDeliveryNote').innerHTML = '';
    }

    var progContainer = document.getElementById('deliveryProgressContainer');
    if (progContainer) {
      if (isFree) {
        progContainer.innerHTML = '<div class="delivery-progress unlocked"><strong>🎉 Free delivery applied!</strong><div class="delivery-progress-bar"><div class="delivery-progress-fill" style="width:100%;"></div></div></div>';
      } else {
        var pct = Math.min((subtotal / deliverySettings.free_delivery_threshold) * 100, 100);
        var remaining = deliverySettings.free_delivery_threshold - subtotal;
        if (remaining > 0) {
          progContainer.innerHTML = '<div class="delivery-progress">Add KES ' + remaining.toLocaleString() + ' more for <strong>FREE delivery</strong><div class="delivery-progress-bar"><div class="delivery-progress-fill" style="width:' + pct + '%;"></div></div></div>';
        } else {
          progContainer.innerHTML = '<div class="delivery-progress unlocked"><strong>🎉 Free delivery unlocked!</strong><div class="delivery-progress-bar"><div class="delivery-progress-fill" style="width:100%;"></div></div></div>';
        }
      }
    }
  };

  function loadDeliverySettings() {
    fetch(API_BASE + '/api/delivery-settings')
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success && data.settings) {
          deliverySettings = data.settings;
          renderCartSummary();
        }
      })
      .catch(function() {});
  }

  function getAddressFromCoords(lat, lng) {
    return fetch(API_BASE + '/api/geocode/reverse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: lat, lng: lng })
    })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data && data.address) {
          var addr = data.address;
          var street = addr.road || addr.pedestrian || addr.footway || '';
          if (!street) { street = addr.neighbourhood || addr.suburb || addr.city || ''; }
          var area = addr.suburb || addr.neighbourhood || addr.village || addr.town || addr.city || '';
          if (!area) { area = addr.county || addr.state || addr.region || ''; }
          if (!area) area = 'Nairobi';
          var areaClean = area.replace(/\s*(ward|division|sub-county|constituency|location)\s*/i, '').trim();
          return { street: street || 'Location found', area: areaClean || 'Nairobi' };
        }
        return null;
      })
      .catch(function() { return null; });
  }

  document.getElementById('getLocationBtn')?.addEventListener('click', function() {
    var statusDiv = document.getElementById('locationStatus');
    statusDiv.innerHTML = '<span class="spinner"></span> Getting your exact location...';
    statusDiv.style.color = '#666';

    if (!navigator.geolocation) {
      statusDiv.innerHTML = '❌ Geolocation not supported';
      statusDiv.style.color = '#e03131';
      return;
    }

    navigator.geolocation.getCurrentPosition(function(position) {
      var lat = position.coords.latitude;
      var lng = position.coords.longitude;
      statusDiv.innerHTML = '<span class="spinner"></span> Finding your street address...';

      getAddressFromCoords(lat, lng).then(function(result) {
        if (result) {
          document.getElementById('street').value = result.street;
          document.getElementById('deliveryArea').value = result.area;
          statusDiv.innerHTML = '✅ Location found: ' + result.area;
          statusDiv.style.color = '#2ecc71';
          setTimeout(function() { statusDiv.innerHTML = ''; }, 4000);
          renderCartSummary();
        } else {
          statusDiv.innerHTML = '⚠️ Could not get exact address. Please enter manually.';
          statusDiv.style.color = '#e03131';
        }
      });
    }, function(error) {
      var errorMsg = '❌ Location access denied. Please enter address manually.';
      if (error.code === 1) errorMsg = '❌ Please allow location access to use this feature';
      else if (error.code === 2) errorMsg = '❌ Location unavailable. Please enter manually.';
      else if (error.code === 3) errorMsg = '❌ Location request timed out. Please enter manually.';
      statusDiv.innerHTML = errorMsg;
      statusDiv.style.color = '#e03131';
      setTimeout(function() { statusDiv.innerHTML = ''; }, 5000);
    });
  });

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

  function getFullAddress() {
    var street = document.getElementById('street').value.trim();
    var building = document.getElementById('building').value.trim();
    var parts = [];
    if (building) parts.push(building);
    if (street) parts.push(street);
    return parts.join(', ') || 'Address not specified';
  }

  window.selectPayment = function(method) {
    selectedPayment = method;
    var mpesaOption = document.getElementById('mpesaOption');
    var podOption = document.getElementById('podOption');
    var mpesaInfo = document.getElementById('mpesaInfo');
    var podInfo = document.getElementById('podInfo');
    var hiddenInput = document.getElementById('selectedPaymentMethod');
    
    if (mpesaOption) mpesaOption.classList.toggle('selected', method === 'mpesa');
    if (podOption) podOption.classList.toggle('selected', method === 'pod');
    if (mpesaInfo) mpesaInfo.style.display = method === 'mpesa' ? 'block' : 'none';
    if (podInfo) podInfo.style.display = method === 'pod' ? 'block' : 'none';
    if (hiddenInput) hiddenInput.value = method;
  };

  window.placeOrder = function() {
    var items = Object.values(cart);
    if (items.length === 0) { toast('Your cart is empty'); return; }

    var email = document.getElementById('customerEmail').value.trim();
    var fullName = document.getElementById('fullName').value.trim();
    var phone = document.getElementById('phone').value.trim();
    var street = document.getElementById('street').value.trim();
    var building = document.getElementById('building').value.trim();
    var area = document.getElementById('deliveryArea').value.trim();

    if (!email || email.indexOf('@') === -1) { toast('Please enter a valid email address'); return; }
    if (!fullName) { toast('Please enter your full name'); return; }
    if (!phone) { toast('Please enter your phone number'); return; }
    if (!validatePhone(phone)) { toast('Please enter a valid Kenyan phone number (e.g., 0712345678)'); return; }
    if (!street && !building) { toast('Please enter at least Street OR Building name'); return; }
    if (!area) { toast('Please enter your delivery area (e.g. Dagoretti)'); return; }

    var displayPhone = formatPhoneForDisplay(phone);
    var apiPhone = formatPhoneForAPI(phone);
    var address = getFullAddress() + ', ' + area;
    var totals = calculateTotals();
    var subtotal = totals.subtotal;
    var delivery = totals.delivery;
    var total = totals.total;
    var orderId = 'LB-' + Date.now().toString(36).toUpperCase();
    var timestamp = new Date().toLocaleString('en-KE', { hour12: true, hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });

    var paymentMethodInput = document.getElementById('selectedPaymentMethod');
    var paymentMethod = paymentMethodInput ? paymentMethodInput.value : 'mpesa';

    var btn = document.querySelector('.btn-place');
    var originalHTML = btn.innerHTML;
    btn.innerHTML = '<div class="spinner"></div> Processing...';
    btn.disabled = true;

    if (paymentMethod === 'pod') {
      var podPayload = {
        orderNumber: orderId,
        customerName: fullName,
        customerEmail: email,
        phone: displayPhone,
        address: address,
        notes: '',
        subtotal: subtotal,
        delivery: delivery,
        total: total,
        items: items.map(function(i) {
          return {
            name: i.name,
            product_name: i.name,
            quantity: i.qty,
            price: i.price,
            size: i.size || '750ml'
          };
        })
      };

      fetch(API_BASE + '/api/orders/pod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(podPayload)
      })
        .then(function(res) { return res.json(); })
        .then(function(data) {
          btn.innerHTML = originalHTML;
          btn.disabled = false;
          if (data.success) {
            cart = {};
            localStorage.setItem(CART_KEY, JSON.stringify(cart));
            renderCartSummary();
            updateCartUI();

            var modal = document.getElementById('successModal');
            document.getElementById('successOrderId').textContent = orderId;
            document.getElementById('successMessage').textContent = '✅ Your order has been confirmed. Please have cash ready upon delivery.';
            if (modal) modal.classList.add('active');

            try {
              localStorage.setItem('liquorbelle_last_order', JSON.stringify({ orderId: orderId, total: total, timestamp: Date.now() }));
            } catch(e) {}
          } else {
            toast('❌ ' + (data.message || 'Order failed. Please try again.'), true);
          }
        })
        .catch(function(err) {
          btn.innerHTML = originalHTML;
          btn.disabled = false;
          toast('❌ Network error. Please check your connection.', true);
        });
      return;
    }

    // M-PESA flow
    try {
      var requestData = {
        phone: apiPhone,
        amount: total,
        orderId: orderId,
        customerName: fullName,
        address: address,
        items: items,
        subtotal: subtotal,
        delivery: delivery,
        total: total,
        paymentMethod: 'mpesa',
        customerEmail: email
      };

      fetch(API_BASE + '/api/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })
        .then(function(res) { return res.json(); })
        .then(function(data) {
          if (!data.success) throw new Error(data.message || 'STK push failed');

          toast('📱 Check your phone for M-PESA prompt. Enter PIN to pay. You have 35 seconds to complete payment.');

          var paymentCompleted = false;
          var statusCheckCount = 0;
          var MAX_STATUS_CHECKS = 12;
          var paymentInterval = null;
          var paymentTimeout = null;

          paymentTimeout = setTimeout(function() {
            if (!paymentCompleted) {
              if (paymentInterval) clearInterval(paymentInterval);
              paymentInterval = null;
              btn.innerHTML = originalHTML;
              btn.disabled = false;
              toast('❌ Payment timeout. You did not complete the payment in time. Please try again.', true);
            }
          }, 35000);

          paymentInterval = setInterval(function() {
            if (paymentCompleted) {
              clearInterval(paymentInterval);
              paymentInterval = null;
              return;
            }
            statusCheckCount++;
            if (statusCheckCount > MAX_STATUS_CHECKS) {
              clearInterval(paymentInterval);
              paymentInterval = null;
              if (!paymentCompleted) {
                btn.innerHTML = originalHTML;
                btn.disabled = false;
                toast('❌ Payment confirmation timeout. Please check your M-PESA and contact support.', true);
              }
              return;
            }

            fetch(API_BASE + '/api/status/' + orderId)
              .then(function(res) { return res.json(); })
              .then(function(statusData) {
                if (statusData.status === 'paid') {
                  paymentCompleted = true;
                  clearInterval(paymentInterval);
                  clearTimeout(paymentTimeout);
                  paymentInterval = null;
                  paymentTimeout = null;

                  fetch(API_BASE + '/api/db/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      orderNumber: orderId,
                      customerName: fullName,
                      customerEmail: email,
                      phone: displayPhone,
                      address: address,
                      items: items.map(function(i) { return { product_id: i.id, product_name: i.name, quantity: i.qty, price: i.price, size: i.size || '' }; }),
                      subtotal: subtotal,
                      delivery: delivery,
                      total: total,
                      paymentMethod: 'M-PESA',
                      status: 'paid'
                    })
                  })
                    .then(function() {
                      fetch(API_BASE + '/api/send-order-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          email: email,
                          orderId: orderId,
                          customerName: fullName,
                          phone: displayPhone,
                          items: items.map(function(i) { return { name: i.name, qty: i.qty, price: i.price, size: i.size || '' }; }),
                          subtotal: subtotal,
                          delivery: delivery,
                          total: total,
                          address: address,
                          timestamp: timestamp,
                          paymentMethod: 'mpesa'
                        })
                      });

                      cart = {};
                      localStorage.setItem(CART_KEY, JSON.stringify(cart));
                      renderCartSummary();
                      updateCartUI();
                      btn.innerHTML = originalHTML;
                      btn.disabled = false;

                      var modal = document.getElementById('successModal');
                      document.getElementById('successOrderId').textContent = orderId;
                      document.getElementById('successMessage').textContent = '✅ Payment confirmed! Check your email for order details.';
                      modal.classList.add('active');

                      try {
                        localStorage.setItem('liquorbelle_last_order', JSON.stringify({ orderId: orderId, total: total, timestamp: Date.now() }));
                      } catch(e) {}
                    })
                    .catch(function() {
                      btn.innerHTML = originalHTML;
                      btn.disabled = false;
                      toast('❌ Order saved but email failed. Please contact support.', true);
                    });
                } else if (statusData.status === 'failed') {
                  clearInterval(paymentInterval);
                  clearTimeout(paymentTimeout);
                  paymentInterval = null;
                  paymentTimeout = null;
                  btn.innerHTML = originalHTML;
                  btn.disabled = false;
                  toast('❌ Payment failed. Please try again.', true);
                }
              })
              .catch(function(e) {
                console.error('Status check error:', e);
              });
          }, 3000);
        })
        .catch(function(err) {
          btn.innerHTML = originalHTML;
          btn.disabled = false;
          toast('❌ Failed to initiate payment. Please check your phone number and try again.', true);
        });

    } catch (err) {
      btn.innerHTML = originalHTML;
      btn.disabled = false;
      toast('❌ Failed to initiate payment. Please check your phone number and try again.', true);
    }
  };

  window.closeSuccessModal = function() {
    document.getElementById('successModal').classList.remove('active');
    window.location.href = 'track-orders.html';
  };

  document.getElementById('deliveryArea')?.addEventListener('input', function() {
    renderCartSummary();
  });

  loadDeliverySettings();
  renderCartSummary();
  updateCartUI();

  setInterval(function() {
    renderCartSummary();
    updateCartUI();
  }, 3000);
}


// ============================================================
// TRACK-ORDERS.HTML - AUTO-LOAD ORDERS
// ============================================================
if (document.getElementById('trackEmail')) {
  
  // ============================================================
  // CHECK IF USER IS LOGGED IN AND LOAD ORDERS AUTOMATICALLY
  // ============================================================
  function autoLoadOrders() {
    var user = getCurrentUser();
    var token = getAuthToken();
    
    if (user && token) {
      // Logged in user - fetch orders automatically
      fetchUserOrders();
      return;
    }
    
    // Guest user - show orders from localStorage
    showGuestOrders();
  }

  // ============================================================
  // FETCH ORDERS FOR LOGGED-IN USER
  // ============================================================
  function fetchUserOrders() {
    var container = document.getElementById('ordersContainer');
    var token = getAuthToken();
    
    if (!token) {
      container.innerHTML = '<div class="empty-state"><i class="ph ph-lock"></i><p>Please login to see your orders</p></div>';
      return;
    }
    
    container.innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div> Loading your orders...</div>';
    
    fetch(API_BASE + '/api/customers/me/orders', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function(res) {
      if (res.status === 401 || res.status === 403) {
        // Token expired - logout and show guest orders
        logoutUser();
        showGuestOrders();
        return null;
      }
      return res.json();
    })
    .then(function(data) {
      if (!data) return;
      if (data.success && data.orders && data.orders.length > 0) {
        renderOrders(data.orders);
        document.getElementById('myAccountSection').style.display = 'block';
        var user = getCurrentUser();
        if (user) {
          document.getElementById('accountName').textContent = user.name || '—';
          document.getElementById('accountEmail').textContent = user.email || '—';
          document.getElementById('accountPhone').textContent = user.phone || '—';
          document.getElementById('accountOrderCount').textContent = data.orders.length;
        }
      } else {
        container.innerHTML = '<div class="empty-state"><i class="ph ph-package"></i><p>No orders found</p><small>Your orders will appear here once you place one.</small></div>';
      }
    })
    .catch(function(e) {
      console.error('Error loading orders:', e);
      container.innerHTML = '<div class="empty-state"><i class="ph ph-wifi-slash"></i><p>Could not load orders</p><small>Please check your connection and try again.</small></div>';
    });
  }

  // ============================================================
  // SHOW GUEST ORDERS FROM LOCAL STORAGE
  // ============================================================
  function showGuestOrders() {
    var container = document.getElementById('ordersContainer');
    var lastOrder = localStorage.getItem('liquorbelle_last_order');
    
    if (lastOrder) {
      try {
        var order = JSON.parse(lastOrder);
        var orderDate = new Date(order.timestamp || Date.now());
        var daysAgo = (Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysAgo > 7) {
          container.innerHTML = '<div class="empty-state"><i class="ph ph-package"></i><p>No recent orders</p><small>Your orders older than 7 days are not stored locally.</small></div>';
          return;
        }
        
        // Show guest order card
        container.innerHTML = 
          '<div style="text-align:center;padding:20px 0 10px;">' +
          '<span style="background:var(--gold-bg);padding:4px 14px;border-radius:30px;font-size:.65rem;font-weight:600;color:var(--gold);border:1px solid var(--gold);">👤 Guest Order</span>' +
          '</div>' +
          '<div class="orders-list">' +
          '<div class="order-card">' +
          '<div class="order-header">' +
          '<div><div class="order-number">📦 Order #' + escapeHtml(order.orderId || 'LB-??????') + '</div>' +
          '<div class="order-date">📅 ' + orderDate.toLocaleDateString() + ' at ' + orderDate.toLocaleTimeString() + '</div></div>' +
          '<span class="order-status status-paid">✅ Paid</span>' +
          '</div>' +
          '<div class="order-items">' +
          '<div class="order-item"><div><div class="order-item-name">Order Total</div></div><div class="order-item-price">KES ' + (order.total || 0).toLocaleString() + '</div></div>' +
          '</div>' +
          '<div class="order-footer">' +
          '<div class="order-total-row"><span>Total</span><span>KES ' + (order.total || 0).toLocaleString() + '</span></div>' +
          '</div>' +
          '</div>' +
          '</div>';
      } catch(e) {
        container.innerHTML = '<div class="empty-state"><i class="ph ph-package"></i><p>No orders found</p></div>';
      }
    } else {
      container.innerHTML = '<div class="empty-state"><i class="ph ph-package"></i><p>No orders found</p><small>Your orders will appear here once you place one.</small></div>';
    }
  }

  // ============================================================
  // GUEST ORDER CARD (Recent order from localStorage - DEPRECATED)
  // ============================================================
  function showGuestOrderCard() {
    // This is now handled by showGuestOrders() above
    // Keeping for compatibility
    showGuestOrders();
  }

  window.quickTrackOrder = function(orderId) {
    if (!orderId) return;
    document.getElementById('trackOrderId').value = orderId;
    trackByOrderId();
  };

  // ============================================================
  // ORDER STATUS STEPS
  // ============================================================
  function updateStatusSteps(status) {
    var steps = ['step1', 'step2', 'step3', 'step4'];
    var labels = ['label1', 'label2', 'label3', 'label4'];
    var stepMap = { 'pending': 0, 'paid': 1, 'delivered': 3 };
    var activeIndex = stepMap[status] !== undefined ? stepMap[status] : 0;

    for (var i = 0; i < steps.length; i++) {
      var dot = document.getElementById(steps[i]);
      var label = document.getElementById(labels[i]);
      if (i <= activeIndex) {
        dot.classList.add('active');
        dot.classList.remove('done');
        label.classList.add('active');
      } else {
        dot.classList.remove('active', 'done');
        label.classList.remove('active');
      }
    }
  }

  // ============================================================
  // TRACK BY EMAIL (Guest users)
  // ============================================================
  window.trackByEmail = function() {
    var email = document.getElementById('trackEmail').value.trim();
    if (!email) { toast('Please enter your email address'); return; }
    if (!email.includes('@')) { toast('Please enter a valid email'); return; }
    fetchOrdersByEmail(email);
  };

  // ============================================================
  // TRACK BY ORDER ID
  // ============================================================
  window.trackByOrderId = function() {
    var orderId = document.getElementById('trackOrderId').value.trim();
    if (!orderId) { toast('Please enter your Order ID (e.g. LB-12345678)'); return; }
    fetchOrdersByOrderId(orderId);
  };

  // ============================================================
  // FETCH ORDERS BY EMAIL (Guest)
  // ============================================================
  function fetchOrdersByEmail(email) {
    var container = document.getElementById('ordersContainer');
    container.innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div> Searching for orders...</div>';

    fetch(API_BASE + '/api/orders/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.success && data.orders && data.orders.length > 0) {
        renderOrders(data.orders);
      } else {
        container.innerHTML = '<div class="empty-state"><i class="ph ph-package"></i><p>No orders found for this email</p><small>Try checking your email address or Order ID</small></div>';
      }
    })
    .catch(function(e) {
      console.error('Error tracking orders:', e);
      container.innerHTML = '<div class="empty-state"><i class="ph ph-wifi-slash"></i><p>Error loading orders. Please try again.</p></div>';
    });
  }

  // ============================================================
  // FETCH ORDERS BY ORDER ID
  // ============================================================
  function fetchOrdersByOrderId(orderId) {
    var container = document.getElementById('ordersContainer');
    container.innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div> Searching for order...</div>';

    fetch(API_BASE + '/api/orders/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: orderId })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.success && data.orders && data.orders.length > 0) {
        renderOrders(data.orders);
      } else {
        container.innerHTML = '<div class="empty-state"><i class="ph ph-package"></i><p>No order found with ID: ' + escapeHtml(orderId) + '</p><small>Please check your Order ID and try again</small></div>';
      }
    })
    .catch(function(e) {
      console.error('Error tracking orders:', e);
      container.innerHTML = '<div class="empty-state"><i class="ph ph-wifi-slash"></i><p>Error loading orders. Please try again.</p></div>';
    });
  }

  // ============================================================
  // RENDER ORDERS LIST
  // ============================================================
  function renderOrders(orders) {
    var container = document.getElementById('ordersContainer');
    var html = '<div class="orders-list">';
    for (var i = 0; i < orders.length; i++) {
      var o = orders[i];
      var items = o.items;
      if (typeof items === 'string') { try { items = JSON.parse(items); } catch(e) { items = []; } }
      if (!items || !items.length) items = [];

      var statusText = o.status === 'pending' ? '⏳ Pending' : (o.status === 'paid' ? '✅ Paid' : (o.status === 'delivered' ? '🚚 Delivered' : '❌ Cancelled'));
      var statusClass = o.status === 'pending' ? 'status-pending' : (o.status === 'paid' ? 'status-paid' : (o.status === 'delivered' ? 'status-delivered' : 'status-cancelled'));

      var deliveryFee = o.delivery || 0;
      var subtotal = o.subtotal || (o.total - deliveryFee);
      var deliveryDisplay = deliveryFee === 0 ? '<span style="color:#1A8A3E;">FREE</span>' : 'KES ' + deliveryFee.toLocaleString();

      var orderNumber = o.order_number || (o._id ? 'LB-' + o._id.slice(-8).toUpperCase() : 'N/A');

      html += '<div class="order-card">';
      html += '<div class="order-header">';
      html += '<div><div class="order-number">📦 Order #' + orderNumber + '</div>';
      html += '<div class="order-date">📅 ' + new Date(o.created_at).toLocaleDateString() + ' at ' + new Date(o.created_at).toLocaleTimeString() + '</div>';
      html += '<div class="order-breakdown"><i class="ph ph-credit-card"></i> ' + (o.payment_method || 'M-PESA') + '</div></div>';
      html += '<span class="order-status ' + statusClass + '">' + statusText + '</span>';
      html += '</div>';
      html += '<div class="order-items">';
      for (var j = 0; j < items.length; j++) {
        var item = items[j];
        var itemName = item.product_name || item.name || 'Product';
        var itemQty = item.quantity || item.qty || 1;
        var itemPrice = item.price || 0;
        html += '<div class="order-item"><div><div class="order-item-name">' + escapeHtml(itemName) + (item.size ? ' (' + item.size + ')' : '') + '</div><div class="order-item-qty">Quantity: ' + itemQty + '</div></div><div class="order-item-price">KES ' + (itemPrice * itemQty).toLocaleString() + '</div></div>';
      }
      html += '</div>';
      html += '<div class="order-footer">';
      html += '<div class="order-total-row"><span>Subtotal</span><span>KES ' + (subtotal || 0).toLocaleString() + '</span></div>';
      html += '<div class="order-total-row"><span>Delivery Fee</span><span>' + deliveryDisplay + '</span></div>';
      html += '<div class="order-total-row"><span>Total</span><span>KES ' + (o.total || 0).toLocaleString() + '</span></div>';
      html += '</div>';
      html += '</div>';
    }
    html += '</div>';
    container.innerHTML = html;
  }

  // ============================================================
  // INIT - AUTO LOAD ORDERS ON PAGE LOAD
  // ============================================================
  function initTrackOrders() {
    updateStatusSteps('pending');
    autoLoadOrders();
    updateCartUI();
    
    // Set interval to refresh cart UI
    setInterval(updateCartUI, 3000);
  }

  // ============================================================
  // QUERY PARAM HANDLING (email or orderId from URL)
  // ============================================================
  var emailParam = getQueryParam('email');
  var orderIdParam = getQueryParam('orderId');
  if (emailParam) {
    document.getElementById('trackEmail').value = emailParam;
    setTimeout(function() { fetchOrdersByEmail(emailParam); }, 500);
  } else if (orderIdParam) {
    document.getElementById('trackOrderId').value = orderIdParam;
    setTimeout(function() { fetchOrdersByOrderId(orderIdParam); }, 500);
  }

  // ============================================================
  // EVENT LISTENERS
  // ============================================================
  document.getElementById('trackEmail')?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') trackByEmail();
  });
  document.getElementById('trackOrderId')?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') trackByOrderId();
  });

  // ============================================================
  // START
  // ============================================================
  initTrackOrders();
}
// ============================================================
// SERVICE WORKER REGISTRATION - ENHANCED
// ============================================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    // Only register on secure origins (HTTPS or localhost)
    if (window.location.protocol === 'file:') {
      console.log('[SW] Skipping registration on file:// protocol');
      return;
    }

    navigator.serviceWorker.register('/liquorbelle/sw.js', {
      scope: '/liquorbelle/'
    })
    .then(function(reg) {
      console.log('[SW] Registered successfully:', reg);
      
      // Check for updates
      reg.addEventListener('updatefound', function() {
        var newWorker = reg.installing;
        console.log('[SW] Update found!');
        
        newWorker.addEventListener('statechange', function() {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[SW] New version available!');
            // Optionally show a notification to the user
            if (typeof toast === 'function') {
              toast('🔄 New update available. Refresh to apply.');
            }
          }
        });
      });
    })
    .catch(function(err) {
      console.log('[SW] Registration failed:', err);
      
      // Try alternative registration path
      if (err.message && err.message.includes('not supported')) {
        console.log('[SW] Trying fallback registration...');
        navigator.serviceWorker.register('/sw.js')
          .then(function(reg) {
            console.log('[SW] Fallback registration successful:', reg);
          })
          .catch(function(fallbackErr) {
            console.log('[SW] Fallback registration failed:', fallbackErr);
          });
      }
    });
  });
}

// ============================================================
// SERVICE WORKER MESSAGING (Optional)
// ============================================================
navigator.serviceWorker?.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'TOAST') {
    if (typeof toast === 'function') {
      toast(event.data.message);
    }
  }
});

console.log('✅ Service Worker module loaded');
// ============================================================
// USER BADGE INIT (For all pages)
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
  updateUserBadge();
});

// Also update when localStorage changes (e.g., login from another tab)
window.addEventListener('storage', function(e) {
  if (e.key === 'liquorbelle_user' || e.key === 'liquorbelle_token') {
    updateUserBadge();
  }
});

console.log('🚀 LiquorBelle — Master app.js loaded (Enhanced version)');