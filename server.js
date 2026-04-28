/* ============================================================
   CAFÉMANAGER — BACKEND SERVER
   server.js — Express Application Entry Point
   ============================================================ */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'database.json');

// ============================================================
// MIDDLEWARE
// ============================================================

// CORS — Allow frontend to call the API
app.use(cors({
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3001', 'http://127.0.0.1:3001', '*'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ============================================================
// STATIC FILE SERVING (optional — serves frontend)
// ============================================================
const frontendPath = path.join(__dirname, '../frontend');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  console.log(`📂 Serving frontend from: ${frontendPath}`);
}

// ============================================================
// API ROUTES
// ============================================================
app.use('/api', routes);

// ============================================================
// ROOT ROUTE
// ============================================================
app.get('/', (req, res) => {
  // If frontend exists, serve index.html
  const indexPath = path.join(frontendPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({
      app: '☕ CaféManager API',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health:      'GET  /api/health',
        ingredients: 'GET  /api/ingredients',
        products:    'GET  /api/products',
        sales:       'GET  /api/sales',
        todaySales:  'GET  /api/sales/today',
        summary:     'GET  /api/summary',
        sell:        'POST /api/sell',
      },
      docs: 'See README.md for full API documentation',
    });
  }
});

// ============================================================
// DATABASE INITIALIZATION CHECK
// ============================================================
function initDatabase() {
  if (!fs.existsSync(DB_PATH)) {
    console.log('📦 database.json not found — creating default database...');
    const defaultDB = {
      ingredients: [],
      products: [],
      sales: [],
      meta: {
        lastIngredientId: 0,
        lastProductId: 0,
        lastSaleId: 0,
        version: '1.0.0',
        createdAt: new Date().toISOString(),
      }
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultDB, null, 2));
    console.log('✅ Default database created.');
  } else {
    // Validate database structure
    try {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      const db = JSON.parse(raw);

      let repaired = false;

      // Ensure all required sections exist
      if (!db.ingredients) { db.ingredients = []; repaired = true; }
      if (!db.products)    { db.products = [];    repaired = true; }
      if (!db.sales)       { db.sales = [];       repaired = true; }
      if (!db.meta)        {
        db.meta = { lastIngredientId: 0, lastProductId: 0, lastSaleId: 0 };
        repaired = true;
      }

      // Fix meta IDs if they're behind actual data
      const maxIngId = db.ingredients.reduce((max, i) => Math.max(max, i.id || 0), 0);
      const maxProdId = db.products.reduce((max, p) => Math.max(max, p.id || 0), 0);
      const maxSaleId = db.sales.reduce((max, s) => Math.max(max, s.id || 0), 0);

      if (db.meta.lastIngredientId < maxIngId) { db.meta.lastIngredientId = maxIngId; repaired = true; }
      if (db.meta.lastProductId < maxProdId)   { db.meta.lastProductId = maxProdId;   repaired = true; }
      if (db.meta.lastSaleId < maxSaleId)      { db.meta.lastSaleId = maxSaleId;      repaired = true; }

      if (repaired) {
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
        console.log('🔧 Database repaired and updated.');
      }

      console.log(`📊 Database loaded:`);
      console.log(`   • ${db.ingredients.length} ingredient(s)`);
      console.log(`   • ${db.products.length} product(s)`);
      console.log(`   • ${db.sales.length} sale record(s)`);
    } catch (err) {
      console.error('❌ Database validation error:', err.message);
      console.error('   Please check database.json for syntax errors.');
      process.exit(1);
    }
  }
}

// ============================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    availableEndpoints: [
      'GET    /api/health',
      'GET    /api/ingredients',
      'POST   /api/ingredients',
      'PUT    /api/ingredients/:id',
      'DELETE /api/ingredients/:id',
      'GET    /api/products',
      'POST   /api/products',
      'PUT    /api/products/:id',
      'DELETE /api/products/:id',
      'GET    /api/sales',
      'GET    /api/sales/today',
      'POST   /api/sell',
      'GET    /api/summary',
    ],
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.message);
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// ============================================================
// START SERVER
// ============================================================
initDatabase();

const server = app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════╗');
  console.log('║       ☕  CaféManager Server           ║');
  console.log('╠════════════════════════════════════════╣');
  console.log(`║  🚀 Running on: http://localhost:${PORT}   ║`);
  console.log(`║  📁 Database:   backend/database.json  ║`);
  console.log(`║  🌐 Frontend:   http://localhost:${PORT}   ║`);
  console.log('╚════════════════════════════════════════╝');
  console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down CaféManager server...');
  server.close(() => {
    console.log('✅ Server closed gracefully.');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});

module.exports = app;
