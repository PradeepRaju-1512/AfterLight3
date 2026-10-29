# AFTERLIGHT — System Architecture & Data Flow

## 1. System Overview

AFTERLIGHT is a full-stack web application designed for high responsiveness, real-time multiplayer synchronization, and deep academic introspection.

```
+-----------------------------------------------------------------------------------+
|                              REACT FRONTEND (SPA)                                 |
|  - Tailwind CSS + Moonlit Palette (#070B14, #D99A52, #C9D3E0)                     |
|  - Interactive Pointer-Following Illumination (CSS variables + requestAnimationFrame) |
|  - Features: AuthScreen, BotGameView, MultiplayerView, OOPLabView, Social         |
+-----------------------------------------------------------------------------------+
                                   |           ^
                    HTTP REST APIs |           | WebSocket (/ws)
                                   v           |
+-----------------------------------------------------------------------------------+
|                        NODE.JS / EXPRESS FULL-STACK SERVER                        |
|  - Express Application (server.ts) on Port 3000                                   |
|  - WebSocketServer (ws) managing multiplayer chambers & state broadcasts          |
|  - Session authentication & header validation                                     |
|  - Vite Middleware integration for seamless asset delivery                        |
+-----------------------------------------------------------------------------------+
             |                                             |
             | Python CLI Process                          | SQLite Queries
             v                                             v
+------------------------------------+     +-----------------------------------------+
|     PYTHON 3.10 DOMAIN ENGINE      |     |           SQLITE DATABASE LAYER         |
|  - backend/engine/board.py         |     |  - users, player_profiles, games, moves |
|  - backend/engine/player.py        |     |  - friendships, friend_requests         |
|  - backend/engine/bots.py          |     |  - game_invitations, notifications      |
|  - backend/engine/game.py          |     |  - foreign keys, unique constraints     |
|  - backend/tests/test_engine.py    |     +-----------------------------------------+
+------------------------------------+
```

## 2. Real-Time Multiplayer Protocol (WebSockets)

Multiplayer connections communicate via JSON frames over `ws://<host>/ws`:

| Action / Event | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `JOIN_ROOM` | Client &rarr; Server | `{ roomCode, username }` | Joins or initializes a private chamber. |
| `ROOM_STATE` | Server &rarr; Client | `{ status, players, board, currentTurn }` | Broadcasts current room occupancy. |
| `GAME_START` | Server &rarr; Client | `{ board, currentTurn, playerX, playerO }` | Fired when second player joins. |
| `MAKE_MOVE` | Client &rarr; Server | `{ roomCode, username, position }` | Player submits move intent. |
| `MOVE_MADE` | Server &rarr; Client | `{ position, mark, player, board, nextTurn }` | Authoritative move broadcast. |
| `GAME_OVER` | Server &rarr; Client | `{ board, outcome, winner, winningLine }` | Match outcome broadcast. |
| `REQUEST_REMATCH` | Client &rarr; Server | `{ roomCode, username }` | Proposes a rematch. |
| `REMATCH_STARTED` | Server &rarr; Client | `{ board, currentTurn, playerX, playerO }` | Triggered when both players accept. |
| `CHAT` | Client &rarr; Server | `{ roomCode, username, text }` | Sends in-chamber chat message. |
| `CHAT_MESSAGE` | Server &rarr; Client | `{ sender, text, time }` | Broadcasts chat message to room. |
| `PLAYER_LEFT` | Server &rarr; Client | `{ username }` | Dispatched on player exit or disconnect. |
