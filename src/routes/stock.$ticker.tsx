import { createFileRoute } from '@tanstack/react-router'
import { useMemo } from 'react'
import { useChart } from '@/hooks/useStockData'
import { useStockWebSocket } from '@/hooks/useWebSocket'
import { usePreferencesStore } from '@/stores/preferences-store'
import { CandlestickChart } from '@/components/charts/CandlestickChart'
import { RsiChart, MacdChart } from '@/components/charts/IndicatorPanel'
import { TechnicalIndicators } from '@/components/stock/TechnicalIndicators'
import { formatPrice, formatPercent } from '@/lib/format'
import { sma, ema, bollingerBands, rsi, macd } from '@/lib/indicators'

export const Route = createFileRoute('/stock/$ticker')({
  component: StockDetail,
})

function StockDetail() {
  const { ticker } = Route.useParams()
  const { data, isLoading, error } = useChart(ticker)
  const activeIndicators = usePreferencesStore((s) => s.activeIndicators)

  useStockWebSocket(ticker)

  const indicatorData = useMemo(() => {
    if (!data) return {}
    const closes = data.bars.map((b) => b.close)
    return {
      sma: activeIndicators.includes('sma') ? sma(closes, 20) : undefined,
      ema: activeIndicators.includes('ema') ? ema(closes, 20) : undefined,
      bollingerBands: activeIndicators.includes('bollinger') ? bollingerBands(closes, 20, 2) : undefined,
      rsi: activeIndicators.includes('rsi') ? rsi(closes, 14) : undefined,
      macd: activeIndicators.includes('macd') ? macd(closes) : undefined,
    }
  }, [data, activeIndicators])

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-zinc-500">Loading {ticker}...</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-red-400">Failed to load {ticker}: {error?.message}</div>
      </div>
    )
  }

  const { bars, quote } = data
  const isPositive = quote.change >= 0

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-baseline gap-3">
          <h1 className="text-3xl font-bold">{quote.symbol}</h1>
          <span className="text-zinc-500">{quote.name}</span>
          <span className="text-xs text-zinc-600">{quote.exchange}</span>
        </div>
        <div className="mt-1 flex items-baseline gap-3">
          <span className="text-3xl font-bold tabular-nums">{formatPrice(quote.price)}</span>
          <span className={`text-lg font-medium tabular-nums ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{formatPrice(quote.change)} ({formatPercent(quote.changePercent)})
          </span>
        </div>
      </div>

      <TechnicalIndicators />

      <CandlestickChart
        bars={bars}
        height={500}
        interval="1d"
        indicators={{
          sma: indicatorData.sma,
          ema: indicatorData.ema,
          bollingerBands: indicatorData.bollingerBands,
        }}
      />

      {indicatorData.rsi && (
        <RsiChart bars={bars} rsiValues={indicatorData.rsi} />
      )}

      {indicatorData.macd && (
        <MacdChart bars={bars} macdValues={indicatorData.macd} />
      )}
    </div>
  )
}
