"""
AFTERLIGHT - Relational Database Schema & SQLite Layer
Implements the relational database tables, foreign keys, indexes, and initial seeds.
"""

import sqlite3
import os
import time
import json
import hashlib
from typing import Dict, Any, List, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "afterlight.db")


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def hash_password(password: str) -> str:
    """Returns SHA-256 salted hash of password."""
    salt = "afterlight_salt_2026"
    return hashlib.sha256((password + salt).encode()).hexdigest()


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
