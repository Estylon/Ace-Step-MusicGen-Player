import { create } from 'zustand'
import {
  listPresets,
  createPreset as apiCreatePreset,
  updatePreset as apiUpdatePreset,
  deletePreset as apiDeletePreset,
  type PresetInfo,
} from '../api/presets'

interface PresetState {
  presets: PresetInfo[]
  loading: boolean

  fetchPresets: () => Promise<void>
  createPreset: (name: string, paramsJson: string) => Promise<PresetInfo>
  updatePreset: (id: string, name?: string, paramsJson?: string) => Promise<void>
  deletePreset: (id: string) => Promise<void>
}

export const usePresetStore = create<PresetState>((set, get) => ({
  presets: [],
  loading: false,

  fetchPresets: async () => {
    set({ loading: true })
    try {
      const presets = await listPresets()
      set({ presets })
    } catch (err) {
      console.error('Failed to fetch presets:', err)
    } finally {
      set({ loading: false })
    }
  },

  createPreset: async (name, paramsJson) => {
    const preset = await apiCreatePreset(name, paramsJson)
    // Refresh list
    await get().fetchPresets()
    return preset
  },

  updatePreset: async (id, name, paramsJson) => {
    const data: { name?: string; params_json?: string } = {}
    if (name !== undefined) data.name = name
    if (paramsJson !== undefined) data.params_json = paramsJson
    await apiUpdatePreset(id, data)
    await get().fetchPresets()
  },

  deletePreset: async (id) => {
    await apiDeletePreset(id)
    await get().fetchPresets()
  },
}))
