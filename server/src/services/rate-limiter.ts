interface QueueItem {
  execute: () => Promise<unknown>
  resolve: (value: unknown) => void
  reject: (error: unknown) => void
  priority: number
}

export class RateLimiter {
  private queue: QueueItem[] = []
  private lastRequestTime = 0
  private processing = false

  constructor(private minIntervalMs: number = 500) {}

  async enqueue<T>(fn: () => Promise<T>, priority = 0): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        execute: fn as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
        priority,
      })
      this.queue.sort((a, b) => b.priority - a.priority)
      this.processQueue()
    })
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return
    this.processing = true

    while (this.queue.length > 0) {
      const now = Date.now()
      const elapsed = now - this.lastRequestTime
      if (elapsed < this.minIntervalMs) {
        await new Promise((r) => setTimeout(r, this.minIntervalMs - elapsed))
      }

      const item = this.queue.shift()!
      this.lastRequestTime = Date.now()

      try {
        const result = await item.execute()
        item.resolve(result)
      } catch (error) {
        item.reject(error)
      }
    }

    this.processing = false
  }
}
