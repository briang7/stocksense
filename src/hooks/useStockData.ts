import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

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
