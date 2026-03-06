import { useState } from 'react'
import { useAddHolding } from '@/hooks/usePortfolio'

interface AddHoldingProps {
  portfolioId: number
}

export function AddHolding({ portfolioId }: AddHoldingProps) {
  const [symbol, setSymbol] = useState('')
  const [shares, setShares] = useState('')
  const [buyPrice, setBuyPrice] = useState('')
  const [buyDate, setBuyDate] = useState(new Date().toISOString().slice(0, 10))
  const addHolding = useAddHolding(portfolioId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!symbol || !shares || !buyPrice) return
    addHolding.mutate(
      { symbol: symbol.toUpperCase(), shares: Number(shares), buyPrice: Number(buyPrice), buyDate },
      { onSuccess: () => { setSymbol(''); setShares(''); setBuyPrice('') } }
    )
  }

  const inputClass = 'rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30'

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4">
      <h3 className="mb-3 text-sm font-medium text-zinc-400">Add Holding</h3>
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-zinc-500">Symbol</label>
          <input type="text" value={symbol} onChange={(e) => setSymbol(e.target.value)}
            placeholder="AAPL" className={inputClass + ' w-full'} required />
        </div>
        <div className="w-24">
          <label className="mb-1 block text-xs text-zinc-500">Shares</label>
          <input type="number" value={shares} onChange={(e) => setShares(e.target.value)}
            placeholder="10" className={inputClass + ' w-full'} step="any" required />
        </div>
        <div className="w-28">
          <label className="mb-1 block text-xs text-zinc-500">Buy Price</label>
          <input type="number" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)}
            placeholder="150.00" className={inputClass + ' w-full'} step="0.01" required />
        </div>
        <div className="w-36">
          <label className="mb-1 block text-xs text-zinc-500">Buy Date</label>
          <input type="date" value={buyDate} onChange={(e) => setBuyDate(e.target.value)}
            className={inputClass + ' w-full'} required />
        </div>
        <button
          type="submit"
          disabled={addHolding.isPending}
          className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
        >
          {addHolding.isPending ? 'Adding...' : 'Add'}
        </button>
      </div>
    </form>
  )
}
