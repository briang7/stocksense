import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { usePortfolios, usePortfolio, useCreatePortfolio } from '@/hooks/usePortfolio'
import { useQuotes } from '@/hooks/useStockData'
import { usePortfolioStore } from '@/stores/portfolio-store'
import { PortfolioSummary } from '@/components/portfolio/PortfolioSummary'
import { HoldingsList } from '@/components/portfolio/HoldingsList'
import { AddHolding } from '@/components/portfolio/AddHolding'
import { PortfolioDonut } from '@/components/charts/PortfolioDonut'
import type { StockQuote } from '@/lib/api'

export const Route = createFileRoute('/portfolio')({
  component: PortfolioPage,
})

function PortfolioPage() {
  const { data: portfolios, isLoading: loadingList } = usePortfolios()
  const { activePortfolioId, setActivePortfolio } = usePortfolioStore()
  const createPortfolio = useCreatePortfolio()
  const [newName, setNewName] = useState('')

  const selectedId = activePortfolioId ?? portfolios?.[0]?.id ?? 0
  const { data: portfolio } = usePortfolio(selectedId)

  const holdingSymbols = useMemo(() =>
    portfolio?.holdings?.map((h) => h.symbol) ?? [], [portfolio])
  const { data: quotesArray } = useQuotes(holdingSymbols)

  const quotesMap = useMemo(() => {
    const map = new Map<string, StockQuote>()
    quotesArray?.forEach((q) => map.set(q.symbol, q))
    return map
  }, [quotesArray])

  if (loadingList) {
    return <div className="flex h-96 items-center justify-center text-zinc-500">Loading portfolios...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Portfolio</h1>
        <div className="flex items-center gap-2">
          <select
            value={selectedId}
            onChange={(e) => setActivePortfolio(Number(e.target.value))}
            className="rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-sm text-zinc-100 focus:outline-none"
          >
            {portfolios?.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!newName.trim()) return
              createPortfolio.mutate(newName.trim(), {
                onSuccess: (p) => { setActivePortfolio(p.id); setNewName('') }
              })
            }}
            className="flex items-center gap-1"
          >
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New portfolio..."
              className="w-36 rounded-md border border-zinc-800 bg-zinc-900/50 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
            />
            <button type="submit" className="rounded-md bg-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-700 transition-colors">+</button>
          </form>
        </div>
      </div>

      {portfolio && (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <PortfolioSummary holdings={portfolio.holdings} quotes={quotesMap} />
            </div>
            <PortfolioDonut holdings={portfolio.holdings} quotes={quotesMap} />
          </div>

          <HoldingsList holdings={portfolio.holdings} quotes={quotesMap} portfolioId={selectedId} />
          <AddHolding portfolioId={selectedId} />
        </>
      )}

      {!portfolio && !loadingList && (
        <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-8 text-center">
          <p className="text-zinc-500">Create your first portfolio to get started.</p>
        </div>
      )}
    </div>
  )
}
