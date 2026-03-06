import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export function useStockWebSocket(symbol: string | null) {
  const wsRef = useRef<WebSocket | null>(null)
  const qc = useQueryClient()

  useEffect(() => {
    if (!symbol) return

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${protocol}://${window.location.host}/ws`)
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({ subscribe: symbol }))
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'price' && msg.symbol === symbol) {
          qc.setQueryData(['quote', symbol], msg.data)
        }
      } catch { /* ignore */ }
    }

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ unsubscribe: symbol }))
      }
      ws.close()
    }
  }, [symbol, qc])
}
