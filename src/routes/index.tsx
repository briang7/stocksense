import { createFileRoute } from '@tanstack/react-router'
import { IndexCard } from '@/components/market/IndexCard'
import { TopMovers } from '@/components/market/TopMovers'
import { SectorPerformance } from '@/components/market/SectorPerformance'
import { HeatmapChart } from '@/components/charts/HeatmapChart'

export const Route = createFileRoute('/')({
  component: MarketOverview,
})

const INDICES = [
  { symbol: '^GSPC', name: 'S&P 500' },
  { symbol: '^IXIC', name: 'NASDAQ' },
  { symbol: '^DJI', name: 'Dow Jones' },
]

function MarketOverview() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Market Overview</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {INDICES.map((idx) => (
          <IndexCard key={idx.symbol} symbol={idx.symbol} name={idx.name} />
        ))}
      </div>

      <HeatmapChart />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopMovers />
        <SectorPerformance />
      </div>
    </div>
  )
}
