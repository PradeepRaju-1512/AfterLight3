# AFTERLIGHT

AFTERLIGHT is a C++17 Tic-Tac-Toe game and web application built as an object-oriented programming project. It includes a server-authoritative game engine, three bot difficulties, account registration and login, private multiplayer rooms, match history, and a browser-based interface.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Object-Oriented Design & OOP Principles](#object-oriented-design--oop-principles)
- [Database Schema & ER Design](#database-schema--er-design)
- [Project Directory Structure](#project-directory-structure)
- [REST API Reference](#rest-api-reference)
- [Installation & Quick Start](#installation--quick-start)
- [Security & Engineering Practices](#security--engineering-practices)

## Overview

The C++ backend is authoritative for game rules, bot decisions, multiplayer moves, authentication, and match persistence. The browser client renders the interface and communicates with the backend over HTTP and WebSockets. SQLite stores registered accounts and match records.

## Key Features

- Play Tic-Tac-Toe against Easy, Medium, and Unbeatable bots.
- Create private rooms and play online against another registered player.
- Register, log in, and view recorded match history.
- Receive live room state updates over WebSockets.
- Use a responsive, cyberpunk-inspired web interface.
- Run C++ game and server-logic tests through CTest.

## System Architecture

```text
Browser client (web/)
   | HTTP REST API                 | WebSocket (/ws)
   +-------------------------------+
                   |
         C++17 Crow server (src/server.cpp)
          |          |             |
   Game engine   Auth/session   Room manager
   and bot AI    services       and live games
          \          |             /
              SQLite database
          (users and match history)
```

The C++ Crow server serves the frontend assets, exposes the REST API, and hosts the `/ws` WebSocket endpoint. The game rules and room state are handled on the server rather than trusted to the browser. `server.ts` is an optional development bridge that starts the C++ backend and proxies API and WebSocket traffic.

## Object-Oriented Design & OOP Principles

- **Encapsulation:** `Board` keeps its cell state private and exposes operations for moves and game-state inspection.
- **Abstraction and polymorphism:** `BotStrategy` defines the bot interface; `EasyBot`, `MediumBot`, and `UnbeatableBot` implement different strategies that can be selected through the base interface.
- **Composition:** `Game` owns a `Board`; `Room` owns a `Game` and player slots.
- **Single responsibility:** Authentication, database access, match history, room management, and game logic are separated into dedicated classes.
- **RAII:** `Database` owns and closes its SQLite connection; standard smart pointers manage polymorphic bot instances.
- **Thread safety:** Mutexes protect shared database, session, room, and WebSocket state.

## Database Schema & ER Design

The SQLite schema is defined in [`database/schema.sql`](database/schema.sql).

```text
users
  id (PK)
  username (unique, case-insensitive)
  email (unique, case-insensitive)
  password_hash
  created_at
      | 1
      |                       matches
      +--------------------<  player_x_id (FK -> users.id)
      +--------------------<  player_o_id (FK -> users.id, nullable)
      +--------------------<  winner_id    (FK -> users.id, nullable)
                              id (PK)
                              game_mode: bot | pvp
                              bot_difficulty: easy | medium | unbeatable | NULL
                              result: X_WON | O_WON | DRAW
                              created_at
```

Each match has an X player and may have an O player; a missing O player is supported for bot games. `winner_id` is nullable for draws and is set to `NULL` if its referenced user is deleted. Deleting a referenced player cascades to their matches.

## Project Directory Structure

```text
AfterLight3/
├── database/
│   └── schema.sql
├── docs/
│   └── README.md
├── include/              C++ class declarations
├── src/                  C++ implementations and Crow server
├── tests/                Game and server-logic tests
├── third_party/crow/     Crow HTTP/WebSocket framework
├── web/                  Browser application assets
├── CMakeLists.txt        C++ build and CTest configuration
├── package.json          Optional TypeScript development bridge scripts
└── README.md
```

## REST API Reference

API endpoints accept and return JSON unless otherwise noted. Authenticated requests use `Authorization: Bearer <token>`. For WebSocket connections, send the session token in the `join` message.

| Method | Endpoint | Purpose | Authentication |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register an account; returns user details and a session token. | No |
| `POST` | `/api/auth/login` | Log in with `username` or `email` and `password`; returns user details and a token. | No |
| `POST` | `/api/auth/logout` | Invalidate the current session. | Yes |
| `GET` | `/api/auth/me` | Return the authenticated user's details. | Yes |
| `POST` | `/api/bot/move` | Select a bot move for a supplied board. | Yes |
| `POST` | `/api/rooms/create` | Create a private multiplayer room; returns its code. | Yes |
| `POST` | `/api/rooms/join` | Join a room using its `roomCode`. | Yes |
| `POST` | `/api/matches/record` | Record a match result. | Yes |
| `GET` | `/api/matches/history` | Retrieve the authenticated user's match history. | Yes |

### Request examples

Register or log in:

```json
{
  "username": "player1",
  "email": "player@example.com",
  "password": "your-password"
}
```

For login, provide `username` or `email` and `password`.

Request a bot move:

```json
{
  "difficulty": "medium",
  "board": "X O   X  ",
  "botMark": "O"
}
```

The board is a nine-character string; spaces represent empty cells. Difficulty values are `easy`, `medium`, and `unbeatable`.

Create/join a room:

```json
{ "roomCode": "ABC123" }
```

The create endpoint does not require a request body. For match recording, supported `gameMode` values are `bot` and `pvp`; `result` values are `X_WON`, `O_WON`, and `DRAW`. `botDifficulty` is optional.

### WebSocket (`/ws`)

After connecting, send a JSON `join` message containing `type`, `token`, and `roomCode`:

```json
{ "type": "join", "token": "<session-token>", "roomCode": "ABC123" }
```

Send moves as `{ "type": "move", "cell": 0 }`, where `cell` is an index from `0` to `8`. Send `{ "type": "rematch" }` to request a rematch. The server broadcasts `room_state` messages and sends `error` messages when an action is rejected.

## Installation & Quick Start

### Prerequisites

On Ubuntu/Debian, install a C++17 compiler, CMake, SQLite development headers, Argon2 development headers, and Asio:

```bash
sudo apt-get update
sudo apt-get install -y build-essential cmake libsqlite3-dev libargon2-dev libasio-dev
```

### Build, test, and run

From the project directory:

```bash
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j4
ctest --test-dir build --output-on-failure
./build/afterlight_server 3000
```

Open [http://localhost:3000](http://localhost:3000). The server creates or initializes `afterlight.db` in its working directory using `database/schema.sql`.

To run the optional TypeScript development bridge instead, install the dependencies from `package.json`, build the C++ target, then run `npm run dev`. The bridge listens on port `3000` and proxies backend requests to the C++ server on port `5000`.

## Security & Engineering Practices

- Passwords are stored as Argon2id hashes rather than plaintext.
- Database reads and writes use SQLite prepared statements for account and match data.
- Authenticated API operations validate the session token on the server.
- Multiplayer moves are checked by the server for player identity, turn order, and legal board state.
- SQLite foreign keys and `CHECK` constraints enforce relationships and allowed game values.
- Mutexes protect mutable shared state used by server threads.
- Automated game and server-logic tests are available through CTest.

Session tokens are held in server memory, so restarting the backend invalidates existing sessions. Use HTTPS/WSS and deploy behind an appropriately configured production server when exposing the application beyond a trusted local environment.
