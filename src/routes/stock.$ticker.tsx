import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useChart } from '@/hooks/useStockData'
import { useStockWebSocket } from '@/hooks/useWebSocket'
import { usePreferencesStore } from '@/stores/preferences-store'
import { CandlestickChart } from '@/components/charts/CandlestickChart'
import { RsiChart, MacdChart } from '@/components/charts/IndicatorPanel'
import { TechnicalIndicators } from '@/components/stock/TechnicalIndicators'
import { StockHeader } from '@/components/stock/StockHeader'
import { TimeRangeSelector, RANGES } from '@/components/stock/TimeRangeSelector'
import { CompanyInfo } from '@/components/stock/CompanyInfo'
import { sma, ema, bollingerBands, rsi, macd } from '@/lib/indicators'

export const Route = createFileRoute('/stock/$ticker')({
  component: StockDetail,
})

function StockDetail() {
  const { ticker } = Route.useParams()
  const activeIndicators = usePreferencesStore((s) => s.activeIndicators)

  const [rangeLabel, setRangeLabel] = useState('1Y')
  const [chartParams, setChartParams] = useState<{ interval: string; period1?: number; period2?: number }>({
    interval: '1d',
  })

  const { data, isLoading, error } = useChart(ticker, chartParams.interval, chartParams.period1, chartParams.period2)

  useStockWebSocket(ticker)

  const [visibleRange, setVisibleRange] = useState<[number, number] | undefined>()
  const rafRef = useRef<number>(0)
  const onVisibleRangeChange = useCallback((indexRange: [number, number]) => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      setVisibleRange(indexRange)
    })
  }, [])

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

  return (
    <div className="space-y-4">
      <StockHeader quote={quote} />

      <div className="flex items-center justify-between">
        <TimeRangeSelector
          activeLabel={rangeLabel}
          onSelect={(interval, period1, period2) => {
            const range = RANGES.find((r) => r.interval === interval && (r.periodMs ? true : !period1))
            setRangeLabel(range?.label ?? '1Y')
            setChartParams({ interval, period1, period2 })
          }}
        />
        <TechnicalIndicators />
      </div>

      <CandlestickChart
        bars={bars}
        height={500}
        interval={chartParams.interval}
        indicators={{
          sma: indicatorData.sma,
          ema: indicatorData.ema,
          bollingerBands: indicatorData.bollingerBands,
        }}
        onVisibleRangeChange={onVisibleRangeChange}
      />

      {indicatorData.rsi && <RsiChart bars={bars} rsiValues={indicatorData.rsi} visibleRange={visibleRange} interval={chartParams.interval} />}
      {indicatorData.macd && <MacdChart bars={bars} macdValues={indicatorData.macd} visibleRange={visibleRange} interval={chartParams.interval} />}

      <CompanyInfo quote={quote} />
    </div>
  )
}
