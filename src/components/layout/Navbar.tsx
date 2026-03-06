import { Link } from '@tanstack/react-router'
import { SearchBar } from './SearchBar'

export function Navbar() {
  const links = [
    { to: '/' as const, label: 'Market' },
    { to: '/watchlist' as const, label: 'Watchlist' },
    { to: '/screener' as const, label: 'Screener' },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/50 bg-[#0a0a0f]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
        <Link to="/" className="text-lg font-bold tracking-tight">
          <span className="text-emerald-400">Stock</span>Sense
        </Link>
        <nav className="flex items-center gap-1">
          {links.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-100"
              activeProps={{ className: 'rounded-md px-3 py-1.5 text-sm font-medium text-emerald-400 bg-emerald-400/10' }}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto w-72">
          <SearchBar />
        </div>
      </div>
    </header>
  )
}
