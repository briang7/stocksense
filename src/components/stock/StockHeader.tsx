import type { StockQuote } from '@/lib/api'
import { formatPrice, formatPercent } from '@/lib/format'

interface StockHeaderProps {
  quote: StockQuote
}

export function StockHeader({ quote }: StockHeaderProps) {
  const isPositive = quote.change >= 0

  return (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-3xl font-bold">{quote.symbol}</h1>
        <span className="text-zinc-500">{quote.name}</span>
        <span className="text-xs text-zinc-600">{quote.exchange}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-3">
        <span className="text-3xl font-bold tabular-nums">{formatPrice(quote.price)}</span>
        <span className={`text-lg font-medium tabular-nums ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
          {isPositive ? '+' : ''}{formatPrice(quote.change)} ({formatPercent(quote.changePercent)})
        </span>
      </div>
    </div>
  )
}
