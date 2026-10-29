#ifndefption {
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
