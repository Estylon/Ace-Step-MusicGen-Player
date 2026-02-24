import { create } from 'zustand'
import type { TrackInfo } from '../types'
import {
  listTracks as apiListTracks,
  deleteTrack as apiDeleteTrack,
  updateTrack as apiUpdateTrack,
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
  filterFavorites: boolean

  // Multi-select for batch operations
  multiSelectMode: boolean
  selectedIds: Set<string>

  fetchTracks: () => Promise<void>
  setSearch: (q: string) => void
  setSort: (s: string) => void
  setPage: (p: number) => void
  selectTrack: (id: string | null) => void
  deleteTrack: (id: string) => Promise<void>
  setFilterFavorites: (v: boolean) => void
  toggleFavorite: (trackId: string) => Promise<void>
  setRating: (trackId: string, rating: number) => Promise<void>

  // Multi-select actions
  setMultiSelectMode: (on: boolean) => void
  toggleSelected: (id: string) => void
  selectAll: () => void
  clearSelection: () => void
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
  filterFavorites: false,
  multiSelectMode: false,
  selectedIds: new Set(),

  fetchTracks: async () => {
    const { page, search, sort, filterFavorites } = get()
    set({ loading: true })
    try {
      const result = await apiListTracks(
        page,
        search,
        sort,
        'desc',
        filterFavorites ? true : undefined,
      )
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

  setFilterFavorites: (v) => {
    set({ filterFavorites: v, page: 1 })
    get().fetchTracks()
  },

  toggleFavorite: async (trackId) => {
    const { tracks } = get()
    const track = tracks.find((t) => t.id === trackId)
    if (!track) return

    const newFavorite = !track.favorite

    // Optimistic update
    set({
      tracks: tracks.map((t) =>
        t.id === trackId ? { ...t, favorite: newFavorite } : t,
      ),
    })

    try {
      await apiUpdateTrack(trackId, { favorite: newFavorite })
      await get().fetchTracks()
    } catch (err) {
      console.error('Failed to toggle favorite:', err)
      // Revert on failure
      set({
        tracks: get().tracks.map((t) =>
          t.id === trackId ? { ...t, favorite: !newFavorite } : t,
        ),
      })
    }
  },

  setRating: async (trackId, rating) => {
    const { tracks } = get()
    const track = tracks.find((t) => t.id === trackId)
    if (!track) return

    const oldRating = track.rating

    // Optimistic update
    set({
      tracks: tracks.map((t) =>
        t.id === trackId ? { ...t, rating } : t,
      ),
    })

    try {
      await apiUpdateTrack(trackId, { rating })
    } catch (err) {
      console.error('Failed to set rating:', err)
      // Revert on failure
      set({
        tracks: get().tracks.map((t) =>
          t.id === trackId ? { ...t, rating: oldRating } : t,
        ),
      })
    }
  },

  // ── Multi-select ─────────────────────────────────────────────────────────

  setMultiSelectMode: (on) => {
    set({ multiSelectMode: on, selectedIds: new Set() })
  },

  toggleSelected: (id) => {
    set((state) => {
      const next = new Set(state.selectedIds)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return { selectedIds: next }
    })
  },

  selectAll: () => {
    const { tracks } = get()
    set({ selectedIds: new Set(tracks.map((t) => t.id)) })
  },

  clearSelection: () => {
    set({ selectedIds: new Set() })
  },
}))
