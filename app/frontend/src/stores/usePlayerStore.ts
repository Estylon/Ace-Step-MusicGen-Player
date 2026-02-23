import { create } from 'zustand'
import type { TrackInfo } from '../types'

type RepeatMode = 'none' | 'all' | 'one'

interface PlayerState {
  currentTrack: TrackInfo | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  queue: TrackInfo[]
  queueIndex: number
  repeatMode: RepeatMode
  shuffle: boolean

  play: (track: TrackInfo) => void
  pause: () => void
  resume: () => void
  seek: (time: number) => void
  setVolume: (v: number) => void
  next: () => void
  prev: () => void
  addToQueue: (track: TrackInfo) => void
  toggleRepeat: () => void
  toggleShuffle: () => void
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  queue: [],
  queueIndex: -1,
  repeatMode: 'none',
  shuffle: false,

  play: (track) => {
    const { queue } = get()
    // Check if the track is already in the queue
    const existingIndex = queue.findIndex((t) => t.id === track.id)
    if (existingIndex >= 0) {
      set({
        currentTrack: track,
        isPlaying: true,
        currentTime: 0,
        duration: track.duration,
        queueIndex: existingIndex,
      })
    } else {
      // Add to end of queue and play
      const newQueue = [...queue, track]
      set({
        currentTrack: track,
        isPlaying: true,
        currentTime: 0,
        duration: track.duration,
        queue: newQueue,
        queueIndex: newQueue.length - 1,
      })
    }
  },

  pause: () => {
    set({ isPlaying: false })
  },

  resume: () => {
    set({ isPlaying: true })
  },

  seek: (time) => {
    set({ currentTime: time })
  },

  setVolume: (v) => {
    set({ volume: Math.max(0, Math.min(1, v)) })
  },

  next: () => {
    const { queue, queueIndex, repeatMode, shuffle } = get()
    if (queue.length === 0) return

    let nextIndex: number

    if (repeatMode === 'one') {
      // Replay current track
      nextIndex = queueIndex
      set({ currentTime: 0, isPlaying: true })
      return
    }

    if (shuffle) {
      // Pick a random different index
      if (queue.length === 1) {
        nextIndex = 0
      } else {
        do {
          nextIndex = Math.floor(Math.random() * queue.length)
        } while (nextIndex === queueIndex)
      }
    } else {
      nextIndex = queueIndex + 1
    }

    if (nextIndex >= queue.length) {
      if (repeatMode === 'all') {
        nextIndex = 0
      } else {
        // End of queue, stop playing
        set({ isPlaying: false })
        return
      }
    }

    const nextTrack = queue[nextIndex]
    set({
      currentTrack: nextTrack,
      isPlaying: true,
      currentTime: 0,
      duration: nextTrack.duration,
      queueIndex: nextIndex,
    })
  },

  prev: () => {
    const { queue, queueIndex, currentTime, repeatMode, shuffle } = get()
    if (queue.length === 0) return

    // If more than 3 seconds in, restart current track
    if (currentTime > 3) {
      set({ currentTime: 0 })
      return
    }

    let prevIndex: number

    if (shuffle) {
      if (queue.length === 1) {
        prevIndex = 0
      } else {
        do {
          prevIndex = Math.floor(Math.random() * queue.length)
        } while (prevIndex === queueIndex)
      }
    } else {
      prevIndex = queueIndex - 1
    }

    if (prevIndex < 0) {
      if (repeatMode === 'all') {
        prevIndex = queue.length - 1
      } else {
        // Beginning of queue, restart current track
        set({ currentTime: 0 })
        return
      }
    }

    const prevTrack = queue[prevIndex]
    set({
      currentTrack: prevTrack,
      isPlaying: true,
      currentTime: 0,
      duration: prevTrack.duration,
      queueIndex: prevIndex,
    })
  },

  addToQueue: (track) => {
    set((state) => ({
      queue: [...state.queue, track],
    }))
  },

  toggleRepeat: () => {
    set((state) => {
      const modes: RepeatMode[] = ['none', 'all', 'one']
      const currentIdx = modes.indexOf(state.repeatMode)
      const nextMode = modes[(currentIdx + 1) % modes.length]
      return { repeatMode: nextMode }
    })
  },

  toggleShuffle: () => {
    set((state) => ({ shuffle: !state.shuffle }))
  },
}))
