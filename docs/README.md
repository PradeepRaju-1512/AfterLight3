# AFTERLIGHT — Cyberpunk C++17 OOP Tic-Tac-Toe Game

AFTERLIGHT is a college Object-Oriented Programming (OOP) project implementing an authoritative Tic-Tac-Toe game engine and web application. It features a genuine C++17 Crow server for REST endpoints and real-time WebSockets, an SQLite database for user accounts and match logs, three calibrated bot difficulty levels (Easy, Medium, and Unbeatable Minimax), private-room online multiplayer, and a cyberpunk-inspired dark interface.

The C++ server owns all game logic, bot decisions, room management, move validation, and persistence. JavaScript strictly handles presentation and communication.

---

## 1. Quick Start: Ubuntu Build and Run Commands

### Prerequisites
Install the required C++17 compiler, CMake, and development libraries on Ubuntu/Debian:

```bash
sudo apt-get update
sudo apt-get install -y build-essential cmake libsqlite3-dev libargon2-dev libasio-dev
```

### Build with CMake
```bash
# 1. Generate build directory
cmake -B build -DCMAKE_BUILD_TYPE=Release

# 2. Compile server and test suites in parallel
cmake --build build -j4

# 3. Run all automated tests
ctest --test-dir build --output-on-failure
```

### Launch the Server
```bash
# Run server on port 3000 (serves web UI and API)
./build/afterlight_server 3000
```
Open `http://localhost:3000` in any web browser.

---

## 2. UML Class Diagram

```
                             ┌────────────────────────┐
                             │      BotStrategy       │ <<abstract>>
                             ├────────────────────────┤
                             │ + ~BotStrategy()       │
                             │ + selectMove(): int = 0│
                             │ + getDifficulty(): str │
                             └───────────┬────────────┘
                                         │
                 ┌───────────────────────┼───────────────────────┐
                 │                       │                       │
                 ▼                       ▼                       ▼
      ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
      │      EasyBot       │  │     MediumBot      │  │   UnbeatableBot    │
      ├────────────────────┤  ├────────────────────┤  ├────────────────────┤
      │ + selectMove()     │  │ + selectMove()     │  │ + selectMove()     │
      │   (Random legal)   │  │   (Win/Block 2-ply)│  │ - minimax(): int   │
      └────────────────────┘  └────────────────────┘  └────────────────────┘

      ┌────────────────────┐       1 ┌────────────────────┐
      │        Game        │◇────────│       Board        │  (Composition: Game has-a Board)
      ├────────────────────┤         ├────────────────────┤
      │ - board_: Board    │         │ - cells_: char[9]  │  (Encapsulation: private cells)
      │ - currentTurn_: char         ├────────────────────┤
      │ - status_: Status  │         │ + isValidMove()    │
      │ - moveCount_: int  │         │ + makeMove()       │
      ├────────────────────┤         │ + checkWinner()    │
      │ + playMove()       │         │ + getWinningLine() │
      │ + reset()          │         │ + getAvailableMoves│
      │ + getBoard()       │         │ + reset()          │
      └────────────────────┘         └────────────────────┘
               ▲
               │ 1
               ◇ (Composition: Room has-a Game)
      ┌────────────────────┐
      │        Room        │
      ├────────────────────┤
      │ - roomCode_: string│
      │ - game_: Game      │
      │ - playerX_: Player │
      │ - playerO_: Player │
      ├────────────────────┤
      │ + handleMove()     │
      │ + handleRematch()  │
      └────────────────────┘
               ▲
               │ *
               ◇ (Composition: RoomManager manages Rooms)
      ┌────────────────────┐
      │    RoomManager     │
      ├────────────────────┤
      │ - rooms_: map      │
      │ - mutex_: mutex    │
      ├────────────────────┤
      │ + createRoom()     │
      │ + joinRoom()       │
      │ + getRoom()        │
      └────────────────────┘
```

---

## 3. Database ER Diagram

```
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│              users              │       │             matches             │
├─────────────────────────────────┤       ├─────────────────────────────────┤
│ PK  id            INTEGER       │1     *│ PK  id             INTEGER      │
│     username      TEXT UNIQUE   ├───────┤ FK  player_x_id    INTEGER      │
│     email         TEXT UNIQUE   │1     *│ FK  player_o_id    INTEGER (opt)│
│     password_hash TEXT          ├───────┤     game_mode      TEXT         │
│     created_at    DATETIME      │1     *│     bot_difficulty TEXT (opt)   │
└─────────────────────────────────┘       │ FK  winner_id      INTEGER (opt)│
                                          │     result         TEXT         │
                                          │     created_at     DATETIME     │
                                          └─────────────────────────────────┘
```

- **`users`**: Stores user authentication credentials. Passwords are saved as memory-hard Argon2id hashes.
- **`matches`**: Persists completed match outcomes (bot games and multiplayer duels) using prepared statements and foreign keys.

---

## 4. Class Responsibilities

| Class | File | Responsibility |
| :--- | :--- | :--- |
| **`Board`** | `include/Board.hpp` | Represents the 3x3 grid. Encapsulates private cells, validates placement, checks winning combinations, and detects draws. |
| **`Player`** | `include/Player.hpp` | Stores player ID, username, and assigned mark (`'X'` or `'O'`). |
| **`Game`** | `include/Game.hpp` | Coordinates turns, moves, and game status (`ONGOING`, `X_WON`, `O_WON`, `DRAW`). Owns a `Board` instance. |
| **`BotStrategy`**| `include/BotStrategy.hpp` | Abstract interface defining `virtual int selectMove(...) = 0;`. Enables runtime polymorphic bot swapping. |
| **`EasyBot`** | `include/EasyBot.hpp` | Concrete bot selecting random legal open cells. |
| **`MediumBot`** | `include/MediumBot.hpp`| Concrete bot with 2-ply heuristics: wins immediately if possible, blocks opponent wins, and takes tactical cells. |
| **`UnbeatableBot`**| `include/UnbeatableBot.hpp`| Concrete bot running exhaustive Minimax algorithm with depth penalties. Mathematically impossible to defeat. |
| **`Room`** | `include/Room.hpp` | Holds a private online duel session, its unique code, player slots, and rematch coordination. |
| **`RoomManager`**| `include/RoomManager.hpp`| Thread-safe registry that generates 6-character room codes, tracks active rooms, and cleans up abandoned sessions. |
| **`Database`** | `include/Database.hpp` | RAII SQLite wrapper that handles connection lifetimes, table initialization, and multithreaded mutex locking. |
| **`AuthService`**| `include/AuthService.hpp`| Handles registration, credential verification with Argon2id, and secure session tokens. |
| **`MatchHistory`**| `include/MatchHistory.hpp`| Records finished matches and queries player match histories using prepared statements. |

---

## 5. OOP Concepts Demonstrated in Code

### 1. Encapsulation
- **Where**: `Board` (`include/Board.hpp`, `src/Board.cpp`).
- **How**: `cells_` is private (`std::array<char, 9> cells_`). External code cannot directly overwrite cells. State changes must pass through `Board::makeMove(int index, char mark)`, which validates bounds, occupancy, and mark legality.

### 2. Abstraction
- **Where**: `BotStrategy` (`include/BotStrategy.hpp`).
- **How**: Declares a pure virtual member function:
  ```cpp
  virtual int selectMove(const Board& board, char botMark) = 0;
  ```
  Callers interact with the bot through this high-level interface without needing to understand the underlying Minimax game-tree or heuristic algorithm.

### 3. Inheritance & Runtime Polymorphism
- **Where**: `EasyBot`, `MediumBot`, and `UnbeatableBot` inherit from `BotStrategy` (`include/EasyBot.hpp`, `MediumBot.hpp`, `UnbeatableBot.hpp`).
- **How**: In `src/server.cpp`, the server instantiates bots dynamically based on requested difficulty and calls `bot->selectMove(board, botMark)` via a `std::unique_ptr<BotStrategy>`:
  ```cpp
  std::unique_ptr<BotStrategy> bot;
  if (difficulty == "medium") bot = std::make_unique<MediumBot>();
  else if (difficulty == "unbeatable") bot = std::make_unique<UnbeatableBot>();
  else bot = std::make_unique<EasyBot>();

  int selectedMove = bot->selectMove(board, botMark); // Dynamic dispatch
  ```

### 4. Composition ("Has-a" relationship)
- **Where**: `Game` owns a `Board` (`Board board_` in `Game.hpp`); `Room` owns a `Game` (`Game game_` in `Room.hpp`).
- **How**: Game does not inherit from Board; it contains a Board and delegates grid operations to it. This models real-world composition.

### 5. RAII (Resource Acquisition Is Initialization)
- **Where**: `Database` (`include/Database.hpp`), `AuthService`, and smart pointers.
- **How**: `Database::Database` opens the SQLite handle in its constructor, and `Database::~Database` closes it in its destructor (`sqlite3_close`), guaranteeing that database connections never leak.

---

## 6. Viva Questions & Answers

**Q1: Why did you use an abstract class for `BotStrategy` instead of a single switch statement?**
> *Answer*: Using an abstract class `BotStrategy` with a pure virtual `selectMove` demonstrates the Open-Closed Principle (OCP) and Runtime Polymorphism. New AI algorithms (e.g. Monte Carlo Tree Search) can be added by creating a new derived class without modifying existing game logic.

**Q2: How does the Unbeatable Bot guarantee it will never lose?**
> *Answer*: It implements the Minimax algorithm. Tic-Tac-Toe has a finite game tree ($9! = 362,880$ terminal states). Minimax evaluates all recursive outcomes: maximizing the bot's score ($+10 - \text{depth}$) while assuming the opponent minimizes it ($-10 + \text{depth}$). Under optimal play, Tic-Tac-Toe is a proven mathematical draw, so the bot never loses.

**Q3: Why is Argon2id preferred over SHA-256 for password hashing?**
> *Answer*: SHA-256 is a general cryptographic hash designed to be fast, making it vulnerable to brute-force attacks on GPUs/ASICs. Argon2id is a memory-hard key derivation function that won the Password Hashing Competition. It requires significant memory and time costs, effectively neutralizing hardware cracking attempts.

**Q4: How does the server prevent a player from moving out of turn?**
> *Answer*: Move validation is strictly server-authoritative. In `Room::handleMove`, the server inspects the requesting user's ID, verifies their assigned mark ('X' or 'O'), and compares it to `game_.getCurrentTurn()`. If they do not match, the move is rejected.

---

## 7. Automated Test Report

Both automated test suites pass with 100% success rate:

```
Test project /app/applet/build
    Start 1: GameAndBotTests
1/2 Test #1: GameAndBotTests ..................   Passed    0.23 sec
    Start 2: ServerLogicTests
2/2 Test #2: ServerLogicTests .................   Passed    0.19 sec

100% tests passed, 0 tests failed out of 2
```

### Verified Test Cases
1. `test_winning_lines`: All 8 win combinations tested for both 'X' and 'O'.
2. `test_draw_detection`: Full board scenario verified without false win detections.
3. `test_invalid_moves_and_turns`: Out-of-bounds, occupied cells, and wrong turn moves rejected.
4. `test_bots`: EasyBot legality, MediumBot immediate win and block heuristics, and UnbeatableBot tested across 50 simulated games (42 wins, 8 draws, 0 losses).
5. `test_auth_and_database`: SQLite initialization, Argon2id hashing, duplicate user rejection, login verification, session token validation, and logout.
6. `test_room_lifecycle`: Room creation, code generation, guest join, turn enforcement, and two-party rematch handshake.
