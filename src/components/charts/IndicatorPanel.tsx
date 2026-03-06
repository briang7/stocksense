import { useRef, useEffect, useState } from 'react'
import * as d3 from 'd3'
import type { OhlcvBar } from '@/lib/api'
import { formatDate } from '@/lib/format'

interface RsiChartProps {
  bars: OhlcvBar[]
  rsiValues: (number | null)[]
  height?: number
  interval?: string
  visibleRange?: [number, number]
}

export function RsiChart({ bars, rsiValues, height = 120, interval = '1d', visibleRange }: RsiChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [width, setWidth] = useState(800)

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

    const margin = { top: 8, right: 60, bottom: 20, left: 10 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    const idxMin = visibleRange ? visibleRange[0] : 0
    const idxMax = visibleRange ? visibleRange[1] : bars.length - 1

    const xScale = d3.scaleLinear()
      .domain([idxMin, idxMax])
      .range([0, innerWidth])

    const yScale = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0])

    svg.append('defs').append('clipPath').attr('id', 'rsi-clip')
      .append('rect').attr('width', innerWidth).attr('height', innerHeight)
    const chartArea = g.append('g').attr('clip-path', 'url(#rsi-clip)')

    // Overbought/oversold zones
    chartArea.append('rect')
      .attr('x', 0).attr('y', yScale(100)).attr('width', innerWidth)
      .attr('height', yScale(70) - yScale(100))
      .attr('fill', 'rgba(239, 68, 68, 0.05)')

    chartArea.append('rect')
      .attr('x', 0).attr('y', yScale(30)).attr('width', innerWidth)
      .attr('height', yScale(0) - yScale(30))
      .attr('fill', 'rgba(16, 185, 129, 0.05)')

    // Reference lines
    for (const level of [30, 50, 70]) {
      g.append('line')
        .attr('x1', 0).attr('x2', innerWidth)
        .attr('y1', yScale(level)).attr('y2', yScale(level))
        .attr('stroke', level === 50 ? '#3f3f46' : '#27272a')
        .attr('stroke-dasharray', '3,3')
    }

    // RSI line
    const lineData = bars
      .map((_bar, i) => ({ idx: i, y: rsiValues[i] }))
      .filter((d): d is { idx: number; y: number } => d.y !== null)

    const line = d3.line<{ idx: number; y: number }>()
      .x((d) => xScale(d.idx))
      .y((d) => yScale(d.y))

    chartArea.append('path')
      .datum(lineData)
      .attr('fill', 'none')
      .attr('stroke', '#a78bfa')
      .attr('stroke-width', 1.5)
      .attr('d', line)

    // X axis with timestamp labels
    const visibleCount = idxMax - idxMin + 1
    const tickCount = Math.min(8, visibleCount)
    const tickStep = Math.max(1, Math.floor(visibleCount / tickCount))
    const tickIndices: number[] = []
    for (let i = idxMin; i <= idxMax; i += tickStep) {
      tickIndices.push(i)
    }

    const xAxis = g.append('g').attr('transform', `translate(0,${innerHeight})`)
    xAxis.append('line').attr('x1', 0).attr('x2', innerWidth).attr('stroke', '#27272a')
    xAxis.selectAll('text')
      .data(tickIndices)
      .join('text')
      .attr('x', (i) => xScale(i))
      .attr('y', 14)
      .attr('text-anchor', 'middle')
      .attr('fill', '#71717a')
      .attr('font-size', '10px')
      .text((i) => bars[i] ? formatDate(bars[i].timestamp, interval) : '')

    // Y axis
    g.append('g')
      .attr('transform', `translate(${innerWidth},0)`)
      .call(d3.axisRight(yScale).tickValues([30, 50, 70]).tickSize(0))
      .call((g) => g.selectAll('text').attr('fill', '#71717a').attr('font-size', '10px'))
      .call((g) => g.select('.domain').remove())

    // Label
    g.append('text').attr('x', 4).attr('y', 12).attr('fill', '#71717a').attr('font-size', '10px').text('RSI(14)')

  }, [bars, rsiValues, width, height, visibleRange, interval])

  return (
    <div ref={containerRef} className="w-full">
      <svg ref={svgRef} />
    </div>
  )
}

interface MacdChartProps {
  bars: OhlcvBar[]
  macdValues: ({ macd: number; signal: number; histogram: number } | null)[]
  height?: number
  interval?: string
  visibleRange?: [number, number]
}

export function MacdChart({ bars, macdValues, height = 120, interval = '1d', visibleRange }: MacdChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [width, setWidth] = useState(800)

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

    const margin = { top: 8, right: 60, bottom: 20, left: 10 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    const idxMin = visibleRange ? visibleRange[0] : 0
    const idxMax = visibleRange ? visibleRange[1] : bars.length - 1

    const xScale = d3.scaleLinear()
      .domain([idxMin, idxMax])
      .range([0, innerWidth])

    // Filter to visible range for Y scale
    const allIndexedData = bars
      .map((_bar, i) => ({ idx: i, val: macdValues[i] }))
      .filter((d): d is { idx: number; val: NonNullable<typeof d.val> } => d.val !== null)

    const visibleData = allIndexedData.filter((d) => d.idx >= idxMin && d.idx <= idxMax)
    const dataForYScale = visibleData.length > 0 ? visibleData : allIndexedData
    if (dataForYScale.length === 0) return

    const allValues = dataForYScale.flatMap((v) => [v.val.macd, v.val.signal, v.val.histogram])
    const yExtent = d3.extent(allValues) as [number, number]
    const yScale = d3.scaleLinear().domain(yExtent).range([innerHeight, 0]).nice()

    svg.append('defs').append('clipPath').attr('id', 'macd-clip')
      .append('rect').attr('width', innerWidth).attr('height', innerHeight)
    const chartArea = g.append('g').attr('clip-path', 'url(#macd-clip)')

    // Zero line
    g.append('line')
      .attr('x1', 0).attr('x2', innerWidth)
      .attr('y1', yScale(0)).attr('y2', yScale(0))
      .attr('stroke', '#3f3f46')

    // Histogram bars
    const visibleCount = idxMax - idxMin + 1
    const barWidth = Math.max(1, (innerWidth / visibleCount) * 0.6)

    chartArea.selectAll('.hist')
      .data(allIndexedData)
      .join('rect')
      .attr('x', (d) => xScale(d.idx) - barWidth / 2)
      .attr('y', (d) => d.val.histogram >= 0 ? yScale(d.val.histogram) : yScale(0))
      .attr('width', barWidth)
      .attr('height', (d) => Math.abs(yScale(d.val.histogram) - yScale(0)))
      .attr('fill', (d) => d.val.histogram >= 0 ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)')

    // MACD and signal lines
    const macdLine = d3.line<(typeof allIndexedData)[number]>()
      .x((d) => xScale(d.idx)).y((d) => yScale(d.val.macd))
    const signalLine = d3.line<(typeof allIndexedData)[number]>()
      .x((d) => xScale(d.idx)).y((d) => yScale(d.val.signal))

    chartArea.append('path').datum(allIndexedData).attr('fill', 'none').attr('stroke', '#3b82f6').attr('stroke-width', 1.5).attr('d', macdLine)
    chartArea.append('path').datum(allIndexedData).attr('fill', 'none').attr('stroke', '#f97316').attr('stroke-width', 1.5).attr('d', signalLine)

    // X axis with timestamp labels
    const tickCount = Math.min(8, visibleCount)
    const tickStep = Math.max(1, Math.floor(visibleCount / tickCount))
    const tickIndices: number[] = []
    for (let i = idxMin; i <= idxMax; i += tickStep) {
      tickIndices.push(i)
    }

    const xAxis = g.append('g').attr('transform', `translate(0,${innerHeight})`)
    xAxis.append('line').attr('x1', 0).attr('x2', innerWidth).attr('stroke', '#27272a')
    xAxis.selectAll('text')
      .data(tickIndices)
      .join('text')
      .attr('x', (i) => xScale(i))
      .attr('y', 14)
      .attr('text-anchor', 'middle')
      .attr('fill', '#71717a')
      .attr('font-size', '10px')
      .text((i) => bars[i] ? formatDate(bars[i].timestamp, interval) : '')

    // Y axis
    g.append('g')
      .attr('transform', `translate(${innerWidth},0)`)
      .call(d3.axisRight(yScale).ticks(4).tickSize(0))
      .call((g) => g.selectAll('text').attr('fill', '#71717a').attr('font-size', '10px'))
      .call((g) => g.select('.domain').remove())

    // Label
    g.append('text').attr('x', 4).attr('y', 12).attr('fill', '#71717a').attr('font-size', '10px').text('MACD(12,26,9)')

  }, [bars, macdValues, width, height, visibleRange, interval])

  return (
    <div ref={containerRef} className="w-full">
      <svg ref={svgRef} />
    </div>
  )
}
