/**
 * routes.js
 * All API route handlers for the Coffee Shop Management System
 * Uses JSON file storage via the db utility
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

/* ─────────────────────────────────────────
   INGREDIENTS
───────────────────────────────────────── */

// GET all ingredients
router.get('/ingredients', (req, res) => {
  try {
    const data = db.read();
    res.json({ success: true, data: data.ingredients });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch ingredients', error: err.message });
  }
});

// POST create ingredient
router.post('/ingredients', (req, res) => {
  try {
    const { name, stock, unit, threshold } = req.body;

    // Validation
    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Ingredient name is required' });
    }
    if (stock === undefined || isNaN(Number(stock)) || Number(stock) < 0) {
      return res.status(400).json({ success: false, message: 'Valid stock quantity is required' });
    }
    if (!unit || unit.trim() === '') {
      return res.status(400).json({ success: false, message: 'Unit is required' });
    }
    if (threshold === undefined || isNaN(Number(threshold)) || Number(threshold) < 0) {
      return res.status(400).json({ success: false, message: 'Valid threshold is required' });
    }

    const data = db.read();

    // Check duplicate name
    const duplicate = data.ingredients.find(
      (i) => i.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (duplicate) {
      return res.status(409).json({ success: false, message: 'Ingredient with this name already exists' });
    }

    const newIngredient = {
      id: 'ing_' + uuidv4().split('-')[0],
      name: name.trim(),
      stock: Number(stock),
      unit: unit.trim(),
      threshold: Number(threshold),
      createdAt: new Date().toISOString()
    };

    data.ingredients.push(newIngredient);
    db.write(data);

    res.status(201).json({ success: true, data: newIngredient, message: 'Ingredient added successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create ingredient', error: err.message });
  }
});

// PUT update ingredient
router.put('/ingredients/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, stock, unit, threshold } = req.body;
    const data = db.read();

    const index = data.ingredients.findIndex((i) => i.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Ingredient not found' });
    }

    // Validation
    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Ingredient name is required' });
    }
    if (stock === undefined || isNaN(Number(stock)) || Number(stock) < 0) {
      return res.status(400).json({ success: false, message: 'Valid stock quantity is required' });
    }
    if (!unit || unit.trim() === '') {
      return res.status(400).json({ success: false, message: 'Unit is required' });
    }
    if (threshold === undefined || isNaN(Number(threshold)) || Number(threshold) < 0) {
      return res.status(400).json({ success: false, message: 'Valid threshold is required' });
    }

    // Check duplicate name (excluding self)
    const duplicate = data.ingredients.find(
      (i) => i.name.toLowerCase() === name.trim().toLowerCase() && i.id !== id
    );
    if (duplicate) {
      return res.status(409).json({ success: false, message: 'Another ingredient with this name already exists' });
    }

    data.ingredients[index] = {
      ...data.ingredients[index],
      name: name.trim(),
      stock: Number(stock),
      unit: unit.trim(),
      threshold: Number(threshold),
      updatedAt: new Date().toISOString()
    };

    db.write(data);
    res.json({ success: true, data: data.ingredients[index], message: 'Ingredient updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update ingredient', error: err.message });
  }
});

// DELETE ingredient
router.delete('/ingredients/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = db.read();

    const index = data.ingredients.findIndex((i) => i.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Ingredient not found' });
    }

    // Check if ingredient is used in any product recipe
    const usedIn = data.products.filter((p) =>
      p.recipe.some((r) => r.ingredientId === id)
    );
    if (usedIn.length > 0) {
      const productNames = usedIn.map((p) => p.name).join(', ');
      return res.status(409).json({
        success: false,
        message: `Cannot delete: ingredient is used in product(s): ${productNames}`
      });
    }

    data.ingredients.splice(index, 1);
    db.write(data);

    res.json({ success: true, message: 'Ingredient deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete ingredient', error: err.message });
  }
});

/* ─────────────────────────────────────────
   PRODUCTS
───────────────────────────────────────── */

// GET all products
router.get('/products', (req, res) => {
  try {
    const data = db.read();

    // Enrich products with ingredient details
    const enriched = data.products.map((p) => ({
      ...p,
      recipe: p.recipe.map((r) => {
        const ing = data.ingredients.find((i) => i.id === r.ingredientId);
        return {
          ...r,
          ingredientName: ing ? ing.name : 'Unknown',
          ingredientUnit: ing ? ing.unit : ''
        };
      })
    }));

    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch products', error: err.message });
  }
});

// POST create product
router.post('/products', (req, res) => {
  try {
    const { name, price, recipe } = req.body;

    // Validation
    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Product name is required' });
    }
    if (price === undefined || isNaN(Number(price)) || Number(price) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid price is required' });
    }
    if (!recipe || !Array.isArray(recipe) || recipe.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one recipe ingredient is required' });
    }

    const data = db.read();

    // Check duplicate product name
    const duplicate = data.products.find(
      (p) => p.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (duplicate) {
      return res.status(409).json({ success: false, message: 'Product with this name already exists' });
    }

    // Validate recipe ingredients
    for (const item of recipe) {
      if (!item.ingredientId) {
        return res.status(400).json({ success: false, message: 'Each recipe item must have an ingredientId' });
      }
      if (!item.quantity || isNaN(Number(item.quantity)) || Number(item.quantity) <= 0) {
        return res.status(400).json({ success: false, message: 'Each recipe item must have a valid quantity' });
      }
      const ing = data.ingredients.find((i) => i.id === item.ingredientId);
      if (!ing) {
        return res.status(404).json({ success: false, message: `Ingredient ${item.ingredientId} not found` });
      }
    }

    const newProduct = {
      id: 'prod_' + uuidv4().split('-')[0],
      name: name.trim(),
      price: Number(price),
      recipe: recipe.map((r) => ({
        ingredientId: r.ingredientId,
        quantity: Number(r.quantity)
      })),
      createdAt: new Date().toISOString()
    };

    data.products.push(newProduct);
    db.write(data);

    res.status(201).json({ success: true, data: newProduct, message: 'Product added successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create product', error: err.message });
  }
});

// PUT update product
router.put('/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, recipe } = req.body;
    const data = db.read();

    const index = data.products.findIndex((p) => p.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Validation
    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Product name is required' });
    }
    if (price === undefined || isNaN(Number(price)) || Number(price) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid price is required' });
    }
    if (!recipe || !Array.isArray(recipe) || recipe.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one recipe ingredient is required' });
    }

    // Check duplicate name (excluding self)
    const duplicate = data.products.find(
      (p) => p.name.toLowerCase() === name.trim().toLowerCase() && p.id !== id
    );
    if (duplicate) {
      return res.status(409).json({ success: false, message: 'Another product with this name already exists' });
    }

    // Validate recipe
    for (const item of recipe) {
      if (!item.ingredientId) {
        return res.status(400).json({ success: false, message: 'Each recipe item must have an ingredientId' });
      }
      if (!item.quantity || isNaN(Number(item.quantity)) || Number(item.quantity) <= 0) {
        return res.status(400).json({ success: false, message: 'Each recipe item must have a valid quantity' });
      }
      const ing = data.ingredients.find((i) => i.id === item.ingredientId);
      if (!ing) {
        return res.status(404).json({ success: false, message: `Ingredient ${item.ingredientId} not found` });
      }
    }

    data.products[index] = {
      ...data.products[index],
      name: name.trim(),
      price: Number(price),
      recipe: recipe.map((r) => ({
        ingredientId: r.ingredientId,
        quantity: Number(r.quantity)
      })),
      updatedAt: new Date().toISOString()
    };

    db.write(data);
    res.json({ success: true, data: data.products[index], message: 'Product updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update product', error: err.message });
  }
});

// DELETE product
router.delete('/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = db.read();

    const index = data.products.findIndex((p) => p.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    data.products.splice(index, 1);
    db.write(data);

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete product', error: err.message });
  }
});

/* ─────────────────────────────────────────
   SALES
───────────────────────────────────────── */

// POST sell a product (core business logic)
router.post('/sell', (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'productId is required' });
    }
    if (isNaN(Number(quantity)) || Number(quantity) < 1) {
      return res.status(400).json({ success: false, message: 'Quantity must be at least 1' });
    }

    const data = db.read();
    const product = data.products.find((p) => p.id === productId);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const qty = Number(quantity);

    // ── Business Logic: Check stock sufficiency ──
    const insufficientIngredients = [];
    for (const recipeItem of product.recipe) {
      const ingredient = data.ingredients.find((i) => i.id === recipeItem.ingredientId);
      if (!ingredient) {
        return res.status(404).json({
          success: false,
          message: `Ingredient ${recipeItem.ingredientId} in recipe not found`
        });
      }
      const requiredAmount = recipeItem.quantity * qty;
      if (ingredient.stock < requiredAmount) {
        insufficientIngredients.push({
          name: ingredient.name,
          required: requiredAmount,
          available: ingredient.stock,
          unit: ingredient.unit
        });
      }
    }

    if (insufficientIngredients.length > 0) {
      return res.status(422).json({
        success: false,
        message: 'Insufficient stock for this sale',
        insufficientIngredients
      });
    }

    // ── Deduct stock from all ingredients ──
    for (const recipeItem of product.recipe) {
      const ingIndex = data.ingredients.findIndex((i) => i.id === recipeItem.ingredientId);
      data.ingredients[ingIndex].stock -= recipeItem.quantity * qty;
    }

    // ── Record the sale ──
    const newSale = {
      id: 'sale_' + uuidv4().split('-')[0],
      productId: product.id,
      productName: product.name,
      price: product.price,
      quantity: qty,
      total: product.price * qty,
      soldAt: new Date().toISOString()
    };

    data.sales.push(newSale);
    db.write(data);

    // ── Check for low stock alerts ──
    const lowStockAlerts = data.ingredients.filter((i) => i.stock <= i.threshold);

    res.json({
      success: true,
      message: `${product.name} sold successfully!`,
      data: {
        sale: newSale,
        updatedIngredients: data.ingredients,
        lowStockAlerts
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to process sale', error: err.message });
  }
});

// GET sales (with optional date filter)
router.get('/sales', (req, res) => {
  try {
    const data = db.read();
    const { date } = req.query;

    let sales = data.sales;

    if (date) {
      // Filter sales by date (YYYY-MM-DD)
      sales = sales.filter((s) => s.soldAt.startsWith(date));
    }

    // Compute summary
    const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
    const totalOrders = sales.length;

    // Today's summary
    const today = new Date().toISOString().split('T')[0];
    const todaySales = data.sales.filter((s) => s.soldAt.startsWith(today));
    const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);

    res.json({
      success: true,
      data: {
        sales,
        summary: { totalRevenue, totalOrders },
        today: { sales: todaySales, revenue: todayRevenue, orders: todaySales.length }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch sales', error: err.message });
  }
});

/* ─────────────────────────────────────────
   FEEDBACK (proxy to Supabase)
───────────────────────────────────────── */

router.post('/feedback', async (req, res) => {
  try {
    const { name, message } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gvtdvnqvxordraztxkwx.supabase.co';
    const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_On0R6UD2iuwqcWgnKQmK8w_3DzBKsuB';

    const response = await fetch(`${SUPABASE_URL}/rest/v1/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        name: name ? name.trim() : 'Anonymous',
        message: message.trim(),
        created_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Supabase error:', errBody);
      return res.status(502).json({ success: false, message: 'Failed to send feedback to Supabase' });
    }

    const result = await response.json();
    res.json({ success: true, message: 'Feedback submitted successfully!', data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to submit feedback', error: err.message });
  }
});

/* ─────────────────────────────────────────
   ANALYTICS
───────────────────────────────────────── */

router.get('/analytics', (req, res) => {
  try {
    const data = db.read();

    // Revenue by product
    const productRevenue = {};
    for (const sale of data.sales) {
      if (!productRevenue[sale.productName]) {
        productRevenue[sale.productName] = { revenue: 0, orders: 0 };
      }
      productRevenue[sale.productName].revenue += sale.total;
      productRevenue[sale.productName].orders += sale.quantity;
    }

    // Top products by revenue
    const topProducts = Object.entries(productRevenue)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue);

    // Daily sales (last 7 days)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const daySales = data.sales.filter((s) => s.soldAt.startsWith(dateStr));
      last7Days.push({
        date: dateStr,
        revenue: daySales.reduce((sum, s) => sum + s.total, 0),
        orders: daySales.length
      });
    }

    // Low stock items
    const lowStock = data.ingredients.filter((i) => i.stock <= i.threshold);

    // Total stats
    const totalRevenue = data.sales.reduce((sum, s) => sum + s.total, 0);
    const totalOrders = data.sales.length;
    const totalIngredients = data.ingredients.length;
    const totalProducts = data.products.length;

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalOrders,
        totalIngredients,
        totalProducts,
        topProducts,
        last7Days,
        lowStock
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch analytics', error: err.message });
  }
});

module.exports = router;
