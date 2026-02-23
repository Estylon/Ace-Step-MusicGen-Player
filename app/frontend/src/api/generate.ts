import { api } from './client'
import type { GenerateRequest, GenerateResponse, UploadResponse } from '../types/api'

/**
 * Start a music generation job.
 */
export async function createGeneration(
  params: Partial<GenerateRequest>,
): Promise<GenerateResponse> {
  return api.post<GenerateResponse>('/generate', params)
}

/**
 * Subscribe to generation progress via Server-Sent Events.
 * Returns a cleanup function that closes the EventSource.
 */
export function subscribeToProgress(
  jobId: string,
  onEvent: (data: any) => void,
): () => void {
  const es = new EventSource(`/api/generate/${jobId}/progress`)

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

/**
 * Upload a reference audio file for cover/repaint tasks.
 */
export async function uploadReferenceAudio(
  file: File,
): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch('/api/generate/upload', {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || err.message || `HTTP ${res.status}`)
  }

  return res.json()
}
