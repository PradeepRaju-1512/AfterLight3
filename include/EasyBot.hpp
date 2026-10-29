/**
 * @file EasyBot.hpp
 * @brief Easy Bot strategy choosing random legal moves.
 *
 * OOP Concept: Inheritance and Runtime Polymorphism.
 * Inherits from abstract BotStrategy and overrides selectMove.
 */

#pragma once

#include "BotStrategy.hpp"
#include <random>

class EasyBot : public BotStrategy {
private:
    mutable std::mt19937 rng_;

public:
    EasyBot();
    int selectMove(const Board& board, char botMark) override;
    std::string getDifficulty() const override { return "easy"; }
};
