import { api } from './client'

// ── Types ──────────────────────────────────────────────────────────────────

export interface UserSettings {
  trainer_path: string
  checkpoint_dir: string
  lora_search_paths: string[]
  output_dir: string
  stems_output_dir: string
}

export interface UpdateSettingsRequest {
  trainer_path?: string
  checkpoint_dir?: string
  lora_search_paths?: string[]
  output_dir?: string
  stems_output_dir?: string
}

export interface ValidatePathResponse {
  valid: boolean
  is_dir: boolean
  path: string
  message?: string
}

// ── API calls ──────────────────────────────────────────────────────────────

export async function getSettings(): Promise<UserSettings> {
  return api.get<UserSettings>('/settings')
}

export async function updateSettings(
  request: UpdateSettingsRequest,
): Promise<UserSettings> {
  return api.put<UserSettings>('/settings', request)
}

export async function validatePath(path: string): Promise<ValidatePathResponse> {
  return api.post<ValidatePathResponse>('/settings/validate-path', { path })
}

export interface BrowseFolderResponse {
  selected: boolean
  path: string
}

export async function browseFolder(
  title?: string,
  initialDir?: string,
): Promise<BrowseFolderResponse> {
  return api.post<BrowseFolderResponse>('/settings/browse-folder', {
    title: title ?? 'Select Folder',
    initial_dir: initialDir ?? '',
  })
}
