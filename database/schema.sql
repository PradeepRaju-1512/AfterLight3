-- AFTERLIGHT Database Schema (SQLite)
-- Created for College OOP Tic-Tac-Toe Project

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_x_id INTEGER NOT NULL,
    player_o_id INTEGER,
    game_mode TEXT NOT NULL CHECK (game_mode IN ('bot', 'pvp')),
    bot_difficulty TEXT CHECK (bot_difficulty IN ('easy', 'medium', 'unbeatable') OR bot_difficulty IS NULL),
    winner_id INTEGER,
    result TEXT NOT NULL CHECK (result IN ('X_WON', 'O_WON', 'DRAW')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_x_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (player_o_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_matches_player_x ON matches(player_x_id);
CREATE INDEX IF NOT EXISTS idx_matches_player_o ON matches(player_o_id);
