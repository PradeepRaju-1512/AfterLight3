#include "Game.hpp"
#include <stdexcept>

namespace afterlight {

Game::Game(std::shared_ptr<Player> playerX, std::shared_ptr<Player> playerO)
    : m_playerX(std::move(playerX)),
      m_playerO(std::move(playerO)),
      m_currentTurn(Cell::X),
      m_status(GameStatus::ACTIVE),
      m_moveCount(0) {}

Player& Game::getCurrentPlayer() {
    return (m_currentTurn == Cell::X) ? *m_playerX : *m_playerO;
}

int Game::makeMove(Player& player, int position) {
    if (m_status != GameStatus::ACTIVE) {
        throw GameOverException(m_status);
    }
    if (player.getMark() != m_currentTurn) {
        throw NotYourTurnException(m_currentTurn, player.getMark());
    }

    int chosenMove = -1;
    if (auto human = dynamic_cast<HumanPlayer*>(&player)) {
        if (position >= 0) {
            human->setNextMove(position);
        }
        chosenMove = human->getMove(m_board);
    } else {
        // Polymorphic dynamic dispatch
        chosenMove = player.getMove(m_board);
    }

    // Mutate board with invariants check
    m_board.placeMark(chosenMove, player.getMark());
    m_moveCount++;

    // Check outcome
    auto win = m_board.checkWinner();
    if (win.first == Cell::X) {
        m_status = GameStatus::WON_X;
        m_winnerName = m_playerX->getName();
        m_winningLine = win.second;
    } else if (win.first == Cell::O) {
        m_status = GameStatus::WON_O;
        m_winnerName = m_playerO->getName();
        m_winningLine = win.second;
    } else if (m_board.isFull()) {
        m_status = GameStatus::DRAW;
        m_winnerName = "";
        m_winningLine = {};
    } else {
        m_currentTurn = opponent(m_currentTurn);
    }

    return chosenMove;
}

} // namespace afterlight
