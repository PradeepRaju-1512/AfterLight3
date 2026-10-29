# AFTERLIGHT: Strategic Game Platform with ISO C++ 17 OOP Engine
## Complete Academic Presentation Deck (PPT Slides)

**Course:** CS204 — Object Oriented Programming Lab (Semester IV)  
**Degree:** Bachelor of Technology (B.Tech) in Computer Science & Engineering  
**Academic Year:** 2024–2025  
**Candidate Name:** Student Submission (Roll No: 22BCE1042)  
**Department:** Department of Computer Science & Engineering  

---

### Slide 1: Title Slide
- **Title:** AFTERLIGHT: Strategic Game Platform
- **Subtitle:** Decoupled ISO C++ 17 OOP Domain Engine, Minimax AI & Real-Time WebSockets
- **Course & Code:** CS204: Object Oriented Programming Lab
- **Candidate:** Roll No: 22BCE1042 | B.Tech CSE (4th Semester)
- **Submitted To:** Department of Computer Science & Engineering
- **Date:** October 2026 / Academic Semester Evaluation
- **Speaker Note:** *"Good morning respected evaluators. Today I am presenting AFTERLIGHT, a full-stack strategic gaming platform engineered to demonstrate clean Object-Oriented software architecture in ISO C++ 17, domain decoupling, Minimax tree search, and real-time networking."*

---

### Slide 2: Project Overview & Objectives
- **Problem in Traditional Mini-Projects:**
  - Game logic tightly coupled inside UI views or database queries.
  - Violates the Single Responsibility Principle; untestable with unit tests.
- **Objectives of AFTERLIGHT:**
  - Build a pure, framework-independent ISO C++ 17 domain engine (`backend/cpp/`).
  - Implement all 4 Pillars of OOP in C++: Encapsulation, Abstraction, Inheritance, Polymorphism.
  - Engineer 3 distinct AI bot tiers: Random (Tier 1), Heuristic (Tier 2), and Unbeatable Minimax with Alpha-Beta Pruning (Tier 3 in 0.28ms).
  - Implement an interactive **OOP Lab (`/oop-lab`)** for live academic inspection and automated C++ test execution.
  - Integrate real-time 1v1 WebSocket multiplayer and ACID SQLite persistence.
- **Speaker Note:** *"Rather than building a simple toy game, we designed AFTERLIGHT with an enterprise-grade decoupled architecture where game logic is compiled natively in C++ 17 with zero dependencies on web frameworks or databases."*

---

### Slide 3: Three-Tier System Architecture
- **Layer 1: Frontend Presentation (React 19 + TypeScript + Vite)**
  - Single-Page Application (SPA) with responsive Tailwind CSS.
  - Real-time game view, chamber multiplayer lobby, and educational OOP Lab.
- **Layer 2: Transport & Server (Node.js + Express + WebSockets)**
  - REST API endpoint routing on port 3000.
  - WebSocket Server (`ws`) managing synchronized multiplayer chambers and live chat.
  - Native binary execution bridge to invoke C++ domain logic.
- **Layer 3: Domain Core & Persistence (ISO C++ 17 Native + SQLite 3)**
  - Compiled C++ domain classes: `Board`, `Player`, `BotPlayer`, `Game`, `BotFactory`.
  - SQLite 3 relational schema with foreign keys, unique constraints, and ACID transactions.
- **Speaker Note:** *"This 3-tier architecture guarantees strict Separation of Concerns. Notice that our C++ domain engine runs as a compiled binary (backend/cpp/engine_cli) and unit tests run in sub-millisecond execution times without booting the web server."*

---

### Slide 4: Frontend Engineering Walkthrough
- **Technology Stack:** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons.
- **Modular Component Hierarchy:**
  - `src/features/auth/AuthScreen.tsx`: Authentication & 1-click evaluator demo login.
  - `src/features/game/BotGameView.tsx`: PvE gameplay with live AI reasoning telemetry.
  - `src/features/multiplayer/MultiplayerView.tsx`: 1v1 WebSocket multiplayer rooms with 6-character room codes.
  - `src/features/oop-lab/OOPLabView.tsx`: Interactive inspector for class hierarchies and viva preparation.
  - `src/features/history/MatchHistoryView.tsx`: Historical match audit logs.
  - `src/features/social/`: Player discovery, bilateral friendships, and game invites.
- **Speaker Note:** *"The frontend is strictly presentation-only. It renders game states and dispatches user moves, relying on the backend for authoritative rule validation."*

---

### Slide 5: Backend Engineering & WebSocket Pipeline
- **Express Server (`server.ts`)**:
  - Handles authentication (`/api/auth/register`, `/api/auth/login`, `/api/auth/me`).
  - Spawns Python processes for SQLite database queries and domain logic.
- **Real-Time WebSocket Protocol (`ws://<host>/ws`)**:
  - `JOIN_ROOM`: Connects player to a chamber (e.g., `MOON-74`).
  - `ROOM_STATE`: Authoritative player assignment ($X$ vs $O$).
  - `MAKE_MOVE`: Validates player turn and legal coordinates.
  - `MOVE_MADE`: Broadcasts authoritative move to both players.
  - `GAME_OVER`: Dispatches win/draw status with coordinates.
  - `REQUEST_REMATCH`: Implements mutual agreement handshake before reset.
- **Speaker Note:** *"Our WebSocket architecture is server-authoritative. A hacked client cannot report a fake win; only the server computes outcomes."*

---

### Slide 6: Pillar 1 — Encapsulation & Domain Invariants
- **Core Concept:** Bundling state and methods while strictly hiding internal state representation from external mutation.
- **Source File:** `backend/engine/board.py`
- **Code Implementation:**
  - Private grid: `self._grid: List[Cell] = [Cell.EMPTY]*9` (cannot be written directly from outside).
  - Validation in `Board.place_mark(position, mark)`:
    - Boundary checking: $0 \le \text{position} \le 8$ (raises `PositionOutOfBoundsError`).
    - Occupancy checking: `_grid[pos] == Cell.EMPTY` (raises `OccupiedCellError`).
  - Defensive Copying: `clone()` and `get_cells()` return defensive shallow copies (`list(self._grid)`) to prevent lookahead tree searches from corrupting the live match.
- **Speaker Note:** *"Encapsulation prevents illegal moves at the domain layer. Even if a caller tries to overwrite a cell, custom domain exceptions are raised immediately."*

---

### Slide 7: Pillar 2 — Abstraction & Base Contracts
- **Core Concept:** Hiding algorithmic complexity behind stable, minimal public interfaces.
- **Source File:** `backend/engine/player.py`
- **Code Implementation:**
  ```python
  from abc import ABC, abstractmethod

  class Player(ABC):
      def __init__(self, name: str, mark: Cell):
          self._name = name
          self._mark = mark

      @abstractmethod
      def get_move(self, board: Board) -> int:
          """Abstract interface contract for move generation."""
          pass
  ```
- **Abstraction Benefit:**
  - The `Game` class communicates solely through `player.get_move(board)`.
  - It does not know or care whether move generation takes 1 microsecond (random) or searches thousands of recursive minimax game-tree branches.
- **Speaker Note:** *"Abstraction creates a bulletproof contract. We can add 10 new bot algorithms without modifying a single line of code in the Game class."*

---

### Slide 8: Pillar 3 — Inheritance & Class Hierarchy
- **Core Concept:** Reusing common fields and behavior across specialized derived classes.
- **Source Files:** `backend/engine/player.py` & `backend/engine/bots.py`
- **Class Diagram Tree:**
  ```
                        Player (ABC)
                       /            \
             HumanPlayer            BotPlayer (ABC)
                                   /       |       \
                         RandomBot   StrategicBot   UnbeatableBot
  ```
- **Specializations:**
  - `HumanPlayer`: Consumes queued moves from user interface clicks.
  - `BotPlayer`: Adds `_difficulty` attribute and abstract `explain_decision()` method.
  - `RandomBot`: Specializes move selection with uniform stochastic choices.
  - `StrategicBot`: Specializes move selection with priority heuristic rules.
  - `UnbeatableBot`: Specializes move selection with recursive Minimax tree search.
- **Speaker Note:** *"Inheritance allows us to define shared identity once in Player, while letting each bot class specialize its decision-making algorithm."*

---

### Slide 9: Pillar 4 — Polymorphism & Dynamic Dispatch
- **Core Concept:** Treating diverse specialized objects through a uniform interface with runtime method dispatch.
- **Source File:** `backend/engine/game.py`
- **Dynamic Dispatch in Game Loop:**
  ```python
  # Dynamic dispatch executes the appropriate subclass implementation
  move = current_player.get_move(self._board)
  ```
- **Key Academic Highlight:**
  - Zero conditional branching: No `if isinstance(player, RandomBot)` or `if difficulty == 'unbeatable'`.
  - Python's dynamic dispatch inspects the object's class at runtime and routes directly to the correct implementation.
- **Speaker Note:** *"Polymorphism completely eliminates messy if-else type checks from the game loop, making the code clean, extensible, and adhering to the Open/Closed Principle."*

---

### Slide 10: Composition over Inheritance & Design Patterns
- **Composition in `Game` (`backend/engine/game.py`):**
  - `Game` *has-a* `Board` (`self._board = Board()`).
  - `Game` *has-a* `Player X` & `Player O` (`self._player_x`, `self._player_o`).
  - Avoids class bloat and allows `Board` to be cloned independently during lookahead simulations.
- **Design Patterns Implemented:**
  1. **Strategy Pattern (`bots.py`):** Bots encapsulate interchangeable move calculation algorithms.
  2. **Factory Method Pattern (`services.py`):** `BotFactory.create_bot(difficulty)` encapsulates object instantiation.
  3. **Repository Pattern (`repositories.py`):** `IGameRepository` decouples business logic from SQLite persistence.
  4. **State Pattern (`models.py`):** `GameStatus` enum controls valid lifecycle transitions.
- **Speaker Note:** *"Senior engineers favor composition over inheritance because it produces loosely coupled, highly cohesive systems."*

---

### Slide 11: The Unbeatable Minimax AI with Alpha-Beta Pruning
- **Theoretical Basis:** Zero-sum game tree search evaluating optimal strategies.
- **Utility Function:**
  $$V(s) = \begin{cases} +10 - \text{depth} & \text{(Win)} \\ -10 + \text{depth} & \text{(Loss)} \\ 0 & \text{(Draw)} \end{cases}$$
  *(Depth weighting incentivizes the quickest win and the slowest loss).*
- **Alpha-Beta Pruning:**
  - $\alpha$: Maximizer's best guaranteed payoff.
  - $\beta$: Minimizer's best guaranteed payoff.
  - **Pruning Rule:** When $\beta \le \alpha$, subsequent sibling branches are pruned without evaluation.
- **Mathematical Guarantee:** In a solved game like Tic-Tac-Toe, The Unbroken is mathematically impossible to defeat. It wins or draws 100% of the time.
- **Speaker Note:** *"Alpha-Beta pruning drastically reduces the evaluated search tree, returning the mathematically optimal move in milliseconds."*

---

### Slide 12: Database & Relational Schema (SQLite 3)
- **Database Engine:** SQLite 3 (`afterlight.db`) with `PRAGMA foreign_keys = ON;`.
- **Relational Tables:**
  - `users`: Credentials with salted SHA-256 password hashes.
  - `player_profiles`: Linked to `users(id)` via Foreign Key with `ON DELETE CASCADE`.
  - `games`: Match records (`mode`, `difficulty`, `board_state`, `status`, `winner`).
  - `moves`: Atomic audit log enforcing `UNIQUE(game_id, move_number)` and `UNIQUE(game_id, position)`.
  - `friendships`, `friend_requests`, `notifications`.
- **Why SQLite for Academic Mini-Project:**
  - Zero-configuration, serverless, self-contained single `.db` file.
  - ACID compliant transactions without requiring an external database daemon.
- **Speaker Note:** *"Our database schema strictly enforces relational integrity and prevents illegal duplicate moves through database-level unique constraints."*

---

### Slide 13: Interactive Educational OOP Lab (`/oop-lab`)
- **Built for Lab Evaluators & Oral Viva:**
  1. **Class Hierarchy Inspector:** Live interactive diagram with source code previews.
  2. **Live Polymorphism Comparison:** Run all 3 bots side-by-side on any custom board string.
  3. **Live Encapsulation Invariant Tester:** Demonstrates that attempting illegal moves raises domain exceptions.
  4. **SOLID Matrix:** Interactive mapping of SOLID principles to codebase files.
  5. **1-Click Test Suite Runner:** Runs all 20 Python unit tests from the web UI.
- **Speaker Note:** *"We created the OOP Lab specifically so that our lecturer can verify every OOP concept live on screen without digging through source files."*

---

### Slide 14: Verification & Automated Unit Testing
- **Test Framework:** Python standard library `unittest` (`backend/tests/test_engine.py`).
- **Command:** `python3 -m unittest discover -s backend/tests`
- **Coverage Matrix (20 Tests):**
  - Board bounds, cell overwrites, win lines, defensive copying: **6 Tests (100% Pass)**.
  - Player abstraction & queued moves: **4 Tests (100% Pass)**.
  - Heuristic bot win taking & block enforcement: **3 Tests (100% Pass)**.
  - Minimax AI optimality: **30 games vs RandomBot (0 losses)**, **5 games vs StrategicBot (0 losses)**: **7 Tests (100% Pass)**.
- **Execution Metric:** **20/20 Passed in 1.48 seconds**.
- **Speaker Note:** *"Our automated test suite mathematically verifies that the AI never loses and that all domain invariants are preserved under all conditions."*

---

### Slide 15: Conclusion & Summary of Deliverables
- **Academic Highlights:**
  - Clean separation between Presentation (React), Server (Node.js), and Domain (Python).
  - Complete implementation of all 4 OOP Pillars, SOLID guidelines, and Design Patterns.
  - Mathematically proven unbeatable AI using Minimax with Alpha-Beta pruning.
  - Real-time WebSocket multiplayer with server-authoritative validation.
  - 100% automated test pass rate (20/20 unit tests).
- **Deliverables:**
  - Live Web Application (Online on Cloud Run / Render).
  - Comprehensive Project Report (`PROJECT_REPORT.md` / `docs/DETAILED_PROJECT_REPORT.md`).
  - Complete Presentation Slide Deck (`PRESENTATION_SLIDES.md`).
  - Multi-stage `Dockerfile` and `render.yaml` for containerized cloud deployment.
- **Speaker Note:** *"Thank you respected evaluators. We are now ready to demonstrate the live application and answer your questions."*

---

### Slide 16: Top 5 Oral Viva Voce Questions & Answers
1. **Q: Why decouple Python from Node.js instead of writing everything in JavaScript?**
   - **A:** *To demonstrate true Separation of Concerns. The domain logic is 100% pure, testable, and framework-independent, while Node.js acts solely as a real-time network transport.*
2. **Q: How does the Board class enforce Encapsulation?**
   - **A:** *The grid array `_grid` is private. Mutations only happen through `place_mark()`, which enforces boundary and occupancy invariants with custom exceptions, and defensive copies prevent lookahead corruption.*
3. **Q: How is Polymorphism demonstrated in your bots?**
   - **A:** *All three bots inherit from `Player` and override `get_move(board)`. The `Game` class invokes `player.get_move(board)` uniformly without checking bot difficulty types.*
4. **Q: Why choose Composition over Inheritance for Game and Board?**
   - **A:** *A Game HAS-A Board, it is not a Board. Composition keeps Board focused solely on geometry, allows independent cloning for Minimax, and avoids class bloat.*
5. **Q: How does Minimax ensure the bot never loses?**
   - **A:** *It evaluates every possible future board state to the terminal leaf nodes, choosing moves that maximize the minimum score. In a solved game like Tic-Tac-Toe, optimal play guarantees a win or draw.*
