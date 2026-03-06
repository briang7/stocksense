import { describe, it, expect } from 'vitest'
import { sma, ema, bollingerBands, rsi, macd } from '../indicators'

const closes = [44, 44.34, 44.09, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84, 46.08,
  45.89, 46.03, 45.61, 46.28, 46.28, 46.00, 46.03, 46.41, 46.22, 45.64]

describe('indicators', () => {
  it('calculates SMA correctly', () => {
    const result = sma(closes, 5)
    expect(result).toHaveLength(closes.length)
    expect(result[4]).toBeCloseTo(44.074, 2)
    expect(result[3]).toBeNull()
  })

  it('calculates EMA correctly', () => {
    const result = ema(closes, 5)
    expect(result).toHaveLength(closes.length)
    expect(result[4]).not.toBeNull()
  })

  it('calculates Bollinger Bands', () => {
    const result = bollingerBands(closes, 20, 2)
    expect(result).toHaveLength(closes.length)
    const last = result[result.length - 1]
    expect(last).not.toBeNull()
    if (last) {
      expect(last.upper).toBeGreaterThan(last.middle)
      expect(last.lower).toBeLessThan(last.middle)
    }
  })

  it('calculates RSI in 0-100 range', () => {
    const result = rsi(closes, 14)
    const values = result.filter((v): v is number => v !== null)
    values.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(100)
    })
  })

  it('calculates MACD', () => {
    const result = macd(closes)
    expect(result).toHaveLength(closes.length)
  })
})
