import { describe, it, expect } from 'vitest'
import { fetchChart, searchSymbols } from '../yahoo-finance.js'

describe('Yahoo Finance Service', () => {
  it('fetches AAPL daily chart data', async () => {
    const end = Date.now()
    const start = end - 30 * 24 * 60 * 60 * 1000
    const { bars, quote } = await fetchChart('AAPL', '1d', start, end)

    expect(bars.length).toBeGreaterThan(0)
    expect(bars[0]).toHaveProperty('open')
    expect(bars[0]).toHaveProperty('high')
    expect(bars[0]).toHaveProperty('low')
    expect(bars[0]).toHaveProperty('close')
    expect(bars[0]).toHaveProperty('volume')
    expect(quote.symbol).toBe('AAPL')
    expect(quote.price).toBeGreaterThan(0)
  }, 15000)

  it('returns search results for "Apple"', async () => {
    const results = await searchSymbols('Apple')
    expect(results.length).toBeGreaterThan(0)
    expect(results.some((r) => r.symbol === 'AAPL')).toBe(true)
  }, 15000)

  it('throws on invalid symbol', async () => {
    await expect(fetchChart('ZZZZZZINVALID999')).rejects.toThrow()
  }, 15000)
})
