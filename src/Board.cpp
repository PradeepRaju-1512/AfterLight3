/**
 * @file Board.cpp
 * @brief Implementation of the Board class.
 */

#include "Board.hpp"
#include <stdexcept>

Board::Board() {
    reset();
}

void Board::reset() {
    cells_.fill(' ');
}

bool Board::isValidMove(int index) const {
    if (index < 0 || index >= 9) {
        return false;
    }
    return cells_[index] == ' ';
}

bool Board::makeMove(int index, char mark) {
    if (mark != 'X' && mark != 'O') {
        return false;
    }
    if (!isValidMove(index)) {
        return false;
    }
    cells_[index] = mark;
    return true;
}

char Board::getCell(int index) const {
    if (index < 0 || index >= 9) {
        throw std::out_of_range("Board cell index must be between 0 and 8");
    }
    return cells_[index];
}

bool Board::isFull() const {
    for (char c : cells_) {
        if (c == ' ') {
            return false;
        }
    }
    return true;
}

bool Board::isEmpty() const {
    for (char c : cells_) {
        if (c != ' ') {
            return false;
        }
    }
    return true;
}

std::vector<int> Board::getAvailableMoves() const {
    std::vector<int> moves;
    moves.reserve(9);
    for (int i = 0; i < 9; ++i) {
        if (cells_[i] == ' ') {
            moves.push_back(i);
        }
    }
    return moves;
}

char Board::checkWinner() const {
    // Check all 8 winning combinations
    for (const auto& combo : WINNING_COMBOS) {
        char first = cells_[combo[0]];
        if (first != ' ' && first == cells_[combo[1]] && first == cells_[combo[2]]) {
            return first; // 'X' or 'O'
        }
    }

    // If no one won and the board is full, it's a draw
    if (isFull()) {
        return 'D';
    }

    // Game is still ongoing
    return ' ';
}

std::vector<int> Board::getWinningLine() const {
    for (const auto& combo : WINNING_COMBOS) {
        char first = cells_[combo[0]];
        if (first != ' ' && first == cells_[combo[1]] && first == cells_[combo[2]]) {
            return {combo[0], combo[1], combo[2]};
        }
    }
    return {};
}

std::string Board::toString() const {
    return std::string(cells_.begin(), cells_.end());
}
