import { api } from './client'
import type { GPUInfo } from '../types'

/**
 * Get current GPU info (VRAM, tier, etc.).
 */
export async function getGPUStatus(): Promise<GPUInfo> {
  return api.get<GPUInfo>('/gpu/status')
}
