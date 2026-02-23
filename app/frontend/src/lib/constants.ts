/**
 * ACE-Step constants -- languages, key signatures, task types, etc.
 */

// ── Languages ───────────────────────────────────────────────────────────────

export interface LanguageOption {
  code: string;
  name: string;
}

export const VALID_LANGUAGES: LanguageOption[] = [
  { code: "ar", name: "Arabic" },
  { code: "az", name: "Azerbaijani" },
  { code: "bg", name: "Bulgarian" },
  { code: "bn", name: "Bengali" },
  { code: "ca", name: "Catalan" },
  { code: "cs", name: "Czech" },
  { code: "da", name: "Danish" },
  { code: "de", name: "German" },
  { code: "el", name: "Greek" },
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fa", name: "Persian" },
  { code: "fi", name: "Finnish" },
  { code: "fr", name: "French" },
  { code: "he", name: "Hebrew" },
  { code: "hi", name: "Hindi" },
  { code: "hr", name: "Croatian" },
  { code: "ht", name: "Haitian" },
  { code: "hu", name: "Hungarian" },
  { code: "id", name: "Indonesian" },
  { code: "is", name: "Icelandic" },
  { code: "it", name: "Italian" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "la", name: "Latin" },
  { code: "lt", name: "Lithuanian" },
  { code: "ms", name: "Malay" },
  { code: "ne", name: "Nepali" },
  { code: "nl", name: "Dutch" },
  { code: "no", name: "Norwegian" },
  { code: "pa", name: "Punjabi" },
  { code: "pl", name: "Polish" },
  { code: "pt", name: "Portuguese" },
  { code: "ro", name: "Romanian" },
  { code: "ru", name: "Russian" },
  { code: "sa", name: "Sanskrit" },
  { code: "sk", name: "Slovak" },
  { code: "sr", name: "Serbian" },
  { code: "sv", name: "Swedish" },
  { code: "sw", name: "Swahili" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" },
  { code: "th", name: "Thai" },
  { code: "tl", name: "Tagalog" },
  { code: "tr", name: "Turkish" },
  { code: "uk", name: "Ukrainian" },
  { code: "ur", name: "Urdu" },
  { code: "vi", name: "Vietnamese" },
  { code: "yue", name: "Cantonese" },
  { code: "zh", name: "Chinese" },
  { code: "unknown", name: "Unknown" },
];

// ── Key Signatures ──────────────────────────────────────────────────────────

export const VALID_KEYSCALES: string[] = [
  // C
  "C major",
  "C minor",
  // C# / Db
  "C# major",
  "C# minor",
  "Db major",
  "Db minor",
  // D
  "D major",
  "D minor",
  // D# / Eb
  "D# major",
  "D# minor",
  "Eb major",
  "Eb minor",
  // E
  "E major",
  "E minor",
  // F
  "F major",
  "F minor",
  // F# / Gb
  "F# major",
  "F# minor",
  "Gb major",
  "Gb minor",
  // G
  "G major",
  "G minor",
  // G# / Ab
  "G# major",
  "G# minor",
  "Ab major",
  "Ab minor",
  // A
  "A major",
  "A minor",
  // A# / Bb
  "A# major",
  "A# minor",
  "Bb major",
  "Bb minor",
  // B / Cb
  "B major",
  "B minor",
  "Cb major",
  "Cb minor",
];

// ── Time Signatures ─────────────────────────────────────────────────────────

export interface TimeSignatureOption {
  value: string;
  label: string;
}

export const VALID_TIME_SIGNATURES: TimeSignatureOption[] = [
  { value: "2", label: "2/4" },
  { value: "3", label: "3/4" },
  { value: "4", label: "4/4" },
  { value: "6", label: "6/8" },
];

// ── Task Types ──────────────────────────────────────────────────────────────

export interface TaskTypeOption {
  id: string;
  label: string;
  icon: string;
  description: string;
  requiresReference: boolean;
  turboSupported: boolean;
}

export const TASK_TYPES: TaskTypeOption[] = [
  {
    id: "text2music",
    label: "Text to Music",
    icon: "music",
    description: "Generate music from a text description and optional lyrics.",
    requiresReference: false,
    turboSupported: true,
  },
  {
    id: "cover",
    label: "Cover",
    icon: "disc-3",
    description: "Create a cover version of a reference audio track.",
    requiresReference: true,
    turboSupported: true,
  },
  {
    id: "repaint",
    label: "Repaint",
    icon: "paintbrush",
    description: "Repaint a section of audio with new content while keeping the rest.",
    requiresReference: true,
    turboSupported: true,
  },
  {
    id: "extract",
    label: "Extract",
    icon: "split",
    description: "Extract a specific instrument track from reference audio.",
    requiresReference: true,
    turboSupported: false,
  },
  {
    id: "lego",
    label: "Lego",
    icon: "puzzle",
    description: "Replace a specific instrument track with newly generated content.",
    requiresReference: true,
    turboSupported: false,
  },
  {
    id: "complete",
    label: "Complete",
    icon: "step-forward",
    description: "Continue and extend an existing audio clip beyond its current length.",
    requiresReference: true,
    turboSupported: false,
  },
];

// ── Track Names (instrument stems) ──────────────────────────────────────────

export const TRACK_NAMES: string[] = [
  "woodwinds",
  "brass",
  "fx",
  "synth",
  "strings",
  "percussion",
  "keyboard",
  "guitar",
  "bass",
  "drums",
  "backing_vocals",
  "vocals",
];

// ── Audio Formats ───────────────────────────────────────────────────────────

export const AUDIO_FORMATS: string[] = ["flac", "wav", "mp3", "opus", "aac"];

// ── Default Generation Parameters ───────────────────────────────────────────

import type { GenerateRequest } from "../types/api";

export const DEFAULT_GENERATE_PARAMS: GenerateRequest = {
  // Text inputs
  caption: "",
  lyrics: "",
  instrumental: false,

  // Music metadata
  bpm: null,
  keyscale: "",
  timesignature: "",
  vocal_language: "unknown",
  duration: -1,

  // Diffusion parameters (tuned for turbo model)
  inference_steps: 8,
  guidance_scale: 7.0,
  seed: -1,
  use_adg: false,
  cfg_interval_start: 0.0,
  cfg_interval_end: 1.0,
  shift: 3.0,
  infer_method: "ode",
  timesteps: null,

  // Task
  task_type: "text2music",
  reference_audio: null,
  src_audio: null,
  repainting_start: 0.0,
  repainting_end: -1.0,
  audio_cover_strength: 1.0,
  track_name: null,

  // LM parameters
  thinking: true,
  lm_temperature: 0.85,
  lm_cfg_scale: 2.0,
  lm_top_k: 0,
  lm_top_p: 0.9,
  lm_negative_prompt: "NO USER INPUT",
  use_cot_metas: true,
  use_cot_caption: true,
  use_cot_language: true,
  use_constrained_decoding: true,

  // Batch
  batch_size: 1,
  audio_format: "flac",
};
