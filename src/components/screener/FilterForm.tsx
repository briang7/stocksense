interface Filters {
  sector: string
  minPrice: string
  maxPrice: string
  minChange: string
  maxChange: string
}

interface FilterFormProps {
  filters: Filters
  onChange: (filters: Filters) => void
}

const SECTORS = ['All', 'Tech', 'Finance', 'Health', 'Energy', 'Consumer', 'Industrial', 'Staples', 'Utilities', 'Comm']

const inputClass = 'w-24 rounded-md border border-zinc-800 bg-zinc-900/50 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none'

export function FilterForm({ filters, onChange }: FilterFormProps) {
  const update = (key: keyof Filters, value: string) => onChange({ ...filters, [key]: value })

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4">
      <div>
        <label className="mb-1 block text-xs text-zinc-500">Sector</label>
        <select value={filters.sector} onChange={(e) => update('sector', e.target.value)}
          className={inputClass + ' w-32'}>
          {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-zinc-500">Min Price</label>
        <input type="number" value={filters.minPrice} onChange={(e) => update('minPrice', e.target.value)}
          placeholder="0" className={inputClass} />
      </div>
      <div>
        <label className="mb-1 block text-xs text-zinc-500">Max Price</label>
        <input type="number" value={filters.maxPrice} onChange={(e) => update('maxPrice', e.target.value)}
          placeholder="∞" className={inputClass} />
      </div>
      <div>
        <label className="mb-1 block text-xs text-zinc-500">Min Change%</label>
        <input type="number" value={filters.minChange} onChange={(e) => update('minChange', e.target.value)}
          placeholder="-∞" step="0.1" className={inputClass} />
      </div>
      <div>
        <label className="mb-1 block text-xs text-zinc-500">Max Change%</label>
        <input type="number" value={filters.maxChange} onChange={(e) => update('maxChange', e.target.value)}
          placeholder="∞" step="0.1" className={inputClass} />
      </div>
      <button
        onClick={() => onChange({ sector: 'All', minPrice: '', maxPrice: '', minChange: '', maxChange: '' })}
        className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        Reset
      </button>
    </div>
  )
}

export type { Filters }
