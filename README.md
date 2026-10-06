# Prices_compared_extension (PricePulse)

> Real-Time Product Price History, Price Drop Detection & Target Price Alert Platform.

PricePulse is a dual-engine full-stack platform consisting of a **Manifest V3 Chrome Extension** and a **Node.js Express REST API** designed to observe product prices on ecommerce product pages, normalize multi-currency formats, detect in-place price drops via DOM mutation observation, and maintain historical price observations without redundant duplicates.

---

## ⚡ Architecture Overview

```
                         USER
                           │
                    Chrome Browser
                           │
                           ▼
                 ┌───────────────────┐
                 │ Chrome Extension  │
                 │                   │
                 │ Popup UI          │
                 │ Content Script    │
                 │ Service Worker    │
                 └─────────┬─────────┘
                           │
                           │ HTTPS / REST
                           ▼
                 ┌───────────────────┐
                 │ Node.js Express   │
                 │                   │
                 │ Auth & Security   │
                 │ Product Catalog   │
                 │ Price History     │
                 │ Validation        │
                 └─────────┬─────────┘
                           │
                           ▼
                 ┌───────────────────┐
                 │      MongoDB      │
                 │                   │
                 │ Products          │
                 │ PriceHistory      │
                 │ Watchlists        │
                 │ Alerts            │
                 └───────────────────┘
```

---

## 🚀 Key Features

- **Manifest V3 Chrome Extension:** Built strictly with MV3 event-driven architecture, ephemeral service workers, and minimal permission scoping (`storage`, `activeTab`).
- **Strategy Pattern Extractor Adapters:** Decoupled `BaseExtractor` with dedicated adapters for **Amazon**, **Flipkart**, and deterministic **Local Testing**.
- **Resilient Real-Time DOM Observer:** Scoped `MutationObserver` watching minimal DOM subtrees with 250ms debouncing and SPA node-swapping recovery.
- **Robust Multi-Currency Price Parser:** Normalizes raw price strings across Indian Lakh (`₹ 1,49,990.00`), US Dollar (`$299.99`), and European comma notation (`49,99 €`).
- **Data Consistency Rule:** Strict duplicate suppression—only logs new time-series entries when a meaningful price change occurs.
- **Layered Express REST API:** Helmet security headers, rate limiting (200 req / 15 min), input validation middleware, and centralized error handling conforming to `{ success: false, error: { code, message } }`.

---

## 📂 Project Structure

```
├── extension/                     # Chrome Extension (Manifest V3)
│   ├── manifest.json              # Extension manifest & permissions
│   ├── popup/                     # Popup UI (HTML, CSS, JS)
│   ├── background/
│   │   └── serviceWorker.js       # Background event router & badge coordinator
│   ├── content/
│   │   ├── priceDetector.js       # PriceDetectorEngine (DOM MutationObserver)
│   │   ├── priceParser.js         # Multi-currency regex parser & normalizer
│   │   ├── productExtractor.js    # Adapter facade
│   │   └── siteDetector.js        # Dynamic adapter registry
│   ├── adapters/                  # Strategy Pattern adapters
│   │   ├── baseExtractor.js       # Abstract BaseExtractor class
│   │   ├── amazonExtractor.js     # Amazon ASIN & price extractor
│   │   ├── flipkartExtractor.js   # Flipkart PID & price extractor
│   │   └── localTestExtractor.js  # Local test harness adapter
│   ├── utils/
│   │   ├── api.js                 # Backend sync client
│   │   └── storage.js             # Async storage wrapper
│   └── icons/                     # Extension icons (16, 48, 128)
│
├── backend/                       # Node.js Express REST API
│   ├── config/
│   │   └── db.js                  # Mongoose connection manager
│   ├── models/
│   │   ├── Product.js             # Product catalog schema with compound unique index
│   │   └── PriceHistory.js        # Time-series price observation schema
│   ├── controllers/
│   │   ├── productController.js   # Product endpoints & statistics
│   │   └── priceController.js     # Observation ingestion & history queries
│   ├── routes/
│   │   ├── productRoutes.js       # /api/products
│   │   └── priceRoutes.js         # /api/prices
│   ├── middleware/
│   │   ├── validate.js            # Input validation middleware
│   │   └── errorHandler.js        # Centralized error handler
│   ├── services/
│   │   ├── productService.js      # Business logic & statistical calculations
│   │   └── priceService.js        # Data Consistency Rule & deduplication
│   ├── app.js                     # Express application factory
│   └── server.js                  # HTTP listener & process lifecycle
│
├── test/
│   ├── product.html               # Deterministic local test storefront
│   ├── serve.js                   # Test page HTTP server
│   └── unit/
│       ├── extractor.test.js      # Adapter unit tests (4/4 passed)
│       ├── priceParser.test.js    # Price parser unit tests (20/20 passed)
│       ├── realtimeObserver.test.js# Duplicate suppression tests (4/4 passed)
│       └── api.test.js            # Backend API integration tests (7/7 passed)
│
├── .gitignore
└── README.md
```

---

## 🧪 Automated Test Suite (35/35 Passed)

Run all unit and integration test suites:
```bash
node test/unit/extractor.test.js
node test/unit/priceParser.test.js
node test/unit/realtimeObserver.test.js
node test/unit/api.test.js
```

---

## 🛠️ Local Development Setup

### 1. Load Chrome Extension
1. Open Google Chrome & go to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the `extension/` directory.

### 2. Start the Local Deterministic Test Storefront
```bash
node test/serve.js
# Visit http://localhost:3000/product.html
```

### 3. Start Backend REST API
```bash
cd backend
npm install
npm start
# Server listens on http://localhost:5000
```
"# Prices_compared_extension" 
"# Prices_compared_extension" 
"# Prices_compared_extension" 
"# Prices_compared_extension" 
"# Prices_compared_extension" 
"# Prices_compared_extension" 
