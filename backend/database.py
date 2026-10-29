"""
AFTERLIGHT - Relational Database Schema & SQLite Layer
Implements the relational database tables, foreign keys, indexes, and initial seeds.
"""

import sqlite3
import os
import time
import json
import hashlib
import hmac
import secrets
from typing import Dict, Any, List, Optional

# DATABASE_URL (see .env.example) may point at a different file; default is ../afterlight.db
_DEFAULT_DB = os.path.join(os.path.dirname(__file__), "..", "afterlight.db")
DB_PATH = os.environ.get("DATABASE_URL", "").strip().strip('"') or _DEFAULT_DB
if not os.path.isabs(DB_PATH):
    DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", DB_PATH))

_PBKDF2_ITERATIONS = 200_000


def get_db_connection() -> sqlite3.Connection:
    # timeout: several short-lived Python processes may touch the file at once
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _legacy_hash(password: str) -> str:
    """Original scheme: SHA-256 with ONE static salt shared by every user. Kept only so existing
    accounts can still log in; they are upgraded to PBKDF2 on their next successful login."""
    salt = "afterlight_salt_2026"
    return hashlib.sha256((password + salt).encode()).hexdigest()


def hash_password(password: str) -> str:
    """PBKDF2-HMAC-SHA256 with a random per-user salt. Format: pbkdf2$iterations$salt$hash"""
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), _PBKDF2_ITERATIONS).hex()
    return f"pbkdf2${_PBKDF2_ITERATIONS}${salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    if stored.startswith("pbkdf2$"):
        try:
            _, iters, salt, digest = stored.split("$")
            check = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), int(iters)).hex()
            return hmac.compare_digest(check, digest)
        except (ValueError, TypeError):
            return False
    return hmac.compare_digest(_legacy_hash(password), stored)


def needs_rehash(stored: str) -> bool:
    return not stored.startswith("pbkdf2$")


def ensure_db():
    """Creates the schema + seed data if the database file is new/empty (idempotent)."""
    needs_init = not os.path.exists(DB_PATH)
    if not needs_init:
        conn = sqlite3.connect(DB_PATH)
        try:
            row = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").fetchone()
            needs_init = row is None
        finally:
            conn.close()
    if needs_init:
        init_db()


def init_db():
    """Initializes tables, constraints, and indexes."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.executescript("""
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at REAL NOT NULL
    );

    -- Player Profiles table
    CREATE TABLE IF NOT EXISTS player_profiles (
        user_id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        avatar TEXT NOT NULL,
        bio TEXT,
        total_games INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        draws INTEGER DEFAULT 0,
        win_rate REAL DEFAULT 0.0,
        rating INTEGER DEFAULT 1000,
        is_online BOOLEAN DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Matches table
    CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        mode TEXT NOT NULL, -- 'BOT' or 'ONLINE'
        bot_difficulty TEXT,
        player_x_id TEXT,
        player_x_name TEXT NOT NULL,
        player_o_id TEXT,
        player_o_name TEXT NOT NULL,
        board_state TEXT NOT NULL DEFAULT '.........',
        current_turn TEXT NOT NULL DEFAULT 'X',
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        outcome TEXT NOT NULL DEFAULT 'IN_PROGRESS',
        winner_name TEXT,
        winning_line TEXT,
        room_code TEXT,
        created_at REAL NOT NULL,
        completed_at REAL
    );

    -- Moves table (atomic move audit log)
    CREATE TABLE IF NOT EXISTS moves (
        id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL,
        move_number INTEGER NOT NULL,
        player_name TEXT NOT NULL,
        mark TEXT NOT NULL,
        position INTEGER NOT NULL,
        created_at REAL NOT NULL,
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
        UNIQUE(game_id, move_number),
        UNIQUE(game_id, position)
    );

    -- Friendships table (bidirectional normalized)
    CREATE TABLE IF NOT EXISTS friendships (
        id TEXT PRIMARY KEY,
        user_a_name TEXT NOT NULL,
        user_b_name TEXT NOT NULL,
        created_at REAL NOT NULL,
        UNIQUE(user_a_name, user_b_name)
    );

    -- Friend Requests table
    CREATE TABLE IF NOT EXISTS friend_requests (
        id TEXT PRIMARY KEY,
        sender_name TEXT NOT NULL,
        recipient_name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        created_at REAL NOT NULL,
        responded_at REAL
    );

    -- User Blocks table
    CREATE TABLE IF NOT EXISTS user_blocks (
        id TEXT PRIMARY KEY,
        blocker_name TEXT NOT NULL,
        blocked_name TEXT NOT NULL,
        created_at REAL NOT NULL,
        UNIQUE(blocker_name, blocked_name)
    );

    -- Game Invitations table
    CREATE TABLE IF NOT EXISTS game_invitations (
        id TEXT PRIMARY KEY,
        sender_name TEXT NOT NULL,
        recipient_name TEXT NOT NULL,
        room_code TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        created_at REAL NOT NULL,
        expires_at REAL NOT NULL
    );

    -- Notifications table
    CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        recipient_name TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        data_json TEXT,
        is_read BOOLEAN DEFAULT 0,
        created_at REAL NOT NULL
    );

    -- Indexes for high performance
    CREATE INDEX IF NOT EXISTS idx_games_players ON games(player_x_name, player_o_name);
    CREATE INDEX IF NOT EXISTS idx_moves_game ON moves(game_id);
    CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_a_name);
    CREATE INDEX IF NOT EXISTS idx_notifs_recipient ON notifications(recipient_name);
    """)

    conn.commit()

    # Seed community players if not present
    seed_community_players(cursor)
    conn.commit()
    conn.close()


def seed_community_players(cursor):
    """Seeds authentic community players for instant social & matchmaking interaction."""
    community = [
        {
            "id": "user_luna",
            "username": "LunaWatcher",
            "displayName": "Luna Watcher",
            "bio": "Stargazer in the lookout tower. 150+ games under the moonlight.",
            "avatar": "tower",
            "wins": 24, "losses": 6, "draws": 4, "rating": 1280
        },
        {
            "id": "user_sentinel",
            "username": "PineSentinel",
            "displayName": "Pine Sentinel",
            "bio": "Guardian of the ridges. Always plays corner openings.",
            "avatar": "tree",
            "wins": 18, "losses": 12, "draws": 2, "rating": 1140
        },
        {
            "id": "user_shadow",
            "username": "ShadowTactician",
            "displayName": "Shadow Tactician",
            "bio": "Quiet wanderer. Analyzing Minimax branches in my sleep.",
            "avatar": "hiker",
            "wins": 31, "losses": 4, "draws": 8, "rating": 1420
        },
        {
            "id": "user_eldritch",
            "username": "EldritchSeeker",
            "displayName": "Eldritch Seeker",
            "bio": "Every move leaves a mark across the mountain path.",
            "avatar": "moon",
            "wins": 12, "losses": 9, "draws": 3, "rating": 1050
        },
    ]

    for p in community:
        cursor.execute("SELECT id FROM users WHERE username = ?", (p["username"],))
        if not cursor.fetchone():
            now = time.time()
            cursor.execute("""
                INSERT INTO users (id, username, email, password_hash, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, (p["id"], p["username"], f"{p['username'].lower()}@afterlight.game", hash_password("Password123!"), now))

            total = p["wins"] + p["losses"] + p["draws"]
            win_rate = round((p["wins"] / total) * 100, 1) if total > 0 else 0
            cursor.execute("""
                INSERT INTO player_profiles
                (user_id, display_name, avatar, bio, total_games, wins, losses, draws, win_rate, rating, is_online)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            """, (p["id"], p["displayName"], p["avatar"], p["bio"], total, p["wins"], p["losses"], p["draws"], win_rate, p["rating"]))


if __name__ == "__main__":
    init_db()
    print("Database initialized successfully with schema and community seed data.")
