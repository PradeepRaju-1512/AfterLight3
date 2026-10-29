/**
 * @file Game.hpp
 * @brief Game class demonstrating Composition and Turn Management.
 *
 * OOP Concept: Composition.
 * A Game "has-a" Board. Instead of inheriting from Board, Game embeds a Board
 * object as a private member (board_). It coordinates game rules, turns, and outcomes.
 */

#pragma once

#include "Board.hpp"
#include <string>
#include <vector>

enum class GameStatus {
    ONGOING,
    X_WON,
    O_WON,
    DRAW
};

class Game {
private:
    Board board_;           // Composition: Game owns a Board
    char currentTurn_;      // 'X' or 'O'
    GameStatus status_;     // Current game state
    int moveCount_;

public:
    Game();

    // Reset the game to starting state (X's turn, empty board)
    void reset();

    // Play a move at 0-indexed cell position [0..8].
    // Validates that it's the expected player's turn, cell is empty, and game is ONGOING.
    bool playMove(int index, char playerMark);

    // Getters
    const Board& getBoard() const { return board_; }
    Board& getBoard() { return board_; }
    char getCurrentTurn() const { return currentTurn_; }
    GameStatus getStatus() const { return status_; }
    int getMoveCount() const { return moveCount_; }
    bool isGameOver() const { return status_ != GameStatus::ONGOING; }

    // Helpers
    std::string getStatusString() const;
    std::vector<int> getWinningLine() const { return board_.getWinningLine(); }
};
