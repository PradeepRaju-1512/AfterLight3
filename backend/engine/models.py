"""
AFTERLIGHT - Core Domain Models & Enums
Defines core board cells, game statuses, outcomes, and domain-specific exceptions.
Demonstrates Encapsulation and Domain-Driven Design (DDD).
"""

from enum import Enum
from typing import Optional


class Cell(str, Enum):
    """Represents the mark occupying a board cell."""
    EMPTY = "."
    X = "X"
    O = "O"

    def opponent(self) -> "Cell":
        """Returns the opposing cell mark."""
        if self == Cell.X:
            return Cell.O
        if self == Cell.O:
            return Cell.X
        raise ValueError(f"Cannot get opponent of empty cell: {self}")

    def __str__(self) -> str:
        return self.value


class GameStatus(str, Enum):
    """Lifecycle statuses of an AFTERLIGHT match."""
    WAITING = "WAITING"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class GameOutcome(str, Enum):
    """Authoritative outcome of a completed match."""
    WIN_X = "WIN_X"
    WIN_O = "WIN_O"
    DRAW = "DRAW"
    IN_PROGRESS = "IN_PROGRESS"


class BotDifficulty(str, Enum):
    """Available bot difficulty tiers in AFTERLIGHT."""
    WANDERER = "wanderer"       # RandomBot
    SENTINEL = "sentinel"       # StrategicBot (Heuristic)
    UNBROKEN = "unbroken"       # UnbeatableBot (Minimax with Alpha-Beta)


# ==========================================
# Domain Exceptions (Demonstrating Encapsulation)
# ==========================================

class DomainException(Exception):
    """Base exception for all domain engine validation errors."""
    def __init__(self, message: str, code: str):
        super().__init__(message)
        self.message = message
        self.code = code

    def to_dict(self) -> dict:
        return {"error": self.message, "code": self.code}


class PositionOutOfBoundsError(DomainException):
    """Raised when a move specifies an index outside [0, 8]."""
    def __init__(self, position: int):
        super().__init__(
            f"Position {position} is out of bounds. Must be between 0 and 8 inclusive.",
            code="POSITION_OUT_OF_BOUNDS"
        )
        self.position = position


class OccupiedCellError(DomainException):
    """Raised when attempting to place a mark in an already occupied cell."""
    def __init__(self, position: int, existing_mark: Cell):
        super().__init__(
            f"Cell {position} is already occupied by '{existing_mark.value}'.",
            code="OCCUPIED_CELL"
        )
        self.position = position
        self.existing_mark = existing_mark


class GameOverError(DomainException):
    """Raised when an action is attempted on an already completed or cancelled match."""
    def __init__(self, status: GameStatus):
        super().__init__(
            f"Cannot make a move because the game is already in status '{status.value}'.",
            code="GAME_OVER"
        )
        self.status = status


class NotYourTurnError(DomainException):
    """Raised when a player attempts to move out of turn."""
    def __init__(self, player_mark: Cell, current_turn: Cell):
        super().__init__(
            f"It is player '{current_turn.value}'s turn, but player '{player_mark.value}' attempted to move.",
            code="NOT_YOUR_TURN"
        )
        self.player_mark = player_mark
        self.current_turn = current_turn
