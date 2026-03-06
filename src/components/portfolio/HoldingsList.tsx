import { Link } from '@tanstack/react-router'
import type { Holding, StockQuote } from '@/lib/api'
import { formatPrice, formatPercent } from '@/lib/format'
import { useDeleteHolding } from '@/hooks/usePortfolio'

interface HoldingsListProps {
  holdings: Holding[]
  quotes: Map<string, StockQuote>
  portfolioId: number
}

export function HoldingsList({ holdings, quotes, portfolioId }: HoldingsListProps) {
  const deleteHolding = useDeleteHolding(portfolioId)

  if (holdings.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-8 text-center">
        <p className="text-zinc-500">No holdings yet. Add your first stock below.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800/50 text-xs text-zinc-500">
            <th className="px-4 py-3 text-left font-medium">Symbol</th>
            <th className="px-4 py-3 text-right font-medium">Shares</th>
            <th className="px-4 py-3 text-right font-medium">Avg Cost</th>
            <th className="px-4 py-3 text-right font-medium">Price</th>
            <th className="px-4 py-3 text-right font-medium">Value</th>
            <th className="px-4 py-3 text-right font-medium">Gain/Loss</th>
            <th className="px-4 py-3 text-right font-medium">%</th>
            <th className="px-4 py-3 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => {
            const quote = quotes.get(h.symbol)
            const currentPrice = quote?.price ?? h.buyPrice
            const value = currentPrice * h.shares
            const cost = h.buyPrice * h.shares
            const gain = value - cost
            const gainPct = cost > 0 ? (gain / cost) * 100 : 0
            const isPositive = gain >= 0

            return (
              <tr key={h.id} className="border-b border-zinc-800/30 hover:bg-zinc-800/20">
                <td className="px-4 py-3">
                  <Link to="/stock/$ticker" params={{ ticker: h.symbol }}
                    className="font-medium text-emerald-400 hover:underline">{h.symbol}</Link>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{h.shares}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatPrice(h.buyPrice)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatPrice(currentPrice)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatPrice(value)}</td>
                <td className={`px-4 py-3 text-right tabular-nums ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isPositive ? '+' : ''}{formatPrice(gain)}
                </td>
                <td className={`px-4 py-3 text-right tabular-nums ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatPercent(gainPct)}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => deleteHolding.mutate(h.id)}
                    className="text-zinc-600 hover:text-red-400 transition-colors"
                    title="Remove holding"
                  >×</button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
