import { create } from 'zustand'
import type { GenerateRequest } from '../types/api'
import type { GenerationJob, TrackInfo } from '../types'
import { createGeneration, subscribeToProgress } from '../api/generate'
import { parsePreset, exportPreset, type ImportResult, type ExportOptions } from '../lib/presetIO'
import { useSettingsStore } from './useSettingsStore'

interface GenerationState {
  form: GenerateRequest
  activeJobs: Map<string, GenerationJob>
  results: TrackInfo[]
  autoGen: boolean
  autoGenMaxRuns: number
  autoGenRunCount: number

  updateForm: (partial: Partial<GenerateRequest>) => void
  importPreset: (jsonInput: string | Record<string, unknown>) => ImportResult
  exportPreset: (options?: ExportOptions) => string
  resetForm: () => void
  generate: () => Promise<void>
  clearResults: () => void
  updateTrackTitle: (trackId: string, newTitle: string) => void
  recallParams: (paramsJson: string) => ImportResult | null
  setAutoGen: (on: boolean) => void
  setAutoGenMaxRuns: (n: number) => void
  resetAutoGenCount: () => void
}

const defaultForm: GenerateRequest = {
  caption: '',
  lyrics: '',
  instrumental: false,
  bpm: null,
  keyscale: '',
  timesignature: '',
  vocal_language: 'unknown',
  duration: -1,
  inference_steps: 8,
  guidance_scale: 7.0,
  seed: -1,
  use_adg: false,
  cfg_interval_start: 0.0,
  cfg_interval_end: 1.0,
  shift: 1.0,
  infer_method: 'ode',
  timesteps: null,
  task_type: 'text2music',
  reference_audio: null,
  src_audio: null,
  repainting_start: 0.0,
  repainting_end: -1.0,
  audio_cover_strength: 1.0,
  track_name: null,
  thinking: true,
  lm_temperature: 0.85,
  lm_cfg_scale: 2.0,
  lm_top_k: 0,
  lm_top_p: 0.9,
  lm_negative_prompt: 'NO USER INPUT',
  use_cot_metas: true,
  use_cot_caption: true,
  use_cot_language: true,
  use_constrained_decoding: true,
  batch_size: 1,
  audio_format: 'flac',
}

export const useGenerationStore = create<GenerationState>((set, get) => ({
  form: { ...defaultForm },
  activeJobs: new Map(),
  results: [],
  autoGen: false,
  autoGenMaxRuns: 0,
  autoGenRunCount: 0,

  updateForm: (partial) => {
    set((state) => ({
      form: { ...state.form, ...partial },
    }))
  },

  importPreset: (jsonInput) => {
    const result = parsePreset(jsonInput)
    set(() => ({
      form: { ...defaultForm, ...result.formUpdate },
    }))
    return result
  },

  exportPreset: (options) => {
    const { form } = get()
    return exportPreset(form, options)
  },

  resetForm: () => {
    set({ form: { ...defaultForm } })
  },

  generate: async () => {
    const { form } = get()

    // Prepend the active adapter's style tag (trigger word) to the caption
    const styleTag = useSettingsStore.getState().getActiveStyleTag()
    const effectiveCaption =
      styleTag && form.caption ? `${styleTag} ${form.caption}` : form.caption
    const payload = { ...form, caption: effectiveCaption }

    try {
      const { job_id } = await createGeneration(payload)

      // Add the job to active jobs
      const job: GenerationJob = {
        id: job_id,
        status: 'queued',
        progress: 0,
        message: 'Queued...',
        tracks: [],
      }

      set((state) => {
        const jobs = new Map(state.activeJobs)
        jobs.set(job_id, job)
        return { activeJobs: jobs }
      })

      // Subscribe to SSE progress
      subscribeToProgress(job_id, (event) => {
        const state = get()
        const jobs = new Map(state.activeJobs)
        const current = jobs.get(job_id)
        if (!current) return

        switch (event.type) {
          case 'progress': {
            jobs.set(job_id, {
              ...current,
              status: 'running',
              progress: event.percent ?? current.progress,
              message: event.message ?? current.message,
            })
            set({ activeJobs: jobs })
            break
          }
          case 'complete': {
            const tracks: TrackInfo[] = event.tracks ?? []
            jobs.set(job_id, {
              ...current,
              status: 'complete',
              progress: 100,
              message: 'Complete',
              tracks,
            })
            set({
              activeJobs: jobs,
              results: [...state.results, ...tracks],
            })

            // AutoGen: auto-retrigger if enabled
            const { autoGen, autoGenMaxRuns, autoGenRunCount } = get()
            if (autoGen && (autoGenMaxRuns === 0 || autoGenRunCount < autoGenMaxRuns)) {
              set({ autoGenRunCount: autoGenRunCount + 1 })
              // Randomize seed and retrigger after short delay
              setTimeout(() => {
                const latest = get()
                if (latest.autoGen) {
                  set((s) => ({ form: { ...s.form, seed: -1 } }))
                  latest.generate()
                }
              }, 1500)
            }
            break
          }
          case 'error': {
            jobs.set(job_id, {
              ...current,
              status: 'error',
              message: event.message ?? 'Generation failed',
            })
            set({ activeJobs: jobs })
            break
          }
        }
      })
    } catch (err) {
      console.error('Failed to start generation:', err)
      throw err
    }
  },

  clearResults: () => {
    set({ results: [] })
  },

  updateTrackTitle: (trackId, newTitle) => {
    set((state) => ({
      results: state.results.map((t) =>
        t.id === trackId ? { ...t, title: newTitle } : t,
      ),
    }))
  },

  recallParams: (paramsJson) => {
    try {
      const parsed = JSON.parse(paramsJson)
      if (typeof parsed !== 'object' || parsed === null) return null
      const result = parsePreset(parsed)
      set(() => ({
        form: { ...defaultForm, ...result.formUpdate },
      }))
      return result
    } catch {
      console.error('Failed to recall params from track')
      return null
    }
  },

  setAutoGen: (on) => {
    set({ autoGen: on })
  },

  setAutoGenMaxRuns: (n) => {
    set({ autoGenMaxRuns: n })
  },

  resetAutoGenCount: () => {
    set({ autoGenRunCount: 0 })
  },
}))
