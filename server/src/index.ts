import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { stocks } from './routes/stocks.js'
import { portfolio } from './routes/portfolio.js'
import { watchlist } from './routes/watchlist.js'
import 'dotenv/config'

const app = new Hono()

app.use('*', logger())
app.use('/api/*', cors())

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.route('/api/stocks', stocks)
app.route('/api/portfolio', portfolio)
app.route('/api/watchlist', watchlist)

const port = parseInt(process.env.PORT || '3001')

console.log(`Hono server starting on port ${port}`)

serve({ fetch: app.fetch, port })
