import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useWatchlists, useWatchlist } from '@/hooks/useWatchlist'
import { useQuotes } from '@/hooks/useStockData'
import { WatchlistTabs } from '@/components/watchlist/WatchlistTabs'
import { StockTable } from '@/components/watchlist/StockTable'
import { PriceAlerts } from '@/components/watchlist/PriceAlerts'
import type { StockQuote } from '@/lib/api'

export const Route = createFileRoute('/watchlist')({
  component: WatchlistPage,
})

function WatchlistPage() {
  const { data: watchlists, isLoading } = useWatchlists()
  const [activeId, setActiveId] = useState<number>(0)

  const selectedId = activeId || watchlists?.[0]?.id || 0
  const { data: watchlist } = useWatchlist(selectedId)

  const symbols = useMemo(() =>
    watchlist?.items?.map((i) => i.symbol) ?? [], [watchlist])
  const { data: quotesArray } = useQuotes(symbols)

  const quotesMap = useMemo(() => {
    const map = new Map<string, StockQuote>()
    quotesArray?.forEach((q) => map.set(q.symbol, q))
    return map
  }, [quotesArray])

  if (isLoading) {
    return <div className="flex h-96 items-center justify-center text-zinc-500">Loading watchlists...</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Watchlists</h1>

      {watchlists && watchlists.length > 0 && (
        <WatchlistTabs
          watchlists={watchlists}
          activeId={selectedId}
          onSelect={setActiveId}
        />
      )}

      {watchlist && (
        <StockTable items={watchlist.items} quotes={quotesMap} watchlistId={selectedId} />
      )}

      <PriceAlerts />
    </div>
  )
}
