CXX = g++
CXXFLAGS = -std=c++17 -Wall -Wextra -O3 -Iinclude -MMD -MP

SRCS = src/Board.cpp src/Bots.cpp src/Game.cpp
OBJS = $(SRCS:.cpp=.o)

all: engine_cli test_engine

engine_cli: $(OBJS) src/cli.o
	$(CXX) $(CXXFLAGS) -o engine_cli $(OBJS) src/cli.o

test_engine: $(OBJS) src/test_engine.o
	$(CXX) $(CXXFLAGS) -o test_engine $(OBJS) src/test_engine.o

%.o: %.cpp
	$(CXX) $(CXXFLAGS) -c $< -o $@

test: test_engine
	./test_engine

clean:
	rm -f src/*.o src/*.d engine_cli test_engine

-include $(wildcard src/*.d)

.PHONY: all test clean
