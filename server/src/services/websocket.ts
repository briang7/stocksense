import type { ServerWebSocket } from '@hono/node-ws'
import { fetchQuote } from './yahoo-finance.js'

class PriceStreamManager {
  private subscriptions = new Map<ServerWebSocket, Set<string>>()
  private intervalId: ReturnType<typeof setInterval> | null = null
  private lastPrices = new Map<string, number>()

  subscribe(ws: ServerWebSocket, symbol: string): void {
    if (!this.subscriptions.has(ws)) {
      this.subscriptions.set(ws, new Set())
    }
    this.subscriptions.get(ws)!.add(symbol.toUpperCase())
    this.ensurePolling()
  }

  unsubscribe(ws: ServerWebSocket, symbol: string): void {
    const symbols = this.subscriptions.get(ws)
    if (symbols) {
      symbols.delete(symbol.toUpperCase())
      if (symbols.size === 0) this.subscriptions.delete(ws)
    }
    this.checkStopPolling()
  }

  removeClient(ws: ServerWebSocket): void {
    this.subscriptions.delete(ws)
    this.checkStopPolling()
  }

  private getAllSymbols(): string[] {
    const symbols = new Set<string>()
    for (const syms of this.subscriptions.values()) {
      for (const s of syms) symbols.add(s)
    }
    return Array.from(symbols)
  }

  private ensurePolling(): void {
    if (this.intervalId) return
    this.intervalId = setInterval(() => this.poll(), 15_000)
    this.poll()
  }

  private checkStopPolling(): void {
    if (this.subscriptions.size === 0 && this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  private async poll(): Promise<void> {
    const symbols = this.getAllSymbols()
    if (symbols.length === 0) return

    for (const symbol of symbols) {
      try {
        const quote = await fetchQuote(symbol)
        const lastPrice = this.lastPrices.get(symbol)

        if (lastPrice !== quote.price) {
          this.lastPrices.set(symbol, quote.price)
          this.broadcast(symbol, quote)
        }
      } catch {
        // Silently skip failed fetches
      }
    }
  }

  private broadcast(symbol: string, data: unknown): void {
    const message = JSON.stringify({ type: 'price', symbol, data })
    for (const [ws, symbols] of this.subscriptions) {
      if (symbols.has(symbol)) {
        try {
          ws.send(message)
        } catch {
          this.removeClient(ws)
        }
      }
    }
  }
}

export const priceStream = new PriceStreamManager()
