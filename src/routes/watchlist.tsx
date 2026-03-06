import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/watchlist')({
  component: Watchlist,
})

function Watchlist() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Watchlists</h1>
      <p className="text-zinc-500">Coming soon...</p>
    </div>
  )
}
