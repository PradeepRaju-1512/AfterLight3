"""
AFTERLIGHT - Board Entity
Demonstrates:
- Encapsulation: Private cell state (_grid) with invariant enforcement and defensive copying.
- High Cohesion: Single Responsibility for 3x3 grid geometry and win-detection.
"""

from typing import List, Optional, Tuple
from .models import Cell, PositionOutOfBoundsError, OccupiedCellError


class Board:
    """
    Encapsulates the 3x3 Tic-Tac-Toe grid.
    Cells are indexed 0 to 8:
      0 | 1 | 2
      ---------
      3 | 4 | 5
      ---------
      6 | 7 | 8
    """

    # 8 standard winning lines: 3 rows, 3 columns, 2 diagonals
    WINNING_COMBINATIONS: Tuple[Tuple[int, int, int], ...] = (
        (0, 1, 2),  # Row 0
        (3, 4, 5),  # Row 1
        (6, 7, 8),  # Row 2
        (0, 3, 6),  # Column 0
        (1, 4, 7),  # Column 1
        (2, 5, 8),  # Column 2
        (0, 4, 8),  # Main diagonal
        (2, 4, 6),  # Anti-diagonal
    )

    def __init__(self, initial_state: Optional[List[Cell]] = None):
        """
        Initializes an empty or restored board.
        Encapsulation: Copies input state to prevent external mutations.
        """
        if initial_state is not None:
            if len(initial_state) != 9:
                raise ValueError("Initial board state must contain exactly 9 cells.")
            self._grid: List[Cell] = list(initial_state)
        else:
            self._grid: List[Cell] = [Cell.EMPTY for _ in range(9)]

    # ----------------------------------------------------
    # State Accessors (Encapsulation: Read-only safe views)
    # ----------------------------------------------------

    def get_cell(self, position: int) -> Cell:
        """Returns the mark at the specified index."""
        self._validate_position(position)
        return self._grid[position]

    def get_cells(self) -> List[Cell]:
        """Returns a defensive shallow copy of all cells."""
        return list(self._grid)

    def to_string(self) -> str:
        """Returns a 9-character string representation like 'X.O...X..'"""
        return "".join(c.value for c in self._grid)

    @classmethod
    def from_string(cls, string_repr: str) -> "Board":
        """Factory method to construct a board from a 9-char string."""
        if len(string_repr) != 9:
            raise ValueError(f"String representation must have length 9, got {len(string_repr)}")
        cells = []
        for ch in string_repr:
            if ch == "X":
                cells.append(Cell.X)
            elif ch == "O":
                cells.append(Cell.O)
            else:
                cells.append(Cell.EMPTY)
        return cls(cells)

    # ----------------------------------------------------
    # State Mutators (Encapsulation: Invariant Enforcement)
    # ----------------------------------------------------

    def place_mark(self, position: int, mark: Cell) -> None:
        """
        Places a mark in the given cell.
        Enforces domain invariants:
        1. Position must be within valid range [0..8].
        2. Cell must not be already occupied.
        3. Mark must be X or O (not EMPTY).
        """
        self._validate_position(position)

        if mark == Cell.EMPTY:
            raise ValueError("Cannot place an EMPTY mark on the board.")

        current_mark = self._grid[position]
        if current_mark != Cell.EMPTY:
            raise OccupiedCellError(position=position, existing_mark=current_mark)

        self._grid[position] = mark

    # ----------------------------------------------------
    # Queries & Geometry
    # ----------------------------------------------------

    def get_legal_moves(self) -> List[int]:
        """Returns a list of all unoccupied cell indices [0..8]."""
        return [i for i, cell in enumerate(self._grid) if cell == Cell.EMPTY]

    def is_full(self) -> bool:
        """Returns True if no empty cells remain."""
        return all(cell != Cell.EMPTY for cell in self._grid)

    def check_winner(self) -> Tuple[Optional[Cell], Optional[Tuple[int, int, int]]]:
        """
        Checks if either player has won.
        Returns:
            Tuple of (WinningCell or None, WinningLineIndices or None)
        """
        for combo in self.WINNING_COMBINATIONS:
            a, b, c = combo
            if (
                self._grid[a] != Cell.EMPTY
                and self._grid[a] == self._grid[b] == self._grid[c]
            ):
                return self._grid[a], combo
        return None, None

    def is_terminal(self) -> bool:
        """Returns True if someone has won or the board is full (draw)."""
        winner, _ = self.check_winner()
        return winner is not None or self.is_full()

    def clone(self) -> "Board":
        """Creates a deep copy of the board for simulation and AI lookahead."""
        return Board(list(self._grid))

    # ----------------------------------------------------
    # Private Helpers (Internal encapsulation)
    # ----------------------------------------------------

    def _validate_position(self, position: int) -> None:
        """Validates that a position is within the 3x3 bounds."""
        if not (0 <= position <= 8):
            raise PositionOutOfBoundsError(position=position)

    def __repr__(self) -> str:
        return f"Board('{self.to_string()}')"
