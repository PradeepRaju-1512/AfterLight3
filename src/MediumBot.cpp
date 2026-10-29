/**
 * @file MediumBot.cpp
 * @brief Implementation of MediumBot.
 *
 * Algorithm:
 * 1. Immediate Win: If bot can win in one move, take that move.
 * 2. Immediate Block: If opponent can win in one move, block them.
 * 3. Tactical Center: Take center cell (4) if available.
 * 4. Tactical Corners: Prefer corners {0, 2, 6, 8} over edges.
 * 5. Fallback: Any remaining open cell.
 */

#include "MediumBot.hpp"
#include <chrono>
#include <algorithm>

MediumBot::MediumBot()
    : rng_(static_cast<unsigned int>(std::chrono::system_clock::now().time_since_epoch().count())) {
}

int MediumBot::selectMove(const Board& board, char botMark) {
    auto available = board.getAvailableMoves();
    if (available.empty()) {
        return -1;
    }

    char oppMark = (botMark == 'X') ? 'O' : 'X';

    // 1. Check if bot has an immediate winning move
    for (int move : available) {
        Board sim = board;
        sim.makeMove(move, botMark);
        if (sim.checkWinner() == botMark) {
            return move;
        }
    }

    // 2. Check if opponent has an immediate winning move and block it
    for (int move : available) {
        Board sim = board;
        sim.makeMove(move, oppMark);
        if (sim.checkWinner() == oppMark) {
            return move;
        }
    }

    // 3. Take the center (cell 4) if available
    if (board.isValidMove(4)) {
        return 4;
    }

    // 4. Try corners {0, 2, 6, 8}
    std::vector<int> corners = {0, 2, 6, 8};
    std::vector<int> openCorners;
    for (int c : corners) {
        if (board.isValidMove(c)) {
            openCorners.push_back(c);
        }
    }
    if (!openCorners.empty()) {
        std::uniform_int_distribution<size_t> dist(0, openCorners.size() - 1);
        return openCorners[dist(rng_)];
    }

    // 5. Fallback: pick any available move
    std::uniform_int_distribution<size_t> dist(0, available.size() - 1);
    return available[dist(rng_)];
}
