/**
 * @file Database.hpp
 * @brief SQLite Database manager demonstrating RAII (Resource Acquisition Is Initialization).
 *
 * OOP Concept: RAII.
 * The SQLite database handle (sqlite3*) is owned by the Database class.
 * Opening occurs in the constructor, and closing occurs reliably in the destructor,
 * preventing memory leaks and dangling database locks even if exceptions are thrown.
 */

#pragma once

#include <sqlite3.h>
#include <string>
#include <mutex>
#include <vector>
#include <functional>

class Database {
private:
    sqlite3* db_;
    std::string dbPath_;
    mutable std::mutex dbMutex_;

    // Prevent copying (handles RAII resource safely)
    Database(const Database&) = delete;
    Database& operator=(const Database&) = delete;

public:
    explicit Database(const std::string& dbPath = "afterlight.db");
    ~Database();

    // Initialize tables from schema file
    bool initializeSchema(const std::string& schemaFilePath = "database/schema.sql");

    // Execute raw SQL command (e.g. PRAGMA, CREATE TABLE)
    bool execute(const std::string& sql);

    // Direct access with mutex protection for prepared statements
    sqlite3* getRawDb() const { return db_; }
    std::mutex& getMutex() const { return dbMutex_; }
};
