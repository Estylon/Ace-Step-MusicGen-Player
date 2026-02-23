import { create } from 'zustand'
import type { TrackInfo } from '../types'
import {
  listTracks as apiListTracks,
  deleteTrack as apiDeleteTrack,
} from '../api/library'

interface LibraryState {
  tracks: TrackInfo[]
  total: number
  page: number
  pageSize: number
  search: string
  sort: string
  loading: boolean
  selectedTrack: TrackInfo | null

  fetchTracks: () => Promise<void>
  setSearch: (q: string) => void
  setSort: (s: string) => void
  setPage: (p: number) => void
  selectTrack: (id: string | null) => void
  deleteTrack: (id: string) => Promise<void>
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  tracks: [],
  total: 0,
  page: 1,
  pageSize: 20,
  search: '',
  sort: 'created_at',
  loading: false,
  selectedTrack: null,

  fetchTracks: async () => {
    const { page, search, sort } = get()
    set({ loading: true })
    try {
      const result = await apiListTracks(page, search, sort, 'desc')
      set({
        tracks: result.tracks,
        total: result.total,
        page: result.page,
        pageSize: result.page_size,
      })
    } catch (err) {
      console.error('Failed to fetch tracks:', err)
    } finally {
      set({ loading: false })
    }
  },

  setSearch: (q) => {
    set({ search: q, page: 1 })
    get().fetchTracks()
  },

  setSort: (s) => {
    set({ sort: s, page: 1 })
    get().fetchTracks()
  },

  setPage: (p) => {
    set({ page: p })
    get().fetchTracks()
  },

  selectTrack: (id) => {
    if (id === null) {
      set({ selectedTrack: null })
      return
    }
    const { tracks } = get()
    const track = tracks.find((t) => t.id === id) ?? null
    set({ selectedTrack: track })
  },

  deleteTrack: async (id) => {
    try {
      await apiDeleteTrack(id)
      // Refresh the list after deletion
      await get().fetchTracks()
      // Clear selection if the deleted track was selected
      const { selectedTrack } = get()
      if (selectedTrack?.id === id) {
        set({ selectedTrack: null })
      }
    } catch (err) {
      console.error('Failed to delete track:', err)
      throw err
    }
  },
}))
