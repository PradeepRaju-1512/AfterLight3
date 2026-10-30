# AFTERLIGHT UML

This document focuses on the system context and the main C++ class relationships.

## System context

The browser is the user-facing client. In the standalone setup, the C++ Crow server serves the browser assets and handles HTTP operations and the live multiplayer WebSocket connection directly. In the optional TypeScript bridge setup, the bridge serves the browser assets and proxies HTTP API and WebSocket traffic to Crow. These are alternative browser-to-server paths. The server delegates game and service logic to `afterlight_core`; SQLite persists user and match data, while sessions, active rooms, and socket connections remain in memory.

```mermaid
%%{init: {"theme": "dark", "themeVariables": {"background": "#0b1220", "primaryColor": "#172033", "primaryTextColor": "#ffffff", "primaryBorderColor": "#ffffff", "lineColor": "#ffffff", "textColor": "#ffffff", "fontSize": "20px"}, "flowchart": {"nodeSpacing": 60, "rankSpacing": 80}}}%%
flowchart LR
    Player((Player))
    Browser["Browser client<br/>web/index.html · web/style.css · web/app.js"]
    Bridge["Optional TypeScript development bridge<br/>serves frontend · port 3000"]
    Server["C++ Crow server<br/>serves frontend in standalone mode · port 3000<br/>bridge backend · port 5000"]
    GameCore["Game logic<br/>Game · Board · BotStrategy"]
    Services["Application services<br/>AuthService · RoomManager · Room"]
    Persistence["Persistence classes<br/>MatchHistory · Database"]
    Memory[("Process memory<br/>sessions · active rooms · WebSocket connections")]
    SQLite[("SQLite<br/>users · matches")]

    Player --> Browser
    Browser -->|"Standalone: HTTP /api/* · WebSocket /ws"| Server
    Browser -->|"Bridge mode: HTTP /api/* · WebSocket /ws"| Bridge
    Bridge -->|"Proxies /api/* and /ws"| Server
    Server --> GameCore
    Server --> Services
    Server --> Persistence
    Services <--> Memory
    Persistence --> SQLite
```

## Class diagram

```mermaid
%%{init: {"theme": "dark", "themeVariables": {"background": "#0b1220", "primaryColor": "#172033", "primaryTextColor": "#ffffff", "primaryBorderColor": "#ffffff", "lineColor": "#ffffff", "textColor": "#ffffff", "classTextColor": "#ffffff", "fontSize": "20px"}}}%%
classDiagram
    classDef default fill:#172033,stroke:#ffffff,stroke-width:2px,color:#ffffff;

    class Board {
        -cells_ : array~char,9~
        +Board()
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
        -board_ : Board
        -currentTurn_ : char
        -status_ : GameStatus
        -moveCount_ : int
        +Game()
        +reset() void
        +playMove(index, playerMark) bool
        +getBoard() const Board&
        +getBoard() Board&
        +getCurrentTurn() char
        +getStatus() GameStatus
        +getMoveCount() int
        +isGameOver() bool
        +getStatusString() string
        +getWinningLine() vector~int~
    }

    class BotStrategy {
        <<abstract>>
        +selectMove(board, botMark) int*
        +getDifficulty() string*
    }
    class EasyBot {
        -rng_ : mt19937
        +EasyBot()
        +selectMove(board, botMark) int
        +getDifficulty() string
    }
    class MediumBot {
        -rng_ : mt19937
        +MediumBot()
        +selectMove(board, botMark) int
        +getDifficulty() string
    }
    class UnbeatableBot {
        +UnbeatableBot()
        +selectMove(board, botMark) int
        +getDifficulty() string
        -minimax(board, depth, isMaximizing, botMark, oppMark) int
    }

    class Player {
        -id_ : int
        -username_ : string
        -mark_ : char
        +Player(id, username, mark)
        +getId() int
        +getUsername() string
        +getMark() char
        +setId(id) void
        +setUsername(username) void
        +setMark(mark) void
    }

    class Room {
        -roomCode_ : string
        -game_ : Game
        -playerX_ : Player
        -playerO_ : optional~Player~
        -rematchRequestedX_ : bool
        -rematchRequestedO_ : bool
        -lastActivity_ : time_point
        +Room(code, host)
        +getRoomCode() const string&
        +getGame() const Game&
        +getGame() Game&
        +getPlayerX() const Player&
        +getPlayerO() const optional~Player~&
        +join(guest) bool
        +removePlayer(userId) bool
        +handleMove(userId, cellIndex) bool
        +handleRematchRequest(userId) bool
        +isRematchRequestedBy(mark) bool
        +isFull() bool
        +updateActivity() void
        +getLastActivity() time_point
    }

    class RoomManager {
        -rooms_ : unordered_map~string, shared_ptr~Room~~
        -mutex_ : mutex
        +RoomManager()
        +createRoom(host) shared_ptr~Room~
        +getRoom(code) shared_ptr~Room~
        +joinRoom(code, guest) pair~bool,string~
        +removeRoom(code) bool
        +cleanupInactiveRooms(timeoutMinutes) void
        +getRoomCount() size_t
        -generateUniqueCode() string
    }

    class Database {
        -db_ : sqlite3*
        -dbPath_ : string
        -dbMutex_ : mutex
        +Database(dbPath)
        +~Database()
        +initializeSchema(schemaFilePath) bool
        +execute(sql) bool
        +getRawDb() sqlite3*
        +getMutex() mutex
        -Database(other)
        -operator=(other) Database&
    }

    class UserRecord {
        <<struct>>
        +id : int
        +username : string
        +email : string
        +createdAt : string
    }
    class AuthResult {
        <<struct>>
        +success : bool
        +message : string
        +token : string
        +user : optional~UserRecord~
    }
    class AuthService {
        -db_ : Database&
        -sessions_ : unordered_map~string, UserRecord~
        -sessionMutex_ : mutex
        +AuthService(db)
        +registerUser(username, email, password) AuthResult
        +loginUser(usernameOrEmail, password) AuthResult
        +logout(token) bool
        +validateSession(token) optional~UserRecord~
        -generateSessionToken() string
        -hashPassword(password) string
        -verifyPassword(encodedHash, password) bool
    }

    class MatchRecord {
        <<struct>>
        +id : int
        +playerXId : int
        +playerXUsername : string
        +playerOId : optional~int~
        +playerOUsername : string
        +gameMode : string
        +botDifficulty : optional~string~
        +winnerId : optional~int~
        +result : string
        +createdAt : string
    }
    class MatchHistory {
        -db_ : Database&
        +MatchHistory(db)
        +recordMatch(playerXId, playerOId, gameMode, botDifficulty, winnerId, result) bool
        +getUserMatches(userId, limit) vector~MatchRecord~
    }

    class WsClientInfo {
        <<struct>>
        +token : string
        +userId : int
        +username : string
        +roomCode : string
    }

    Game *-- Board : owns
    Game --> GameStatus : status
    BotStrategy <|.. EasyBot
    BotStrategy <|.. MediumBot
    BotStrategy <|.. UnbeatableBot
    BotStrategy ..> Board : reads board
    Room *-- Game : owns
    Room "1" *-- "1" Player : player X
    Room "1" *-- "0..1" Player : optional player O
    RoomManager "1" o-- "0..*" Room : shared room registry
    AuthService --> Database : uses
    MatchHistory --> Database : uses
    AuthService ..> AuthResult : returns
    AuthResult *-- "0..1" UserRecord : optional user
    MatchHistory ..> MatchRecord : returns
    WsClientInfo ..> Room : identifies joined room by code
```

`src/server.cpp` is the application entry point, not a C++ class, so it is intentionally described in the system-context diagram rather than represented as a class. It wires the services together, selects a concrete bot strategy, and stores `WsClientInfo` records for active WebSocket connections.

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

The `*--` relationships indicate composition: `Game` owns its `Board`; `Room` owns its `Game` and player slots; and `AuthResult` contains an optional `UserRecord`. `RoomManager` keeps shared references to active rooms. Bot implementations inherit from `BotStrategy` and are selected at runtime by the server.
