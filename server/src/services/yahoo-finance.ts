import { RateLimiter } from './rate-limiter.js'
import { persistentCache } from './cache.js'

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
        previousClose?: number
        chartPreviousClose?: number
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

const rateLimiter = new RateLimiter(500)

export type Interval = '1m' | '5m' | '15m' | '30m' | '1h' | '1d' | '1wk' | '1mo'

function parseChartData(data: ChartResponse, symbol: string): { bars: OhlcvBar[]; quote: StockQuote } {
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
  const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? meta.regularMarketPrice
  if (meta.shortName) nameCache.set(meta.symbol, meta.shortName)
  const quote: StockQuote = {
    symbol: meta.symbol,
    price: meta.regularMarketPrice,
    change: meta.regularMarketPrice - prevClose,
    changePercent: prevClose ? ((meta.regularMarketPrice - prevClose) / prevClose) * 100 : 0,
    volume: meta.regularMarketVolume ?? 0,
    marketCap: meta.marketCap ?? 0,
    name: meta.shortName ?? symbol,
    exchange: meta.exchangeName,
  }

  return { bars, quote }
}

async function fetchFromYahoo(symbol: string, interval: Interval, period1?: number, period2?: number): Promise<{ bars: OhlcvBar[]; quote: StockQuote }> {
  const params = new URLSearchParams({
    interval,
    events: 'history',
  })

  if (period1) params.set('period1', String(Math.floor(period1 / 1000)))
  if (period2) params.set('period2', String(Math.floor(period2 / 1000)))
  if (!period1 && !period2) {
    params.set('range', interval === '1d' ? '1y' : interval === '1wk' ? '5y' : interval === '1mo' ? 'max' : '5d')
  }

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${params}`

  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  })

  if (res.status === 404) throw new Error(`Symbol not found: ${symbol}`)
  if (res.status === 429) throw new Error('Rate limit exceeded, retry later')
  if (!res.ok) throw new Error(`Yahoo Finance API error: ${res.status}`)

  const data: ChartResponse = await res.json()
  return parseChartData(data, symbol)
}

export async function fetchChart(
  symbol: string,
  interval: Interval = '1d',
  period1?: number,
  period2?: number
): Promise<{ bars: OhlcvBar[]; quote: StockQuote }> {
  const cacheKey = `chart:${symbol}:${interval}:${period1}:${period2}`
  const ttl = interval === '1m' || interval === '5m' ? 15_000 : 60_000

  const entry = persistentCache.get<{ bars: OhlcvBar[]; quote: StockQuote }>(cacheKey)
  if (entry && !entry.stale) return entry.data

  // Return stale data immediately, refresh in background
  if (entry?.stale && !persistentCache.isRefreshing(cacheKey)) {
    persistentCache.markRefreshing(cacheKey)
    rateLimiter.enqueue(async () => {
      try {
        const fresh = await fetchFromYahoo(symbol, interval, period1, period2)
        persistentCache.set(cacheKey, fresh, ttl)
      } catch {
        // Keep stale data
      } finally {
        persistentCache.clearRefreshing(cacheKey)
      }
    }, 0)
    return entry.data
  }

  // No cached data at all — must fetch synchronously
  return rateLimiter.enqueue(async () => {
    const response = await fetchFromYahoo(symbol, interval, period1, period2)
    persistentCache.set(cacheKey, response, ttl)
    return response
  }, 0)
}

export async function fetchQuote(symbol: string): Promise<StockQuote> {
  const cacheKey = `quote:${symbol}`

  const entry = persistentCache.get<StockQuote>(cacheKey)
  if (entry && !entry.stale) return entry.data

  // Return stale data immediately, refresh in background
  if (entry?.stale && !persistentCache.isRefreshing(cacheKey)) {
    persistentCache.markRefreshing(cacheKey)
    refreshQuote(symbol, cacheKey).finally(() => {
      persistentCache.clearRefreshing(cacheKey)
    })
    return entry.data
  }

  // No cached data — fetch synchronously
  return refreshQuote(symbol, cacheKey)
}

async function refreshQuote(symbol: string, cacheKey: string): Promise<StockQuote> {
  const now = Date.now()
  const fiveDaysAgo = now - 5 * 24 * 60 * 60 * 1000
  const { bars, quote } = await fetchChart(symbol, '1d', fiveDaysAgo, now)
  if (bars.length >= 2) {
    const prevClose = bars[bars.length - 2].close
    const currentClose = bars[bars.length - 1].close
    quote.change = currentClose - prevClose
    quote.changePercent = prevClose ? ((currentClose - prevClose) / prevClose) * 100 : 0
  }
  persistentCache.set(cacheKey, quote, 60_000)
  return quote
}

// Cache of symbol -> name, populated from chart meta responses
const nameCache = new Map<string, string>()

// Spark response: { "AAPL": { symbol, close: [...], chartPreviousClose, ... }, ... }
interface SparkEntry {
  symbol: string
  close: (number | null)[]
  chartPreviousClose?: number
  previousClose?: number | null
  timestamp?: number[]
}

export async function fetchMultipleQuotes(symbols: string[]): Promise<StockQuote[]> {
  const cacheKey = `quotes:${[...symbols].sort().join(',')}`

  const entry = persistentCache.get<StockQuote[]>(cacheKey)
  if (entry && !entry.stale) return entry.data

  // Return stale data immediately, refresh in background
  if (entry?.stale && !persistentCache.isRefreshing(cacheKey)) {
    persistentCache.markRefreshing(cacheKey)
    refreshMultipleQuotes(symbols, cacheKey).finally(() => {
      persistentCache.clearRefreshing(cacheKey)
    })
    return entry.data
  }

  // No cached data — fetch synchronously
  return refreshMultipleQuotes(symbols, cacheKey)
}

async function refreshMultipleQuotes(symbols: string[], cacheKey: string): Promise<StockQuote[]> {
  return rateLimiter.enqueue(async () => {
    const url = `https://query1.finance.yahoo.com/v8/finance/spark?symbols=${encodeURIComponent(symbols.join(','))}&range=5d&interval=1d`

    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    })

    if (!res.ok) {
      // Fallback to sequential individual fetches
      const results: StockQuote[] = []
      for (const s of symbols) {
        results.push(await fetchQuote(s))
      }
      persistentCache.set(cacheKey, results, 60_000)
      return results
    }

    const data: Record<string, SparkEntry> = await res.json()

    const results: StockQuote[] = symbols.map((sym) => {
      const spark = data[sym]
      if (!spark) {
        return { symbol: sym, price: 0, change: 0, changePercent: 0, volume: 0, marketCap: 0, name: sym, exchange: '' }
      }

      const closes = (spark.close || []).filter((c): c is number => c != null)
      const price = closes.length > 0 ? closes[closes.length - 1] : 0
      let change = 0
      let changePercent = 0

      if (closes.length >= 2) {
        const prev = closes[closes.length - 2]
        change = price - prev
        changePercent = prev ? ((price - prev) / prev) * 100 : 0
      } else if (spark.chartPreviousClose) {
        change = price - spark.chartPreviousClose
        changePercent = spark.chartPreviousClose ? ((price - spark.chartPreviousClose) / spark.chartPreviousClose) * 100 : 0
      }

      return {
        symbol: spark.symbol ?? sym,
        price,
        change,
        changePercent,
        volume: 0,
        marketCap: 0,
        name: nameCache.get(sym) ?? sym,
        exchange: '',
      }
    })

    persistentCache.set(cacheKey, results, 60_000)
    return results
  }, 0)
}

export async function searchSymbols(query: string): Promise<SearchResult[]> {
  const cacheKey = `search:${query}`

  const entry = persistentCache.get<SearchResult[]>(cacheKey)
  if (entry && !entry.stale) return entry.data
  if (entry?.stale) {
    // Search results can be very stale, just return them
    return entry.data
  }

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

    persistentCache.set(cacheKey, results, 300_000)
    return results
  }, 0)
}
