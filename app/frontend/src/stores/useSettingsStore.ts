import { create } from 'zustand'
import type { ModelStatusResponse, AdapterListResponse } from '../types/api'
import type { DownloadJob } from '../types'
import {
  getModelStatus,
  listAdapters,
  loadModel as apiLoadModel,
  loadAdapter as apiLoadAdapter,
  unloadAdapter as apiUnloadAdapter,
  updateAdapterConfig as apiUpdateAdapterConfig,
} from '../api/models'
import {
  getDownloadableModels,
  startDownload as apiStartDownload,
  cancelDownload as apiCancelDownload,
  subscribeToDownloadProgress,
  type DownloadableModel,
} from '../api/downloads'

interface SettingsState {
  modelStatus: ModelStatusResponse | null
  adapterList: AdapterListResponse | null
  loading: boolean

  /** Style tags (trigger words) keyed by adapter path. */
  adapterStyleTags: Record<string, string>

  // ── Downloads ────────────────────────────────────────────────────────
  downloadableModels: DownloadableModel[]
  hasEssential: boolean
  activeDownloads: Record<string, DownloadJob>

  fetchModelStatus: () => Promise<void>
  fetchAdapterList: () => Promise<void>
  loadModel: (name: string) => Promise<void>
  loadAdapter: (path: string, scale: number) => Promise<void>
  unloadAdapter: () => Promise<void>
  updateAdapterConfig: (active?: boolean, scale?: number) => Promise<void>

  /** Set/update the style tag for a specific adapter path. */
  setAdapterStyleTag: (adapterPath: string, tag: string) => void

  /**
   * Return the active adapter's style tag, or empty string if none.
   * "Active" means: adapter is loaded AND enabled AND has a non-empty tag.
   */
  getActiveStyleTag: () => string

  // ── Download actions ────────────────────────────────────────────────
  fetchDownloadable: () => Promise<void>
  startModelDownload: (repoId: string, name: string, sizeGb: number) => Promise<void>
  cancelModelDownload: (jobId: string) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  modelStatus: null,
  adapterList: null,
  loading: false,
  adapterStyleTags: {},
  downloadableModels: [],
  hasEssential: false,
  activeDownloads: {},

  fetchModelStatus: async () => {
    set({ loading: true })
    try {
      const status = await getModelStatus()
      set({ modelStatus: status })
    } catch (err) {
      console.error('Failed to fetch model status:', err)
    } finally {
      set({ loading: false })
    }
  },

  fetchAdapterList: async () => {
    try {
      const list = await listAdapters()
      set({ adapterList: list })
    } catch (err) {
      console.error('Failed to fetch adapter list:', err)
    }
  },

  loadModel: async (name: string) => {
    set({ loading: true })
    try {
      await apiLoadModel(name)
      // Refresh model status and adapter compatibility after model change
      await get().fetchModelStatus()
      await get().fetchAdapterList()
    } catch (err) {
      console.error('Failed to load model:', err)
      throw err
    } finally {
      set({ loading: false })
    }
  },

  loadAdapter: async (path: string, scale: number) => {
    set({ loading: true })
    try {
      await apiLoadAdapter(path, scale)
      await get().fetchAdapterList()
    } catch (err) {
      console.error('Failed to load adapter:', err)
      throw err
    } finally {
      set({ loading: false })
    }
  },

  unloadAdapter: async () => {
    set({ loading: true })
    try {
      await apiUnloadAdapter()
      await get().fetchAdapterList()
    } catch (err) {
      console.error('Failed to unload adapter:', err)
      throw err
    } finally {
      set({ loading: false })
    }
  },

  updateAdapterConfig: async (active?: boolean, scale?: number) => {
    try {
      await apiUpdateAdapterConfig(active, scale)
      await get().fetchAdapterList()
    } catch (err) {
      console.error('Failed to update adapter config:', err)
      throw err
    }
  },

  setAdapterStyleTag: (adapterPath, tag) => {
    set((state) => ({
      adapterStyleTags: { ...state.adapterStyleTags, [adapterPath]: tag },
    }))
  },

  getActiveStyleTag: () => {
    const { adapterList, adapterStyleTags } = get()
    const current = adapterList?.current
    if (!current?.loaded || !current.active || !current.path) return ''
    return (adapterStyleTags[current.path] ?? '').trim()
  },

  // ── Download actions ────────────────────────────────────────────────

  fetchDownloadable: async () => {
    try {
      const data = await getDownloadableModels()
      set({
        downloadableModels: data.models,
        hasEssential: data.has_essential,
      })
    } catch (err) {
      console.error('Failed to fetch downloadable models:', err)
    }
  },

  startModelDownload: async (repoId: string, name: string, sizeGb: number) => {
    try {
      const { job_id } = await apiStartDownload(repoId)

      // Create optimistic job entry
      const job: DownloadJob = {
        id: job_id,
        repoId,
        name,
        status: 'downloading',
        percent: 0,
        downloadedGb: 0,
        totalGb: sizeGb,
        message: `Starting download of ${name}...`,
      }

      set((state) => ({
        activeDownloads: { ...state.activeDownloads, [job_id]: job },
      }))

      // Subscribe to SSE progress
      subscribeToDownloadProgress(job_id, (event) => {
        set((state) => {
          const existing = state.activeDownloads[job_id]
          if (!existing) return state

          const updated = { ...existing }

          if (event.type === 'progress') {
            updated.percent = event.percent ?? updated.percent
            updated.downloadedGb = event.downloaded_gb ?? updated.downloadedGb
            updated.totalGb = event.total_gb ?? updated.totalGb
            updated.message = event.message ?? updated.message
          } else if (event.type === 'complete') {
            updated.status = 'complete'
            updated.percent = 100
            updated.message = event.message ?? 'Download complete'
            // Refresh model list and downloadable list after completion
            setTimeout(() => {
              get().fetchModelStatus()
              get().fetchDownloadable()
            }, 500)
          } else if (event.type === 'error') {
            updated.status = 'error'
            updated.message = event.message ?? 'Download failed'
          }

          return {
            activeDownloads: { ...state.activeDownloads, [job_id]: updated },
          }
        })
      })
    } catch (err) {
      console.error('Failed to start download:', err)
      throw err
    }
  },

  cancelModelDownload: async (jobId: string) => {
    try {
      await apiCancelDownload(jobId)
      set((state) => {
        const existing = state.activeDownloads[jobId]
        if (!existing) return state
        return {
          activeDownloads: {
            ...state.activeDownloads,
            [jobId]: { ...existing, status: 'cancelled', message: 'Download cancelled' },
          },
        }
      })
    } catch (err) {
      console.error('Failed to cancel download:', err)
    }
  },
}))
