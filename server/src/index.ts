import 'dotenv/config'
import { createNodeWebSocket } from '@hono/node-ws'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { stocks } from './routes/stocks.js'
import { portfolio } from './routes/portfolio.js'
import { watchlist } from './routes/watchlist.js'
import { priceStream } from './services/websocket.js'

const app = new Hono()
const { upgradeWebSocket, injectWebSocket } = createNodeWebSocket({ app })

app.use('*', logger())
app.use('/api/*', cors())

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.route('/api/stocks', stocks)
app.route('/api/portfolio', portfolio)
app.route('/api/watchlist', watchlist)

app.get(
  '/ws',
  upgradeWebSocket(() => {
    return {
      onMessage(event, ws) {
        try {
          const msg = JSON.parse(String(event.data))
          if (msg.subscribe) {
            priceStream.subscribe(ws.raw as any, msg.subscribe)
          }
          if (msg.unsubscribe) {
            priceStream.unsubscribe(ws.raw as any, msg.unsubscribe)
          }
        } catch {
          // ignore malformed messages
        }
      },
      onClose(_event, ws) {
        priceStream.removeClient(ws.raw as any)
      },
    }
  })
)

const port = parseInt(process.env.PORT || '3001')

console.log(`Hono server starting on port ${port}`)

const server = serve({ fetch: app.fetch, port })
injectWebSocket(server)
