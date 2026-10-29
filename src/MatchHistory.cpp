/**
 * @file MatchHistory.cpp
 * @brief Implementation of MatchHistory class.
 */

#include "MatchHistory.hpp"
#include <iostream>

MatchHistory::MatchHistory(Database& db)
    : db_(db) {
}

bool MatchHistory::recordMatch(int playerXId,
                               std::optional<int> playerOId,
                               const std::string& gameMode,
                               const std::optional<std::string>& botDifficulty,
                               std::optional<int> winnerId,
                               const std::string& result) {
    std::lock_guard<std::mutex> lock(db_.getMutex());

    const char* sql =
        "INSERT INTO matches (player_x_id, player_o_id, game_mode, bot_difficulty, winner_id, result) "
        "VALUES (?, ?, ?, ?, ?, ?);";

    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db_.getRawDb(), sql, -1, &stmt, nullptr) != SQLITE_OK) {
        std::cerr << "[MatchHistory] Prepare failed: " << sqlite3_errmsg(db_.getRawDb()) << "\n";
        return false;
    }

    // 1. player_x_id
    sqlite3_bind_int(stmt, 1, playerXId);

    // 2. player_o_id
    if (playerOId.has_value()) {
        sqlite3_bind_int(stmt, 2, playerOId.value());
    } else {
        sqlite3_bind_null(stmt, 2);
    }

    // 3. game_mode
    sqlite3_bind_text(stmt, 3, gameMode.c_str(), -1, SQLITE_TRANSIENT);

    // 4. bot_difficulty
    if (botDifficulty.has_value()) {
        sqlite3_bind_text(stmt, 4, botDifficulty.value().c_str(), -1, SQLITE_TRANSIENT);
    } else {
        sqlite3_bind_null(stmt, 4);
    }

    // 5. winner_id
    if (winnerId.has_value()) {
        sqlite3_bind_int(stmt, 5, winnerId.value());
    } else {
        sqlite3_bind_null(stmt, 5);
    }

    // 6. result
    sqlite3_bind_text(stmt, 6, result.c_str(), -1, SQLITE_TRANSIENT);

    int rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);

    return rc == SQLITE_DONE;
}

std::vector<MatchRecord> MatchHistory::getUserMatches(int userId, int limit) {
    std::vector<MatchRecord> records;
    std::lock_guard<std::mutex> lock(db_.getMutex());

    const char* sql =
        "SELECT m.id, m.player_x_id, ux.username AS x_name, "
        "       m.player_o_id, uo.username AS o_name, "
        "       m.game_mode, m.bot_difficulty, m.winner_id, m.result, m.created_at "
        "FROM matches m "
        "JOIN users ux ON m.player_x_id = ux.id "
        "LEFT JOIN users uo ON m.player_o_id = uo.id "
        "WHERE m.player_x_id = ? OR m.player_o_id = ? "
        "ORDER BY m.id DESC LIMIT ?;";

    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db_.getRawDb(), sql, -1, &stmt, nullptr) != SQLITE_OK) {
        std::cerr << "[MatchHistory] Query prepare failed: " << sqlite3_errmsg(db_.getRawDb()) << "\n";
        return records;
    }

    sqlite3_bind_int(stmt, 1, userId);
    sqlite3_bind_int(stmt, 2, userId);
    sqlite3_bind_int(stmt, 3, limit);

    while (sqlite3_step(stmt) == SQLITE_ROW) {
        MatchRecord rec;
        rec.id = sqlite3_column_int(stmt, 0);
        rec.playerXId = sqlite3_column_int(stmt, 1);
        rec.playerXUsername = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));

        if (sqlite3_column_type(stmt, 3) != SQLITE_NULL) {
            rec.playerOId = sqlite3_column_int(stmt, 3);
            const unsigned char* oName = sqlite3_column_text(stmt, 4);
            rec.playerOUsername = oName ? reinterpret_cast<const char*>(oName) : "Unknown";
        } else {
            rec.playerOId = std::nullopt;
            rec.playerOUsername = "Bot";
        }

        rec.gameMode = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 5));

        if (sqlite3_column_type(stmt, 6) != SQLITE_NULL) {
            rec.botDifficulty = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 6));
        } else {
            rec.botDifficulty = std::nullopt;
        }

        if (sqlite3_column_type(stmt, 7) != SQLITE_NULL) {
            rec.winnerId = sqlite3_column_int(stmt, 7);
        } else {
            rec.winnerId = std::nullopt;
        }

        rec.result = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 8));
        rec.createdAt = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 9));

        records.push_back(rec);
    }

    sqlite3_finalize(stmt);
    return records;
}
