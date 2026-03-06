# StockSense - Financial Data Dashboard Design

## Overview

A single-page financial dashboard with real-time stock data visualization, portfolio tracking, and technical analysis charts. Built as a React 19 + Vite 6 SPA to demonstrate SPA architecture (vs SSR), custom D3.js charting, and a Hono backend proxying the Yahoo Finance API.

**Location:** `C:\inetpub\wwwroot\vite\stocksense`

## Architecture

```
Browser (Vite SPA)
  React 19 + TanStack Router + Zustand
  D3.js candlestick + Recharts secondary charts
  TanStack Query for server state
       |                |
       | REST            | WebSocket
       v                v
Hono API (Cloud Run)
  /api/stocks/*    - proxy Yahoo Finance
  /api/portfolio/* - CRUD holdings
  /api/watchlist/* - CRUD watchlists
  /ws              - price streaming (hybrid polling)
  Drizzle ORM -> PostgreSQL (Neon)
       |                |
       v                v
  Neon PostgreSQL    Yahoo Finance API
  (holdings,         v8/finance/chart
   watchlists,       (500ms rate limit)
   transactions)
```

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | React 19 + Vite 6 + TypeScript |
| Routing | TanStack Router v1 |
| Server State | TanStack Query v5 |
| Client State | Zustand |
| Forms | React Hook Form + Zod |
| Charts | D3.js (candlestick, heatmap) + Recharts (secondary) |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Backend | Hono (Node.js) |
| ORM | Drizzle ORM |
| Database | PostgreSQL (Neon) |
| WebSocket | Hono WebSocket adapter |
| Data Source | Yahoo Finance v8 Chart API |
| Testing | Vitest (unit) |
| Deploy | Firebase Hosting + Cloud Run + Neon |

## Yahoo Finance Integration

Ported from the Rust implementation in `flutter/rusty_bridge_trading/trading_core/rust/src/data/yahoo.rs`.

### Endpoints proxied through Hono

- `GET /api/stocks/chart/:symbol` - Historical OHLCV (period1, period2, interval params)
- `GET /api/stocks/quote/:symbol` - Current price/change/volume
- `GET /api/stocks/search?q=` - Ticker/name autocomplete

### Hybrid Real-Time Strategy

- Client opens WebSocket on stock detail page, sends `{ subscribe: "AAPL" }`
- Server polls Yahoo every 15s for subscribed symbols, pushes deltas
- On navigate away, client sends `{ unsubscribe: "AAPL" }`
- Market overview uses REST + TanStack Query with 60s stale time

### Rate Limiting

- 500ms minimum between Yahoo requests server-side
- Request queue with priority (subscribed stocks > on-demand)
- In-memory cache (Map with TTL) to avoid duplicate fetches

## Database Schema (Drizzle/PostgreSQL)

```
portfolios: id, name, created_at
holdings: id, portfolio_id, symbol, shares, buy_price, buy_date
transactions: id, portfolio_id, symbol, type(buy/sell), shares, price, date
watchlists: id, name, created_at
watchlist_items: id, watchlist_id, symbol, added_at
price_alerts: id, symbol, target_price, direction(above/below), triggered
```

No user auth - single-user portfolio app.

## D3.js Candlestick Chart (Hero Component)

### Core Features
- OHLCV candlestick rendering with green/red bodies
- Volume bars as sub-chart below (shared x-axis)
- Zoom/pan via d3-zoom (mouse wheel + drag)
- Crosshair with tooltip showing date, O, H, L, C, V
- Time range buttons (1D, 5D, 1M, 3M, 6M, 1Y, 5Y, MAX)
- Smooth transitions on data updates (d3-transition)
- Responsive resize via ResizeObserver

### Technical Indicator Overlays (Togglable)
- SMA/EMA - line overlays on price chart
- Bollinger Bands - shaded band overlay
- RSI - separate sub-chart (0-100 scale, overbought/oversold zones)
- MACD - separate sub-chart (signal line, histogram)

Indicator math computed client-side in `lib/indicators.ts` (pure functions).

### Other Charts
- Market heatmap - D3 treemap (second custom D3 component)
- Portfolio donut - Recharts PieChart
- Sector performance - Recharts BarChart
- Performance vs benchmark - Recharts LineChart

## Pages / Routes

| Route | Page | Key Components |
|-------|------|----------------|
| `/` | Market Overview | Indices cards, TopMovers, SectorPerformance, MarketHeatmap |
| `/stock/:ticker` | Stock Detail | CandlestickChart, TechnicalIndicators, CompanyInfo |
| `/portfolio` | Portfolio Tracker | PortfolioSummary, HoldingsList, AddHoldingForm, PortfolioDonut, PerformanceLine |
| `/watchlist` | Watchlists | WatchlistTabs, StockTable (sortable), PriceAlerts |
| `/screener` | Stock Screener | FilterForm, ResultsTable |

## Styling

Dark-first financial terminal aesthetic:
- Dark background (#0a0a0f range) with subtle card borders
- Green/red for gain/loss throughout
- Monospace numbers for prices (tabular-nums)
- Glowing accents on interactive elements
- shadcn/ui components with Tailwind CSS 4

## Deployment

- **SPA:** Firebase Hosting (static files)
- **API:** Google Cloud Run (Hono Docker container)
- **Database:** Neon PostgreSQL (free tier)
- **Firebase project:** TBD (will create during setup)

## Project Structure

```
stocksense/
├── src/
│   ├── components/
│   │   ├── charts/
│   │   │   ├── CandlestickChart.tsx
│   │   │   ├── HeatmapChart.tsx
│   │   │   ├── PortfolioDonut.tsx
│   │   │   ├── PerformanceLine.tsx
│   │   │   └── VolumeChart.tsx
│   │   ├── market/
│   │   │   ├── MarketOverview.tsx
│   │   │   ├── StockCard.tsx
│   │   │   ├── TopMovers.tsx
│   │   │   └── SectorPerformance.tsx
│   │   ├── portfolio/
│   │   │   ├── PortfolioSummary.tsx
│   │   │   ├── HoldingsList.tsx
│   │   │   └── AddHolding.tsx
│   │   ├── stock/
│   │   │   ├── StockDetail.tsx
│   │   │   ├── TechnicalIndicators.tsx
│   │   │   └── CompanyInfo.tsx
│   │   └── ui/
│   ├── hooks/
│   │   ├── useStockPrice.ts
│   │   ├── usePortfolio.ts
│   │   └── useWatchlist.ts
│   ├── lib/
│   │   ├── api.ts
│   │   ├── d3-utils.ts
│   │   ├── indicators.ts
│   │   └── format.ts
│   ├── stores/
│   │   ├── portfolio-store.ts
│   │   └── preferences-store.ts
│   ├── routes/
│   │   ├── __root.tsx
│   │   ├── index.tsx
│   │   ├── stock.$ticker.tsx
│   │   ├── portfolio.tsx
│   │   ├── watchlist.tsx
│   │   └── screener.tsx
│   ├── App.tsx
│   └── main.tsx
├── server/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── stocks.ts
│   │   │   ├── portfolio.ts
│   │   │   └── watchlist.ts
│   │   ├── db/
│   │   │   ├── schema.ts
│   │   │   └── migrations/
│   │   ├── services/
│   │   │   ├── yahoo-finance.ts
│   │   │   └── websocket.ts
│   │   └── index.ts
│   └── package.json
├── docs/plans/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── Dockerfile
├── docker-compose.yml
└── firebase.json
```
