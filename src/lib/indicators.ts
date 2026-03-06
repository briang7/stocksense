export function sma(data: number[], period: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null
    let sum = 0
    for (let j = i - period + 1; j <= i; j++) sum += data[j]
    return sum / period
  })
}

export function ema(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null)
  const k = 2 / (period + 1)

  let sum = 0
  for (let i = 0; i < period; i++) sum += data[i]
  result[period - 1] = sum / period

  for (let i = period; i < data.length; i++) {
    result[i] = data[i] * k + (result[i - 1] as number) * (1 - k)
  }
  return result
}

export interface BollingerBand {
  upper: number
  middle: number
  lower: number
}

export function bollingerBands(
  data: number[],
  period = 20,
  stdDevMultiplier = 2
): (BollingerBand | null)[] {
  const smaValues = sma(data, period)

  return data.map((_, i) => {
    const middle = smaValues[i]
    if (middle === null) return null

    let sumSqDiff = 0
    for (let j = i - period + 1; j <= i; j++) {
      sumSqDiff += (data[j] - middle) ** 2
    }
    const stdDev = Math.sqrt(sumSqDiff / period)

    return {
      upper: middle + stdDevMultiplier * stdDev,
      middle,
      lower: middle - stdDevMultiplier * stdDev,
    }
  })
}

export function rsi(data: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null)

  if (data.length < period + 1) return result

  let avgGain = 0
  let avgLoss = 0

  for (let i = 1; i <= period; i++) {
    const change = data[i] - data[i - 1]
    if (change > 0) avgGain += change
    else avgLoss += Math.abs(change)
  }
  avgGain /= period
  avgLoss /= period

  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)

  for (let i = period + 1; i < data.length; i++) {
    const change = data[i] - data[i - 1]
    const gain = change > 0 ? change : 0
    const loss = change < 0 ? Math.abs(change) : 0

    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period

    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)
  }

  return result
}

export interface MacdPoint {
  macd: number
  signal: number
  histogram: number
}

export function macd(
  data: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): (MacdPoint | null)[] {
  const fastEma = ema(data, fastPeriod)
  const slowEma = ema(data, slowPeriod)

  const macdLine: number[] = data.map((_, i) => {
    const f = fastEma[i]
    const s = slowEma[i]
    if (f === null || s === null) return 0
    return f - s
  })

  const signalLine = ema(macdLine, signalPeriod)

  return data.map((_, i) => {
    const s = signalLine[i]
    if (s === null || i < slowPeriod - 1) return null
    return {
      macd: macdLine[i],
      signal: s,
      histogram: macdLine[i] - s,
    }
  })
}
