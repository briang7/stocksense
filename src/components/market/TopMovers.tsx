import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuotes } from '@/hooks/useStockData'
import { formatPrice, formatPercent, formatVolume } from '@/lib/format'

const POPULAR_TICKERS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK-B',
  'JPM', 'V', 'UNH', 'MA', 'HD', 'PG', 'XOM', 'JNJ', 'BAC', 'COST',
  'ABBV', 'CRM',
]

type Tab = 'gainers' | 'losers' | 'active'

export function TopMovers() {
  const [tab, setTab] = useState<Tab>('gainers')
  const { data: quotes, isLoading } = useQuotes(POPULAR_TICKERS)

  if (isLoading || !quotes) {
    return (
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4">
        <div className="h-64 animate-pulse rounded bg-zinc-800/50" />
      </div>
    )
  }

  const sorted = [...quotes].sort((a, b) => {
    if (tab === 'gainers') return b.changePercent - a.changePercent
    if (tab === 'losers') return a.changePercent - b.changePercent
    return b.volume - a.volume
  })

  const display = sorted.slice(0, 8)

  return (
    <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4">
      <div className="mb-3 flex items-center gap-1">
        {(['gainers', 'losers', 'active'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              tab === t
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t === 'gainers' ? 'Gainers' : t === 'losers' ? 'Losers' : 'Most Active'}
          </button>
        ))}
      </div>
      <div className="space-y-1">
        {display.map((q) => {
          const isPositive = q.changePercent >= 0
          return (
            <Link
              key={q.symbol}
              to="/stock/$ticker"
              params={{ ticker: q.symbol }}
              className="flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-zinc-800/50"
            >
              <div className="flex items-center gap-3">
                <span className="w-14 text-sm font-medium">{q.symbol}</span>
                <span className="text-xs text-zinc-500 truncate max-w-[120px]">{q.name}</span>
              </div>
              <div className="flex items-center gap-4 tabular-nums">
                <span className="text-sm">{formatPrice(q.price)}</span>
                <span className={`w-20 text-right text-sm font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatPercent(q.changePercent)}
                </span>
                {tab === 'active' && (
                  <span className="w-16 text-right text-xs text-zinc-500">{formatVolume(q.volume)}</span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
