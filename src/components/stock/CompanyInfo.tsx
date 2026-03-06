import type { StockQuote } from '@/lib/api'
import { formatPrice, formatLargeNumber, formatVolume } from '@/lib/format'

interface CompanyInfoProps {
  quote: StockQuote
}

export function CompanyInfo({ quote }: CompanyInfoProps) {
  const items = [
    { label: 'Market Cap', value: quote.marketCap > 0 ? formatLargeNumber(quote.marketCap) : 'N/A' },
    { label: 'Volume', value: formatVolume(quote.volume) },
    { label: 'Price', value: formatPrice(quote.price) },
    { label: 'Exchange', value: quote.exchange },
  ]

  return (
    <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4">
      <h3 className="mb-3 text-sm font-medium text-zinc-400">Company Info</h3>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {items.map(({ label, value }) => (
          <div key={label}>
            <div className="text-xs text-zinc-500">{label}</div>
            <div className="mt-0.5 text-sm font-medium tabular-nums">{value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
