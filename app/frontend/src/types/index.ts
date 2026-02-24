/**
 * Core domain types matching the backend Pydantic schemas.
 * Keep in sync with app/backend/models/schemas.py
 */

// ── Generation ──────────────────────────────────────────────────────────────

export interface TrackInfo {
  id: string;
  title: string;
  caption: string;
  lyrics: string;
  bpm: number | null;
  keyscale: string;
  timesignature: string;
  vocal_language: string;
  duration: number;
  audio_path: string;
  audio_url: string;
  audio_format: string;
  seed: number;
  model_name: string;
  adapter_name: string | null;
  adapter_scale: number | null;
  task_type: string;
  params_json: string;
  favorite: boolean;
  rating: number; // 0-5
  created_at: string;
  peaks: number[] | null;
}

export interface StemInfo {
  id: string;
  track_id: string;
  stem_type: string;
  audio_path: string;
  audio_url: string;
  duration: number;
}

// ── Models ──────────────────────────────────────────────────────────────────

export interface ModelCapabilities {
  task_types: string[];
  cfg_support: boolean;
  max_steps: number;
  default_steps: number;
  shift_default: number;
  adg_support: boolean;
  infer_methods: string[];
}

export interface ModelInfo {
  name: string;
  type: string; // "turbo" | "base" | "sft" | "unknown"
  path: string;
  loaded: boolean;
  capabilities: ModelCapabilities;
}

export interface GPUInfo {
  tier: string;
  name: string;
  vram_total_gb: number;
  vram_free_gb: number;
  compute_capability: string;
}

export interface LMInfo {
  loaded: boolean;
  model: string;
  available_models: string[];
}

// ── Adapters (LoRA/LoKr) ───────────────────────────────────────────────────

export interface AdapterInfo {
  name: string;
  path: string;
  type: string; // "lora" | "lokr"
  base_model: string; // "turbo" | "base" | "sft" | "unknown"
  rank: number | null;
  alpha: number | null;
  description: string;
  compatible_with_current: boolean;
}

export interface AdapterCurrent {
  loaded: boolean;
  name: string;
  path: string;
  type: string;
  scale: number;
  active: boolean;
}

// ── Jobs ────────────────────────────────────────────────────────────────────

export type JobStatus = "queued" | "running" | "complete" | "error";

export interface GenerationJob {
  id: string;
  status: JobStatus;
  progress: number;
  message: string;
  tracks: TrackInfo[];
}
