import 'dotenv/config'
import { db } from './index.js'
import { portfolios, watchlists, watchlistItems } from './schema.js'

async function seed() {
  console.log('Seeding database...')

  // Create default portfolio
  const [portfolio] = await db.insert(portfolios).values({ name: 'My Portfolio' }).returning()
  console.log(`Created portfolio: ${portfolio.name} (id: ${portfolio.id})`)

  // Create default watchlist with popular stocks
  const [watchlist] = await db.insert(watchlists).values({ name: 'Favorites' }).returning()
  console.log(`Created watchlist: ${watchlist.name} (id: ${watchlist.id})`)

  const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA']
  for (const symbol of symbols) {
    await db.insert(watchlistItems).values({ watchlistId: watchlist.id, symbol })
  }
  console.log(`Added ${symbols.length} symbols to watchlist`)

  console.log('Seed complete!')
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
