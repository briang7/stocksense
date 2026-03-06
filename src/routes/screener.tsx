import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useQuotes } from '@/hooks/useStockData'
import { FilterForm, type Filters } from '@/components/screener/FilterForm'
import { ResultsTable } from '@/components/screener/ResultsTable'

export const Route = createFileRoute('/screener')({
  component: ScreenerPage,
})

const UNIVERSE = [
  { symbol: 'AAPL', sector: 'Tech' }, { symbol: 'MSFT', sector: 'Tech' },
  { symbol: 'GOOGL', sector: 'Tech' }, { symbol: 'AMZN', sector: 'Tech' },
  { symbol: 'NVDA', sector: 'Tech' }, { symbol: 'META', sector: 'Tech' },
  { symbol: 'TSLA', sector: 'Consumer' }, { symbol: 'BRK-B', sector: 'Finance' },
  { symbol: 'JPM', sector: 'Finance' }, { symbol: 'V', sector: 'Finance' },
  { symbol: 'UNH', sector: 'Health' }, { symbol: 'MA', sector: 'Finance' },
  { symbol: 'HD', sector: 'Consumer' }, { symbol: 'PG', sector: 'Staples' },
  { symbol: 'XOM', sector: 'Energy' }, { symbol: 'JNJ', sector: 'Health' },
  { symbol: 'BAC', sector: 'Finance' }, { symbol: 'COST', sector: 'Staples' },
  { symbol: 'ABBV', sector: 'Health' }, { symbol: 'CRM', sector: 'Tech' },
  { symbol: 'CVX', sector: 'Energy' }, { symbol: 'NFLX', sector: 'Tech' },
  { symbol: 'AMD', sector: 'Tech' }, { symbol: 'PFE', sector: 'Health' },
  { symbol: 'INTC', sector: 'Tech' }, { symbol: 'DIS', sector: 'Consumer' },
  { symbol: 'BA', sector: 'Industrial' }, { symbol: 'CAT', sector: 'Industrial' },
  { symbol: 'GS', sector: 'Finance' }, { symbol: 'NEE', sector: 'Utilities' },
  { symbol: 'ADBE', sector: 'Tech' }, { symbol: 'PYPL', sector: 'Tech' },
  { symbol: 'T', sector: 'Comm' }, { symbol: 'VZ', sector: 'Comm' },
  { symbol: 'MRK', sector: 'Health' }, { symbol: 'LLY', sector: 'Health' },
  { symbol: 'WMT', sector: 'Staples' }, { symbol: 'KO', sector: 'Staples' },
  { symbol: 'PEP', sector: 'Staples' }, { symbol: 'TMO', sector: 'Health' },
  { symbol: 'CSCO', sector: 'Tech' }, { symbol: 'ORCL', sector: 'Tech' },
  { symbol: 'ACN', sector: 'Tech' }, { symbol: 'ABT', sector: 'Health' },
  { symbol: 'DHR', sector: 'Health' }, { symbol: 'TXN', sector: 'Tech' },
  { symbol: 'QCOM', sector: 'Tech' }, { symbol: 'UPS', sector: 'Industrial' },
  { symbol: 'LOW', sector: 'Consumer' }, { symbol: 'SBUX', sector: 'Consumer' },
]

const sectorMap = new Map(UNIVERSE.map((u) => [u.symbol, u.sector]))

function ScreenerPage() {
  const [filters, setFilters] = useState<Filters>({
    sector: 'All', minPrice: '', maxPrice: '', minChange: '', maxChange: '',
  })

  const symbols = UNIVERSE.map((u) => u.symbol)
  const { data: quotes, isLoading } = useQuotes(symbols)

  const filtered = useMemo(() => {
    if (!quotes) return []
    return quotes.filter((q) => {
      if (filters.sector !== 'All' && sectorMap.get(q.symbol) !== filters.sector) return false
      if (filters.minPrice && q.price < Number(filters.minPrice)) return false
      if (filters.maxPrice && q.price > Number(filters.maxPrice)) return false
      if (filters.minChange && q.changePercent < Number(filters.minChange)) return false
      if (filters.maxChange && q.changePercent > Number(filters.maxChange)) return false
      return true
    })
  }, [quotes, filters])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Stock Screener</h1>
      <FilterForm filters={filters} onChange={setFilters} />
      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-zinc-500">Loading stocks...</div>
      ) : (
        <ResultsTable quotes={filtered} />
      )}
    </div>
  )
}
