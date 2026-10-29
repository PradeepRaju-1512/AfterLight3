#include "Bots.hpp"
#include <random>
#include <chrono>
#include <algorithm>
#include <sstream>
#include <stdexcept>

namespace

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
