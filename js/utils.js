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

function toast(msg) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.innerText = msg;
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(function() { t.style.opacity = '0'; }, 2500);
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
// PIN & AUTH HELPERS
// ============================================================

/**
 * Validate a 4-digit PIN
 * @param {string} pin - The PIN to validate
 * @returns {boolean} True if valid 4-digit PIN
 */
function validatePin(pin) {
  return /^\d{4}$/.test(pin);
}

/**
 * Get the stored authentication token
 * @returns {string|null} JWT token or null
 */
function getAuthToken() {
  return localStorage.getItem('liquorbelle_token') || null;
}

/**
 * Check if user is currently logged in
 * @returns {boolean} True if logged in
 */
function isLoggedIn() {
  var token = getAuthToken();
  var user = localStorage.getItem('liquorbelle_user');
  return !!(token && user);
}

/**
 * Get current user data from localStorage
 * @returns {object|null} User object or null
 */
function getCurrentUser() {
  try {
    var user = localStorage.getItem('liquorbelle_user');
    return user ? JSON.parse(user) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Log out current user — clears session and redirects
 */
function logoutUser() {
  localStorage.removeItem('liquorbelle_user');
  localStorage.removeItem('liquorbelle_token');
  // Redirect to account page if not already there
  if (window.location.pathname.indexOf('account.html') === -1) {
    window.location.href = 'account.html';
  } else {
    window.location.reload();
  }
}

/**
 * Make an authenticated API request
 * @param {string} url - The API endpoint
 * @param {object} options - Fetch options
 * @returns {Promise} Fetch promise
 */
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

/**
 * Check if token is expired (basic check — looks at expiration in JWT)
 * @param {string} token - JWT token
 * @returns {boolean} True if token appears expired
 */
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

/**
 * Refresh the authentication token
 * @param {string} token - Current token
 * @returns {Promise} New token response
 */
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
      // Update user data if provided
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