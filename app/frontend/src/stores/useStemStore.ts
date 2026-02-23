import { create } from 'zustand'
import type { StemInfo } from '../types'
import { separateStems, subscribeToStemProgress } from '../api/stems'

type StemMode = 'vocals' | 'multi' | 'two-pass'

interface StemState {
  sourceTrack: string | null
  mode: StemMode
  activeJob: string | null
  results: StemInfo[]
  stemVolumes: Record<string, number>
  stemMuted: Record<string, boolean>
  stemSolo: string | null

  setSource: (src: string | null) => void
  setMode: (m: StemMode) => void
  separate: () => Promise<void>
  toggleMute: (stemType: string) => void
  toggleSolo: (stemType: string) => void
  setStemVolume: (stemType: string, vol: number) => void
}

export const useStemStore = create<StemState>((set, get) => ({
  sourceTrack: null,
  mode: 'two-pass',
  activeJob: null,
  results: [],
  stemVolumes: {},
  stemMuted: {},
  stemSolo: null,

  setSource: (src) => {
    set({ sourceTrack: src, results: [], stemVolumes: {}, stemMuted: {}, stemSolo: null })
  },

  setMode: (m) => {
    set({ mode: m })
  },

  separate: async () => {
    const { sourceTrack, mode } = get()
    if (!sourceTrack) {
      throw new Error('No source track selected')
    }

    try {
      const { job_id } = await separateStems(sourceTrack, mode)
      set({ activeJob: job_id, results: [] })

      subscribeToStemProgress(job_id, (event) => {
        switch (event.type) {
          case 'progress':
            // Progress updates can be handled by UI if needed
            break
          case 'complete': {
            const stems: StemInfo[] = event.stems ?? []
            // Initialize volumes for each stem type
            const volumes: Record<string, number> = {}
            const muted: Record<string, boolean> = {}
            for (const stem of stems) {
              volumes[stem.stem_type] = 1.0
              muted[stem.stem_type] = false
            }
            set({
              results: stems,
              activeJob: null,
              stemVolumes: volumes,
              stemMuted: muted,
              stemSolo: null,
            })
            break
          }
          case 'error':
            console.error('Stem separation failed:', event.message)
            set({ activeJob: null })
            break
        }
      })
    } catch (err) {
      console.error('Failed to start stem separation:', err)
      set({ activeJob: null })
      throw err
    }
  },

  toggleMute: (stemType) => {
    set((state) => ({
      stemMuted: {
        ...state.stemMuted,
        [stemType]: !state.stemMuted[stemType],
      },
    }))
  },

  toggleSolo: (stemType) => {
    set((state) => ({
      stemSolo: state.stemSolo === stemType ? null : stemType,
    }))
  },

  setStemVolume: (stemType, vol) => {
    set((state) => ({
      stemVolumes: {
        ...state.stemVolumes,
        [stemType]: Math.max(0, Math.min(1, vol)),
      },
    }))
  },
}))
