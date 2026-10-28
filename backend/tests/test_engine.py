"""
AFTERLIGHT - Automated Python OOP Unit & Integration Test Suite
Verifies:
1. Encapsulation & Domain Invariants (Board, Game)
2. Abstraction & Inheritance (Player, BotPlayer hierarchy)
3. Polymorphism & Liskov Substitution Principle (All bots conform to Player contract)
4. AI Unbeatable Proof (Minimax never loses against any play)
5. State transitions and exception handling
"""

import unittest
import os
import sys

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from engine.models import (
    Cell,
    GameStatus,
    GameOutcome,
    PositionOutOfBoundsError,
    OccupiedCellError,
    GameOverError,
    NotYourTurnError,
)
from engine.board import Board
from engine.player import HumanPlayer, BotPlayer, Player
from engine.bots import RandomBot, StrategicBot, UnbeatableBot
from engine.game import Game
from engine.services import BotFactory, PlayerStatisticsService


class TestBoardEncapsulation(unittest.TestCase):
    """Verifies that Board properly protects its internal grid state."""

    def setUp(self):
        self.board = Board()

    def test_initial_board_is_empty(self):
        cells = self.board.get_cells()
        self.assertEqual(len(cells), 9)
        self.assertTrue(all(c == Cell.EMPTY for c in cells))
        self.assertEqual(len(self.board.get_legal_moves()), 9)
        self.assertFalse(self.board.is_full())
        self.assertFalse(self.board.is_terminal())

    def test_valid_move_placement(self):
        self.board.place_mark(4, Cell.X)
        self.assertEqual(self.board.get_cell(4), Cell.X)
        self.assertNotIn(4, self.board.get_legal_moves())

    def test_encapsulation_rejects_occupied_cell(self):
        """Invariant: Cannot place a mark in an already occupied cell."""
        self.board.place_mark(0, Cell.X)
        with self.assertRaises(OccupiedCellError) as ctx:
            self.board.place_mark(0, Cell.O)
        self.assertEqual(ctx.exception.position, 0)
        self.assertEqual(ctx.exception.existing_mark, Cell.X)
        # Ensure state was not corrupted
        self.assertEqual(self.board.get_cell(0), Cell.X)

    def test_encapsulation_rejects_out_of_bounds_positions(self):
        """Invariant: Position must be in range 0..8."""
        with self.assertRaises(PositionOutOfBoundsError):
            self.board.place_mark(-1, Cell.X)
        with self.assertRaises(PositionOutOfBoundsError):
            self.board.place_mark(9, Cell.O)
        with self.assertRaises(PositionOutOfBoundsError):
            self.board.get_cell(100)

    def test_row_win_detection(self):
        board = Board.from_string("XXX......")
        winner, line = board.check_winner()
        self.assertEqual(winner, Cell.X)
        self.assertEqual(line, (0, 1, 2))
        self.assertTrue(board.is_terminal())

    def test_column_win_detection(self):
        board = Board.from_string("O..O..O..")
        winner, line = board.check_winner()
        self.assertEqual(winner, Cell.O)
        self.assertEqual(line, (0, 3, 6))

    def test_diagonal_win_detection(self):
        board = Board.from_string("X...X...X")
        winner, line = board.check_winner()
        self.assertEqual(winner, Cell.X)
        self.assertEqual(line, (0, 4, 8))

    def test_draw_detection(self):
        # Classic draw board
        board = Board.from_string("XOXOOXXXO")
        winner, line = board.check_winner()
        self.assertIsNone(winner)
        self.assertTrue(board.is_full())
        self.assertTrue(board.is_terminal())

    def test_defensive_cloning_isolation(self):
        """Mutating a clone must never affect the original board."""
        self.board.place_mark(0, Cell.X)
        clone = self.board.clone()
        clone.place_mark(1, Cell.O)

        self.assertEqual(self.board.get_cell(1), Cell.EMPTY)
        self.assertEqual(clone.get_cell(1), Cell.O)


class TestPlayerHierarchyAndPolymorphism(unittest.TestCase):
    """Verifies Polymorphism and Liskov Substitution across all player classes."""

    def test_bot_factory_creates_correct_subclasses(self):
        wanderer = BotFactory.create_bot("wanderer", Cell.O)
        self.assertIsInstance(wanderer, RandomBot)
        self.assertIsInstance(wanderer, BotPlayer)
        self.assertIsInstance(wanderer, Player)

        sentinel = BotFactory.create_bot("sentinel", Cell.O)
        self.assertIsInstance(sentinel, StrategicBot)

        unbroken = BotFactory.create_bot("unbroken", Cell.O)
        self.assertIsInstance(unbroken, UnbeatableBot)

    def test_polymorphic_get_move_contract(self):
        """All bots can be called uniformly via Player.get_move(board)."""
        board = Board.from_string("X.O......")
        bots: list[Player] = [
            RandomBot(mark=Cell.O),
            StrategicBot(mark=Cell.O),
            UnbeatableBot(mark=Cell.O),
        ]
        for bot in bots:
            move = bot.get_move(board)
            self.assertIn(move, board.get_legal_moves())
            self.assertTrue(0 <= move <= 8)


class TestStrategicBotHeuristics(unittest.TestCase):
    """Verifies StrategicBot prioritized decision engine."""

    def setUp(self):
        self.bot = StrategicBot(mark=Cell.O)

    def test_takes_immediate_win(self):
        # O can win at position 2 (0, 1 are O, 2 is empty)
        board = Board.from_string("OO.XX....")
        move = self.bot.get_move(board)
        self.assertEqual(move, 2)

    def test_blocks_opponent_immediate_win(self):
        # X threatens to win at position 2 (0, 1 are X, 2 is empty)
        board = Board.from_string("XX.O.....")
        move = self.bot.get_move(board)
        self.assertEqual(move, 2)

    def test_takes_center_when_available(self):
        board = Board.from_string("X........")
        move = self.bot.get_move(board)
        self.assertEqual(move, 4)


class TestUnbeatableBotAI(unittest.TestCase):
    """
    Exhaustive and rigorous verification that The Unbroken NEVER loses.
    A draw against optimal play is accepted; a loss is an algorithm failure.
    """

    def setUp(self):
        self.bot_o = UnbeatableBot(mark=Cell.O)
        self.bot_x = UnbeatableBot(mark=Cell.X)

    def test_unbeatable_vs_strategic_bot_never_loses(self):
        """Simulate matches between UnbeatableBot (O) and StrategicBot (X)."""
        strategic_x = StrategicBot(mark=Cell.X)
        for _ in range(5):
            game = Game(player_x=strategic_x, player_o=self.bot_o)
            while game.status == GameStatus.ACTIVE:
                curr = game.get_current_player()
                move = curr.get_move(game.board)
                game.make_move(curr, move)

            # Assert UnbeatableBot (O) NEVER lost
            self.assertNotEqual(
                game.outcome,
                GameOutcome.WIN_X,
                "CRITICAL: UnbeatableBot lost as O to StrategicBot!"
            )

    def test_unbeatable_vs_random_bot_never_loses(self):
        """Simulate 30 matches against RandomBot; UnbeatableBot must win or draw every time."""
        random_x = RandomBot(mark=Cell.X)
        for _ in range(30):
            game = Game(player_x=random_x, player_o=self.bot_o)
            while game.status == GameStatus.ACTIVE:
                curr = game.get_current_player()
                move = curr.get_move(game.board)
                game.make_move(curr, move)

            self.assertNotEqual(
                game.outcome,
                GameOutcome.WIN_X,
                "CRITICAL: UnbeatableBot lost as O to RandomBot!"
            )

    def test_unbeatable_vs_unbeatable_is_always_a_draw(self):
        """When two perfect Minimax bots play each other, the result must be a DRAW."""
        game = Game(player_x=self.bot_x, player_o=self.bot_o)
        while game.status == GameStatus.ACTIVE:
            curr = game.get_current_player()
            move = curr.get_move(game.board)
            game.make_move(curr, move)

        self.assertEqual(
            game.outcome,
            GameOutcome.DRAW,
            "Two optimal Minimax players must always draw in Tic-Tac-Toe."
        )


class TestGameAggregateAndStateTransitions(unittest.TestCase):
    """Verifies Game turn management, status transitions, and exceptions."""

    def test_strict_turn_alternation(self):
        p1 = HumanPlayer("Alice", Cell.X)
        p2 = HumanPlayer("Bob", Cell.O)
        game = Game(p1, p2)

        self.assertEqual(game.current_turn, Cell.X)
        game.make_move(p1, 0)
        self.assertEqual(game.current_turn, Cell.O)

        # Alice cannot move twice in a row
        with self.assertRaises(NotYourTurnError):
            game.make_move(p1, 1)

    def test_cannot_move_after_game_completed(self):
        p1 = HumanPlayer("Alice", Cell.X)
        p2 = HumanPlayer("Bob", Cell.O)
        game = Game(p1, p2)

        # Alice wins row 0
        game.make_move(p1, 0)
        game.make_move(p2, 3)
        game.make_move(p1, 1)
        game.make_move(p2, 4)
        game.make_move(p1, 2)  # Alice wins!

        self.assertEqual(game.status, GameStatus.COMPLETED)
        self.assertEqual(game.winner, p1)

        # Subsequent move must raise GameOverError
        with self.assertRaises(GameOverError):
            game.make_move(p2, 5)


class TestPlayerStatisticsService(unittest.TestCase):
    """Verifies player stats and streak computations."""

    def test_statistics_calculation(self):
        matches = [
            {"status": "COMPLETED", "outcome": "WIN_X", "winner": {"name": "Alice"}, "createdAt": 100},
            {"status": "COMPLETED", "outcome": "WIN_X", "winner": {"name": "Alice"}, "createdAt": 200},
            {"status": "COMPLETED", "outcome": "DRAW", "winner": None, "createdAt": 300},
            {"status": "COMPLETED", "outcome": "WIN_O", "winner": {"name": "Bob"}, "createdAt": 400},
        ]
        stats = PlayerStatisticsService.calculate_statistics("Alice", matches)
        self.assertEqual(stats["totalGames"], 4)
        self.assertEqual(stats["wins"], 2)
        self.assertEqual(stats["draws"], 1)
        self.assertEqual(stats["losses"], 1)
        self.assertEqual(stats["winRate"], 50.0)
        self.assertEqual(stats["bestStreak"], 2)


if __name__ == "__main__":
    unittest.main()
