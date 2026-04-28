# ☕ CaféManager — Coffee Shop Inventory & Sales Management System

A complete MVP web application for managing coffee shop inventory, products, recipes, and sales.

---

## 📁 Project Structure

```
cafemanager/
├── frontend/
│   ├── index.html          # Main SPA HTML
│   ├── style.css           # All styles (responsive, minimal modern UI)
│   └── app.js              # Frontend JavaScript (Vanilla JS, no frameworks)
│
├── backend/
│   ├── server.js           # Express server entry point
│   ├── routes.js           # All REST API route handlers
│   └── database.json       # JSON file database (auto-created if missing)
│
├── package.json            # Node.js dependencies
└── README.md               # This file
```

---

## 🚀 Quick Start (Step-by-Step)

### Prerequisites
- **Node.js** v14 or higher → [Download here](https://nodejs.org)
- **npm** (comes with Node.js)

### Step 1 — Install Dependencies
```bash
# Navigate to project root
cd cafemanager

# Install Node.js packages
npm install
```

### Step 2 — Start the Server
```bash
# Option A: Production mode
npm start

# Option B: Development mode (auto-restart on file changes)
npm run dev
```

You should see:
```
╔════════════════════════════════════════╗
║       ☕  CaféManager Server           ║
╠════════════════════════════════════════╣
║  🚀 Running on: http://localhost:3000  ║
║  📁 Database:   backend/database.json  ║
║  🌐 Frontend:   http://localhost:3000  ║
╚════════════════════════════════════════╝
```

### Step 3 — Open the App
Open your browser and go to:
```
http://localhost:3000
```

That's it! 🎉

---

## 🌐 API Reference

### Base URL: `http://localhost:3000/api`

---

### Health Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health check |

---

### Ingredients

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ingredients` | Get all ingredients |
| GET | `/api/ingredients/:id` | Get single ingredient |
| POST | `/api/ingredients` | Add new ingredient |
| PUT | `/api/ingredients/:id` | Update ingredient |
| DELETE | `/api/ingredients/:id` | Delete ingredient |

**POST/PUT Body:**
```json
{
  "name": "Whole Milk",
  "stock": 5000,
  "unit": "ml",
  "threshold": 500
}
```

---

### Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | Get all products |
| GET | `/api/products/:id` | Get single product |
| POST | `/api/products` | Add new product |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |

**POST/PUT Body:**
```json
{
  "name": "Caramel Latte",
  "price": 5.00,
  "description": "Espresso with caramel syrup",
  "emoji": "🥤",
  "recipe": [
    { "ingredientId": 1, "amount": 200 },
    { "ingredientId": 2, "amount": 18 },
    { "ingredientId": 4, "amount": 30 }
  ]
}
```

---

### Sales

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sales` | Get all sales |
| GET | `/api/sales/today` | Get today's sales + revenue |
| POST | `/api/sell` | Process a sale (auto-deducts stock) |
| GET | `/api/summary` | Get dashboard summary stats |

**POST /api/sell Body:**
```json
{
  "productId": 3,
  "quantity": 2
}
```

**POST /api/sell Response:**
```json
{
  "success": true,
  "message": "Successfully sold 2x Caramel Latte",
  "sale": {
    "product": "Caramel Latte",
    "quantity": 2,
    "unitPrice": 5.00,
    "totalPrice": 10.00
  },
  "newSales": [...],
  "updatedIngredients": [...],
  "allSales": [...],
  "lowStockAlerts": [...]
}
```

---

## 💾 Database Structure (database.json)

The database is a simple JSON file at `backend/database.json`:

```json
{
  "ingredients": [
    {
      "id": 1,
      "name": "Whole Milk",
      "stock": 5000,
      "unit": "ml",
      "threshold": 500,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "products": [
    {
      "id": 1,
      "name": "Cappuccino",
      "price": 4.00,
      "description": "Classic Italian espresso drink",
      "emoji": "☕",
      "recipe": [
        { "ingredientId": 1, "amount": 150 },
        { "ingredientId": 2, "amount": 18 }
      ],
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "sales": [
    {
      "id": 1,
      "productId": 1,
      "productName": "Cappuccino",
      "price": 4.00,
      "quantity": 1,
      "timestamp": "2024-01-15T09:30:00.000Z"
    }
  ],
  "meta": {
    "lastIngredientId": 8,
    "lastProductId": 6,
    "lastSaleId": 0,
    "version": "1.0.0"
  }
}
```

---

## ✨ Features

### Dashboard
- Real-time stats: revenue, orders, products, alerts
- Low stock warning panel (highlighted in red)
- Ingredients overview with visual stock bars
- Quick sell buttons for fast sales
- Today's sales log

### Ingredients Management
- Add / Edit / Delete ingredients
- Set units: ml, g, kg, L, pcs, tbsp, tsp, oz
- Set low-stock threshold (alert when below)
- Search/filter by name
- Visual stock progress bars

### Products Management
- Add / Edit / Delete products
- Set price and description
- Add custom emoji icon
- Recipe builder: select ingredients + amounts
- Shows full recipe on product card

### Sales System
- Click-to-sell product grid
- Quantity selector (1–99)
- Real-time total price calculation
- Auto stock deduction based on recipe
- Insufficient stock detection (blocks sale)
- Today's sales log with running total

### Reports & Analytics
- Today's revenue and order count
- All-time sales count
- Top selling products today
- Ingredient consumption tracking
- Full daily sales history

### Alerts
- Auto low-stock detection
- Toast notifications for every action
- Visual warnings on dashboard and ingredients page
- API connectivity indicator

---

## 🔧 Troubleshooting

### "Cannot connect to server" / API Status is red
- Make sure you ran `npm install` first
- Make sure the server is running with `npm start`
- Check that port 3000 is not in use by another app

### Port already in use
```bash
# Change the port
PORT=4000 npm start

# Then update API_BASE in frontend/app.js:
const API_BASE = 'http://localhost:4000/api';
```

### Database issues
- Delete `backend/database.json` — it will be recreated with sample data
- Or manually edit the JSON file (make sure it's valid JSON)

### Nodemon not found
```bash
npm install -g nodemon
# then run:
nodemon backend/server.js
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js + Express.js |
| Database | JSON file (via Node.js `fs` module) |
| Styling | Custom CSS (no frameworks) |
| HTTP Client | Browser Fetch API |

---

## 📄 License

MIT License — Free to use and modify.

---

*Built with ☕ and ❤️ — CaféManager v1.0.0*
