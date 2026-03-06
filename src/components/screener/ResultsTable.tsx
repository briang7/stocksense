import { Link } from '@tanstack/react-router'
import type { StockQuote } from '@/lib/api'
import { formatPrice, formatPercent, formatVolume, formatLargeNumber } from '@/lib/format'

interface ResultsTableProps {
  quotes: StockQuote[]
}

export function ResultsTable({ quotes }: ResultsTableProps) {
  if (quotes.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-8 text-center text-zinc-500">
        No stocks match your filters.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800/50 text-xs text-zinc-500">
            <th className="px-4 py-3 text-left font-medium">Symbol</th>
            <th className="px-4 py-3 text-left font-medium">Name</th>
            <th className="px-4 py-3 text-right font-medium">Price</th>
            <th className="px-4 py-3 text-right font-medium">Change</th>
            <th className="px-4 py-3 text-right font-medium">%</th>
            <th className="px-4 py-3 text-right font-medium">Volume</th>
            <th className="px-4 py-3 text-right font-medium">Mkt Cap</th>
          </tr>
        </thead>
        <tbody>
          {quotes.map((q) => {
            const isPositive = q.change >= 0
            return (
              <tr key={q.symbol} className="border-b border-zinc-800/30 hover:bg-zinc-800/20">
                <td className="px-4 py-3">
                  <Link to="/stock/$ticker" params={{ ticker: q.symbol }}
                    className="font-medium text-emerald-400 hover:underline">{q.symbol}</Link>
                </td>
                <td className="px-4 py-3 text-zinc-400 truncate max-w-[180px]">{q.name}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatPrice(q.price)}</td>
                <td className={`px-4 py-3 text-right tabular-nums ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isPositive ? '+' : ''}{formatPrice(q.change)}
                </td>
                <td className={`px-4 py-3 text-right tabular-nums ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatPercent(q.changePercent)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-400">{formatVolume(q.volume)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-400">{formatLargeNumber(q.marketCap)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="border-t border-zinc-800/50 px-4 py-2 text-xs text-zinc-600">
        {quotes.length} result{quotes.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
