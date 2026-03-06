import { useRef, useEffect, useState } from 'react'
import * as d3 from 'd3'
import type { OhlcvBar } from '@/lib/api'

interface RsiChartProps {
  bars: OhlcvBar[]
  rsiValues: (number | null)[]
  height?: number
}

export function RsiChart({ bars, rsiValues, height = 120 }: RsiChartProps) {
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

    const xScale = d3.scaleTime()
      .domain(d3.extent(bars, (d) => new Date(d.timestamp)) as [Date, Date])
      .range([0, innerWidth])

    const yScale = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0])

    // Overbought/oversold zones
    g.append('rect')
      .attr('x', 0).attr('y', yScale(100)).attr('width', innerWidth)
      .attr('height', yScale(70) - yScale(100))
      .attr('fill', 'rgba(239, 68, 68, 0.05)')

    g.append('rect')
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
      .map((bar, i) => ({ x: new Date(bar.timestamp), y: rsiValues[i] }))
      .filter((d): d is { x: Date; y: number } => d.y !== null)

    const line = d3.line<{ x: Date; y: number }>().x((d) => xScale(d.x)).y((d) => yScale(d.y))

    g.append('path')
      .datum(lineData)
      .attr('fill', 'none')
      .attr('stroke', '#a78bfa')
      .attr('stroke-width', 1.5)
      .attr('d', line)

    // Y axis
    g.append('g')
      .attr('transform', `translate(${innerWidth},0)`)
      .call(d3.axisRight(yScale).tickValues([30, 50, 70]).tickSize(0))
      .call((g) => g.selectAll('text').attr('fill', '#71717a').attr('font-size', '10px'))
      .call((g) => g.select('.domain').remove())

    // Label
    g.append('text').attr('x', 4).attr('y', 12).attr('fill', '#71717a').attr('font-size', '10px').text('RSI(14)')

  }, [bars, rsiValues, width, height])

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
}

export function MacdChart({ bars, macdValues, height = 120 }: MacdChartProps) {
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

    const xScale = d3.scaleTime()
      .domain(d3.extent(bars, (d) => new Date(d.timestamp)) as [Date, Date])
      .range([0, innerWidth])

    const validValues = macdValues.filter((v): v is NonNullable<typeof v> => v !== null)
    if (validValues.length === 0) return

    const allValues = validValues.flatMap((v) => [v.macd, v.signal, v.histogram])
    const yExtent = d3.extent(allValues) as [number, number]
    const yScale = d3.scaleLinear().domain(yExtent).range([innerHeight, 0]).nice()

    // Zero line
    g.append('line')
      .attr('x1', 0).attr('x2', innerWidth)
      .attr('y1', yScale(0)).attr('y2', yScale(0))
      .attr('stroke', '#3f3f46')

    // Histogram bars
    const barWidth = Math.max(1, (innerWidth / bars.length) * 0.6)
    const histData = bars.map((bar, i) => ({ x: new Date(bar.timestamp), val: macdValues[i] }))
      .filter((d): d is { x: Date; val: NonNullable<typeof d.val> } => d.val !== null)

    g.selectAll('.hist')
      .data(histData)
      .join('rect')
      .attr('x', (d) => xScale(d.x) - barWidth / 2)
      .attr('y', (d) => d.val.histogram >= 0 ? yScale(d.val.histogram) : yScale(0))
      .attr('width', barWidth)
      .attr('height', (d) => Math.abs(yScale(d.val.histogram) - yScale(0)))
      .attr('fill', (d) => d.val.histogram >= 0 ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)')

    // MACD and signal lines
    const macdLine = d3.line<{ x: Date; val: NonNullable<(typeof macdValues)[number]> }>()
      .x((d) => xScale(d.x)).y((d) => yScale(d.val.macd))
    const signalLine = d3.line<{ x: Date; val: NonNullable<(typeof macdValues)[number]> }>()
      .x((d) => xScale(d.x)).y((d) => yScale(d.val.signal))

    g.append('path').datum(histData).attr('fill', 'none').attr('stroke', '#3b82f6').attr('stroke-width', 1.5).attr('d', macdLine)
    g.append('path').datum(histData).attr('fill', 'none').attr('stroke', '#f97316').attr('stroke-width', 1.5).attr('d', signalLine)

    // Y axis
    g.append('g')
      .attr('transform', `translate(${innerWidth},0)`)
      .call(d3.axisRight(yScale).ticks(4).tickSize(0))
      .call((g) => g.selectAll('text').attr('fill', '#71717a').attr('font-size', '10px'))
      .call((g) => g.select('.domain').remove())

    // Label
    g.append('text').attr('x', 4).attr('y', 12).attr('fill', '#71717a').attr('font-size', '10px').text('MACD(12,26,9)')

  }, [bars, macdValues, width, height])

  return (
    <div ref={containerRef} className="w-full">
      <svg ref={svgRef} />
    </div>
  )
}
