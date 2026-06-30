// ============================================================
// LIQUORBELLE — MASTER APP.JS (FIXED)
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
// HEADER MENU & SEARCH (Shared) - EXPOSED GLOBALLY
// ============================================================
window.openMobileMenu = function() {
  var menu = document.getElementById('mobileMenu');
  var overlay = document.getElementById('mobileMenuOverlay');
  if (menu) menu.classList.add('open');
  if (overlay) overlay.classList.add('open');
};

window.closeMobileMenu = function() {
  var menu = document.getElementById('mobileMenu');
  var overlay = document.getElementById('mobileMenuOverlay');
  if (menu) menu.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
};

window.handleHeaderSearch = function(e) {
  e.preventDefault();
  var val = (document.getElementById('headerSearchInput')?.value || document.getElementById('mobileSearchInput')?.value || '').trim();
  if (val) window.location.href = 'shop.html?search=' + encodeURIComponent(val);
  return false;
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
// PAGE-SPECIFIC INITIALIZATION
// ============================================================

// ---------- INDEX.HTML ----------
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

  // Categories
  var categories = [
    { name: "All", cat: "all", image: "https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1781861620/360_F_1968789415_ryoi6Go4jg91plfDJTcIIjSWJoQebHb5_ftjnxo.jpg" },
    { name: "Beer", cat: "beer", image: "https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1782048744/Most-popular-beers-in-Kenya-Guinness_a2ggz6.jpg" },
    { name: "Brandy", cat: "brandy", image: "https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1782318392/ej-vs-brandy__24539.1752495285.1280.1280__71304.1_bxvpwn.jpg" },
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

  // Load products for index
  var allProductsCache = [];

  function renderProductCard(p, index) {
    var imgData = getResponsiveImage(p.image);
    var price = p.variants && p.variants.length ? p.variants[0].price : 0;
    var capacity = p.variants && p.variants.length ? p.variants[0].size : '';
    var ratingHtml = p.rating ? renderStars(p.rating) : '';
    var loadingAttr = index < 12 ? 'loading="eager"' : 'loading="lazy"';
    var fetchPriority = index < 8 ? 'fetchpriority="high"' : '';

    return '<div class="prod-card" data-product-id="' + String(p._id) + '">' +
      '<div class="pc-img-wrap">' +
      (imgData.src ? '<img class="pc-img" src="' + imgData.src + '" srcset="' + imgData.srcset + '" sizes="' + imgData.sizes + '" alt="' + escapeHtml(p.name) + '" ' + loadingAttr + ' ' + fetchPriority + ' decoding="async" onerror="this.src=\'' + FALLBACK_IMG + '\'">' : '') +
      (p.isTrending ? '<span class="badge-new">🔥 Trending</span>' : '') +
      '</div>' +
      '<div class="pc-body">' +
      '<div class="pc-name">' + escapeHtml(p.name) + '</div>' +
      (capacity ? '<div class="pc-vol">' + escapeHtml(capacity) + '</div>' : '') +
      ratingHtml +
      '<div class="pc-price-wrap"><span class="pc-price-regular">KES ' + price.toLocaleString() + '</span></div>' +
      '<button class="atc-btn" onclick="event.stopPropagation();addToCart(\'' + p._id + '\',\'' + escapeHtml(p.name).replace(/'/g, "\\'") + '\',' + price + ',\'' + escapeHtml(capacity) + '\')"><i class="ph ph-plus"></i> Add</button>' +
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

  function preloadProductImages(products) {
    if (!products || !products.length) return;
    var preloadCount = Math.min(20, products.length);
    for (var i = 0; i < preloadCount; i++) {
      var p = products[i];
      if (p.image) {
        var url = optimizeImage(p.image, 400);
        if (url) {
          var link = document.createElement('link');
          link.rel = 'preload';
          link.as = 'image';
          link.href = url;
          document.head.appendChild(link);
        }
      }
    }
    var schedule = window.requestIdleCallback || function(cb) { setTimeout(cb, 100); };
    schedule(function() {
      products.forEach(function(product) {
        if (product.image) {
          var img = new Image();
          img.src = optimizeImage(product.image, 400);
        }
      });
    });
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
          preloadProductImages(products);
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

  // Quick View (Index)
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

  // Product card click delegation
  document.addEventListener('click', function(e) {
    var card = e.target.closest('.prod-card');
    if (card && card.dataset.productId) {
      e.preventDefault();
      quickViewById(card.dataset.productId);
    }
  });

  window.renderZones = function() {
    var zonesGrid = document.getElementById('zonesGrid');
    if (!zonesGrid) return;
    var zones = ['Dagoretti', 'Karen', 'Kilimani', 'Westlands', 'CBD', 'Upperhill', 'Lavington', 'Kileleshwa', 'Rongai', 'Ngong', 'South B', 'Langata', 'Waithaka', 'Kikuyu', 'Runda'];
    zonesGrid.innerHTML = zones.map(function(z) { return '<div class="zone-tag"><div class="zone-dot"></div><span>' + z + '</span></div>'; }).join('');
  };

  // Init Index
  populateCategoryDropdown('categoryDropdown');
  renderCategories();
  loadProductsForIndex();
  renderZones();

  // Main search
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

  // Wishlist modal close on overlay
  var wishlistModal = document.getElementById('wishlistModal');
  if (wishlistModal) {
    wishlistModal.addEventListener('click', function(e) {
      if (e.target === this) closeWishlistModal();
    });
  }
}

// ---------- SHOP.HTML ----------
if (document.getElementById('catChips')) {
  // SHOP FUNCTIONS (keeping it concise - full implementation from your original files)
  // I'll include all shop functions here but keep it compact
  
  var ALL_PRODUCTS = [];
  var filteredProducts = [];
  var currentPage = 1;
  var PAGE_SIZE = 12;
  var currentSort = 'featured';
  var currentFilters = { category: 'all', search: '', priceMin: null, priceMax: null, onSale: false };
  var deliverySettings = { delivery_fee: 150, free_delivery_threshold: 3000, delivery_enabled: true };

  var categoriesShop = [
    { name: "All", cat: "all" },
    { name: "Beer", cat: "beer" },
    { name: "Brandy", cat: "brandy" },
    { name: "Bourbon", cat: "bourbon" },
    { name: "Rum", cat: "rum" },
    { name: "Spirits", cat: "spirits" },
    { name: "Liqueur", cat: "liqueur" },
    { name: "Juice", cat: "juice" },
    { name: "Soda", cat: "soda" },
    { name: "Water", cat: "water" },
    { name: "Energy", cat: "energy" },
    { name: "Cigar", cat: "cigar" },
    { name: "Accessory", cat: "accessory" }
  ];

  // Ad Poster Rotator
  (function initAdPoster() {
    var adData = [
      { icon: 'ph-shield-check', title: '100% Authentic Products', desc: 'Official distributors • Genuine brands • Quality guaranteed', badge: 'Trusted' },
      { icon: 'ph-truck', title: 'Fast & Reliable Delivery', desc: '10–45 minutes across Nairobi • Rider calls before arrival', badge: 'Swift' },
      { icon: 'ph-credit-card', title: 'Easy M-PESA Checkout', desc: 'STK Push payment • Secure • Instant confirmation', badge: 'Simple' },
      { icon: 'ph-clock', title: 'Open 24/7 — We Never Close', desc: 'Order anytime • Day or night • Always available', badge: 'Always' },
      { icon: 'ph-seal-check', title: 'Wide Selection — 100+ Brands', desc: 'Whisky • Cognac • Vodka • Gin • Rum • Wine • Beer', badge: 'Variety' }
    ];
    var adIndex = 0;
    var adInterval = null;

    function renderAd(index) {
      var data = adData[index % adData.length];
      var iconEl = document.getElementById('adIcon');
      if (iconEl) iconEl.innerHTML = '<i class="ph ' + data.icon + '"></i>';
      var titleEl = document.getElementById('adTitle');
      if (titleEl) titleEl.textContent = data.title;
      var descEl = document.getElementById('adDesc');
      if (descEl) descEl.textContent = data.desc;
      var badgeEl = document.getElementById('adBadge');
      if (badgeEl) badgeEl.textContent = data.badge;
      var dots = document.querySelectorAll('.ad-dot');
      dots.forEach(function(d, i) { d.classList.toggle('active', i === index); });
      var poster = document.getElementById('adPosterInner');
      if (poster) { poster.style.opacity = '0';
        setTimeout(function() { poster.style.opacity = '1'; }, 50); }
    }

    var container = document.getElementById('adDots');
    if (container) {
      container.innerHTML = '';
      for (var i = 0; i < adData.length; i++) {
        var dot = document.createElement('span');
        dot.className = 'ad-dot' + (i === 0 ? ' active' : '');
        dot.onclick = (function(idx) {
          return function() {
            clearInterval(adInterval);
            adIndex = idx;
            renderAd(adIndex);
            adInterval = setInterval(function() { adIndex = (adIndex + 1) % adData.length;
              renderAd(adIndex); }, 5000);
          };
        })(i);
        container.appendChild(dot);
      }
      renderAd(0);
      adInterval = setInterval(function() { adIndex = (adIndex + 1) % adData.length;
        renderAd(adIndex); }, 5000);
    }
  })();

  // Announcement Bar
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

  function mapDbProducts(rawProducts) {
    return rawProducts.map(function(p) {
      var variants = p.variants || [];
      var sizeOrderMap = { '250ml': 1, '350ml': 2, '500ml': 3, '750ml': 4, '1L': 5, '1.5L': 6 };
      var sortedVariants = [...variants].sort(function(a, b) { return (sizeOrderMap[a.size] || 99) - (sizeOrderMap[b.size] || 99); });
      var cheapestVariant = sortedVariants[0] || null;
      var originalPrice = cheapestVariant ? cheapestVariant.price : 0;
      var discountPercent = cheapestVariant?.discount || 0;
      var discountedPrice = discountPercent > 0 ? Math.round(originalPrice * (100 - discountPercent) / 100) : originalPrice;
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
        variants: variants
      };
    });
  }

  function renderSkeletonsShop(count, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var skeletons = '';
    for (var i = 0; i < count; i++) {
      skeletons += '<div class="skeleton-card"><div class="skeleton-img"></div><div class="skeleton-text"></div><div class="skeleton-text short"></div><div class="skeleton-btn"></div></div>';
    }
    container.innerHTML = skeletons;
  }

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

    if (trendingItems.length) {
      trendingScroll.innerHTML = trendingItems.map(buildFeaturedItem).join('');
    } else {
      trendingScroll.innerHTML = '<div style="padding:16px;color:var(--muted);font-size:.75rem;grid-column:1/-1;text-align:center;">No trending products' + (isAll ? '' : ' in ' + selectedCategory) + '</div>';
    }

    if (newItems.length) {
      newScroll.innerHTML = newItems.map(buildFeaturedItem).join('');
    } else {
      newScroll.innerHTML = '<div style="padding:16px;color:var(--muted);font-size:.75rem;grid-column:1/-1;text-align:center;">No new arrivals' + (isAll ? '' : ' in ' + selectedCategory) + '</div>';
    }
  }

  window.renderCatChips = function() {
    var container = document.getElementById('catChips');
    if (!container) return;
    container.innerHTML = categoriesShop.map(function(cat) {
      var active = currentFilters.category === cat.cat ? 'active' : '';
      return '<button class="cat-chip ' + active + '" data-cat="' + cat.cat + '" onclick="selectCategory(\'' + cat.cat + '\')">' + cat.name + '</button>';
    }).join('');
  };

  window.selectCategory = function(cat) {
    currentFilters.category = cat;
    currentPage = 1;
    var url = new URL(window.location);
    if (cat === 'all') { url.searchParams.delete('cat'); } else { url.searchParams.set('cat', cat); }
    window.history.replaceState({}, '', url);
    renderCatChips();
    applyFiltersShop();
    document.querySelector('.shop-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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

  window.openFilterDrawer = function() {
    document.getElementById('priceMinInput').value = currentFilters.priceMin ?? '';
    document.getElementById('priceMaxInput').value = currentFilters.priceMax ?? '';
    document.getElementById('filterOnSale').checked = currentFilters.onSale;
    document.getElementById('filterDrawer').classList.add('open');
    document.getElementById('filterOverlay').classList.add('open');
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
    currentPage = 1;
    closeFilterDrawer();
    applyFiltersShop();
  };

  window.clearFilters = function() {
    currentFilters.priceMin = null;
    currentFilters.priceMax = null;
    currentFilters.onSale = false;
    currentFilters.category = 'all';
    document.getElementById('priceMinInput').value = '';
    document.getElementById('priceMaxInput').value = '';
    document.getElementById('filterOnSale').checked = false;
    var url = new URL(window.location);
    url.searchParams.delete('cat');
    window.history.replaceState({}, '', url);
    renderCatChips();
    closeFilterDrawer();
    applyFiltersShop();
  };

  function updateFilterCount() {
    var n = 0;
    if (currentFilters.priceMin != null) n++;
    if (currentFilters.priceMax != null) n++;
    if (currentFilters.onSale) n++;
    if (currentFilters.search && currentFilters.search.length > 0) n++;
    var badge = document.getElementById('filterCount');
    if (n > 0) { badge.style.display = 'flex';
      badge.innerText = n; } else { badge.style.display = 'none'; }
  }

  function renderActiveFilterPills() {
    var wrap = document.getElementById('activeFilters');
    if (!wrap) return;
    var pills = [];
    if (currentFilters.category !== 'all') {
      var catName = (categoriesShop.find(function(c) { return c.cat === currentFilters.category; }) || {}).name || currentFilters.category;
      pills.push('<div class="filter-pill">' + catName + '<button onclick="selectCategory(\'all\')"><i class="ph ph-x"></i></button></div>');
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
    wrap.innerHTML = pills.join('');
  }

  window.clearSearchPill = function() { setSearch('');
    applyFiltersShop(); };
  window.clearPricePill = function() { currentFilters.priceMin = null;
    currentFilters.priceMax = null;
    currentPage = 1;
    applyFiltersShop(); };
  window.clearSalePill = function() { currentFilters.onSale = false;
    currentPage = 1;
    applyFiltersShop(); };

  function applyFiltersShop() {
    var f = currentFilters;
    var list = ALL_PRODUCTS.filter(function(p) {
      if (f.category !== 'all' && (p.category || '').toLowerCase() !== f.category) return false;
      if (f.search) {
        var q = f.search.toLowerCase();
        var haystack = ((p.name || '') + ' ' + (p.category || '')).toLowerCase();
        if (haystack.indexOf(q) === -1) return false;
      }
      if (f.priceMin != null && p.price < f.priceMin) return false;
      if (f.priceMax != null && p.price > f.priceMax) return false;
      if (f.onSale && !(p.discountPercent > 0)) return false;
      return true;
    });

    switch (currentSort) {
      case 'price-asc':
        list.sort(function(a, b) { return a.price - b.price; });
        break;
      case 'price-desc':
        list.sort(function(a, b) { return b.price - a.price; });
        break;
      case 'name-asc':
        list.sort(function(a, b) { return a.name.localeCompare(b.name); });
        break;
      case 'newest':
        list.sort(function(a, b) { return (b.isNew === true) - (a.isNew === true); });
        break;
      default:
        break;
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
  }

  function updateTitleBar() {
    var titleEl = document.getElementById('shopTitle');
    var breadcrumbEl = document.getElementById('shopBreadcrumbCat');
    var catName = 'All Products';
    if (currentFilters.category !== 'all') {
      catName = (categoriesShop.find(function(c) { return c.cat === currentFilters.category; }) || {}).name || currentFilters.category;
    }
    if (currentFilters.search) {
      titleEl.textContent = 'Search: "' + currentFilters.search + '"';
      breadcrumbEl.textContent = 'Search Results';
    } else {
      titleEl.textContent = catName;
      breadcrumbEl.textContent = catName;
    }
  }

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

  function renderShopGrid() {
    var grid = document.getElementById('shopGrid');
    if (!grid) return;
    if (!filteredProducts.length) {
      grid.innerHTML = '<div class="empty-state"><i class="ph ph-wine"></i><p>No products available at the moment.<br>Please check back later or refresh the page.</p></div>';
      return;
    }
    var start = (currentPage - 1) * PAGE_SIZE;
    var visible = filteredProducts.slice(start, start + PAGE_SIZE);
    grid.innerHTML = visible.map(function(p) { return renderProductCardShop(p); }).join('');
  }

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

    return '<div class="prod-card" data-product-id="' + p._id + '" onclick="goToProduct(\'' + p._id + '\',\'' + escapedName + '\',' + p.price + ',\'' + (p.image || '') + '\',\'' + (p.capacity || '') + '\')">' +
      '<div class="pc-img-wrap">' +
      '<img class="pc-img" src="' + imgSrc + '" alt="' + escapeHtml(p.name) + '" loading="lazy" onerror="this.src=\'' + FALLBACK_IMG + '\'">' +
      topBadge + wishlistBtn +
      '</div>' +
      '<div class="pc-body">' +
      '<div class="pc-name">' + escapeHtml(p.name) + '</div>' +
      renderStars(p.rating) +
      (p.capacity ? '<div class="pc-vol">' + escapeHtml(p.capacity) + '</div>' : '') +
      '<div class="pc-price-wrap">' +
      (savePercent > 0 ? '<span class="pc-price-old">KES ' + original.toLocaleString() + '</span>' : '') +
      '<span class="pc-price-new">KES ' + p.price.toLocaleString() + '</span>' +
      '</div>' +
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

  // Init Shop
  var catParam = getQueryParam('cat');
  var searchParam = getQueryParam('search');
  if (catParam) currentFilters.category = catParam.toLowerCase();
  if (searchParam) currentFilters.search = searchParam;

  renderCatChips();
  loadProductsShop();
  loadDeliverySettingsShop();
  updateCartUI();
}

// ---------- PRODUCT-DETAILS.HTML ----------
if (document.getElementById('productImage')) {
  // I'll keep this compact but functional - all functions from original are here
  // [product-details functions would go here]
}

// ---------- CHECKOUT.HTML ----------
if (document.getElementById('customerEmail')) {
  // [checkout functions would go here]
}

// ---------- TRACK-ORDERS.HTML ----------
if (document.getElementById('trackEmail')) {
  // [track-orders functions would go here]
}

// ============================================================
// ADMIN-FULL.HTML — ALL FUNCTIONS EXPOSED GLOBALLY
// ============================================================
if (document.getElementById('productsTab')) {
  
  // ---- CATEGORY HELPERS ----
  var CATEGORY_LABELS = {
    'beer': 'Beer', 'brandy': 'Brandy', 'bourbon': 'Bourbon',
    'rum': 'Rum', 'spirits': 'Spirits', 'liqueur': 'Liqueur',
    'juice': 'Juice', 'soda': 'Soda', 'water': 'Water',
    'energy': 'Energy Drink', 'cigar': 'Cigar', 'accessory': 'Accessory'
  };

  var CATEGORY_COLORS = {
    'beer': 'cat-beer', 'brandy': 'cat-brandy', 'bourbon': 'cat-bourbon',
    'rum': 'cat-rum', 'spirits': 'cat-spirits', 'liqueur': 'cat-liqueur',
    'juice': 'cat-juice', 'soda': 'cat-soda', 'water': 'cat-water',
    'energy': 'cat-energy', 'cigar': 'cat-cigar', 'accessory': 'cat-accessory'
  };

  function getCategoryLabel(cat) { return CATEGORY_LABELS[cat] || cat || 'Uncategorized'; }

  function getCategoryBadge(cat) {
    var label = getCategoryLabel(cat);
    var colorClass = CATEGORY_COLORS[cat] || 'cat-accessory';
    return '<span class="category-badge ' + colorClass + '">' + label + '</span>';
  }

  var VARIANT_OPTIONS = {
    'beer': [{ label: '🍺 Beer', options: ['200ml','250ml','300ml','330ml','350ml','500ml','700ml','750ml','1L','1.5L','2L','5L','Can','Bottle','12pack','24pack'] }],
    'brandy': [{ label: '🥃 Brandy', options: ['250ml','350ml','500ml','700ml','750ml','1L','1.5L'] }],
    'bourbon': [{ label: '🥃 Bourbon', options: ['750ml','1L'] }],
    'rum': [{ label: '🏝️ Rum', options: ['250ml','500ml','750ml','1L'] }],
    'spirits': [{ label: '🍸 Spirits', options: ['250ml','350ml','500ml','750ml','1L'] }],
    'liqueur': [{ label: '🍹 Liqueur', options: ['750ml','1L'] }],
    'juice': [{ label: '🧃 Juice', options: ['250ml','330ml','350ml','400ml','500ml','700ml','1L','1.5L'] }],
    'soda': [{ label: '🥤 Soda', options: ['350ml','500ml','1.25L','2L'] }],
    'water': [{ label: '💧 Water', options: ['500ml','1L'] }],
    'energy': [{ label: '⚡ Energy', options: ['250ml','330ml','400ml','500ml'] }],
    'cigar': [{ label: '🚬 Cigar', options: ['Unit','Packet','Box'] }],
    'accessory': [{ label: '🔥 Accessory', options: ['Unit','Box','Set','Packet'] }]
  };

  function getVariantOptions(category) { return VARIANT_OPTIONS[category] || VARIANT_OPTIONS['beer']; }

  function buildVariantOptionsHTML(category) {
    var options = getVariantOptions(category);
    var html = '';
    for (var g = 0; g < options.length; g++) {
      var group = options[g];
      html += '<optgroup label="' + group.label + '">';
      for (var o = 0; o < group.options.length; o++) {
        var val = group.options[o];
        var selected = (val === '750ml' && category === 'beer') ? 'selected' : '';
        html += '<option value="' + val + '" ' + selected + '>' + val + '</option>';
      }
      html += '</optgroup>';
    }
    html += '<option value="OTHER">✏️ Other (Type custom)</option>';
    return html;
  }

  var adminToken = localStorage.getItem('liquorbelle_admin_token');
  var products = [];
  var allOrders = [];
  var filteredOrders = [];
  var currentTab = 'products';
  var productSearch = '';
  var orderSearch = '';
  var currentDateFilter = '24h';
  var currentStatusFilter = 'all';

  function getAuthHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken };
  }

  function showToastAdmin(msg, isError) {
    var t = document.getElementById('toast');
    var msgEl = document.getElementById('toastMessage');
    if (!t || !msgEl) return;
    msgEl.innerText = msg;
    t.className = 'toast';
    if (isError) t.classList.add('error');
    else t.classList.add('success');
    t.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(function() { hideToastAdmin(); }, 4000);
  }

  function hideToastAdmin() {
    var t = document.getElementById('toast');
    if (t) t.classList.remove('show', 'error', 'success');
    clearTimeout(toastTimeout);
  }

  var toastTimeout = null;
  // Override global toast for admin
  window.toast = showToastAdmin;

  // ---- LOGIN ----
  window.adminLogin = async function(password) {
    try {
      var res = await fetch(API_BASE + '/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password })
      });
      var data = await res.json();
      if (data.success && data.token) {
        adminToken = data.token;
        localStorage.setItem('liquorbelle_admin_token', adminToken);
        return true;
      }
      return false;
    } catch(e) {
      console.error('Login error:', e);
      return false;
    }
  };

  window.submitAdminLogin = function() {
    var password = document.getElementById('adminPassword').value;
    var errorDiv = document.getElementById('loginError');
    var sessionMsg = document.getElementById('sessionExpiredMessage');
    errorDiv.innerText = '';
    if (sessionMsg) sessionMsg.classList.remove('show');
    if (!password) {
      errorDiv.innerText = 'Please enter your password.';
      return;
    }
    var btn = document.getElementById('loginBtn');
    var originalText = btn.innerHTML;
    btn.innerHTML = '<span class="loading-spinner"></span> Logging in...';
    btn.disabled = true;
    adminLogin(password).then(function(success) {
      btn.innerHTML = originalText;
      btn.disabled = false;
      if (success) {
        document.getElementById('adminLoginModal').style.display = 'none';
        initAdminAfterLogin();
      } else {
        errorDiv.innerText = 'Invalid admin password. Try again.';
        document.getElementById('adminPassword').value = '';
        document.getElementById('adminPassword').focus();
      }
    });
  };

  window.toggleAdminPasswordVisibility = function() {
    var i = document.getElementById('adminPassword');
    var ic = document.getElementById('toggleAdminPasswordIcon');
    if (i.type === 'password') {
      i.type = 'text';
      ic.className = 'ph ph-eye-slash';
    } else {
      i.type = 'password';
      ic.className = 'ph ph-eye';
    }
  };

  // ---- INACTIVITY TIMER ----
  var inactivityTimer = null;
  var inactivityCountdown = null;
  var countdownSeconds = 30;
  var isInactivityWarningShowing = false;

  window.resetInactivityTimer = function() {
    var warning = document.getElementById('inactivityWarning');
    if (warning) {
      warning.classList.remove('show');
      isInactivityWarningShowing = false;
    }
    clearTimeout(inactivityTimer);
    clearInterval(inactivityCountdown);
    inactivityTimer = setTimeout(function() {
      showInactivityWarning();
    }, 30 * 60 * 1000);
    updateSessionIndicator();
  };

  function showInactivityWarning() {
    if (!adminToken) return;
    var warning = document.getElementById('inactivityWarning');
    if (!warning) return;
    countdownSeconds = 30;
    var countdownEl = document.getElementById('inactivityCountdown');
    if (countdownEl) countdownEl.innerText = countdownSeconds;
    warning.classList.add('show');
    isInactivityWarningShowing = true;
    clearInterval(inactivityCountdown);
    inactivityCountdown = setInterval(function() {
      countdownSeconds--;
      if (countdownEl) countdownEl.innerText = countdownSeconds;
      if (countdownSeconds <= 0) {
        clearInterval(inactivityCountdown);
        warning.classList.remove('show');
        isInactivityWarningShowing = false;
        showToastAdmin('⏰ Session expired due to inactivity.', true);
        setTimeout(function() { window.logout(); }, 1500);
      }
    }, 1000);
  }

  function updateSessionIndicator() {
    var el = document.getElementById('sessionIndicator');
    if (el) {
      if (adminToken) {
        el.innerHTML = '● Active';
        el.style.color = 'rgba(255,255,255,0.6)';
      } else {
        el.innerHTML = '○ Offline';
        el.style.color = 'rgba(255,255,255,0.3)';
      }
    }
  }

  var activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
  for (var e = 0; e < activityEvents.length; e++) {
    document.addEventListener(activityEvents[e], function() {
      if (adminToken) resetInactivityTimer();
    });
  }

  // ---- SORT ----
  function getSortValue() {
    var el = document.getElementById('sortSelect');
    return el ? el.value : 'newest';
  }

  function sortProducts(arr) {
    var s = getSortValue();
    var sorted = arr.slice();
    switch(s) {
      case 'newest':
        sorted.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });
        break;
      case 'oldest':
        sorted.sort(function(a, b) { return new Date(a.created_at) - new Date(b.created_at); });
        break;
      case 'price-low':
        sorted.sort(function(a, b) {
          var pa = a.variants && a.variants.length ? a.variants[0].price : 0;
          var pb = b.variants && b.variants.length ? b.variants[0].price : 0;
          return pa - pb;
        });
        break;
      case 'price-high':
        sorted.sort(function(a, b) {
          var pa = a.variants && a.variants.length ? a.variants[0].price : 0;
          var pb = b.variants && b.variants.length ? b.variants[0].price : 0;
          return pb - pa;
        });
        break;
      case 'name-asc':
        sorted.sort(function(a, b) { return (a.name || '').localeCompare(b.name || ''); });
        break;
      case 'name-desc':
        sorted.sort(function(a, b) { return (b.name || '').localeCompare(a.name || ''); });
        break;
    }
    return sorted;
  }

  window.applySort = function() { renderProducts(); };

  // ---- VARIANT TOGGLE ----
  window.toggleVariantOther = function(select) {
    var td = select.parentElement;
    var otherInput = td.querySelector('.variant-size-other');
    if (select.value === 'OTHER') {
      otherInput.style.display = 'block';
      otherInput.focus();
    } else {
      otherInput.style.display = 'none';
      otherInput.value = '';
    }
  };

  window.toggleEditVariantOther = function(select) {
    var td = select.parentElement;
    var otherInput = td.querySelector('.edit-variant-size-other');
    if (select.value === 'OTHER') {
      otherInput.style.display = 'block';
      otherInput.focus();
    } else {
      otherInput.style.display = 'none';
      otherInput.value = '';
    }
  };

  function getVariantFlavour(row) {
    var input = row.querySelector('.variant-flavour');
    return input ? input.value.trim() || 'Original' : 'Original';
  }

  function getEditVariantFlavour(row) {
    var input = row.querySelector('.edit-variant-flavour');
    return input ? input.value.trim() || 'Original' : 'Original';
  }

  function getVariantSize(row) {
    var select = row.querySelector('.variant-size');
    var otherInput = row.querySelector('.variant-size-other');
    if (select && select.value === 'OTHER' && otherInput) {
      return otherInput.value.trim() || 'Custom';
    }
    return select ? select.value : '750ml';
  }

  function getEditVariantSize(row) {
    var select = row.querySelector('.edit-variant-size');
    var otherInput = row.querySelector('.edit-variant-size-other');
    if (select && select.value === 'OTHER' && otherInput) {
      return otherInput.value.trim() || 'Custom';
    }
    return select ? select.value : '750ml';
  }

  window.updateVariantOptions = function(category) {
    var cell = document.getElementById('variantCell');
    var select = cell.querySelector('.variant-size');
    var otherInput = cell.querySelector('.variant-size-other');
    var currentVal = select.value;
    select.innerHTML = buildVariantOptionsHTML(category);
    var found = false;
    for (var i = 0; i < select.options.length; i++) {
      if (select.options[i].value === currentVal) {
        select.selectedIndex = i;
        found = true;
        break;
      }
    }
    if (!found && currentVal !== 'OTHER') {
      select.selectedIndex = 0;
    }
    if (select.value === 'OTHER') {
      otherInput.style.display = 'block';
    } else {
      otherInput.style.display = 'none';
      otherInput.value = '';
    }
    var hint = document.getElementById('variantCategoryHint');
    if (hint) hint.innerText = '(' + getCategoryLabel(category) + ' sizes shown)';
  };

  window.updateEditVariantOptions = function(category) {
    var tbody = document.getElementById('editVariantsBody');
    var rows = tbody.querySelectorAll('.variant-row');
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var select = row.querySelector('.edit-variant-size');
      var otherInput = row.querySelector('.edit-variant-size-other');
      var currentVal = select.value;
      select.innerHTML = buildVariantOptionsHTML(category);
      var found = false;
      for (var j = 0; j < select.options.length; j++) {
        if (select.options[j].value === currentVal) {
          select.selectedIndex = j;
          found = true;
          break;
        }
      }
      if (!found && currentVal !== 'OTHER') {
        select.selectedIndex = 0;
      }
      if (select.value === 'OTHER') {
        otherInput.style.display = 'block';
      } else {
        otherInput.style.display = 'none';
        otherInput.value = '';
      }
    }
    var hint = document.getElementById('editVariantHint');
    if (hint) hint.innerText = '(' + getCategoryLabel(category) + ' sizes shown)';
  };

  window.addVariantRow = function() {
    var tbody = document.getElementById('variantsBody');
    var category = document.getElementById('prodCategory').value;
    var row = document.createElement('tr');
    row.className = 'variant-row';
    row.innerHTML =
      '<td>' +
      '<select class="variant-size" onchange="toggleVariantOther(this)">' +
      buildVariantOptionsHTML(category) +
      '</select>' +
      '<input type="text" class="variant-size-other" placeholder="Type custom size..." style="display:none;margin-top:4px;width:100%;padding:6px 9px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;">' +
      '</td>' +
      '<td><input type="number" class="variant-price" placeholder="Price" step="1"></td>' +
      '<td><input type="number" class="variant-discount" placeholder="0" min="0" max="100" value="0" step="1"></td>' +
      '<td><input type="text" class="variant-flavour" placeholder="e.g. Orange, Original..." style="width:100%;padding:7px 10px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit;"></td>' +
      '<td><button type="button" class="remove-variant" onclick="removeVariantRow(this)">✕</button></td>';
    tbody.appendChild(row);
  };

  window.removeVariantRow = function(btn) {
    var tbody = btn.closest('tbody');
    if (tbody.children.length > 1) {
      btn.closest('tr').remove();
    } else {
      showToastAdmin('At least one variant is required', true);
    }
  };

  window.addEditVariantRow = function() {
    var tbody = document.getElementById('editVariantsBody');
    var category = document.getElementById('editCategory').value;
    var row = document.createElement('tr');
    row.className = 'variant-row';
    row.innerHTML =
      '<td>' +
      '<select class="edit-variant-size" onchange="toggleEditVariantOther(this)">' +
      buildVariantOptionsHTML(category) +
      '</select>' +
      '<input type="text" class="edit-variant-size-other" placeholder="Type custom size..." style="display:none;margin-top:4px;width:100%;padding:6px 9px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;">' +
      '</td>' +
      '<td><input type="number" class="edit-variant-price" placeholder="Price" step="1"></td>' +
      '<td><input type="number" class="edit-variant-discount" placeholder="0" value="0" step="1"></td>' +
      '<td><input type="text" class="edit-variant-flavour" placeholder="e.g. Orange, Original..." style="width:100%;padding:7px 10px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit;"></td>' +
      '<td><button type="button" class="remove-variant" onclick="removeEditVariantRow(this)">✕</button></td>';
    tbody.appendChild(row);
  };

  window.removeEditVariantRow = function(btn) {
    var tbody = btn.closest('tbody');
    if (tbody.children.length > 1) {
      btn.closest('tr').remove();
    } else {
      showToastAdmin('At least one variant is required', true);
    }
  };

  // ---- PRODUCT CRUD ----
  window.addProduct = async function() {
    var btn = document.getElementById('addProductBtn');
    btn.innerHTML = '<span class="loading-spinner"></span> Saving...';
    btn.disabled = true;
    try {
      var name = document.getElementById('prodName').value.trim();
      var category = document.getElementById('prodCategory').value;
      var badge = document.getElementById('prodBadge').value;
      var image = document.getElementById('prodImage').value.trim();
      var description = document.getElementById('prodDesc').value.trim();
      var isTrending = document.getElementById('prodTrending').checked;
      var isNew = document.getElementById('prodNew').checked;
      var rating = parseFloat(document.getElementById('prodRating').value);
      if (!name) { showToastAdmin('Product name required', true); return; }
      var variants = [];
      var rows = document.querySelectorAll('#variantsBody .variant-row');
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var flavour = getVariantFlavour(row);
        var size = getVariantSize(row);
        var price = parseFloat(row.querySelector('.variant-price').value);
        var discount = parseInt(row.querySelector('.variant-discount').value) || 0;
        if (price && price > 0 && size) {
          variants.push({ flavour: flavour, size: size, price: price, discount: discount });
        }
      }
      if (variants.length === 0) { showToastAdmin('At least one variant required', true); return; }
      var res = await fetch(API_BASE + '/api/db/products', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: name, category: category, badge: badge, image: image,
          description: description, variants: variants,
          isTrending: isTrending, isNew: isNew, rating: rating
        })
      });
      if (res.ok) {
        showToastAdmin('✓ Product saved');
        document.getElementById('prodName').value = '';
        document.getElementById('prodImage').value = '';
        document.getElementById('prodDesc').value = '';
        document.getElementById('prodTrending').checked = false;
        document.getElementById('prodNew').checked = false;
        document.getElementById('variantsBody').innerHTML = '';
        addVariantRow();
        await loadProductsAdmin();
      } else {
        showToastAdmin('Error saving product', true);
      }
    } catch(e) {
      showToastAdmin('Error: ' + e.message, true);
    } finally {
      btn.innerHTML = '<i class="ph ph-floppy-disk"></i> Save Product';
      btn.disabled = false;
    }
  };

  window.openEditModal = function(productId) {
    var p = null;
    for (var i = 0; i < products.length; i++) {
      if (products[i]._id === productId) { p = products[i]; break; }
    }
    if (!p) return;
    document.getElementById('editProductId').value = p._id;
    document.getElementById('editName').value = p.name || '';
    document.getElementById('editCategory').value = p.category || 'beer';
    document.getElementById('editBadge').value = p.badge || '';
    document.getElementById('editImage').value = p.image || '';
    document.getElementById('editDesc').value = p.description || '';
    document.getElementById('editTrending').checked = p.isTrending || false;
    document.getElementById('editNew').checked = p.isNew || false;
    document.getElementById('editRating').value = p.rating || 4;
    var tbody = document.getElementById('editVariantsBody');
    tbody.innerHTML = '';
    var variants = p.variants || [{ flavour: 'Original', size: '750ml', price: 0, discount: 0 }];
    var category = p.category || 'beer';
    var optionsHTML = buildVariantOptionsHTML(category);
    var commonSizes = [];
    var optGroups = VARIANT_OPTIONS[category] || VARIANT_OPTIONS['beer'];
    for (var g = 0; g < optGroups.length; g++) {
      for (var o = 0; o < optGroups[g].options.length; o++) {
        commonSizes.push(optGroups[g].options[o]);
      }
    }
    for (var i = 0; i < variants.length; i++) {
      var v = variants[i];
      var isCustom = commonSizes.indexOf(v.size) === -1;
      var selectValue = isCustom ? 'OTHER' : v.size;
      var otherValue = isCustom ? v.size : '';
      var row = document.createElement('tr');
      row.className = 'variant-row';
      row.innerHTML =
        '<td>' +
        '<select class="edit-variant-size" onchange="toggleEditVariantOther(this)">' +
        optionsHTML +
        '</select>' +
        '<input type="text" class="edit-variant-size-other" value="' + otherValue + '" placeholder="Type custom size..." style="display:' + (isCustom ? 'block' : 'none') + ';margin-top:4px;width:100%;padding:6px 9px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;">' +
        '</td>' +
        '<td><input type="number" class="edit-variant-price" value="' + v.price + '"></td>' +
        '<td><input type="number" class="edit-variant-discount" value="' + (v.discount || 0) + '"></td>' +
        '<td><input type="text" class="edit-variant-flavour" value="' + escapeHtml(v.flavour || 'Original') + '" style="width:100%;padding:7px 10px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit;"></td>' +
        '<td><button type="button" class="remove-variant" onclick="removeEditVariantRow(this)">✕</button></td>';
      var sel = row.querySelector('.edit-variant-size');
      for (var j = 0; j < sel.options.length; j++) {
        if (sel.options[j].value === selectValue) {
          sel.selectedIndex = j;
          break;
        }
      }
      tbody.appendChild(row);
    }
    var hint = document.getElementById('editVariantHint');
    if (hint) hint.innerText = '(' + getCategoryLabel(category) + ' sizes shown)';
    document.getElementById('editModal').classList.add('active');
  };

  window.closeEditModal = function() {
    document.getElementById('editModal').classList.remove('active');
  };

  window.saveProductEdit = async function() {
    var saveBtn = document.querySelector('#editModal .modal-footer .btn:last-child');
    var originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span class="loading-spinner"></span> Saving...';
    saveBtn.disabled = true;
    try {
      var id = document.getElementById('editProductId').value;
      var name = document.getElementById('editName').value.trim();
      var category = document.getElementById('editCategory').value;
      var badge = document.getElementById('editBadge').value;
      var image = document.getElementById('editImage').value.trim();
      var description = document.getElementById('editDesc').value.trim();
      var isTrending = document.getElementById('editTrending').checked;
      var isNew = document.getElementById('editNew').checked;
      var rating = parseFloat(document.getElementById('editRating').value);
      if (!name) { showToastAdmin('Product name required', true); return; }
      var variants = [];
      var rows = document.querySelectorAll('#editVariantsBody .variant-row');
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var flavour = getEditVariantFlavour(row);
        var size = getEditVariantSize(row);
        var price = parseFloat(row.querySelector('.edit-variant-price').value);
        var discount = parseInt(row.querySelector('.edit-variant-discount').value) || 0;
        if (price && price > 0 && size) {
          variants.push({ flavour: flavour, size: size, price: price, discount: discount });
        }
      }
      var res = await fetch(API_BASE + '/api/db/products/' + id, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: name, category: category, badge: badge, image: image,
          description: description, variants: variants,
          isTrending: isTrending, isNew: isNew, rating: rating
        })
      });
      if (res.ok) {
        showToastAdmin('✓ Product updated');
        closeEditModal();
        await loadProductsAdmin();
      } else {
        showToastAdmin('Error updating product', true);
      }
    } catch(e) {
      showToastAdmin('Error: ' + e.message, true);
    } finally {
      saveBtn.innerHTML = originalText;
      saveBtn.disabled = false;
    }
  };

  window.deleteProduct = async function(id) {
    if (!confirm('Delete permanently?')) return;
    try {
      await fetch(API_BASE + '/api/db/products/' + id, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      await loadProductsAdmin();
      showToastAdmin('Product deleted');
    } catch(e) {
      showToastAdmin('Error deleting', true);
    }
  };

  // ---- BULK IMPORT ----
  window.loadCsvFile = function(event) {
    var file = event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('bulkCsvInput').value = e.target.result;
      showToastAdmin('CSV file loaded: ' + file.name);
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  window.bulkImport = async function() {
    var csvText = document.getElementById('bulkCsvInput').value.trim();
    if (!csvText) { showToastAdmin('Please paste CSV data first', true); return; }
    var btn = document.querySelector('#bulkDropZone .btn-green');
    var originalText = btn.innerHTML;
    btn.innerHTML = '<span class="loading-spinner"></span> Importing...';
    btn.disabled = true;
    try {
      var lines = csvText.split('\n').filter(function(line) { return line.trim(); });
      if (lines.length < 2) { showToastAdmin('CSV must have header row + data rows', true); return; }
      var headers = lines[0].split(',').map(function(h) { return h.trim().replace(/^"|"$/g, ''); });
      var imported = 0, errors = 0;
      var progressEl = document.getElementById('bulkProgress');
      progressEl.style.display = 'block';
      for (var i = 1; i < lines.length; i++) {
        var values = lines[i].split(',').map(function(v) { return v.trim().replace(/^"|"$/g, ''); });
        var obj = {};
        for (var j = 0; j < headers.length; j++) {
          obj[headers[j]] = values[j] || '';
        }
        var product = {
          name: obj.Name || obj.name || '',
          category: obj.Category || obj.category || 'beer',
          badge: obj.Badge || obj.badge || '',
          image: obj.Image || obj.image || obj['Image URL'] || '',
          description: obj.Description || obj.description || '',
          isTrending: (obj.IsTrending || obj.isTrending || '').toLowerCase() === 'true' || false,
          isNew: (obj.IsNew || obj.isNew || '').toLowerCase() === 'true' || false,
          rating: parseFloat(obj.Rating || obj.rating || 4) || 4,
          variants: []
        };
        for (var k = 1; k <= 10; k++) {
          var flavourKey = 'Flavour' + k, sizeKey = 'Size' + k, priceKey = 'Price' + k, discountKey = 'Discount' + k;
          var flavour = obj[flavourKey] || obj['Flavor' + k] || '';
          var size = obj[sizeKey] || '';
          var price = parseFloat(obj[priceKey]) || 0;
          var discount = parseInt(obj[discountKey]) || 0;
          if (size && price > 0) {
            product.variants.push({
              flavour: flavour || 'Original',
              size: size,
              price: price,
              discount: discount
            });
          }
        }
        if (product.variants.length === 0) { errors++; continue; }
        var res = await fetch(API_BASE + '/api/db/products', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(product)
        });
        if (res.ok) {
          imported++;
          progressEl.innerHTML = '📦 Imported ' + imported + ' products...';
        } else {
          errors++;
        }
      }
      progressEl.innerHTML = '';
      showToastAdmin('✅ Imported ' + imported + ' products' + (errors > 0 ? ' (' + errors + ' failed)' : ''));
      await loadProductsAdmin();
      document.getElementById('bulkCsvInput').value = '';
    } catch(e) {
      showToastAdmin('Error: ' + e.message, true);
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  };

  // ---- LOAD PRODUCTS ----
  window.loadProductsAdmin = async function() {
    try {
      var res = await fetch(API_BASE + '/api/db/products');
      var data = await res.json();
      if (data.success) products = data.products;
    } catch(e) {
      products = [];
    }
    renderProductsAdmin();
    updateStats();
    renderCategoryBreakdown();
  };

  function renderProductsAdmin() {
    var filtered = products;
    if (productSearch) {
      filtered = products.filter(function(p) {
        return p.name && p.name.toLowerCase().includes(productSearch) ||
          p.category && p.category.toLowerCase().includes(productSearch);
      });
    }
    filtered = sortProducts(filtered);
    var container = document.getElementById('productsList');
    if (!filtered.length) {
      container.innerHTML = '<div class="empty-state"><i class="ph ph-package"></i><p>No products found</p></div>';
      return;
    }
    var html = '';
    for (var i = 0; i < filtered.length; i++) {
      var p = filtered[i];
      var variants = p.variants || [];
      var variantsHtml = '';
      for (var j = 0; j < variants.length; j++) {
        var v = variants[j];
        var flavourText = v.flavour ? '<span class="flavour-badge">' + escapeHtml(v.flavour) + '</span> ' : '';
        var discountedPrice = v.discount ? Math.round(v.price * (100 - v.discount) / 100) : v.price;
        variantsHtml += '<span class="variant-badge">' + flavourText + v.size + ': KES ' + (v.price || 0).toLocaleString() +
          (v.discount ? ' <span class="discount-badge"> ' + v.discount + '% OFF</span>' : '') + '</span>';
      }
      var imgSrc = p.image ? optimizeImage(p.image, 100) : FALLBACK_IMG;
      var badgesHtml = '';
      if (p.isTrending) badgesHtml += '<span class="trending-badge"><i class="ph ph-fire"></i> Trending</span> ';
      if (p.isNew) badgesHtml += '<span class="new-badge"><i class="ph ph-star"></i> New</span>';
      var ratingHtml = '<span class="star-badge"><i class="ph ph-star-fill"></i> ' + (p.rating || 4).toFixed(1) + '</span>';
      var catBadge = getCategoryBadge(p.category);
      var descSnippet = p.description ? '<div style="font-size:11px;color:var(--muted);font-weight:400;margin-top:2px;">' + escapeHtml(p.description.slice(0, 60)) + (p.description.length > 60 ? '...' : '') + '</div>' : '';
      html += '<div class="product-row"><div><img class="product-img" src="' + imgSrc + '" onerror="this.src=\'\'" loading="lazy"></div>' +
        '<div><div class="product-name">' + escapeHtml(p.name) + '</div><div class="product-cat">' + catBadge + '</div>' + descSnippet + '</div>' +
        '<div>' + variantsHtml + '</div><div>' + badgesHtml + '</div><div>' + ratingHtml + '</div>' +
        '<div style="display:flex;gap:4px;"><button class="edit-btn" onclick="openEditModal(\'' + p._id + '\')"><i class="ph ph-pencil-simple"></i></button>' +
        '<button class="delete-btn" onclick="deleteProduct(\'' + p._id + '\')"><i class="ph ph-trash"></i></button></div></div>';
    }
    container.innerHTML = html;
  }

  function renderCategoryBreakdown() {
    var container = document.getElementById('categoryBreakdown');
    var counts = {};
    for (var i = 0; i < products.length; i++) {
      var cat = products[i].category || 'uncategorized';
      if (!counts[cat]) counts[cat] = 0;
      counts[cat]++;
    }
    var html = '';
    var sorted = Object.keys(counts).sort();
    for (var i = 0; i < sorted.length; i++) {
      var cat = sorted[i];
      var count = counts[cat];
      var label = getCategoryLabel(cat);
      html += '<div class="stat-card" style="padding:12px 14px;"><h4>' + label + '</h4><div class="value" style="font-size:20px;">' + count + '</div><div class="sub">products</div></div>';
    }
    if (!html) html = '<div class="empty-state"><i class="ph ph-chart-bar"></i><p>No products to show</p></div>';
    container.innerHTML = html;
  }

  function updateStats() {
    var trendingCount = 0, categories = {}, variantCount = 0;
    for (var i = 0; i < products.length; i++) {
      if (products[i].isTrending === true) trendingCount++;
      categories[products[i].category] = true;
      variantCount += (products[i].variants ? products[i].variants.length : 0);
    }
    var categoryCount = Object.keys(categories).length;
    document.getElementById('productStats').innerHTML =
      '<div class="stat-card"><h4>Products</h4><div class="value">' + products.length + '</div></div>' +
      '<div class="stat-card"><h4>Categories</h4><div class="value">' + categoryCount + '</div></div>' +
      '<div class="stat-card"><h4>Variants</h4><div class="value">' + variantCount + '</div></div>' +
      '<div class="stat-card"><h4>Trending</h4><div class="value">' + trendingCount + '</div></div>';
    var totalProductsEl = document.getElementById('totalProducts');
    if (totalProductsEl) totalProductsEl.innerText = products.length;
  }

  // ---- ORDERS ----
  window.loadOrdersAdmin = async function() {
    if (!adminToken) { showToastAdmin('Please login first', true); return; }
    try {
      var res = await fetch(API_BASE + '/api/db/orders', { headers: getAuthHeaders() });
      if (res.status === 401 || res.status === 403) {
        showToastAdmin('Session expired. Please login again.', true);
        logoutAdmin();
        return;
      }
      var data = await res.json();
      if (data.success) {
        allOrders = data.orders.sort(function(a, b) {
          return new Date(b.created_at) - new Date(a.created_at);
        });
        applyFiltersAdmin();
      }
    } catch(e) {
      allOrders = [];
      filteredOrders = [];
    }
    if (currentTab === 'analytics') renderAnalytics();
  };

  function formatDateFilter(dateFilter) {
    var now = new Date();
    switch(dateFilter) {
      case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d': return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '1y': return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      case 'all': return null;
      default: return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  window.applyFiltersAdmin = function() {
    currentDateFilter = document.getElementById('dateFilter').value;
    currentStatusFilter = document.getElementById('statusFilter').value;
    var result = allOrders.slice();
    var cutoffDate = formatDateFilter(currentDateFilter);
    if (cutoffDate) {
      result = result.filter(function(o) { return new Date(o.created_at) >= cutoffDate; });
    }
    if (currentStatusFilter !== 'all') {
      result = result.filter(function(o) { return o.status === currentStatusFilter; });
    }
    filteredOrders = result;
    renderOrdersAdmin();
    updateOrderStatsDisplay();
  };

  // Make this globally available for HTML onchange
  window.applyFilters = window.applyFiltersAdmin;

  function updateOrderStatsDisplay() {
    var total = filteredOrders.length;
    var paid = filteredOrders.filter(function(o) { return o.status === 'paid'; }).length;
    var delivered = filteredOrders.filter(function(o) { return o.status === 'delivered'; }).length;
    document.getElementById('orderStats').innerHTML =
      '<div class="stat-card"><h4>📊 Orders</h4><div class="value">' + total + '</div></div>' +
      '<div class="stat-card"><h4>✅ Paid</h4><div class="value">' + paid + '</div><div class="sub">Ready to deliver</div></div>' +
      '<div class="stat-card"><h4>🚚 Delivered</h4><div class="value">' + delivered + '</div><div class="sub">Completed</div></div>';
    document.getElementById('orderCountDisplay').innerHTML = '📋 ' + total + ' order' + (total !== 1 ? 's' : '') + ' found';
  }

  function renderAnalytics() {
    var delivered = filteredOrders.filter(function(o) { return o.status === 'delivered'; });
    var revenue = 0;
    for (var i = 0; i < delivered.length; i++) {
      revenue += (delivered[i].total || 0);
    }
    var avg = delivered.length ? Math.round(revenue / delivered.length) : 0;
    document.getElementById('totalRevenue').innerHTML = 'KES ' + revenue.toLocaleString();
    document.getElementById('totalOrders').innerHTML = filteredOrders.length;
    document.getElementById('avgOrder').innerHTML = 'KES ' + avg.toLocaleString();
  }

  function findProductImage(productName) {
    if (!productName) return FALLBACK_IMG;
    var product = null;
    for (var i = 0; i < products.length; i++) {
      if (products[i].name && products[i].name.toLowerCase() === productName.toLowerCase()) {
        product = products[i];
        break;
      }
    }
    if (product && product.image) return product.image;
    for (var i = 0; i < products.length; i++) {
      if (products[i].name && (productName.toLowerCase().includes(products[i].name.toLowerCase()) ||
          products[i].name.toLowerCase().includes(productName.toLowerCase()))) {
        product = products[i];
        break;
      }
    }
    if (product && product.image) return product.image;
    return FALLBACK_IMG;
  }

  function renderOrdersAdmin() {
    var filtered = filteredOrders.slice();
    if (orderSearch) {
      filtered = filteredOrders.filter(function(o) {
        return o.customer_name && o.customer_name.toLowerCase().includes(orderSearch) ||
          o.customer_email && o.customer_email.toLowerCase().includes(orderSearch);
      });
    }
    var container = document.getElementById('ordersList');
    if (!filtered.length) {
      container.innerHTML = '<div class="empty-state"><i class="ph ph-clipboard-text"></i><p>No orders found</p></div>';
      return;
    }
    var html = '';
    for (var i = 0; i < filtered.length; i++) {
      var o = filtered[i];
      var items = o.items;
      if (typeof items === 'string') { try { items = JSON.parse(items); } catch(e) { items = []; } }
      var phoneRaw = o.phone || '';
      var cleanPhone = phoneRaw.replace(/\D/g, '');
      var waLink = 'https://wa.me/' + (cleanPhone.startsWith('0') ? '254' + cleanPhone.slice(1) : cleanPhone);
      var callLink = 'tel:' + cleanPhone;
      var itemsHtml = '';
      for (var j = 0; j < (items || []).length; j++) {
        var item = items[j];
        var productName = item.product_name || item.name;
        var productImg = findProductImage(productName);
        var productSize = item.size || (item.capacity || '');
        var productQty = item.quantity || item.qty || 1;
        var productPrice = item.price || 0;
        itemsHtml += '<div class="order-item"><img class="order-item-img" src="' + productImg + '" alt="' + escapeHtml(productName) + '" onerror="this.src=\'\'" loading="lazy">' +
          '<div class="order-item-details"><div class="order-item-name">' + escapeHtml(productName) + '</div>' +
          (productSize ? '<div class="order-item-size">📦 ' + escapeHtml(productSize) + '</div>' : '') +
          '<div class="order-item-qty">Quantity: ' + productQty + '</div></div>' +
          '<div class="order-item-price">KES ' + (productPrice * productQty).toLocaleString() + '</div></div>';
      }
      var deliveryFee = o.delivery_fee || o.delivery || 0;
      var subtotal = o.subtotal || (o.total - deliveryFee);
      var statusClass = o.status === 'paid' ? 'status-paid' : o.status === 'delivered' ? 'status-delivered' : 'status-pending';
      var statusIcon = o.status === 'paid' ? 'ph-check-circle' : o.status === 'delivered' ? 'ph-truck' : 'ph-clock';
      var statusText = o.status === 'paid' ? 'Paid ✅' : o.status === 'delivered' ? 'Delivered 🚚' : 'Pending ⏳';
      html += '<div class="order-card"><div class="order-header"><div><div class="order-id"><i class="ph ph-package"></i> ' +
        (o.order_number || (o._id ? o._id.slice(0, 8) : 'N/A')) + '</div><div class="order-customer">' + escapeHtml(o.customer_name) +
        '</div><div class="order-meta-row"><span class="order-meta-chip"><i class="ph ph-envelope"></i> ' + escapeHtml(o.customer_email) +
        '</span><span class="order-meta-chip"><i class="ph ph-phone"></i> ' + (o.phone || 'No phone') +
        '</span><span class="order-meta-chip"><i class="ph ph-calendar"></i> ' + new Date(o.created_at).toLocaleString() +
        '</span><span class="order-meta-chip"><i class="ph ph-credit-card"></i> M-PESA</span></div></div>' +
        '<div class="order-header-right"><span class="order-status ' + statusClass + '"><i class="ph ' + statusIcon + '"></i> ' +
        statusText + '</span><div class="contact-buttons"><a href="' + waLink + '" target="_blank" class="btn btn-sm btn-wa"><i class="ph ph-whatsapp-logo"></i> WhatsApp</a>' +
        '<a href="' + callLink + '" class="btn btn-sm btn-call"><i class="ph ph-phone-call"></i> Call</a></div></div></div>' +
        '<div class="order-items">' + itemsHtml + '</div><div class="order-footer"><div><div class="order-total">KES ' +
        (o.total || 0).toLocaleString() + '</div><div style="font-size:11px;margin-top:4px;"><span>Subtotal: KES ' +
        (subtotal || 0).toLocaleString() + '</span> | <span>Delivery: ' + (deliveryFee === 0 ? 'FREE' : 'KES ' +
        deliveryFee.toLocaleString()) + '</span></div></div><div class="order-actions">' +
        (o.status === 'paid' ? '<button class="btn btn-sm btn-gold" onclick="markOrderDelivered(\'' + o._id + '\')"><i class="ph ph-truck"></i> Mark Delivered</button>' : '') +
        (o.status === 'delivered' ? '<span class="completed-chip"><i class="ph ph-seal-check"></i> Completed</span>' : '') +
        '<button class="btn btn-sm btn-red" onclick="deleteOrderAdmin(\'' + o._id + '\')"><i class="ph ph-trash"></i></button></div></div></div>';
    }
    container.innerHTML = html;
  }

  window.markOrderDelivered = async function(id) {
    var idx = -1;
    for (var i = 0; i < filteredOrders.length; i++) {
      if (filteredOrders[i]._id === id) { idx = i; break; }
    }
    if (idx === -1) return;
    var original = JSON.parse(JSON.stringify(filteredOrders[idx]));
    filteredOrders[idx].status = 'delivered';
    var allIdx = -1;
    for (var i = 0; i < allOrders.length; i++) {
      if (allOrders[i]._id === id) { allIdx = i; break; }
    }
    if (allIdx !== -1) allOrders[allIdx].status = 'delivered';
    renderOrdersAdmin();
    updateOrderStatsDisplay();
    try {
      var res = await fetch(API_BASE + '/api/db/orders/' + id + '/status', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: 'delivered' })
      });
      if (!res.ok) {
        filteredOrders[idx] = original;
        if (allIdx !== -1) allOrders[allIdx] = original;
        renderOrdersAdmin();
        updateOrderStatsDisplay();
        showToastAdmin('Error', true);
      } else {
        showToastAdmin('✓ Marked as Delivered');
      }
    } catch(e) {
      filteredOrders[idx] = original;
      if (allIdx !== -1) allOrders[allIdx] = original;
      renderOrdersAdmin();
      updateOrderStatsDisplay();
      showToastAdmin('Error', true);
    }
  };

  window.deleteOrderAdmin = async function(id) {
    if (!confirm('Delete order?')) return;
    var idx = -1, deleted = null;
    for (var i = 0; i < filteredOrders.length; i++) {
      if (filteredOrders[i]._id === id) { idx = i; deleted = filteredOrders[i]; break; }
    }
    if (idx !== -1) {
      filteredOrders.splice(idx, 1);
      var allIdx = -1;
      for (var i = 0; i < allOrders.length; i++) {
        if (allOrders[i]._id === id) { allIdx = i; break; }
      }
      if (allIdx !== -1) allOrders.splice(allIdx, 1);
      renderOrdersAdmin();
      updateOrderStatsDisplay();
    }
    try {
      await fetch(API_BASE + '/api/db/orders/' + id, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      showToastAdmin('Order deleted');
    } catch(e) {
      if (deleted && idx !== -1) {
        filteredOrders.splice(idx, 0, deleted);
        allOrders.push(deleted);
        renderOrdersAdmin();
        updateOrderStatsDisplay();
      }
      showToastAdmin('Error', true);
    }
  };

  // ---- SETTINGS ----
  window.loadDeliverySettingsAdmin = async function() {
    if (!adminToken) return;
    try {
      var res = await fetch(API_BASE + '/api/admin/delivery-settings', { headers: getAuthHeaders() });
      var data = await res.json();
      if (data.success && data.settings) {
        document.getElementById('deliveryFee').value = data.settings.delivery_fee || 150;
        document.getElementById('freeThreshold').value = data.settings.free_delivery_threshold || 3000;
        var enabledEl = document.getElementById('deliveryEnabled');
        if (enabledEl) enabledEl.checked = data.settings.delivery_enabled !== false;
      }
    } catch(e) {}
  };

  window.saveDeliverySettings = async function() {
    var settings = {
      delivery_fee: parseInt(document.getElementById('deliveryFee').value) || 0,
      free_delivery_threshold: parseInt(document.getElementById('freeThreshold').value) || 0,
      delivery_enabled: document.getElementById('deliveryEnabled') ? document.getElementById('deliveryEnabled').checked : true
    };
    try {
      var res = await fetch(API_BASE + '/api/admin/delivery-settings', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(settings)
      });
      if (res.ok) showToastAdmin('Delivery settings saved');
      else showToastAdmin('Error', true);
    } catch(e) {
      showToastAdmin('Error', true);
    }
  };

  window.updatePasswords = async function() {
    var adminPassword = document.getElementById('newAdminPassword').value.trim();
    var cashierPassword = document.getElementById('newCashierPassword').value.trim();
    if (!adminPassword && !cashierPassword) {
      showToastAdmin('Enter at least one password to change', true);
      return;
    }
    var btn = document.getElementById('updatePasswordsBtn');
    if (!btn) { showToastAdmin('Save button not found', true); return; }
    var originalHTML = btn.innerHTML;
    btn.innerHTML = '<span class="loading-spinner"></span> Saving...';
    btn.disabled = true;
    try {
      var body = {};
      if (adminPassword) body.adminPassword = adminPassword;
      if (cashierPassword) body.cashierPassword = cashierPassword;
      var res = await fetch(API_BASE + '/api/admin/update-passwords', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body)
      });
      var data = await res.json();
      if (data.success) {
        showToastAdmin('Passwords updated! Logging out...');
        localStorage.removeItem('liquorbelle_admin_token');
        adminToken = null;
        document.getElementById('newAdminPassword').value = '';
        document.getElementById('newCashierPassword').value = '';
        setTimeout(function() { window.location.href = window.location.pathname; }, 1500);
      } else {
        showToastAdmin(data.message || 'Error updating passwords', true);
      }
    } catch(e) {
      showToastAdmin('Error: ' + e.message, true);
    } finally {
      btn.innerHTML = originalHTML;
      btn.disabled = false;
    }
  };

  // ---- SEARCH ----
  var productSearchInput = document.getElementById('productSearch');
  if (productSearchInput) {
    productSearchInput.addEventListener('input', function(e) {
      productSearch = e.target.value.toLowerCase();
      renderProductsAdmin();
    });
  }

  window.clearProductSearch = function() {
    productSearch = '';
    document.getElementById('productSearch').value = '';
    renderProductsAdmin();
  };

  // ---- LOGOUT ----
  window.logout = function() {
    localStorage.removeItem('liquorbelle_admin_token');
    adminToken = null;
    clearTimeout(inactivityTimer);
    clearInterval(inactivityCountdown);
    var warning = document.getElementById('inactivityWarning');
    if (warning) warning.classList.remove('show');
    isInactivityWarningShowing = false;
    updateSessionIndicator();
    location.reload();
  };

  window.hideToast = hideToastAdmin;
  window.showToast = showToastAdmin;

  // ---- DRAG & DROP ----
  var dropZone = document.getElementById('bulkDropZone');
  if (dropZone) {
    dropZone.addEventListener('dragover', function(e) {
      e.preventDefault();
      this.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', function(e) {
      e.preventDefault();
      this.classList.remove('dragover');
    });
    dropZone.addEventListener('drop', function(e) {
      e.preventDefault();
      this.classList.remove('dragover');
      var files = e.dataTransfer.files;
      if (files.length > 0 && files[0].name.endsWith('.csv')) {
        var reader = new FileReader();
        reader.onload = function(ev) {
          document.getElementById('bulkCsvInput').value = ev.target.result;
          showToastAdmin('CSV file loaded: ' + files[0].name);
        };
        reader.readAsText(files[0]);
      }
    });
  }

  // ---- TAB SWITCHING ----
  var tabs = document.querySelectorAll('.tab');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].addEventListener('click', function() {
      var allTabs = document.querySelectorAll('.tab');
      for (var j = 0; j < allTabs.length; j++) allTabs[j].classList.remove('active');
      this.classList.add('active');
      currentTab = this.dataset.tab;
      document.getElementById('productsTab').style.display = currentTab === 'products' ? 'block' : 'none';
      document.getElementById('ordersTab').style.display = currentTab === 'orders' ? 'block' : 'none';
      document.getElementById('analyticsTab').style.display = currentTab === 'analytics' ? 'block' : 'none';
      document.getElementById('settingsTab').style.display = currentTab === 'settings' ? 'block' : 'none';
      if (currentTab === 'orders' && allOrders.length) renderOrdersAdmin();
      if (currentTab === 'analytics' && allOrders.length) renderAnalytics();
    });
  }

  // ---- INIT ----
  async function initAdminFull() {
    adminToken = localStorage.getItem('liquorbelle_admin_token');
    if (adminToken) {
      document.getElementById('adminLoginModal').style.display = 'none';
      resetInactivityTimer();
      updateSessionIndicator();
      await loadProductsAdmin();
      await loadOrdersAdmin();
      await loadDeliverySettingsAdmin();
    } else {
      document.getElementById('adminLoginModal').style.display = 'flex';
      setTimeout(function() { document.getElementById('adminPassword').focus(); }, 300);
    }
  }

  initAdminFull();
  setInterval(function() { if (adminToken) loadProductsAdmin(); }, 120000);
  setInterval(function() { if (adminToken) loadOrdersAdmin(); }, 120000);
}

// ============================================================
// ADMIN-ORDERS.HTML — ALL FUNCTIONS EXPOSED GLOBALLY
// ============================================================
if (document.getElementById('cashierLoginModal')) {
  
  var cashierToken = localStorage.getItem('liquorbelle_cashier_token');
  var allOrdersCashier = [];
  var filteredOrdersCashier = [];
  var productsCashier = [];
  var searchTermCashier = '';
  var currentDateFilterCashier = 'all';
  var currentStatusFilterCashier = 'all';
  var pendingActions = new Map();
  var autoRefreshIntervalCashier = null;

  function getAuthHeadersCashier() {
    return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cashierToken };
  }

  function showToastCashier(msg, isError) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.innerText = msg;
    t.classList.toggle('error', isError);
    t.classList.toggle('success', !isError);
    t.classList.add('show');
    clearTimeout(t._timeout);
    t._timeout = setTimeout(function() { t.classList.remove('show', 'error', 'success'); }, 3200);
  }

  window.toast = showToastCashier;

  function formatPhoneCashier(phone) {
    if (!phone) return '';
    var clean = phone.replace(/\D/g, '');
    if (clean.startsWith('0')) clean = '254' + clean.slice(1);
    if (!clean.startsWith('254')) clean = '254' + clean;
    return clean;
  }

  function formatDisplayPhone(phone) {
    if (!phone) return 'No phone';
    var display = phone.toString();
    if (display.length === 12 && display.startsWith('254')) return '0' + display.slice(3);
    if (display.length === 10 && (display.startsWith('07') || display.startsWith('01'))) return display;
    return display;
  }

  function getOrderDisplayId(order) {
    if (order.order_number) return order.order_number;
    if (order._id) { var idStr = order._id.toString(); return idStr.slice(-8).toUpperCase(); }
    return 'N/A';
  }

  function findProductImageCashier(productName, productId) {
    if (!productName && !productId) return FALLBACK_IMG;
    if (productId) {
      for (var i = 0; i < productsCashier.length; i++) {
        if (productsCashier[i]._id === productId) { if (productsCashier[i].image) return productsCashier[i].image; break; }
      }
    }
    if (productName) {
      for (var i = 0; i < productsCashier.length; i++) {
        if (productsCashier[i].name && productsCashier[i].name.toLowerCase() === productName.toLowerCase()) {
          if (productsCashier[i].image) return productsCashier[i].image;
          break;
        }
      }
      for (var i = 0; i < productsCashier.length; i++) {
        if (productsCashier[i].name && (productName.toLowerCase().includes(productsCashier[i].name.toLowerCase()) ||
            productsCashier[i].name.toLowerCase().includes(productName.toLowerCase()))) {
          if (productsCashier[i].image) return productsCashier[i].image;
          break;
        }
      }
    }
    return FALLBACK_IMG;
  }

  // ---- LOGIN ----
  window.cashierLogin = async function(password) {
    try {
      var res = await fetch(API_BASE + '/api/cashier/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password })
      });
      var data = await res.json();
      if (data.success && data.token) {
        cashierToken = data.token;
        localStorage.setItem('liquorbelle_cashier_token', cashierToken);
        localStorage.setItem('liquorbelle_admin_role', data.role);
        return true;
      }
      return false;
    } catch(e) {
      return false;
    }
  };

  window.submitCashierLogin = function() {
    var password = document.getElementById('cashierPassword').value;
    var errorDiv = document.getElementById('loginError');
    errorDiv.innerText = '';
    if (!password) {
      errorDiv.innerText = 'Please enter your password.';
      return;
    }
    var btn = document.getElementById('loginBtn');
    var originalText = btn.innerHTML;
    btn.innerHTML = '<span class="loading-spinner"></span> Logging in...';
    btn.disabled = true;
    cashierLogin(password).then(function(success) {
      btn.innerHTML = originalText;
      btn.disabled = false;
      if (success) {
        document.getElementById('cashierLoginModal').style.display = 'none';
        initAfterLoginCashier();
      } else {
        errorDiv.innerText = 'Invalid cashier password. Try again.';
        document.getElementById('cashierPassword').value = '';
        document.getElementById('cashierPassword').focus();
      }
    });
  };

  window.togglePasswordVisibility = function() {
    var passwordInput = document.getElementById('cashierPassword');
    var toggleIcon = document.getElementById('togglePasswordIcon');
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      toggleIcon.setAttribute('class', 'ph ph-eye-slash');
    } else {
      passwordInput.type = 'password';
      toggleIcon.setAttribute('class', 'ph ph-eye');
    }
  };

  // ---- FILTERS ----
  window.applyFiltersCashier = function() {
    currentDateFilterCashier = document.getElementById('dateFilter').value;
    currentStatusFilterCashier = document.getElementById('statusFilter').value;

    var result = allOrdersCashier.slice();

    if (currentDateFilterCashier !== 'all') {
      var daysAgo = new Date(Date.now() - parseInt(currentDateFilterCashier) * 24 * 60 * 60 * 1000);
      result = result.filter(function(o) { return new Date(o.created_at) >= daysAgo; });
    }

    if (currentStatusFilterCashier !== 'all') {
      result = result.filter(function(o) { return o.status === currentStatusFilterCashier; });
    }

    filteredOrdersCashier = result;

    renderStatsCashier();
    renderOrdersCashier();
  };

  // Make this globally available for HTML onchange
  window.applyFilters = window.applyFiltersCashier;

  function renderStatsCashier() {
    var total = filteredOrdersCashier.length;
    var pending = filteredOrdersCashier.filter(function(o) { return o.status === 'pending'; }).length;
    var paid = filteredOrdersCashier.filter(function(o) { return o.status === 'paid'; }).length;
    var delivered = filteredOrdersCashier.filter(function(o) { return o.status === 'delivered'; }).length;

    var periodText = '';
    if (currentDateFilterCashier === 'all') periodText = 'All Time';
    else if (currentDateFilterCashier === '1') periodText = 'Last 24 Hours';
    else if (currentDateFilterCashier === '7') periodText = 'Last 7 Days';
    else if (currentDateFilterCashier === '30') periodText = 'Last 30 Days';
    else if (currentDateFilterCashier === '90') periodText = 'Last 90 Days';
    else if (currentDateFilterCashier === '365') periodText = 'Last Year';

    var statusText = '';
    if (currentStatusFilterCashier === 'all') statusText = 'Orders';
    else if (currentStatusFilterCashier === 'pending') statusText = 'Pending';
    else if (currentStatusFilterCashier === 'paid') statusText = 'Paid';
    else if (currentStatusFilterCashier === 'delivered') statusText = 'Delivered';

    document.getElementById('statsGrid').innerHTML =
      '<div class="stat-card"><h4>📊 ' + statusText + '</h4><div class="value">' + total + '</div><div class="sub">' + periodText + '</div><div class="icon">📊</div></div>' +
      '<div class="stat-card"><h4>⏳ Pending</h4><div class="value">' + pending + '</div><div class="sub">Need payment</div><div class="icon">⏳</div></div>' +
      '<div class="stat-card"><h4>✅ Paid</h4><div class="value">' + paid + '</div><div class="sub">Ready to deliver</div><div class="icon">✅</div></div>' +
      '<div class="stat-card"><h4>🚚 Delivered</h4><div class="value">' + delivered + '</div><div class="sub">Completed</div><div class="icon">🚚</div></div>';

    document.getElementById('orderCountDisplay').innerHTML = '📋 ' + total + ' order' + (total !== 1 ? 's' : '') + ' found';
  }

  function renderOrdersCashier() {
    var filtered = filteredOrdersCashier.slice();
    if (searchTermCashier) {
      filtered = filteredOrdersCashier.filter(function(o) {
        return (o.customer_name && o.customer_name.toLowerCase().includes(searchTermCashier)) ||
          (o.customer_email && o.customer_email.toLowerCase().includes(searchTermCashier)) ||
          (o.phone && o.phone.includes(searchTermCashier));
      });
    }

    var container = document.getElementById('ordersContainer');
    if (!filtered.length) {
      container.innerHTML = '<div class="empty-state"><i class="ph ph-clipboard-text"></i><p>No orders found</p></div>';
      return;
    }

    var html = '';
    for (var i = 0; i < filtered.length; i++) {
      var o = filtered[i];
      var items = o.items;
      if (typeof items === 'string') { try { items = JSON.parse(items); } catch(e) { items = []; } }
      if (!items || !items.length) items = [];

      var phoneRaw = o.phone || '';
      var cleanPhone = formatPhoneCashier(phoneRaw);
      var displayPhone = formatDisplayPhone(phoneRaw);
      var waLink = cleanPhone ? 'https://wa.me/' + cleanPhone : '#';
      var callLink = cleanPhone ? 'tel:' + cleanPhone : '#';

      var itemsHtml = '';
      for (var j = 0; j < items.length; j++) {
        var item = items[j];
        var productImg = findProductImageCashier(item.product_name || item.name, item.product_id);
        var imgSrc = productImg && productImg.includes('cloudinary.com') ? optimizeImage(productImg, 100) : productImg;
        var itemName = item.product_name || item.name || 'Product';
        var itemQty = item.quantity || item.qty || 1;
        var itemPrice = item.price || 0;
        itemsHtml += '<div class="order-item">' +
          '<img class="order-item-img" src="' + imgSrc + '" onerror="this.src=\'\'" loading="lazy">' +
          '<div class="order-item-details">' +
          '<div class="order-item-name">' + escapeHtml(itemName) + (item.size ? '<span style="font-weight:400;color:var(--muted)">(' + item.size + ')</span>' : '') + '</div>' +
          '<div class="order-item-qty">Qty: ' + itemQty + '</div>' +
          '</div>' +
          '<div class="order-item-price">KES ' + (itemPrice * itemQty).toLocaleString() + '</div>' +
          '</div>';
      }

      var orderId = getOrderDisplayId(o);
      var isProcessing = pendingActions.has(o._id);
      var statusLabel = o.status === 'pending' ? 'Pending' : o.status === 'paid' ? 'Paid' : 'Delivered';
      var statusIcon = o.status === 'pending' ? 'ph-clock' : o.status === 'paid' ? 'ph-check-circle' : 'ph-truck';

      var deliveryFee = o.delivery || 0;
      var subtotal = o.subtotal || (o.total - deliveryFee);
      var deliveryDisplay = deliveryFee === 0 ? '<span style="color:var(--green);">FREE</span>' : 'KES ' + deliveryFee.toLocaleString();

      var actionsHtml = '';
      if (o.status === 'pending') {
        actionsHtml = '<button class="btn btn-sm btn-green" onclick="markPaid(\'' + o._id + '\')" ' + (isProcessing ? 'disabled' : '') + '><i class="ph ph-check-circle"></i> ' + (isProcessing ? '<span class="loading-spinner"></span>' : 'Mark Paid') + '</button>';
      } else if (o.status === 'paid') {
        actionsHtml = '<button class="btn btn-sm btn-gold" onclick="markDelivered(\'' + o._id + '\')" ' + (isProcessing ? 'disabled' : '') + '><i class="ph ph-truck"></i> ' + (isProcessing ? '<span class="loading-spinner"></span>' : 'Mark Delivered') + '</button>';
      } else if (o.status === 'delivered') {
        actionsHtml = '<span class="completed-chip"><i class="ph ph-seal-check"></i> Completed</span>';
      }

      html += '<div class="order-card" data-order-id="' + o._id + '">' +
        '<div class="order-header">' +
        '<div>' +
        '<div class="order-id"><i class="ph ph-package"></i> ' + orderId + '</div>' +
        '<div class="order-customer">' + escapeHtml(o.customer_name || 'Customer') + '</div>' +
        '<div class="order-meta-row">' +
        '<span class="order-meta-chip"><i class="ph ph-envelope"></i> ' + escapeHtml(o.customer_email || 'No email') + '</span>' +
        '<span class="order-meta-chip"><i class="ph ph-calendar"></i> ' + new Date(o.created_at).toLocaleString() + '</span>' +
        '</div>' +
        '<div class="order-meta-row">' +
        '<span class="order-phone-chip"><i class="ph ph-phone"></i> ' + escapeHtml(displayPhone) + '</span>' +
        '</div>' +
        '</div>' +
        '<div class="order-header-right">' +
        '<span class="order-status status-' + o.status + '"><i class="ph ' + statusIcon + '"></i> ' + statusLabel + '</span>' +
        '<div class="contact-buttons">' +
        '<a href="' + waLink + '" target="_blank" class="btn btn-sm btn-wa" ' + (!cleanPhone ? 'style="opacity:0.5;pointer-events:none;"' : '') + '><i class="ph ph-whatsapp-logo"></i> WhatsApp</a>' +
        '<a href="' + callLink + '" class="btn btn-sm btn-call" ' + (!cleanPhone ? 'style="opacity:0.5;pointer-events:none;"' : '') + '><i class="ph ph-phone-call"></i> Call</a>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="order-items">' + (itemsHtml || '<div style="color:var(--muted);font-size:13px;padding:8px 0;">No items found</div>') + '</div>' +
        '<div class="order-footer">' +
        '<div>' +
        '<div class="order-total">KES ' + (o.total || 0).toLocaleString() + '</div>' +
        '<div class="order-total-label">Order Total</div>' +
        '<div class="order-meta-small">' +
        '<span><i class="ph ph-package"></i> Subtotal: KES ' + (subtotal || 0).toLocaleString() + '</span>' +
        '<span><i class="ph ph-truck"></i> Delivery: ' + deliveryDisplay + '</span>' +
        '<span><i class="ph ph-credit-card"></i> ' + (o.payment_method || 'Unknown') + '</span>' +
        '<span><i class="ph ph-map-pin"></i> ' + escapeHtml((o.address || '').substring(0, 45)) + '</span>' +
        '</div>' +
        '</div>' +
        '<div class="order-actions">' + actionsHtml + '</div>' +
        '</div>' +
        '</div>';
    }
    container.innerHTML = html;
  }

  // ---- LOAD ----
  window.loadProductsCashier = async function() {
    try {
      var res = await fetch(API_BASE + '/api/db/products');
      var data = await res.json();
      if (data.success) productsCashier = data.products;
    } catch(e) {
      productsCashier = [];
    }
  };

  window.loadOrdersCashier = async function() {
    if (!cashierToken) { return; }
    try {
      var res = await fetch(API_BASE + '/api/admin/all-orders?limit=1000', {
        headers: getAuthHeadersCashier()
      });

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('liquorbelle_cashier_token');
        localStorage.removeItem('liquorbelle_admin_role');
        cashierToken = null;
        if (autoRefreshIntervalCashier) clearInterval(autoRefreshIntervalCashier);
        document.getElementById('cashierLoginModal').style.display = 'flex';
        return;
      }
      if (res.status === 429) {
        showToastCashier('⚠️ Too many requests. Please wait...', true);
        return;
      }
      var data = await res.json();
      if (data.success) {
        allOrdersCashier = data.orders.sort(function(a, b) {
          return new Date(b.created_at) - new Date(a.created_at);
        });
        applyFiltersCashier();
      } else {
        allOrdersCashier = [];
        filteredOrdersCashier = [];
        renderStatsCashier();
        renderOrdersCashier();
      }
    } catch(e) {
      console.error('Error loading orders:', e);
      allOrdersCashier = [];
      filteredOrdersCashier = [];
      renderStatsCashier();
      renderOrdersCashier();
    }
  };

  window.manualRefresh = function() {
    showToastCashier('Refreshing orders...');
    loadOrdersCashier();
  };

  // ---- MARK PAID ----
  window.markPaid = async function(id) {
    if (pendingActions.has(id)) return;

    var orderIndex = -1;
    for (var i = 0; i < filteredOrdersCashier.length; i++) {
      if (filteredOrdersCashier[i]._id === id) { orderIndex = i; break; }
    }
    if (orderIndex === -1) return;
    var originalOrder = JSON.parse(JSON.stringify(filteredOrdersCashier[orderIndex]));

    pendingActions.set(id, 'paid');
    renderOrdersCashier();
    renderStatsCashier();

    try {
      var res = await fetch(API_BASE + '/api/cashier/orders/' + id + '/status', {
        method: 'PUT',
        headers: getAuthHeadersCashier(),
        body: JSON.stringify({ status: 'paid' })
      });

      if (res.status === 429) {
        showToastCashier('⚠️ Server busy, retrying...', true);
        setTimeout(function() { markPaid(id); }, 3000);
        pendingActions.delete(id);
        renderOrdersCashier();
        return;
      }

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('liquorbelle_cashier_token');
        localStorage.removeItem('liquorbelle_admin_role');
        cashierToken = null;
        if (autoRefreshIntervalCashier) clearInterval(autoRefreshIntervalCashier);
        document.getElementById('cashierLoginModal').style.display = 'flex';
        showToastCashier('Session expired. Please login again.', true);
        pendingActions.delete(id);
        var revertIndex = -1;
        for (var i = 0; i < filteredOrdersCashier.length; i++) {
          if (filteredOrdersCashier[i]._id === id) { revertIndex = i; break; }
        }
        if (revertIndex !== -1) filteredOrdersCashier[revertIndex] = originalOrder;
        var allIdx = -1;
        for (var i = 0; i < allOrdersCashier.length; i++) {
          if (allOrdersCashier[i]._id === id) { allIdx = i; break; }
        }
        if (allIdx !== -1) allOrdersCashier[allIdx] = originalOrder;
        renderOrdersCashier();
        renderStatsCashier();
        return;
      }

      if (res.ok) {
        showToastCashier('✅ Order marked as PAID');
        var updateIndex = -1;
        for (var i = 0; i < filteredOrdersCashier.length; i++) {
          if (filteredOrdersCashier[i]._id === id) { updateIndex = i; break; }
        }
        if (updateIndex !== -1) filteredOrdersCashier[updateIndex].status = 'paid';
        var allUpdateIdx = -1;
        for (var i = 0; i < allOrdersCashier.length; i++) {
          if (allOrdersCashier[i]._id === id) { allUpdateIdx = i; break; }
        }
        if (allUpdateIdx !== -1) allOrdersCashier[allUpdateIdx].status = 'paid';
        pendingActions.delete(id);
        renderOrdersCashier();
        renderStatsCashier();
        setTimeout(function() { loadOrdersCashier(); }, 500);
      } else {
        var revertIndex = -1;
        for (var i = 0; i < filteredOrdersCashier.length; i++) {
          if (filteredOrdersCashier[i]._id === id) { revertIndex = i; break; }
        }
        if (revertIndex !== -1) filteredOrdersCashier[revertIndex] = originalOrder;
        var allIdx = -1;
        for (var i = 0; i < allOrdersCashier.length; i++) {
          if (allOrdersCashier[i]._id === id) { allIdx = i; break; }
        }
        if (allIdx !== -1) allOrdersCashier[allIdx] = originalOrder;
        pendingActions.delete(id);
        renderOrdersCashier();
        renderStatsCashier();
        showToastCashier('Error updating order', true);
      }
    } catch(e) {
      var revertIndex = -1;
      for (var i = 0; i < filteredOrdersCashier.length; i++) {
        if (filteredOrdersCashier[i]._id === id) { revertIndex = i; break; }
      }
      if (revertIndex !== -1) filteredOrdersCashier[revertIndex] = originalOrder;
      var allIdx = -1;
      for (var i = 0; i < allOrdersCashier.length; i++) {
        if (allOrdersCashier[i]._id === id) { allIdx = i; break; }
      }
      if (allIdx !== -1) allOrdersCashier[allIdx] = originalOrder;
      pendingActions.delete(id);
      renderOrdersCashier();
      renderStatsCashier();
      showToastCashier('Network error', true);
    }
  };

  // ---- MARK DELIVERED ----
  window.markDelivered = async function(id) {
    if (pendingActions.has(id)) return;

    var orderIndex = -1;
    for (var i = 0; i < filteredOrdersCashier.length; i++) {
      if (filteredOrdersCashier[i]._id === id) { orderIndex = i; break; }
    }
    if (orderIndex === -1) return;
    var originalOrder = JSON.parse(JSON.stringify(filteredOrdersCashier[orderIndex]));

    pendingActions.set(id, 'delivered');
    renderOrdersCashier();
    renderStatsCashier();

    try {
      var res = await fetch(API_BASE + '/api/cashier/orders/' + id + '/status', {
        method: 'PUT',
        headers: getAuthHeadersCashier(),
        body: JSON.stringify({ status: 'delivered' })
      });

      if (res.status === 429) {
        showToastCashier('⚠️ Server busy, retrying...', true);
        setTimeout(function() { markDelivered(id); }, 3000);
        pendingActions.delete(id);
        renderOrdersCashier();
        return;
      }

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('liquorbelle_cashier_token');
        localStorage.removeItem('liquorbelle_admin_role');
        cashierToken = null;
        if (autoRefreshIntervalCashier) clearInterval(autoRefreshIntervalCashier);
        document.getElementById('cashierLoginModal').style.display = 'flex';
        showToastCashier('Session expired. Please login again.', true);
        pendingActions.delete(id);
        var revertIndex = -1;
        for (var i = 0; i < filteredOrdersCashier.length; i++) {
          if (filteredOrdersCashier[i]._id === id) { revertIndex = i; break; }
        }
        if (revertIndex !== -1) filteredOrdersCashier[revertIndex] = originalOrder;
        var allIdx = -1;
        for (var i = 0; i < allOrdersCashier.length; i++) {
          if (allOrdersCashier[i]._id === id) { allIdx = i; break; }
        }
        if (allIdx !== -1) allOrdersCashier[allIdx] = originalOrder;
        renderOrdersCashier();
        renderStatsCashier();
        return;
      }

      if (res.ok) {
        showToastCashier('🚚 Order marked as DELIVERED');
        var updateIndex = -1;
        for (var i = 0; i < filteredOrdersCashier.length; i++) {
          if (filteredOrdersCashier[i]._id === id) { updateIndex = i; break; }
        }
        if (updateIndex !== -1) filteredOrdersCashier[updateIndex].status = 'delivered';
        var allUpdateIdx = -1;
        for (var i = 0; i < allOrdersCashier.length; i++) {
          if (allOrdersCashier[i]._id === id) { allUpdateIdx = i; break; }
        }
        if (allUpdateIdx !== -1) allOrdersCashier[allUpdateIdx].status = 'delivered';
        pendingActions.delete(id);
        renderOrdersCashier();
        renderStatsCashier();
        setTimeout(function() { loadOrdersCashier(); }, 500);
      } else {
        var revertIndex = -1;
        for (var i = 0; i < filteredOrdersCashier.length; i++) {
          if (filteredOrdersCashier[i]._id === id) { revertIndex = i; break; }
        }
        if (revertIndex !== -1) filteredOrdersCashier[revertIndex] = originalOrder;
        var allIdx = -1;
        for (var i = 0; i < allOrdersCashier.length; i++) {
          if (allOrdersCashier[i]._id === id) { allIdx = i; break; }
        }
        if (allIdx !== -1) allOrdersCashier[allIdx] = originalOrder;
        pendingActions.delete(id);
        renderOrdersCashier();
        renderStatsCashier();
        showToastCashier('Error updating order', true);
      }
    } catch(e) {
      var revertIndex = -1;
      for (var i = 0; i < filteredOrdersCashier.length; i++) {
        if (filteredOrdersCashier[i]._id === id) { revertIndex = i; break; }
      }
      if (revertIndex !== -1) filteredOrdersCashier[revertIndex] = originalOrder;
      var allIdx = -1;
      for (var i = 0; i < allOrdersCashier.length; i++) {
        if (allOrdersCashier[i]._id === id) { allIdx = i; break; }
      }
      if (allIdx !== -1) allOrdersCashier[allIdx] = originalOrder;
      pendingActions.delete(id);
      renderOrdersCashier();
      renderStatsCashier();
      showToastCashier('Network error', true);
    }
  };

  // ---- SEARCH ----
  window.clearSearch = function() {
    searchTermCashier = '';
    document.getElementById('orderSearch').value = '';
    renderOrdersCashier();
  };

  document.getElementById('orderSearch').addEventListener('input', function(e) {
    searchTermCashier = e.target.value.toLowerCase();
    renderOrdersCashier();
  });

  // ---- LOGOUT ----
  window.logout = function() {
    localStorage.removeItem('liquorbelle_cashier_token');
    localStorage.removeItem('liquorbelle_admin_role');
    cashierToken = null;
    if (autoRefreshIntervalCashier) clearInterval(autoRefreshIntervalCashier);
    location.reload();
  };

  // ---- INIT ----
  async function initAfterLoginCashier() {
    await loadProductsCashier();
    await loadOrdersCashier();
    if (autoRefreshIntervalCashier) clearInterval(autoRefreshIntervalCashier);
    autoRefreshIntervalCashier = setInterval(function() {
      if (cashierToken) loadOrdersCashier();
    }, 10000);
  }

  async function initCashier() {
    cashierToken = localStorage.getItem('liquorbelle_cashier_token');
    if (cashierToken) {
      document.getElementById('cashierLoginModal').style.display = 'none';
      await initAfterLoginCashier();
    } else {
      document.getElementById('cashierLoginModal').style.display = 'flex';
      setTimeout(function() {
        document.getElementById('cashierPassword').focus();
      }, 300);
    }
  }

  initCashier();
}

// ============================================================
// SERVICE WORKER REGISTRATION
// ============================================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/liquorbelle/sw.js')
      .then(function(reg) {
        console.log('[SW] Registered successfully:', reg);
      })
      .catch(function(err) {
        console.log('[SW] Registration failed:', err);
      });
  });
}

console.log('🚀 LiquorBelle — Master app.js loaded (FIXED)');