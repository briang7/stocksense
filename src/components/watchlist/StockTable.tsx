import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { WatchlistItem, StockQuote } from '@/lib/api'
import { useDeleteWatchlistItem, useAddWatchlistItem } from '@/hooks/useWatchlist'
import { formatPrice, formatPercent, formatVolume, formatLargeNumber } from '@/lib/format'

type SortKey = 'symbol' | 'price' | 'change' | 'changePercent' | 'volume' | 'marketCap'

interface StockTableProps {
  items: WatchlistItem[]
  quotes: Map<string, StockQuote>
  watchlistId: number
}

export function StockTable({ items, quotes, watchlistId }: StockTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('symbol')
  const [sortAsc, setSortAsc] = useState(true)
  const [addSymbol, setAddSymbol] = useState('')
  const deleteItem = useDeleteWatchlistItem(watchlistId)
  const addItem = useAddWatchlistItem(watchlistId)

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(true) }
  }

  const sorted = [...items].sort((a, b) => {
    const qa = quotes.get(a.symbol)
    const qb = quotes.get(b.symbol)
    if (!qa || !qb) return 0
    let cmp = 0
    switch (sortKey) {
      case 'symbol': cmp = a.symbol.localeCompare(b.symbol); break
      case 'price': cmp = qa.price - qb.price; break
      case 'change': cmp = qa.change - qb.change; break
      case 'changePercent': cmp = qa.changePercent - qb.changePercent; break
      case 'volume': cmp = qa.volume - qb.volume; break
      case 'marketCap': cmp = qa.marketCap - qb.marketCap; break
    }
    return sortAsc ? cmp : -cmp
  })

  const SortHeader = ({ k, label, align = 'right' }: { k: SortKey; label: string; align?: string }) => (
    <th
      className={`px-4 py-3 font-medium cursor-pointer hover:text-zinc-300 transition-colors ${align === 'left' ? 'text-left' : 'text-right'}`}
      onClick={() => handleSort(k)}
    >
      {label}{sortKey === k ? (sortAsc ? ' ↑' : ' ↓') : ''}
    </th>
  )

  return (
    <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 overflow-hidden">
      <div className="border-b border-zinc-800/50 p-3">
        <form onSubmit={(e) => {
          e.preventDefault()
          if (!addSymbol.trim()) return
          addItem.mutate(addSymbol.trim().toUpperCase(), { onSuccess: () => setAddSymbol('') })
        }} className="flex items-center gap-2">
          <input
            type="text"
            value={addSymbol}
            onChange={(e) => setAddSymbol(e.target.value)}
            placeholder="Add symbol..."
            className="w-32 rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
          />
          <button type="submit" className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 transition-colors">Add</button>
        </form>
      </div>

      {items.length === 0 ? (
        <div className="p-8 text-center text-zinc-500">No symbols in this watchlist. Add one above.</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800/50 text-xs text-zinc-500">
              <SortHeader k="symbol" label="Symbol" align="left" />
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <SortHeader k="price" label="Price" />
              <SortHeader k="change" label="Change" />
              <SortHeader k="changePercent" label="%" />
              <SortHeader k="volume" label="Volume" />
              <SortHeader k="marketCap" label="Mkt Cap" />
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => {
              const q = quotes.get(item.symbol)
              if (!q) return null
              const isPositive = q.change >= 0
              return (
                <tr key={item.id} className="border-b border-zinc-800/30 hover:bg-zinc-800/20">
                  <td className="px-4 py-3">
                    <Link to="/stock/$ticker" params={{ ticker: item.symbol }}
                      className="font-medium text-emerald-400 hover:underline">{item.symbol}</Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 truncate max-w-[160px]">{q.name}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatPrice(q.price)}</td>
                  <td className={`px-4 py-3 text-right tabular-nums ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isPositive ? '+' : ''}{formatPrice(q.change)}
                  </td>
                  <td className={`px-4 py-3 text-right tabular-nums ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatPercent(q.changePercent)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-400">{formatVolume(q.volume)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-400">{formatLargeNumber(q.marketCap)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => deleteItem.mutate(item.id)}
                      className="text-zinc-600 hover:text-red-400 transition-colors" title="Remove">×</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
