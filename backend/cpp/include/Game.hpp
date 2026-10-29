#ifndef AFTERLIGHT_GAME_HPP
#define AFTERLIGHT_GAME_HPP

#include <memory>
#include <string>
#include "Models.hpp"
#include "Board.hpp"
#include "Player.hpp"

namespace afterlight {

class Game {
private:
    // Composition: Game HAS-A Board, HAS-A Player X, HAS-A Player O
    Board m_board;
    std::shared_ptr<Player> m_playerX;
    std::shared_ptr<Player> m_playerO;
    Cell m_currentTurn;
    GameStatus m_status;
    std::string m_winnerName;
    std::vector<int> m_winningLine;
    int m_moveCount;

public:
    Game(std::shared_ptr<Player> playerX, std::shared_ptr<Player> playerO);

    // Turn execution with invariant enforcement
    int makeMove(Player& player, int position = -1);

    // Query Methods
    const Board& getBoard() const { return m_board; }
    Cell getCurrentTurn() const { return m_currentTurn; }
    GameStatus getStatus() const { return m_status; }
    const std::string& getWinnerName() const { return m_winnerName; }
    const std::vector<int>& getWinningLine() const { return m_winningLine; }
    int getMoveCount() const { return m_moveCount; }

    Player& getCurrentPlayer();
};

} // namespace afterlight

#endif // AFTERLIGHT_GAME_HPP
