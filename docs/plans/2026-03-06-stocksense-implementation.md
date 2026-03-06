# StockSense Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a financial data dashboard SPA with real-time stock data from Yahoo Finance, D3.js candlestick charts, portfolio tracking, and watchlists.

**Architecture:** React 19 + Vite 6 SPA frontend with TanStack Router/Query, Zustand state, and D3.js/Recharts charts. Hono backend proxies Yahoo Finance API, manages portfolio/watchlist data in PostgreSQL via Drizzle ORM, and streams prices over WebSocket. Deployed to Firebase Hosting (SPA) + Cloud Run (API) + Neon (PostgreSQL).

**Tech Stack:** React 19, Vite 6, TypeScript, TanStack Router v1, TanStack Query v5, Zustand, D3.js, Recharts, shadcn/ui, Tailwind CSS 4, Hono 4, Drizzle ORM, PostgreSQL (Neon), @hono/node-ws, Vitest

**Location:** `C:\inetpub\wwwroot\vite\stocksense`

**Reference:** Yahoo Finance API patterns ported from `C:\inetpub\wwwroot\flutter\rusty_bridge_trading\trading_core\rust\src\data\yahoo.rs`

---

## Phase 1: Project Scaffolding & Backend Foundation

### Task 1: Initialize Vite + React 19 Project

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/vite-env.d.ts`

**Step 1: Scaffold project with Vite**

```bash
cd C:/inetpub/wwwroot/vite
npm create vite@latest stocksense -- --template react-ts
cd stocksense
```

**Step 2: Install core frontend dependencies**

```bash
npm install @tanstack/react-router @tanstack/router-plugin @tanstack/react-query zustand react-hook-form @hookform/resolvers zod d3 recharts
npm install -D @types/d3 @tanstack/router-devtools @tanstack/react-query-devtools
```

**Step 3: Install Tailwind CSS 4 + shadcn/ui**

```bash
npm install tailwindcss @tailwindcss/vite
npx shadcn@latest init
```

When prompted for shadcn init:
- Style: New York
- Base color: Zinc
- CSS variables: Yes

**Step 4: Configure vite.config.ts with TanStack Router plugin**

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

export default defineConfig({
  plugins: [
    tanstackRouter({ target: 'react' }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/api': 'http://localhost:3001',
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
      },
    },
  },
})
```

**Step 5: Verify dev server starts**

```bash
npm run dev
```
Expected: Vite dev server running on http://localhost:5174

**Step 6: Commit**

```bash
git init
git add -A
git commit -m "feat: scaffold Vite + React 19 + Tailwind CSS 4 + TanStack Router project"
```

---

### Task 2: Initialize Hono Backend

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/src/index.ts`

**Step 1: Initialize server package**

```bash
mkdir -p server/src
cd server
npm init -y
npm install hono @hono/node-server @hono/node-ws drizzle-orm @neondatabase/serverless dotenv
npm install -D typescript @types/node tsx drizzle-kit
cd ..
```

**Step 2: Create server/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

**Step 3: Create minimal Hono server**

```typescript
// server/src/index.ts
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

const app = new Hono()

app.use('*', logger())
app.use('/api/*', cors())

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

const port = parseInt(process.env.PORT || '3001')

console.log(`Hono server starting on port ${port}`)

serve({ fetch: app.fetch, port })
```

**Step 4: Add server scripts to server/package.json**

Add to `server/package.json`:
```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

**Step 5: Test server starts**

```bash
cd server && npm run dev
```
Expected: "Hono server starting on port 3001"

Test: `curl http://localhost:3001/api/health`
Expected: `{"status":"ok","timestamp":"..."}`

**Step 6: Commit**

```bash
git add server/
git commit -m "feat: initialize Hono backend with health endpoint"
```

---

### Task 3: Database Schema with Drizzle ORM

**Files:**
- Create: `server/src/db/schema.ts`
- Create: `server/src/db/index.ts`
- Create: `server/drizzle.config.ts`
- Create: `server/.env.example`

**Step 1: Create Drizzle schema**

```typescript
// server/src/db/schema.ts
import { pgTable, serial, text, real, integer, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core'

export const transactionTypeEnum = pgEnum('transaction_type', ['buy', 'sell'])
export const alertDirectionEnum = pgEnum('alert_direction', ['above', 'below'])

export const portfolios = pgTable('portfolios', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const holdings = pgTable('holdings', {
  id: serial('id').primaryKey(),
  portfolioId: integer('portfolio_id').references(() => portfolios.id, { onDelete: 'cascade' }).notNull(),
  symbol: text('symbol').notNull(),
  shares: real('shares').notNull(),
  buyPrice: real('buy_price').notNull(),
  buyDate: timestamp('buy_date').notNull(),
})

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  portfolioId: integer('portfolio_id').references(() => portfolios.id, { onDelete: 'cascade' }).notNull(),
  symbol: text('symbol').notNull(),
  type: transactionTypeEnum('type').notNull(),
  shares: real('shares').notNull(),
  price: real('price').notNull(),
  date: timestamp('date').notNull(),
})

export const watchlists = pgTable('watchlists', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const watchlistItems = pgTable('watchlist_items', {
  id: serial('id').primaryKey(),
  watchlistId: integer('watchlist_id').references(() => watchlists.id, { onDelete: 'cascade' }).notNull(),
  symbol: text('symbol').notNull(),
  addedAt: timestamp('added_at').defaultNow().notNull(),
})

export const priceAlerts = pgTable('price_alerts', {
  id: serial('id').primaryKey(),
  symbol: text('symbol').notNull(),
  targetPrice: real('target_price').notNull(),
  direction: alertDirectionEnum('direction').notNull(),
  triggered: boolean('triggered').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

**Step 2: Create database connection**

```typescript
// server/src/db/index.ts
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema.js'

const sql = neon(process.env.DATABASE_URL!)

export const db = drizzle(sql, { schema })
export type Database = typeof db
```

**Step 3: Create drizzle.config.ts**

```typescript
// server/drizzle.config.ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

**Step 4: Create .env.example**

```
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/stocksense?sslmode=require
PORT=3001
```

**Step 5: Generate initial migration**

```bash
cd server
npx drizzle-kit generate
```
Expected: Migration files created in `server/drizzle/`

**Step 6: Commit**

```bash
git add server/src/db/ server/drizzle.config.ts server/drizzle/ server/.env.example
git commit -m "feat: add Drizzle ORM schema for portfolios, watchlists, alerts"
```

---

### Task 4: Yahoo Finance Service

**Files:**
- Create: `server/src/services/yahoo-finance.ts`
- Create: `server/src/services/rate-limiter.ts`
- Test: `server/src/services/__tests__/yahoo-finance.test.ts`

**Step 1: Create rate limiter**

```typescript
// server/src/services/rate-limiter.ts

interface QueueItem {
  execute: () => Promise<unknown>
  resolve: (value: unknown) => void
  reject: (error: unknown) => void
  priority: number
}

export class RateLimiter {
  private queue: QueueItem[] = []
  private lastRequestTime = 0
  private processing = false

  constructor(private minIntervalMs: number = 500) {}

  async enqueue<T>(fn: () => Promise<T>, priority = 0): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        execute: fn as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
        priority,
      })
      this.queue.sort((a, b) => b.priority - a.priority)
      this.processQueue()
    })
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return
    this.processing = true

    while (this.queue.length > 0) {
      const now = Date.now()
      const elapsed = now - this.lastRequestTime
      if (elapsed < this.minIntervalMs) {
        await new Promise((r) => setTimeout(r, this.minIntervalMs - elapsed))
      }

      const item = this.queue.shift()!
      this.lastRequestTime = Date.now()

      try {
        const result = await item.execute()
        item.resolve(result)
      } catch (error) {
        item.reject(error)
      }
    }

    this.processing = false
  }
}
```

**Step 2: Create Yahoo Finance service (ported from Rust)**

```typescript
// server/src/services/yahoo-finance.ts

import { RateLimiter } from './rate-limiter.js'

export interface OhlcvBar {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface StockQuote {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  marketCap: number
  name: string
  exchange: string
}

export interface SearchResult {
  symbol: string
  name: string
  exchange: string
  type: string
}

interface ChartResponse {
  chart: {
    result: Array<{
      timestamp: number[]
      indicators: {
        quote: Array<{
          open: (number | null)[]
          high: (number | null)[]
          low: (number | null)[]
          close: (number | null)[]
          volume: (number | null)[]
        }>
      }
      meta: {
        regularMarketPrice: number
        previousClose: number
        symbol: string
        shortName?: string
        exchangeName: string
        marketCap?: number
        regularMarketVolume?: number
      }
    }> | null
    error: { code: string; description: string } | null
  }
}

interface SearchResponse {
  quotes: Array<{
    symbol: string
    shortname: string
    exchange: string
    quoteType: string
  }>
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

// In-memory cache with TTL
const cache = new Map<string, { data: unknown; expires: number }>()

function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry || Date.now() > entry.expires) {
    cache.delete(key)
    return null
  }
  return entry.data as T
}

function setCache(key: string, data: unknown, ttlMs: number): void {
  cache.set(key, { data, expires: Date.now() + ttlMs })
}

const rateLimiter = new RateLimiter(500)

export type Interval = '1m' | '5m' | '15m' | '30m' | '1h' | '1d' | '1wk' | '1mo'

export async function fetchChart(
  symbol: string,
  interval: Interval = '1d',
  period1?: number,
  period2?: number
): Promise<{ bars: OhlcvBar[]; quote: StockQuote }> {
  const cacheKey = `chart:${symbol}:${interval}:${period1}:${period2}`
  const cached = getCached<{ bars: OhlcvBar[]; quote: StockQuote }>(cacheKey)
  if (cached) return cached

  return rateLimiter.enqueue(async () => {
    const params = new URLSearchParams({
      interval,
      events: 'history',
    })

    if (period1) params.set('period1', String(Math.floor(period1 / 1000)))
    if (period2) params.set('period2', String(Math.floor(period2 / 1000)))
    if (!period1 && !period2) {
      // Default: 1 year of daily data
      params.set('range', interval === '1d' ? '1y' : interval === '1wk' ? '5y' : '1mo' === interval ? 'max' : '5d')
    }

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${params}`

    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    })

    if (res.status === 404) throw new Error(`Symbol not found: ${symbol}`)
    if (res.status === 429) throw new Error('Rate limit exceeded, retry later')
    if (!res.ok) throw new Error(`Yahoo Finance API error: ${res.status}`)

    const data: ChartResponse = await res.json()

    if (data.chart.error) {
      throw new Error(`Yahoo API: ${data.chart.error.code} - ${data.chart.error.description}`)
    }

    const result = data.chart.result?.[0]
    if (!result) throw new Error('No data returned')

    const timestamps = result.timestamp || []
    const q = result.indicators.quote[0]
    const opens = q.open || []
    const highs = q.high || []
    const lows = q.low || []
    const closes = q.close || []
    const volumes = q.volume || []

    const bars: OhlcvBar[] = []
    for (let i = 0; i < timestamps.length; i++) {
      const o = opens[i]
      const h = highs[i]
      const l = lows[i]
      const c = closes[i]
      const v = volumes[i]
      if (o == null || h == null || l == null || c == null) continue

      bars.push({
        timestamp: timestamps[i] * 1000,
        open: o,
        high: h,
        low: l,
        close: c,
        volume: v ?? 0,
      })
    }

    bars.sort((a, b) => a.timestamp - b.timestamp)

    const meta = result.meta
    const quote: StockQuote = {
      symbol: meta.symbol,
      price: meta.regularMarketPrice,
      change: meta.regularMarketPrice - meta.previousClose,
      changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
      volume: meta.regularMarketVolume ?? 0,
      marketCap: meta.marketCap ?? 0,
      name: meta.shortName ?? symbol,
      exchange: meta.exchangeName,
    }

    const ttl = interval === '1m' || interval === '5m' ? 15_000 : 60_000
    const response = { bars, quote }
    setCache(cacheKey, response, ttl)
    return response
  }, 0)
}

export async function fetchQuote(symbol: string): Promise<StockQuote> {
  const { quote } = await fetchChart(symbol, '1d')
  return quote
}

export async function fetchMultipleQuotes(symbols: string[]): Promise<StockQuote[]> {
  return Promise.all(symbols.map((s) => fetchQuote(s)))
}

export async function searchSymbols(query: string): Promise<SearchResult[]> {
  const cacheKey = `search:${query}`
  const cached = getCached<SearchResult[]>(cacheKey)
  if (cached) return cached

  return rateLimiter.enqueue(async () => {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`

    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    })

    if (!res.ok) throw new Error(`Search failed: ${res.status}`)

    const data: SearchResponse = await res.json()

    const results = (data.quotes || []).map((q) => ({
      symbol: q.symbol,
      name: q.shortname || q.symbol,
      exchange: q.exchange,
      type: q.quoteType,
    }))

    setCache(cacheKey, results, 300_000) // 5 min cache
    return results
  }, 0)
}
```

**Step 3: Write tests**

```bash
cd server && npm install -D vitest
```

Add to `server/package.json` scripts: `"test": "vitest run", "test:watch": "vitest"`

```typescript
// server/src/services/__tests__/yahoo-finance.test.ts
import { describe, it, expect } from 'vitest'
import { fetchChart, searchSymbols } from '../yahoo-finance.js'

describe('Yahoo Finance Service', () => {
  it('fetches AAPL daily chart data', async () => {
    const end = Date.now()
    const start = end - 30 * 24 * 60 * 60 * 1000 // 30 days
    const { bars, quote } = await fetchChart('AAPL', '1d', start, end)

    expect(bars.length).toBeGreaterThan(0)
    expect(bars[0]).toHaveProperty('open')
    expect(bars[0]).toHaveProperty('high')
    expect(bars[0]).toHaveProperty('low')
    expect(bars[0]).toHaveProperty('close')
    expect(bars[0]).toHaveProperty('volume')
    expect(quote.symbol).toBe('AAPL')
    expect(quote.price).toBeGreaterThan(0)
  }, 15000)

  it('returns search results for "Apple"', async () => {
    const results = await searchSymbols('Apple')
    expect(results.length).toBeGreaterThan(0)
    expect(results.some((r) => r.symbol === 'AAPL')).toBe(true)
  }, 15000)

  it('throws on invalid symbol', async () => {
    await expect(fetchChart('ZZZZZZINVALID999')).rejects.toThrow()
  }, 15000)
})
```

**Step 4: Run tests**

```bash
cd server && npm test
```
Expected: 3 tests pass (these are integration tests requiring network)

**Step 5: Commit**

```bash
git add server/src/services/ server/vitest.config.ts
git commit -m "feat: add Yahoo Finance service with rate limiting and caching"
```

---

### Task 5: API Routes (Stocks, Portfolio, Watchlist)

**Files:**
- Create: `server/src/routes/stocks.ts`
- Create: `server/src/routes/portfolio.ts`
- Create: `server/src/routes/watchlist.ts`
- Modify: `server/src/index.ts`

**Step 1: Create stock routes**

```typescript
// server/src/routes/stocks.ts
import { Hono } from 'hono'
import { fetchChart, fetchQuote, fetchMultipleQuotes, searchSymbols } from '../services/yahoo-finance.js'
import type { Interval } from '../services/yahoo-finance.js'

const stocks = new Hono()

stocks.get('/chart/:symbol', async (c) => {
  const symbol = c.req.param('symbol')
  const interval = (c.req.query('interval') || '1d') as Interval
  const period1 = c.req.query('period1') ? Number(c.req.query('period1')) : undefined
  const period2 = c.req.query('period2') ? Number(c.req.query('period2')) : undefined

  try {
    const data = await fetchChart(symbol, interval, period1, period2)
    return c.json(data)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    if (msg.includes('not found')) return c.json({ error: msg }, 404)
    if (msg.includes('Rate limit')) return c.json({ error: msg }, 429)
    return c.json({ error: msg }, 500)
  }
})

stocks.get('/quote/:symbol', async (c) => {
  const symbol = c.req.param('symbol')
  try {
    const quote = await fetchQuote(symbol)
    return c.json(quote)
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500)
  }
})

stocks.get('/quotes', async (c) => {
  const symbols = c.req.query('symbols')?.split(',') || []
  if (symbols.length === 0) return c.json({ error: 'No symbols provided' }, 400)
  try {
    const quotes = await fetchMultipleQuotes(symbols)
    return c.json(quotes)
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500)
  }
})

stocks.get('/search', async (c) => {
  const q = c.req.query('q') || ''
  if (q.length < 1) return c.json([])
  try {
    const results = await searchSymbols(q)
    return c.json(results)
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500)
  }
})

export { stocks }
```

**Step 2: Create portfolio routes**

```typescript
// server/src/routes/portfolio.ts
import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { portfolios, holdings, transactions } from '../db/schema.js'

const portfolio = new Hono()

// List portfolios
portfolio.get('/', async (c) => {
  const result = await db.select().from(portfolios).orderBy(portfolios.createdAt)
  return c.json(result)
})

// Create portfolio
portfolio.post('/', async (c) => {
  const { name } = await c.req.json<{ name: string }>()
  const [result] = await db.insert(portfolios).values({ name }).returning()
  return c.json(result, 201)
})

// Get portfolio with holdings
portfolio.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const [p] = await db.select().from(portfolios).where(eq(portfolios.id, id))
  if (!p) return c.json({ error: 'Portfolio not found' }, 404)
  const h = await db.select().from(holdings).where(eq(holdings.portfolioId, id))
  return c.json({ ...p, holdings: h })
})

// Delete portfolio
portfolio.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  await db.delete(portfolios).where(eq(portfolios.id, id))
  return c.json({ ok: true })
})

// Add holding
portfolio.post('/:id/holdings', async (c) => {
  const portfolioId = Number(c.req.param('id'))
  const body = await c.req.json<{ symbol: string; shares: number; buyPrice: number; buyDate: string }>()
  const [holding] = await db
    .insert(holdings)
    .values({
      portfolioId,
      symbol: body.symbol.toUpperCase(),
      shares: body.shares,
      buyPrice: body.buyPrice,
      buyDate: new Date(body.buyDate),
    })
    .returning()

  // Record transaction
  await db.insert(transactions).values({
    portfolioId,
    symbol: body.symbol.toUpperCase(),
    type: 'buy',
    shares: body.shares,
    price: body.buyPrice,
    date: new Date(body.buyDate),
  })

  return c.json(holding, 201)
})

// Delete holding
portfolio.delete('/:id/holdings/:holdingId', async (c) => {
  const holdingId = Number(c.req.param('holdingId'))
  await db.delete(holdings).where(eq(holdings.id, holdingId))
  return c.json({ ok: true })
})

// Get transactions
portfolio.get('/:id/transactions', async (c) => {
  const portfolioId = Number(c.req.param('id'))
  const txns = await db.select().from(transactions).where(eq(transactions.portfolioId, portfolioId))
  return c.json(txns)
})

export { portfolio }
```

**Step 3: Create watchlist routes**

```typescript
// server/src/routes/watchlist.ts
import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { watchlists, watchlistItems, priceAlerts } from '../db/schema.js'

const watchlist = new Hono()

// List watchlists
watchlist.get('/', async (c) => {
  const result = await db.select().from(watchlists).orderBy(watchlists.createdAt)
  return c.json(result)
})

// Create watchlist
watchlist.post('/', async (c) => {
  const { name } = await c.req.json<{ name: string }>()
  const [result] = await db.insert(watchlists).values({ name }).returning()
  return c.json(result, 201)
})

// Get watchlist with items
watchlist.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const [w] = await db.select().from(watchlists).where(eq(watchlists.id, id))
  if (!w) return c.json({ error: 'Watchlist not found' }, 404)
  const items = await db.select().from(watchlistItems).where(eq(watchlistItems.watchlistId, id))
  return c.json({ ...w, items })
})

// Delete watchlist
watchlist.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  await db.delete(watchlists).where(eq(watchlists.id, id))
  return c.json({ ok: true })
})

// Add item to watchlist
watchlist.post('/:id/items', async (c) => {
  const watchlistId = Number(c.req.param('id'))
  const { symbol } = await c.req.json<{ symbol: string }>()
  const [item] = await db
    .insert(watchlistItems)
    .values({ watchlistId, symbol: symbol.toUpperCase() })
    .returning()
  return c.json(item, 201)
})

// Remove item from watchlist
watchlist.delete('/:id/items/:itemId', async (c) => {
  const itemId = Number(c.req.param('itemId'))
  await db.delete(watchlistItems).where(eq(watchlistItems.id, itemId))
  return c.json({ ok: true })
})

// Price alerts
watchlist.get('/alerts', async (c) => {
  const result = await db.select().from(priceAlerts)
  return c.json(result)
})

watchlist.post('/alerts', async (c) => {
  const body = await c.req.json<{ symbol: string; targetPrice: number; direction: 'above' | 'below' }>()
  const [alert] = await db
    .insert(priceAlerts)
    .values({
      symbol: body.symbol.toUpperCase(),
      targetPrice: body.targetPrice,
      direction: body.direction,
    })
    .returning()
  return c.json(alert, 201)
})

watchlist.delete('/alerts/:id', async (c) => {
  const id = Number(c.req.param('id'))
  await db.delete(priceAlerts).where(eq(priceAlerts.id, id))
  return c.json({ ok: true })
})

export { watchlist }
```

**Step 4: Wire routes into main server**

```typescript
// server/src/index.ts
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { stocks } from './routes/stocks.js'
import { portfolio } from './routes/portfolio.js'
import { watchlist } from './routes/watchlist.js'
import 'dotenv/config'

const app = new Hono()

app.use('*', logger())
app.use('/api/*', cors())

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.route('/api/stocks', stocks)
app.route('/api/portfolio', portfolio)
app.route('/api/watchlist', watchlist)

const port = parseInt(process.env.PORT || '3001')

console.log(`Hono server starting on port ${port}`)

serve({ fetch: app.fetch, port })
```

**Step 5: Test stock endpoint manually**

```bash
curl http://localhost:3001/api/stocks/chart/AAPL?interval=1d
curl http://localhost:3001/api/stocks/search?q=Tesla
```
Expected: JSON with bars/quote data, search results

**Step 6: Commit**

```bash
git add server/src/routes/ server/src/index.ts
git commit -m "feat: add stock, portfolio, and watchlist API routes"
```

---

### Task 6: WebSocket Price Streaming

**Files:**
- Create: `server/src/services/websocket.ts`
- Modify: `server/src/index.ts` — add WebSocket upgrade

**Step 1: Create WebSocket manager**

```typescript
// server/src/services/websocket.ts
import type { ServerWebSocket } from '@hono/node-ws'
import { fetchQuote } from './yahoo-finance.js'

interface Subscription {
  ws: ServerWebSocket
  symbols: Set<string>
}

class PriceStreamManager {
  private subscriptions = new Map<ServerWebSocket, Set<string>>()
  private intervalId: ReturnType<typeof setInterval> | null = null
  private lastPrices = new Map<string, number>()

  subscribe(ws: ServerWebSocket, symbol: string): void {
    if (!this.subscriptions.has(ws)) {
      this.subscriptions.set(ws, new Set())
    }
    this.subscriptions.get(ws)!.add(symbol.toUpperCase())
    this.ensurePolling()
  }

  unsubscribe(ws: ServerWebSocket, symbol: string): void {
    const symbols = this.subscriptions.get(ws)
    if (symbols) {
      symbols.delete(symbol.toUpperCase())
      if (symbols.size === 0) this.subscriptions.delete(ws)
    }
    this.checkStopPolling()
  }

  removeClient(ws: ServerWebSocket): void {
    this.subscriptions.delete(ws)
    this.checkStopPolling()
  }

  private getAllSymbols(): string[] {
    const symbols = new Set<string>()
    for (const syms of this.subscriptions.values()) {
      for (const s of syms) symbols.add(s)
    }
    return Array.from(symbols)
  }

  private ensurePolling(): void {
    if (this.intervalId) return
    this.intervalId = setInterval(() => this.poll(), 15_000)
    // Immediate first poll
    this.poll()
  }

  private checkStopPolling(): void {
    if (this.subscriptions.size === 0 && this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  private async poll(): Promise<void> {
    const symbols = this.getAllSymbols()
    if (symbols.length === 0) return

    for (const symbol of symbols) {
      try {
        const quote = await fetchQuote(symbol)
        const lastPrice = this.lastPrices.get(symbol)

        // Only send if price changed
        if (lastPrice !== quote.price) {
          this.lastPrices.set(symbol, quote.price)
          this.broadcast(symbol, quote)
        }
      } catch {
        // Silently skip failed fetches
      }
    }
  }

  private broadcast(symbol: string, data: unknown): void {
    const message = JSON.stringify({ type: 'price', symbol, data })
    for (const [ws, symbols] of this.subscriptions) {
      if (symbols.has(symbol)) {
        try {
          ws.send(message)
        } catch {
          this.removeClient(ws)
        }
      }
    }
  }
}

export const priceStream = new PriceStreamManager()
```

**Step 2: Add WebSocket to Hono server**

Update `server/src/index.ts` to include WebSocket:

```typescript
// server/src/index.ts
import { createNodeWebSocket } from '@hono/node-ws'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { stocks } from './routes/stocks.js'
import { portfolio } from './routes/portfolio.js'
import { watchlist } from './routes/watchlist.js'
import { priceStream } from './services/websocket.js'
import 'dotenv/config'

const app = new Hono()
const { upgradeWebSocket, injectWebSocket } = createNodeWebSocket({ app })

app.use('*', logger())
app.use('/api/*', cors())

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.route('/api/stocks', stocks)
app.route('/api/portfolio', portfolio)
app.route('/api/watchlist', watchlist)

app.get(
  '/ws',
  upgradeWebSocket((c) => {
    return {
      onMessage(event, ws) {
        try {
          const msg = JSON.parse(String(event.data))
          if (msg.subscribe) {
            priceStream.subscribe(ws.raw as any, msg.subscribe)
          }
          if (msg.unsubscribe) {
            priceStream.unsubscribe(ws.raw as any, msg.unsubscribe)
          }
        } catch {
          // ignore malformed messages
        }
      },
      onClose(event, ws) {
        priceStream.removeClient(ws.raw as any)
      },
    }
  })
)

const port = parseInt(process.env.PORT || '3001')

console.log(`Hono server starting on port ${port}`)

const server = serve({ fetch: app.fetch, port })
injectWebSocket(server)
```

**Step 3: Commit**

```bash
git add server/src/services/websocket.ts server/src/index.ts
git commit -m "feat: add WebSocket price streaming with hybrid polling"
```

---

## Phase 2: Frontend Shell & Routing

### Task 7: TanStack Router Setup with Dark Theme Layout

**Files:**
- Create: `src/routes/__root.tsx`
- Create: `src/routes/index.tsx`
- Create: `src/routes/stock.$ticker.tsx`
- Create: `src/routes/portfolio.tsx`
- Create: `src/routes/watchlist.tsx`
- Create: `src/routes/screener.tsx`
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`
- Create: `src/components/layout/Navbar.tsx`
- Create: `src/components/layout/SearchBar.tsx`

**Step 1: Set up TanStack Router entry point**

```tsx
// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { routeTree } from './routeTree.gen'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
})

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
)
```

**Step 2: Create root layout with dark theme navbar**

```tsx
// src/routes/__root.tsx
import { createRootRoute, Outlet, Link } from '@tanstack/react-router'
import { Navbar } from '@/components/layout/Navbar'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
```

```tsx
// src/components/layout/Navbar.tsx
import { Link } from '@tanstack/react-router'
import { SearchBar } from './SearchBar'

export function Navbar() {
  const links = [
    { to: '/' as const, label: 'Market' },
    { to: '/portfolio' as const, label: 'Portfolio' },
    { to: '/watchlist' as const, label: 'Watchlist' },
    { to: '/screener' as const, label: 'Screener' },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/50 bg-[#0a0a0f]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
        <Link to="/" className="text-lg font-bold tracking-tight">
          <span className="text-emerald-400">Stock</span>Sense
        </Link>
        <nav className="flex items-center gap-1">
          {links.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-100"
              activeProps={{ className: 'rounded-md px-3 py-1.5 text-sm font-medium text-emerald-400 bg-emerald-400/10' }}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto w-72">
          <SearchBar />
        </div>
      </div>
    </header>
  )
}
```

```tsx
// src/components/layout/SearchBar.tsx
import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

export function SearchBar() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  return (
    <input
      type="text"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && query.trim()) {
          navigate({ to: '/stock/$ticker', params: { ticker: query.trim().toUpperCase() } })
          setQuery('')
        }
      }}
      placeholder="Search ticker or company..."
      className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
    />
  )
}
```

**Step 3: Create placeholder route files**

```tsx
// src/routes/index.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: MarketOverview,
})

function MarketOverview() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Market Overview</h1>
      <p className="text-zinc-500">Coming soon...</p>
    </div>
  )
}
```

```tsx
// src/routes/stock.$ticker.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/stock/$ticker')({
  component: StockDetail,
})

function StockDetail() {
  const { ticker } = Route.useParams()
  return (
    <div>
      <h1 className="text-2xl font-bold">{ticker}</h1>
      <p className="text-zinc-500">Stock detail coming soon...</p>
    </div>
  )
}
```

```tsx
// src/routes/portfolio.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/portfolio')({
  component: Portfolio,
})

function Portfolio() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Portfolio</h1>
      <p className="text-zinc-500">Coming soon...</p>
    </div>
  )
}
```

```tsx
// src/routes/watchlist.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/watchlist')({
  component: Watchlist,
})

function Watchlist() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Watchlists</h1>
      <p className="text-zinc-500">Coming soon...</p>
    </div>
  )
}
```

```tsx
// src/routes/screener.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/screener')({
  component: Screener,
})

function Screener() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Stock Screener</h1>
      <p className="text-zinc-500">Coming soon...</p>
    </div>
  )
}
```

**Step 4: Set up global CSS with dark theme**

```css
/* src/index.css */
@import "tailwindcss";

@theme {
  --font-mono: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
}

body {
  font-feature-settings: "tnum";
  -webkit-font-smoothing: antialiased;
}

/* Tabular numbers for financial data */
.tabular-nums {
  font-variant-numeric: tabular-nums;
}

/* Custom scrollbar for dark theme */
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-track {
  background: #0a0a0f;
}
::-webkit-scrollbar-thumb {
  background: #27272a;
  border-radius: 4px;
}
```

**Step 5: Verify routing works**

```bash
npm run dev
```
Navigate to `http://localhost:5174/`, `/portfolio`, `/watchlist`, `/stock/AAPL`
Expected: Dark theme shell with navbar, placeholder content per route

**Step 6: Commit**

```bash
git add src/
git commit -m "feat: add TanStack Router with dark theme layout and navigation"
```

---

### Task 8: API Client & TanStack Query Hooks

**Files:**
- Create: `src/lib/api.ts`
- Create: `src/hooks/useStockData.ts`
- Create: `src/hooks/usePortfolio.ts`
- Create: `src/hooks/useWatchlist.ts`
- Create: `src/hooks/useWebSocket.ts`

**Step 1: Create API client**

```typescript
// src/lib/api.ts
const BASE = '/api'

async function fetcher<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

export const api = {
  stocks: {
    chart: (symbol: string, interval = '1d', period1?: number, period2?: number) => {
      const params = new URLSearchParams({ interval })
      if (period1) params.set('period1', String(period1))
      if (period2) params.set('period2', String(period2))
      return fetcher<{ bars: OhlcvBar[]; quote: StockQuote }>(`/stocks/chart/${symbol}?${params}`)
    },
    quote: (symbol: string) => fetcher<StockQuote>(`/stocks/quote/${symbol}`),
    quotes: (symbols: string[]) => fetcher<StockQuote[]>(`/stocks/quotes?symbols=${symbols.join(',')}`),
    search: (q: string) => fetcher<SearchResult[]>(`/stocks/search?q=${q}`),
  },
  portfolio: {
    list: () => fetcher<Portfolio[]>('/portfolio'),
    get: (id: number) => fetcher<PortfolioWithHoldings>(`/portfolio/${id}`),
    create: (name: string) => fetcher<Portfolio>('/portfolio', { method: 'POST', body: JSON.stringify({ name }) }),
    delete: (id: number) => fetcher('/portfolio/' + id, { method: 'DELETE' }),
    addHolding: (id: number, data: NewHolding) =>
      fetcher<Holding>(`/portfolio/${id}/holdings`, { method: 'POST', body: JSON.stringify(data) }),
    deleteHolding: (id: number, holdingId: number) =>
      fetcher(`/portfolio/${id}/holdings/${holdingId}`, { method: 'DELETE' }),
    transactions: (id: number) => fetcher<Transaction[]>(`/portfolio/${id}/transactions`),
  },
  watchlist: {
    list: () => fetcher<Watchlist[]>('/watchlist'),
    get: (id: number) => fetcher<WatchlistWithItems>(`/watchlist/${id}`),
    create: (name: string) => fetcher<Watchlist>('/watchlist', { method: 'POST', body: JSON.stringify({ name }) }),
    delete: (id: number) => fetcher('/watchlist/' + id, { method: 'DELETE' }),
    addItem: (id: number, symbol: string) =>
      fetcher(`/watchlist/${id}/items`, { method: 'POST', body: JSON.stringify({ symbol }) }),
    deleteItem: (id: number, itemId: number) =>
      fetcher(`/watchlist/${id}/items/${itemId}`, { method: 'DELETE' }),
    alerts: () => fetcher<PriceAlert[]>('/watchlist/alerts'),
    createAlert: (data: { symbol: string; targetPrice: number; direction: 'above' | 'below' }) =>
      fetcher<PriceAlert>('/watchlist/alerts', { method: 'POST', body: JSON.stringify(data) }),
    deleteAlert: (id: number) => fetcher('/watchlist/alerts/' + id, { method: 'DELETE' }),
  },
}

// Types
export interface OhlcvBar {
  timestamp: number; open: number; high: number; low: number; close: number; volume: number
}
export interface StockQuote {
  symbol: string; price: number; change: number; changePercent: number
  volume: number; marketCap: number; name: string; exchange: string
}
export interface SearchResult { symbol: string; name: string; exchange: string; type: string }
export interface Portfolio { id: number; name: string; createdAt: string }
export interface Holding {
  id: number; portfolioId: number; symbol: string; shares: number; buyPrice: number; buyDate: string
}
export interface PortfolioWithHoldings extends Portfolio { holdings: Holding[] }
export interface NewHolding { symbol: string; shares: number; buyPrice: number; buyDate: string }
export interface Transaction {
  id: number; portfolioId: number; symbol: string; type: 'buy' | 'sell'
  shares: number; price: number; date: string
}
export interface Watchlist { id: number; name: string; createdAt: string }
export interface WatchlistItem { id: number; watchlistId: number; symbol: string; addedAt: string }
export interface WatchlistWithItems extends Watchlist { items: WatchlistItem[] }
export interface PriceAlert {
  id: number; symbol: string; targetPrice: number; direction: 'above' | 'below'
  triggered: boolean; createdAt: string
}
```

**Step 2: Create query hooks**

```typescript
// src/hooks/useStockData.ts
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Interval } from '@/lib/api'

export function useChart(symbol: string, interval = '1d' as const, period1?: number, period2?: number) {
  return useQuery({
    queryKey: ['chart', symbol, interval, period1, period2],
    queryFn: () => api.stocks.chart(symbol, interval, period1, period2),
    enabled: !!symbol,
  })
}

export function useQuote(symbol: string) {
  return useQuery({
    queryKey: ['quote', symbol],
    queryFn: () => api.stocks.quote(symbol),
    enabled: !!symbol,
    refetchInterval: 60_000,
  })
}

export function useQuotes(symbols: string[]) {
  return useQuery({
    queryKey: ['quotes', symbols],
    queryFn: () => api.stocks.quotes(symbols),
    enabled: symbols.length > 0,
    refetchInterval: 60_000,
  })
}

export function useSearch(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: () => api.stocks.search(query),
    enabled: query.length >= 1,
    staleTime: 300_000,
  })
}
```

```typescript
// src/hooks/usePortfolio.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { NewHolding } from '@/lib/api'

export function usePortfolios() {
  return useQuery({ queryKey: ['portfolios'], queryFn: api.portfolio.list })
}

export function usePortfolio(id: number) {
  return useQuery({
    queryKey: ['portfolio', id],
    queryFn: () => api.portfolio.get(id),
    enabled: id > 0,
  })
}

export function useCreatePortfolio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api.portfolio.create(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolios'] }),
  })
}

export function useAddHolding(portfolioId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: NewHolding) => api.portfolio.addHolding(portfolioId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolio', portfolioId] }),
  })
}

export function useDeleteHolding(portfolioId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (holdingId: number) => api.portfolio.deleteHolding(portfolioId, holdingId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolio', portfolioId] }),
  })
}

export function useTransactions(portfolioId: number) {
  return useQuery({
    queryKey: ['transactions', portfolioId],
    queryFn: () => api.portfolio.transactions(portfolioId),
    enabled: portfolioId > 0,
  })
}
```

```typescript
// src/hooks/useWatchlist.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useWatchlists() {
  return useQuery({ queryKey: ['watchlists'], queryFn: api.watchlist.list })
}

export function useWatchlist(id: number) {
  return useQuery({
    queryKey: ['watchlist', id],
    queryFn: () => api.watchlist.get(id),
    enabled: id > 0,
  })
}

export function useCreateWatchlist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api.watchlist.create(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlists'] }),
  })
}

export function useAddWatchlistItem(watchlistId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (symbol: string) => api.watchlist.addItem(watchlistId, symbol),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlist', watchlistId] }),
  })
}

export function useDeleteWatchlistItem(watchlistId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (itemId: number) => api.watchlist.deleteItem(watchlistId, itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlist', watchlistId] }),
  })
}

export function usePriceAlerts() {
  return useQuery({ queryKey: ['alerts'], queryFn: api.watchlist.alerts })
}

export function useCreateAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.watchlist.createAlert,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  })
}
```

```typescript
// src/hooks/useWebSocket.ts
import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export function useStockWebSocket(symbol: string | null) {
  const wsRef = useRef<WebSocket | null>(null)
  const qc = useQueryClient()

  useEffect(() => {
    if (!symbol) return

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${protocol}://${window.location.host}/ws`)
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({ subscribe: symbol }))
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'price' && msg.symbol === symbol) {
          qc.setQueryData(['quote', symbol], msg.data)
        }
      } catch { /* ignore */ }
    }

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ unsubscribe: symbol }))
      }
      ws.close()
    }
  }, [symbol, qc])
}
```

**Step 3: Commit**

```bash
git add src/lib/ src/hooks/
git commit -m "feat: add API client and TanStack Query hooks for stocks, portfolio, watchlist"
```

---

## Phase 3: D3.js Candlestick Chart (Hero Component)

### Task 9: Technical Indicators Library

**Files:**
- Create: `src/lib/indicators.ts`
- Test: `src/lib/__tests__/indicators.test.ts`

**Step 1: Write indicator test**

```typescript
// src/lib/__tests__/indicators.test.ts
import { describe, it, expect } from 'vitest'
import { sma, ema, bollingerBands, rsi, macd } from '../indicators'

const closes = [44, 44.34, 44.09, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84, 46.08,
  45.89, 46.03, 45.61, 46.28, 46.28, 46.00, 46.03, 46.41, 46.22, 45.64]

describe('indicators', () => {
  it('calculates SMA correctly', () => {
    const result = sma(closes, 5)
    expect(result).toHaveLength(closes.length)
    expect(result[4]).toBeCloseTo(44.074, 2) // avg of first 5
    expect(result[3]).toBeNull() // not enough data
  })

  it('calculates EMA correctly', () => {
    const result = ema(closes, 5)
    expect(result).toHaveLength(closes.length)
    expect(result[4]).not.toBeNull()
  })

  it('calculates Bollinger Bands', () => {
    const result = bollingerBands(closes, 20, 2)
    expect(result).toHaveLength(closes.length)
    const last = result[result.length - 1]
    expect(last).not.toBeNull()
    if (last) {
      expect(last.upper).toBeGreaterThan(last.middle)
      expect(last.lower).toBeLessThan(last.middle)
    }
  })

  it('calculates RSI in 0-100 range', () => {
    const result = rsi(closes, 14)
    const values = result.filter((v): v is number => v !== null)
    values.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(100)
    })
  })

  it('calculates MACD', () => {
    const result = macd(closes)
    expect(result).toHaveLength(closes.length)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/__tests__/indicators.test.ts
```
Expected: FAIL — module not found

**Step 3: Implement indicators**

```typescript
// src/lib/indicators.ts

export function sma(data: number[], period: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null
    let sum = 0
    for (let j = i - period + 1; j <= i; j++) sum += data[j]
    return sum / period
  })
}

export function ema(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null)
  const k = 2 / (period + 1)

  // First EMA = SMA of first `period` values
  let sum = 0
  for (let i = 0; i < period; i++) sum += data[i]
  result[period - 1] = sum / period

  for (let i = period; i < data.length; i++) {
    result[i] = data[i] * k + (result[i - 1] as number) * (1 - k)
  }
  return result
}

export interface BollingerBand {
  upper: number
  middle: number
  lower: number
}

export function bollingerBands(
  data: number[],
  period = 20,
  stdDevMultiplier = 2
): (BollingerBand | null)[] {
  const smaValues = sma(data, period)

  return data.map((_, i) => {
    const middle = smaValues[i]
    if (middle === null) return null

    let sumSqDiff = 0
    for (let j = i - period + 1; j <= i; j++) {
      sumSqDiff += (data[j] - middle) ** 2
    }
    const stdDev = Math.sqrt(sumSqDiff / period)

    return {
      upper: middle + stdDevMultiplier * stdDev,
      middle,
      lower: middle - stdDevMultiplier * stdDev,
    }
  })
}

export function rsi(data: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null)

  if (data.length < period + 1) return result

  let avgGain = 0
  let avgLoss = 0

  for (let i = 1; i <= period; i++) {
    const change = data[i] - data[i - 1]
    if (change > 0) avgGain += change
    else avgLoss += Math.abs(change)
  }
  avgGain /= period
  avgLoss /= period

  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)

  for (let i = period + 1; i < data.length; i++) {
    const change = data[i] - data[i - 1]
    const gain = change > 0 ? change : 0
    const loss = change < 0 ? Math.abs(change) : 0

    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period

    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)
  }

  return result
}

export interface MacdPoint {
  macd: number
  signal: number
  histogram: number
}

export function macd(
  data: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): (MacdPoint | null)[] {
  const fastEma = ema(data, fastPeriod)
  const slowEma = ema(data, slowPeriod)

  const macdLine: number[] = data.map((_, i) => {
    const f = fastEma[i]
    const s = slowEma[i]
    if (f === null || s === null) return 0
    return f - s
  })

  const signalLine = ema(macdLine, signalPeriod)

  return data.map((_, i) => {
    const s = signalLine[i]
    if (s === null || i < slowPeriod - 1) return null
    return {
      macd: macdLine[i],
      signal: s,
      histogram: macdLine[i] - s,
    }
  })
}
```

**Step 4: Run tests**

```bash
npx vitest run src/lib/__tests__/indicators.test.ts
```
Expected: All 5 tests pass

**Step 5: Commit**

```bash
git add src/lib/indicators.ts src/lib/__tests__/
git commit -m "feat: add technical indicators library (SMA, EMA, Bollinger, RSI, MACD)"
```

---

### Task 10: D3.js Candlestick Chart Component

**Files:**
- Create: `src/lib/d3-utils.ts`
- Create: `src/lib/format.ts`
- Create: `src/components/charts/CandlestickChart.tsx`

**Step 1: Create formatting utilities**

```typescript
// src/lib/format.ts
export function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatLargeNumber(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`
  return String(value)
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

export function formatVolume(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`
  return String(Math.round(value))
}

export function formatDate(timestamp: number, interval: string): string {
  const date = new Date(timestamp)
  if (interval === '1m' || interval === '5m' || interval === '15m' || interval === '30m' || interval === '1h') {
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
```

**Step 2: Create D3 utilities**

```typescript
// src/lib/d3-utils.ts
import * as d3 from 'd3'
import type { OhlcvBar } from './api'

export interface ChartDimensions {
  width: number
  height: number
  margin: { top: number; right: number; bottom: number; left: number }
  innerWidth: number
  innerHeight: number
  priceHeight: number
  volumeHeight: number
}

export function calcDimensions(width: number, height: number): ChartDimensions {
  const margin = { top: 20, right: 60, bottom: 30, left: 10 }
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom
  const volumeHeight = innerHeight * 0.2
  const priceHeight = innerHeight * 0.8 - 10 // 10px gap

  return { width, height, margin, innerWidth, innerHeight, priceHeight, volumeHeight }
}

export function createScales(bars: OhlcvBar[], dims: ChartDimensions) {
  const xScale = d3
    .scaleTime()
    .domain(d3.extent(bars, (d) => new Date(d.timestamp)) as [Date, Date])
    .range([0, dims.innerWidth])

  const yScale = d3
    .scaleLinear()
    .domain([d3.min(bars, (d) => d.low)! * 0.995, d3.max(bars, (d) => d.high)! * 1.005])
    .range([dims.priceHeight, 0])

  const volumeScale = d3
    .scaleLinear()
    .domain([0, d3.max(bars, (d) => d.volume)!])
    .range([dims.volumeHeight, 0])

  return { xScale, yScale, volumeScale }
}
```

**Step 3: Create CandlestickChart component**

This is a large component. Create `src/components/charts/CandlestickChart.tsx` with:
- SVG rendering with D3 for scales, axes, zoom
- Candlestick bodies (green for up, red for down)
- Wicks (high-low lines)
- Volume bars in sub-chart
- Crosshair overlay with tooltip
- d3-zoom for zoom/pan
- ResizeObserver for responsiveness
- Technical indicator overlay support

The component should accept:
```typescript
interface CandlestickChartProps {
  bars: OhlcvBar[]
  indicators?: {
    sma?: number[]
    ema?: number[]
    bollingerBands?: (BollingerBand | null)[]
  }
  height?: number
  interval?: string
}
```

Implementation is ~300 lines of D3 + React. Key patterns:
- Use `useRef` for the SVG element
- Use `useEffect` to run D3 rendering when bars/dimensions change
- D3 handles all SVG manipulation inside the effect
- React handles the container sizing and props

**Step 4: Verify renders with mock data**

Update `src/routes/stock.$ticker.tsx` to fetch real data and render the chart.

**Step 5: Commit**

```bash
git add src/components/charts/ src/lib/d3-utils.ts src/lib/format.ts
git commit -m "feat: add D3.js candlestick chart with zoom, crosshair, and volume"
```

---

### Task 11: Technical Indicator Overlays on Candlestick Chart

**Files:**
- Modify: `src/components/charts/CandlestickChart.tsx` — add indicator rendering
- Create: `src/components/charts/IndicatorPanel.tsx` — RSI and MACD sub-charts
- Create: `src/components/stock/TechnicalIndicators.tsx` — toggle controls

**Step 1: Add overlay rendering to CandlestickChart**

Add to the D3 render effect:
- SMA/EMA as line paths (colored lines)
- Bollinger Bands as a shaded area (semi-transparent fill between upper/lower)

**Step 2: Create RSI sub-chart**

Separate D3 component rendering RSI as a line chart with:
- Horizontal lines at 30 (oversold) and 70 (overbought)
- Shaded zones
- Shared x-axis with main chart

**Step 3: Create MACD sub-chart**

Separate D3 component rendering:
- MACD line + signal line
- Histogram bars (green above zero, red below)
- Zero line

**Step 4: Create toggle controls**

```tsx
// src/components/stock/TechnicalIndicators.tsx
// Toggle buttons for SMA(20), EMA(20), Bollinger(20,2), RSI(14), MACD(12,26,9)
// Stores active indicators in Zustand preferences store
```

**Step 5: Commit**

```bash
git add src/components/charts/ src/components/stock/
git commit -m "feat: add SMA, EMA, Bollinger, RSI, MACD indicator overlays"
```

---

## Phase 4: Market Overview Page

### Task 12: Market Overview Components

**Files:**
- Create: `src/components/market/MarketOverview.tsx`
- Create: `src/components/market/IndexCard.tsx`
- Create: `src/components/market/TopMovers.tsx`
- Create: `src/components/market/SectorPerformance.tsx`
- Modify: `src/routes/index.tsx`

**Step 1: Create IndexCard**

Displays a major index (S&P 500, NASDAQ, DOW) with:
- Current price, change, change%
- Mini sparkline (Recharts) of last 5 days
- Green/red coloring based on direction

Uses hardcoded symbols: `^GSPC`, `^IXIC`, `^DJI`

**Step 2: Create TopMovers**

Three tabs: Gainers, Losers, Most Active.
Uses hardcoded list of ~20 popular tickers fetched in bulk via `/api/stocks/quotes`.
Sorted by changePercent (gainers desc, losers asc) or volume (most active).

**Step 3: Create SectorPerformance**

Recharts horizontal BarChart showing sector ETFs:
- XLK (Tech), XLF (Financials), XLV (Healthcare), XLE (Energy), XLY (Consumer), XLI (Industrial), XLB (Materials), XLP (Staples), XLRE (Real Estate), XLU (Utilities), XLC (Communication)

**Step 4: Wire into index route**

```tsx
// src/routes/index.tsx - compose all market components
```

**Step 5: Commit**

```bash
git add src/components/market/ src/routes/index.tsx
git commit -m "feat: add market overview with indices, top movers, sector performance"
```

---

### Task 13: Market Heatmap (D3 Treemap)

**Files:**
- Create: `src/components/charts/HeatmapChart.tsx`
- Modify: `src/routes/index.tsx` — add heatmap section

**Step 1: Create D3 treemap component**

Uses `d3.treemap()` to create a market heatmap:
- Rectangles sized by market cap
- Colored by daily change (red gradient for negative, green for positive)
- Hover shows ticker, price, change%
- Grouped by sector
- Smooth transitions on data update

Uses ~30 popular tickers across sectors with data from `/api/stocks/quotes`.

**Step 2: Commit**

```bash
git add src/components/charts/HeatmapChart.tsx src/routes/index.tsx
git commit -m "feat: add D3 treemap market heatmap"
```

---

## Phase 5: Stock Detail Page

### Task 14: Stock Detail Page Assembly

**Files:**
- Modify: `src/routes/stock.$ticker.tsx`
- Create: `src/components/stock/StockDetail.tsx`
- Create: `src/components/stock/StockHeader.tsx`
- Create: `src/components/stock/CompanyInfo.tsx`
- Create: `src/components/stock/TimeRangeSelector.tsx`

**Step 1: Create StockHeader**

Shows: symbol, company name, current price (large), change, change%, exchange.
Price updates in real-time via WebSocket hook.

**Step 2: Create TimeRangeSelector**

Buttons: 1D, 5D, 1M, 3M, 6M, 1Y, 5Y, MAX.
Each maps to an interval + period range:
- 1D → interval=5m, last 1 day
- 5D → interval=15m, last 5 days
- 1M → interval=1d, last 30 days
- 3M → interval=1d, last 90 days
- 6M → interval=1d, last 180 days
- 1Y → interval=1d, last 365 days
- 5Y → interval=1wk, last 5 years
- MAX → interval=1mo, all time

**Step 3: Create CompanyInfo**

Panel showing: market cap, P/E ratio (if available), volume, 52-week range, exchange.
Data from the quote endpoint.

**Step 4: Assemble stock detail page**

```tsx
// src/routes/stock.$ticker.tsx
// Layout: StockHeader → TimeRangeSelector → CandlestickChart → IndicatorPanel → CompanyInfo
// Uses useStockWebSocket(ticker) for real-time updates
```

**Step 5: Commit**

```bash
git add src/routes/stock.$ticker.tsx src/components/stock/
git commit -m "feat: assemble stock detail page with chart, indicators, and real-time updates"
```

---

## Phase 6: Portfolio & Watchlist Pages

### Task 15: Portfolio Page

**Files:**
- Modify: `src/routes/portfolio.tsx`
- Create: `src/components/portfolio/PortfolioSummary.tsx`
- Create: `src/components/portfolio/HoldingsList.tsx`
- Create: `src/components/portfolio/AddHolding.tsx`
- Create: `src/components/charts/PortfolioDonut.tsx`
- Create: `src/components/charts/PerformanceLine.tsx`
- Create: `src/stores/portfolio-store.ts`

**Step 1: Create Zustand store for active portfolio selection**

```typescript
// src/stores/portfolio-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PortfolioStore {
  activePortfolioId: number | null
  setActivePortfolio: (id: number | null) => void
}

export const usePortfolioStore = create<PortfolioStore>()(
  persist(
    (set) => ({
      activePortfolioId: null,
      setActivePortfolio: (id) => set({ activePortfolioId: id }),
    }),
    { name: 'stocksense-portfolio' }
  )
)
```

**Step 2: Create PortfolioSummary**

Total value, total gain/loss, day change. Fetches current prices for all holdings.

**Step 3: Create HoldingsList**

Table: Symbol, Shares, Avg Cost, Current Price, Value, Gain/Loss, Gain%.
Rows clickable → navigate to stock detail.
Delete button per holding.

**Step 4: Create AddHolding form**

React Hook Form + Zod. Fields: symbol (with autocomplete), shares, buy price, buy date.

**Step 5: Create PortfolioDonut (Recharts)**

Pie chart showing allocation by holding as % of total value.

**Step 6: Create PerformanceLine (Recharts)**

Line chart comparing portfolio value over time vs S&P 500 benchmark.

**Step 7: Commit**

```bash
git add src/routes/portfolio.tsx src/components/portfolio/ src/components/charts/ src/stores/
git commit -m "feat: add portfolio page with holdings, donut chart, and performance"
```

---

### Task 16: Watchlist Page

**Files:**
- Modify: `src/routes/watchlist.tsx`
- Create: `src/components/watchlist/WatchlistTabs.tsx`
- Create: `src/components/watchlist/StockTable.tsx`
- Create: `src/components/watchlist/PriceAlerts.tsx`

**Step 1: Create WatchlistTabs**

Tab list of watchlists + "New Watchlist" button. Active tab shows items.

**Step 2: Create StockTable**

Sortable table: Symbol, Name, Price, Change, Change%, Volume, Market Cap.
Uses current quote data. Sortable by clicking column headers.
"Add Symbol" input at top. Delete button per row.

**Step 3: Create PriceAlerts**

List of alerts with: Symbol, Target Price, Direction, Status.
"New Alert" form. Shows if triggered.

**Step 4: Commit**

```bash
git add src/routes/watchlist.tsx src/components/watchlist/
git commit -m "feat: add watchlist page with sortable table and price alerts"
```

---

### Task 17: Stock Screener Page

**Files:**
- Modify: `src/routes/screener.tsx`
- Create: `src/components/screener/FilterForm.tsx`
- Create: `src/components/screener/ResultsTable.tsx`

**Step 1: Create screener**

Client-side filtering of a predefined universe (~50 popular stocks).
Filters: Sector, Market Cap range, Price range, Change% range.
Results table with click-to-navigate to stock detail.

Note: This is a simplified screener since Yahoo Finance doesn't have a screener API. We fetch quotes for the predefined list and filter client-side.

**Step 2: Commit**

```bash
git add src/routes/screener.tsx src/components/screener/
git commit -m "feat: add stock screener with client-side filtering"
```

---

## Phase 7: Search Autocomplete Enhancement

### Task 18: Enhanced Search with Dropdown

**Files:**
- Modify: `src/components/layout/SearchBar.tsx` — add dropdown with results

**Step 1: Add debounced search with dropdown results**

Uses `useSearch` hook with 300ms debounce. Dropdown shows matching symbols with name, exchange, type. Click or Enter navigates to stock detail. Escape closes dropdown.

**Step 2: Commit**

```bash
git add src/components/layout/SearchBar.tsx
git commit -m "feat: enhance search bar with autocomplete dropdown"
```

---

## Phase 8: Zustand Preferences Store

### Task 19: User Preferences

**Files:**
- Create: `src/stores/preferences-store.ts`

**Step 1: Create preferences store**

```typescript
// src/stores/preferences-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Preferences {
  defaultInterval: string
  activeIndicators: string[]
  toggleIndicator: (indicator: string) => void
  setDefaultInterval: (interval: string) => void
}

export const usePreferencesStore = create<Preferences>()(
  persist(
    (set) => ({
      defaultInterval: '1d',
      activeIndicators: ['sma'],
      toggleIndicator: (indicator) =>
        set((s) => ({
          activeIndicators: s.activeIndicators.includes(indicator)
            ? s.activeIndicators.filter((i) => i !== indicator)
            : [...s.activeIndicators, indicator],
        })),
      setDefaultInterval: (interval) => set({ defaultInterval: interval }),
    }),
    { name: 'stocksense-preferences' }
  )
)
```

**Step 2: Commit**

```bash
git add src/stores/preferences-store.ts
git commit -m "feat: add Zustand preferences store with localStorage persistence"
```

---

## Phase 9: Docker, Deployment & Polish

### Task 20: Docker Compose for Local Development

**Files:**
- Create: `docker-compose.yml`
- Create: `server/Dockerfile`

**Step 1: Create docker-compose.yml**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5435:5432"
    environment:
      POSTGRES_DB: stocksense
      POSTGRES_USER: stocksense
      POSTGRES_PASSWORD: stocksense
    volumes:
      - pgdata:/var/lib/postgresql/data

  api:
    build: ./server
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://stocksense:stocksense@postgres:5432/stocksense
      PORT: "3001"
    depends_on:
      - postgres

volumes:
  pgdata:
```

Note: For local dev with Docker PostgreSQL, use `drizzle-orm/node-postgres` driver instead of `@neondatabase/serverless`. The Neon serverless driver is for production (Neon hosted). Create an environment-based toggle in `server/src/db/index.ts`.

**Step 2: Create server Dockerfile**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist/ ./dist/
ENV PORT=3001
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

**Step 3: Commit**

```bash
git add docker-compose.yml server/Dockerfile
git commit -m "feat: add Docker Compose for local dev and server Dockerfile"
```

---

### Task 21: Neon Database Setup

**Step 1: Create Neon project**

Go to https://neon.tech, create project "stocksense".
Copy connection string to `server/.env`.

**Step 2: Run migrations**

```bash
cd server
npx drizzle-kit push
```

**Step 3: Seed default data**

Create `server/src/db/seed.ts`:
- Default portfolio "My Portfolio"
- Default watchlist "Favorites" with AAPL, MSFT, GOOGL, AMZN, TSLA

```bash
npx tsx src/db/seed.ts
```

**Step 4: Commit**

```bash
git add server/src/db/seed.ts
git commit -m "feat: add database seed script"
```

---

### Task 22: Firebase Hosting + Cloud Run Deployment

**Files:**
- Create: `firebase.json`
- Create: `.firebaserc`
- Modify: `server/Dockerfile` — production build

**Step 1: Create Firebase project**

```bash
firebase projects:create stocksense-XXXXX
firebase init hosting
```

Configure `firebase.json`:
```json
{
  "hosting": {
    "public": "dist",
    "rewrites": [
      { "source": "/api/**", "run": { "serviceId": "stocksense-api", "region": "us-central1" } },
      { "source": "**", "destination": "/index.html" }
    ],
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"]
  }
}
```

**Step 2: Build and deploy SPA**

```bash
npm run build
firebase deploy --only hosting
```

**Step 3: Build and deploy API to Cloud Run**

```bash
cd server
npm run build
gcloud run deploy stocksense-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL=<neon_url>
```

**Step 4: Commit**

```bash
git add firebase.json .firebaserc
git commit -m "feat: add Firebase Hosting and Cloud Run deployment config"
```

---

### Task 23: Polish & Final Touches

**Step 1:** Add loading skeletons for all data-fetching components
**Step 2:** Add error boundaries with retry buttons
**Step 3:** Add empty states for portfolio (no holdings), watchlist (no items)
**Step 4:** Ensure all financial numbers use `tabular-nums` and monospace font
**Step 5:** Test all routes work with direct URL navigation (SPA fallback)
**Step 6:** Create README.md with screenshots, tech stack, setup instructions

**Step 7: Final commit**

```bash
git add -A
git commit -m "feat: add loading states, error boundaries, and polish"
```

---

### Task 24: Push to GitHub

```bash
git remote add origin https://github.com/briang7/stocksense.git
git push -u origin main
```

Update `PORTFOLIO_PROJECTS_PLAN.md` with:
- Status: COMPLETE
- GitHub URL
- Live URL
- Firebase project ID

---

## Port Assignments

| Port | Service |
|------|---------|
| 5174 | Vite dev server |
| 3001 | Hono API |
| 5435 | PostgreSQL (Docker) |

## Estimated Task Count: 24 tasks across 9 phases
