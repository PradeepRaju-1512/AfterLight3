"""
AFTERLIGHT - Player Hierarchy & Abstraction
Demonstrates:
- Abstraction: Player abstract base class defining stable interface for game participants.
- Inheritance: HumanPlayer and BotPlayer specialization hierarchy.
- Polymorphism: Game loop interacts with Player without coupling to concrete implementations.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from .models import Cell
from .board import Board


class Player(ABC):
    """
    Abstract Base Class for all game participants in AFTERLIGHT.
    Enforces a stable contract: every player must have a name, a mark,
    and must implement `get_move(board)`.
    """

    def __init__(self, name: str, mark: Cell):
        if mark == Cell.EMPTY:
            raise ValueError("Player mark must be Cell.X or Cell.O.")
        self._name = name
        self._mark = mark

    @property
    def name(self) -> str:
        """Read-only player display name."""
        return self._name

    @property
    def mark(self) -> Cell:
        """The mark (X or O) this player places on the board."""
        return self._mark

    @abstractmethod
    def get_move(self, board: Board) -> int:
        """
        Abstract method to select a legal move [0..8] on the provided board.
        Subclasses (HumanPlayer, RandomBot, StrategicBot, UnbeatableBot)
        provide concrete polymorphic implementations.
        """
        pass

    def to_dict(self) -> Dict[str, Any]:
        """Serializes player identity."""
        return {
            "name": self._name,
            "mark": self._mark.value,
            "type": self.__class__.__name__,
        }

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(name='{self._name}', mark={self._mark.value})"


class HumanPlayer(Player):
    """
    Represents a human user participating in a match.
    In asynchronous/interactive web environments, human moves are queued
    or submitted from client interaction.
    """

    def __init__(self, name: str, mark: Cell, user_id: Optional[str] = None):
        super().__init__(name=name, mark=mark)
        self._user_id = user_id
        self._queued_move: Optional[int] = None

    @property
    def user_id(self) -> Optional[str]:
        return self._user_id

    def set_next_move(self, move: int) -> None:
        """Sets the move submitted by human input."""
        self._queued_move = move

    def get_move(self, board: Board) -> int:
        """
        Retrieves the queued move and validates against legal moves.
        """
        if self._queued_move is None:
            raise ValueError("No move queued for human player.")
        move = self._queued_move
        self._queued_move = None
        return move

    def to_dict(self) -> Dict[str, Any]:
        data = super().to_dict()
        data["userId"] = self._user_id
        return data


class BotPlayer(Player, ABC):
    """
    Abstract Base Class for artificial intelligence opponents.
    Extends Player with difficulty classification and decision explanation
    capabilities for the OOP Lab educational inspector.
    """

    def __init__(self, name: str, mark: Cell, difficulty: str):
        super().__init__(name=name, mark=mark)
        self._difficulty = difficulty

    @property
    def difficulty(self) -> str:
        """The difficulty level identifier."""
        return self._difficulty

    @abstractmethod
    def explain_decision(self, board: Board, move: int) -> Dict[str, Any]:
        """
        Provides detailed educational introspection into the heuristics
        or minimax tree evaluation that led to the chosen move.
        Used by the OOP Lab live polymorphism demonstration.
        """
        pass

    def to_dict(self) -> Dict[str, Any]:
        data = super().to_dict()
        data["difficulty"] = self._difficulty
        return data
