# AFTERLIGHT

AFTERLIGHT is a C++17 Tic-Tac-Toe game and web application built as an object-oriented programming project. It combines a server-authoritative game engine, three bot strategies, account authentication, private online multiplayer, match history, and a browser-based interface.

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

The C++ server is the authority for game rules, bot decisions, multiplayer room state, authentication, and match persistence. The browser client presents the game and sends requests to that server using HTTP and WebSockets. SQLite stores user accounts and completed match records.

The project demonstrates object-oriented design through encapsulated game state, an abstract bot interface and interchangeable strategies, composed game and room objects, and dedicated services for authentication, database access, and match history.

## Key Features

- **Three bot difficulty levels:** Easy selects a random legal move, Medium applies a win/block heuristic, and Unbeatable searches game states with Minimax.
- **Private online multiplayer:** Players create or join rooms using a room code and play through a live WebSocket connection.
- **Authoritative game rules:** The server validates turns, player identity, cell availability, and game completion.
- **Accounts and sessions:** Users can register, log in, log out, and retrieve their profile.
- **Match history:** Completed matches are stored in SQLite and history can be retrieved for the signed-in user.
- **Browser interface:** A responsive web client is served by the C++ backend.
- **Automated tests:** CTest runs game, bot, authentication, persistence, and room-logic tests.

## System Architecture

```text
Browser client (web/)
   | HTTP REST API                 | WebSocket (/ws)
   +-------------------------------+
                   |
         C++17 Crow server (src/server.cpp)
          |          |             |
    Game engine   AuthService   RoomManager
    and bots      MatchHistory  Room / Game
          \          |             /
                 SQLite database
              users and matches
```

- **Frontend:** `web/index.html`, `web/style.css`, and `web/app.js` implement the user interface and browser-side HTTP/WebSocket communication.
- **HTTP and WebSocket server:** Crow serves the frontend, exposes the REST endpoints, and coordinates real-time room updates.
- **Core game library:** `afterlight_core` contains the board, game, bot strategies, database wrapper, authentication, match history, and room management.
- **Persistence:** SQLite stores accounts and match records. Active sessions and multiplayer rooms are held in server memory.
- **Development bridge:** `server.ts` optionally starts the C++ server on port `5000` and proxies `/api/*` and `/ws` traffic while serving the frontend on port `3000`.

The C++ server is the authoritative backend; the frontend does not decide the outcome of a multiplayer move.

## Object-Oriented Design & OOP Principles

| Principle | Implementation |
|---|---|
| **Encapsulation** | `Board` keeps its nine cells private and exposes validated move and state-inspection methods. `Player` similarly provides accessors for its ID, username, and mark. |
| **Abstraction** | `BotStrategy` defines the common bot interface with `selectMove` and `getDifficulty`, without exposing each algorithm's details. |
| **Inheritance** | `EasyBot`, `MediumBot`, and `UnbeatableBot` inherit from `BotStrategy` and implement its virtual methods. |
| **Runtime polymorphism** | The bot endpoint creates a selected strategy through a `std::unique_ptr<BotStrategy>` and invokes it through the base-class interface. |
| **Composition** | `Game` owns a `Board`. `Room` owns a `Game`, its host, and an optional second player. |
| **Separation of responsibilities** | `AuthService`, `Database`, `MatchHistory`, `Room`, and `RoomManager` separate authentication, persistence, history, individual room behavior, and room lifecycle management. |
| **RAII and ownership** | `Database` owns and closes its SQLite connection. Smart pointers manage polymorphic bot instances and room objects. |
| **Concurrency control** | Mutexes protect shared database access, session state, room registries, and WebSocket connection tracking. |

### Main class responsibilities

- **`Board`** validates cell positions, applies moves, detects wins and draws, and provides the winning line.
- **`Game`** coordinates turns and game status, and rejects moves that are out of turn, invalid, or made after the game ends.
- **`BotStrategy` and bot implementations** provide substitutable move-selection algorithms.
- **`Player`** represents a participant and their assigned mark.
- **`Room`** coordinates two players, moves, and rematch requests for one game.
- **`RoomManager`** creates, looks up, joins, and cleans up rooms.
- **`Database`, `AuthService`, and `MatchHistory`** provide persistence, account/session operations, and match recording/querying.

## Database Schema & ER Design

The schema is defined in [`database/schema.sql`](database/schema.sql). SQLite foreign-key enforcement is enabled by the application.

```text
users
  id              INTEGER  PK
  username        TEXT     UNIQUE, case-insensitive
  email           TEXT     UNIQUE, case-insensitive
  password_hash   TEXT
  created_at      DATETIME
      | 1
      | 0..*
matches
  id              INTEGER  PK
  player_x_id     INTEGER  FK -> users.id, required
  player_o_id     INTEGER  FK -> users.id, nullable
  winner_id       INTEGER  FK -> users.id, nullable
  game_mode       TEXT     bot | pvp
  bot_difficulty  TEXT     easy | medium | unbeatable | NULL
  result          TEXT     X_WON | O_WON | DRAW
  created_at      DATETIME
```

Each match references the X player and can reference an O player; `player_o_id` is nullable for bot matches. `winner_id` is nullable for draws. Deleting a player cascades to matches where they are X or O, while deleting the winner sets `winner_id` to `NULL`. The schema uses `CHECK` constraints for game mode, bot difficulty, and result, and indexes user names, emails, and the player foreign keys.

## Project Directory Structure

```text
AfterLight3/
├── database/
│   └── schema.sql             SQLite tables, constraints, and indexes
├── docs/
│   └── README.md              Additional project documentation
├── include/                   C++ class and service declarations
├── src/                       C++ implementations and Crow server
├── tests/                     Game/bot and server-logic tests
├── third_party/crow/          Crow HTTP and WebSocket framework
├── web/
│   ├── app.js                 Browser interactions and API communication
│   ├── index.html             Application page
│   └── style.css              Application styles
├── CMakeLists.txt             C++ build targets and CTest configuration
├── package.json               Optional TypeScript bridge scripts/dependencies
├── server.ts                  Optional frontend/API development bridge
└── README.md
```

Important C++ headers in `include/` correspond to implementations in `src/`. `afterlight.db` is the SQLite database file created or used at runtime; `build/` contains generated build files and executables.

## REST API Reference

The Crow server exposes JSON endpoints under `/api`. Authenticated HTTP requests should send `Authorization: Bearer <session-token>`. The server also accepts a `token` query parameter; use the authorization header instead to avoid putting credentials in URLs. Successful registration and login return a session token.

| Method | Endpoint | Purpose | Authentication |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register with `username`, `email`, and `password`; returns a user and token. | No |
| `POST` | `/api/auth/login` | Log in with `username` or `email` and `password`; returns a user and token. | No |
| `POST` | `/api/auth/logout` | Invalidate the supplied session. | Token accepted |
| `GET` | `/api/auth/me` | Return the authenticated user's profile. | Yes |
| `POST` | `/api/bot/move` | Select a bot move for a supplied board. | Yes |
| `POST` | `/api/rooms/create` | Create a private room; returns its code. | Yes |
| `POST` | `/api/rooms/join` | Join a room using `roomCode`. | Yes |
| `POST` | `/api/matches/record` | Record a match result. | Yes |
| `GET` | `/api/matches/history` | Retrieve up to 30 match records for the user. | Yes |

### Request examples

Register:

```json
{
  "username": "player1",
  "email": "player@example.com",
  "password": "your-password"
}
```

For login, send `username` or `email` and `password`.

Request a bot move:

```json
{
  "difficulty": "medium",
  "board": "X O   X  ",
  "botMark": "O"
}
```

The board is a nine-character string; spaces represent empty cells. Supported difficulty values are `easy`, `medium`, and `unbeatable`.

Join a room:

```json
{ "roomCode": "ABC123" }
```

Room creation does not require a request body. Match recording accepts `gameMode` as `bot` or `pvp`, `result` as `X_WON`, `O_WON`, or `DRAW`, and an optional `botDifficulty` (`easy`, `medium`, or `unbeatable`). For PvP records, `playerOId` may be supplied.

### WebSocket protocol (`/ws`)

Connect to `/ws`, then join a room by sending a JSON message with the session token and room code:

```json
{ "type": "join", "token": "<session-token>", "roomCode": "ABC123" }
```

Send a move using a zero-based cell index from `0` to `8`, or request a rematch:

```json
{ "type": "move", "cell": 0 }
{ "type": "rematch" }
```

The server broadcasts `room_state` messages containing the room code, players, board, current turn, game status, winning line, and move count. These may include events such as `client_sync`, `player_joined`, `move_made`, `rematch_requested`, `rematch_started`, or `player_disconnected`. Rejected actions are sent as `error` messages.

## Installation & Quick Start

### Prerequisites

Install a C++17 compiler, CMake, SQLite development headers, Argon2 development headers, and Asio. On Ubuntu/Debian:

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

Open [http://localhost:3000](http://localhost:3000). The server accepts an optional port argument (defaults to `3000`) and serves the frontend and API on that port. Start it from the project directory so it can find `web/` and `database/schema.sql`; the SQLite database is opened as `afterlight.db` in the current working directory.

To use the optional TypeScript development bridge, install the Node.js dependencies with `npm install` after building the C++ server, then run:

```bash
npm run dev
```

The bridge serves the web application on port `3000` and starts/proxies to the C++ server on port `5000`.

## Security & Engineering Practices

- Passwords are stored as Argon2id hashes with per-password salts; plaintext passwords are not stored.
- Account and match database operations use SQLite prepared statements.
- User names and emails have case-insensitive uniqueness constraints, and user input has basic registration validation.
- Authenticated API operations validate in-memory session tokens on the server.
- Multiplayer moves are checked against the authenticated player, turn order, board state, and game status.
- SQLite foreign keys and `CHECK` constraints enforce the match data model.
- Mutexes protect shared database, session, room, and WebSocket state.
- CMake enables C++17 and compiler warnings for GNU/Clang; automated tests are registered with CTest.

Sessions and active rooms are in memory, so a backend restart invalidates sessions and clears rooms. Before exposing the service publicly, deploy it behind HTTPS/WSS and review token generation, request validation, operational logging, and production configuration for the intended threat model.
