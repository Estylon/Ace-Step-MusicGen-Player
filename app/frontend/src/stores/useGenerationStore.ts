import { create } from 'zustand'
import type { GenerateRequest } from '../types/api'
import type { GenerationJob, TrackInfo } from '../types'
import { createGeneration, subscribeToProgress } from '../api/generate'

interface GenerationState {
  form: GenerateRequest
  activeJobs: Map<string, GenerationJob>
  results: TrackInfo[]

  updateForm: (partial: Partial<GenerateRequest>) => void
  generate: () => Promise<void>
  clearResults: () => void
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

  updateForm: (partial) => {
    set((state) => ({
      form: { ...state.form, ...partial },
    }))
  },

  generate: async () => {
    const { form } = get()
    try {
      const { job_id } = await createGeneration(form)

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
        set((state) => {
          const jobs = new Map(state.activeJobs)
          const current = jobs.get(job_id)
          if (!current) return state

          switch (event.type) {
            case 'progress': {
              jobs.set(job_id, {
                ...current,
                status: 'running',
                progress: event.percent ?? current.progress,
                message: event.message ?? current.message,
              })
              return { activeJobs: jobs }
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
              return {
                activeJobs: jobs,
                results: [...state.results, ...tracks],
              }
            }
            case 'error': {
              jobs.set(job_id, {
                ...current,
                status: 'error',
                message: event.message ?? 'Generation failed',
              })
              return { activeJobs: jobs }
            }
            default:
              return state
          }
        })
      })
    } catch (err) {
      console.error('Failed to start generation:', err)
      throw err
    }
  },

  clearResults: () => {
    set({ results: [] })
  },
}))
