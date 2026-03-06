import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { portfolios, holdings, transactions } from '../db/schema.js'

const portfolio = new Hono()

portfolio.get('/', async (c) => {
  const result = await db.select().from(portfolios).orderBy(portfolios.createdAt)
  return c.json(result)
})

portfolio.post('/', async (c) => {
  const { name } = await c.req.json<{ name: string }>()
  const [result] = await db.insert(portfolios).values({ name }).returning()
  return c.json(result, 201)
})

portfolio.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const [p] = await db.select().from(portfolios).where(eq(portfolios.id, id))
  if (!p) return c.json({ error: 'Portfolio not found' }, 404)
  const h = await db.select().from(holdings).where(eq(holdings.portfolioId, id))
  return c.json({ ...p, holdings: h })
})

portfolio.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  await db.delete(portfolios).where(eq(portfolios.id, id))
  return c.json({ ok: true })
})

portfolio.post('/:id/holdings', async (c) => {
  const portfolioId = Number(c.req.param('id'))
  const body = await c.req.json<{ symbol: string; shares: number; buyPrice: number; buyDate: string }>()
  const [holding] = await db
    .insert(holdings)
    .values({
      portfolioId,
      symbol: body.symbol.toUpperCase(),
      shares: body.shares,
      buyPrice: body.buyPrice,
      buyDate: new Date(body.buyDate),
    })
    .returning()

  await db.insert(transactions).values({
    portfolioId,
    symbol: body.symbol.toUpperCase(),
    type: 'buy',
    shares: body.shares,
    price: body.buyPrice,
    date: new Date(body.buyDate),
  })

  return c.json(holding, 201)
})

portfolio.delete('/:id/holdings/:holdingId', async (c) => {
  const holdingId = Number(c.req.param('holdingId'))
  await db.delete(holdings).where(eq(holdings.id, holdingId))
  return c.json({ ok: true })
})

portfolio.get('/:id/transactions', async (c) => {
  const portfolioId = Number(c.req.param('id'))
  const txns = await db.select().from(transactions).where(eq(transactions.portfolioId, portfolioId))
  return c.json(txns)
})

export { portfolio }
