"""
AFTERLIGHT - Repository Interfaces & Abstractions
Demonstrates:
- Dependency Inversion Principle (DIP): High-level domain services depend on abstract repository interfaces, not concrete persistence details.
- Interface Segregation Principle (ISP): Focused interfaces for distinct persistence domains.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from .game import Game


class IGameRepository(ABC):
    """Abstract contract for persisting and retrieving Game aggregates."""

    @abstractmethod
    def save(self, game: Game) -> None:
        """Persists the game state."""
        pass

    @abstractmethod
    def get_by_id(self, game_id: str) -> Optional[Game]:
        """Retrieves a game by its unique identifier."""
        pass

    @abstractmethod
    def list_recent(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieves recent matches."""
        pass

    @abstractmethod
    def list_by_player(self, player_name: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieves matches participated in by player."""
        pass


class IPlayerProfileRepository(ABC):
    """Abstract contract for player profiles and public stats."""

    @abstractmethod
    def get_profile(self, username: str) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    def save_profile(self, profile: Dict[str, Any]) -> None:
        pass

    @abstractmethod
    def search_players(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        pass


class IFriendshipRepository(ABC):
    """Abstract contract for friend requests and friendships."""

    @abstractmethod
    def get_friends(self, username: str) -> List[str]:
        pass

    @abstractmethod
    def add_friendship(self, user_a: str, user_b: str) -> None:
        pass

    @abstractmethod
    def remove_friendship(self, user_a: str, user_b: str) -> None:
        pass

    @abstractmethod
    def are_friends(self, user_a: str, user_b: str) -> bool:
        pass


class InMemoryGameRepository(IGameRepository):
    """
    In-memory concrete implementation of IGameRepository.
    Demonstrates Liskov Substitution Principle (LSP).
    """

    def __init__(self):
        self._storage: Dict[str, Game] = {}

    def save(self, game: Game) -> None:
        self._storage[game.id] = game

    def get_by_id(self, game_id: str) -> Optional[Game]:
        return self._storage.get(game_id)

    def list_recent(self, limit: int = 50) -> List[Dict[str, Any]]:
        games = list(self._storage.values())
        games.sort(key=lambda g: g.to_dict()["updatedAt"], reverse=True)
        return [g.to_dict() for g in games[:limit]]

    def list_by_player(self, player_name: str, limit: int = 50) -> List[Dict[str, Any]]:
        matches = [
            g.to_dict() for g in self._storage.values()
            if g.player_x.name.lower() == player_name.lower()
            or g.player_o.name.lower() == player_name.lower()
        ]
        matches.sort(key=lambda m: m["updatedAt"], reverse=True)
        return matches[:limit]
