// ============================================================
// LIQUORBELLE — UTILITY FUNCTIONS (Shared across all pages)
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
  if (window.location.pathname.indexOf('account.html') === -1) {
    window.location.href = 'account.html';
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
  
  if (email.length > 0 && !/^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(email)) {
    input.classList.add('error');
    input.classList.remove('valid');
    if (errorEl) {
      errorEl.textContent = 'Please enter a valid email address';
      errorEl.classList.add('show');
    }
  } else if (email.length > 0 && /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(email)) {
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
  
  if (email.length > 0 && !/^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(email)) {
    input.classList.add('error');
    input.classList.remove('valid');
    if (errorEl) {
      errorEl.textContent = 'Please enter a valid email address';
      errorEl.classList.add('show');
    }
  } else if (email.length > 0 && /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(email)) {
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
      loginBtn.disabled = !(loginEmail.value.length > 0 && /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(loginEmail.value) && loginPin.length === 4);
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
      const emailValid = regEmail.value.length > 0 && /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(regEmail.value);
      const pinValid = regPin.length === 4;
      const otpValid = regOtp && regOtp.value.length === 6;
      regBtn.disabled = !(nameValid && phoneValid && emailValid && pinValid && otpValid);
    }
  }
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

console.log('✅ Utils loaded');