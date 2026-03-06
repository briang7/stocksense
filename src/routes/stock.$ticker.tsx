import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/stock/$ticker')({
  component: StockDetail,
})

function StockDetail() {
  const { ticker } = Route.useParams()
  return (
    <div>
      <h1 className="text-2xl font-bold">{ticker}</h1>
      <p className="text-zinc-500">Stock detail coming soon...</p>
    </div>
  )
}
