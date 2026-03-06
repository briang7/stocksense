import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/portfolio')({
  component: Portfolio,
})

function Portfolio() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Portfolio</h1>
      <p className="text-zinc-500">Coming soon...</p>
    </div>
  )
}
