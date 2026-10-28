"""
AFTERLIGHT - Game Aggregate & Engine Orchestrator
Demonstrates:
- Composition: Game has-a Board, has-a Player X, has-a Player O.
- Encapsulation: Strict turn validation, atomic move execution, outcome transition.
- Single Responsibility Principle (SRP): Game handles match rules & participant coordination.
"""

import time
import uuid
from typing import Dict, Any, List, Optional, Tuple
from .models import Cell, GameStatus, GameOutcome, GameOverError, NotYourTurnError
from .board import Board
from .player import Player


class Game:
    """
    Core domain aggregate for a match of AFTERLIGHT.
    Enforces turn order, move legality, and state transitions.
    """

    def __init__(
        self,
        player_x: Player,
        player_o: Player,
        game_id: Optional[str] = None,
        mode: str = "BOT",  # "BOT" or "ONLINE"
    ):
        if player_x.mark != Cell.X:
            raise ValueError(f"Player X must have mark Cell.X, got {player_x.mark}")
        if player_o.mark != Cell.O:
            raise ValueError(f"Player O must have mark Cell.O, got {player_o.mark}")

        self._id = game_id or str(uuid.uuid4())
        self._mode = mode
        self._board = Board()
        self._player_x = player_x
        self._player_o = player_o
        self._current_turn = Cell.X  # X always moves first in standard rules
        self._status = GameStatus.ACTIVE
        self._outcome = GameOutcome.IN_PROGRESS
        self._winner: Optional[Player] = None
        self._winning_line: Optional[Tuple[int, int, int]] = None
        self._created_at = time.time()
        self._updated_at = self._created_at
        self._moves_history: List[Dict[str, Any]] = []

    # ----------------------------------------------------
    # Encapsulated Properties
    # ----------------------------------------------------

    @property
    def id(self) -> str:
        return self._id

    @property
    def mode(self) -> str:
        return self._mode

    @property
    def board(self) -> Board:
        return self._board

    @property
    def current_turn(self) -> Cell:
        return self._current_turn

    @property
    def status(self) -> GameStatus:
        return self._status

    @property
    def outcome(self) -> GameOutcome:
        return self._outcome

    @property
    def winner(self) -> Optional[Player]:
        return self._winner

    @property
    def winning_line(self) -> Optional[Tuple[int, int, int]]:
        return self._winning_line

    @property
    def player_x(self) -> Player:
        return self._player_x

    @property
    def player_o(self) -> Player:
        return self._player_o

    @property
    def moves_history(self) -> List[Dict[str, Any]]:
        return list(self._moves_history)

    def get_current_player(self) -> Player:
        """Returns the player whose turn it currently is."""
        return self._player_x if self._current_turn == Cell.X else self._player_o

    def get_player_by_mark(self, mark: Cell) -> Player:
        """Returns the player instance assigned to the given mark."""
        if mark == Cell.X:
            return self._player_x
        if mark == Cell.O:
            return self._player_o
        raise ValueError("Invalid mark")

    # ----------------------------------------------------
    # State Mutation (Strict Domain Enforcement)
    # ----------------------------------------------------

    def make_move(self, player: Player, position: int) -> Dict[str, Any]:
        """
        Executes a move in the game.
        Validates:
        1. Match must be ACTIVE (not COMPLETED or CANCELLED).
        2. Must be the calling player's turn.
        3. Position must be legal on the board.
        """
        if self._status != GameStatus.ACTIVE:
            raise GameOverError(status=self._status)

        if player.mark != self._current_turn:
            raise NotYourTurnError(player_mark=player.mark, current_turn=self._current_turn)

        # Place mark on encapsulated board (board validates bounds and unoccupied)
        self._board.place_mark(position, player.mark)

        move_record = {
            "moveNumber": len(self._moves_history) + 1,
            "playerName": player.name,
            "playerMark": player.mark.value,
            "position": position,
            "timestamp": time.time(),
        }
        self._moves_history.append(move_record)
        self._updated_at = time.time()

        # Check for terminal state
        winning_cell, line = self._board.check_winner()
        if winning_cell is not None:
            self._status = GameStatus.COMPLETED
            self._winner = player
            self._winning_line = line
            self._outcome = GameOutcome.WIN_X if winning_cell == Cell.X else GameOutcome.WIN_O
        elif self._board.is_full():
            self._status = GameStatus.COMPLETED
            self._winner = None
            self._winning_line = None
            self._outcome = GameOutcome.DRAW
        else:
            # Advance turn
            self._current_turn = self._current_turn.opponent()

        return {
            "move": move_record,
            "board": self._board.to_string(),
            "status": self._status.value,
            "outcome": self._outcome.value,
            "winner": self._winner.name if self._winner else None,
            "winningLine": list(self._winning_line) if self._winning_line else None,
            "nextTurn": self._current_turn.value if self._status == GameStatus.ACTIVE else None,
        }

    def cancel(self, reason: str = "Player resigned or left") -> None:
        """Cancels an active match."""
        if self._status == GameStatus.ACTIVE:
            self._status = GameStatus.CANCELLED
            self._updated_at = time.time()

    def to_dict(self) -> Dict[str, Any]:
        """Serializes game snapshot for API consumers."""
        return {
            "id": self._id,
            "mode": self._mode,
            "board": self._board.to_string(),
            "status": self._status.value,
            "outcome": self._outcome.value,
            "currentTurn": self._current_turn.value,
            "playerX": self._player_x.to_dict(),
            "playerO": self._player_o.to_dict(),
            "winner": self._winner.to_dict() if self._winner else None,
            "winningLine": list(self._winning_line) if self._winning_line else None,
            "moves": self._moves_history,
            "createdAt": self._created_at,
            "updatedAt": self._updated_at,
        }
