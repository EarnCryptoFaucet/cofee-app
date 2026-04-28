/* ============================================================
   CAFÉMANAGER — FIXED SERVER FOR DEPLOY
   ============================================================ */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'database.json');

// ===================== MIDDLEWARE =====================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// ===================== STATIC FILES =====================

// 🔥 مهم: فرانت‌اند از public سرو میشه
app.use(express.static(path.join(__dirname, 'public')));

// ===================== API =====================

app.use('/api', routes);

// ===================== ROOT =====================

// همیشه index.html رو بده
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===================== DATABASE INIT =====================

function initDatabase() {
  if (!fs.existsSync(DB_PATH)) {
    console.log('Creating database.json...');

    const defaultDB = {
      ingredients: [],
      products: [],
      sales: [],
      meta: {
        lastIngredientId: 0,
        lastProductId: 0,
        lastSaleId: 0
      }
    };

    fs.writeFileSync(DB_PATH, JSON.stringify(defaultDB, null, 2));
  }
}

initDatabase();

// ===================== ERROR HANDLING =====================

// 404 API
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API not found' });
});

// Global error
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

// ===================== START =====================

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
