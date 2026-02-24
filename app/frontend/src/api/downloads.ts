import { api } from './client'

// ── Types ────────────────────────────────────────────────────────────────────

export interface DownloadableModel {
  repo_id: string
  name: string
  description: string
  type: string        // "dit" | "lm" | "bundle"
  model_type: string  // "turbo" | "base" | "sft" | ""
  size_gb: number
  installed: boolean
}

export interface DownloadableListResponse {
  models: DownloadableModel[]
  checkpoint_dir: string
  has_essential: boolean
}

export interface DownloadSSEEvent {
  type: 'progress' | 'complete' | 'error'
  percent?: number
  downloaded_gb?: number
  total_gb?: number
  message?: string
}

// ── API calls ────────────────────────────────────────────────────────────────

export async function getDownloadableModels(): Promise<DownloadableListResponse> {
  return api.get<DownloadableListResponse>('/downloads/available')
}

export async function startDownload(
  repoId: string,
): Promise<{ job_id: string; status: string }> {
  return api.post('/downloads/start', { repo_id: repoId })
}

export async function cancelDownload(
  jobId: string,
): Promise<{ status: string }> {
  return api.post(`/downloads/${jobId}/cancel`)
}

/**
 * Subscribe to SSE download progress events.
 * Returns an unsubscribe function.
 */
export function subscribeToDownloadProgress(
  jobId: string,
  onEvent: (data: DownloadSSEEvent) => void,
): () => void {
  const es = new EventSource(`/api/downloads/${jobId}/progress`)

  es.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as DownloadSSEEvent
      onEvent(data)
      if (data.type === 'complete' || data.type === 'error') {
        es.close()
      }
    } catch {
      /* ignore parse errors */
    }
  }

  es.onerror = () => {
    es.close()
    onEvent({ type: 'error', message: 'Download connection lost' })
  }

  return () => es.close()
}
