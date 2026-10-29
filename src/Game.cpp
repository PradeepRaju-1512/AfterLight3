/**
 * @file Game.cpp
 * @brief Implementation of the Game class.
 */

#include "Game.hpp"

Game::Game() {
    reset();
}

void Game::reset() {
    board_.reset();
    currentTurn_ = 'X'; // X always moves first in standard Tic-Tac-Toe
    status_ = GameStatus::ONGOING;
    moveCount_ = 0;
}

bool Game::playMove(int index, char playerMark) {
    // Cannot play if game is already over
    if (status_ != GameStatus::ONGOING) {
        return false;
    }

    // Must be the mark of the player whose turn it currently is
    if (playerMark != currentTurn_) {
        return false;
    }

    // Delegate the move to the encapsulated Board object
    if (!board_.makeMove(index, playerMark)) {
        return false; // Cell occupied or index out of range
    }

    moveCount_++;

    // Check game condition on the board
    char winner = board_.checkWinner();
    if (winner == 'X') {
        status_ = GameStatus::X_WON;
    } else if (winner == 'O') {
        status_ = GameStatus::O_WON;
    } else if (winner == 'D') {
        status_ = GameStatus::DRAW;
    } else {
        // Toggle turn
        currentTurn_ = (currentTurn_ == 'X') ? 'O' : 'X';
    }

    return true;
}

std::string Game::getStatusString() const {
    switch (status_) {
        case GameStatus::ONGOING: return "ONGOING";
        case GameStatus::X_WON:   return "X_WON";
        case GameStatus::O_WON:   return "O_WON";
        case GameStatus::DRAW:    return "DRAW";
    }
    return "UNKNOWN";
}
