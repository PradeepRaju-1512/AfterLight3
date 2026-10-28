#!/usr/bin/env python3
"""
AFTERLIGHT - Python Engine CLI & JSON-RPC Bridge
Enables the Express/Node.js fullstack server and interactive OOP Lab
to execute genuine Python OOP domain logic and receive structured JSON responses.
"""

import sys
import json
import time
import inspect
from typing import Dict, Any, List

# Ensure parent directory is in path
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from engine.models import (
    Cell,
    DomainException,
    PositionOutOfBoundsError,
    OccupiedCellError,
    GameOverError,
    NotYourTurnError,
)
from engine.board import Board
from engine.player import Player, HumanPlayer, BotPlayer
from engine.bots import RandomBot, StrategicBot, UnbeatableBot
from engine.game import Game
from engine.services import BotFactory


def handle_polymorphism_compare(board_str: str, mark_str: str = "O") -> Dict[str, Any]:
    """
    Executes Polymorphism Demonstration:
    Invokes `get_move(board)` through the common `Player` interface across
    all three bot classes (RandomBot, StrategicBot, UnbeatableBot) on the exact same board.
    """
    board = Board.from_string(board_str)
    mark = Cell.O if mark_str.upper() == "O" else Cell.X

    bots: List[BotPlayer] = [
        RandomBot(mark=mark),
        StrategicBot(mark=mark),
        UnbeatableBot(mark=mark),
    ]

    results = []
    for bot in bots:
        # Polymorphic invocation: calling bot.get_move(board) on base Player contract
        start_time = time.perf_counter()
        move = bot.get_move(board)
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 3)
        explanation = bot.explain_decision(board, move)

        results.append({
            "className": bot.__class__.__name__,
            "parentClass": bot.__class__.__base__.__name__,
            "difficulty": bot.difficulty,
            "polymorphicInterfaceCalled": "Player.get_move(board: Board) -> int",
            "chosenMove": move,
            "executionTimeMs": elapsed_ms,
            "explanation": explanation,
            "boardAfterMove": Board(
                [mark if i == move else c for i, c in enumerate(board.get_cells())]
            ).to_string(),
        })

    return {
        "inputBoard": board_str,
        "botMark": mark.value,
        "legalMoves": board.get_legal_moves(),
        "polymorphismResults": results,
    }


def handle_bot_move(board_str: str, difficulty: str, mark_str: str = "O") -> Dict[str, Any]:
    """Computes a single bot move and returns decision explanation."""
    board = Board.from_string(board_str)
    mark = Cell.O if mark_str.upper() == "O" else Cell.X
    bot = BotFactory.create_bot(difficulty=difficulty, mark=mark)

    start_time = time.perf_counter()
    move = bot.get_move(board)
    elapsed_ms = round((time.perf_counter() - start_time) * 1000, 3)
    explanation = bot.explain_decision(board, move)

    return {
        "move": move,
        "difficulty": difficulty,
        "className": bot.__class__.__name__,
        "executionTimeMs": elapsed_ms,
        "explanation": explanation,
        "board": board_str,
    }


def handle_encapsulation_test(action: str, board_str: str, position: int, mark_str: str = "X") -> Dict[str, Any]:
    """
    Demonstrates Encapsulation:
    Executes various valid or invalid operations and documents domain exceptions.
    """
    board = Board.from_string(board_str)
    mark = Cell.X if mark_str.upper() == "X" else Cell.O

    try:
        if action == "valid_move":
            board.place_mark(position, mark)
            return {
                "success": True,
                "action": action,
                "position": position,
                "methodCalled": "Board.place_mark(position, mark)",
                "stateProtected": True,
                "resultingBoard": board.to_string(),
                "message": f"Successfully placed '{mark.value}' at cell {position}. Invariants satisfied.",
            }
        elif action == "occupied_cell":
            # Attempt to place mark in occupied cell
            board.place_mark(position, mark)
            return {
                "success": True,
                "action": action,
                "position": position,
                "message": "Cell was empty; place succeeded.",
                "resultingBoard": board.to_string(),
            }
        elif action == "out_of_bounds":
            board.place_mark(position, mark)
            return {"success": True, "action": action}
        elif action == "post_game_move":
            # Create a completed game and attempt a move
            p1 = HumanPlayer("Alice", Cell.X)
            p2 = HumanPlayer("Bob", Cell.O)
            game = Game(p1, p2)
            # simulate 3 moves for X win: 0, 1, 3, 4, 6
            game.make_move(p1, 0)
            game.make_move(p2, 1)
            game.make_move(p1, 3)
            game.make_move(p2, 4)
            game.make_move(p1, 6)  # X wins on column 0 (0, 3, 6)
            # Now attempt 6th move on completed game
            game.make_move(p2, 8)
            return {"success": True}
        else:
            return {"error": f"Unknown action '{action}'"}

    except DomainException as e:
        return {
            "success": False,
            "action": action,
            "position": position,
            "exceptionClass": e.__class__.__name__,
            "errorCode": e.code,
            "errorMessage": str(e),
            "methodEnforcingInvariant": "Board.place_mark()" if "OCCUPIED" in e.code or "OUT_OF_BOUNDS" in e.code else "Game.make_move()",
            "stateProtected": True,
            "explanation": (
                f"Encapsulation prevented state corruption! The private grid is inaccessible directly; "
                f"the public domain method validated state and raised a {e.__class__.__name__}."
            ),
        }
    except Exception as e:
        return {
            "success": False,
            "exceptionClass": e.__class__.__name__,
            "errorMessage": str(e),
        }


def handle_class_registry() -> Dict[str, Any]:
    """Inspects the actual Python classes and returns an OOP architecture catalog."""
    classes = [
        Board,
        Player,
        HumanPlayer,
        BotPlayer,
        RandomBot,
        StrategicBot,
        UnbeatableBot,
        Game,
        BotFactory,
    ]

    registry = []
    for cls in classes:
        methods = [
            m for m in dir(cls)
            if not m.startswith("__") and callable(getattr(cls, m))
        ]
        doc = inspect.getdoc(cls) or ""
        registry.append({
            "name": cls.__name__,
            "module": cls.__module__,
            "baseClasses": [b.__name__ for b in cls.__bases__ if b is not object],
            "methods": methods,
            "docstring": doc.split("\n")[0] if doc else "",
            "isAbstract": inspect.isabstract(cls),
        })

    return {"classes": registry}


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No command specified"}))
        sys.exit(1)

    cmd = sys.argv[1]

    try:
        if cmd == "polymorphism-compare":
            board_str = sys.argv[2] if len(sys.argv) > 2 else "X.O......"
            mark_str = sys.argv[3] if len(sys.argv) > 3 else "O"
            output = handle_polymorphism_compare(board_str, mark_str)
        elif cmd == "bot-move":
            board_str = sys.argv[2]
            difficulty = sys.argv[3] if len(sys.argv) > 3 else "unbroken"
            mark_str = sys.argv[4] if len(sys.argv) > 4 else "O"
            output = handle_bot_move(board_str, difficulty, mark_str)
        elif cmd == "test-encapsulation":
            action = sys.argv[2]
            board_str = sys.argv[3] if len(sys.argv) > 3 else "X.O......"
            position = int(sys.argv[4]) if len(sys.argv) > 4 else 0
            mark_str = sys.argv[5] if len(sys.argv) > 5 else "X"
            output = handle_encapsulation_test(action, board_str, position, mark_str)
        elif cmd == "class-registry":
            output = handle_class_registry()
        else:
            output = {"error": f"Unknown CLI command '{cmd}'"}

        print(json.dumps(output))
    except Exception as e:
        print(json.dumps({"error": str(e), "type": e.__class__.__name__}))
        sys.exit(1)


if __name__ == "__main__":
    main()
