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
