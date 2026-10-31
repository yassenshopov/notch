from __future__ import annotations

import json
import os
import sqlite3
import time
from contextlib import contextmanager
from typing import Any, Iterator


class HistoryStore:
    def __init__(self, db_path: str) -> None:
        self._path = db_path
        os.makedirs(os.path.dirname(db_path) or ".", exist_ok=True)
        self._init_schema()

    @contextmanager
    def _conn(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self._path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def _init_schema(self) -> None:
        with self._conn() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS samples (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ts REAL NOT NULL,
                    metric_dbm REAL,
                    signal_dbm REAL,
                    beacon_avg_dbm REAL,
                    motion INTEGER,
                    intensity REAL,
                    confidence REAL
                );
                CREATE INDEX IF NOT EXISTS idx_samples_ts ON samples(ts);

                CREATE TABLE IF NOT EXISTS motion_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ts REAL NOT NULL,
                    kind TEXT NOT NULL,
                    intensity REAL,
                    confidence REAL
                );
                CREATE INDEX IF NOT EXISTS idx_motion_ts ON motion_events(ts);

                CREATE TABLE IF NOT EXISTS calibration (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    completed INTEGER NOT NULL DEFAULT 0,
                    empty_room_var REAL,
                    threshold REAL,
                    profile_json TEXT
                );
                INSERT OR IGNORE INTO calibration(id, completed) VALUES (1, 0);

                CREATE TABLE IF NOT EXISTS recordings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    started_ts REAL NOT NULL,
                    ended_ts REAL,
                    label TEXT,
                    path TEXT
                );
                """
            )

    def insert_sample(
        self,
        ts: float,
        metric_dbm: float,
        signal_dbm: float | None,
        beacon_avg_dbm: float | None,
        motion: bool,
        intensity: float,
        confidence: float,
    ) -> None:
        with self._conn() as conn:
            conn.execute(
                """
                INSERT INTO samples(ts, metric_dbm, signal_dbm, beacon_avg_dbm, motion, intensity, confidence)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    ts,
                    metric_dbm,
                    signal_dbm,
                    beacon_avg_dbm,
                    1 if motion else 0,
                    intensity,
                    confidence,
                ),
            )

    def insert_motion_event(self, ts: float, kind: str, intensity: float, confidence: float) -> None:
        with self._conn() as conn:
            conn.execute(
                "INSERT INTO motion_events(ts, kind, intensity, confidence) VALUES (?, ?, ?, ?)",
                (ts, kind, intensity, confidence),
            )

    def get_calibration(self) -> dict[str, Any]:
        with self._conn() as conn:
            row = conn.execute("SELECT * FROM calibration WHERE id = 1").fetchone()
        if row is None:
            return {"completed": False}
        profile = json.loads(row["profile_json"]) if row["profile_json"] else {}
        return {
            "completed": bool(row["completed"]),
            "empty_room_var": row["empty_room_var"],
            "threshold": row["threshold"],
            "profile": profile,
        }

    def save_calibration(self, *, empty_room_var: float, threshold: float, profile: dict[str, Any]) -> None:
        with self._conn() as conn:
            conn.execute(
                """
                UPDATE calibration
                SET completed = 1, empty_room_var = ?, threshold = ?, profile_json = ?
                WHERE id = 1
                """,
                (empty_room_var, threshold, json.dumps(profile)),
            )

    def reset_calibration(self) -> None:
        with self._conn() as conn:
            conn.execute(
                "UPDATE calibration SET completed = 0, empty_room_var = NULL, threshold = NULL, profile_json = NULL WHERE id = 1"
            )

    def history_signal(self, since_ts: float, limit: int = 500) -> list[dict[str, Any]]:
        with self._conn() as conn:
            rows = conn.execute(
                """
                SELECT ts, metric_dbm, motion, intensity, confidence
                FROM samples WHERE ts >= ? ORDER BY ts DESC LIMIT ?
                """,
                (since_ts, limit),
            ).fetchall()
        return [dict(r) for r in reversed(rows)]

    def history_motion(self, since_ts: float, limit: int = 200) -> list[dict[str, Any]]:
        with self._conn() as conn:
            rows = conn.execute(
                """
                SELECT ts, kind, intensity, confidence FROM motion_events
                WHERE ts >= ? ORDER BY ts DESC LIMIT ?
                """,
                (since_ts, limit),
            ).fetchall()
        return [dict(r) for r in reversed(rows)]

    def prune_old_samples(self, retention_days: int) -> int:
        cutoff = time.time() - retention_days * 86400
        with self._conn() as conn:
            cur = conn.execute("DELETE FROM samples WHERE ts < ?", (cutoff,))
            conn.execute("DELETE FROM motion_events WHERE ts < ?", (cutoff,))
        return cur.rowcount
