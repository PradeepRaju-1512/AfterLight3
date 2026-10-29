/**
 * @file MatchHistory.hpp
 * @brief Match history recorder and query manager using SQLite prepared statements.
 *
 * OOP Concept: Single Responsibility Principle.
 * Encapsulates the recording and querying of finished game matches.
 */

#pragma once

#include "Database.hpp"
#include <string>
#include <vector>
#include <optional>

struct MatchRecord {
    int id;
    int playerXId;
    std::string playerXUsername;
    std::optional<int> playerOId;
    std::string playerOUsername;
    std::string gameMode;               // "bot" or "pvp"
    std::optional<std::string> botDifficulty; // "easy", "medium", "unbeatable"
    std::optional<int> winnerId;
    std::string result;                 // "X_WON", "O_WON", "DRAW"
    std::string createdAt;
};

class MatchHistory {
private:
    Database& db_;

public:
    explicit MatchHistory(Database& db);

    // Save completed match
    bool recordMatch(int playerXId,
                     std::optional<int> playerOId,
                     const std::string& gameMode,
                     const std::optional<std::string>& botDifficulty,
                     std::optional<int> winnerId,
                     const std::string& result);

    // Retrieve match records for a specific user
    std::vector<MatchRecord> getUserMatches(int userId, int limit = 20);
};
