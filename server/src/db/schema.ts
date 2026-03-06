import { pgTable, serial, text, real, integer, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core'

export const transactionTypeEnum = pgEnum('transaction_type', ['buy', 'sell'])
export const alertDirectionEnum = pgEnum('alert_direction', ['above', 'below'])

export const portfolios = pgTable('portfolios', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const holdings = pgTable('holdings', {
  id: serial('id').primaryKey(),
  portfolioId: integer('portfolio_id').references(() => portfolios.id, { onDelete: 'cascade' }).notNull(),
  symbol: text('symbol').notNull(),
  shares: real('shares').notNull(),
  buyPrice: real('buy_price').notNull(),
  buyDate: timestamp('buy_date').notNull(),
})

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  portfolioId: integer('portfolio_id').references(() => portfolios.id, { onDelete: 'cascade' }).notNull(),
  symbol: text('symbol').notNull(),
  type: transactionTypeEnum('type').notNull(),
  shares: real('shares').notNull(),
  price: real('price').notNull(),
  date: timestamp('date').notNull(),
})

export const watchlists = pgTable('watchlists', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const watchlistItems = pgTable('watchlist_items', {
  id: serial('id').primaryKey(),
  watchlistId: integer('watchlist_id').references(() => watchlists.id, { onDelete: 'cascade' }).notNull(),
  symbol: text('symbol').notNull(),
  addedAt: timestamp('added_at').defaultNow().notNull(),
})

export const priceAlerts = pgTable('price_alerts', {
  id: serial('id').primaryKey(),
  symbol: text('symbol').notNull(),
  targetPrice: real('target_price').notNull(),
  direction: alertDirectionEnum('direction').notNull(),
  triggered: boolean('triggered').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
