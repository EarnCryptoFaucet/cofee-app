/* ============================================================
   CAFÉMANAGER — FRONTEND APPLICATION
   app.js — Vanilla JavaScript SPA Controller
   ============================================================ */

const API_BASE = 'http://localhost:3000/api';

// ============================================================
// STATE
// ============================================================
let state = {
  ingredients: [],
  products: [],
  sales: [],
  currentPage: 'dashboard',
  sellTarget: null,
  sellQty: 1,
};

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initClock();
  checkAPI();
  loadAllData();
  setInterval(checkAPI, 30000);
});

// ============================================================
// NAVIGATION
// ============================================================
function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      navigateTo(page);
      // Close mobile sidebar
      document.getElementById('sidebar').classList.remove('open');
    });
  });

  document.getElementById('menu-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Close sidebar clicking outside (mobile)
  document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('menu-toggle');
    if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== toggle) {
      sidebar.classList.remove('open');
    }
  });
}

function navigateTo(page) {
  state.currentPage = page;

  // Update nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  // Show correct page
  document.querySelectorAll('.page').forEach(p => {
    p.classList.toggle('active', p.id === `page-${page}`);
  });

  // Update topbar title
  const titles = {
    dashboard: 'Dashboard',
    ingredients: 'Ingredients Management',
    products: 'Products Management',
    sales: 'Sales System',
    reports: 'Reports & Analytics',
  };
  document.getElementById('page-title').textContent = titles[page] || '';

  // Load page-specific data
  if (page === 'dashboard') renderDashboard();
  if (page === 'ingredients') renderIngredientsPage();
  if (page === 'products') renderProductsPage();
  if (page === 'sales') renderSalesPage();
  if (page === 'reports') loadReports();
}

// ============================================================
// CLOCK
// ============================================================
function initClock() {
  function tick() {
    const now = new Date();
    document.getElementById('topbar-time').textContent =
      now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  tick();
  setInterval(tick, 1000);
}

// ============================================================
// API STATUS CHECK
// ============================================================
async function checkAPI() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    const dot = document.getElementById('api-status');
    if (res.ok) {
      dot.classList.remove('error');
      dot.title = 'API Connected ✓';
    } else {
      dot.classList.add('error');
      dot.title = 'API Error';
    }
  } catch {
    document.getElementById('api-status').classList.add('error');
    document.getElementById('api-status').title = 'API Offline';
  }
}

// ============================================================
// DATA LOADING
// ============================================================
async function loadAllData() {
  try {
    const [ingredients, products, sales] = await Promise.all([
      fetchJSON('/ingredients'),
      fetchJSON('/products'),
      fetchJSON('/sales'),
    ]);
    state.ingredients = ingredients;
    state.products = products;
    state.sales = sales;
    navigateTo(state.currentPage);
  } catch (err) {
    showToast('Failed to load data from server. Is the backend running?', 'error');
    renderOfflineMessage();
  }
}

async function fetchJSON(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function renderOfflineMessage() {
  // Show placeholder data for demo
  document.getElementById('stat-revenue').textContent = '$—';
  document.getElementById('stat-orders').textContent = '—';
  document.getElementById('stat-products').textContent = '—';
  document.getElementById('stat-alerts').textContent = '—';
}

// ============================================================
// DASHBOARD
// ============================================================
function renderDashboard() {
  const todaySales = getTodaySales();
  const revenue = todaySales.reduce((sum, s) => sum + s.price, 0);
  const lowStockItems = getLowStockIngredients();

  // Stats
  document.getElementById('stat-revenue').textContent = `$${revenue.toFixed(2)}`;
  document.getElementById('stat-orders').textContent = todaySales.length;
  document.getElementById('stat-products').textContent = state.products.length;
  document.getElementById('stat-alerts').textContent = lowStockItems.length;

  // Alerts section
  const alertsSection = document.getElementById('alerts-section');
  const alertsList = document.getElementById('alerts-list');
  const alertCount = document.getElementById('alert-count');

  if (lowStockItems.length > 0) {
    alertsSection.style.display = 'block';
    alertCount.textContent = lowStockItems.length;
    alertsList.innerHTML = lowStockItems.map(ing => `
      <div class="alert-item">
        <span class="alert-pulse">⚠️</span>
        <span class="alert-name">${escHtml(ing.name)}</span>
        <span class="alert-stock">
          ${ing.stock} ${escHtml(ing.unit)} remaining
          (threshold: ${ing.threshold} ${escHtml(ing.unit)})
        </span>
        <button class="btn btn-xs btn-outline" onclick="navigateTo('ingredients')">View</button>
      </div>
    `).join('');
  } else {
    alertsSection.style.display = 'none';
  }

  // Ingredients table
  const ingTbody = document.getElementById('dashboard-ingredients-table');
  if (state.ingredients.length === 0) {
    ingTbody.innerHTML = `<tr><td colspan="4" class="empty-row">No ingredients added yet.</td></tr>`;
  } else {
    ingTbody.innerHTML = state.ingredients.map(ing => {
      const { cls, label } = stockStatus(ing);
      return `
        <tr>
          <td><strong>${escHtml(ing.name)}</strong></td>
          <td>${ing.stock}</td>
          <td>${escHtml(ing.unit)}</td>
          <td><span class="${cls}">${label}</span></td>
        </tr>`;
    }).join('');
  }

  // Quick sell list
  const quickSell = document.getElementById('quick-sell-list');
  if (state.products.length === 0) {
    quickSell.innerHTML = `<div class="empty-state">No products yet. <a href="#" onclick="navigateTo('products')">Add one →</a></div>`;
  } else {
    quickSell.innerHTML = state.products.slice(0, 6).map(p => `
      <div class="quick-sell-item">
        <div class="qsi-left">
          <span class="qsi-emoji">${p.emoji || '☕'}</span>
          <div>
            <div class="qsi-name">${escHtml(p.name)}</div>
            <div class="qsi-price">$${p.price.toFixed(2)}</div>
          </div>
        </div>
        <button class="btn btn-sm btn-success" onclick="openSellModal(${p.id})">Sell</button>
      </div>
    `).join('');
  }

  // Today's sales log
  const salesTbody = document.getElementById('dashboard-sales-table');
  const salesCount = document.getElementById('dash-sales-count');
  salesCount.textContent = `${todaySales.length} sales`;

  if (todaySales.length === 0) {
    salesTbody.innerHTML = `<tr><td colspan="4" class="empty-row">No sales today yet.</td></tr>`;
  } else {
    salesTbody.innerHTML = todaySales.slice().reverse().slice(0, 10).map((s, i) => `
      <tr>
        <td>${todaySales.length - i}</td>
        <td><strong>${escHtml(s.productName)}</strong></td>
        <td class="text-success">$${s.price.toFixed(2)}</td>
        <td class="text-muted">${formatTime(s.timestamp)}</td>
      </tr>
    `).join('');
  }
}

// ============================================================
// INGREDIENTS PAGE
// ============================================================
function renderIngredientsPage() {
  renderIngredientsTable(state.ingredients);
}

function renderIngredientsTable(list) {
  const tbody = document.getElementById('ingredients-table');
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-row">
      <span class="empty-state-icon">🧂</span>
      No ingredients found. Add your first ingredient!
    </td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(ing => {
    const { cls, label } = stockStatus(ing);
    const pct = Math.min(100, ing.threshold > 0 ? (ing.stock / (ing.threshold * 3)) * 100 : 100);
    const barCls = pct < 33 ? 'low' : pct < 66 ? 'warning' : 'ok';

    return `
      <tr>
        <td><strong>${escHtml(ing.name)}</strong></td>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <span>${ing.stock}</span>
            <div class="stock-bar-wrap">
              <div class="stock-bar ${barCls}" style="width:${pct}%"></div>
            </div>
          </div>
        </td>
        <td>${escHtml(ing.unit)}</td>
        <td>${ing.threshold || 0} ${escHtml(ing.unit)}</td>
        <td><span class="${cls}">${label}</span></td>
        <td>
          <div class="actions-cell">
            <button class="btn-icon edit" onclick="openIngredientModal(${ing.id})" title="Edit">✏️</button>
            <button class="btn-icon delete" onclick="confirmDelete('ingredient', ${ing.id}, '${escHtml(ing.name)}')" title="Delete">🗑️</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function filterIngredients() {
  const q = document.getElementById('ingredient-search').value.toLowerCase();
  const filtered = state.ingredients.filter(i => i.name.toLowerCase().includes(q));
  renderIngredientsTable(filtered);
}

// ============================================================
// INGREDIENT MODAL
// ============================================================
function openIngredientModal(id = null) {
  const modal = document.getElementById('ingredient-modal');
  const title = document.getElementById('ingredient-modal-title');

  document.getElementById('ingredient-id').value = '';
  document.getElementById('ingredient-name').value = '';
  document.getElementById('ingredient-stock').value = '';
  document.getElementById('ingredient-unit').value = 'ml';
  document.getElementById('ingredient-threshold').value = '';

  if (id !== null) {
    const ing = state.ingredients.find(i => i.id === id);
    if (!ing) return;
    title.textContent = 'Edit Ingredient';
    document.getElementById('ingredient-id').value = ing.id;
    document.getElementById('ingredient-name').value = ing.name;
    document.getElementById('ingredient-stock').value = ing.stock;
    document.getElementById('ingredient-unit').value = ing.unit;
    document.getElementById('ingredient-threshold').value = ing.threshold || 0;
  } else {
    title.textContent = 'Add Ingredient';
  }

  openModal('ingredient-modal');
}

async function saveIngredient() {
  const id = document.getElementById('ingredient-id').value;
  const name = document.getElementById('ingredient-name').value.trim();
  const stock = parseFloat(document.getElementById('ingredient-stock').value);
  const unit = document.getElementById('ingredient-unit').value;
  const threshold = parseFloat(document.getElementById('ingredient-threshold').value) || 0;

  if (!name || isNaN(stock)) {
    showToast('Please fill in name and stock amount.', 'error');
    return;
  }

  const payload = { name, stock, unit, threshold };

  try {
    let res, data;
    if (id) {
      res = await fetch(`${API_BASE}/ingredients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch(`${API_BASE}/ingredients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save');

    if (id) {
      state.ingredients = state.ingredients.map(i => i.id === parseInt(id) ? data : i);
      showToast(`✅ "${name}" updated successfully!`, 'success');
    } else {
      state.ingredients.push(data);
      showToast(`✅ "${name}" added to inventory!`, 'success');
    }

    closeModal('ingredient-modal');
    renderIngredientsPage();
    if (state.currentPage === 'dashboard') renderDashboard();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

// ============================================================
// PRODUCTS PAGE
// ============================================================
function renderProductsPage() {
  const grid = document.getElementById('products-grid');

  if (state.products.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;padding:60px;">
        <span class="empty-state-icon">🛍️</span>
        No products yet. Add your first menu item!
      </div>`;
    return;
  }

  grid.innerHTML = state.products.map(p => {
    const recipeHTML = p.recipe && p.recipe.length > 0
      ? `<div class="product-recipe">
          <div class="product-recipe-title">📋 Recipe</div>
          ${p.recipe.map(r => {
            const ing = state.ingredients.find(i => i.id === r.ingredientId);
            return `<div class="recipe-ingredient">• ${ing ? escHtml(ing.name) : 'Unknown'}: ${r.amount} ${ing ? escHtml(ing.unit) : ''}</div>`;
          }).join('')}
         </div>`
      : `<div class="product-recipe"><div class="product-recipe-title" style="color:var(--text-light)">No recipe defined</div></div>`;

    return `
      <div class="product-card">
        <span class="product-emoji">${p.emoji || '☕'}</span>
        <div class="product-name">${escHtml(p.name)}</div>
        <div class="product-price">$${p.price.toFixed(2)}</div>
        <div class="product-desc">${escHtml(p.description || '')}</div>
        ${recipeHTML}
        <div class="product-actions">
          <button class="btn btn-sm btn-outline" onclick="openProductModal(${p.id})">✏️ Edit</button>
          <button class="btn btn-sm btn-outline" style="border-color:var(--danger);color:var(--danger);"
            onclick="confirmDelete('product', ${p.id}, '${escHtml(p.name)}')">🗑️</button>
          <button class="btn btn-sm btn-success" onclick="openSellModal(${p.id})">☕ Sell</button>
        </div>
      </div>`;
  }).join('');
}

// ============================================================
// PRODUCT MODAL
// ============================================================
function openProductModal(id = null) {
  const title = document.getElementById('product-modal-title');
  document.getElementById('product-id').value = '';
  document.getElementById('product-name').value = '';
  document.getElementById('product-price').value = '';
  document.getElementById('product-description').value = '';
  document.getElementById('product-emoji').value = '☕';
  document.getElementById('recipe-rows').innerHTML = '';
  document.getElementById('recipe-empty').style.display = 'block';

  if (id !== null) {
    const p = state.products.find(pr => pr.id === id);
    if (!p) return;
    title.textContent = 'Edit Product';
    document.getElementById('product-id').value = p.id;
    document.getElementById('product-name').value = p.name;
    document.getElementById('product-price').value = p.price;
    document.getElementById('product-description').value = p.description || '';
    document.getElementById('product-emoji').value = p.emoji || '☕';

    if (p.recipe && p.recipe.length > 0) {
      document.getElementById('recipe-empty').style.display = 'none';
      p.recipe.forEach(r => addRecipeRow(r.ingredientId, r.amount));
    }
  } else {
    title.textContent = 'Add Product';
  }

  openModal('product-modal');
}

function addRecipeRow(ingredientId = '', amount = '') {
  const container = document.getElementById('recipe-rows');
  document.getElementById('recipe-empty').style.display = 'none';

  const rowId = `recipe-row-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const options = state.ingredients.map(ing =>
    `<option value="${ing.id}" ${ing.id === ingredientId ? 'selected' : ''}>${escHtml(ing.name)}</option>`
  ).join('');

  const div = document.createElement('div');
  div.className = 'recipe-row';
  div.id = rowId;
  div.innerHTML = `
    <select>${options.length ? options : '<option value="">No ingredients</option>'}</select>
    <input type="number" placeholder="Amount" value="${amount}" step="0.01" min="0" />
    <select id="unit-${rowId}">
      ${getUnitOptions(ingredientId)}
    </select>
    <button class="recipe-remove" onclick="removeRecipeRow('${rowId}')">✕</button>
  `;

  // Auto-update unit when ingredient changes
  const ingSelect = div.querySelector('select');
  ingSelect.addEventListener('change', (e) => {
    const unitSel = div.querySelector(`#unit-${rowId}`);
    const selIng = state.ingredients.find(i => i.id === parseInt(e.target.value));
    unitSel.innerHTML = `<option>${selIng ? selIng.unit : ''}</option>`;
  });

  container.appendChild(div);
}

function getUnitOptions(ingredientId) {
  const ing = state.ingredients.find(i => i.id === ingredientId);
  const unit = ing ? ing.unit : 'ml';
  return `<option value="${unit}">${unit}</option>`;
}

function removeRecipeRow(rowId) {
  const row = document.getElementById(rowId);
  if (row) row.remove();
  if (document.getElementById('recipe-rows').children.length === 0) {
    document.getElementById('recipe-empty').style.display = 'block';
  }
}

async function saveProduct() {
  const id = document.getElementById('product-id').value;
  const name = document.getElementById('product-name').value.trim();
  const price = parseFloat(document.getElementById('product-price').value);
  const description = document.getElementById('product-description').value.trim();
  const emoji = document.getElementById('product-emoji').value.trim() || '☕';

  if (!name || isNaN(price) || price < 0) {
    showToast('Please fill in product name and a valid price.', 'error');
    return;
  }

  // Collect recipe
  const recipeRows = document.querySelectorAll('#recipe-rows .recipe-row');
  const recipe = [];
  let recipeValid = true;

  recipeRows.forEach(row => {
    const selects = row.querySelectorAll('select');
    const amountInput = row.querySelectorAll('input[type="number"]')[0];
    const ingredientId = parseInt(selects[0].value);
    const amount = parseFloat(amountInput.value);

    if (!ingredientId || isNaN(amount) || amount <= 0) {
      recipeValid = false;
      return;
    }
    recipe.push({ ingredientId, amount });
  });

  if (!recipeValid) {
    showToast('Please complete all recipe rows or remove empty ones.', 'error');
    return;
  }

  const payload = { name, price, description, emoji, recipe };

  try {
    let res, data;
    if (id) {
      res = await fetch(`${API_BASE}/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save');

    if (id) {
      state.products = state.products.map(p => p.id === parseInt(id) ? data : p);
      showToast(`✅ "${name}" updated!`, 'success');
    } else {
      state.products.push(data);
      showToast(`✅ "${name}" added to menu!`, 'success');
    }

    closeModal('product-modal');
    renderProductsPage();
    if (state.currentPage === 'dashboard') renderDashboard();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

// ============================================================
// DELETE CONFIRMATION
// ============================================================
function confirmDelete(type, id, name) {
  document.getElementById('confirm-message').textContent =
    `Are you sure you want to delete "${name}"?`;

  const btn = document.getElementById('confirm-action-btn');
  btn.onclick = () => {
    if (type === 'ingredient') deleteIngredient(id, name);
    else if (type === 'product') deleteProduct(id, name);
    closeModal('confirm-modal');
  };

  openModal('confirm-modal');
}

async function deleteIngredient(id, name) {
  try {
    const res = await fetch(`${API_BASE}/ingredients/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Delete failed');
    }
    state.ingredients = state.ingredients.filter(i => i.id !== id);
    showToast(`🗑️ "${name}" deleted.`, 'warning');
    renderIngredientsPage();
    if (state.currentPage === 'dashboard') renderDashboard();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

async function deleteProduct(id, name) {
  try {
    const res = await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Delete failed');
    }
    state.products = state.products.filter(p => p.id !== id);
    showToast(`🗑️ "${name}" removed from menu.`, 'warning');
    renderProductsPage();
    if (state.currentPage === 'dashboard') renderDashboard();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

// ============================================================
// SALES PAGE
// ============================================================
function renderSalesPage() {
  const todaySales = getTodaySales();
  const revenue = todaySales.reduce((sum, s) => sum + s.price, 0);

  document.getElementById('sales-revenue').textContent = `$${revenue.toFixed(2)}`;
  document.getElementById('sales-count-badge').textContent = todaySales.length;

  // Sell products grid
  const grid = document.getElementById('sell-products-grid');
  if (state.products.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
      No products available. <a href="#" onclick="navigateTo('products')">Add products →</a>
    </div>`;
  } else {
    grid.innerHTML = state.products.map(p => {
      const canSell = canSellProduct(p);
      return `
        <button class="sell-product-btn ${canSell ? '' : 'unavailable'}"
          onclick="${canSell ? `openSellModal(${p.id})` : 'showToast(\'Insufficient stock for this product.\', \'error\')'}">
          <span class="spb-emoji">${p.emoji || '☕'}</span>
          <span class="spb-name">${escHtml(p.name)}</span>
          <span class="spb-price">$${p.price.toFixed(2)}</span>
          ${!canSell ? '<span class="spb-status">⚠ Low Stock</span>' : ''}
        </button>`;
    }).join('');
  }

  // Sales table
  renderSalesTable();
}

function renderSalesTable() {
  const todaySales = getTodaySales();
  const tbody = document.getElementById('sales-table');

  if (todaySales.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-row">No sales recorded today.</td></tr>`;
    return;
  }

  tbody.innerHTML = todaySales.slice().reverse().map((s, i) => `
    <tr>
      <td>${todaySales.length - i}</td>
      <td><strong>${escHtml(s.productName)}</strong></td>
      <td class="text-success">$${s.price.toFixed(2)}</td>
      <td class="text-muted">${formatTime(s.timestamp)}</td>
    </tr>
  `).join('');
}

// ============================================================
// SELL MODAL
// ============================================================
function openSellModal(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  state.sellTarget = product;
  state.sellQty = 1;

  document.getElementById('sell-confirm-details').innerHTML = `
    <span class="sc-emoji">${product.emoji || '☕'}</span>
    <div class="sc-name">${escHtml(product.name)}</div>
    <div class="sc-price">$${product.price.toFixed(2)} each</div>
  `;

  document.getElementById('sell-qty').textContent = 1;
  document.getElementById('sell-total-price').textContent = `$${product.price.toFixed(2)}`;

  openModal('sell-modal');
}

function changeQty(delta) {
  const newQty = Math.max(1, Math.min(99, state.sellQty + delta));
  state.sellQty = newQty;
  document.getElementById('sell-qty').textContent = newQty;
  if (state.sellTarget) {
    document.getElementById('sell-total-price').textContent =
      `$${(state.sellTarget.price * newQty).toFixed(2)}`;
  }
}

async function confirmSell() {
  if (!state.sellTarget) return;

  const product = state.sellTarget;
  const qty = state.sellQty;

  try {
    const res = await fetch(`${API_BASE}/sell`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id, quantity: qty }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Sale failed');

    // Update state
    state.ingredients = data.updatedIngredients;
    state.sales = data.allSales || state.sales;

    // Add new sale entries to local state
    if (data.newSales) {
      state.sales = [...state.sales, ...data.newSales];
    }

    closeModal('sell-modal');

    const emoji = product.emoji || '☕';
    showToast(`${emoji} Sold ${qty}x ${product.name} for $${(product.price * qty).toFixed(2)}!`, 'success');

    // Check for new low stock alerts
    const newLowStock = getLowStockIngredients();
    if (newLowStock.length > 0) {
      setTimeout(() => {
        showToast(`⚠️ Low stock alert: ${newLowStock.map(i => i.name).join(', ')}`, 'warning');
      }, 1000);
    }

    // Refresh current page
    if (state.currentPage === 'dashboard') renderDashboard();
    if (state.currentPage === 'sales') renderSalesPage();
    if (state.currentPage === 'ingredients') renderIngredientsPage();
    if (state.currentPage === 'reports') loadReports();

  } catch (err) {
    showToast(`❌ ${err.message}`, 'error');
  }
}

// ============================================================
// REPORTS
// ============================================================
async function loadReports() {
  try {
    // Reload fresh data
    const [ingredients, products, sales] = await Promise.all([
      fetchJSON('/ingredients'),
      fetchJSON('/products'),
      fetchJSON('/sales'),
    ]);
    state.ingredients = ingredients;
    state.products = products;
    state.sales = sales;

    renderReports();
  } catch {
    renderReports(); // Use existing state
  }
}

function renderReports() {
  const todaySales = getTodaySales();
  const revenue = todaySales.reduce((sum, s) => sum + s.price, 0);

  document.getElementById('report-revenue').textContent = `$${revenue.toFixed(2)}`;
  document.getElementById('report-orders').textContent = todaySales.length;
  document.getElementById('report-total-sales').textContent = state.sales.length;

  // Top products today
  const productCounts = {};
  todaySales.forEach(s => {
    if (!productCounts[s.productName]) {
      productCounts[s.productName] = { qty: 0, revenue: 0 };
    }
    productCounts[s.productName].qty++;
    productCounts[s.productName].revenue += s.price;
  });

  const sorted = Object.entries(productCounts).sort((a, b) => b[1].qty - a[1].qty);

  const topProductsTable = document.getElementById('report-top-products-table');
  if (sorted.length === 0) {
    topProductsTable.innerHTML = `<tr><td colspan="3" class="empty-row">No sales data today.</td></tr>`;
    document.getElementById('report-top-product').textContent = '—';
  } else {
    topProductsTable.innerHTML = sorted.map(([name, data], i) => `
      <tr>
        <td>${i === 0 ? '🏆 ' : ''}<strong>${escHtml(name)}</strong></td>
        <td><span class="badge badge-blue">${data.qty}x</span></td>
        <td class="text-success">$${data.revenue.toFixed(2)}</td>
      </tr>
    `).join('');
    document.getElementById('report-top-product').textContent = sorted[0][0];
  }

  // Consumption table
  const consumptionMap = {};
  todaySales.forEach(s => {
    const product = state.products.find(p => p.name === s.productName || p.id === s.productId);
    if (product && product.recipe) {
      product.recipe.forEach(r => {
        const ing = state.ingredients.find(i => i.id === r.ingredientId);
        if (ing) {
          if (!consumptionMap[ing.name]) consumptionMap[ing.name] = { used: 0, unit: ing.unit, remaining: ing.stock };
          consumptionMap[ing.name].used += r.amount * (s.quantity || 1);
        }
      });
    }
  });

  const consumptionTable = document.getElementById('report-consumption-table');
  const consumption = Object.entries(consumptionMap);
  if (consumption.length === 0) {
    consumptionTable.innerHTML = `<tr><td colspan="3" class="empty-row">No consumption data.</td></tr>`;
  } else {
    consumptionTable.innerHTML = consumption.map(([name, data]) => `
      <tr>
        <td><strong>${escHtml(name)}</strong></td>
        <td class="text-danger">-${data.used} ${escHtml(data.unit)}</td>
        <td>${data.remaining} ${escHtml(data.unit)}</td>
      </tr>
    `).join('');
  }

  // Full sales history
  const reportSalesTable = document.getElementById('report-sales-table');
  if (todaySales.length === 0) {
    reportSalesTable.innerHTML = `<tr><td colspan="4" class="empty-row">No sales today.</td></tr>`;
  } else {
    reportSalesTable.innerHTML = todaySales.slice().reverse().map((s, i) => `
      <tr>
        <td>${todaySales.length - i}</td>
        <td><strong>${escHtml(s.productName)}</strong></td>
        <td class="text-success">$${s.price.toFixed(2)}</td>
        <td class="text-muted">${formatTime(s.timestamp)}</td>
      </tr>
    `).join('');
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================
function getTodaySales() {
  const today = new Date().toISOString().split('T')[0];
  return state.sales.filter(s => s.timestamp && s.timestamp.startsWith(today));
}

function getLowStockIngredients() {
  return state.ingredients.filter(i => i.threshold > 0 && i.stock <= i.threshold);
}

function canSellProduct(product) {
  if (!product.recipe || product.recipe.length === 0) return true;
  return product.recipe.every(r => {
    const ing = state.ingredients.find(i => i.id === r.ingredientId);
    return ing && ing.stock >= r.amount;
  });
}

function stockStatus(ing) {
  if (!ing.threshold || ing.threshold === 0) {
    return { cls: 'stock-ok', label: '✓ In Stock' };
  }
  if (ing.stock <= ing.threshold) {
    return { cls: 'stock-low', label: '⚠ Low Stock' };
  }
  if (ing.stock <= ing.threshold * 1.5) {
    return { cls: 'stock-warning', label: '⚡ Getting Low' };
  }
  return { cls: 'stock-ok', label: '✓ Good' };
}

function formatTime(timestamp) {
  if (!timestamp) return '—';
  const d = new Date(timestamp);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================================
// MODAL HELPERS
// ============================================================
function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    }
  });
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => {
      m.classList.remove('open');
      document.body.style.overflow = '';
    });
  }
});

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  toast.innerHTML = `${icons[type] || ''} ${message}`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
