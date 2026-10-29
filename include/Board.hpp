/**
 * @file Board.hpp
 * @brief Board class demonstrating Encapsulation.
 *
 * OOP Concept: Encapsulation.
 * The 9 cells of the board are stored as private member data (cells_).
 * External code cannot directly modify the cells; all modifications must go through
 * validated member methods (makeMove, reset), protecting the integrity of the board state.
 */

#pragma once

#include <array>
#include <vector>
#include <string>

class Board {
private:
    // 3x3 board cells, initialized to ' ' (empty space)
    std::array<char, 9> cells_;

    // All 8 possible winning combinations (3 rows, 3 columns, 2 diagonals)
    static constexpr int WINNING_COMBOS[8][3] = {
        {0, 1, 2}, // Row 0
        {3, 4, 5}, // Row 1
        {6, 7, 8}, // Row 2
        {0, 3, 6}, // Col 0
        {1, 4, 7}, // Col 1
        {2, 5, 8}, // Col 2
        {0, 4, 8}, // Diagonal top-left to bottom-right
        {2, 4, 6}  // Diagonal top-right to bottom-left
    };

public:
    Board();

    // Move validation and execution
    bool isValidMove(int index) const;
    bool makeMove(int index, char mark);
    void reset();

    // Board state inspection
    char getCell(int index) const;
    bool isFull() const;
    bool isEmpty() const;
    std::vector<int> getAvailableMoves() const;

    // Win & Draw detection
    // Returns 'X' if X won, 'O' if O won, 'D' if draw (full and no winner), or ' ' if ongoing.
    char checkWinner() const;

    // Returns indices of the winning combo (e.g. {0, 1, 2}) or empty vector if no win
    std::vector<int> getWinningLine() const;

    // Board representation as string (e.g. "X O  X   ")
    std::string toString() const;
};
