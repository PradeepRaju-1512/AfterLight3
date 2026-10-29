#ifndef AFTERLIGHT_MODELS_HPP
#define AFTERLIGHT_MODELS_HPP

#include <string>
#include <exception>
#include <ostream>
#include <sstream>

namespace afterlight {

enum class Cell {
    EMPTY = 0,
    X = 1,
    O = 2
};

inline char cellToChar(Cell c) {
    switch (c) {
        case Cell::X: return 'X';
        case Cell::O: return 'O';
        default: return '.';
    }
}

inline Cell charToCell(char ch) {
    if (ch == 'X' || ch == 'x') return Cell::X;
    if (ch == 'O' || ch == 'o') return Cell::O;
    return Cell::EMPTY;
}

inline Cell opponent(Cell c) {
    if (c == Cell::X) return Cell::O;
    if (c == Cell::O) return Cell::X;
    return Cell::EMPTY;
}

// Move representation with operator overloads
struct Move {
    int position;
    Cell mark;

    Move() : position(-1), mark(Cell::EMPTY) {}
    Move(int pos, Cell m) : position(pos), mark(m) {}

    bool operator==(const Move& other) const {
        return position == other.position && mark == other.mark;
    }

    bool operator!=(const Move& other) const {
        return !(*this == other);
    }
};

inline std::ostream& operator<<(std::ostream& os, const Move& m) {
    os << "Move(pos=" << m.position << ", mark=" << cellToChar(m.mark) << ")";
    return os;
}

inline std::ostream& operator<<(std::ostream& os, Cell c) {
    os << cellToChar(c);
    return os;
}

enum class GameStatus {
    ACTIVE,
    WON_X,
    WON_O,
    DRAW,
    CANCELLED
};

inline std::string statusToString(GameStatus s) {
    switch (s) {
        case GameStatus::ACTIVE: return "ACTIVE";
        case GameStatus::WON_X: return "WON_X";
        case GameStatus::WON_O: return "WON_O";
        case GameStatus::DRAW: return "DRAW";
        case GameStatus::CANCELLED: return "CANCELLED";
    }
    return "UNKNOWN";
}

// ==========================================
// Custom Domain Exceptions (Encapsulation)
// ==========================================

class PositionOutOfBoundsException : public std::exception {
private:
    std::string m_msg;
public:
    explicit PositionOutOfBoundsException(int pos) {
        std::ostringstream ss;
        ss << "PositionOutOfBoundsError: Position " << pos << " is outside valid range [0..8].";
        m_msg = ss.str();
    }
    const char* what() const noexcept override {
        return m_msg.c_str();
    }
};

class OccupiedCellException : public std::exception {
private:
    std::string m_msg;
public:
    OccupiedCellException(int pos, Cell current) {
        std::ostringstream ss;
        ss << "OccupiedCellError: Cell " << pos << " is already occupied by " << cellToChar(current) << ".";
        m_msg = ss.str();
    }
    const char* what() const noexcept override {
        return m_msg.c_str();
    }
};

class GameOverException : public std::exception {
private:
    std::string m_msg;
public:
    explicit GameOverException(GameStatus status) {
        std::ostringstream ss;
        ss << "GameOverError: Cannot make move; game is already concluded with status " << statusToString(status) << ".";
        m_msg = ss.str();
    }
    const char* what() const noexcept override {
        return m_msg.c_str();
    }
};

class NotYourTurnException : public std::exception {
private:
    std::string m_msg;
public:
    NotYourTurnException(Cell expected, Cell actual) {
        std::ostringstream ss;
        ss << "NotYourTurnError: It is " << cellToChar(expected) << "'s turn, but " << cellToChar(actual) << " attempted to move.";
        m_msg = ss.str();
    }
    const char* what() const noexcept override {
        return m_msg.c_str();
    }
};

} // namespace afterlight

#endif // AFTERLIGHT_MODELS_HPP
