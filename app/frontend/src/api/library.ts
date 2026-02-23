import { api } from './client'
import type { LibraryListResponse, TrackDetailResponse } from '../types/api'

/**
 * List tracks with pagination, search, and sorting.
 */
export async function listTracks(
  page?: number,
  search?: string,
  sort?: string,
  order?: string,
): Promise<LibraryListResponse> {
  const params = new URLSearchParams()
  if (page !== undefined) params.set('page', String(page))
  if (search) params.set('search', search)
  if (sort) params.set('sort', sort)
  if (order) params.set('order', order)

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
 * Update track metadata (title, tags).
 */
export async function updateTrack(
  id: string,
  title?: string,
  tags?: string,
): Promise<void> {
  await api.patch(`/library/${id}`, { title, tags })
}

/**
 * Delete a track and its files.
 */
export async function deleteTrack(id: string): Promise<void> {
  await api.delete(`/library/${id}`)
}
