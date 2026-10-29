#ifndef AFTERLIGHT_PLAYER_HPP

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
