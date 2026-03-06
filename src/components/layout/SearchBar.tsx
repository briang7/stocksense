import { useState, useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useSearch } from '@/hooks/useStockData'

export function SearchBar() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const { data: results } = useSearch(debouncedQuery)
  const showDropdown = open && query.length >= 1 && results && results.length > 0

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const goToStock = (symbol: string) => {
    navigate({ to: '/stock/$ticker', params: { ticker: symbol } })
    setQuery('')
    setOpen(false)
    setSelectedIdx(-1)
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setSelectedIdx(-1) }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { setOpen(false); return }
          if (!showDropdown) {
            if (e.key === 'Enter' && query.trim()) goToStock(query.trim().toUpperCase())
            return
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedIdx((i) => Math.min(i + 1, results!.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedIdx((i) => Math.max(i - 1, 0))
          } else if (e.key === 'Enter') {
            e.preventDefault()
            if (selectedIdx >= 0 && results![selectedIdx]) {
              goToStock(results![selectedIdx].symbol)
            } else if (query.trim()) {
              goToStock(query.trim().toUpperCase())
            }
          }
        }}
        placeholder="Search ticker or company..."
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
      />
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl">
          {results!.map((r, i) => (
            <button
              key={r.symbol}
              onClick={() => goToStock(r.symbol)}
              onMouseEnter={() => setSelectedIdx(i)}
              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                i === selectedIdx ? 'bg-zinc-800' : 'hover:bg-zinc-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-16 font-medium text-emerald-400">{r.symbol}</span>
                <span className="text-zinc-400 truncate max-w-[160px]">{r.name}</span>
              </div>
              <span className="text-xs text-zinc-600">{r.exchange}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
