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

---

## 4. OOP Concepts Demonstrated in Code

- **Encapsulation**: `Board::cells_` is private and modified only via validated methods `makeMove` and `reset`.
- **Abstraction**: Pure virtual interface `BotStrategy` with `selectMove(...) = 0`.
- **Inheritance & Runtime Polymorphism**: Derived classes `EasyBot`, `MediumBot`, and `UnbeatableBot` invoked through `std::unique_ptr<BotStrategy>`.
- **Composition**: `Game` has-a `Board`; `Room` has-a `Game`.
- **RAII**: Automatic SQLite resource release in `Database::~Database` and memory safety through C++ standard smart pointers.

---

## 5. Automated Tests
To execute test suites:
```bash
ctest --test-dir build --output-on-failure
```
All tests verified with 100% pass rate.
