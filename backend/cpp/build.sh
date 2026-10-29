#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "Compiling C++ 17 Native Game Engine..."
CXX="${CXX:-g++}"
CXXFLAGS="-std=c++17 -Wall -Wextra -O3 -Iinclude"

$CXX $CXXFLAGS -c src/Board.cpp -o src/Board.o
$CXX $CXXFLAGS -c src/Bots.cpp -o src/Bots.o
$CXX $CXXFLAGS -c src/Game.cpp -o src/Game.o
$CXX $CXXFLAGS -c src/cli.cpp -o src/cli.o
$CXX $CXXFLAGS -c src/test_engine.cpp -o src/test_engine.o

$CXX src/Board.o src/Bots.o src/Game.o src/cli.o -o engine_cli
$CXX src/Board.o src/Bots.o src/Game.o src/test_engine.o -o test_engine

chmod +x engine_cli test_engine
echo "C++ engine built successfully: engine_cli and test_engine ready."
