import type { Holding, StockQuote } from '@/lib/api'
import { formatPrice, formatPercent } from '@/lib/format'

interface PortfolioSummaryProps {
  holdings: Holding[]
  quotes: Map<string, StockQuote>
}

export function PortfolioSummary({ holdings, quotes }: PortfolioSummaryProps) {
  let totalValue = 0
  let totalCost = 0

  for (const h of holdings) {
    const quote = quotes.get(h.symbol)
    const currentPrice = quote?.price ?? h.buyPrice
    totalValue += currentPrice * h.shares
    totalCost += h.buyPrice * h.shares
  }

  const totalGain = totalValue - totalCost
  const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0
  const isPositive = totalGain >= 0

  return (
    <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-5">
      <div className="text-sm text-zinc-500">Total Value</div>
      <div className="mt-1 text-3xl font-bold tabular-nums">{formatPrice(totalValue)}</div>
      <div className={`mt-1 text-sm font-medium tabular-nums ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
        {isPositive ? '+' : ''}{formatPrice(totalGain)} ({formatPercent(totalGainPercent)})
      </div>
    </div>
  )
}
