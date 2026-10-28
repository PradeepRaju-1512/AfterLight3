"""
AFTERLIGHT - Python Domain Engine Package
Exports core classes for game execution, AI bots, and educational OOP introspection.
"""

from .models import (
    Cell,
    GameStatus,
    GameOutcome,
    BotDifficulty,
    DomainException,
    PositionOutOfBoundsError,
    OccupiedCellError,
    GameOverError,
    NotYourTurnError,
)
from .board import Board
from .player import Player, HumanPlayer, BotPlayer
from .bots import RandomBot, StrategicBot, UnbeatableBot
from .game import Game
from .services import BotFactory, GameService, PlayerStatisticsService
from .repositories import (
    IGameRepository,
    IPlayerProfileRepository,
    IFriendshipRepository,
    InMemoryGameRepository,
)

__all__ = [
    "Cell",
    "GameStatus",
    "GameOutcome",
    "BotDifficulty",
    "DomainException",
    "PositionOutOfBoundsError",
    "OccupiedCellError",
    "GameOverError",
    "NotYourTurnError",
    "Board",
    "Player",
    "HumanPlayer",
    "BotPlayer",
    "RandomBot",
    "StrategicBot",
    "UnbeatableBot",
    "Game",
    "BotFactory",
    "GameService",
    "PlayerStatisticsService",
    "IGameRepository",
    "IPlayerProfileRepository",
    "IFriendshipRepository",
    "InMemoryGameRepository",
]
