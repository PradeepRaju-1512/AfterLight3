#ifndef AFTERLIGHT_PLAYER_HPP
#define AFTERLIGHT_PLAYER_HPP

#include <string>
#include <memory>
#include <stdexcept>
#include <utility>
#include "Models.hpp"
#include "Board.hpp"

namespace afterlight {

// ==========================================
// Abstraction: Pure Abstract Base Class (ABC)
// ==========================================

class Player {
protected:
    std::string m_name;
    Cell m_mark;

public:
    Player(std::string name, Cell mark)
        : m_name(std::move(name)), m_mark(mark) {}

    virtual ~Player() = default;

    // Pure virtual method: Enforces polymorphic contract across all participants
    virtual int getMove(const Board& board) = 0;

    // Getters
    const std::string& getName() const { return m_name; }
    Cell getMark() const { return m_mark; }
};

// ==========================================
// Concrete Player: Human Participant
// ==========================================

class HumanPlayer : public Player {
private:
    std::string m_userId;
    int m_queuedMove;
    bool m_hasQueuedMove;

public:
    HumanPlayer(std::string name, Cell mark, std::string userId = "")
        : Player(std::move(name), mark),
          m_userId(std::move(userId)),
          m_queuedMove(-1),
          m_hasQueuedMove(false) {}

    void setNextMove(int pos) {
        m_queuedMove = pos;
        m_hasQueuedMove = true;
    }

    int getMove(const Board& /*board*/) override {
        if (!m_hasQueuedMove) {
            throw std::runtime_error("No move queued for human player.");
        }
        m_hasQueuedMove = false;
        return m_queuedMove;
    }

    const std::string& getUserId() const { return m_userId; }
};

} // namespace afterlight

#endif // AFTERLIGHT_PLAYER_HPP
