/**
 * @file UnbeatableBot.cpp
 * @brief Implementation of UnbeatableBot using Minimax algorithm.
 */

#include "UnbeatableBot.hpp"
#include <algorithm>
#include <climits>

int UnbeatableBot::minimax(Board& board, int depth, bool isMaximizing, char botMark, char oppMark) {
    char winner = board.checkWinner();

    // Terminal state evaluations:
    // Prefer faster wins (subtract depth) and delayed losses (add depth)
    if (winner == botMark) {
        return 10 - depth;
    }
    if (winner == oppMark) {
        return -10 + depth;
    }
    if (winner == 'D') {
        return 0; // Draw
    }

    auto available = board.getAvailableMoves();

    if (isMaximizing) {
        int bestScore = -1000;
        for (int move : available) {
            Board sim = board;
            sim.makeMove(move, botMark);
            int score = minimax(sim, depth + 1, false, botMark, oppMark);
            bestScore = std::max(bestScore, score);
        }
        return bestScore;
    } else {
        int bestScore = 1000;
        for (int move : available) {
            Board sim = board;
            sim.makeMove(move, oppMark);
            int score = minimax(sim, depth + 1, true, botMark, oppMark);
            bestScore = std::min(bestScore, score);
        }
        return bestScore;
    }
}

int UnbeatableBot::selectMove(const Board& board, char botMark) {
    auto available = board.getAvailableMoves();
    if (available.empty()) {
        return -1;
    }

    // Optimization: if board is empty and bot goes first, pick center or corner instantly
    if (available.size() == 9) {
        return 4; // Center
    }

    char oppMark = (botMark == 'X') ? 'O' : 'X';

    int bestScore = -1000;
    int bestMove = available[0];

    for (int move : available) {
        Board sim = board;
        sim.makeMove(move, botMark);
        int score = minimax(sim, 0, false, botMark, oppMark);
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }

    return bestMove;
}
