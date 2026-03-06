import { useQuery, useQueries } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { StockQuote } from '@/lib/api'

export function useChart(symbol: string, interval = '1d', period1?: number, period2?: number) {
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
  const queries = useQueries({
    queries: symbols.map((symbol) => ({
      queryKey: ['quote', symbol],
      queryFn: () => api.stocks.quote(symbol),
      refetchInterval: 60_000,
      staleTime: 30_000,
    })),
  })

  const data = queries
    .filter((q) => q.data != null)
    .map((q) => q.data as StockQuote)

  const isLoading = queries.length > 0 && data.length === 0

  return { data, isLoading }
}

export function useSearch(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: () => api.stocks.search(query),
    enabled: query.length >= 1,
    staleTime: 300_000,
  })
}
