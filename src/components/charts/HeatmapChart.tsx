import { useRef, useEffect, useState } from 'react'
import * as d3 from 'd3'
import { useNavigate } from '@tanstack/react-router'
import { useQuotes } from '@/hooks/useStockData'
import { formatPercent } from '@/lib/format'

const HEATMAP_STOCKS = [
  { symbol: 'AAPL', sector: 'Tech', cap: 3000 },
  { symbol: 'MSFT', sector: 'Tech', cap: 2800 },
  { symbol: 'GOOGL', sector: 'Tech', cap: 1800 },
  { symbol: 'AMZN', sector: 'Tech', cap: 1700 },
  { symbol: 'NVDA', sector: 'Tech', cap: 2500 },
  { symbol: 'META', sector: 'Tech', cap: 1200 },
  { symbol: 'TSLA', sector: 'Consumer', cap: 800 },
  { symbol: 'BRK-B', sector: 'Finance', cap: 900 },
  { symbol: 'JPM', sector: 'Finance', cap: 550 },
  { symbol: 'V', sector: 'Finance', cap: 500 },
  { symbol: 'UNH', sector: 'Health', cap: 480 },
  { symbol: 'JNJ', sector: 'Health', cap: 400 },
  { symbol: 'XOM', sector: 'Energy', cap: 450 },
  { symbol: 'CVX', sector: 'Energy', cap: 300 },
  { symbol: 'PG', sector: 'Staples', cap: 380 },
  { symbol: 'HD', sector: 'Consumer', cap: 370 },
  { symbol: 'MA', sector: 'Finance', cap: 400 },
  { symbol: 'ABBV', sector: 'Health', cap: 350 },
  { symbol: 'CRM', sector: 'Tech', cap: 300 },
  { symbol: 'COST', sector: 'Staples', cap: 320 },
  { symbol: 'BAC', sector: 'Finance', cap: 280 },
  { symbol: 'PFE', sector: 'Health', cap: 160 },
  { symbol: 'NFLX', sector: 'Tech', cap: 250 },
  { symbol: 'DIS', sector: 'Consumer', cap: 180 },
  { symbol: 'INTC', sector: 'Tech', cap: 120 },
  { symbol: 'AMD', sector: 'Tech', cap: 220 },
  { symbol: 'BA', sector: 'Industrial', cap: 150 },
  { symbol: 'CAT', sector: 'Industrial', cap: 170 },
  { symbol: 'GS', sector: 'Finance', cap: 160 },
  { symbol: 'NEE', sector: 'Utilities', cap: 150 },
]

export function HeatmapChart() {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [width, setWidth] = useState(800)
  const navigate = useNavigate()
  const height = 400

  const symbols = HEATMAP_STOCKS.map((s) => s.symbol)
  const { data: quotes, isLoading } = useQuotes(symbols)

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
    if (!svgRef.current || !quotes || quotes.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', height)

    const quoteMap = new Map(quotes.map((q) => [q.symbol, q]))

    // Build hierarchy
    const sectors = new Map<string, { symbol: string; cap: number; change: number }[]>()
    for (const stock of HEATMAP_STOCKS) {
      const quote = quoteMap.get(stock.symbol)
      if (!quote) continue
      const list = sectors.get(stock.sector) || []
      list.push({ symbol: stock.symbol, cap: stock.cap, change: quote.changePercent })
      sectors.set(stock.sector, list)
    }

    const hierarchyData = {
      name: 'root',
      children: Array.from(sectors.entries()).map(([sector, stocks]) => ({
        name: sector,
        children: stocks.map((s) => ({ name: s.symbol, value: s.cap, change: s.change })),
      })),
    }

    const root = d3.hierarchy(hierarchyData)
      .sum((d: any) => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0))

    d3.treemap<any>()
      .size([width, height])
      .paddingInner(2)
      .paddingOuter(3)
      (root)

    const colorScale = d3.scaleLinear<string>()
      .domain([-4, -2, 0, 2, 4])
      .range(['#991b1b', '#dc2626', '#27272a', '#16a34a', '#15803d'])
      .clamp(true)

    const leaves = root.leaves()

    const groups = svg.selectAll('g')
      .data(leaves)
      .join('g')
      .attr('transform', (d: any) => `translate(${d.x0},${d.y0})`)
      .style('cursor', 'pointer')
      .on('click', (_event: any, d: any) => {
        navigate({ to: '/stock/$ticker', params: { ticker: d.data.name } })
      })

    groups.append('rect')
      .attr('width', (d: any) => Math.max(0, d.x1 - d.x0))
      .attr('height', (d: any) => Math.max(0, d.y1 - d.y0))
      .attr('fill', (d: any) => colorScale(d.data.change))
      .attr('rx', 3)
      .on('mouseenter', function () { d3.select(this).attr('opacity', 0.85) })
      .on('mouseleave', function () { d3.select(this).attr('opacity', 1) })

    // Labels
    groups.each(function (d: any) {
      const w = d.x1 - d.x0
      const h = d.y1 - d.y0
      const g = d3.select(this)

      if (w > 40 && h > 30) {
        g.append('text')
          .attr('x', w / 2)
          .attr('y', h / 2 - 6)
          .attr('text-anchor', 'middle')
          .attr('fill', 'white')
          .attr('font-size', w > 80 ? '12px' : '10px')
          .attr('font-weight', '600')
          .text(d.data.name)

        g.append('text')
          .attr('x', w / 2)
          .attr('y', h / 2 + 10)
          .attr('text-anchor', 'middle')
          .attr('fill', 'rgba(255,255,255,0.7)')
          .attr('font-size', w > 80 ? '11px' : '9px')
          .text(formatPercent(d.data.change))
      } else if (w > 25 && h > 18) {
        g.append('text')
          .attr('x', w / 2)
          .attr('y', h / 2 + 3)
          .attr('text-anchor', 'middle')
          .attr('fill', 'white')
          .attr('font-size', '8px')
          .attr('font-weight', '600')
          .text(d.data.name)
      }
    })

  }, [quotes, width, navigate])

  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4">
        <h3 className="mb-3 text-sm font-medium text-zinc-400">Market Heatmap</h3>
        <div className="h-96 animate-pulse rounded bg-zinc-800/50" />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4">
      <h3 className="mb-3 text-sm font-medium text-zinc-400">Market Heatmap</h3>
      <div ref={containerRef} className="w-full">
        <svg ref={svgRef} />
      </div>
    </div>
  )
}
