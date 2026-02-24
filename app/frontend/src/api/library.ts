import { api } from './client'
import type { LibraryListResponse, TrackDetailResponse } from '../types/api'

/**
 * List tracks with pagination, search, sorting, and optional favorite filter.
 */
export async function listTracks(
  page?: number,
  search?: string,
  sort?: string,
  order?: string,
  favorite?: boolean,
): Promise<LibraryListResponse> {
  const params = new URLSearchParams()
  if (page !== undefined) params.set('page', String(page))
  if (search) params.set('search', search)
  if (sort) params.set('sort', sort)
  if (order) params.set('order', order)
  if (favorite !== undefined) params.set('favorite', String(favorite))

  const query = params.toString()
  return api.get<LibraryListResponse>(`/library${query ? `?${query}` : ''}`)
}

/**
 * Get track details including stems.
 */
export async function getTrack(id: string): Promise<TrackDetailResponse> {
  return api.get<TrackDetailResponse>(`/library/${id}`)
}

/**
 * Update track metadata (title, tags, favorite, rating).
 */
export async function updateTrack(
  id: string,
  data: {
    title?: string
    tags?: string
    favorite?: boolean
    rating?: number
  },
): Promise<void> {
  await api.patch(`/library/${id}`, data)
}

/**
 * Delete a track and its files.
 */
export async function deleteTrack(id: string): Promise<void> {
  await api.delete(`/library/${id}`)
}
