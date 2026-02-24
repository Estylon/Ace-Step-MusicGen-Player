/**
 * Preset import / export helpers.
 *
 * Handles mapping between the user-friendly JSON preset format and the
 * internal GenerateRequest form fields.  Supports common aliases
 * (e.g. "prompt" → "caption", "key_scale" → "keyscale").
 */

import type { GenerateRequest } from '../types/api'

// ── Alias map: external JSON key → internal form field ────────────────────────
// Keys that already match the GenerateRequest field name don't need an entry.
// Only *different* names need mapping here.
const ALIASES: Record<string, keyof GenerateRequest> = {
  prompt: 'caption',
  description: 'caption',
  key_scale: 'keyscale',
  key: 'keyscale',
  time_signature: 'timesignature',
  language: 'vocal_language',
  lang: 'vocal_language',
  steps: 'inference_steps',
  cfg_scale: 'guidance_scale',
  cfg: 'guidance_scale',
  method: 'infer_method',
  format: 'audio_format',
  batch: 'batch_size',
  negative_prompt: 'lm_negative_prompt',
  temperature: 'lm_temperature',
  top_k: 'lm_top_k',
  top_p: 'lm_top_p',
}

// Fields that exist in the preset JSON but are NOT part of GenerateRequest.
// We extract them separately so the UI can show them (e.g. "title") or
// trigger side-effects (e.g. model loading).
export interface PresetMeta {
  title?: string
  dit_model?: string
  lm_model?: string
  /** Any unrecognised keys that were ignored */
  ignored: string[]
}

// The set of all valid GenerateRequest keys (for fast lookup)
const FORM_KEYS = new Set<string>([
  'caption', 'lyrics', 'instrumental',
  'bpm', 'keyscale', 'timesignature', 'vocal_language', 'duration',
  'inference_steps', 'guidance_scale', 'seed', 'use_adg',
  'cfg_interval_start', 'cfg_interval_end', 'shift', 'infer_method', 'timesteps',
  'task_type', 'reference_audio', 'src_audio',
  'repainting_start', 'repainting_end', 'audio_cover_strength', 'track_name',
  'thinking', 'lm_temperature', 'lm_cfg_scale', 'lm_top_k', 'lm_top_p',
  'lm_negative_prompt', 'use_cot_metas', 'use_cot_caption', 'use_cot_language',
  'use_constrained_decoding',
  'batch_size', 'audio_format',
])

const META_KEYS = new Set(['title', 'dit_model', 'lm_model'])

// ── Import ────────────────────────────────────────────────────────────────────

export interface ImportResult {
  /** Partial form update to pass to updateForm() */
  formUpdate: Partial<GenerateRequest>
  /** Metadata extracted from the preset */
  meta: PresetMeta
  /** Number of form fields that will be updated */
  fieldCount: number
}

/**
 * Parse a JSON string (or object) and return a form update + metadata.
 * Throws on invalid JSON or if no recognised fields are found.
 */
export function parsePreset(input: string | Record<string, unknown>): ImportResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let raw: Record<string, any>

  if (typeof input === 'string') {
    const trimmed = input.trim()
    if (!trimmed) throw new Error('Empty input')
    try {
      raw = JSON.parse(trimmed)
    } catch {
      throw new Error('Invalid JSON — check for syntax errors')
    }
  } else {
    raw = input
  }

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('Expected a JSON object { ... }')
  }

  const formUpdate: Record<string, unknown> = {}
  const meta: PresetMeta = { ignored: [] }

  for (const [key, value] of Object.entries(raw)) {
    const lowerKey = key.toLowerCase()

    // Check meta keys first
    if (META_KEYS.has(lowerKey)) {
      if (lowerKey === 'title') meta.title = String(value)
      if (lowerKey === 'dit_model') meta.dit_model = String(value)
      if (lowerKey === 'lm_model') meta.lm_model = String(value)
      continue
    }

    // Resolve alias → form key
    const formKey = ALIASES[lowerKey] ?? (FORM_KEYS.has(lowerKey) ? lowerKey : null)

    if (formKey) {
      formUpdate[formKey] = value
    } else {
      meta.ignored.push(key)
    }
  }

  // Validate infer_method if present
  if (formUpdate.infer_method && !['ode', 'sde'].includes(formUpdate.infer_method as string)) {
    delete formUpdate.infer_method
  }

  const fieldCount = Object.keys(formUpdate).length
  if (fieldCount === 0) {
    throw new Error('No recognised generation fields found in the JSON')
  }

  return {
    formUpdate: formUpdate as Partial<GenerateRequest>,
    meta,
    fieldCount,
  }
}

// ── Export ─────────────────────────────────────────────────────────────────────

export interface ExportOptions {
  /** Optional title for the preset */
  title?: string
  /** Include model names */
  includeModel?: boolean
  /** Pretty-print with indentation */
  indent?: number
}

/**
 * Serialize the current form state into a user-friendly JSON string.
 * Uses the friendlier alias names (prompt, key_scale, time_signature …).
 */
export function exportPreset(
  form: GenerateRequest,
  options: ExportOptions = {},
): string {
  const { title, includeModel, indent = 2 } = options

  // Build the export object with user-friendly key names
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: Record<string, any> = {}

  if (title) out.title = title
  out.prompt = form.caption
  out.lyrics = form.lyrics
  if (form.instrumental) out.instrumental = true
  if (form.bpm != null) out.bpm = form.bpm
  if (form.keyscale) out.key_scale = form.keyscale
  if (form.timesignature) out.time_signature = form.timesignature
  if (form.vocal_language && form.vocal_language !== 'unknown') {
    out.vocal_language = form.vocal_language
  }
  if (form.duration !== -1) out.duration = form.duration
  out.task_type = form.task_type

  // Diffusion
  out.inference_steps = form.inference_steps
  if (form.guidance_scale !== 7.0) out.guidance_scale = form.guidance_scale
  if (form.seed !== -1) out.seed = form.seed
  out.shift = form.shift
  out.infer_method = form.infer_method
  if (form.use_adg) out.use_adg = true
  if (form.cfg_interval_start !== 0) out.cfg_interval_start = form.cfg_interval_start
  if (form.cfg_interval_end !== 1) out.cfg_interval_end = form.cfg_interval_end
  if (form.timesteps) out.timesteps = form.timesteps

  // LM
  out.thinking = form.thinking
  if (form.thinking) {
    if (form.lm_temperature !== 0.85) out.lm_temperature = form.lm_temperature
    if (form.lm_cfg_scale !== 2.0) out.lm_cfg_scale = form.lm_cfg_scale
    if (form.lm_top_k !== 0) out.lm_top_k = form.lm_top_k
    if (form.lm_top_p !== 0.9) out.lm_top_p = form.lm_top_p
    if (form.lm_negative_prompt !== 'NO USER INPUT') {
      out.lm_negative_prompt = form.lm_negative_prompt
    }
    out.use_cot_metas = form.use_cot_metas
    out.use_cot_caption = form.use_cot_caption
    out.use_cot_language = form.use_cot_language
    out.use_constrained_decoding = form.use_constrained_decoding
  }

  // Batch & format
  out.batch_size = form.batch_size
  out.audio_format = form.audio_format

  // Task-specific
  if (form.reference_audio) out.reference_audio = form.reference_audio
  if (form.src_audio) out.src_audio = form.src_audio
  if (form.track_name) out.track_name = form.track_name
  if (form.repainting_start !== 0) out.repainting_start = form.repainting_start
  if (form.repainting_end !== -1) out.repainting_end = form.repainting_end
  if (form.audio_cover_strength !== 1) out.audio_cover_strength = form.audio_cover_strength

  // Model info (optional)
  if (includeModel) {
    out.dit_model = '(current model)'
    out.lm_model = '(current LM)'
  }

  return JSON.stringify(out, null, indent)
}
