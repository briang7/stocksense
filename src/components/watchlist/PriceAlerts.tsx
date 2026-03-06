import { useState } from 'react'
import { usePriceAlerts, useCreateAlert } from '@/hooks/useWatchlist'
import { formatPrice } from '@/lib/format'
import { api } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'

export function PriceAlerts() {
  const { data: alerts } = usePriceAlerts()
  const createAlert = useCreateAlert()
  const qc = useQueryClient()

  const [symbol, setSymbol] = useState('')
  const [targetPrice, setTargetPrice] = useState('')
  const [direction, setDirection] = useState<'above' | 'below'>('above')

  const inputClass = 'rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-sm text-zinc-100 focus:outline-none'

  return (
    <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4">
      <h3 className="mb-3 text-sm font-medium text-zinc-400">Price Alerts</h3>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!symbol || !targetPrice) return
          createAlert.mutate(
            { symbol: symbol.toUpperCase(), targetPrice: Number(targetPrice), direction },
            { onSuccess: () => { setSymbol(''); setTargetPrice('') } }
          )
        }}
        className="mb-4 flex items-end gap-2"
      >
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Symbol</label>
          <input type="text" value={symbol} onChange={(e) => setSymbol(e.target.value)}
            placeholder="AAPL" className={inputClass + ' w-24'} required />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Direction</label>
          <select value={direction} onChange={(e) => setDirection(e.target.value as 'above' | 'below')}
            className={inputClass + ' w-24'}>
            <option value="above">Above</option>
            <option value="below">Below</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Price</label>
          <input type="number" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)}
            placeholder="200.00" step="0.01" className={inputClass + ' w-28'} required />
        </div>
        <button type="submit" className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors">
          Create
        </button>
      </form>

      {(!alerts || alerts.length === 0) ? (
        <p className="text-sm text-zinc-600">No alerts set.</p>
      ) : (
        <div className="space-y-1">
          {alerts.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-zinc-800/30">
              <div className="flex items-center gap-3">
                <span className="font-medium text-sm">{a.symbol}</span>
                <span className="text-xs text-zinc-500">
                  {a.direction === 'above' ? '↑ Above' : '↓ Below'} {formatPrice(a.targetPrice)}
                </span>
                {a.triggered && (
                  <span className="rounded bg-emerald-400/10 px-1.5 py-0.5 text-xs text-emerald-400">Triggered</span>
                )}
              </div>
              <button
                onClick={async () => {
                  await api.watchlist.deleteAlert(a.id)
                  qc.invalidateQueries({ queryKey: ['alerts'] })
                }}
                className="text-zinc-600 hover:text-red-400 transition-colors text-sm"
              >×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
