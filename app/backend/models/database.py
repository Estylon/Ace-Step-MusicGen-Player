"""SQLite database for generation history (tracks + stems)."""

from __future__ import annotations

import aiosqlite
from pathlib import Path

from config import DATA_DIR

DB_PATH = DATA_DIR / "library.db"

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS tracks (
    id              TEXT PRIMARY KEY,
    title           TEXT NOT NULL DEFAULT '',
    caption         TEXT NOT NULL DEFAULT '',
    lyrics          TEXT NOT NULL DEFAULT '',
    bpm             INTEGER,
    keyscale        TEXT NOT NULL DEFAULT '',
    timesignature   TEXT NOT NULL DEFAULT '',
    vocal_language  TEXT NOT NULL DEFAULT '',
    duration        REAL NOT NULL DEFAULT 0.0,
    audio_path      TEXT NOT NULL DEFAULT '',
    audio_format    TEXT NOT NULL DEFAULT 'flac',
    seed            INTEGER NOT NULL DEFAULT -1,
    model_name      TEXT NOT NULL DEFAULT '',
    adapter_name    TEXT,
    adapter_scale   REAL,
    task_type       TEXT NOT NULL DEFAULT 'text2music',
    params_json     TEXT NOT NULL DEFAULT '{}',
    tags            TEXT NOT NULL DEFAULT '',
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stems (
    id          TEXT PRIMARY KEY,
    track_id    TEXT NOT NULL,
    stem_type   TEXT NOT NULL,
    audio_path  TEXT NOT NULL DEFAULT '',
    duration    REAL NOT NULL DEFAULT 0.0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tracks_created ON tracks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stems_track ON stems(track_id);
"""


async def get_db() -> aiosqlite.Connection:
    """Get a database connection (caller must close or use as context manager)."""
    db = await aiosqlite.connect(str(DB_PATH))
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    return db


async def init_db():
    """Initialize database schema."""
    async with aiosqlite.connect(str(DB_PATH)) as db:
        await db.executescript(SCHEMA_SQL)
        await db.commit()
