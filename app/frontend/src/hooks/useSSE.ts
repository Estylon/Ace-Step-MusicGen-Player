import { useEffect, useRef, useState } from 'react'

interface UseSSEResult {
  connected: boolean
  error: string | null
}

/**
 * Custom hook for Server-Sent Events.
 * Creates an EventSource when `url` is set, auto-cleans up on unmount.
 * Parses JSON data from SSE events and forwards to the `onMessage` callback.
 */
export function useSSE(
  url: string | null,
  onMessage: (data: any) => void,
): UseSSEResult {
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const onMessageRef = useRef(onMessage)

  // Keep the callback ref up to date without triggering reconnections
  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  useEffect(() => {
    if (!url) {
      setConnected(false)
      setError(null)
      return
    }

    const es = new EventSource(url)

    es.onopen = () => {
      setConnected(true)
      setError(null)
    }

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessageRef.current(data)

        // Auto-close on terminal events
        if (data.type === 'complete' || data.type === 'error') {
          es.close()
          setConnected(false)
        }
      } catch {
        // Ignore parse errors (e.g. keepalive pings)
      }
    }

    es.onerror = () => {
      es.close()
      setConnected(false)
      setError('SSE connection lost')
      onMessageRef.current({ type: 'error', message: 'SSE connection lost' })
    }

    return () => {
      es.close()
      setConnected(false)
    }
  }, [url])

  return { connected, error }
}
