import * as d3 from 'd3'
import type { OhlcvBar } from './api'

export interface ChartDimensions {
  width: number
  height: number
  margin: { top: number; right: number; bottom: number; left: number }
  innerWidth: number
  innerHeight: number
  priceHeight: number
  volumeHeight: number
}

export function calcDimensions(width: number, height: number): ChartDimensions {
  const margin = { top: 20, right: 60, bottom: 30, left: 10 }
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom
  const volumeHeight = innerHeight * 0.2
  const priceHeight = innerHeight * 0.8 - 10

  return { width, height, margin, innerWidth, innerHeight, priceHeight, volumeHeight }
}

export function createScales(bars: OhlcvBar[], dims: ChartDimensions) {
  const xScale = d3
    .scaleTime()
    .domain(d3.extent(bars, (d) => new Date(d.timestamp)) as [Date, Date])
    .range([0, dims.innerWidth])

  const yScale = d3
    .scaleLinear()
    .domain([d3.min(bars, (d) => d.low)! * 0.995, d3.max(bars, (d) => d.high)! * 1.005])
    .range([dims.priceHeight, 0])

  const volumeScale = d3
    .scaleLinear()
    .domain([0, d3.max(bars, (d) => d.volume)!])
    .range([dims.volumeHeight, 0])

  return { xScale, yScale, volumeScale }
}
