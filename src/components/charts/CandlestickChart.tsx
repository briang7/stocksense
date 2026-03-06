import { useRef, useEffect, useState } from 'react'
import * as d3 from 'd3'
import type { OhlcvBar } from '@/lib/api'
import type { BollingerBand } from '@/lib/indicators'
import { calcDimensions, createScales } from '@/lib/d3-utils'
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
}

export function CandlestickChart({ bars, indicators, height = 500, interval = '1d' }: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [width, setWidth] = useState(800)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; bar: OhlcvBar } | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w && w > 0) setWidth(w)
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!svgRef.current || bars.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const dims = calcDimensions(width, height)
    const { xScale, yScale, volumeScale } = createScales(bars, dims)

    const g = svg
      .attr('width', dims.width)
      .attr('height', dims.height)
      .append('g')
      .attr('transform', `translate(${dims.margin.left},${dims.margin.top})`)

    // Candlestick width
    const candleWidth = Math.max(1, Math.min(12, (dims.innerWidth / bars.length) * 0.7))

    // Volume bars
    const volumeG = g.append('g').attr('transform', `translate(0,${dims.priceHeight + 10})`)

    volumeG.selectAll('rect')
      .data(bars)
      .join('rect')
      .attr('x', (d) => xScale(new Date(d.timestamp)) - candleWidth / 2)
      .attr('y', (d) => volumeScale(d.volume))
      .attr('width', candleWidth)
      .attr('height', (d) => dims.volumeHeight - volumeScale(d.volume))
      .attr('fill', (d) => d.close >= d.open ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)')

    // Volume axis
    volumeG.append('g')
      .attr('transform', `translate(${dims.innerWidth},0)`)
      .call(d3.axisRight(volumeScale).ticks(3).tickFormat((d) => formatVolume(d as number)))
      .call((g) => g.selectAll('text').attr('fill', '#71717a').attr('font-size', '10px'))
      .call((g) => g.selectAll('line, path').attr('stroke', '#27272a'))

    // Price Y axis
    g.append('g')
      .attr('transform', `translate(${dims.innerWidth},0)`)
      .call(d3.axisRight(yScale).ticks(8).tickFormat((d) => formatPrice(d as number)))
      .call((g) => g.selectAll('text').attr('fill', '#a1a1aa').attr('font-size', '11px'))
      .call((g) => g.selectAll('line, path').attr('stroke', '#27272a'))

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(yScale.ticks(8))
      .join('line')
      .attr('x1', 0)
      .attr('x2', dims.innerWidth)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', '#18181b')
      .attr('stroke-dasharray', '2,4')

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${dims.priceHeight})`)
      .call(d3.axisBottom(xScale).ticks(8))
      .call((g) => g.selectAll('text').attr('fill', '#71717a').attr('font-size', '10px'))
      .call((g) => g.selectAll('line, path').attr('stroke', '#27272a'))

    // Candlestick wicks
    g.selectAll('.wick')
      .data(bars)
      .join('line')
      .attr('class', 'wick')
      .attr('x1', (d) => xScale(new Date(d.timestamp)))
      .attr('x2', (d) => xScale(new Date(d.timestamp)))
      .attr('y1', (d) => yScale(d.high))
      .attr('y2', (d) => yScale(d.low))
      .attr('stroke', (d) => d.close >= d.open ? '#10b981' : '#ef4444')
      .attr('stroke-width', 1)

    // Candlestick bodies
    g.selectAll('.candle')
      .data(bars)
      .join('rect')
      .attr('class', 'candle')
      .attr('x', (d) => xScale(new Date(d.timestamp)) - candleWidth / 2)
      .attr('y', (d) => yScale(Math.max(d.open, d.close)))
      .attr('width', candleWidth)
      .attr('height', (d) => Math.max(1, Math.abs(yScale(d.open) - yScale(d.close))))
      .attr('fill', (d) => d.close >= d.open ? '#10b981' : '#ef4444')
      .attr('rx', 0.5)

    // Indicator overlays
    if (indicators?.sma) {
      renderLine(g, bars, indicators.sma, xScale, yScale, '#f59e0b', 1.5)
    }
    if (indicators?.ema) {
      renderLine(g, bars, indicators.ema, xScale, yScale, '#8b5cf6', 1.5)
    }
    if (indicators?.bollingerBands) {
      renderBollinger(g, bars, indicators.bollingerBands, xScale, yScale)
    }

    // Crosshair overlay
    const crosshairG = g.append('g').attr('class', 'crosshair').style('display', 'none')
    crosshairG.append('line').attr('class', 'crosshair-x').attr('stroke', '#52525b').attr('stroke-dasharray', '3,3')
    crosshairG.append('line').attr('class', 'crosshair-y').attr('stroke', '#52525b').attr('stroke-dasharray', '3,3')

    const overlay = g.append('rect')
      .attr('width', dims.innerWidth)
      .attr('height', dims.priceHeight)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')

    overlay.on('mousemove', (event: MouseEvent) => {
      const [mx, my] = d3.pointer(event)
      crosshairG.style('display', null)
      crosshairG.select('.crosshair-x').attr('x1', 0).attr('x2', dims.innerWidth).attr('y1', my).attr('y2', my)
      crosshairG.select('.crosshair-y').attr('x1', mx).attr('x2', mx).attr('y1', 0).attr('y2', dims.priceHeight)

      // Find nearest bar
      const xDate = xScale.invert(mx)
      const bisect = d3.bisector((d: OhlcvBar) => new Date(d.timestamp)).left
      const idx = bisect(bars, xDate)
      const bar = bars[Math.min(idx, bars.length - 1)]
      if (bar) {
        setTooltip({ x: mx + dims.margin.left, y: my + dims.margin.top, bar })
      }
    })

    overlay.on('mouseleave', () => {
      crosshairG.style('display', 'none')
      setTooltip(null)
    })

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 10])
      .translateExtent([[0, 0], [dims.innerWidth, dims.priceHeight]])
      .on('zoom', (event) => {
        const newXScale = event.transform.rescaleX(xScale)
        g.selectAll<SVGLineElement, OhlcvBar>('.wick')
          .attr('x1', (d) => newXScale(new Date(d.timestamp)))
          .attr('x2', (d) => newXScale(new Date(d.timestamp)))
        g.selectAll<SVGRectElement, OhlcvBar>('.candle')
          .attr('x', (d) => newXScale(new Date(d.timestamp)) - candleWidth / 2)
      })

    svg.call(zoom)

  }, [bars, width, height, indicators])

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

function renderLine(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  bars: OhlcvBar[],
  values: (number | null)[],
  xScale: d3.ScaleTime<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  color: string,
  strokeWidth: number
) {
  const lineData = bars
    .map((bar, i) => ({ x: new Date(bar.timestamp), y: values[i] }))
    .filter((d): d is { x: Date; y: number } => d.y !== null)

  const line = d3.line<{ x: Date; y: number }>()
    .x((d) => xScale(d.x))
    .y((d) => yScale(d.y))

  g.append('path')
    .datum(lineData)
    .attr('fill', 'none')
    .attr('stroke', color)
    .attr('stroke-width', strokeWidth)
    .attr('d', line)
}

function renderBollinger(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  bars: OhlcvBar[],
  bands: (BollingerBand | null)[],
  xScale: d3.ScaleTime<number, number>,
  yScale: d3.ScaleLinear<number, number>
) {
  const validData = bars
    .map((bar, i) => ({ x: new Date(bar.timestamp), band: bands[i] }))
    .filter((d): d is { x: Date; band: BollingerBand } => d.band !== null)

  if (validData.length === 0) return

  const area = d3.area<{ x: Date; band: BollingerBand }>()
    .x((d) => xScale(d.x))
    .y0((d) => yScale(d.band.lower))
    .y1((d) => yScale(d.band.upper))

  g.append('path')
    .datum(validData)
    .attr('fill', 'rgba(99, 102, 241, 0.08)')
    .attr('stroke', 'none')
    .attr('d', area)

  // Middle line
  const midLine = d3.line<{ x: Date; band: BollingerBand }>()
    .x((d) => xScale(d.x))
    .y((d) => yScale(d.band.middle))

  g.append('path')
    .datum(validData)
    .attr('fill', 'none')
    .attr('stroke', '#6366f1')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '4,2')
    .attr('d', midLine)
}
