import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: MarketOverview,
})

function MarketOverview() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Market Overview</h1>
      <p className="text-zinc-500">Coming soon...</p>
    </div>
  )
}
