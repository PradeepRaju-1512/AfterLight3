# AFTERLIGHT — Object-Oriented Programming (OOP) Design Specification

**Course Module:** Advanced Object-Oriented Software Engineering / Academic Project  
**System Name:** AFTERLIGHT  
**Tagline:** *Every move leaves a mark.*  
**Domain Layer Language:** Python 3.10 (Decoupled, Type-Hinted, Strict Domain Invariants)

---

## 1. Executive Architecture Summary

AFTERLIGHT is designed with a strict separation between domain logic and web presentation. Rather than hardcoding Tic-Tac-Toe rules inside frontend view components or relational queries, all game rules, invariant checks, heuristic strategies, and the Minimax algorithm are encapsulated inside a pure, framework-independent Python domain engine located in `backend/engine/`.

The application demonstrates the four pillars of Object-Oriented Programming, SOLID principles, design patterns (Factory Method, Repository, Strategy), and defensive programming.

---

## 2. The Four Pillars of OOP in AFTERLIGHT

### 2.1 Encapsulation

Encapsulation ensures that an object's internal representation is hidden from the outside, and only safe, validated state transitions can occur through public methods.

- **`Board._grid: list[Cell]`**: The 3x3 grid is stored privately. Outside code cannot alter cell values directly.
- **Invariants Enforced by `Board.place_mark(position: int, mark: Cell)`**:
  1. **Bounds Validation**: Checks `0 <= position <= 8`. If outside this range, raises `PositionOutOfBoundsError`.
  2. **Cell Emptiness**: Checks if `_grid[position] == Cell.EMPTY`. If already occupied, raises `OccupiedCellError`.
  3. **Mark Validity**: Rejects placing `Cell.EMPTY` as a move.
- **Defensive Copying**: `Board.clone()` and `Board.get_cells()` return new copies of the list, preventing callers from mutating the internal board during heuristic lookahead or Minimax simulation.
- **`Game` Turn Invariants**: `Game.make_move(player, position)` validates that the game is `ACTIVE` (raising `GameOverError` if completed) and that it is the calling player's turn (raising `NotYourTurnError`).

### 2.2 Abstraction

Abstraction hides complex computational logic behind intuitive, stable public interfaces.

- **`Player(ABC)`**: Defines the abstract method:
  ```python
  @abstractmethod
  def get_move(self, board: Board) -> int:
      """Returns an integer position [0..8] for the chosen move."""
      pass
  ```
  The caller (`Game`) interacts only with this abstract method. Whether move selection requires human UI input, a random choice, or a 1,500-node Minimax tree exploration with alpha-beta pruning is completely abstracted away.

### 2.3 Inheritance

A clean specialization hierarchy allows shared attributes (`name`, `mark`) and behaviors (`to_dict()`) to be inherited while specializing decision logic.

```
                  Player (ABC)
                 /            \
       HumanPlayer            BotPlayer (ABC)
                             /       |       \
                   RandomBot   StrategicBot   UnbeatableBot
```

- **`Player`**: Encapsulates `name`, `mark`, and abstract `get_move()`.
- **`BotPlayer`**: Inherits from `Player`, adds `difficulty` property and abstract `explain_decision(board, move)`.
- **`RandomBot` (Wanderer)**: Inherits from `BotPlayer`, overrides `get_move()` with uniform random selection.
- **`StrategicBot` (Sentinel)**: Inherits from `BotPlayer`, overrides `get_move()` with prioritized heuristic evaluation.
- **`UnbeatableBot` (The Unbroken)**: Inherits from `BotPlayer`, overrides `get_move()` with Minimax and alpha-beta pruning.

### 2.4 Polymorphism

Polymorphism allows different classes to be treated through a uniform interface while executing specialized behavior at runtime.

- In `Game.make_move(player: Player, position: int)` and `GameService.play_move()`, the engine simply invokes:
  ```python
  chosen_move = current_player.get_move(self._board)
  ```
  Python’s dynamic method dispatch automatically routes execution to `RandomBot.get_move()`, `StrategicBot.get_move()`, or `UnbeatableBot.get_move()`. The game loop contains zero `if isinstance(...)` checks for bot difficulty.

---

## 3. Composition over Inheritance

`Game` does **not** inherit from `Board`. Instead, `Game` uses **Composition**:
- `Game` *has-a* `Board` (`self._board = Board()`)
- `Game` *has-a* `Player` X (`self._player_x`)
- `Game` *has-a* `Player` O (`self._player_o`)

This design adheres to High Cohesion and Loose Coupling:
- `Board` is solely responsible for 3x3 grid geometry, win line combinations, and cell validation.
- `Game` is solely responsible for match rules, turn alternation, and outcome transitions.

---

## 4. SOLID Principles Mapping

| Principle | Real Class in Codebase | Source File | Architectural Rationale |
| :--- | :--- | :--- | :--- |
| **S** - Single Responsibility | `Board`, `Game`, `GameService`, `PlayerStatisticsService` | `board.py`, `game.py`, `services.py` | `Board` only manages grid geometry. `Game` only manages turns. `GameService` orchestrates persistence. `PlayerStatisticsService` computes win rates and streaks. |
| **O** - Open/Closed | `BotPlayer`, `BotFactory` | `player.py`, `bots.py`, `services.py` | New bot algorithms (e.g. MCTS, Q-Learning) can be added simply by subclassing `BotPlayer` without modifying `Game` or `Board`. |
| **L** - Liskov Substitution | `RandomBot`, `StrategicBot`, `UnbeatableBot` | `bots.py` | Any bot subclass can substitute for `Player` in `Game(player_x, player_o)` without altering correctness or breaking expectations. |
| **I** - Interface Segregation | `IGameRepository`, `IPlayerProfileRepository`, `IFriendshipRepository` | `repositories.py` | Persistence consumers depend only on small, focused interfaces rather than a monolithic database contract. |
| **D** - Dependency Inversion | `GameService` &rarr; `IGameRepository` | `services.py`, `repositories.py` | `GameService` depends on the abstract repository interface. The concrete SQLite or In-Memory implementation is injected via constructor injection. |

---

## 5. The Unbeatable AI Algorithm: Minimax with Alpha-Beta Pruning

Tic-Tac-Toe has a game-tree complexity of up to $9! = 362,880$ states. It is mathematically solved: an optimal player can guarantee at least a draw against any possible strategy, and will force a win against any suboptimal opponent move.

### 5.1 Objective Function & Depth Penalty
```python
if winner == self.mark:
    return 10 - depth, nodes, cutoffs    # Prefer faster victories
elif winner == self.mark.opponent():
    return -10 + depth, nodes, cutoffs   # Delay inevitable losses
elif board.is_full():
    return 0, nodes, cutoffs             # Draw
```

### 5.2 Alpha-Beta Pruning Optimization
- $\alpha$: Highest score guaranteed to the maximizing player so far.
- $\beta$: Lowest score guaranteed to the minimizing player so far.
- Pruning condition: If $\beta \le \alpha$, remaining sister branches cannot influence the final minimax value and are pruned immediately.

---

## 6. Oral Viva Examination Guide

When presenting to the college lecturer:
1. **Navigate to the OOP Lab (`/oop-lab`)**: Show the interactive dashboard.
2. **Demonstrate Encapsulation**: Click "Live Encapsulation Demo" &rarr; "Try Occupied Cell". Point out how `Board.place_mark()` intercepted the mutation, raised `OccupiedCellError`, and protected state integrity.
3. **Demonstrate Polymorphism**: Click "Live Polymorphism Demo". Show how `RandomBot`, `StrategicBot`, and `UnbeatableBot` are evaluated on the exact same board through `Player.get_move(board)`.
4. **Demonstrate Testing**: Click "Automated Test Suite" &rarr; "Run All 20 Python Tests". Show the 100% pass rate in terminal logs.
