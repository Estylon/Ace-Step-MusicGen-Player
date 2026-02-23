import { api } from './client'
import type { StemSeparateResponse } from '../types/api'

/**
 * Start a stem separation job.
 */
export async function separateStems(
  source: string,
  mode: 'vocals' | 'multi' | 'two-pass',
): Promise<StemSeparateResponse> {
  return api.post<StemSeparateResponse>('/stems/separate', { source, mode })
}

/**
 * Subscribe to stem separation progress via Server-Sent Events.
 * Returns a cleanup function that closes the EventSource.
 */
export function subscribeToStemProgress(
  jobId: string,
  onEvent: (data: any) => void,
): () => void {
  const es = new EventSource(`/api/stems/${jobId}/progress`)

  es.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      onEvent(data)
      if (data.type === 'complete' || data.type === 'error') {
        es.close()
      }
    } catch {
      // Ignore parse errors (e.g. keepalive pings)
    }
  }

  es.onerror = () => {
    es.close()
    onEvent({ type: 'error', message: 'SSE connection lost' })
  }

  return () => es.close()
}
