/**
 * @file BotStrategy.hpp
 * @brief Abstract interface defining Bot decision-making.
 *
 * OOP Concept: Abstraction.
 * BotStrategy acts as an abstract base class (interface). It hides the concrete algorithm
 * details behind a clean, pure virtual member function `selectMove`.
 * Any algorithm (Easy, Medium, Unbeatable Minimax) can be substituted at runtime (Polymorphism).
 */

#pragma once

#include "Board.hpp"
#include <string>

class BotStrategy {
public:
    // Virtual destructor is critical for proper RAII cleanup through base pointers
    virtual ~BotStrategy() = default;

    /**
     * @brief Selects the optimal or desired cell index [0..8] for the bot's turn.
     * @param board The current state of the board.
     * @param botMark The mark used by the bot ('X' or 'O').
     * @return The 0-indexed cell position [0..8] to play.
     */
    virtual int selectMove(const Board& board, char botMark) = 0;

    /**
     * @brief Returns the difficulty tier identifier string.
     */
    virtual std::string getDifficulty() const = 0;
};
