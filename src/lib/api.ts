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
export type Interval = '1m' | '5m' | '15m' | '30m' | '1h' | '1d' | '1wk' | '1mo'
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
