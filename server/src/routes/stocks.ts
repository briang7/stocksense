import { Hono } from 'hono'
import { fetchChart, fetchQuote, fetchMultipleQuotes, searchSymbols } from '../services/yahoo-finance.js'
import type { Interval } from '../services/yahoo-finance.js'

const stocks = new Hono()

stocks.get('/chart/:symbol', async (c) => {
  const symbol = c.req.param('symbol')
  const interval = (c.req.query('interval') || '1d') as Interval
  const period1 = c.req.query('period1') ? Number(c.req.query('period1')) : undefined
  const period2 = c.req.query('period2') ? Number(c.req.query('period2')) : undefined

  try {
    const data = await fetchChart(symbol, interval, period1, period2)
    return c.json(data)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    if (msg.includes('not found')) return c.json({ error: msg }, 404)
    if (msg.includes('Rate limit')) return c.json({ error: msg }, 429)
    return c.json({ error: msg }, 500)
  }
})

stocks.get('/quote/:symbol', async (c) => {
  const symbol = c.req.param('symbol')
  try {
    const quote = await fetchQuote(symbol)
    return c.json(quote)
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500)
  }
})

stocks.get('/quotes', async (c) => {
  const symbols = c.req.query('symbols')?.split(',') || []
  if (symbols.length === 0) return c.json({ error: 'No symbols provided' }, 400)
  try {
    const quotes = await fetchMultipleQuotes(symbols)
    return c.json(quotes)
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500)
  }
})

stocks.get('/search', async (c) => {
  const q = c.req.query('q') || ''
  if (q.length < 1) return c.json([])
  try {
    const results = await searchSymbols(q)
    return c.json(results)
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500)
  }
})

export { stocks }
