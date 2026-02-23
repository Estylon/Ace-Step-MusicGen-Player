"""Library service — CRUD for generated tracks stored in SQLite."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

from models.database import get_db
from models.schemas import LibraryListResponse, StemInfo, TrackDetailResponse, TrackInfo


async def insert_track(track: TrackInfo) -> str:
    """Insert a new track into the database."""
    db = await get_db()
    try:
        await db.execute(
            """INSERT INTO tracks
               (id, title, caption, lyrics, bpm, keyscale, timesignature,
                vocal_language, duration, audio_path, audio_format, seed,
                model_name, adapter_name, adapter_scale, task_type, params_json)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                track.id, track.title, track.caption, track.lyrics,
                track.bpm, track.keyscale, track.timesignature,
                track.vocal_language, track.duration, track.audio_path,
                track.audio_format, track.seed, track.model_name,
                track.adapter_name, track.adapter_scale, track.task_type,
                track.params_json,
            ),
        )
        await db.commit()
        return track.id
    finally:
        await db.close()


async def insert_stems(track_id: str, stems: list[StemInfo]) -> None:
    """Insert stems linked to a track."""
    db = await get_db()
    try:
        for stem in stems:
            await db.execute(
                """INSERT INTO stems (id, track_id, stem_type, audio_path, duration)
                   VALUES (?,?,?,?,?)""",
                (stem.id, track_id, stem.stem_type, stem.audio_path, stem.duration),
            )
        await db.commit()
    finally:
        await db.close()


async def list_tracks(
    page: int = 1,
    page_size: int = 20,
    search: str = "",
    sort: str = "created_at",
    order: str = "desc",
) -> LibraryListResponse:
    """List tracks with pagination, search, and sort."""
    db = await get_db()
    try:
        # Count total
        where = ""
        params: list = []
        if search:
            where = "WHERE title LIKE ? OR caption LIKE ? OR tags LIKE ?"
            q = f"%{search}%"
            params = [q, q, q]

        row = await db.execute_fetchall(
            f"SELECT COUNT(*) as cnt FROM tracks {where}", params
        )
        total = row[0][0] if row else 0

        # Validate sort column
        valid_sorts = {"created_at", "title", "duration", "bpm"}
        if sort not in valid_sorts:
            sort = "created_at"
        order_dir = "DESC" if order.lower() == "desc" else "ASC"

        offset = (page - 1) * page_size
        rows = await db.execute_fetchall(
            f"""SELECT * FROM tracks {where}
                ORDER BY {sort} {order_dir}
                LIMIT ? OFFSET ?""",
            params + [page_size, offset],
        )

        tracks = [_row_to_track(r) for r in rows]
        return LibraryListResponse(
            tracks=tracks, total=total, page=page, page_size=page_size
        )
    finally:
        await db.close()


async def get_track(track_id: str) -> Optional[TrackDetailResponse]:
    """Get a single track with its stems."""
    db = await get_db()
    try:
        rows = await db.execute_fetchall(
            "SELECT * FROM tracks WHERE id = ?", (track_id,)
        )
        if not rows:
            return None
        track = _row_to_track(rows[0])

        stem_rows = await db.execute_fetchall(
            "SELECT * FROM stems WHERE track_id = ?", (track_id,)
        )
        stems = [_row_to_stem(r) for r in stem_rows]

        return TrackDetailResponse(track=track, stems=stems)
    finally:
        await db.close()


async def update_track(track_id: str, title: Optional[str] = None, tags: Optional[str] = None) -> bool:
    """Update track metadata."""
    db = await get_db()
    try:
        updates = []
        params = []
        if title is not None:
            updates.append("title = ?")
            params.append(title)
        if tags is not None:
            updates.append("tags = ?")
            params.append(tags)
        if not updates:
            return False
        params.append(track_id)
        await db.execute(
            f"UPDATE tracks SET {', '.join(updates)} WHERE id = ?", params
        )
        await db.commit()
        return True
    finally:
        await db.close()


async def delete_track(track_id: str) -> bool:
    """Delete a track and its associated files."""
    db = await get_db()
    try:
        # Get file paths
        rows = await db.execute_fetchall(
            "SELECT audio_path FROM tracks WHERE id = ?", (track_id,)
        )
        if not rows:
            return False

        audio_path = rows[0][0] if rows[0][0] else None

        # Get stem paths
        stem_rows = await db.execute_fetchall(
            "SELECT audio_path FROM stems WHERE track_id = ?", (track_id,)
        )

        # Delete from DB (CASCADE handles stems)
        await db.execute("DELETE FROM tracks WHERE id = ?", (track_id,))
        await db.commit()

        # Clean up files
        if audio_path and os.path.exists(audio_path):
            os.remove(audio_path)
            # Remove peaks sidecar
            peaks = Path(audio_path).with_suffix(".peaks.json")
            if peaks.exists():
                os.remove(str(peaks))

        for sr in stem_rows:
            if sr[0] and os.path.exists(sr[0]):
                os.remove(sr[0])

        return True
    finally:
        await db.close()


def _row_to_track(row) -> TrackInfo:
    """Convert a database row to TrackInfo."""
    audio_path = row["audio_path"] or ""
    filename = Path(audio_path).name if audio_path else ""
    return TrackInfo(
        id=row["id"],
        title=row["title"],
        caption=row["caption"],
        lyrics=row["lyrics"],
        bpm=row["bpm"],
        keyscale=row["keyscale"],
        timesignature=row["timesignature"],
        vocal_language=row["vocal_language"],
        duration=row["duration"],
        audio_path=audio_path,
        audio_url=f"/api/audio/output/{filename}" if filename else "",
        audio_format=row["audio_format"],
        seed=row["seed"],
        model_name=row["model_name"],
        adapter_name=row["adapter_name"],
        adapter_scale=row["adapter_scale"],
        task_type=row["task_type"],
        params_json=row["params_json"],
        created_at=row["created_at"],
    )


def _row_to_stem(row) -> StemInfo:
    """Convert a database row to StemInfo."""
    audio_path = row["audio_path"] or ""
    filename = Path(audio_path).name if audio_path else ""
    return StemInfo(
        id=row["id"],
        track_id=row["track_id"],
        stem_type=row["stem_type"],
        audio_path=audio_path,
        audio_url=f"/api/audio/stems/{filename}" if filename else "",
        duration=row["duration"],
    )
