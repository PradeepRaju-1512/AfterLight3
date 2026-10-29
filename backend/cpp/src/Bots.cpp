#include "Bots.hpp"
#include <random>
#include <chrono>
#include <algorithm>
#include <sstream>
#include <stdexcept>

namespace afterlight {

// Helper for timing
static double getCurrentTimeMs() {
    auto now = std::chrono::high_resolution_clock::now();
    return std::chrono::duration<double, std::milli>(now.time_since_epoch()).count();
}

// ==========================================
// RandomBot Implementation
// ==========================================

RandomBot::RandomBot(std::string name, Cell mark)
    : BotPlayer(std::move(name), mark, "wanderer") {}

int RandomBot::getMove(const Board& board) {
    if (m_mark == Cell::EMPTY) throw std::invalid_argument("Bot mark must be X or O.");
    if (board.checkWinner().first != Cell::EMPTY) throw std::runtime_error("Game is already won; no move to make.");
    auto legal = board.getLegalMoves();
    if (legal.empty()) {
        throw std::runtime_error("No legal moves available on board.");
    }
    static std::mt19937 rng(std::random_device{}());
    std::uniform_int_distribution<size_t> dist(0, legal.size() - 1);
    int chosen = legal[dist(rng)];
    m_lastExplanation = explainDecision(board, chosen);
    return chosen;
}

BotDecisionExplanation RandomBot::explainDecision(const Board& board, int move) {
    auto legal = board.getLegalMoves();
    std::ostringstream ss;
    ss << "Selected cell " << move << " uniformly at random from " << legal.size() << " available empty cells.";
    return {
        "Uniform Random Selection (C++)",
        "Stochastic legal choice with O(1) heuristic cost",
        move,
        ss.str(),
        1,
        0,
        0.05
    };
}

// ==========================================
// StrategicBot Implementation
// ==========================================

const std::array<int, 4> StrategicBot::CORNERS = {0, 2, 6, 8};
const std::array<int, 4> StrategicBot::EDGES = {1, 3, 5, 7};

StrategicBot::StrategicBot(std::string name, Cell mark)
    : BotPlayer(std::move(name), mark, "sentinel") {}

int StrategicBot::getMove(const Board& board) {
    if (m_mark == Cell::EMPTY) throw std::invalid_argument("Bot mark must be X or O.");
    if (board.checkWinner().first != Cell::EMPTY) throw std::runtime_error("Game is already won; no move to make.");
    double t0 = getCurrentTimeMs();
    auto result = evaluateStrategicMove(board);
    int chosen = result.first;
    double elapsed = getCurrentTimeMs() - t0;

    m_lastExplanation = {
        "Prioritized Rule-Based Heuristic (C++)",
        "Deterministic win-block-fork hierarchy",
        chosen,
        result.second,
        static_cast<long>(board.getLegalMoves().size()),
        0,
        elapsed
    };
    return chosen;
}

std::pair<int, std::string> StrategicBot::evaluateStrategicMove(const Board& board) const {
    auto legal = board.getLegalMoves();
    if (legal.empty()) {
        throw std::runtime_error("No legal moves available on board.");
    }

    Cell opp = opponent(m_mark);

    // Rule 1: Immediate Winning Move
    for (int pos : legal) {
        Board sim = board.clone();
        sim.placeMark(pos, m_mark);
        if (sim.checkWinner().first == m_mark) {
            std::ostringstream ss;
            ss << "Rule 1: Immediate win opportunity detected at cell " << pos << ".";
            return {pos, ss.str()};
        }
    }

    // Rule 2: Immediate Defense Block
    for (int pos : legal) {
        Board sim = board.clone();
        sim.placeMark(pos, opp);
        if (sim.checkWinner().first == opp) {
            std::ostringstream ss;
            ss << "Rule 2: Defended threat by blocking opponent win at cell " << pos << ".";
            return {pos, ss.str()};
        }
    }

    // Rule 3: Take Center
    if (board.getCell(CENTER) == Cell::EMPTY) {
        return {CENTER, "Rule 3: Occupied the high-value center cell (4)."};
    }

    // Rule 4: Take Opposite Corner to Opponent
    const std::pair<int, int> oppositeCorners[] = {{0, 8}, {8, 0}, {2, 6}, {6, 2}};
    for (const auto& pair : oppositeCorners) {
        if (board.getCell(pair.first) == opp && board.getCell(pair.second) == Cell::EMPTY) {
            std::ostringstream ss;
            ss << "Rule 4: Countered corner strategy by claiming opposite corner " << pair.second << ".";
            return {pair.second, ss.str()};
        }
    }

    // Rule 5: Take Any Empty Corner
    for (int corner : CORNERS) {
        if (board.getCell(corner) == Cell::EMPTY) {
            std::ostringstream ss;
            ss << "Rule 5: Claimed strategic corner cell " << corner << ".";
            return {corner, ss.str()};
        }
    }

    // Rule 6: Fallback to Edges
    for (int edge : EDGES) {
        if (board.getCell(edge) == Cell::EMPTY) {
            std::ostringstream ss;
            ss << "Rule 6: Fallback move to peripheral edge cell " << edge << ".";
            return {edge, ss.str()};
        }
    }

    return {legal[0], "Fallback move."};
}

BotDecisionExplanation StrategicBot::explainDecision(const Board& /*board*/, int /*move*/) {
    return m_lastExplanation;
}

// ==========================================
// UnbeatableBot Implementation (Minimax + Alpha-Beta)
// ==========================================

UnbeatableBot::UnbeatableBot(std::string name, Cell mark)
    : BotPlayer(std::move(name), mark, "unbroken") {}

UnbeatableBot::MinimaxResult UnbeatableBot::minimax(Board& board, int depth, bool isMaximizing, int alpha, int beta) {
    auto win = board.checkWinner();
    if (win.first == m_mark) {
        return {10 - depth, 1, 0}; // Prefer faster wins
    }
    if (win.first == opponent(m_mark)) {
        return {-10 + depth, 1, 0}; // Delay inevitable losses
    }
    if (board.isFull()) {
        return {0, 1, 0}; // Draw
    }

    long totalNodes = 1;
    long totalCutoffs = 0;

    auto legal = board.getLegalMoves();

    if (isMaximizing) {
        int maxEval = -1000;
        for (int move : legal) {
            board.placeMark(move, m_mark);
            auto res = minimax(board, depth + 1, false, alpha, beta);
            board.clearMark(move); // Backtrack

            totalNodes += res.nodes;
            totalCutoffs += res.cutoffs;

            maxEval = std::max(maxEval, res.score);
            alpha = std::max(alpha, res.score);

            if (beta <= alpha) {
                totalCutoffs++;
                break; // Beta cutoff (Pruning)
            }
        }
        return {maxEval, totalNodes, totalCutoffs};
    } else {
        int minEval = 1000;
        Cell opp = opponent(m_mark);
        for (int move : legal) {
            board.placeMark(move, opp);
            auto res = minimax(board, depth + 1, true, alpha, beta);
            board.clearMark(move); // Backtrack

            totalNodes += res.nodes;
            totalCutoffs += res.cutoffs;

            minEval = std::min(minEval, res.score);
            beta = std::min(beta, res.score);

            if (beta <= alpha) {
                totalCutoffs++;
                break; // Alpha cutoff (Pruning)
            }
        }
        return {minEval, totalNodes, totalCutoffs};
    }
}

int UnbeatableBot::getMove(const Board& board) {
    if (m_mark == Cell::EMPTY) throw std::invalid_argument("Bot mark must be X or O.");
    if (board.checkWinner().first != Cell::EMPTY) throw std::runtime_error("Game is already won; no move to make.");
    double t0 = getCurrentTimeMs();
    auto legal = board.getLegalMoves();
    if (legal.empty()) {
        throw std::runtime_error("No legal moves available on board.");
    }

    int bestMove = legal[0];
    int bestScore = -1000;
    long totalNodes = 0;
    long totalCutoffs = 0;

    Board sim = board.clone();

    for (int move : legal) {
        sim.placeMark(move, m_mark);
        auto res = minimax(sim, 1, false, -1000, 1000);
        sim.clearMark(move); // Backtrack

        totalNodes += res.nodes;
        totalCutoffs += res.cutoffs;

        if (res.score > bestScore) {
            bestScore = res.score;
            bestMove = move;
        }
    }

    double elapsed = getCurrentTimeMs() - t0;

    std::ostringstream ss;
    ss << "Minimax evaluated " << totalNodes << " game states with "
       << totalCutoffs << " alpha-beta branch cutoffs in " << elapsed << "ms. "
       << "Guaranteed minimax value: " << bestScore << ".";

    m_lastExplanation = {
        "Minimax with Alpha-Beta Pruning (C++)",
        "Exhaustive game-tree evaluation with O(b^(d/2)) pruned complexity",
        bestMove,
        ss.str(),
        totalNodes,
        totalCutoffs,
        elapsed
    };

    return bestMove;
}

BotDecisionExplanation UnbeatableBot::explainDecision(const Board& /*board*/, int /*move*/) {
    return m_lastExplanation;
}

// ==========================================
// BotFactory Implementation
// ==========================================

std::unique_ptr<BotPlayer> BotFactory::createBot(
    const std::string& difficulty,
    Cell mark,
    const std::string& name
) {
    if (difficulty == "wanderer") {
        return std::make_unique<RandomBot>(name.empty() ? "Wanderer" : name, mark);
    } else if (difficulty == "sentinel") {
        return std::make_unique<StrategicBot>(name.empty() ? "Sentinel" : name, mark);
    } else if (difficulty == "unbroken") {
        return std::make_unique<UnbeatableBot>(name.empty() ? "The Unbroken" : name, mark);
    }
    throw std::invalid_argument("Unknown bot difficulty: " + difficulty);
}

} // namespace afterlight
