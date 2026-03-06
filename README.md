# StockSense — Financial Data Dashboard

A real-time financial data dashboard built as a single-page application with interactive D3.js charts, technical analysis indicators, and live market data from Yahoo Finance.

**Live:** [stocksense-bg7.web.app](https://stocksense-bg7.web.app)

![React](https://img.shields.io/badge/React_19-61DAFB?style=flat&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite_7-646CFF?style=flat&logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![D3.js](https://img.shields.io/badge/D3.js-F9A03C?style=flat&logo=d3.js&logoColor=black)
![Hono](https://img.shields.io/badge/Hono-E36002?style=flat&logo=hono&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=flat&logo=tailwindcss&logoColor=white)

---

## Features

### Market Overview
- **Market Heatmap** — D3.js treemap visualization of 30 major stocks across 7 sectors. Tiles are colored by daily % change (green/red gradient) and sized by configurable metric: Market Cap, Price, Volume, Dollar Volume, or % Change. Hover tooltips show detailed info even for small tiles.
- **Top Movers** — Gainers, losers, and most active stocks with live prices.
- **Sector Performance** — Horizontal bar chart (Recharts) showing sector-level daily performance.
- **Index Cards** — S&P 500, NASDAQ, and DOW Jones with live quotes.

### Stock Detail View
- **Interactive Candlestick Chart** — Custom D3.js chart with:
  - Mouse wheel zoom and drag pan
  - Zoom dynamically rescales axes, adjusts candle widths, and updates all overlays
  - Volume bars in a sub-chart below price
  - Crosshair with OHLCV tooltip on hover
  - Gap-free rendering for intraday data (no off-hours/weekend gaps)
- **Time Range Selectors** — 1D, 5D, 1M, 3M, 6M, 1Y, 5Y, MAX
- **Technical Indicators** — Toggle overlay indicators on/off:
  - **SMA(20)** and **EMA(20)** moving average lines
  - **Bollinger Bands(20,2)** with shaded area
  - **RSI(14)** — Separate chart with overbought/oversold zones (70/30)
  - **MACD(12,26,9)** — Separate chart with histogram, MACD line, and signal line
- **Synced Sub-Charts** — RSI and MACD charts stay synchronized with the main chart's zoom level
- **Company Info** — Market cap, P/E ratio, 52-week range, dividend yield, and more
- **Real-Time Updates** — WebSocket-based price streaming with 15-second polling

### Watchlists
- Create and manage multiple named watchlists
- Add stocks via search, remove with one click
- Live price table with color-coded change indicators
- **Price Alerts** — Set above/below price thresholds, persisted in the database

### Stock Screener
- Filter stocks by market cap range, price range, and volume
- Results table with sortable columns

### Search
- Global stock search with autocomplete powered by Yahoo Finance search API
- Click any result to navigate to its detail view

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, TypeScript |
| Charts | D3.js (candlestick, heatmap, RSI, MACD), Recharts (sector bars) |
| Data Fetching | TanStack Query v5 (caching, polling, deduplication) |
| Routing | TanStack Router (type-safe, file-based) |
| State | Zustand (indicator preferences) |
| Forms | React Hook Form + Zod |
| Styling | Tailwind CSS v4, Radix UI primitives |
| Backend | Hono (Node.js) |
| Database | Neon PostgreSQL (serverless) via Drizzle ORM |
| Data Source | Yahoo Finance v8 API (chart, quote, spark, search) |
| Caching | Persistent file-based cache with stale-while-revalidate |
| WebSocket | Hono WebSocket for real-time price streaming |
| Hosting | Firebase Hosting (frontend) + Cloud Run (API) |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Firebase Hosting                    │
│              (static SPA, /api/** rewrite)           │
└───────────────────────┬─────────────────────────────┘
                        │ /api/**
                        ▼
┌─────────────────────────────────────────────────────┐
│                Cloud Run (Hono API)                  │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Stocks   │  │  Watchlists  │  │  WebSocket    │  │
│  │  Routes   │  │  + Alerts    │  │  Price Stream │  │
│  └─────┬─────┘  └──────┬───────┘  └───────────────┘  │
│        │               │                              │
│  ┌─────▼──────────┐  ┌─▼──────────────┐              │
│  │ Yahoo Finance  │  │  Neon Postgres  │              │
│  │ + Rate Limiter │  │  (Drizzle ORM)  │              │
│  │ + File Cache   │  │                 │              │
│  └────────────────┘  └─────────────────┘              │
└─────────────────────────────────────────────────────┘
```

**Caching Strategy:** The API uses a persistent file-based cache with a stale-while-revalidate pattern. Cached data is returned immediately while fresh data is fetched in the background. The dashboard loads instantly on repeat visits and survives server restarts — stale data is always better than no data.

**Gap-Free Charts:** Intraday stock data has gaps during off-hours and weekends. Instead of a time-based D3 scale (which would show empty space), charts use an index-based linear scale that maps each bar to a sequential position, eliminating visual gaps.

---

## Local Development

### Prerequisites
- Node.js 20+
- A PostgreSQL database (e.g., [Neon](https://neon.tech) free tier)

### Setup

```bash
# Clone
git clone https://github.com/briang7/stocksense.git
cd stocksense

# Frontend
npm install

# Backend
cd server
npm install
cp .env.example .env  # Add your DATABASE_URL
npx drizzle-kit push   # Create database tables
npm run dev             # Starts on :3001

# In another terminal — Frontend
cd ..
npm run dev             # Starts on :5173
```

### Environment Variables

Create `server/.env`:
```
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require
PORT=3001
```

---

## Project Structure

```
stocksense/
├── src/
│   ├── components/
│   │   ├── charts/
│   │   │   ├── CandlestickChart.tsx     # D3 zoomable candlestick + volume
│   │   │   ├── HeatmapChart.tsx         # D3 treemap with tooltips + size options
│   │   │   └── IndicatorPanel.tsx       # RSI + MACD synced sub-charts
│   │   ├── market/                      # Index cards, top movers, sectors
│   │   ├── stock/                       # Stock header, company info, indicators
│   │   ├── watchlist/                   # Tabs, stock table, price alerts
│   │   ├── screener/                    # Filter form, results table
│   │   └── layout/                      # Navbar, search bar
│   ├── hooks/                           # TanStack Query + WebSocket hooks
│   ├── lib/
│   │   ├── api.ts                       # API client + TypeScript types
│   │   ├── indicators.ts               # SMA, EMA, Bollinger, RSI, MACD math
│   │   └── format.ts                   # Price, volume, date formatters
│   ├── stores/                          # Zustand preferences store
│   └── routes/                          # TanStack Router (file-based)
├── server/
│   ├── src/
│   │   ├── routes/                      # Stocks + watchlist API routes
│   │   ├── db/                          # Drizzle schema + seed
│   │   └── services/
│   │       ├── yahoo-finance.ts         # Yahoo Finance v8 integration
│   │       ├── cache.ts                 # Persistent stale-while-revalidate cache
│   │       ├── rate-limiter.ts          # 500ms rate limiter
│   │       └── websocket.ts            # Price stream manager
│   └── Dockerfile                       # Cloud Run container
├── firebase.json                        # Hosting config + Cloud Run rewrite
└── package.json
```

---

## Deployment

**Frontend** deploys to Firebase Hosting, **API** deploys to Google Cloud Run.

```bash
# Build + deploy frontend
npm run build
firebase deploy --only hosting

# Build + deploy API
cd server
npm run build
gcloud run deploy stocksense-api \
  --source=. \
  --project=stocksense-bg7 \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-env-vars="DATABASE_URL=..." \
  --port=3001
```

Firebase Hosting rewrites `/api/**` to the Cloud Run service, so the frontend makes API calls to its own domain with no CORS issues.
