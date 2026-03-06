import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

export function SearchBar() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  return (
    <input
      type="text"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && query.trim()) {
          navigate({ to: '/stock/$ticker', params: { ticker: query.trim().toUpperCase() } })
          setQuery('')
        }
      }}
      placeholder="Search ticker or company..."
      className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
    />
  )
}
