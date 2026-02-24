"""Preset service — CRUD for saved generation presets."""

from __future__ import annotations

import uuid
from typing import Optional

from models.database import get_db


async def list_presets() -> list[dict]:
    """Return all presets ordered by name."""
    db = await get_db()
    try:
        rows = await db.execute_fetchall(
            "SELECT * FROM presets ORDER BY name ASC"
        )
        return [_row_to_dict(r) for r in rows]
    finally:
        await db.close()


async def get_preset(preset_id: str) -> Optional[dict]:
    """Get a single preset by ID."""
    db = await get_db()
    try:
        rows = await db.execute_fetchall(
            "SELECT * FROM presets WHERE id = ?", (preset_id,)
        )
        if not rows:
            return None
        return _row_to_dict(rows[0])
    finally:
        await db.close()


async def create_preset(name: str, params_json: str) -> dict:
    """Create a new preset and return it."""
    preset_id = str(uuid.uuid4())[:8]
    db = await get_db()
    try:
        await db.execute(
            """INSERT INTO presets (id, name, params_json)
               VALUES (?, ?, ?)""",
            (preset_id, name, params_json),
        )
        await db.commit()
        rows = await db.execute_fetchall(
            "SELECT * FROM presets WHERE id = ?", (preset_id,)
        )
        return _row_to_dict(rows[0])
    finally:
        await db.close()


async def update_preset(
    preset_id: str,
    name: Optional[str] = None,
    params_json: Optional[str] = None,
) -> bool:
    """Update an existing preset."""
    db = await get_db()
    try:
        updates = []
        params = []
        if name is not None:
            updates.append("name = ?")
            params.append(name)
        if params_json is not None:
            updates.append("params_json = ?")
            params.append(params_json)
        if not updates:
            return False

        updates.append("updated_at = datetime('now')")
        params.append(preset_id)

        await db.execute(
            f"UPDATE presets SET {', '.join(updates)} WHERE id = ?", params
        )
        await db.commit()
        return True
    finally:
        await db.close()


async def delete_preset(preset_id: str) -> bool:
    """Delete a preset by ID."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "DELETE FROM presets WHERE id = ?", (preset_id,)
        )
        await db.commit()
        return cursor.rowcount > 0
    finally:
        await db.close()


def _row_to_dict(row) -> dict:
    """Convert a database row to a plain dict."""
    return {
        "id": row["id"],
        "name": row["name"],
        "params_json": row["params_json"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }
