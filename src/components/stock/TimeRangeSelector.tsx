interface TimeRange {
  label: string
  interval: string
  periodMs?: number
}

const RANGES: TimeRange[] = [
  { label: '1D', interval: '5m', periodMs: 1 * 24 * 60 * 60 * 1000 },
  { label: '5D', interval: '15m', periodMs: 5 * 24 * 60 * 60 * 1000 },
  { label: '1M', interval: '1d', periodMs: 30 * 24 * 60 * 60 * 1000 },
  { label: '3M', interval: '1d', periodMs: 90 * 24 * 60 * 60 * 1000 },
  { label: '6M', interval: '1d', periodMs: 180 * 24 * 60 * 60 * 1000 },
  { label: '1Y', interval: '1d', periodMs: 365 * 24 * 60 * 60 * 1000 },
  { label: '5Y', interval: '1wk', periodMs: 5 * 365 * 24 * 60 * 60 * 1000 },
  { label: 'MAX', interval: '1mo' },
]

interface TimeRangeSelectorProps {
  activeLabel: string
  onSelect: (interval: string, period1?: number, period2?: number) => void
}

export function TimeRangeSelector({ activeLabel, onSelect }: TimeRangeSelectorProps) {
  return (
    <div className="flex items-center gap-1">
      {RANGES.map((range) => {
        const active = activeLabel === range.label
        return (
          <button
            key={range.label}
            onClick={() => {
              const now = Date.now()
              const period1 = range.periodMs ? now - range.periodMs : undefined
              onSelect(range.interval, period1, range.periodMs ? now : undefined)
            }}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              active
                ? 'bg-emerald-400/10 text-emerald-400'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {range.label}
          </button>
        )
      })}
    </div>
  )
}

export { RANGES }
