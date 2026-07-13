// ============================================================
// LIQUORBELLE — CART + WISHLIST (Shared across all pages)
// ============================================================

var cart = JSON.parse(localStorage.getItem(CART_KEY) || '{}');
var wishlist = JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]');

// ============================================================
// CART FUNCTIONS
// ============================================================
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
// WISHLIST FUNCTIONS
// ============================================================
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

console.log('✅ Cart + Wishlist loaded');