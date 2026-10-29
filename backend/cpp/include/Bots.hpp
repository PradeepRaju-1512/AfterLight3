#ifndef AFTERLIGHT_BOTS_HPP
#define AFTERLIGHT_BOTS_HPP

#include <array>
#include <string>
#include <vector>
#include <utility>
#include <memory>
#include "Player.hpp"

namespace afterlight {

struct BotDecisionExplanation {
    std::string algorithm;
    std::string principle;
    int chosenMove;
    std::string rationale;
    long nodesEvaluated;
    long cutoffs;
    double executionTimeMs;
};

// ==========================================
// Abstract Bot Base Class
// ==========================================

class BotPlayer : public Player {
protected:
    std::string m_difficulty;
    BotDecisionExplanation m_lastExplanation;

public:
    BotPlayer(std::string name, Cell mark, std::string difficulty)
        : Player(std::move(name), mark), m_difficulty(std::move(difficulty)) {}

    virtual ~BotPlayer() = default;

    const std::string& getDifficulty() const { return m_difficulty; }
    const BotDecisionExplanation& getLastExplanation() const { return m_lastExplanation; }

    virtual BotDecisionExplanation explainDecision(const Board& board, int move) = 0;
};

// ==========================================
// Tier 1 Bot: Wanderer (Random Selection)
// ==========================================

class RandomBot : public BotPlayer {
public:
    explicit RandomBot(std::string name = "Wanderer", Cell mark = Cell::O);
    int getMove(const Board& board) override;
    BotDecisionExplanation explainDecision(const Board& board, int move) override;
};

// ==========================================
// Tier 2 Bot: Sentinel (Heuristic Rules)
// ==========================================

class StrategicBot : public BotPlayer {
public:
    static const std::array<int, 4> CORNERS;
    static const std::array<int, 4> EDGES;
    static const int CENTER = 4;

    explicit StrategicBot(std::string name = "Sentinel", Cell mark = Cell::O);
    int getMove(const Board& board) override;
    BotDecisionExplanation explainDecision(const Board& board, int move) override;

private:
    std::pair<int, std::string> evaluateStrategicMove(const Board& board) const;
};

// ==========================================
// Tier 3 Bot: The Unbroken (Minimax + Alpha-Beta)
// ==========================================

class UnbeatableBot : public BotPlayer {
public:
    explicit UnbeatableBot(std::string name = "The Unbroken", Cell mark = Cell::O);
    int getMove(const Board& board) override;
    BotDecisionExplanation explainDecision(const Board& board, int move) override;

private:
    struct MinimaxResult {
        int score;
        long nodes;
        long cutoffs;
    };

    MinimaxResult minimax(Board& board, int depth, bool isMaximizing, int alpha, int beta);
};

// ==========================================
// Factory Method Pattern for Bot Instantiation
// ==========================================

class BotFactory {
public:
    static std::unique_ptr<BotPlayer> createBot(
        const std::string& difficulty,
        Cell mark = Cell::O,
        const std::string& name = ""
    );
};

} // namespace afterlight

#endif // AFTERLIGHT_BOTS_HPP
