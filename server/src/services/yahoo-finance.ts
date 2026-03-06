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

    setCache(cacheKey, results, 300_000)
    return results
  }, 0)
}
