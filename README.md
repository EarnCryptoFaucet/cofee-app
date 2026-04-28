# ☕ BrewTrack — Coffee Shop Inventory & Sales Management System

A production-ready MVP for managing coffee shop inventory, recipes, and sales with automatic stock deduction, smart alerts, and business analytics.

---

## 🚀 Features

- **📦 Inventory Management** — Track ingredients with quantities, units, and low-stock thresholds
- **☕ Product & Recipe Management** — Define menu items with exact ingredient recipes
- **💰 One-Click Sales** — Sell products with automatic stock deduction based on recipes
- **⚠️ Smart Alerts** — Real-time warnings when stock falls below threshold
- **📊 Analytics Dashboard** — Revenue trends, top products, daily summaries
- **💬 Feedback System** — Connected to Supabase for collecting user feedback
- **🌐 Landing Page** — Professional SaaS-style landing page

---

## 📁 Project Structure

```
brewtrack/
├── frontend/
│   ├── index.html       # Main UI (Landing + App)
│   ├── style.css        # All styles
│   └── app.js           # Frontend JavaScript
├── server.js            # Express server
├── routes.js            # All API routes
├── db.js                # JSON database utility
├── database.json        # Data storage
├── package.json
├── .gitignore
└── README.md
```

---

## ⚙️ Local Setup

### Prerequisites
- Node.js 18+ installed
- npm installed

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/yourusername/brewtrack.git
cd brewtrack

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Open in browser
# http://localhost:3000
```

**Note:** The app serves the frontend from the `/frontend` folder automatically via Express.

---

## 🌐 API Endpoints

### Ingredients
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ingredients` | Get all ingredients |
| POST | `/api/ingredients` | Add new ingredient |
| PUT | `/api/ingredients/:id` | Update ingredient |
| DELETE | `/api/ingredients/:id` | Delete ingredient |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | Get all products (with recipes) |
| POST | `/api/products` | Add new product |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |

### Sales
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sales` | Get all sales + summary |
| POST | `/api/sell` | Process a sale |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/feedback` | Submit feedback (→ Supabase) |
| GET | `/api/analytics` | Get analytics data |
| GET | `/health` | Health check |

---

## 🚂 Deploy to Railway

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit: BrewTrack MVP"
git branch -M main
git remote add origin https://github.com/yourusername/brewtrack.git
git push -u origin main
```

### Step 2: Deploy on Railway
1. Go to [railway.app](https://railway.app) and sign in
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your `brewtrack` repository
4. Railway will auto-detect Node.js and deploy

### Step 3: Configure Environment Variables (optional)
In Railway dashboard → Variables:
```
SUPABASE_URL=https://gvtdvnqvxordraztxkwx.supabase.co
SUPABASE_KEY=your_supabase_key
NODE_ENV=production
```

Railway automatically sets `PORT` — no need to configure it.

---

## 🔗 Supabase Setup (Feedback)

1. Go to [supabase.com](https://supabase.com) and create a project
2. Create a table named `feedback` with columns:
   - `id` (int8, primary key, auto-increment)
   - `name` (text, nullable)
   - `message` (text, not null)
   - `created_at` (timestamptz)
3. Copy your project URL and anon key to environment variables

---

## 🏗️ Business Logic

When a sale is processed (`POST /api/sell`):
1. Find the product by ID
2. Load its recipe (list of ingredient + quantity pairs)
3. Check if all required ingredients have sufficient stock
4. If insufficient → return error with details (no stock deducted)
5. If sufficient → deduct each ingredient's stock
6. Record the sale with timestamp
7. Return updated state + any low-stock alerts

---

## 🛡️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JS |
| Backend | Node.js + Express |
| Database | JSON file storage |
| Feedback | Supabase REST API |
| Deployment | Railway |

---

## 📝 License

MIT © 2025 BrewTrack
