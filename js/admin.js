// ============================================================
// LIQUORBELLE — ADMIN + CASHIER DASHBOARDS
// ============================================================

if (document.getElementById('productsTab')) {
  // ============================================================
  // ADMIN-FULL.HTML
  // ============================================================
  
  const CATEGORY_LABELS = {
    'beer': 'Beer', 'brandy': 'Brandy', 'bourbon': 'Bourbon',
    'rum': 'Rum', 'spirits': 'Spirits', 'liqueur': 'Liqueur',
    'juice': 'Juice', 'soda': 'Soda', 'water': 'Water',
    'energy': 'Energy Drink', 'cigar': 'Cigar', 'accessory': 'Accessory'
  };
  const CATEGORY_COLORS = {
    'beer': 'cat-beer', 'brandy': 'cat-brandy', 'bourbon': 'cat-bourbon',
    'rum': 'cat-rum', 'spirits': 'cat-spirits', 'liqueur': 'cat-liqueur',
    'juice': 'cat-juice', 'soda': 'cat-soda', 'water': 'cat-water',
    'energy': 'cat-energy', 'cigar': 'cat-cigar', 'accessory': 'cat-accessory'
  };

  function getCategoryLabel(cat) { return CATEGORY_LABELS[cat] || cat || 'Uncategorized'; }
  function getCategoryBadge(cat) {
    const label = getCategoryLabel(cat);
    const colorClass = CATEGORY_COLORS[cat] || 'cat-accessory';
    return `<span class="category-badge ${colorClass}">${label}</span>`;
  }

  const VARIANT_OPTIONS = {
    'beer': [{ label: 'Beer', options: ['200ml','250ml','300ml','330ml','350ml','500ml','700ml','750ml','1L','1.5L','2L','5L','Can','Bottle','12pack','24pack'] }],
    'brandy': [{ label: 'Brandy', options: ['250ml','350ml','500ml','700ml','750ml','1L','1.5L'] }],
    'bourbon': [{ label: 'Bourbon', options: ['750ml','1L'] }],
    'rum': [{ label: 'Rum', options: ['250ml','500ml','750ml','1L'] }],
    'spirits': [{ label: 'Spirits', options: ['250ml','350ml','500ml','750ml','1L'] }],
    'liqueur': [{ label: 'Liqueur', options: ['750ml','1L'] }],
    'juice': [{ label: 'Juice', options: ['250ml','330ml','350ml','400ml','500ml','700ml','1L','1.5L'] }],
    'soda': [{ label: 'Soda', options: ['350ml','500ml','1.25L','2L'] }],
    'water': [{ label: 'Water', options: ['500ml','1L'] }],
    'energy': [{ label: 'Energy', options: ['250ml','330ml','400ml','500ml'] }],
    'cigar': [{ label: 'Cigar', options: ['Unit','Packet','Box'] }],
    'accessory': [{ label: 'Accessory', options: ['Unit','Box','Set','Packet'] }]
  };

  function buildVariantOptionsHTML(category) {
    const options = VARIANT_OPTIONS[category] || VARIANT_OPTIONS['beer'];
    let html = '';
    for (const group of options) {
      html += `<optgroup label="${group.label}">`;
      for (const val of group.options) {
        const selected = (val === '750ml' && category === 'beer') ? 'selected' : '';
        html += `<option value="${val}" ${selected}>${val}</option>`;
      }
      html += '</optgroup>';
    }
    html += '<option value="OTHER">Other (Type custom)</option>';
    return html;
  }

  let adminToken = localStorage.getItem('liquorbelle_admin_token');
  let products = [];
  let allOrders = [];
  let filteredOrders = [];
  let currentTab = 'products';
  let productSearch = '';
  let orderSearch = '';
  let currentDateFilter = '24h';
  let currentStatusFilter = 'all';
  let toastTimeout = null;
  let inactivityTimer = null;
  let inactivityCountdown = null;
  let countdownSeconds = 30;
  let isInactivityWarningShowing = false;

  function getAuthHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken };
  }

  function showToastAdmin(msg, isError) {
    const t = document.getElementById('toast');
    const msgEl = document.getElementById('toastMessage');
    if (!t || !msgEl) return;
    msgEl.innerText = msg;
    t.className = 'toast';
    if (isError) t.classList.add('error');
    else t.classList.add('success');
    t.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(hideToastAdmin, 4000);
  }

  function hideToastAdmin() {
    const t = document.getElementById('toast');
    if (t) t.classList.remove('show', 'error', 'success');
    clearTimeout(toastTimeout);
  }

  window.adminLogin = async function(password) {
    try {
      const res = await fetch(API_BASE + '/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
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
    const password = document.getElementById('adminPassword').value;
    const errorDiv = document.getElementById('loginError');
    const sessionMsg = document.getElementById('sessionExpiredMessage');
    errorDiv.innerText = '';
    if (sessionMsg) sessionMsg.classList.remove('show');
    if (!password) {
      errorDiv.innerText = 'Please enter your password.';
      return;
    }
    const btn = document.getElementById('loginBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="loading-spinner"></span> Logging in...';
    btn.disabled = true;
    window.adminLogin(password).then(success => {
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
    const i = document.getElementById('adminPassword');
    const ic = document.getElementById('toggleAdminPasswordIcon');
    if (i.type === 'password') {
      i.type = 'text';
      ic.className = 'ph ph-eye-slash';
    } else {
      i.type = 'password';
      ic.className = 'ph ph-eye';
    }
  };

  function resetInactivityTimer() {
    const warning = document.getElementById('inactivityWarning');
    if (warning) {
      warning.classList.remove('show');
      isInactivityWarningShowing = false;
    }
    clearTimeout(inactivityTimer);
    clearInterval(inactivityCountdown);
    inactivityTimer = setTimeout(showInactivityWarning, 30 * 60 * 1000);
    updateSessionIndicator();
  }

  function showInactivityWarning() {
    if (!adminToken) return;
    const warning = document.getElementById('inactivityWarning');
    if (!warning) return;
    countdownSeconds = 30;
    const countdownEl = document.getElementById('inactivityCountdown');
    if (countdownEl) countdownEl.innerText = countdownSeconds;
    warning.classList.add('show');
    isInactivityWarningShowing = true;
    clearInterval(inactivityCountdown);
    inactivityCountdown = setInterval(() => {
      countdownSeconds--;
      if (countdownEl) countdownEl.innerText = countdownSeconds;
      if (countdownSeconds <= 0) {
        clearInterval(inactivityCountdown);
        warning.classList.remove('show');
        isInactivityWarningShowing = false;
        showToastAdmin('Session expired due to inactivity.', true);
        setTimeout(window.logout, 1500);
      }
    }, 1000);
  }

  function updateSessionIndicator() {
    const el = document.getElementById('sessionIndicator');
    if (el) {
      el.innerHTML = adminToken ? '● Active' : '○ Offline';
      el.style.color = adminToken ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)';
    }
  }

  ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evt => {
    document.addEventListener(evt, () => { if (adminToken) resetInactivityTimer(); });
  });

  function getSortValue() {
    const el = document.getElementById('sortSelect');
    return el ? el.value : 'newest';
  }

  function sortProducts(arr) {
    const s = getSortValue();
    const sorted = arr.slice();
    switch(s) {
      case 'newest': sorted.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)); break;
      case 'oldest': sorted.sort((a,b) => new Date(a.created_at) - new Date(b.created_at)); break;
      case 'price-low': sorted.sort((a,b) => (a.variants?.[0]?.price||0) - (b.variants?.[0]?.price||0)); break;
      case 'price-high': sorted.sort((a,b) => (b.variants?.[0]?.price||0) - (a.variants?.[0]?.price||0)); break;
      case 'name-asc': sorted.sort((a,b) => (a.name||'').localeCompare(b.name||'')); break;
      case 'name-desc': sorted.sort((a,b) => (b.name||'').localeCompare(a.name||'')); break;
    }
    return sorted;
  }
  window.applySort = function() { renderProductsAdmin(); };

  // Variant functions
  window.toggleVariantOther = function(select) {
    const td = select.parentElement;
    const otherInput = td.querySelector('.variant-size-other');
    if (select.value === 'OTHER') {
      otherInput.style.display = 'block';
      otherInput.focus();
    } else {
      otherInput.style.display = 'none';
      otherInput.value = '';
    }
  };

  window.toggleEditVariantOther = function(select) {
    const td = select.parentElement;
    const otherInput = td.querySelector('.edit-variant-size-other');
    if (select.value === 'OTHER') {
      otherInput.style.display = 'block';
      otherInput.focus();
    } else {
      otherInput.style.display = 'none';
      otherInput.value = '';
    }
  };

  function getVariantFlavour(row) { return row.querySelector('.variant-flavour')?.value.trim() || 'Original'; }
  function getEditVariantFlavour(row) { return row.querySelector('.edit-variant-flavour')?.value.trim() || 'Original'; }
  function getVariantSize(row) {
    const select = row.querySelector('.variant-size');
    const other = row.querySelector('.variant-size-other');
    if (select && select.value === 'OTHER' && other) return other.value.trim() || 'Custom';
    return select ? select.value : '750ml';
  }
  function getEditVariantSize(row) {
    const select = row.querySelector('.edit-variant-size');
    const other = row.querySelector('.edit-variant-size-other');
    if (select && select.value === 'OTHER' && other) return other.value.trim() || 'Custom';
    return select ? select.value : '750ml';
  }

  window.updateVariantOptions = function(category) {
    const cell = document.getElementById('variantCell');
    const select = cell.querySelector('.variant-size');
    const otherInput = cell.querySelector('.variant-size-other');
    const currentVal = select.value;
    select.innerHTML = buildVariantOptionsHTML(category);
    let found = false;
    for (let i = 0; i < select.options.length; i++) {
      if (select.options[i].value === currentVal) { select.selectedIndex = i; found = true; break; }
    }
    if (!found && currentVal !== 'OTHER') select.selectedIndex = 0;
    if (select.value === 'OTHER') otherInput.style.display = 'block';
    else { otherInput.style.display = 'none'; otherInput.value = ''; }
    const hint = document.getElementById('variantCategoryHint');
    if (hint) hint.innerText = '(' + getCategoryLabel(category) + ' sizes shown)';
  };

  window.updateEditVariantOptions = function(category) {
    const tbody = document.getElementById('editVariantsBody');
    const rows = tbody.querySelectorAll('.variant-row');
    for (const row of rows) {
      const select = row.querySelector('.edit-variant-size');
      const otherInput = row.querySelector('.edit-variant-size-other');
      const currentVal = select.value;
      select.innerHTML = buildVariantOptionsHTML(category);
      let found = false;
      for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].value === currentVal) { select.selectedIndex = i; found = true; break; }
      }
      if (!found && currentVal !== 'OTHER') select.selectedIndex = 0;
      if (select.value === 'OTHER') otherInput.style.display = 'block';
      else { otherInput.style.display = 'none'; otherInput.value = ''; }
    }
    const hint = document.getElementById('editVariantHint');
    if (hint) hint.innerText = '(' + getCategoryLabel(category) + ' sizes shown)';
  };

  window.addVariantRow = function() {
    const tbody = document.getElementById('variantsBody');
    const category = document.getElementById('prodCategory').value;
    const row = document.createElement('tr');
    row.className = 'variant-row';
    row.innerHTML = `
      <td>
        <select class="variant-size" onchange="toggleVariantOther(this)">${buildVariantOptionsHTML(category)}</select>
        <input type="text" class="variant-size-other" placeholder="Type custom size..." style="display:none;margin-top:4px;width:100%;padding:6px 9px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;">
      </td>
      <td><input type="number" class="variant-price" placeholder="Price" step="1"></td>
      <td><input type="number" class="variant-discount" placeholder="0" min="0" max="100" value="0" step="1"></td>
      <td><input type="text" class="variant-flavour" placeholder="e.g. Orange, Original..." style="width:100%;padding:7px 10px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit;"></td>
      <td><button type="button" class="remove-variant" onclick="removeVariantRow(this)">✕</button></td>
    `;
    tbody.appendChild(row);
  };

  window.removeVariantRow = function(btn) {
    const tbody = btn.closest('tbody');
    if (tbody.children.length > 1) btn.closest('tr').remove();
    else showToastAdmin('At least one variant is required', true);
  };

  window.addEditVariantRow = function() {
    const tbody = document.getElementById('editVariantsBody');
    const category = document.getElementById('editCategory').value;
    const row = document.createElement('tr');
    row.className = 'variant-row';
    row.innerHTML = `
      <td>
        <select class="edit-variant-size" onchange="toggleEditVariantOther(this)">${buildVariantOptionsHTML(category)}</select>
        <input type="text" class="edit-variant-size-other" placeholder="Type custom size..." style="display:none;margin-top:4px;width:100%;padding:6px 9px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;">
      </td>
      <td><input type="number" class="edit-variant-price" placeholder="Price" step="1"></td>
      <td><input type="number" class="edit-variant-discount" placeholder="0" value="0" step="1"></td>
      <td><input type="text" class="edit-variant-flavour" placeholder="e.g. Orange, Original..." style="width:100%;padding:7px 10px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit;"></td>
      <td><button type="button" class="remove-variant" onclick="removeEditVariantRow(this)">✕</button></td>
    `;
    tbody.appendChild(row);
  };

  window.removeEditVariantRow = function(btn) {
    const tbody = btn.closest('tbody');
    if (tbody.children.length > 1) btn.closest('tr').remove();
    else showToastAdmin('At least one variant is required', true);
  };

  // Product CRUD
  window.addProduct = async function() {
    const btn = document.getElementById('addProductBtn');
    btn.innerHTML = '<span class="loading-spinner"></span> Saving...';
    btn.disabled = true;
    try {
      const name = document.getElementById('prodName').value.trim();
      const category = document.getElementById('prodCategory').value;
      const badge = document.getElementById('prodBadge').value;
      const image = document.getElementById('prodImage').value.trim();
      const description = document.getElementById('prodDesc').value.trim();
      const isTrending = document.getElementById('prodTrending').checked;
      const isNew = document.getElementById('prodNew').checked;
      const rating = parseFloat(document.getElementById('prodRating').value) || 4;
      if (!name) { showToastAdmin('Product name required', true); return; }
      const variants = [];
      const rows = document.querySelectorAll('#variantsBody .variant-row');
      for (const row of rows) {
        const flavour = getVariantFlavour(row);
        const size = getVariantSize(row);
        const price = parseFloat(row.querySelector('.variant-price').value);
        const discount = parseInt(row.querySelector('.variant-discount').value) || 0;
        if (price && price > 0 && size) variants.push({ flavour, size, price, discount });
      }
      if (!variants.length) { showToastAdmin('At least one variant required', true); return; }
      const res = await fetch(API_BASE + '/api/db/products', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, category, badge, image, description, variants, isTrending, isNew, rating })
      });
      if (res.ok) {
        showToastAdmin('Product saved');
        document.getElementById('prodName').value = '';
        document.getElementById('prodImage').value = '';
        document.getElementById('prodDesc').value = '';
        document.getElementById('prodTrending').checked = false;
        document.getElementById('prodNew').checked = false;
        document.getElementById('variantsBody').innerHTML = '';
        window.addVariantRow();
        await loadProductsAdmin();
      } else {
        showToastAdmin('Error saving product', true);
      }
    } catch(e) { showToastAdmin('Error: ' + e.message, true); }
    finally {
      btn.innerHTML = '<i class="ph ph-floppy-disk"></i> Save Product';
      btn.disabled = false;
    }
  };

  window.openEditModal = function(productId) {
    const p = products.find(item => item._id === productId);
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
    const tbody = document.getElementById('editVariantsBody');
    tbody.innerHTML = '';
    const variants = p.variants || [{ flavour: 'Original', size: '750ml', price: 0, discount: 0 }];
    const category = p.category || 'beer';
    const optionsHTML = buildVariantOptionsHTML(category);
    const commonSizes = [];
    const optGroups = VARIANT_OPTIONS[category] || VARIANT_OPTIONS['beer'];
    for (const group of optGroups) {
      for (const size of group.options) commonSizes.push(size);
    }
    for (const v of variants) {
      const isCustom = commonSizes.indexOf(v.size) === -1;
      const selectValue = isCustom ? 'OTHER' : v.size;
      const otherValue = isCustom ? v.size : '';
      const row = document.createElement('tr');
      row.className = 'variant-row';
      row.innerHTML = `
        <td>
          <select class="edit-variant-size" onchange="toggleEditVariantOther(this)">${optionsHTML}</select>
          <input type="text" class="edit-variant-size-other" value="${otherValue}" placeholder="Type custom size..." style="display:${isCustom ? 'block' : 'none'};margin-top:4px;width:100%;padding:6px 9px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;">
        </td>
        <td><input type="number" class="edit-variant-price" value="${v.price}"></td>
        <td><input type="number" class="edit-variant-discount" value="${v.discount||0}"></td>
        <td><input type="text" class="edit-variant-flavour" value="${escapeHtml(v.flavour||'Original')}" style="width:100%;padding:7px 10px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit;"></td>
        <td><button type="button" class="remove-variant" onclick="removeEditVariantRow(this)">✕</button></td>
      `;
      const sel = row.querySelector('.edit-variant-size');
      for (let i = 0; i < sel.options.length; i++) {
        if (sel.options[i].value === selectValue) { sel.selectedIndex = i; break; }
      }
      tbody.appendChild(row);
    }
    const hint = document.getElementById('editVariantHint');
    if (hint) hint.innerText = '(' + getCategoryLabel(category) + ' sizes shown)';
    document.getElementById('editModal').classList.add('active');
  };

  window.closeEditModal = function() {
    document.getElementById('editModal').classList.remove('active');
  };

  window.saveProductEdit = async function() {
    const saveBtn = document.querySelector('#editModal .modal-footer .btn:last-child');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span class="loading-spinner"></span> Saving...';
    saveBtn.disabled = true;
    try {
      const id = document.getElementById('editProductId').value;
      const name = document.getElementById('editName').value.trim();
      const category = document.getElementById('editCategory').value;
      const badge = document.getElementById('editBadge').value;
      const image = document.getElementById('editImage').value.trim();
      const description = document.getElementById('editDesc').value.trim();
      const isTrending = document.getElementById('editTrending').checked;
      const isNew = document.getElementById('editNew').checked;
      const rating = parseFloat(document.getElementById('editRating').value) || 4;
      if (!name) { showToastAdmin('Product name required', true); return; }
      const variants = [];
      const rows = document.querySelectorAll('#editVariantsBody .variant-row');
      for (const row of rows) {
        const flavour = getEditVariantFlavour(row);
        const size = getEditVariantSize(row);
        const price = parseFloat(row.querySelector('.edit-variant-price').value);
        const discount = parseInt(row.querySelector('.edit-variant-discount').value) || 0;
        if (price && price > 0 && size) variants.push({ flavour, size, price, discount });
      }
      const res = await fetch(API_BASE + '/api/db/products/' + id, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, category, badge, image, description, variants, isTrending, isNew, rating })
      });
      if (res.ok) {
        showToastAdmin('Product updated');
        window.closeEditModal();
        await loadProductsAdmin();
      } else {
        showToastAdmin('Error updating product', true);
      }
    } catch(e) { showToastAdmin('Error: ' + e.message, true); }
    finally {
      saveBtn.innerHTML = originalText;
      saveBtn.disabled = false;
    }
  };

  window.deleteProduct = async function(id) {
    if (!confirm('Delete permanently?')) return;
    try {
      await fetch(API_BASE + '/api/db/products/' + id, { method: 'DELETE', headers: getAuthHeaders() });
      await loadProductsAdmin();
      showToastAdmin('Product deleted');
    } catch(e) { showToastAdmin('Error deleting', true); }
  };

  // Bulk Import
  window.loadCsvFile = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('bulkCsvInput').value = e.target.result;
      showToastAdmin('CSV file loaded: ' + file.name);
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  window.bulkImport = async function() {
    const csvText = document.getElementById('bulkCsvInput').value.trim();
    if (!csvText) { showToastAdmin('Please paste CSV data first', true); return; }
    const btn = document.querySelector('#bulkDropZone .btn-green');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="loading-spinner"></span> Importing...';
    btn.disabled = true;
    try {
      const lines = csvText.split('\n').filter(line => line.trim());
      if (lines.length < 2) { showToastAdmin('CSV must have header row + data rows', true); return; }
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      let imported = 0, errors = 0;
      const progressEl = document.getElementById('bulkProgress');
      progressEl.style.display = 'block';
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const obj = {};
        for (let j = 0; j < headers.length; j++) obj[headers[j]] = values[j] || '';
        const product = {
          name: obj.Name || obj.name || '',
          category: obj.Category || obj.category || 'beer',
          badge: obj.Badge || obj.badge || '',
          image: obj.Image || obj.image || obj['Image URL'] || '',
          description: obj.Description || obj.description || '',
          isTrending: (obj.IsTrending || obj.isTrending || '').toLowerCase() === 'true',
          isNew: (obj.IsNew || obj.isNew || '').toLowerCase() === 'true',
          rating: parseFloat(obj.Rating || obj.rating || 4) || 4,
          variants: []
        };
        for (let k = 1; k <= 10; k++) {
          const flavourKey = 'Flavour' + k, sizeKey = 'Size' + k, priceKey = 'Price' + k, discountKey = 'Discount' + k;
          const flavour = obj[flavourKey] || obj['Flavor' + k] || '';
          const size = obj[sizeKey] || '';
          const price = parseFloat(obj[priceKey]) || 0;
          const discount = parseInt(obj[discountKey]) || 0;
          if (size && price > 0) product.variants.push({ flavour: flavour || 'Original', size, price, discount });
        }
        if (!product.variants.length) { errors++; continue; }
        const res = await fetch(API_BASE + '/api/db/products', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(product)
        });
        if (res.ok) { imported++; progressEl.innerHTML = 'Imported ' + imported + ' products...'; }
        else errors++;
      }
      progressEl.innerHTML = '';
      showToastAdmin('Imported ' + imported + ' products' + (errors > 0 ? ' (' + errors + ' failed)' : ''));
      await loadProductsAdmin();
      document.getElementById('bulkCsvInput').value = '';
    } catch(e) { showToastAdmin('Error: ' + e.message, true); }
    finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  };

  // Load Products
  async function loadProductsAdmin() {
    try {
      console.log('[Admin] Loading products...');
      const res = await fetch(API_BASE + '/api/db/products');
      const data = await res.json();
      if (data.success) {
        products = data.products;
        console.log('[Admin] Loaded', products.length, 'products');
      } else {
        products = [];
        console.warn('[Admin] API returned success: false');
      }
    } catch(e) {
      console.error('[Admin] Load products error:', e);
      products = [];
    }
    renderProductsAdmin();
    updateStats();
    renderCategoryBreakdown();
  }

  function renderProductsAdmin() {
    let filtered = products;
    if (productSearch) {
      filtered = products.filter(p =>
        p.name?.toLowerCase().includes(productSearch) ||
        p.category?.toLowerCase().includes(productSearch)
      );
    }
    filtered = sortProducts(filtered);
    const container = document.getElementById('productsList');
    if (!filtered.length) {
      container.innerHTML = '<div class="empty-state"><i class="ph ph-package"></i><p>No products found</p></div>';
      return;
    }
    let html = '';
    for (const p of filtered) {
      const variants = p.variants || [];
      let variantsHtml = '';
      for (const v of variants) {
        const flavourText = v.flavour ? `<span class="flavour-badge">${escapeHtml(v.flavour)}</span> ` : '';
        variantsHtml += `<span class="variant-badge">${flavourText}${v.size}: KES ${(v.price||0).toLocaleString()}${v.discount ? ` <span class="discount-badge"> ${v.discount}% OFF</span>` : ''}</span>`;
      }
      const imgSrc = p.image ? optimizeImage(p.image, 100) : FALLBACK_IMG;
      let badgesHtml = '';
      if (p.isTrending) badgesHtml += '<span class="trending-badge"><i class="ph ph-fire"></i> Trending</span> ';
      if (p.isNew) badgesHtml += '<span class="new-badge"><i class="ph ph-star"></i> New</span>';
      const ratingHtml = `<span class="star-badge"><i class="ph ph-star-fill"></i> ${(p.rating||4).toFixed(1)}</span>`;
      const catBadge = getCategoryBadge(p.category);
      const descSnippet = p.description ? `<div style="font-size:11px;color:var(--muted);font-weight:400;margin-top:2px;">${escapeHtml(p.description.slice(0,60))}${p.description.length>60?'...':''}</div>` : '';
      html += `<div class="product-row"><div><img class="product-img" src="${imgSrc}" onerror="this.src=''" loading="lazy"></div>
        <div><div class="product-name">${escapeHtml(p.name)}</div><div class="product-cat">${catBadge}</div>${descSnippet}</div>
        <div>${variantsHtml}</div><div>${badgesHtml}</div><div>${ratingHtml}</div>
        <div style="display:flex;gap:4px;"><button class="edit-btn" onclick="openEditModal('${p._id}')"><i class="ph ph-pencil-simple"></i></button>
        <button class="delete-btn" onclick="deleteProduct('${p._id}')"><i class="ph ph-trash"></i></button></div></div>`;
    }
    container.innerHTML = html;
  }

  function renderCategoryBreakdown() {
    const container = document.getElementById('categoryBreakdown');
    const counts = {};
    for (const p of products) {
      const cat = p.category || 'uncategorized';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    let html = '';
    const sorted = Object.keys(counts).sort();
    for (const cat of sorted) {
      const count = counts[cat];
      const label = getCategoryLabel(cat);
      html += `<div class="stat-card" style="padding:12px 14px;"><h4>${label}</h4><div class="value" style="font-size:20px;">${count}</div><div class="sub">products</div></div>`;
    }
    container.innerHTML = html || '<div class="empty-state"><i class="ph ph-chart-bar"></i><p>No products to show</p></div>';
  }

  function updateStats() {
    let trendingCount = 0, categories = {}, variantCount = 0;
    for (const p of products) {
      if (p.isTrending === true) trendingCount++;
      categories[p.category] = true;
      variantCount += (p.variants ? p.variants.length : 0);
    }
    const categoryCount = Object.keys(categories).length;
    document.getElementById('productStats').innerHTML =
      `<div class="stat-card"><h4>Products</h4><div class="value">${products.length}</div></div>
       <div class="stat-card"><h4>Categories</h4><div class="value">${categoryCount}</div></div>
       <div class="stat-card"><h4>Variants</h4><div class="value">${variantCount}</div></div>
       <div class="stat-card"><h4>Trending</h4><div class="value">${trendingCount}</div></div>`;
    const totalProductsEl = document.getElementById('totalProducts');
    if (totalProductsEl) totalProductsEl.innerText = products.length;
  }

  // Orders
  async function loadOrdersAdmin() {
    if (!adminToken) { showToastAdmin('Please login first', true); return; }
    try {
      const res = await fetch(API_BASE + '/api/db/orders', { headers: getAuthHeaders() });
      if (res.status === 401 || res.status === 403) {
        showToastAdmin('Session expired. Please login again.', true);
        window.logout();
        return;
      }
      const data = await res.json();
      if (data.success) {
        allOrders = data.orders.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
        applyFiltersAdmin();
      }
    } catch(e) {
      allOrders = [];
      filteredOrders = [];
    }
    if (currentTab === 'analytics') renderAnalytics();
  }

  function formatDateFilter(dateFilter) {
    const now = new Date();
    switch(dateFilter) {
      case '24h': return new Date(now.getTime() - 24*60*60*1000);
      case '7d': return new Date(now.getTime() - 7*24*60*60*1000);
      case '30d': return new Date(now.getTime() - 30*24*60*60*1000);
      case '90d': return new Date(now.getTime() - 90*24*60*60*1000);
      case '1y': return new Date(now.getTime() - 365*24*60*60*1000);
      case 'all': return null;
      default: return new Date(now.getTime() - 24*60*60*1000);
    }
  }

  function applyFiltersAdmin() {
    currentDateFilter = document.getElementById('dateFilter').value;
    currentStatusFilter = document.getElementById('statusFilter').value;
    let result = allOrders.slice();
    const cutoffDate = formatDateFilter(currentDateFilter);
    if (cutoffDate) result = result.filter(o => new Date(o.created_at) >= cutoffDate);
    if (currentStatusFilter !== 'all') result = result.filter(o => o.status === currentStatusFilter);
    filteredOrders = result;
    renderOrdersAdmin();
    updateOrderStatsDisplay();
  }

  window.applyFilters = applyFiltersAdmin;

  function updateOrderStatsDisplay() {
    const total = filteredOrders.length;
    const paid = filteredOrders.filter(o => o.status === 'paid').length;
    const delivered = filteredOrders.filter(o => o.status === 'delivered').length;
    document.getElementById('orderStats').innerHTML =
      `<div class="stat-card"><h4>Orders</h4><div class="value">${total}</div></div>
       <div class="stat-card"><h4>Paid</h4><div class="value">${paid}</div><div class="sub">Ready to deliver</div></div>
       <div class="stat-card"><h4>Delivered</h4><div class="value">${delivered}</div><div class="sub">Completed</div></div>`;
    document.getElementById('orderCountDisplay').innerHTML = `${total} order${total!==1?'s':''} found`;
  }

  function renderAnalytics() {
    const delivered = filteredOrders.filter(o => o.status === 'delivered');
    let revenue = 0;
    for (const o of delivered) revenue += (o.total || 0);
    const avg = delivered.length ? Math.round(revenue / delivered.length) : 0;
    document.getElementById('totalRevenue').innerHTML = 'KES ' + revenue.toLocaleString();
    document.getElementById('totalOrders').innerHTML = filteredOrders.length;
    document.getElementById('avgOrder').innerHTML = 'KES ' + avg.toLocaleString();
  }

  function findProductImage(productName) {
    if (!productName) return FALLBACK_IMG;
    for (const p of products) {
      if (p.name && p.name.toLowerCase() === productName.toLowerCase()) {
        if (p.image) return p.image;
        break;
      }
    }
    for (const p of products) {
      if (p.name && (productName.toLowerCase().includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(productName.toLowerCase()))) {
        if (p.image) return p.image;
        break;
      }
    }
    return FALLBACK_IMG;
  }

  function renderOrdersAdmin() {
    let filtered = filteredOrders.slice();
    if (orderSearch) {
      filtered = filteredOrders.filter(o =>
        o.customer_name?.toLowerCase().includes(orderSearch) ||
        o.customer_email?.toLowerCase().includes(orderSearch)
      );
    }
    const container = document.getElementById('ordersList');
    if (!filtered.length) {
      container.innerHTML = '<div class="empty-state"><i class="ph ph-clipboard-text"></i><p>No orders found</p></div>';
      return;
    }
    let html = '';
    for (const o of filtered) {
      let items = o.items;
      if (typeof items === 'string') { try { items = JSON.parse(items); } catch(e) { items = []; } }
      const phoneRaw = o.phone || '';
      const cleanPhone = phoneRaw.replace(/\D/g, '');
      const waLink = 'https://wa.me/' + (cleanPhone.startsWith('0') ? '254' + cleanPhone.slice(1) : cleanPhone);
      const callLink = 'tel:' + cleanPhone;
      let itemsHtml = '';
      for (const item of (items||[])) {
        const productName = item.product_name || item.name;
        const productImg = findProductImage(productName);
        const productSize = item.size || (item.capacity || '');
        const productQty = item.quantity || item.qty || 1;
        const productPrice = item.price || 0;
        itemsHtml += `<div class="order-item"><img class="order-item-img" src="${productImg}" alt="${escapeHtml(productName)}" onerror="this.src=''" loading="lazy">
          <div class="order-item-details"><div class="order-item-name">${escapeHtml(productName)}</div>
          ${productSize ? `<div class="order-item-size">${escapeHtml(productSize)}</div>` : ''}
          <div class="order-item-qty">Quantity: ${productQty}</div></div>
          <div class="order-item-price">KES ${(productPrice*productQty).toLocaleString()}</div></div>`;
      }
      const deliveryFee = o.delivery_fee || o.delivery || 0;
      const subtotal = o.subtotal || (o.total - deliveryFee);
      const statusClass = o.status === 'paid' ? 'status-paid' : o.status === 'delivered' ? 'status-delivered' : 'status-pending';
      const statusIcon = o.status === 'paid' ? 'ph-check-circle' : o.status === 'delivered' ? 'ph-truck' : 'ph-clock';
      const statusText = o.status === 'paid' ? 'Paid' : o.status === 'delivered' ? 'Delivered' : 'Pending';
      html += `<div class="order-card"><div class="order-header"><div><div class="order-id"><i class="ph ph-package"></i> ${o.order_number || (o._id ? o._id.slice(0,8) : 'N/A')}</div>
        <div class="order-customer">${escapeHtml(o.customer_name)}</div>
        <div class="order-meta-row"><span class="order-meta-chip"><i class="ph ph-envelope"></i> ${escapeHtml(o.customer_email)}</span>
        <span class="order-meta-chip"><i class="ph ph-phone"></i> ${o.phone || 'No phone'}</span>
        <span class="order-meta-chip"><i class="ph ph-calendar"></i> ${new Date(o.created_at).toLocaleString()}</span>
        <span class="order-meta-chip"><i class="ph ph-credit-card"></i> M-PESA</span></div></div>
        <div class="order-header-right"><span class="order-status ${statusClass}"><i class="ph ${statusIcon}"></i> ${statusText}</span>
        <div class="contact-buttons"><a href="${waLink}" target="_blank" class="btn btn-sm btn-wa"><i class="ph ph-whatsapp-logo"></i> WhatsApp</a>
        <a href="${callLink}" class="btn btn-sm btn-call"><i class="ph ph-phone-call"></i> Call</a></div></div></div>
        <div class="order-items">${itemsHtml}</div>
        <div class="order-footer"><div><div class="order-total">KES ${(o.total||0).toLocaleString()}</div>
        <div style="font-size:11px;margin-top:4px;"><span>Subtotal: KES ${(subtotal||0).toLocaleString()}</span> | <span>Delivery: ${deliveryFee===0?'FREE':'KES '+deliveryFee.toLocaleString()}</span></div></div>
        <div class="order-actions">${o.status==='paid' ? `<button class="btn btn-sm btn-gold" onclick="markOrderDelivered('${o._id}')"><i class="ph ph-truck"></i> Mark Delivered</button>` : ''}
        ${o.status==='delivered' ? '<span class="completed-chip"><i class="ph ph-seal-check"></i> Completed</span>' : ''}
        <button class="btn btn-sm btn-red" onclick="deleteOrderAdmin('${o._id}')"><i class="ph ph-trash"></i></button></div></div></div>`;
    }
    container.innerHTML = html;
  }

  window.markOrderDelivered = async function(id) {
    let idx = -1;
    for (let i = 0; i < filteredOrders.length; i++) {
      if (filteredOrders[i]._id === id) { idx = i; break; }
    }
    if (idx === -1) return;
    const original = JSON.parse(JSON.stringify(filteredOrders[idx]));
    filteredOrders[idx].status = 'delivered';
    let allIdx = -1;
    for (let i = 0; i < allOrders.length; i++) {
      if (allOrders[i]._id === id) { allIdx = i; break; }
    }
    if (allIdx !== -1) allOrders[allIdx].status = 'delivered';
    renderOrdersAdmin();
    updateOrderStatsDisplay();
    try {
      const res = await fetch(API_BASE + '/api/db/orders/' + id + '/status', {
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
        showToastAdmin('Marked as Delivered');
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
    let idx = -1, deleted = null;
    for (let i = 0; i < filteredOrders.length; i++) {
      if (filteredOrders[i]._id === id) { idx = i; deleted = filteredOrders[i]; break; }
    }
    if (idx !== -1) {
      filteredOrders.splice(idx, 1);
      let allIdx = -1;
      for (let i = 0; i < allOrders.length; i++) {
        if (allOrders[i]._id === id) { allIdx = i; break; }
      }
      if (allIdx !== -1) allOrders.splice(allIdx, 1);
      renderOrdersAdmin();
      updateOrderStatsDisplay();
    }
    try {
      await fetch(API_BASE + '/api/db/orders/' + id, { method: 'DELETE', headers: getAuthHeaders() });
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

  // Settings
  window.loadDeliverySettingsAdmin = async function() {
    if (!adminToken) return;
    try {
      const res = await fetch(API_BASE + '/api/admin/delivery-settings', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success && data.settings) {
        document.getElementById('deliveryFee').value = data.settings.delivery_fee || 150;
        document.getElementById('freeThreshold').value = data.settings.free_delivery_threshold || 3000;
        const enabledEl = document.getElementById('deliveryEnabled');
        if (enabledEl) enabledEl.checked = data.settings.delivery_enabled !== false;
      }
    } catch(e) {}
  };

  window.saveDeliverySettings = async function() {
    const settings = {
      delivery_fee: parseInt(document.getElementById('deliveryFee').value) || 0,
      free_delivery_threshold: parseInt(document.getElementById('freeThreshold').value) || 0,
      delivery_enabled: document.getElementById('deliveryEnabled')?.checked ?? true
    };
    try {
      const res = await fetch(API_BASE + '/api/admin/delivery-settings', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(settings)
      });
      if (res.ok) showToastAdmin('Delivery settings saved');
      else showToastAdmin('Error', true);
    } catch(e) { showToastAdmin('Error', true); }
  };

  window.updatePasswords = async function() {
    const adminPassword = document.getElementById('newAdminPassword').value.trim();
    const cashierPassword = document.getElementById('newCashierPassword').value.trim();
    if (!adminPassword && !cashierPassword) {
      showToastAdmin('Enter at least one password to change', true);
      return;
    }
    const btn = document.getElementById('updatePasswordsBtn');
    if (!btn) { showToastAdmin('Save button not found', true); return; }
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span class="loading-spinner"></span> Saving...';
    btn.disabled = true;
    try {
      const body = {};
      if (adminPassword) body.adminPassword = adminPassword;
      if (cashierPassword) body.cashierPassword = cashierPassword;
      const res = await fetch(API_BASE + '/api/admin/update-passwords', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        showToastAdmin('Passwords updated! Logging out...');
        localStorage.removeItem('liquorbelle_admin_token');
        adminToken = null;
        document.getElementById('newAdminPassword').value = '';
        document.getElementById('newCashierPassword').value = '';
        setTimeout(() => window.location.href = window.location.pathname, 1500);
      } else {
        showToastAdmin(data.message || 'Error updating passwords', true);
      }
    } catch(e) { showToastAdmin('Error: ' + e.message, true); }
    finally {
      btn.innerHTML = originalHTML;
      btn.disabled = false;
    }
  };

  // Search
  const productSearchInput = document.getElementById('productSearch');
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

  // Logout
  window.logout = function() {
    localStorage.removeItem('liquorbelle_admin_token');
    adminToken = null;
    clearTimeout(inactivityTimer);
    clearInterval(inactivityCountdown);
    const warning = document.getElementById('inactivityWarning');
    if (warning) warning.classList.remove('show');
    isInactivityWarningShowing = false;
    updateSessionIndicator();
    location.reload();
  };

  window.hideToast = hideToastAdmin;
  window.showToast = showToastAdmin;

  // Drag & Drop
  const dropZone = document.getElementById('bulkDropZone');
  if (dropZone) {
    dropZone.addEventListener('dragover', e => { e.preventDefault(); this.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', e => { e.preventDefault(); this.classList.remove('dragover'); });
    dropZone.addEventListener('drop', function(e) {
      e.preventDefault();
      this.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files.length > 0 && files[0].name.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = function(ev) {
          document.getElementById('bulkCsvInput').value = ev.target.result;
          showToastAdmin('CSV file loaded: ' + files[0].name);
        };
        reader.readAsText(files[0]);
      }
    });
  }

  // Tab Switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      currentTab = this.dataset.tab;
      document.getElementById('productsTab').style.display = currentTab === 'products' ? 'block' : 'none';
      document.getElementById('ordersTab').style.display = currentTab === 'orders' ? 'block' : 'none';
      document.getElementById('analyticsTab').style.display = currentTab === 'analytics' ? 'block' : 'none';
      document.getElementById('settingsTab').style.display = currentTab === 'settings' ? 'block' : 'none';
      if (currentTab === 'orders' && allOrders.length) renderOrdersAdmin();
      if (currentTab === 'analytics' && allOrders.length) renderAnalytics();
    });
  });

  // Init
  async function initAdminAfterLogin() {
    await loadProductsAdmin();
    await loadOrdersAdmin();
    await loadDeliverySettingsAdmin();
    resetInactivityTimer();
    updateSessionIndicator();
  }

  async function initAdminFull() {
    if (adminToken) {
      document.getElementById('adminLoginModal').style.display = 'none';
      resetInactivityTimer();
      updateSessionIndicator();
      await initAdminAfterLogin();
    } else {
      document.getElementById('adminLoginModal').style.display = 'flex';
      setTimeout(() => document.getElementById('adminPassword').focus(), 300);
    }
  }

  initAdminFull();
  setInterval(() => { if (adminToken) loadProductsAdmin(); }, 120000);
  setInterval(() => { if (adminToken) loadOrdersAdmin(); }, 120000);
}

// ============================================================
// CASHIER DASHBOARD (ADMIN-ORDERS.HTML)
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
      '<div class="stat-card"><h4>' + statusText + '</h4><div class="value">' + total + '</div><div class="sub">' + periodText + '</div><div class="icon">📊</div></div>' +
      '<div class="stat-card"><h4>Pending</h4><div class="value">' + pending + '</div><div class="sub">Need payment</div><div class="icon">⏳</div></div>' +
      '<div class="stat-card"><h4>Paid</h4><div class="value">' + paid + '</div><div class="sub">Ready to deliver</div><div class="icon">✅</div></div>' +
      '<div class="stat-card"><h4>Delivered</h4><div class="value">' + delivered + '</div><div class="sub">Completed</div><div class="icon">🚚</div></div>';

    document.getElementById('orderCountDisplay').innerHTML = total + ' order' + (total !== 1 ? 's' : '') + ' found';
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
        showToastCashier('Too many requests. Please wait...', true);
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
        showToastCashier('Server busy, retrying...', true);
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
        showToastCashier('Order marked as PAID');
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
        showToastCashier('Server busy, retrying...', true);
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
        showToastCashier('Order marked as DELIVERED');
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

console.log('✅ Admin loaded');