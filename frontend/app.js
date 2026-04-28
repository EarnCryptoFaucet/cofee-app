/**
 * app.js — BrewTrack Frontend Application
 * Modular, clean vanilla JS for Coffee Shop Management System
 * All API calls use relative paths (Railway compatible)
 */

/* =========================================
   CONSTANTS & GLOBAL STATE
   ========================================= */
const API = '/api';

const state = {
  ingredients: [],
  products: [],
  sales: [],
  analytics: null,
  currentPage: 'dashboard',
  editingIngredient: null,
  editingProduct: null,
  recipeItems: [] // temp recipe builder state
};

/* =========================================
   UTILITY FUNCTIONS
   ========================================= */

/** Format currency */
const fmt = (n) => `$${Number(n).toFixed(2)}`;

/** Format date */
const fmtDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/** Format time */
const fmtTime = (iso) => {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

/** Escape HTML to prevent XSS */
const esc = (str) => String(str)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/** Generate unique temp ID */
const tempId = () => 'tmp_' + Math.random().toString(36).substr(2, 8);

/* =========================================
   TOAST NOTIFICATION SYSTEM
   ========================================= */
const Toast = {
  container: null,

  init() {
    this.container = document.getElementById('toastContainer');
  },

  show(type, title, message, duration = 4000) {
    const icons = { success: '✅', error: '❌', warning: '⚠️' };
    const id = tempId();

    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.id = id;
    el.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
      <div>
        <div class="toast-title">${esc(title)}</div>
        ${message ? `<div class="toast-message">${esc(message)}</div>` : ''}
      </div>
      <button class="toast-close" onclick="Toast.remove('${id}')">✕</button>
    `;

    this.container.appendChild(el);

    // Auto remove
    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }
  },

  remove(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.animation = 'slideOutRight 0.3s ease forwards';
    setTimeout(() => el.remove(), 300);
  },

  success(title, msg) { this.show('success', title, msg); },
  error(title, msg) { this.show('error', title, msg); },
  warning(title, msg) { this.show('warning', title, msg); }
};

/* =========================================
   CONFIRM DIALOG
   ========================================= */
const Confirm = {
  show(title, message, onConfirm) {
    // Remove existing confirm if any
    const existing = document.getElementById('confirmDialog');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.id = 'confirmDialog';
    overlay.innerHTML = `
      <div class="confirm-box">
        <div class="confirm-icon">🗑️</div>
        <div class="confirm-title">${esc(title)}</div>
        <div class="confirm-msg">${esc(message)}</div>
        <div class="confirm-actions">
          <button class="btn btn-secondary" onclick="Confirm.close()">Cancel</button>
          <button class="btn btn-danger" id="confirmOkBtn">Delete</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('confirmOkBtn').addEventListener('click', () => {
      onConfirm();
      Confirm.close();
    });
  },

  close() {
    const el = document.getElementById('confirmDialog');
    if (el) el.remove();
  }
};

/* =========================================
   API SERVICE
   ========================================= */
const ApiService = {
  async request(method, endpoint, body = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) opts.body = JSON.stringify(body);

    try {
      const res = await fetch(`${API}${endpoint}`, opts);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Request failed');
      return data;
    } catch (err) {
      console.error(`[API] ${method} ${endpoint}:`, err);
      throw err;
    }
  },

  get: (endpoint) => ApiService.request('GET', endpoint),
  post: (endpoint, body) => ApiService.request('POST', endpoint, body),
  put: (endpoint, body) => ApiService.request('PUT', endpoint, body),
  delete: (endpoint) => ApiService.request('DELETE', endpoint)
};

/* =========================================
   NAVIGATION
   ========================================= */
const Nav = {
  init() {
    // Sidebar navigation items
    document.querySelectorAll('[data-page]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        this.navigate(page);
        // Close sidebar on mobile after navigation
        if (window.innerWidth <= 1024) {
          Sidebar.close();
        }
      });
    });
  },

  navigate(page) {
    state.currentPage = page;

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach((el) => el.classList.remove('active'));
    const activeItem = document.querySelector(`[data-page="${page}"]`);
    if (activeItem) activeItem.classList.add('active');

    // Show correct page panel
    document.querySelectorAll('.page-panel').forEach((el) => el.classList.remove('active'));
    const panel = document.getElementById(`page-${page}`);
    if (panel) panel.classList.add('active');

    // Update top bar title
    const titles = {
      dashboard: { title: 'Dashboard', sub: 'Overview of your coffee shop' },
      ingredients: { title: 'Ingredients', sub: 'Manage your stock inventory' },
      products: { title: 'Products', sub: 'Manage your menu & recipes' },
      sales: { title: 'Sales', sub: 'Track and process sales' },
      analytics: { title: 'Analytics', sub: 'Business insights & reports' }
    };
    const t = titles[page] || {};
    const ptEl = document.getElementById('pageTitle');
    const psEl = document.getElementById('pageSubtitle');
    if (ptEl) ptEl.textContent = t.title || page;
    if (psEl) psEl.textContent = t.sub || '';

    // Load page data
    this.loadPage(page);
  },

  async loadPage(page) {
    try {
      switch (page) {
        case 'dashboard':
          await loadDashboard();
          break;
        case 'ingredients':
          await loadIngredients();
          break;
        case 'products':
          await loadProducts();
          break;
        case 'sales':
          await loadSales();
          break;
        case 'analytics':
          await loadAnalytics();
          break;
      }
    } catch (err) {
      Toast.error('Error', err.message);
    }
  }
};

/* =========================================
   SIDEBAR (mobile)
   ========================================= */
const Sidebar = {
  open() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebarOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
  },
  close() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('open');
    document.body.style.overflow = '';
  }
};

/* =========================================
   DASHBOARD
   ========================================= */
async function loadDashboard() {
  try {
    // Load all data in parallel
    const [ingRes, prodRes, salesRes] = await Promise.all([
      ApiService.get('/ingredients'),
      ApiService.get('/products'),
      ApiService.get('/sales')
    ]);

    state.ingredients = ingRes.data || [];
    state.products = prodRes.data || [];
    const salesData = salesRes.data || {};
    state.sales = salesData.sales || [];

    const today = salesData.today || { revenue: 0, orders: 0, sales: [] };
    const totalRevenue = salesData.summary?.totalRevenue || 0;
    const lowStock = state.ingredients.filter((i) => i.stock <= i.threshold);

    // Update stat cards
    setEl('dash-today-revenue', fmt(today.revenue));
    setEl('dash-today-orders', today.orders);
    setEl('dash-low-stock', lowStock.length);
    setEl('dash-total-products', state.products.length);
    setEl('dash-total-revenue', fmt(totalRevenue));
    setEl('dash-total-ingredients', state.ingredients.length);

    // Low stock badge in nav
    const badge = document.getElementById('lowStockBadge');
    if (badge) {
      badge.textContent = lowStock.length;
      badge.style.display = lowStock.length > 0 ? 'inline' : 'none';
    }

    // Low stock alert
    renderLowStockAlert(lowStock);

    // Ingredients summary table (dashboard)
    renderDashIngredients(state.ingredients);

    // Quick sell grid
    renderQuickSell(state.products);

    // Recent sales
    renderRecentSales(state.sales.slice(-5).reverse());

  } catch (err) {
    Toast.error('Dashboard Error', err.message);
  }
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function renderLowStockAlert(lowStock) {
  const container = document.getElementById('dashAlertContainer');
  if (!container) return;

  if (lowStock.length === 0) {
    container.innerHTML = `
      <div class="alert-banner success">
        <span class="alert-icon">✅</span>
        <div>
          <div class="alert-title">All Stock Levels OK</div>
          <div>All ingredients are above their threshold levels.</div>
        </div>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="alert-banner danger">
      <span class="alert-icon">⚠️</span>
      <div>
        <div class="alert-title">Low Stock Alert — ${lowStock.length} item(s) need attention</div>
        <div>${lowStock.map((i) => `<strong>${esc(i.name)}</strong> (${i.stock} ${esc(i.unit)} remaining)`).join(' · ')}</div>
      </div>
    </div>`;
}

function renderDashIngredients(ingredients) {
  const tbody = document.getElementById('dashIngTable');
  if (!tbody) return;

  if (ingredients.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center" style="padding:2rem;color:var(--gray-400)">No ingredients added yet</td></tr>`;
    return;
  }

  tbody.innerHTML = ingredients.map((ing) => {
    const isLow = ing.stock <= ing.threshold;
    const pct = Math.min(100, Math.round((ing.stock / Math.max(ing.threshold * 3, 1)) * 100));
    return `
      <tr class="${isLow ? 'low-stock' : ''}">
        <td>
          <div style="display:flex;align-items:center;gap:0.5rem">
            <span class="status-dot ${isLow ? 'red' : 'green'}"></span>
            <strong>${esc(ing.name)}</strong>
          </div>
        </td>
        <td>
          <div>${ing.stock.toLocaleString()} ${esc(ing.unit)}</div>
          <div style="margin-top:0.3rem;width:100%;height:4px;background:var(--gray-200);border-radius:999px;overflow:hidden">
            <div style="width:${pct}%;height:100%;background:${isLow ? 'var(--danger)' : 'var(--primary)'};border-radius:999px;transition:width 0.5s"></div>
          </div>
        </td>
        <td>${ing.threshold.toLocaleString()} ${esc(ing.unit)}</td>
        <td>${isLow
          ? '<span class="badge badge-red">⚠ Low Stock</span>'
          : '<span class="badge badge-green">✓ OK</span>'}</td>
      </tr>`;
  }).join('');
}

function renderQuickSell(products) {
  const container = document.getElementById('quickSellGrid');
  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🛒</div><h3>No products yet</h3><p>Add products from the Products page</p></div>`;
    return;
  }

  container.innerHTML = products.map((p) => `
    <div class="quick-sell-card" onclick="sellProduct('${p.id}', this)">
      <div class="qsc-name">${esc(p.name)}</div>
      <div class="qsc-price">${fmt(p.price)}</div>
      <button class="btn btn-sell btn-sm w-full">☕ Sell</button>
    </div>
  `).join('');
}

function renderRecentSales(sales) {
  const tbody = document.getElementById('recentSalesTable');
  if (!tbody) return;

  if (sales.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center" style="padding:2rem;color:var(--gray-400)">No sales recorded yet</td></tr>`;
    return;
  }

  tbody.innerHTML = sales.map((s) => `
    <tr>
      <td><strong>${esc(s.productName)}</strong></td>
      <td><span class="badge badge-gray">×${s.quantity}</span></td>
      <td><strong class="text-green">${fmt(s.total)}</strong></td>
      <td style="color:var(--gray-400);font-size:0.8rem">${fmtDate(s.soldAt)} ${fmtTime(s.soldAt)}</td>
    </tr>
  `).join('');
}

/* =========================================
   INGREDIENTS
   ========================================= */
async function loadIngredients(filter = '') {
  try {
    if (!filter) {
      const res = await ApiService.get('/ingredients');
      state.ingredients = res.data || [];
    }
    renderIngredientsTable(state.ingredients, filter);
  } catch (err) {
    Toast.error('Error loading ingredients', err.message);
  }
}

function renderIngredientsTable(ingredients, filter = '') {
  const tbody = document.getElementById('ingTable');
  if (!tbody) return;

  let filtered = ingredients;
  if (filter) {
    const q = filter.toLowerCase();
    filtered = ingredients.filter((i) =>
      i.name.toLowerCase().includes(q) ||
      i.unit.toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="6">
        <div class="empty-state">
          <div class="empty-icon">🌿</div>
          <h3>${filter ? 'No results found' : 'No ingredients yet'}</h3>
          <p>${filter ? 'Try a different search term' : 'Click "Add Ingredient" to get started'}</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((ing) => {
    const isLow = ing.stock <= ing.threshold;
    const pct = Math.min(100, Math.round((ing.stock / Math.max(ing.threshold * 3, 1)) * 100));
    return `
      <tr class="${isLow ? 'low-stock' : ''}">
        <td>
          <div style="display:flex;align-items:center;gap:0.5rem">
            <span class="status-dot ${isLow ? 'red' : 'green'}"></span>
            <strong>${esc(ing.name)}</strong>
          </div>
        </td>
        <td>
          <div style="font-weight:600;margin-bottom:0.3rem">${ing.stock.toLocaleString()} <span style="font-weight:400;color:var(--gray-400)">${esc(ing.unit)}</span></div>
          <div style="width:120px;height:5px;background:var(--gray-200);border-radius:999px;overflow:hidden">
            <div style="width:${pct}%;height:100%;background:${isLow ? 'var(--danger)' : 'var(--primary)'};border-radius:999px;transition:width 0.5s"></div>
          </div>
        </td>
        <td>${esc(ing.unit)}</td>
        <td>${ing.threshold.toLocaleString()} ${esc(ing.unit)}</td>
        <td>${isLow
          ? '<span class="badge badge-red">⚠ Low Stock</span>'
          : '<span class="badge badge-green">✓ OK</span>'}</td>
        <td>
          <div style="display:flex;gap:0.4rem">
            <button class="btn btn-ghost btn-sm btn-icon" onclick="openEditIngredient('${ing.id}')" title="Edit">✏️</button>
            <button class="btn btn-ghost btn-sm btn-icon" onclick="deleteIngredient('${ing.id}', '${esc(ing.name)}')" title="Delete">🗑️</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function openAddIngredient() {
  state.editingIngredient = null;
  const modal = document.getElementById('ingModal');
  document.getElementById('ingModalTitle').textContent = '➕ Add Ingredient';
  document.getElementById('ingForm').reset();
  document.getElementById('ingId').value = '';
  openModal('ingModal');
}

function openEditIngredient(id) {
  const ing = state.ingredients.find((i) => i.id === id);
  if (!ing) return;

  state.editingIngredient = ing;
  document.getElementById('ingModalTitle').textContent = '✏️ Edit Ingredient';
  document.getElementById('ingId').value = ing.id;
  document.getElementById('ingName').value = ing.name;
  document.getElementById('ingStock').value = ing.stock;
  document.getElementById('ingUnit').value = ing.unit;
  document.getElementById('ingThreshold').value = ing.threshold;
  openModal('ingModal');
}

async function saveIngredient() {
  const id = document.getElementById('ingId').value;
  const name = document.getElementById('ingName').value.trim();
  const stock = document.getElementById('ingStock').value;
  const unit = document.getElementById('ingUnit').value.trim();
  const threshold = document.getElementById('ingThreshold').value;

  if (!name || !unit || stock === '' || threshold === '') {
    Toast.warning('Missing Fields', 'Please fill in all required fields.');
    return;
  }

  const btn = document.getElementById('saveIngBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> Saving...';

  try {
    const payload = { name, stock: Number(stock), unit, threshold: Number(threshold) };

    if (id) {
      const res = await ApiService.put(`/ingredients/${id}`, payload);
      const idx = state.ingredients.findIndex((i) => i.id === id);
      if (idx > -1) state.ingredients[idx] = res.data;
      Toast.success('Updated!', `${name} has been updated.`);
    } else {
      const res = await ApiService.post('/ingredients', payload);
      state.ingredients.push(res.data);
      Toast.success('Added!', `${name} has been added to inventory.`);
    }

    closeModal('ingModal');
    renderIngredientsTable(state.ingredients);

    // Refresh dashboard if on that page
    if (state.currentPage === 'dashboard') await loadDashboard();

  } catch (err) {
    Toast.error('Save Failed', err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '💾 Save Ingredient';
  }
}

async function deleteIngredient(id, name) {
  Confirm.show(
    'Delete Ingredient',
    `Are you sure you want to delete "${name}"? This action cannot be undone.`,
    async () => {
      try {
        await ApiService.delete(`/ingredients/${id}`);
        state.ingredients = state.ingredients.filter((i) => i.id !== id);
        renderIngredientsTable(state.ingredients);
        Toast.success('Deleted!', `${name} has been removed.`);
        if (state.currentPage === 'dashboard') await loadDashboard();
      } catch (err) {
        Toast.error('Delete Failed', err.message);
      }
    }
  );
}

/* =========================================
   PRODUCTS
   ========================================= */
async function loadProducts() {
  try {
    const [prodRes, ingRes] = await Promise.all([
      ApiService.get('/products'),
      ApiService.get('/ingredients')
    ]);
    state.products = prodRes.data || [];
    state.ingredients = ingRes.data || [];
    renderProductCards(state.products);
  } catch (err) {
    Toast.error('Error loading products', err.message);
  }
}

function renderProductCards(products) {
  const container = document.getElementById('productGrid');
  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">☕</div>
        <h3>No products yet</h3>
        <p>Click "Add Product" to create your first menu item.</p>
      </div>`;
    return;
  }

  container.innerHTML = products.map((p) => `
    <div class="product-card">
      <div class="product-card-header">
        <div class="product-name">☕ ${esc(p.name)}</div>
        <div class="product-price">${fmt(p.price)}</div>
      </div>
      <div class="product-card-body">
        <div style="font-size:0.78rem;font-weight:600;color:var(--gray-400);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.6rem">Recipe</div>
        <div class="recipe-tags">
          ${p.recipe.length === 0
            ? '<span class="recipe-tag">No recipe defined</span>'
            : p.recipe.map((r) => `
                <span class="recipe-tag">${esc(r.ingredientName)} × ${r.quantity} ${esc(r.ingredientUnit)}</span>
              `).join('')}
        </div>
        <div class="product-card-actions" style="margin-top:1rem">
          <button class="btn btn-sell flex-1" onclick="sellProduct('${p.id}', this)">
            ☕ Sell Now
          </button>
          <button class="btn btn-ghost btn-icon" onclick="openEditProduct('${p.id}')" title="Edit">✏️</button>
          <button class="btn btn-ghost btn-icon" onclick="deleteProduct('${p.id}', '${esc(p.name)}')" title="Delete">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');
}

function openAddProduct() {
  state.editingProduct = null;
  state.recipeItems = [];
  document.getElementById('productModalTitle').textContent = '➕ Add Product';
  document.getElementById('productForm').reset();
  document.getElementById('productId').value = '';
  renderRecipeBuilder();
  openModal('productModal');
}

function openEditProduct(id) {
  const prod = state.products.find((p) => p.id === id);
  if (!prod) return;

  state.editingProduct = prod;
  state.recipeItems = prod.recipe.map((r) => ({
    ingredientId: r.ingredientId,
    quantity: r.quantity
  }));

  document.getElementById('productModalTitle').textContent = '✏️ Edit Product';
  document.getElementById('productId').value = prod.id;
  document.getElementById('productName').value = prod.name;
  document.getElementById('productPrice').value = prod.price;
  renderRecipeBuilder();
  openModal('productModal');
}

function renderRecipeBuilder() {
  const container = document.getElementById('recipeBuilder');
  if (!container) return;

  const ingOptions = state.ingredients.map((i) =>
    `<option value="${i.id}">${esc(i.name)} (${esc(i.unit)})</option>`
  ).join('');

  if (state.recipeItems.length === 0) {
    container.innerHTML = `
      <div class="recipe-list" id="recipeList">
        <div style="text-align:center;padding:1rem;color:var(--gray-400);font-size:0.85rem;background:var(--gray-50);border-radius:var(--radius);border:1px dashed var(--gray-300)">
          No ingredients added to recipe yet
        </div>
      </div>`;
  } else {
    container.innerHTML = `<div class="recipe-list" id="recipeList">
      ${state.recipeItems.map((item, idx) => `
        <div class="recipe-item" data-idx="${idx}">
          <select class="form-control" style="flex:2" onchange="updateRecipeItem(${idx},'ingredientId',this.value)">
            <option value="">-- Select Ingredient --</option>
            ${state.ingredients.map((i) =>
              `<option value="${i.id}" ${i.id === item.ingredientId ? 'selected' : ''}>${esc(i.name)} (${esc(i.unit)})</option>`
            ).join('')}
          </select>
          <input type="number" class="form-control" style="flex:1;max-width:100px" placeholder="Qty" min="0.01" step="0.01"
            value="${item.quantity || ''}"
            onchange="updateRecipeItem(${idx},'quantity',this.value)">
          <button class="remove-recipe-btn" onclick="removeRecipeItem(${idx})">✕</button>
        </div>
      `).join('')}
    </div>`;
  }
}

function addRecipeItem() {
  if (state.ingredients.length === 0) {
    Toast.warning('No Ingredients', 'Add some ingredients first before building a recipe.');
    return;
  }
  state.recipeItems.push({ ingredientId: '', quantity: '' });
  renderRecipeBuilder();
}

function removeRecipeItem(idx) {
  state.recipeItems.splice(idx, 1);
  renderRecipeBuilder();
}

function updateRecipeItem(idx, field, value) {
  if (state.recipeItems[idx]) {
    state.recipeItems[idx][field] = field === 'quantity' ? Number(value) : value;
  }
}

async function saveProduct() {
  const id = document.getElementById('productId').value;
  const name = document.getElementById('productName').value.trim();
  const price = document.getElementById('productPrice').value;

  if (!name || !price) {
    Toast.warning('Missing Fields', 'Product name and price are required.');
    return;
  }

  if (state.recipeItems.length === 0) {
    Toast.warning('No Recipe', 'Please add at least one ingredient to the recipe.');
    return;
  }

  // Validate recipe items
  for (const item of state.recipeItems) {
    if (!item.ingredientId || !item.quantity || item.quantity <= 0) {
      Toast.warning('Invalid Recipe', 'Each recipe item must have an ingredient and a valid quantity.');
      return;
    }
  }

  const btn = document.getElementById('saveProductBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> Saving...';

  try {
    const payload = {
      name,
      price: Number(price),
      recipe: state.recipeItems.map((r) => ({
        ingredientId: r.ingredientId,
        quantity: Number(r.quantity)
      }))
    };

    if (id) {
      const res = await ApiService.put(`/products/${id}`, payload);
      const idx = state.products.findIndex((p) => p.id === id);
      if (idx > -1) state.products[idx] = res.data;

      // Re-fetch to get enriched recipe
      const enriched = await ApiService.get('/products');
      state.products = enriched.data || [];
      Toast.success('Updated!', `${name} has been updated.`);
    } else {
      await ApiService.post('/products', payload);
      const enriched = await ApiService.get('/products');
      state.products = enriched.data || [];
      Toast.success('Added!', `${name} has been added to your menu.`);
    }

    closeModal('productModal');
    renderProductCards(state.products);

  } catch (err) {
    Toast.error('Save Failed', err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '💾 Save Product';
  }
}

async function deleteProduct(id, name) {
  Confirm.show(
    'Delete Product',
    `Are you sure you want to delete "${name}"? This action cannot be undone.`,
    async () => {
      try {
        await ApiService.delete(`/products/${id}`);
        state.products = state.products.filter((p) => p.id !== id);
        renderProductCards(state.products);
        Toast.success('Deleted!', `${name} has been removed.`);
      } catch (err) {
        Toast.error('Delete Failed', err.message);
      }
    }
  );
}

/* =========================================
   SALES
   ========================================= */
async function loadSales() {
  try {
    const [salesRes, prodRes] = await Promise.all([
      ApiService.get('/sales'),
      ApiService.get('/products')
    ]);

    const salesData = salesRes.data || {};
    state.sales = salesData.sales || [];
    state.products = prodRes.data || [];

    const today = salesData.today || { revenue: 0, orders: 0 };
    const summary = salesData.summary || { totalRevenue: 0, totalOrders: 0 };

    setEl('sales-today-revenue', fmt(today.revenue));
    setEl('sales-today-orders', today.orders);
    setEl('sales-total-revenue', fmt(summary.totalRevenue));
    setEl('sales-total-orders', summary.totalOrders);

    renderSellButtons(state.products);
    renderSalesTable(state.sales.slice().reverse());

  } catch (err) {
    Toast.error('Error loading sales', err.message);
  }
}

function renderSellButtons(products) {
  const container = document.getElementById('sellProductGrid');
  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🛒</div><h3>No products</h3><p>Add products to start selling</p></div>`;
    return;
  }

  container.innerHTML = products.map((p) => `
    <div class="quick-sell-card" style="text-align:center">
      <div style="font-size:1.5rem;margin-bottom:0.5rem">☕</div>
      <div class="qsc-name">${esc(p.name)}</div>
      <div class="qsc-price">${fmt(p.price)}</div>
      <button class="btn btn-sell btn-sm w-full" style="margin-top:0.5rem" onclick="sellProduct('${p.id}', this)">
        Sell
      </button>
    </div>
  `).join('');
}

function renderSalesTable(sales) {
  const tbody = document.getElementById('salesTable');
  if (!tbody) return;

  if (sales.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="5">
        <div class="empty-state">
          <div class="empty-icon">📊</div>
          <h3>No sales yet</h3>
          <p>Process your first sale to see it here</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = sales.map((s) => `
    <tr>
      <td style="color:var(--gray-400);font-size:0.78rem">${fmtDate(s.soldAt)}<br>${fmtTime(s.soldAt)}</td>
      <td><strong>${esc(s.productName)}</strong></td>
      <td><span class="badge badge-gray">×${s.quantity}</span></td>
      <td>${fmt(s.price)}</td>
      <td><strong class="text-green">${fmt(s.total)}</strong></td>
    </tr>
  `).join('');
}

/* ── Core: Sell a Product ── */
async function sellProduct(productId, triggerEl) {
  const prod = state.products.find((p) => p.id === productId);
  if (!prod) {
    Toast.error('Error', 'Product not found');
    return;
  }

  // Disable button to prevent double-clicks
  const btn = triggerEl.classList.contains('quick-sell-card')
    ? triggerEl.querySelector('button')
    : triggerEl;

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span>';
  }

  try {
    const res = await ApiService.post('/sell', { productId, quantity: 1 });

    // Update local state
    state.ingredients = res.data.updatedIngredients || state.ingredients;

    // Update sales list
    const newSale = res.data.sale;
    state.sales.push(newSale);

    Toast.success(`Sold! ☕`, `${prod.name} — ${fmt(prod.price)} recorded`);

    // Update low stock badge
    const lowStock = res.data.lowStockAlerts || [];
    const badge = document.getElementById('lowStockBadge');
    if (badge) {
      badge.textContent = lowStock.length;
      badge.style.display = lowStock.length > 0 ? 'inline' : 'none';
    }

    // Show low stock warning
    if (lowStock.length > 0) {
      const names = lowStock.map((i) => i.name).join(', ');
      Toast.warning('Low Stock Alert', `Running low: ${names}`);
    }

    // Refresh current page data
    if (state.currentPage === 'dashboard') await loadDashboard();
    else if (state.currentPage === 'sales') await loadSales();
    else if (state.currentPage === 'products') {
      renderProductCards(state.products);
    }

  } catch (err) {
    Toast.error('Sale Failed', err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '☕ Sell';
      // Restore dashboard button text
      if (triggerEl.classList.contains('quick-sell-card')) {
        btn.innerHTML = '☕ Sell';
      } else {
        btn.innerHTML = '☕ Sell Now';
      }
    }
  }
}

/* =========================================
   ANALYTICS
   ========================================= */
async function loadAnalytics() {
  try {
    const res = await ApiService.get('/analytics');
    state.analytics = res.data;
    renderAnalytics(res.data);
  } catch (err) {
    Toast.error('Error loading analytics', err.message);
  }
}

function renderAnalytics(data) {
  // Summary cards
  setEl('an-total-revenue', fmt(data.totalRevenue));
  setEl('an-total-orders', data.totalOrders);
  setEl('an-total-products', data.totalProducts);
  setEl('an-low-stock-count', data.lowStock.length);

  // Top products bar chart
  renderTopProducts(data.topProducts);

  // Daily trend
  renderDailyTrend(data.last7Days);

  // Low stock table
  renderLowStockTable(data.lowStock);
}

function renderTopProducts(products) {
  const container = document.getElementById('topProductsChart');
  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📊</div><h3>No sales data</h3><p>Process some sales to see analytics</p></div>`;
    return;
  }

  const maxRev = Math.max(...products.map((p) => p.revenue), 1);

  container.innerHTML = `
    <div class="mini-bar">
      ${products.map((p) => `
        <div class="mini-bar-item">
          <div class="mini-bar-label" title="${esc(p.name)}">${esc(p.name)}</div>
          <div class="mini-bar-track">
            <div class="mini-bar-fill" style="width:${(p.revenue / maxRev * 100).toFixed(1)}%"></div>
          </div>
          <div class="mini-bar-value">${fmt(p.revenue)}</div>
          <div style="font-size:0.72rem;color:var(--gray-400);width:40px">${p.orders} sold</div>
        </div>
      `).join('')}
    </div>`;
}

function renderDailyTrend(days) {
  const container = document.getElementById('dailyTrendChart');
  if (!container) return;

  const maxRev = Math.max(...days.map((d) => d.revenue), 1);

  container.innerHTML = `
    <div style="display:flex;align-items:flex-end;gap:0.5rem;height:120px;padding:0 0.5rem">
      ${days.map((d) => {
        const h = maxRev > 0 ? Math.max(4, (d.revenue / maxRev) * 100) : 4;
        const label = new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' });
        return `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:0.3rem">
            <div style="font-size:0.68rem;color:var(--gray-400);font-weight:600">${d.revenue > 0 ? fmt(d.revenue) : ''}</div>
            <div style="width:100%;height:${h}%;background:${d.revenue > 0 ? 'linear-gradient(180deg,var(--primary),#22c55e)' : 'var(--gray-200)'};border-radius:4px 4px 0 0;transition:height 0.5s;min-height:4px" title="${fmt(d.revenue)} on ${d.date}"></div>
            <div style="font-size:0.7rem;color:var(--gray-500);font-weight:600">${label}</div>
          </div>`;
      }).join('')}
    </div>`;
}

function renderLowStockTable(lowStock) {
  const tbody = document.getElementById('lowStockTable');
  if (!tbody) return;

  if (lowStock.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:1.5rem;color:var(--gray-400)">✅ No low stock items</td></tr>`;
    return;
  }

  tbody.innerHTML = lowStock.map((i) => `
    <tr class="low-stock">
      <td><strong>${esc(i.name)}</strong></td>
      <td><span class="text-red font-bold">${i.stock.toLocaleString()}</span> ${esc(i.unit)}</td>
      <td>${i.threshold.toLocaleString()} ${esc(i.unit)}</td>
      <td><span class="badge badge-red">⚠ Restock Needed</span></td>
    </tr>
  `).join('');
}

/* =========================================
   MODAL HELPERS
   ========================================= */
function openModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
    document.body.style.overflow = '';
  }
});

/* =========================================
   LIVE CLOCK
   ========================================= */
function startClock() {
  const el = document.getElementById('liveClock');
  if (!el) return;
  const update = () => {
    const now = new Date();
    el.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  update();
  setInterval(update, 1000);
}

/* =========================================
   LANDING PAGE: Feedback Form
   ========================================= */
async function submitFeedback(e) {
  e.preventDefault();
  const form = e.target;
  const name = form.querySelector('#fbName').value.trim();
  const message = form.querySelector('#fbMessage').value.trim();

  if (!message) {
    Toast.warning('Message Required', 'Please enter your feedback message.');
    return;
  }

  const btn = form.querySelector('#fbSubmitBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner" style="border-top-color:white;width:16px;height:16px;border-width:2px"></span> Sending...';

  try {
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, message })
    });
    const data = await res.json();

    if (data.success) {
      document.getElementById('feedbackSuccess').style.display = 'flex';
      form.style.display = 'none';
    } else {
      throw new Error(data.message || 'Failed to submit');
    }
  } catch (err) {
    Toast.error('Submission Failed', err.message || 'Please try again later.');
    btn.disabled = false;
    btn.innerHTML = '🚀 Send Feedback';
  }
}

/* =========================================
   SEARCH: Ingredients
   ========================================= */
function initIngredientSearch() {
  const input = document.getElementById('ingSearch');
  if (!input) return;

  let debounceTimer;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      loadIngredients(input.value.trim());
    }, 200);
  });
}

/* =========================================
   APP INITIALIZATION
   ========================================= */
function initApp() {
  // Toast system
  Toast.init();

  // Navigation
  Nav.init();

  // Live clock
  startClock();

  // Sidebar mobile toggle
  const hamburger = document.getElementById('hamburgerBtn');
  if (hamburger) {
    hamburger.addEventListener('click', () => Sidebar.open());
  }

  const sidebarOverlay = document.getElementById('sidebarOverlay');
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => Sidebar.close());
  }

  // Enter App button
  const enterAppBtn = document.getElementById('enterAppBtn');
  if (enterAppBtn) {
    enterAppBtn.addEventListener('click', () => {
      document.getElementById('landing').style.display = 'none';
      document.getElementById('app').style.display = 'flex';
      Nav.navigate('dashboard');
    });
  }

  // Nav CTA
  const navAppBtn = document.getElementById('navAppBtn');
  if (navAppBtn) {
    navAppBtn.addEventListener('click', () => {
      document.getElementById('landing').style.display = 'none';
      document.getElementById('app').style.display = 'flex';
      Nav.navigate('dashboard');
    });
  }

  // Back to Landing
  const backToLanding = document.getElementById('backToLanding');
  if (backToLanding) {
    backToLanding.addEventListener('click', () => {
      document.getElementById('app').style.display = 'none';
      document.getElementById('landing').style.display = 'block';
    });
  }

  // Feedback form
  const fbForm = document.getElementById('feedbackForm');
  if (fbForm) fbForm.addEventListener('submit', submitFeedback);

  // Ingredient search
  initIngredientSearch();

  // Smooth scroll for nav links
  document.querySelectorAll('.nav-links a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

// Boot when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
