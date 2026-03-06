import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/screener')({
  component: Screener,
})

function Screener() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Stock Screener</h1>
      <p className="text-zinc-500">Coming soon...</p>
    </div>
  )
}
