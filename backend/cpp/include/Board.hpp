#ifndef AFTERLIGHT_BOARD_HPP
#define AFTERLIGHT_BOARD_HPP

#include <array>
#include <ostream>
#include <vector>
#include <string>
#include <utility>
#include "Models.hpp"

namespace afterlight {

class Board {
private:
    // Encapsulation: Private internal grid state
    std::array<Cell, 9> m_grid;

    void validatePosition(int position) const;

public:
    static const std::array<std::array<int, 3>, 8> WINNING_COMBINATIONS;

    // Constructors
    Board();
    explicit Board(const std::array<Cell, 9>& initialState);
    explicit Board(const std::string& boardStr);

    // Encapsulation: Safe accessors
    Cell getCell(int position) const;
    std::array<Cell, 9> getCells() const;
    std::string toString() const;

    // State Mutators with invariant enforcement
    void placeMark(int position, Cell mark);
    void clearMark(int position);

    // Query Methods
    std::vector<int> getLegalMoves() const;
    std::pair<Cell, std::vector<int>> checkWinner() const;
    bool isFull() const;
    bool isTerminal() const;

    // Defensive Copying
    Board clone() const;

    // ==========================================
    // Operator Overloading
    // ==========================================
    // Subscript operator for index-based cell access: board[i]
    Cell operator[](int position) const;
    Cell& operator[](int position);

    // Equality comparison operators: board == other, board != other
    bool operator==(const Board& other) const;
    bool operator!=(const Board& other) const;

    // Addition operator: board + Move(pos, mark) -> returns new Board with move applied
    Board operator+(const Move& move) const;

    // Compound addition operator: board += Move(pos, mark) -> mutates board with move
    Board& operator+=(const Move& move);

    // Stream insertion operator: std::cout << board
    friend std::ostream& operator<<(std::ostream& os, const Board& board);
};

} // namespace afterlight

#endif // AFTERLIGHT_BOARD_HPP
