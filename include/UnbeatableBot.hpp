/**
 * @file UnbeatableBot.hpp
 * @brief Unbeatable Bot strategy using Minimax algorithm.
 *
 * OOP Concept: Inheritance and Runtime Polymorphism.
 * Evaluates the game tree exhaustively using Minimax. Guaranteed to never lose.
 */

#pragma once

#include "BotStrategy.hpp"

class UnbeatableBot : public BotStrategy {
private:
    int minimax(Board& board, int depth, bool isMaximizing, char botMark, char oppMark);

public:
    int selectMove(const Board& board, char botMark) override;
    std::string getDifficulty() const override { return "unbeatable"; }
};
