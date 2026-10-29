/**
 * @file MediumBot.hpp
 * @brief Medium Bot strategy with 2-ply win/block heuristic.
 *
 * OOP Concept: Inheritance and Runtime Polymorphism.
 */

#pragma once

#include "BotStrategy.hpp"
#include <random>

class MediumBot : public BotStrategy {
private:
    mutable std::mt19937 rng_;

public:
    MediumBot();
    int selectMove(const Board& board, char botMark) override;
    std::string getDifficulty() const override { return "medium"; }
};
