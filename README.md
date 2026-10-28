# AFTERLIGHT

**Department of Computer Science & Engineering**  
**Course:** Object Oriented Programming Lab (Semester III)  
**Project Title:** AFTERLIGHT   
**Submitted By:** Pradeep Ravish Raju (251144) & Keerthi Vardhan (251120)

---

## 1. Project Abstract & Objectives

**AFTERLIGHT** is an academic mini-project developed for the 2nd Year Object-Oriented Programming (OOPS) curriculum. The objective of this project is to apply core software engineering design principles—**Encapsulation**, **Abstraction**, **Inheritance**, and **Polymorphism**—to create a complete, modular, and testable 2-player strategic gaming platform.

Rather than tightly coupling game rules with the UI or database, all game invariants, state transitions, heuristic decision rules, and tree-search algorithms are encapsulated in a pure, decoupled Python 3.10 domain engine (`backend/engine/`).

### Key Features
1. **Four Pillars of OOP**: Pure object-oriented domain layer with strict state validation.
2. **Three AI Difficulty Tiers**:
   - **Wanderer (Tier 1)**: Uniform random legal move generator.
   - **Sentinel (Tier 2)**: Rule-based heuristic bot (win detection, fork prevention, center/corner priorities).
   - **The Unbroken (Tier 3)**: Mathematically optimal Minimax search with Alpha-Beta pruning (unbeatable).
3. **Interactive OOP Lab (`/oop-lab`)**: Built specifically for lab evaluation and oral viva demonstrations:
   - UML Class Hierarchy Explorer with live Python source inspection.
   - Live Polymorphism comparator running all three bot algorithms against any board state.
   - Live Encapsulation tester verifying that domain exceptions (`OccupiedCellError`, `GameOverError`) are raised.
   - SOLID principles matrix with real codebase references.
   - Automated 20-test Python test suite runner.
4. **Real-Time 1v1 Multiplayer**: WebSocket synchronization with private room codes, turn enforcement, and chamber chat.
5. **Relational Persistence**: SQLite 3 database (`afterlight.db`) enforcing foreign keys, unique move constraints, and player statistics.
6. **Dark Moonlit Atmosphere**: Atmospheric night aesthetic with dynamic pointer lighting.

---

## 2. Object-Oriented Architecture & UML Class Diagram

### 2.1 Class Hierarchy

```
                            +-----------------------+
                            |     Player (ABC)      |
                            +-----------------------+
                            | - _name: str          |
                            | - _mark: Cell         |
                            +-----------------------+
                            | + get_move(board)*    |
                            | + to_dict(): dict     |
                            +-----------------------+
                                        ^
                                        |
                 +----------------------+----------------------+
                 |                                             |
    +--------------------------+                 +---------------------------+
    |       HumanPlayer        |                 |      BotPlayer (ABC)      |
    +--------------------------+                 +---------------------------+
    | - _user_id: Optional[str]|                 | - _difficulty: str        |
    | - _queued_move: int      |                 +---------------------------+
    +--------------------------+                 | + explain_decision()*     |
    | + set_next_move(pos)     |                 +---------------------------+
    | + get_move(board): int   |                               ^
    +--------------------------+                               |
                                           +-------------------+-------------------+
                                           |                   |                   |
                             +--------------------+ +--------------------+ +--------------------+
                             |     RandomBot      | |    StrategicBot    | |   UnbeatableBot    |
                             +--------------------+ +--------------------+ +--------------------+
                             | + get_move()       | | + get_move()       | | + get_move()       |
                             | + explain_decision | | + explain_decision | | + _minimax(...)    |
                             +--------------------+ +--------------------+ +--------------------+
```

### 2.2 Domain Aggregates & Composition

```
    +----------------------------------+            +----------------------------------+
    |              Game                |  has-a (1) |              Board               |
    +----------------------------------+----------->+----------------------------------+
    | - _board: Board                  |            | - _grid: List[Cell] (Private)    |
    | - _player_x: Player              |            | + WINNING_COMBINATIONS: tuple    |
    | - _player_o: Player              |            +----------------------------------+
    | - _current_turn: Cell            |            | + place_mark(pos, mark)          |
    | - _status: GameStatus            |            | + get_legal_moves(): List[int]   |
    +----------------------------------+            | + check_winner(): Tuple          |
    | + make_move(player, pos)         |            | + clone(): Board (Defensive)     |
    | + get_current_player(): Player   |            +----------------------------------+
    +----------------------------------+
                    |
                    | has-a (2)
                    v
          +--------------------+
          |    Player (ABC)    |
          +--------------------+
```

---

## 3. Detailed Explanation of OOP Pillars in AFTERLIGHT

### 1. Encapsulation (`backend/engine/board.py` & `game.py`)
- **Private State**: The board cell grid is stored as `self._grid` and cannot be mutated directly by external consumers.
- **Invariant Enforcement**: Every move passes through `Board.place_mark(position, mark)`:
  - If `position < 0 or position > 8`, raises `PositionOutOfBoundsError`.
  - If `_grid[position] != Cell.EMPTY`, raises `OccupiedCellError`.
  - If placing an empty cell, raises `ValueError`.
- **Defensive Copying**: `Board.clone()` and `Board.get_cells()` return fresh copies of the list, preventing lookahead simulations (like Minimax) from mutating the live game state.
- **Turn Validation**: `Game.make_move(player, position)` validates that the game is active (`GameOverError`) and that it is the moving player's turn (`NotYourTurnError`).

### 2. Abstraction (`backend/engine/player.py`)
- The base class `Player` is an Abstract Base Class (`abc.ABC`):
  ```python
  class Player(ABC):
      @abstractmethod
      def get_move(self, board: Board) -> int:
          """Abstract interface contract for move generation."""
          pass
  ```
- The `Game` class communicates solely through this abstract method. Whether a move comes from a human click, a random number generator, or a minimax game tree search is completely abstracted away.

### 3. Inheritance (`backend/engine/player.py` & `bots.py`)
- `HumanPlayer` and `BotPlayer` inherit common identity attributes (`_name`, `_mark`, `to_dict()`) from `Player`.
- `RandomBot`, `StrategicBot`, and `UnbeatableBot` inherit from `BotPlayer`, reusing bot difficulty attributes while specializing their decision algorithms.

### 4. Polymorphism (`backend/engine/game.py` & `services.py`)
- In `Game.make_move()`:
  ```python
  # Dynamic dispatch executes the appropriate get_move implementation
  move = current_player.get_move(self._board)
  ```
- There are no `if isinstance(player, RandomBot)` checks in the game loop. The code treats all players uniformly through runtime dynamic dispatch.

### 5. Composition over Inheritance
- `Game` does not inherit from `Board`. Instead, `Game` *has-a* `Board` and *has-a* pair of `Player` objects.
- This creates loose coupling: `Board` handles grid geometry and win conditions, while `Game` manages players, turns, and outcomes.

---

## 4. Design Patterns Implemented

| Pattern | Code Location | Purpose in Project |
| :--- | :--- | :--- |
| **Strategy Pattern** | `backend/engine/bots.py` | Encapsulates move calculation algorithms (Random, Heuristic, Minimax) into interchangeable classes conforming to `Player`. |
| **Factory Method** | `backend/engine/services.py` (`BotFactory`) | Centralizes instantiation of bot tiers based on requested difficulty strings. |
| **Repository Pattern** | `backend/engine/repositories.py` (`IGameRepository`) | Decouples business logic from persistence. Enables in-memory storage for unit tests and SQLite for production. |
| **State Pattern** | `backend/engine/models.py` (`GameStatus`) | Represents explicit game lifecycle states (`ACTIVE`, `WON_X`, `WON_O`, `DRAW`, `CANCELLED`). |

---

## 5. Technology Stack

- **Domain Engine**: Python 3.10 standard library (`abc`, `dataclasses`, `enum`, `typing`, `unittest`).
- **Web Server**: Node.js & Express (`server.ts`) on port 3000.
- **Real-Time Layer**: WebSockets (`ws`) for live multiplayer chamber synchronization.
- **Persistence Layer**: SQLite 3 relational database (`afterlight.db`).
- **Frontend Presentation**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons.

---

## 6. How to Run & Verify

### Step 1: Install Dependencies & Launch Server
```bash
npm install
npm run dev
```
The server will start on `http://localhost:3000`.

### Step 2: Run the Automated Python Unit Test Suite
```bash
python3 -m unittest discover -s backend/tests
```
**Expected Output:**
```
Ran 20 tests in ~1.4s
OK
```

### Pre-Seeded Accounts for Evaluation
- **Demo User (LunaWatcher)**: Click **"Sign In as Evaluator (LunaWatcher)"** on the login page, or use:
  - Username: `LunaWatcher`
  - Password: `Password123!`
- **Other Accounts**: `ShadowTactician`, `PineSentinel`, `EldritchSeeker` (Password: `Password123!`).


## 8. Project Structure

```
.
├── backend/
│   ├── database.py              # SQLite relational schema & migrations
│   ├── db_bridge.py             # Express-to-Python SQLite bridge
│   ├── engine_cli.py            # CLI entry point for polymorphism/encapsulation demos
│   ├── engine/
│   │   ├── __init__.py
│   │   ├── board.py             # Encapsulation: Board entity & invariants
│   │   ├── player.py            # Abstraction: Player ABC & Human/Bot bases
│   │   ├── bots.py              # Polymorphism: RandomBot, StrategicBot, UnbeatableBot
│   │   ├── game.py              # Composition: Game aggregate entity
│   │   ├── models.py            # Enums, Data classes, Domain Exceptions
│   │   ├── repositories.py      # Interface Segregation: IGameRepository
│   │   └── services.py          # BotFactory & GameService
│   └── tests/
│       ├── __init__.py
│       └── test_engine.py       # 20 automated unit tests
├── src/
│   ├── App.tsx                  # React root & route controller
│   ├── components/              # Navigation & atmospheric background
│   ├── features/
│   │   ├── auth/                # Login & registration screen
│   │   ├── game/                # PvE vs Bot gameplay
│   │   ├── multiplayer/         # Real-time 1v1 WebSocket chambers
│   │   ├── oop-lab/             # Interactive OOP Lab, UML explorer, viva slides
│   │   ├── history/             # Match chronicles
│   │   ├── profile/             # User stats & badges
│   │   └── social/              # Player discovery & friends
│   ├── services/api.ts          # REST & WebSocket client
│   └── types/index.ts           # TypeScript interfaces
├── docs/                        # Complete technical specifications
│   ├── OOP_DESIGN.md            # Detailed OOP pillars & SOLID analysis
│   ├── ARCHITECTURE.md          # Data flow & WebSocket protocol
│   ├── API.md                   # REST API contract
│   └── DATABASE.md              # Database ER diagram & schema
├── server.ts                    # Node.js + Express + WebSocket backend server
├── package.json
└── README.md
```
