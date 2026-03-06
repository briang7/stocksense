import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { Holding, StockQuote } from '@/lib/api'
import { formatPrice } from '@/lib/format'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16']

interface PortfolioDonutProps {
  holdings: Holding[]
  quotes: Map<string, StockQuote>
}

export function PortfolioDonut({ holdings, quotes }: PortfolioDonutProps) {
  if (holdings.length === 0) return null

  const data = holdings.map((h) => {
    const price = quotes.get(h.symbol)?.price ?? h.buyPrice
    return { name: h.symbol, value: price * h.shares }
  }).sort((a, b) => b.value - a.value)

  return (
    <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4">
      <h3 className="mb-3 text-sm font-medium text-zinc-400">Allocation</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100}
            dataKey="value" stroke="none" paddingAngle={2}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => formatPrice(value)}
            contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className="text-zinc-400">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
