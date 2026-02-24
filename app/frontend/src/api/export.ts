/**
 * Batch export API — mastered WAV files for digital store delivery.
 */

const API_BASE = '/api'

export interface BatchExportOptions {
  trackIds: string[]
  targetLufs?: number
  truePeakDb?: number
  sampleRate?: number
}

/**
 * Request batch export of tracks as mastered WAV files.
 * Returns a Blob containing a ZIP archive.
 */
export async function batchExport(options: BatchExportOptions): Promise<Blob> {
  const res = await fetch(`${API_BASE}/export/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      track_ids: options.trackIds,
      target_lufs: options.targetLufs ?? -14.0,
      true_peak_db: options.truePeakDb ?? -1.0,
      sample_rate: options.sampleRate ?? 44100,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || err.message || `HTTP ${res.status}`)
  }

  return res.blob()
}

/**
 * Trigger download of a blob as a file in the browser.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
