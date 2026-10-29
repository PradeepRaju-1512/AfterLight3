/**
 * @file Database.cpp
 * @brief Implementation of Database class with RAII sqlite3 connection management.
 */

#include "Database.hpp"
#include <iostream>
#include <fstream>
#include <sstream>

Database::Database(const std::string& dbPath)
    : db_(nullptr), dbPath_(dbPath) {
    int rc = sqlite3_open(dbPath_.c_str(), &db_);
    if (rc != SQLITE_OK) {
        std::cerr << "[Database] Failed to open database " << dbPath_ << ": "
                  << sqlite3_errmsg(db_) << "\n";
    } else {
        // Enable foreign key constraints and WAL journal mode for concurrency
        execute("PRAGMA foreign_keys = ON;");
        execute("PRAGMA journal_mode = WAL;");
    }
}

Database::~Database() {
    if (db_) {
        sqlite3_close(db_);
        db_ = nullptr;
    }
}

bool Database::execute(const std::string& sql) {
    std::lock_guard<std::mutex> lock(dbMutex_);
    if (!db_) return false;

    char* errMsg = nullptr;
    int rc = sqlite3_exec(db_, sql.c_str(), nullptr, nullptr, &errMsg);
    if (rc != SQLITE_OK) {
        std::cerr << "[Database] SQL error: " << (errMsg ? errMsg : "unknown") << "\n";
        sqlite3_free(errMsg);
        return false;
    }
    return true;
}

bool Database::initializeSchema(const std::string& schemaFilePath) {
    std::ifstream file(schemaFilePath);
    if (!file.is_open()) {
        std::ifstream fileParent("../" + schemaFilePath);
        if (fileParent.is_open()) {
            std::stringstream buffer;
            buffer << fileParent.rdbuf();
            return execute(buffer.str());
        }
    } else {
        std::stringstream buffer;
        buffer << file.rdbuf();
        return execute(buffer.str());
    }

    // Direct statement-by-statement fallback if file is not found
    execute("PRAGMA foreign_keys = ON;");
    execute("CREATE TABLE IF NOT EXISTS users ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "username TEXT NOT NULL UNIQUE COLLATE NOCASE, "
            "email TEXT NOT NULL UNIQUE COLLATE NOCASE, "
            "password_hash TEXT NOT NULL, "
            "created_at DATETIME DEFAULT CURRENT_TIMESTAMP);");
    execute("CREATE TABLE IF NOT EXISTS matches ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "player_x_id INTEGER NOT NULL, "
            "player_o_id INTEGER, "
            "game_mode TEXT NOT NULL, "
            "bot_difficulty TEXT, "
            "winner_id INTEGER, "
            "result TEXT NOT NULL, "
            "created_at DATETIME DEFAULT CURRENT_TIMESTAMP);");
    return true;
}
