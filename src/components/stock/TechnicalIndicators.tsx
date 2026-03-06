import { usePreferencesStore } from '@/stores/preferences-store'

const INDICATORS = [
  { key: 'sma', label: 'SMA(20)', color: '#f59e0b' },
  { key: 'ema', label: 'EMA(20)', color: '#8b5cf6' },
  { key: 'bollinger', label: 'BB(20,2)', color: '#6366f1' },
  { key: 'rsi', label: 'RSI(14)', color: '#a78bfa' },
  { key: 'macd', label: 'MACD', color: '#3b82f6' },
]

export function TechnicalIndicators() {
  const { activeIndicators, toggleIndicator } = usePreferencesStore()

  return (
    <div className="flex items-center gap-1.5">
      <span className="mr-1 text-xs text-zinc-500">Indicators:</span>
      {INDICATORS.map(({ key, label, color }) => {
        const active = activeIndicators.includes(key)
        return (
          <button
            key={key}
            onClick={() => toggleIndicator(key)}
            className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
              active
                ? 'text-white'
                : 'border border-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
            style={active ? { backgroundColor: color + '30', color, borderColor: color + '50', border: `1px solid ${color}50` } : undefined}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
