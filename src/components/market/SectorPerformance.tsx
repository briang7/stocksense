import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts'
import { useQuotes } from '@/hooks/useStockData'

const SECTORS = [
  { symbol: 'XLK', name: 'Tech' },
  { symbol: 'XLF', name: 'Finance' },
  { symbol: 'XLV', name: 'Health' },
  { symbol: 'XLE', name: 'Energy' },
  { symbol: 'XLY', name: 'Consumer' },
  { symbol: 'XLI', name: 'Industrial' },
  { symbol: 'XLB', name: 'Materials' },
  { symbol: 'XLP', name: 'Staples' },
  { symbol: 'XLRE', name: 'Real Est' },
  { symbol: 'XLU', name: 'Utilities' },
  { symbol: 'XLC', name: 'Comm' },
]

export function SectorPerformance() {
  const { data: quotes, isLoading } = useQuotes(SECTORS.map((s) => s.symbol))

  if (isLoading || !quotes) {
    return (
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4">
        <div className="h-48 animate-pulse rounded bg-zinc-800/50" />
      </div>
    )
  }

  const chartData = SECTORS.map((sector) => {
    const quote = quotes.find((q) => q.symbol === sector.symbol)
    return {
      name: sector.name,
      change: quote?.changePercent ?? 0,
    }
  }).sort((a, b) => b.change - a.change)

  return (
    <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4">
      <h3 className="mb-3 text-sm font-medium text-zinc-400">Sector Performance</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 60, right: 40 }}>
          <XAxis type="number" tickFormatter={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`}
            tick={{ fill: '#71717a', fontSize: 10 }} axisLine={{ stroke: '#27272a' }} tickLine={false} />
          <YAxis type="category" dataKey="name" width={55}
            tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(value: number) => [`${value >= 0 ? '+' : ''}${value.toFixed(2)}%`, 'Change']}
            contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: '#a1a1aa' }}
          />
          <Bar dataKey="change" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.change >= 0 ? '#10b981' : '#ef4444'} fillOpacity={0.7} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
