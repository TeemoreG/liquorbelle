// ============================================================
// LIQUORBELLE — PAGE-SPECIFIC LOGIC
// Index, Shop, Product Details, Checkout, Track Orders
// ============================================================

// ============================================================
// HEADER MENU & SEARCH
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
    { name: "Whisky", cat: "whisky", image: "https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1782048542/ARZLR-0_rmmte9.jpg" },
    { name: "Wine", cat: "wine", image: "https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1782048744/Most-popular-beers-in-Kenya-Guinness_a2ggz6.jpg" },
    { name: "Vodka", cat: "vodka", image: "https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1781861620/360_F_1968789415_ryoi6Go4jg91plfDJTcIIjSWJoQebHb5_ftjnxo.jpg" },
    { name: "Gin", cat: "gin", image: "https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1782048367/CHCAS-0_w3c0de.jpg" },
    { name: "Cognac", cat: "cognac", image: "https://res.cloudinary.com/dvqjgbdhp/image/upload/v1782318392/ej-vs-brandy__24539.1752495285.1280.1280__71304.1_bvxpwn.jpg" },
    { name: "Creams", cat: "cream", image: "https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1782318741/What-Is-Drambuie-FT-BLOG0823-a15766cd40da434a8145fe33552e5a9c_i0h8wg.jpg" },
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
      (p.isTrending ? '<span class="badge-new">Trending</span>' : '') +
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

  // Quick View
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
}

// ============================================================
// SHOP.HTML
// ============================================================
if (document.getElementById('catChips')) {
  var ALL_PRODUCTS = [];
  var filteredProducts = [];
  var currentPage = 1;
  var PAGE_SIZE = 12;
  var currentSort = 'featured';
  var currentFilters = { category: 'all', search: '', priceMin: null, priceMax: null, onSale: false };
  var deliverySettings = { delivery_fee: 150, free_delivery_threshold: 3000, delivery_enabled: true };

  // ===== CATEGORIES - ALL 18 =====
  var categoriesShop = [
    { name: "All", cat: "all" },
    { name: "Whisky", cat: "whisky" },
    { name: "Wine", cat: "wine" },
    { name: "Vodka", cat: "vodka" },
    { name: "Gin", cat: "gin" },
    { name: "Cognac", cat: "cognac" },
    { name: "Creams", cat: "cream" },
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

  // ===== AD POSTER - MODERN VERSION =====
  (function initAdPoster() {
    var adData = [
      { icon: 'ph-shield-check', title: '100% Authentic Products', desc: 'Official distributors • Genuine brands • Quality guaranteed', badge: 'Trusted', bgGradient: 'linear-gradient(135deg, #1a472a, #2d6a4f)', accentColor: '#52b788' },
      { icon: 'ph-truck', title: 'Fast & Reliable Delivery', desc: '10–45 minutes across Nairobi • Rider calls before arrival', badge: 'Swift', bgGradient: 'linear-gradient(135deg, #1a365d, #2b6cb0)', accentColor: '#63b3ed' },
      { icon: 'ph-credit-card', title: 'Easy M-PESA Checkout', desc: 'STK Push payment • Secure • Instant confirmation', badge: 'Simple', bgGradient: 'linear-gradient(135deg, #6b21a5, #7c3aed)', accentColor: '#a78bfa' },
      { icon: 'ph-clock', title: 'Open 24/7 — We Never Close', desc: 'Order anytime • Day or night • Always available', badge: 'Always', bgGradient: 'linear-gradient(135deg, #9a3412, #c2410c)', accentColor: '#fb923c' },
      { icon: 'ph-seal-check', title: 'Wide Selection — 100+ Brands', desc: 'Whisky • Cognac • Vodka • Gin • Rum • Wine • Beer', badge: 'Variety', bgGradient: 'linear-gradient(135deg, #1e1b4b, #3730a3)', accentColor: '#818cf8' }
    ];
    var adIndex = 0;
    var adInterval = null;
    var isTransitioning = false;

    function renderAd(index) {
      if (isTransitioning) return;
      isTransitioning = true;
      
      var data = adData[index % adData.length];
      var poster = document.getElementById('adPosterInner');
      if (poster) {
        poster.style.opacity = '0';
        poster.style.transform = 'scale(0.98)';
        setTimeout(function() {
          var iconEl = document.getElementById('adIcon');
          if (iconEl) {
            iconEl.innerHTML = '<i class="ph ' + data.icon + '"></i>';
          }
          var titleEl = document.getElementById('adTitle');
          if (titleEl) titleEl.textContent = data.title;
          var descEl = document.getElementById('adDesc');
          if (descEl) descEl.textContent = data.desc;
          var badgeEl = document.getElementById('adBadge');
          if (badgeEl) badgeEl.textContent = data.badge;
          
          var wrapper = document.getElementById('adPosterWrapper');
          if (wrapper) {
            wrapper.style.background = data.bgGradient;
            wrapper.style.setProperty('--accent-color', data.accentColor);
          }
          
          var dots = document.querySelectorAll('.ad-dot');
          dots.forEach(function(d, i) {
            d.classList.toggle('active', i === index);
          });
          
          poster.style.opacity = '1';
          poster.style.transform = 'scale(1)';
          setTimeout(function() {
            isTransitioning = false;
          }, 400);
        }, 300);
      }
    }

    var container = document.getElementById('adDots');
    if (container) {
      container.innerHTML = '';
      for (var i = 0; i < adData.length; i++) {
        var dot = document.createElement('span');
        dot.className = 'ad-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('data-index', i);
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

  // ===== MAP DB PRODUCTS WITH STOCK STATUS =====
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
      var hasInStock = variants.some(function(v) {
        return v.stock === 'inStock' || (!v.stock && v.stockQuantity > 0) || (!v.stock && v.stockQuantity === undefined);
      });
      var allOutOfStock = variants.every(function(v) {
        return v.stock === 'outOfStock' || (v.stockQuantity !== undefined && v.stockQuantity <= 0);
      });
      var stockStatus = 'in-stock';
      if (allOutOfStock || !hasInStock) {
        stockStatus = 'out-of-stock';
      } else {
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
        stockStatus: stockStatus,
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
    
    // ===== STOCK STATUS =====
    var stockInfo = getStockStatus(p.variants);
    var isInStock = stockInfo.status === 'in-stock' || stockInfo.status === 'low-stock';
    var stockBadge = '<div class="stock-badge ' + stockInfo.status + '"><i class="ph ' + stockInfo.icon + '"></i> ' + stockInfo.label + '</div>';
    var stockText = '';
    if (stockInfo.status === 'in-stock') {
      stockText = '<div class="pc-stock in-stock"><i class="ph ph-check-circle"></i> In Stock</div>';
    } else if (stockInfo.status === 'low-stock') {
      stockText = '<div class="pc-stock low-stock"><i class="ph ph-warning"></i> Low Stock</div>';
    } else {
      stockText = '<div class="pc-stock out-of-stock"><i class="ph ph-x-circle"></i> Out of Stock</div>';
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
    
    var atcHtml = isInStock ? 
      '<button class="atc-btn" onclick="event.stopPropagation();addToCart(\'' + p._id + '\',\'' + escapedName + '\',' + p.price + ',\'' + (p.capacity || '') + '\')"><i class="ph ph-plus"></i> Add</button>' :
      '<button class="atc-btn out-of-stock" disabled><i class="ph ph-x-circle"></i> Out of Stock</button>';

    return '<div class="prod-card" data-product-id="' + p._id + '" onclick="goToProduct(\'' + p._id + '\',\'' + escapedName + '\',' + p.price + ',\'' + (p.image || '') + '\',\'' + (p.capacity || '') + '\')">' +
      '<div class="pc-img-wrap">' +
      '<img class="pc-img" src="' + imgSrc + '" alt="' + escapeHtml(p.name) + '" loading="lazy" onerror="this.src=\'' + FALLBACK_IMG + '\'">' +
      topBadge + wishlistBtn + stockBadge +
      '</div>' +
      '<div class="pc-body">' +
      '<div class="pc-name">' + escapeHtml(p.name) + '</div>' +
      renderStars(p.rating) +
      (p.capacity ? '<div class="pc-vol">' + escapeHtml(p.capacity) + '</div>' : '') +
      '<div class="pc-price-wrap">' +
      (savePercent > 0 ? '<span class="pc-price-old">KES ' + original.toLocaleString() + '</span>' : '') +
      '<span class="pc-price-new">KES ' + p.price.toLocaleString() + '</span>' +
      '</div>' +
      stockText +
      variantHtml +
      atcHtml +
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

  var catParam = getQueryParam('cat');
  var searchParam = getQueryParam('search');
  if (catParam) currentFilters.category = catParam.toLowerCase();
  if (searchParam) currentFilters.search = searchParam;

  renderCatChips();
  loadProductsShop();
  loadDeliverySettingsShop();
  updateCartUI();
}

console.log('✅ Pages loaded');