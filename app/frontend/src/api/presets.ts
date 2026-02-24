import { api } from './client'

// ── Types ────────────────────────────────────────────────────────────────────

export interface PresetInfo {
  id: string
  name: string
  params_json: string
  created_at: string
  updated_at: string
}

// ── API calls ────────────────────────────────────────────────────────────────

export async function listPresets(): Promise<PresetInfo[]> {
  return api.get<PresetInfo[]>('/presets')
}

export async function getPreset(id: string): Promise<PresetInfo> {
  return api.get<PresetInfo>(`/presets/${id}`)
}

export async function createPreset(
  name: string,
  paramsJson: string,
): Promise<PresetInfo> {
  return api.post<PresetInfo>('/presets', { name, params_json: paramsJson })
}

export async function updatePreset(
  id: string,
  data: { name?: string; params_json?: string },
): Promise<void> {
  await api.put(`/presets/${id}`, data)
}

export async function deletePreset(id: string): Promise<void> {
  await api.delete(`/presets/${id}`)
}
