#ifndef AFTERLIGHT_TEMPLATES_HPP
#define AFTERLIGHT_TEMPLATES_HPP

#include <array>
#include <vector>
#include <string>
        if (index >= N) {
            throw PositionOutOfBoundsException(static_cast<int>(index));
        }
        return m_data[index];
    }

    // Equality comparison operator overload
    bool operator==(const Grid<T, N>& other) const {
        return m_data == other.m_data;
    }

    bool operator!=(const Grid<T, N>& other) const {
        return !(*this == other);
    }

    constexpr std::size_t size() const noexcept {
        return N;
    }

    std::size_t count(const T& value) const {
        return std::count(m_data.begin(), m_data.end(), value);
    }

    void fill(const T& value) {
        m_data.fill(value);
    }

    const std::array<T, N>& rawData() const noexcept {
        return m_data;
    }

    // Stream output operator template
    friend std::ostream& operator<<(std::ostream& os, const Grid<T, N>& grid) {
        os << "[";
        for (std::size_t i = 0; i < N; ++i) {
            os << grid.m_data[i] << (i + 1 < N ? ", " : "");
        }
        os << "]";
        return os;
    }
};

// ============================================================================
// 2. Class Template: HistoryBuffer / Circular Action Logger
// Demonstrates generic container with dynamic bounds and move-semantics
// ============================================================================
template <typename T, std::size_t Capacity = 64>
class HistoryBuffer {
private:
    std::vector<T> m_items;

public:
    HistoryBuffer() {
        m_items.reserve(Capacity);
    }

    void push(const T& item) {
        if (m_items.size() < Capacity) {
            m_items.push_back(item);
        }
    }

    T pop() {
        if (m_items.empty()) {
            throw std::runtime_error("HistoryBuffer is empty.");
        }
        T val = m_items.back();
        m_items.pop_back();
        return val;
    }

    const T& operator[](std::size_t index) const {
        return m_items.at(index);
    }

    std::size_t size() const noexcept {
        return m_items.size();
    }

    bool empty() const noexcept {
        return m_items.empty();
    }

    void clear() {
        m_items.clear();
    }

    const std::vector<T>& items() const {
        return m_items;
    }
};

// ============================================================================
// 3. Function Templates: Generic Minimax Scoring & Decision Primitives
// ============================================================================
template <typename ScoreT>
inline ScoreT clampScore(ScoreT value, ScoreT minVal, ScoreT maxVal) {
    if (value < minVal) return minVal;
    if (value > maxVal) return maxVal;
    return value;
}

template <typename T>
inline const T& bestOf(const T& a, const T& b, bool isMaximizing) {
    return isMaximizing ? std::max(a, b) : std::min(a, b);
}

// ============================================================================
// 4. Template Specialization: Full Specialization of Grid for string representation
// Demonstrates explicit template specialization for domain formatting
// ============================================================================
template <>
class Grid<std::string, 9> {
private:
    std::array<std::string, 9> m_data;

public:
    Grid() {
        m_data.fill(".");
    }

    std::string& operator[](std::size_t index) {
        if (index >= 9) throw PositionOutOfBoundsException(static_cast<int>(index));
        return m_data[index];
    }

    const std::string& operator[](std::size_t index) const {
        if (index >= 9) throw PositionOutOfBoundsException(static_cast<int>(index));
        return m_data[index];
    }

    std::string join(const std::string& delim = "") const {
        std::string res;
        for (std::size_t i = 0; i < 9; ++i) {
            res += m_data[i];
            if (i + 1 < 9) res += delim;
        }
        return res;
    }

    constexpr std::size_t size() const noexcept {
        return 9;
    }
};

} // namespace afterlight

#endif // AFTERLIGHT_TEMPLATES_HPP
