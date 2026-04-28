/* ============================================================
   CAFÉMANAGER — BACKEND ROUTES
   routes.js — All REST API Endpoints
   ============================================================ */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.json');

// ============================================================
// DATABASE HELPERS
// ============================================================

function readDB() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('❌ Failed to read database:', err.message);
    throw new Error('Database read error');
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('❌ Failed to write database:', err.message);
    throw new Error('Database write error');
  }
}

function nextId(db, key) {
  db.meta[`last${capitalize(key.slice(0, -1))}Id`]++;
  return db.meta[`last${capitalize(key.slice(0, -1))}Id`];
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================================
// HEALTH CHECK
// ============================================================

/**
 * GET /api/health
 * Simple health check endpoint
 */
router.get('/health', (req, res) => {
  const db = readDB();
  res.json({
    status: 'ok',
    message: '☕ CaféManager API is running!',
    timestamp: new Date().toISOString(),
    stats: {
      ingredients: db.ingredients.length,
      products: db.products.length,
      totalSales: db.sales.length,
    }
  });
});

// ============================================================
// INGREDIENTS ROUTES
// ============================================================

/**
 * GET /api/ingredients
 * Returns all ingredients
 */
router.get('/ingredients', (req, res) => {
  try {
    const db = readDB();
    res.json(db.ingredients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/ingredients/:id
 * Returns a single ingredient by ID
 */
router.get('/ingredients/:id', (req, res) => {
  try {
    const db = readDB();
    const id = parseInt(req.params.id);
    const ingredient = db.ingredients.find(i => i.id === id);

    if (!ingredient) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }

    res.json(ingredient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/ingredients
 * Add a new ingredient
 * Body: { name, stock, unit, threshold }
 */
router.post('/ingredients', (req, res) => {
  try {
    const { name, stock, unit, threshold } = req.body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Ingredient name is required' });
    }
    if (stock === undefined || stock === null || isNaN(parseFloat(stock)) || parseFloat(stock) < 0) {
      return res.status(400).json({ error: 'Valid stock amount is required (must be >= 0)' });
    }
    if (!unit || typeof unit !== 'string') {
      return res.status(400).json({ error: 'Unit is required' });
    }

    const db = readDB();

    // Check for duplicate name
    const duplicate = db.ingredients.find(i => i.name.toLowerCase() === name.trim().toLowerCase());
    if (duplicate) {
      return res.status(409).json({ error: `Ingredient "${name.trim()}" already exists` });
    }

    const newIngredient = {
      id: ++db.meta.lastIngredientId,
      name: name.trim(),
      stock: parseFloat(parseFloat(stock).toFixed(2)),
      unit: unit.trim(),
      threshold: parseFloat(threshold) || 0,
      createdAt: new Date().toISOString(),
    };

    db.ingredients.push(newIngredient);
    writeDB(db);

    console.log(`✅ Ingredient added: ${newIngredient.name} (ID: ${newIngredient.id})`);
    res.status(201).json(newIngredient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/ingredients/:id
 * Update an ingredient
 * Body: { name, stock, unit, threshold }
 */
router.put('/ingredients/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, stock, unit, threshold } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Ingredient name is required' });
    }
    if (stock === undefined || isNaN(parseFloat(stock)) || parseFloat(stock) < 0) {
      return res.status(400).json({ error: 'Valid stock amount is required' });
    }

    const db = readDB();
    const index = db.ingredients.findIndex(i => i.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }

    // Check duplicate name (excluding self)
    const duplicate = db.ingredients.find(i =>
      i.name.toLowerCase() === name.trim().toLowerCase() && i.id !== id
    );
    if (duplicate) {
      return res.status(409).json({ error: `Ingredient "${name.trim()}" already exists` });
    }

    const updated = {
      ...db.ingredients[index],
      name: name.trim(),
      stock: parseFloat(parseFloat(stock).toFixed(2)),
      unit: unit ? unit.trim() : db.ingredients[index].unit,
      threshold: parseFloat(threshold) || 0,
      updatedAt: new Date().toISOString(),
    };

    db.ingredients[index] = updated;
    writeDB(db);

    console.log(`✏️ Ingredient updated: ${updated.name} (ID: ${updated.id})`);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/ingredients/:id
 * Delete an ingredient
 */
router.delete('/ingredients/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const db = readDB();
    const index = db.ingredients.findIndex(i => i.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }

    // Check if ingredient is used in any product recipe
    const inUse = db.products.find(p =>
      p.recipe && p.recipe.some(r => r.ingredientId === id)
    );
    if (inUse) {
      return res.status(409).json({
        error: `Cannot delete: ingredient is used in product "${inUse.name}". Remove it from the recipe first.`
      });
    }

    const deleted = db.ingredients[index];
    db.ingredients.splice(index, 1);
    writeDB(db);

    console.log(`🗑️ Ingredient deleted: ${deleted.name} (ID: ${deleted.id})`);
    res.json({ success: true, deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PRODUCTS ROUTES
// ============================================================

/**
 * GET /api/products
 * Returns all products with their recipes
 */
router.get('/products', (req, res) => {
  try {
    const db = readDB();
    res.json(db.products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/products/:id
 * Returns a single product
 */
router.get('/products/:id', (req, res) => {
  try {
    const db = readDB();
    const id = parseInt(req.params.id);
    const product = db.products.find(p => p.id === id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/products
 * Add a new product with recipe
 * Body: { name, price, description, emoji, recipe: [{ ingredientId, amount }] }
 */
router.post('/products', (req, res) => {
  try {
    const { name, price, description, emoji, recipe } = req.body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Product name is required' });
    }
    if (price === undefined || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
      return res.status(400).json({ error: 'Valid price is required (must be >= 0)' });
    }

    const db = readDB();

    // Validate recipe ingredients exist
    if (recipe && Array.isArray(recipe)) {
      for (const r of recipe) {
        if (!r.ingredientId || isNaN(r.amount) || r.amount <= 0) {
          return res.status(400).json({ error: 'Each recipe item needs a valid ingredientId and amount > 0' });
        }
        const ing = db.ingredients.find(i => i.id === parseInt(r.ingredientId));
        if (!ing) {
          return res.status(404).json({ error: `Ingredient with ID ${r.ingredientId} not found` });
        }
      }
    }

    // Check duplicate name
    const duplicate = db.products.find(p => p.name.toLowerCase() === name.trim().toLowerCase());
    if (duplicate) {
      return res.status(409).json({ error: `Product "${name.trim()}" already exists` });
    }

    const newProduct = {
      id: ++db.meta.lastProductId,
      name: name.trim(),
      price: parseFloat(parseFloat(price).toFixed(2)),
      description: description ? description.trim() : '',
      emoji: emoji || '☕',
      recipe: recipe ? recipe.map(r => ({
        ingredientId: parseInt(r.ingredientId),
        amount: parseFloat(r.amount),
      })) : [],
      createdAt: new Date().toISOString(),
    };

    db.products.push(newProduct);
    writeDB(db);

    console.log(`✅ Product added: ${newProduct.name} (ID: ${newProduct.id})`);
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/products/:id
 * Update a product and its recipe
 * Body: { name, price, description, emoji, recipe }
 */
router.put('/products/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, price, description, emoji, recipe } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Product name is required' });
    }
    if (price === undefined || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
      return res.status(400).json({ error: 'Valid price is required' });
    }

    const db = readDB();
    const index = db.products.findIndex(p => p.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Validate recipe
    if (recipe && Array.isArray(recipe)) {
      for (const r of recipe) {
        if (!r.ingredientId || isNaN(r.amount) || r.amount <= 0) {
          return res.status(400).json({ error: 'Each recipe item needs a valid ingredientId and amount > 0' });
        }
        const ing = db.ingredients.find(i => i.id === parseInt(r.ingredientId));
        if (!ing) {
          return res.status(404).json({ error: `Ingredient with ID ${r.ingredientId} not found` });
        }
      }
    }

    // Check duplicate name (excluding self)
    const duplicate = db.products.find(p =>
      p.name.toLowerCase() === name.trim().toLowerCase() && p.id !== id
    );
    if (duplicate) {
      return res.status(409).json({ error: `Product "${name.trim()}" already exists` });
    }

    const updated = {
      ...db.products[index],
      name: name.trim(),
      price: parseFloat(parseFloat(price).toFixed(2)),
      description: description ? description.trim() : '',
      emoji: emoji || '☕',
      recipe: recipe ? recipe.map(r => ({
        ingredientId: parseInt(r.ingredientId),
        amount: parseFloat(r.amount),
      })) : [],
      updatedAt: new Date().toISOString(),
    };

    db.products[index] = updated;
    writeDB(db);

    console.log(`✏️ Product updated: ${updated.name} (ID: ${updated.id})`);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/products/:id
 * Delete a product
 */
router.delete('/products/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const db = readDB();
    const index = db.products.findIndex(p => p.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const deleted = db.products[index];
    db.products.splice(index, 1);
    writeDB(db);

    console.log(`🗑️ Product deleted: ${deleted.name} (ID: ${deleted.id})`);
    res.json({ success: true, deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// SALES ROUTES
// ============================================================

/**
 * GET /api/sales
 * Returns all sales records
 */
router.get('/sales', (req, res) => {
  try {
    const db = readDB();
    res.json(db.sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/sales/today
 * Returns today's sales only
 */
router.get('/sales/today', (req, res) => {
  try {
    const db = readDB();
    const today = new Date().toISOString().split('T')[0];
    const todaySales = db.sales.filter(s => s.timestamp && s.timestamp.startsWith(today));
    const revenue = todaySales.reduce((sum, s) => sum + s.price, 0);

    res.json({
      sales: todaySales,
      count: todaySales.length,
      revenue: parseFloat(revenue.toFixed(2)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/sell
 * ⭐ CORE BUSINESS LOGIC: Process a sale
 * Body: { productId, quantity }
 *
 * This endpoint:
 * 1. Finds the product and its recipe
 * 2. Checks if all ingredients have sufficient stock
 * 3. Deducts ingredients from inventory
 * 4. Records the sale transaction
 * 5. Returns updated state
 */
router.post('/sell', (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const qty = parseInt(quantity) || 1;

    if (!productId) {
      return res.status(400).json({ error: 'productId is required' });
    }
    if (qty < 1 || qty > 99) {
      return res.status(400).json({ error: 'Quantity must be between 1 and 99' });
    }

    const db = readDB();

    // 1. Find the product
    const product = db.products.find(p => p.id === parseInt(productId));
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // 2. Check ingredient availability (for the full quantity)
    if (product.recipe && product.recipe.length > 0) {
      const shortages = [];

      for (const recipeItem of product.recipe) {
        const ingredient = db.ingredients.find(i => i.id === recipeItem.ingredientId);

        if (!ingredient) {
          return res.status(404).json({
            error: `Ingredient ID ${recipeItem.ingredientId} not found in inventory`
          });
        }

        const requiredAmount = recipeItem.amount * qty;
        if (ingredient.stock < requiredAmount) {
          shortages.push({
            ingredient: ingredient.name,
            required: requiredAmount,
            available: ingredient.stock,
            unit: ingredient.unit,
          });
        }
      }

      if (shortages.length > 0) {
        return res.status(422).json({
          error: 'Insufficient stock',
          shortages: shortages.map(s =>
            `${s.ingredient}: need ${s.required}${s.unit}, have ${s.available}${s.unit}`
          ).join('; '),
          details: shortages,
        });
      }
    }

    // 3. Deduct ingredients from inventory
    const newSales = [];
    const timestamp = new Date().toISOString();

    if (product.recipe && product.recipe.length > 0) {
      for (const recipeItem of product.recipe) {
        const ingIndex = db.ingredients.findIndex(i => i.id === recipeItem.ingredientId);
        if (ingIndex !== -1) {
          const deductAmount = parseFloat((recipeItem.amount * qty).toFixed(2));
          db.ingredients[ingIndex].stock = parseFloat(
            (db.ingredients[ingIndex].stock - deductAmount).toFixed(2)
          );
          db.ingredients[ingIndex].updatedAt = timestamp;
        }
      }
    }

    // 4. Record each sale (one per unit for clean tracking)
    for (let i = 0; i < qty; i++) {
      const saleRecord = {
        id: ++db.meta.lastSaleId,
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity: 1,
        timestamp: new Date(new Date(timestamp).getTime() + i).toISOString(),
      };
      db.sales.push(saleRecord);
      newSales.push(saleRecord);
    }

    // 5. Save and respond
    writeDB(db);

    // Check for low stock after sale
    const lowStockAlerts = db.ingredients.filter(i =>
      i.threshold > 0 && i.stock <= i.threshold
    );

    console.log(`💰 Sale: ${qty}x ${product.name} @ $${product.price} = $${(product.price * qty).toFixed(2)}`);
    if (lowStockAlerts.length > 0) {
      console.log(`⚠️ Low stock: ${lowStockAlerts.map(i => `${i.name}(${i.stock}${i.unit})`).join(', ')}`);
    }

    res.json({
      success: true,
      message: `Successfully sold ${qty}x ${product.name}`,
      sale: {
        product: product.name,
        quantity: qty,
        unitPrice: product.price,
        totalPrice: parseFloat((product.price * qty).toFixed(2)),
      },
      newSales,
      updatedIngredients: db.ingredients,
      allSales: db.sales,
      lowStockAlerts,
    });

  } catch (err) {
    console.error('❌ Sale error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// SUMMARY / STATS ROUTE
// ============================================================

/**
 * GET /api/summary
 * Returns dashboard summary statistics
 */
router.get('/summary', (req, res) => {
  try {
    const db = readDB();
    const today = new Date().toISOString().split('T')[0];
    const todaySales = db.sales.filter(s => s.timestamp && s.timestamp.startsWith(today));
    const revenue = todaySales.reduce((sum, s) => sum + s.price, 0);

    const lowStockItems = db.ingredients.filter(i => i.threshold > 0 && i.stock <= i.threshold);

    // Top products today
    const productCounts = {};
    todaySales.forEach(s => {
      productCounts[s.productName] = (productCounts[s.productName] || 0) + 1;
    });
    const topProduct = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0];

    res.json({
      today: {
        revenue: parseFloat(revenue.toFixed(2)),
        orders: todaySales.length,
        topProduct: topProduct ? topProduct[0] : null,
      },
      inventory: {
        totalIngredients: db.ingredients.length,
        lowStockCount: lowStockItems.length,
        lowStockItems,
      },
      products: {
        total: db.products.length,
      },
      allTime: {
        totalSales: db.sales.length,
        totalRevenue: parseFloat(db.sales.reduce((sum, s) => sum + s.price, 0).toFixed(2)),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
