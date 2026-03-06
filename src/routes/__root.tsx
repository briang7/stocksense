import { createRootRoute, Outlet } from '@tanstack/react-router'
import { Navbar } from '@/components/layout/Navbar'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  )
}
