/**
 * API request/response types for the ACE-Step backend.
 * Keep in sync with app/backend/models/schemas.py
 */

import type {
  AdapterCurrent,
  AdapterInfo,
  GPUInfo,
  LMInfo,
  ModelInfo,
  StemInfo,
  TrackInfo,
} from "./index";

// ── Generation ──────────────────────────────────────────────────────────────

export interface GenerateRequest {
  // Text inputs
  caption: string;
  lyrics: string;
  instrumental: boolean;

  // Music metadata
  bpm: number | null;
  keyscale: string;
  timesignature: string;
  vocal_language: string;
  duration: number;

  // Diffusion parameters
  inference_steps: number;
  guidance_scale: number;
  seed: number;
  use_adg: boolean;
  cfg_interval_start: number;
  cfg_interval_end: number;
  shift: number;
  infer_method: "ode" | "sde";
  timesteps: string | null;

  // Task
  task_type: string;
  reference_audio: string | null;
  src_audio: string | null;
  repainting_start: number;
  repainting_end: number;
  audio_cover_strength: number;
  track_name: string | null;

  // LM parameters
  thinking: boolean;
  lm_temperature: number;
  lm_cfg_scale: number;
  lm_top_k: number;
  lm_top_p: number;
  lm_negative_prompt: string;
  use_cot_metas: boolean;
  use_cot_caption: boolean;
  use_cot_language: boolean;
  use_constrained_decoding: boolean;

  // Batch
  batch_size: number;
  audio_format: string;
}

export interface GenerateResponse {
  job_id: string;
  status: string;
}

export interface UploadResponse {
  path: string;
  filename: string;
  duration: number | null;
}

// ── Stem Separation ─────────────────────────────────────────────────────────

export interface StemSeparateRequest {
  source: string;
  mode: "vocals" | "multi" | "two-pass";
}

export interface StemSeparateResponse {
  job_id: string;
  status: string;
}

// ── Models ──────────────────────────────────────────────────────────────────

export interface ModelStatusResponse {
  current_model: ModelInfo | null;
  available_models: ModelInfo[];
  gpu: GPUInfo;
  lm: LMInfo;
}

// ── Adapters ────────────────────────────────────────────────────────────────

export interface AdapterListResponse {
  adapters: AdapterInfo[];
  current: AdapterCurrent;
  search_paths: string[];
}

// ── Library ─────────────────────────────────────────────────────────────────

export interface LibraryListResponse {
  tracks: TrackInfo[];
  total: number;
  page: number;
  page_size: number;
}

export interface TrackDetailResponse {
  track: TrackInfo;
  stems: StemInfo[];
}

// ── SSE Events ──────────────────────────────────────────────────────────────

export type SSEEventType = "progress" | "complete" | "error" | "lm_thinking";

export interface SSEEvent {
  type: SSEEventType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}
