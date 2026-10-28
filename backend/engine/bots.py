"""
AFTERLIGHT - Concrete Bot Implementations & AI Algorithms
Demonstrates:
- Polymorphism: RandomBot, StrategicBot, and UnbeatableBot all implement `get_move(board)`.
- Open/Closed Principle (OCP): New bot behaviors can be introduced without changing Game or Board.
- Liskov Substitution Principle (LSP): Any BotPlayer can seamlessly substitute for Player.
"""

import random
from typing import Dict, Any, List, Optional, Tuple
from .models import Cell, BotDifficulty
from .board import Board
from .player import BotPlayer


class RandomBot(BotPlayer):
    """
    Tier 1: Wanderer
    Selects a uniform random legal move.
    Unpredictable, relaxed difficulty for beginners.
    """

    def __init__(self, name: str = "Wanderer", mark: Cell = Cell.O):
        super().__init__(name=name, mark=mark, difficulty=BotDifficulty.WANDERER.value)

    def get_move(self, board: Board) -> int:
        legal_moves = board.get_legal_moves()
        if not legal_moves:
            raise ValueError("No legal moves available on board.")
        return random.choice(legal_moves)

    def explain_decision(self, board: Board, move: int) -> Dict[str, Any]:
        legal_moves = board.get_legal_moves()
        return {
            "algorithm": "Uniform Random Selection",
            "principle": "Stochastic legal choice with O(1) heuristic cost",
            "candidateMoves": legal_moves,
            "chosenMove": move,
            "rationale": f"Selected cell {move} at random from {len(legal_moves)} legal cells.",
            "complexity": "O(N) search for empty cells, O(1) pick",
        }


class StrategicBot(BotPlayer):
    """
    Tier 2: Sentinel
    Applies classic strategic heuristics:
    1. Winning move: If Sentinel can win in 1 move, take it immediately.
    2. Blocking move: If opponent can win in 1 move, block it immediately.
    3. Fork prevention / center control: Take position 4 (center) if available.
    4. Corner control: Take opposite corner to opponent, or any empty corner (0, 2, 6, 8).
    5. Edge move: Fall back to empty sides (1, 3, 5, 7).
    """

    CORNERS = (0, 2, 6, 8)
    EDGES = (1, 3, 5, 7)
    CENTER = 4

    def __init__(self, name: str = "Sentinel", mark: Cell = Cell.O):
        super().__init__(name=name, mark=mark, difficulty=BotDifficulty.SENTINEL.value)

    def get_move(self, board: Board) -> int:
        move, _ = self._evaluate_strategic_move(board)
        return move

    def _evaluate_strategic_move(self, board: Board) -> Tuple[int, str]:
        legal = board.get_legal_moves()
        if not legal:
            raise ValueError("No legal moves available on board.")

        opponent_mark = self.mark.opponent()

        # 1. Check for immediate winning move
        for move in legal:
            sim = board.clone()
            sim.place_mark(move, self.mark)
            winner, _ = sim.check_winner()
            if winner == self.mark:
                return move, f"Immediate victory detected at cell {move}."

        # 2. Check for immediate blocking move
        for move in legal:
            sim = board.clone()
            sim.place_mark(move, opponent_mark)
            winner, _ = sim.check_winner()
            if winner == opponent_mark:
                return move, f"Critical defensive block against opponent win at cell {move}."

        # 3. Take the center (vital strategic anchor)
        if self.CENTER in legal:
            return self.CENTER, "Occupied high-leverage center cell (4) to maximize diagonal and orthogonal lines."

        # 4. Take opposite corner to opponent if held
        opposite_corners = {0: 8, 8: 0, 2: 6, 6: 2}
        for corner, opp in opposite_corners.items():
            if board.get_cell(corner) == opponent_mark and opp in legal:
                return opp, f"Took opposite corner {opp} to counter opponent corner {corner}."

        # 5. Take any empty corner
        empty_corners = [c for c in self.CORNERS if c in legal]
        if empty_corners:
            c = empty_corners[0]
            return c, f"Occupied open corner cell {c} to create corner fork potential."

        # 6. Take any empty side
        empty_edges = [e for e in self.EDGES if e in legal]
        if empty_edges:
            e = empty_edges[0]
            return e, f"Took available edge cell {e}."

        return legal[0], f"Took remaining legal cell {legal[0]}."

    def explain_decision(self, board: Board, move: int) -> Dict[str, Any]:
        _, rationale = self._evaluate_strategic_move(board)
        return {
            "algorithm": "Heuristic Rule-Based Decision Engine",
            "principle": "Prioritized rule hierarchy: Win -> Block -> Center -> Corner -> Edge",
            "candidateMoves": board.get_legal_moves(),
            "chosenMove": move,
            "rationale": rationale,
            "complexity": "O(K) where K <= 9 branches with shallow simulation",
        }


class UnbeatableBot(BotPlayer):
    """
    Tier 3: The Unbroken
    Unbeatable Tic-Tac-Toe AI implemented with Minimax and Alpha-Beta Pruning.
    Tic-Tac-Toe is mathematically solved: when playing optimally, The Unbroken
    guarantees either a win or a draw against every possible sequence of legal moves.
    It can NEVER lose.

    Evaluation Function:
    - Terminal Win for self: +10 - depth  (prefers faster wins)
    - Terminal Loss for self: -10 + depth (delays inevitable losses)
    - Terminal Draw: 0
    """

    def __init__(self, name: str = "The Unbroken", mark: Cell = Cell.O):
        super().__init__(name=name, mark=mark, difficulty=BotDifficulty.UNBROKEN.value)
        self._last_stats: Dict[str, Any] = {}

    def get_move(self, board: Board) -> int:
        legal_moves = board.get_legal_moves()
        if not legal_moves:
            raise ValueError("No legal moves available on board.")

        # Optimize first move on empty board: center or corner is mathematically optimal
        if len(legal_moves) == 9:
            return 4  # Center is optimal opening

        best_score = -float("inf")
        best_move = legal_moves[0]
        alpha = -float("inf")
        beta = float("inf")
        nodes_evaluated = 0
        pruning_cutoffs = 0

        scores_by_move: Dict[int, int] = {}

        for move in legal_moves:
            sim = board.clone()
            sim.place_mark(move, self.mark)
            nodes_evaluated += 1

            score, nodes, cuts = self._minimax(
                board=sim,
                depth=0,
                is_maximizing=False,
                alpha=alpha,
                beta=beta
            )
            nodes_evaluated += nodes
            pruning_cutoffs += cuts
            scores_by_move[move] = score

            if score > best_score:
                best_score = score
                best_move = move

            alpha = max(alpha, best_score)
            if beta <= alpha:
                pruning_cutoffs += 1
                break

        self._last_stats = {
            "nodesEvaluated": nodes_evaluated,
            "pruningCutoffs": pruning_cutoffs,
            "scoresByMove": scores_by_move,
            "bestScore": best_score,
            "chosenMove": best_move,
        }

        return best_move

    def _minimax(
        self,
        board: Board,
        depth: int,
        is_maximizing: bool,
        alpha: float,
        beta: float,
    ) -> Tuple[int, int, int]:
        """
        Recursive Minimax search with Alpha-Beta pruning.
        Returns: (score, node_count, cutoffs)
        """
        nodes = 1
        cutoffs = 0

        winner, _ = board.check_winner()
        if winner == self.mark:
            # We won! Prefer shallower depth (faster win)
            return 10 - depth, nodes, cutoffs
        elif winner == self.mark.opponent():
            # Opponent won! Delay as much as possible
            return -10 + depth, nodes, cutoffs
        elif board.is_full():
            # Draw
            return 0, nodes, cutoffs

        legal_moves = board.get_legal_moves()

        if is_maximizing:
            max_eval = -float("inf")
            for move in legal_moves:
                sim = board.clone()
                sim.place_mark(move, self.mark)
                eval_score, sub_nodes, sub_cuts = self._minimax(
                    sim, depth + 1, False, alpha, beta
                )
                nodes += sub_nodes
                cutoffs += sub_cuts
                max_eval = max(max_eval, eval_score)
                alpha = max(alpha, eval_score)
                if beta <= alpha:
                    cutoffs += 1
                    break
            return int(max_eval), nodes, cutoffs
        else:
            min_eval = float("inf")
            for move in legal_moves:
                sim = board.clone()
                sim.place_mark(move, self.mark.opponent())
                eval_score, sub_nodes, sub_cuts = self._minimax(
                    sim, depth + 1, True, alpha, beta
                )
                nodes += sub_nodes
                cutoffs += sub_cuts
                min_eval = min(min_eval, eval_score)
                beta = min(beta, eval_score)
                if beta <= alpha:
                    cutoffs += 1
                    break
            return int(min_eval), nodes, cutoffs

    def explain_decision(self, board: Board, move: int) -> Dict[str, Any]:
        stats = getattr(self, "_last_stats", {})
        scores = stats.get("scoresByMove", {})
        score_val = scores.get(move, 0)
        outcome_desc = (
            "Guaranteed forced victory path" if score_val > 0
            else "Perfect defensive draw trajectory (loss mathematically impossible)" if score_val == 0
            else "Counter-delay"
        )
        return {
            "algorithm": "Minimax with Alpha-Beta Pruning",
            "principle": "Complete game tree exploration with adversarial minimax value theorem",
            "candidateMoves": board.get_legal_moves(),
            "chosenMove": move,
            "minimaxScore": score_val,
            "evaluations": scores,
            "nodesEvaluated": stats.get("nodesEvaluated", 0),
            "pruningCutoffs": stats.get("pruningCutoffs", 0),
            "rationale": f"{outcome_desc}. Evaluated minimax game tree across depth levels.",
            "complexity": "O(b^d) tree reduced by alpha-beta cutoffs",
        }
