import type { Watchlist } from '@/lib/api'
import { useCreateWatchlist } from '@/hooks/useWatchlist'
import { useState } from 'react'

interface WatchlistTabsProps {
  watchlists: Watchlist[]
  activeId: number
  onSelect: (id: number) => void
}

export function WatchlistTabs({ watchlists, activeId, onSelect }: WatchlistTabsProps) {
  const [newName, setNewName] = useState('')
  const createWatchlist = useCreateWatchlist()

  return (
    <div className="flex items-center gap-1 border-b border-zinc-800/50 pb-2">
      {watchlists.map((w) => (
        <button
          key={w.id}
          onClick={() => onSelect(w.id)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            activeId === w.id
              ? 'bg-emerald-400/10 text-emerald-400'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          {w.name}
        </button>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!newName.trim()) return
          createWatchlist.mutate(newName.trim(), {
            onSuccess: (w) => { onSelect(w.id); setNewName('') }
          })
        }}
        className="ml-2 flex items-center gap-1"
      >
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New list..."
          className="w-28 rounded-md border border-zinc-800 bg-zinc-900/50 px-2 py-1 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
        />
        <button type="submit" className="rounded-md bg-zinc-800 px-2 py-1 text-xs hover:bg-zinc-700 transition-colors">+</button>
      </form>
    </div>
  )
}
