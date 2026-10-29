/**
 * @file EasyBot.cpp
 * @brief Implementation of EasyBot.
 */

#include "EasyBot.hpp"
#include <chrono>

EasyBot::EasyBot()
    : rng_(static_cast<unsigned int>(std::chrono::system_clock::now().time_since_epoch().count())) {
}

int EasyBot::selectMove(const Board& board, char /*botMark*/) {
    auto available = board.getAvailableMoves();
    if (available.empty()) {
        return -1;
    }

    std::uniform_int_distribution<size_t> dist(0, available.size() - 1);
    return available[dist(rng_)];
}
