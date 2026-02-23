import { api } from './client'
import type { ModelStatusResponse, AdapterListResponse } from '../types/api'

// ── Model endpoints ─────────────────────────────────────────────────────────

/**
 * Get full model + GPU + LM status.
 */
export async function getModelStatus(): Promise<ModelStatusResponse> {
  return api.get<ModelStatusResponse>('/models/status')
}

/**
 * Switch to a different DiT model.
 */
export async function loadModel(
  name: string,
  checkpointPath?: string,
): Promise<{ status: string; message: string; model: string }> {
  return api.post('/models/load', {
    model_name: name,
    checkpoint_path: checkpointPath ?? null,
  })
}

/**
 * Load or switch the LM model.
 */
export async function loadLM(
  modelName: string,
): Promise<{ status: string; message: string }> {
  return api.post('/models/load-lm', { model_name: modelName })
}

// ── Adapter endpoints ───────────────────────────────────────────────────────

/**
 * List all available adapters with compatibility info.
 */
export async function listAdapters(): Promise<AdapterListResponse> {
  return api.get<AdapterListResponse>('/lora/list')
}

/**
 * Load a LoRA/LoKr adapter.
 */
export async function loadAdapter(
  path: string,
  scale: number,
): Promise<{ status: string; message: string }> {
  return api.post('/lora/load', { path, scale })
}

/**
 * Unload the current adapter.
 */
export async function unloadAdapter(): Promise<{ status: string; message: string }> {
  return api.post('/lora/unload')
}

/**
 * Toggle active state or change scale without reloading.
 */
export async function updateAdapterConfig(
  active?: boolean,
  scale?: number,
): Promise<{ status: string; message: string }> {
  return api.patch('/lora/config', { active, scale })
}

/**
 * Re-scan all search paths for adapters.
 */
export async function scanAdapters(): Promise<{ status: string; count: number }> {
  return api.post('/lora/scan')
}

/**
 * Add a folder to adapter search paths.
 */
export async function addSearchPath(
  path: string,
): Promise<{ status: string; search_paths: string[] }> {
  return api.post('/lora/add-path', { path })
}
