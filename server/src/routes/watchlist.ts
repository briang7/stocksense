import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { watchlists, watchlistItems, priceAlerts } from '../db/schema.js'

const watchlist = new Hono()

watchlist.get('/', async (c) => {
  const result = await db.select().from(watchlists).orderBy(watchlists.createdAt)
  return c.json(result)
})

watchlist.post('/', async (c) => {
  const { name } = await c.req.json<{ name: string }>()
  const [result] = await db.insert(watchlists).values({ name }).returning()
  return c.json(result, 201)
})

watchlist.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const [w] = await db.select().from(watchlists).where(eq(watchlists.id, id))
  if (!w) return c.json({ error: 'Watchlist not found' }, 404)
  const items = await db.select().from(watchlistItems).where(eq(watchlistItems.watchlistId, id))
  return c.json({ ...w, items })
})

watchlist.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  await db.delete(watchlists).where(eq(watchlists.id, id))
  return c.json({ ok: true })
})

watchlist.post('/:id/items', async (c) => {
  const watchlistId = Number(c.req.param('id'))
  const { symbol } = await c.req.json<{ symbol: string }>()
  const [item] = await db
    .insert(watchlistItems)
    .values({ watchlistId, symbol: symbol.toUpperCase() })
    .returning()
  return c.json(item, 201)
})

watchlist.delete('/:id/items/:itemId', async (c) => {
  const itemId = Number(c.req.param('itemId'))
  await db.delete(watchlistItems).where(eq(watchlistItems.id, itemId))
  return c.json({ ok: true })
})

watchlist.get('/alerts', async (c) => {
  const result = await db.select().from(priceAlerts)
  return c.json(result)
})

watchlist.post('/alerts', async (c) => {
  const body = await c.req.json<{ symbol: string; targetPrice: number; direction: 'above' | 'below' }>()
  const [alert] = await db
    .insert(priceAlerts)
    .values({
      symbol: body.symbol.toUpperCase(),
      targetPrice: body.targetPrice,
      direction: body.direction,
    })
    .returning()
  return c.json(alert, 201)
})

watchlist.delete('/alerts/:id', async (c) => {
  const id = Number(c.req.param('id'))
  await db.delete(priceAlerts).where(eq(priceAlerts.id, id))
  return c.json({ ok: true })
})

export { watchlist }
