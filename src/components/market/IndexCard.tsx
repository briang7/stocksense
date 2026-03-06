import { Link } from '@tanstack/react-router'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { useChart } from '@/hooks/useStockData'
import { formatPrice, formatPercent } from '@/lib/format'

interface IndexCardProps {
  symbol: string
  name: string
}

export function IndexCard({ symbol, name }: IndexCardProps) {
  const { data, isLoading } = useChart(symbol, '1d')

  if (isLoading || !data) {
    return (
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4">
        <div className="h-20 animate-pulse rounded bg-zinc-800/50" />
      </div>
    )
  }

  const { quote, bars } = data
  const isPositive = quote.change >= 0
  const sparkData = bars.slice(-30).map((b) => ({ v: b.close }))

  return (
    <Link
      to="/stock/$ticker"
      params={{ ticker: symbol }}
      className="block rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4 transition-colors hover:border-zinc-700/50 hover:bg-zinc-900/50"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-zinc-500">{name}</div>
          <div className="mt-0.5 text-lg font-bold tabular-nums">{formatPrice(quote.price)}</div>
          <div className={`text-sm font-medium tabular-nums ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{formatPrice(quote.change)} ({formatPercent(quote.changePercent)})
          </div>
        </div>
        <div className="h-12 w-24">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={isPositive ? '#10b981' : '#ef4444'}
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Link>
  )
}
