/**
 * Shared helper utilities for the ACE-Step frontend.
 */

import { clsx, type ClassValue } from "clsx";

// ── className merger ────────────────────────────────────────────────────────

/**
 * Merge CSS class names, filtering out falsy values.
 * Thin wrapper around clsx for Tailwind-friendly conditional classes.
 */
export function cn(...classes: ClassValue[]): string {
  return clsx(...classes);
}

// ── Time / Duration formatting ──────────────────────────────────────────────

/**
 * Format a duration in seconds to "M:SS" (e.g. 83 -> "1:23").
 */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const totalSec = Math.round(seconds);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Format an ISO date string into a human-readable relative time
 * (e.g. "2 hours ago", "3 days ago", "just now").
 */
export function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 10) return "just now";
  if (diffSec < 60) return `${diffSec} seconds ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;

  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth} month${diffMonth === 1 ? "" : "s"} ago`;

  const diffYear = Math.floor(diffMonth / 12);
  return `${diffYear} year${diffYear === 1 ? "" : "s"} ago`;
}

// ── Byte formatting ─────────────────────────────────────────────────────────

/**
 * Format a byte count into a human-readable string (e.g. 1536 -> "1.5 KB").
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);
  const value = bytes / Math.pow(k, i);

  return `${parseFloat(value.toFixed(i === 0 ? 0 : 1))} ${units[i]}`;
}

// ── Music helpers ───────────────────────────────────────────────────────────

/**
 * Clamp a BPM value to the valid ACE-Step range [30, 300].
 */
export function clampBPM(v: number): number {
  return Math.max(30, Math.min(300, Math.round(v)));
}
