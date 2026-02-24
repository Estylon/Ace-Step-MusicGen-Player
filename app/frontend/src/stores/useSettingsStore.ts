import { create } from 'zustand'
import type { ModelStatusResponse, AdapterListResponse } from '../types/api'
import {
  getModelStatus,
  listAdapters,
  loadModel as apiLoadModel,
  loadAdapter as apiLoadAdapter,
  unloadAdapter as apiUnloadAdapter,
  updateAdapterConfig as apiUpdateAdapterConfig,
} from '../api/models'

interface SettingsState {
  modelStatus: ModelStatusResponse | null
  adapterList: AdapterListResponse | null
  loading: boolean

  /** Style tags (trigger words) keyed by adapter path. */
  adapterStyleTags: Record<string, string>

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
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  modelStatus: null,
  adapterList: null,
  loading: false,
  adapterStyleTags: {},

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
}))
