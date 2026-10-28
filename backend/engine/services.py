"""
AFTERLIGHT - Application Services & Factory Pattern
Demonstrates:
- Factory Method Pattern: BotFactory instantiates polymorphic bot subclasses cleanly.
- Dependency Inversion Principle (DIP): GameService depends on IGameRepository abstraction.
- Single Responsibility Principle (SRP): Distinct services for game orchestration and statistics calculation.
"""

from typing import Dict, Any, List, Optional
from .models import Cell, BotDifficulty, GameStatus
from .board import Board
from .player import Player, HumanPlayer, BotPlayer
from .bots import RandomBot, StrategicBot, UnbeatableBot
from .game import Game
from .repositories import IGameRepository, InMemoryGameRepository


class BotFactory:
    """
    Factory Pattern: Creates polymorphic BotPlayer instances based on requested difficulty.
    Enforces the Open/Closed Principle (OCP) by encapsulating subclass creation.
    """

    @staticmethod
    def create_bot(difficulty: str, mark: Cell = Cell.O, name: Optional[str] = None) -> BotPlayer:
        diff_lower = difficulty.lower()
        if diff_lower in ("wanderer", "random", "easy"):
            return RandomBot(name=name or "Wanderer", mark=mark)
        elif diff_lower in ("sentinel", "strategic", "medium"):
            return StrategicBot(name=name or "Sentinel", mark=mark)
        elif diff_lower in ("unbroken", "unbeatable", "the unbroken", "hard", "impossible"):
            return UnbeatableBot(name=name or "The Unbroken", mark=mark)
        else:
            raise ValueError(f"Unknown bot difficulty '{difficulty}'. Valid: wanderer, sentinel, unbroken.")


class PlayerStatisticsService:
    """
    Service responsible for calculating and updating player statistics
    from authoritative completed match histories.
    """

    @staticmethod
    def calculate_statistics(player_name: str, matches: List[Dict[str, Any]]) -> Dict[str, Any]:
        total = len(matches)
        wins = 0
        losses = 0
        draws = 0

        current_streak = 0
        best_streak = 0

        # Sort chronological (oldest to newest) to compute streaks
        sorted_matches = sorted(matches, key=lambda m: m.get("createdAt", 0))

        for m in sorted_matches:
            if m.get("status") != GameStatus.COMPLETED.value:
                continue

            winner_name = m.get("winner", {}).get("name") if m.get("winner") else None
            is_draw = m.get("outcome") == "DRAW"

            if is_draw:
                draws += 1
                current_streak = 0
            elif winner_name and winner_name.lower() == player_name.lower():
                wins += 1
                current_streak += 1
                best_streak = max(best_streak, current_streak)
            else:
                losses += 1
                current_streak = 0

        win_rate = round((wins / total) * 100, 1) if total > 0 else 0.0

        # Dynamic rating calculation (starts at 1000)
        rating = 1000 + (wins * 25) - (losses * 15)

        return {
            "totalGames": total,
            "wins": wins,
            "losses": losses,
            "draws": draws,
            "winRate": win_rate,
            "currentStreak": current_streak,
            "bestStreak": best_streak,
            "rating": max(800, rating),
        }


class GameService:
    """
    Coordinates game creation, player turns, bot AI invocations, and persistence.
    Demonstrates Dependency Inversion: receives repository via constructor injection.
    """

    def __init__(self, repository: Optional[IGameRepository] = None):
        self._repository = repository or InMemoryGameRepository()

    def create_bot_game(
        self,
        human_name: str,
        human_mark: Cell = Cell.X,
        bot_difficulty: str = "unbroken",
        human_user_id: Optional[str] = None,
    ) -> Game:
        """Initializes a new match between a human and an AI bot."""
        bot_mark = human_mark.opponent()
        human_player = HumanPlayer(name=human_name, mark=human_mark, user_id=human_user_id)
        bot_player = BotFactory.create_bot(bot_difficulty, mark=bot_mark)

        if human_mark == Cell.X:
            player_x, player_o = human_player, bot_player
        else:
            player_x, player_o = bot_player, human_player

        game = Game(player_x=player_x, player_o=player_o, mode="BOT")
        self._repository.save(game)
        return game

    def play_move(self, game_id: str, player_name: str, position: int) -> Dict[str, Any]:
        """Applies a human move and, if against a bot, triggers the bot counter-move."""
        game = self._repository.get_by_id(game_id)
        if not game:
            raise ValueError(f"Game with ID '{game_id}' not found.")

        current_player = game.get_current_player()
        if current_player.name.lower() != player_name.lower():
            raise ValueError(f"It is not {player_name}'s turn.")

        # Human move
        result = game.make_move(current_player, position)
        bot_explanation = None

        # If game is still active and next player is a Bot, execute bot turn immediately
        if game.status == GameStatus.ACTIVE:
            next_player = game.get_current_player()
            if isinstance(next_player, BotPlayer):
                bot_move = next_player.get_move(game.board)
                bot_explanation = next_player.explain_decision(game.board, bot_move)
                result = game.make_move(next_player, bot_move)

        self._repository.save(game)
        return {
            "game": game.to_dict(),
            "lastResult": result,
            "botExplanation": bot_explanation,
        }
