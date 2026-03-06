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
