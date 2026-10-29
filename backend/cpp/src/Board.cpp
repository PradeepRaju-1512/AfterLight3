#include "Board.hpp"
#include <stdexcept>

namespace afterlight {

const std::array<std::array<int, 3>, 8> Board::WINNING_COMBINATIONS = {{
    {0, 1, 2}, // Row 0
    {3, 4, 5}, // Row 1
    {6, 7, 8}, // Row 2
    {0, 3, 6}, // Col 0
    {1, 4, 7}, // Col 1
    {2, 5, 8}, // Col 2
    {0, 4, 8}, // Main diagonal
    {2, 4, 6}  // Anti-diagonal
}};

Board::Board() {
    m_grid.fill(Cell::EMPTY);
}

Board::Board(const std::array<Cell, 9>& initialState) : m_grid(initialState) {}

Board::Board(const std::string& boardStr) {
    m_grid.fill(Cell::EMPTY);
    for (size_t i = 0; i < 9 && i < boardStr.size(); ++i) {
        m_grid[i] = charToCell(boardStr[i]);
    }
}

void Board::validatePosition(int position) const {
    if (position < 0 || position > 8) {
        throw PositionOutOfBoundsException(position);
    }
}

Cell Board::getCell(int position) const {
    validatePosition(position);
    return m_grid[position];
}

std::array<Cell, 9> Board::getCells() const {
    // Defensive copy
    return m_grid;
}

std::string Board::toString() const {
    std::string s;
    s.reserve(9);
    for (Cell c : m_grid) {
        s.push_back(cellToChar(c));
    }
    return s;
}

void Board::placeMark(int position, Cell mark) {
    validatePosition(position);
    if (mark == Cell::EMPTY) {
        throw std::invalid_argument("Cannot place an empty cell as a move.");
    }
    if (m_grid[position] != Cell::EMPTY) {
        throw OccupiedCellException(position, m_grid[position]);
    }
    m_grid[position] = mark;
}

void Board::clearMark(int position) {
    validatePosition(position);
    m_grid[position] = Cell::EMPTY;
}

std::vector<int> Board::getLegalMoves() const {
    std::vector<int> moves;
    moves.reserve(9);
    for (int i = 0; i < 9; ++i) {
        if (m_grid[i] == Cell::EMPTY) {
            moves.push_back(i);
        }
    }
    return moves;
}

std::pair<Cell, std::vector<int>> Board::checkWinner() const {
    for (const auto& line : WINNING_COMBINATIONS) {
        Cell c0 = m_grid[line[0]];
        if (c0 != Cell::EMPTY && c0 == m_grid[line[1]] && c0 == m_grid[line[2]]) {
            return {c0, {line[0], line[1], line[2]}};
        }
    }
    return {Cell::EMPTY, {}};
}

bool Board::isFull() const {
    for (Cell c : m_grid) {
        if (c == Cell::EMPTY) return false;
    }
    return true;
}

bool Board::isTerminal() const {
    auto win = checkWinner();
    return win.first != Cell::EMPTY || isFull();
}

Board Board::clone() const {
    return Board(m_grid);
}

// ==========================================
// Operator Overloading Implementations
// ==========================================

Cell Board::operator[](int position) const {
    validatePosition(position);
    return m_grid[position];
}

Cell& Board::operator[](int position) {
    validatePosition(position);
    return m_grid[position];
}

bool Board::operator==(const Board& other) const {
    return m_grid == other.m_grid;
}

bool Board::operator!=(const Board& other) const {
    return !(*this == other);
}

Board Board::operator+(const Move& move) const {
    Board copy = *this;
    copy.placeMark(move.position, move.mark);
    return copy;
}

Board& Board::operator+=(const Move& move) {
    placeMark(move.position, move.mark);
    return *this;
}

std::ostream& operator<<(std::ostream& os, const Board& board) {
    for (int r = 0; r < 3; ++r) {
        for (int c = 0; c < 3; ++c) {
            os << cellToChar(board.m_grid[r * 3 + c]) << (c < 2 ? " " : "");
        }
        if (r < 2) os << "\n";
    }
    return os;
}

} // namespace afterlight
