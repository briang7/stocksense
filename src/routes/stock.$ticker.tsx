import { createFileRoute } from '@tanstack/react-router'
import { useChart } from '@/hooks/useStockData'
import { CandlestickChart } from '@/components/charts/CandlestickChart'
import { formatPrice, formatPercent } from '@/lib/format'

export const Route = createFileRoute('/stock/$ticker')({
  component: StockDetail,
})

function StockDetail() {
  const { ticker } = Route.useParams()
  const { data, isLoading, error } = useChart(ticker)

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-zinc-500">Loading {ticker}...</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-red-400">Failed to load {ticker}: {error?.message}</div>
      </div>
    )
  }

  const { bars, quote } = data
  const isPositive = quote.change >= 0

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-baseline gap-3">
          <h1 className="text-3xl font-bold">{quote.symbol}</h1>
          <span className="text-zinc-500">{quote.name}</span>
        </div>
        <div className="mt-1 flex items-baseline gap-3">
          <span className="text-3xl font-bold tabular-nums">{formatPrice(quote.price)}</span>
          <span className={`text-lg font-medium tabular-nums ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{formatPrice(quote.change)} ({formatPercent(quote.changePercent)})
          </span>
        </div>
      </div>
      <CandlestickChart bars={bars} height={500} interval="1d" />
    </div>
  )
}
