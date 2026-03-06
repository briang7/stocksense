import { useRef, useEffect, useState, useCallback } from 'react'
import * as d3 from 'd3'
import type { OhlcvBar } from '@/lib/api'
import type { BollingerBand } from '@/lib/indicators'
import { formatPrice, formatVolume, formatDate } from '@/lib/format'

interface CandlestickChartProps {
  bars: OhlcvBar[]
  indicators?: {
    sma?: (number | null)[]
    ema?: (number | null)[]
    bollingerBands?: (BollingerBand | null)[]
  }
  height?: number
  interval?: string
  onVisibleRangeChange?: (indexRange: [number, number]) => void
}

export function CandlestickChart({ bars, indicators, height = 500, interval = '1d', onVisibleRangeChange }: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [width, setWidth] = useState(800)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; bar: OhlcvBar } | null>(null)
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity)
  const onVisibleRangeRef = useRef(onVisibleRangeChange)
  onVisibleRangeRef.current = onVisibleRangeChange

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w && w > 0) setWidth(w)
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const render = useCallback((transform: d3.ZoomTransform | null) => {
    if (!svgRef.current || bars.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const margin = { top: 20, right: 60, bottom: 30, left: 10 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom
    const volumeHeight = innerHeight * 0.2
    const priceHeight = innerHeight * 0.8 - 10

    // Index-based X scale — no gaps for off-hours/weekends
    const xScaleBase = d3.scaleLinear()
      .domain([0, bars.length - 1])
      .range([0, innerWidth])

    // Apply zoom transform
    const xScale = transform ? transform.rescaleX(xScaleBase) : xScaleBase

    // Visible index range
    const idxMin = Math.max(0, Math.floor(xScale.invert(0)))
    const idxMax = Math.min(bars.length - 1, Math.ceil(xScale.invert(innerWidth)))

    // Notify parent of visible index range
    if (transform && onVisibleRangeRef.current) {
      onVisibleRangeRef.current([idxMin, idxMax])
    }

    const visibleBars = bars.slice(idxMin, idxMax + 1)
    const barsForYScale = visibleBars.length > 0 ? visibleBars : bars

    const yScale = d3.scaleLinear()
      .domain([d3.min(barsForYScale, (d) => d.low)! * 0.995, d3.max(barsForYScale, (d) => d.high)! * 1.005])
      .range([priceHeight, 0])

    const volumeScale = d3.scaleLinear()
      .domain([0, d3.max(barsForYScale, (d) => d.volume)!])
      .range([volumeHeight, 0])

    svg.attr('width', width).attr('height', height)

    svg.append('defs').append('clipPath').attr('id', 'chart-clip')
      .append('rect').attr('width', innerWidth).attr('height', innerHeight + 20)

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    const chartArea = g.append('g').attr('clip-path', 'url(#chart-clip)')

    // Candle width based on visible count
    const visibleCount = idxMax - idxMin + 1
    const candleWidth = Math.max(2, Math.min(20, (innerWidth / visibleCount) * 0.7))

    // Grid lines
    g.append('g')
      .selectAll('line')
      .data(yScale.ticks(8))
      .join('line')
      .attr('x1', 0).attr('x2', innerWidth)
      .attr('y1', (d) => yScale(d)).attr('y2', (d) => yScale(d))
      .attr('stroke', '#18181b').attr('stroke-dasharray', '2,4')

    // Volume bars
    const volumeG = chartArea.append('g').attr('transform', `translate(0,${priceHeight + 10})`)
    volumeG.selectAll('rect')
      .data(bars)
      .join('rect')
      .attr('x', (_d, i) => xScale(i) - candleWidth / 2)
      .attr('y', (d) => volumeScale(d.volume))
      .attr('width', candleWidth)
      .attr('height', (d) => volumeHeight - volumeScale(d.volume))
      .attr('fill', (d) => d.close >= d.open ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)')

    // Volume axis
    g.append('g')
      .attr('transform', `translate(${innerWidth},${priceHeight + 10})`)
      .call(d3.axisRight(volumeScale).ticks(3).tickFormat((d) => formatVolume(d as number)))
      .call((g) => g.selectAll('text').attr('fill', '#71717a').attr('font-size', '10px'))
      .call((g) => g.selectAll('line, path').attr('stroke', '#27272a'))

    // Price Y axis
    g.append('g')
      .attr('transform', `translate(${innerWidth},0)`)
      .call(d3.axisRight(yScale).ticks(8).tickFormat((d) => formatPrice(d as number)))
      .call((g) => g.selectAll('text').attr('fill', '#a1a1aa').attr('font-size', '11px'))
      .call((g) => g.selectAll('line, path').attr('stroke', '#27272a'))

    // X axis with timestamp labels at evenly-spaced indices
    const tickCount = Math.min(8, visibleCount)
    const tickStep = Math.max(1, Math.floor(visibleCount / tickCount))
    const tickIndices: number[] = []
    for (let i = idxMin; i <= idxMax; i += tickStep) {
      tickIndices.push(i)
    }

    const xAxis = g.append('g')
      .attr('transform', `translate(0,${priceHeight})`)

    xAxis.append('line')
      .attr('x1', 0).attr('x2', innerWidth)
      .attr('stroke', '#27272a')

    xAxis.selectAll('text')
      .data(tickIndices)
      .join('text')
      .attr('x', (i) => xScale(i))
      .attr('y', 16)
      .attr('text-anchor', 'middle')
      .attr('fill', '#71717a')
      .attr('font-size', '10px')
      .text((i) => bars[i] ? formatDate(bars[i].timestamp, interval) : '')

    // Candlestick wicks
    chartArea.selectAll('.wick')
      .data(bars)
      .join('line')
      .attr('class', 'wick')
      .attr('x1', (_d, i) => xScale(i))
      .attr('x2', (_d, i) => xScale(i))
      .attr('y1', (d) => yScale(d.high))
      .attr('y2', (d) => yScale(d.low))
      .attr('stroke', (d) => d.close >= d.open ? '#10b981' : '#ef4444')
      .attr('stroke-width', 1)

    // Candlestick bodies
    chartArea.selectAll('.candle')
      .data(bars)
      .join('rect')
      .attr('class', 'candle')
      .attr('x', (_d, i) => xScale(i) - candleWidth / 2)
      .attr('y', (d) => yScale(Math.max(d.open, d.close)))
      .attr('width', candleWidth)
      .attr('height', (d) => Math.max(1, Math.abs(yScale(d.open) - yScale(d.close))))
      .attr('fill', (d) => d.close >= d.open ? '#10b981' : '#ef4444')
      .attr('rx', candleWidth > 4 ? 1 : 0)

    // Indicator overlays
    if (indicators?.sma) {
      renderIndexLine(chartArea, bars, indicators.sma, xScale, yScale, '#f59e0b', 1.5)
    }
    if (indicators?.ema) {
      renderIndexLine(chartArea, bars, indicators.ema, xScale, yScale, '#8b5cf6', 1.5)
    }
    if (indicators?.bollingerBands) {
      renderIndexBollinger(chartArea, bars, indicators.bollingerBands, xScale, yScale)
    }

    // Crosshair overlay
    const crosshairG = g.append('g').attr('class', 'crosshair').style('display', 'none')
    crosshairG.append('line').attr('class', 'crosshair-x').attr('stroke', '#52525b').attr('stroke-dasharray', '3,3')
    crosshairG.append('line').attr('class', 'crosshair-y').attr('stroke', '#52525b').attr('stroke-dasharray', '3,3')

    const overlay = g.append('rect')
      .attr('width', innerWidth)
      .attr('height', priceHeight)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')

    overlay.on('mousemove', (event: MouseEvent) => {
      const [mx, my] = d3.pointer(event)
      crosshairG.style('display', null)
      crosshairG.select('.crosshair-x').attr('x1', 0).attr('x2', innerWidth).attr('y1', my).attr('y2', my)
      crosshairG.select('.crosshair-y').attr('x1', mx).attr('x2', mx).attr('y1', 0).attr('y2', priceHeight)

      const idx = Math.round(xScale.invert(mx))
      const bar = bars[Math.max(0, Math.min(idx, bars.length - 1))]
      if (bar) {
        setTooltip({ x: mx + margin.left, y: my + margin.top, bar })
      }
    })

    overlay.on('mouseleave', () => {
      crosshairG.style('display', 'none')
      setTooltip(null)
    })
  }, [bars, width, height, indicators, interval])

  useEffect(() => {
    if (!svgRef.current || bars.length === 0) return

    const currentTransform = transformRef.current
    render(currentTransform === d3.zoomIdentity ? null : currentTransform)

    const svg = d3.select(svgRef.current)
    const margin = { top: 20, right: 60, bottom: 30, left: 10 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom
    const priceHeight = innerHeight * 0.8 - 10

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 10])
      .translateExtent([[0, 0], [innerWidth, priceHeight]])
      .on('zoom', (event) => {
        transformRef.current = event.transform
        render(event.transform)
      })

    svg.call(zoom)

    if (currentTransform !== d3.zoomIdentity) {
      svg.call(zoom.transform, currentTransform)
    }

    return () => {
      svg.on('.zoom', null)
    }
  }, [bars, width, height, indicators, render])

  return (
    <div ref={containerRef} className="relative w-full">
      <svg ref={svgRef} className="w-full" />
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-zinc-700 bg-zinc-900/95 px-3 py-2 text-xs shadow-lg"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          <div className="text-zinc-400">{formatDate(tooltip.bar.timestamp, interval)}</div>
          <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 tabular-nums">
            <span className="text-zinc-500">O</span><span>{formatPrice(tooltip.bar.open)}</span>
            <span className="text-zinc-500">H</span><span>{formatPrice(tooltip.bar.high)}</span>
            <span className="text-zinc-500">L</span><span>{formatPrice(tooltip.bar.low)}</span>
            <span className="text-zinc-500">C</span>
            <span className={tooltip.bar.close >= tooltip.bar.open ? 'text-emerald-400' : 'text-red-400'}>
              {formatPrice(tooltip.bar.close)}
            </span>
            <span className="text-zinc-500">Vol</span><span>{formatVolume(tooltip.bar.volume)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function renderIndexLine(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  bars: OhlcvBar[],
  values: (number | null)[],
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  color: string,
  strokeWidth: number
) {
  const lineData = bars
    .map((_bar, i) => ({ idx: i, y: values[i] }))
    .filter((d): d is { idx: number; y: number } => d.y !== null)

  const line = d3.line<{ idx: number; y: number }>()
    .x((d) => xScale(d.idx))
    .y((d) => yScale(d.y))

  g.append('path')
    .datum(lineData)
    .attr('fill', 'none')
    .attr('stroke', color)
    .attr('stroke-width', strokeWidth)
    .attr('d', line)
}

function renderIndexBollinger(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  bars: OhlcvBar[],
  bands: (BollingerBand | null)[],
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>
) {
  const validData = bars
    .map((_bar, i) => ({ idx: i, band: bands[i] }))
    .filter((d): d is { idx: number; band: BollingerBand } => d.band !== null)

  if (validData.length === 0) return

  const area = d3.area<{ idx: number; band: BollingerBand }>()
    .x((d) => xScale(d.idx))
    .y0((d) => yScale(d.band.lower))
    .y1((d) => yScale(d.band.upper))

  g.append('path')
    .datum(validData)
    .attr('fill', 'rgba(99, 102, 241, 0.08)')
    .attr('stroke', 'none')
    .attr('d', area)

  const midLine = d3.line<{ idx: number; band: BollingerBand }>()
    .x((d) => xScale(d.idx))
    .y((d) => yScale(d.band.middle))

  g.append('path')
    .datum(validData)
    .attr('fill', 'none')
    .attr('stroke', '#6366f1')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '4,2')
    .attr('d', midLine)
}
