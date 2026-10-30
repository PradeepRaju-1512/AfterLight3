# AFTERLIGHT UML

This document focuses on the system context and the main C++ class relationships.

## System context

The browser is the user-facing client. It communicates with the C++ Crow server using HTTP for account, bot, room setup, and history operations, and WebSockets for live multiplayer. The optional TypeScript bridge serves the browser assets and proxies requests to Crow. The server delegates game and service logic to `afterlight_core`; SQLite persists user and match data, while sessions, active rooms, and socket connections remain in memory.

```mermaid
flowchart LR
    Player((Player))
    Browser["Browser client<br/>web/index.html · web/style.css · web/app.js"]
    Bridge["Optional TypeScript bridge<br/>server.ts · port 3000"]
    Server["C++ Crow server<br/>src/server.cpp"]
    GameCore["Game logic<br/>Game · Board · BotStrategy"]
    Services["Application services<br/>AuthService · RoomManager · Room"]
    Persistence["Persistence classes<br/>MatchHistory · Database"]
    Memory[("Process memory<br/>sessions · active rooms · WebSocket connections")]
    SQLite[("SQLite<br/>users · matches")]

    Player --> Browser
    Browser -->|"HTTP /api/* and WebSocket /ws"| Server
    Browser -. "optional host/proxy" .-> Bridge
    Bridge -. "proxies API and WebSocket traffic" .-> Server
    Server --> GameCore
    Server --> Services
    Server --> Persistence
    Services <--> Memory
    Persistence --> SQLite
```

## Class diagram

```mermaid
classDiagram
    class CrowServer {
        <<process entry point>>
        REST routes
        WebSocket route
        static asset routes
    }

    class Board {
        -array~char,9~ cells_
        +isValidMove(index) bool
        +makeMove(index, mark) bool
        +reset() void
        +getCell(index) char
        +isFull() bool
        +isEmpty() bool
        +getAvailableMoves() vector~int~
        +checkWinner() char
        +getWinningLine() vector~int~
        +toString() string
    }

    class GameStatus {
        <<enumeration>>
        ONGOING
        X_WON
        O_WON
        DRAW
    }

    class Game {
        -Board board_
        -char currentTurn_
        -GameStatus status_
        -int moveCount_
        +reset() void
        +playMove(index, playerMark) bool
        +getBoard() Board
        +getCurrentTurn() char
        +getStatus() GameStatus
        +getMoveCount() int
        +isGameOver() bool
        +getStatusString() string
        +getWinningLine() vector~int~
    }

    class BotStrategy {
        <<abstract>>
        +selectMove(board, botMark)* int
        +getDifficulty()* string
    }
    class EasyBot {
        -mt19937 rng_
        +selectMove(board, botMark) int
        +getDifficulty() string
    }
    class MediumBot {
        -mt19937 rng_
        +selectMove(board, botMark) int
        +getDifficulty() string
    }
    class UnbeatableBot {
        +selectMove(board, botMark) int
        +getDifficulty() string
        -minimax(board, depth, isMaximizing, botMark, oppMark) int
    }

    class Player {
        -int id_
        -string username_
        -char mark_
        +getId() int
        +getUsername() string
        +getMark() char
        +setId(id) void
        +setUsername(username) void
        +setMark(mark) void
    }

    class Room {
        -string roomCode_
        -Game game_
        -Player playerX_
        -optional~Player~ playerO_
        -bool rematchRequestedX_
        -bool rematchRequestedO_
        -time_point lastActivity_
        +join(guest) bool
        +removePlayer(userId) bool
        +handleMove(userId, cellIndex) bool
        +handleRematchRequest(userId) bool
        +isFull() bool
        +updateActivity() void
    }

    class RoomManager {
        -unordered_map~string, shared_ptr~Room~~ rooms_
        -mutex mutex_
        +createRoom(host) shared_ptr~Room~
        +getRoom(code) shared_ptr~Room~
        +joinRoom(code, guest) pair~bool,string~
        +removeRoom(code) bool
        +cleanupInactiveRooms(timeoutMinutes) void
        +getRoomCount() size_t
    }

    class Database {
        -sqlite3* db_
        -string dbPath_
        -mutex dbMutex_
        +initializeSchema(schemaFilePath) bool
        +execute(sql) bool
        +getRawDb() sqlite3*
        +getMutex() mutex
    }

    class UserRecord {
        <<data>>
        +int id
        +string username
        +string email
        +string createdAt
    }
    class AuthResult {
        <<data>>
        +bool success
        +string message
        +string token
        +optional~UserRecord~ user
    }
    class AuthService {
        -Database& db_
        -unordered_map~string, UserRecord~ sessions_
        -mutex sessionMutex_
        +registerUser(username, email, password) AuthResult
        +loginUser(usernameOrEmail, password) AuthResult
        +logout(token) bool
        +validateSession(token) optional~UserRecord~
    }

    class MatchRecord {
        <<data>>
        +int id
        +int playerXId
        +string playerXUsername
        +optional~int~ playerOId
        +string playerOUsername
        +string gameMode
        +optional~string~ botDifficulty
        +optional~int~ winnerId
        +string result
        +string createdAt
    }
    class MatchHistory {
        -Database& db_
        +recordMatch(playerXId, playerOId, gameMode, botDifficulty, winnerId, result) bool
        +getUserMatches(userId, limit) vector~MatchRecord~
    }

    class WsClientInfo {
        <<server-local data>>
        +string token
        +int userId
        +string username
        +string roomCode
    }

    Game *-- Board : owns
    Game --> GameStatus : state
    BotStrategy <|.. EasyBot
    BotStrategy <|.. MediumBot
    BotStrategy <|.. UnbeatableBot
    BotStrategy ..> Board : chooses move from
    Room *-- Game : owns
    Room *-- Player : player X
    Room o-- Player : optional player O
    RoomManager "1" o-- "0..*" Room : manages
    AuthService --> Database : uses
    MatchHistory --> Database : uses
    AuthService ..> UserRecord : returns
    AuthService ..> AuthResult : returns
    MatchHistory ..> MatchRecord : returns
    CrowServer --> AuthService : routes
    CrowServer --> MatchHistory : routes
    CrowServer --> RoomManager : routes
    CrowServer ..> BotStrategy : selects implementation
    CrowServer ..> WsClientInfo : tracks connections
```

## Class details

| Class | Details |
|---|---|
| `CrowServer` | The process entry point implemented in `src/server.cpp`, rather than a standalone domain class. Defines the HTTP, WebSocket, and static-file routes and connects incoming requests to the core services. |
| `Board` | Encapsulates the nine cells and board operations. Validates moves, provides legal cells, and detects wins, winning lines, and draws. |
| `Game` | Owns a `Board` and controls turns, move validity, and the outcome represented by `GameStatus`. |
| `GameStatus` | Enumeration of the four game states: ongoing, an X win, an O win, or a draw. |
| `BotStrategy` | Abstract interface for selecting a move and reporting a difficulty. The server can use any concrete strategy through this common interface. |
| `EasyBot` | Implements the easy level by selecting a random legal move. |
| `MediumBot` | Implements the medium level using a win/block heuristic with limited lookahead. |
| `UnbeatableBot` | Implements the unbeatable level using Minimax to evaluate possible moves. |
| `Player` | Holds a participant's user ID, username, and X/O mark. Used for human players in multiplayer rooms. |
| `Room` | Owns a `Game` and the host player, and optionally holds a second player. Validates room moves and coordinates rematches and activity tracking. |
| `RoomManager` | Thread-safe in-memory registry that creates, looks up, joins, and removes active rooms, and cleans up inactive ones. |
| `Database` | Owns the SQLite connection and its mutex. Initializes the schema and provides synchronized access used by persistence services. |
| `AuthService` | Registers and authenticates users, verifies password hashes, and manages process-local session tokens. Uses `Database` for persisted account data. |
| `UserRecord` | Data structure for a user's ID, username, email, and account creation time; returned by authentication operations. |
| `AuthResult` | Carries an authentication operation's success status, message, session token, and optional `UserRecord`. |
| `MatchHistory` | Records completed matches and retrieves a user's history through the shared `Database` instance. |
| `MatchRecord` | Data structure describing a stored match, including participants, mode, optional bot difficulty and winner, result, and timestamp. |
| `WsClientInfo` | Server-local data associated with a WebSocket connection: session token, user identity, and joined room code. It is not a persisted database record. |

The `*--` relationships indicate composition: `Game` owns its `Board`, and `Room` owns its `Game` and host player. `RoomManager` keeps shared references to active rooms. Bot implementations inherit from `BotStrategy` and are selected at runtime by the server.
