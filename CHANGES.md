# AfterLight – bug-fix report

## Verified by actually running it
- C++ engine: compiles with `-Wall -Wextra`, **0 warnings** (was 7); 34/34 unit tests pass (was 29).
- C++ CLI edge cases and the Node process runner (missing binary, bad input, bad difficulty).
- Python DB bridge: login/register, hash upgrade, double-save, history, friend flow, fresh-DB creation.

## C++ engine (backend/cpp)
1. Bots could "move" on an already-won board, and with an EMPTY mark -> now throw.
2. `engine_cli` aborted (no JSON) on any bad input (bad board, mark, difficulty, `stoi`). Added validation + a global exception barrier that returns `{"error": ...}`.
3. `test-operators` crashed on out-of-range positions.
4. RandomBot used a fixed seed (1337): identical "random" games after every restart. Now seeded from `random_device`.
5. Minimax depth was off by one at the root (win/loss speed scoring).
6. Missing `#include`s (`<stdexcept>`, `<ostream>`, `<array>`, `<utility>`), unused-parameter warnings.
7. Tests used `assert` (silently disabled with `-DNDEBUG`) and a hard-coded "29". Fixed; added 5 regression tests.
8. Makefile did not rebuild when headers changed (`-MMD -MP` added). Removed hard-coded fake compiler string from `status`.

## Server (server.ts)
1. Port hard-coded to 3000, so Render's `PORT=10000` never worked; `.env` was never loaded.
2. Child-process `error` events were unhandled -> a missing `python3`/binary **crashed the whole server**. Added handler + timeout.
3. Engine/DB errors were returned as "successful" garbage (`botResult.move` undefined -> corrupted board). Now rejected.
4. Bot games trusted the board sent by the browser (fake wins possible). Game state is now kept server-side.
5. Inconsistent bot names saved to history (`unbroken` vs `The Unbroken`) and ghost "ACTIVE" rows for every abandoned game.
6. WebSocket rooms: two players could get the same mark; a rejected 3rd client could reset/trigger leave events;
   rematch could be forced mid-game; a DB failure left the room stuck; unvalidated room codes/positions; unbounded chat.
7. Logout never marked the user offline (client called a bogus empty login). Real `/api/auth/logout` added.
8. `/api/games/history` without a username returned everyone's games.
9. Friend-request / notification endpoints had no ownership checks.
10. Test-runner endpoint crashed on spawn failure and relied on the string "ALL 29...".

## Database (backend/*.py)
1. DB bridge never created the schema -> "no such table" on a fresh deploy.
2. Passwords: one static salt + plain SHA-256. Now PBKDF2 with per-user salt (old hashes still work and are upgraded at next login).
3. Finished games could be saved twice -> stats counted twice; `created_at` was overwritten on every save.
4. Rating formula wiped seeded ratings after one game -> now incremental.
5. Registration had no validation (length, e-mail, case-insensitive duplicates).
6. Friend requests: anyone could accept/reject anyone's request, accept twice, send to non-existent users; block did not cancel pending requests; invitations unchecked.
7. LIKE wildcards in player search; `DATABASE_URL` ignored; malformed params silently became `{}`.

## Frontend (src)
1. API client treated error responses as success. Now throws, so the existing `catch` blocks work.
2. Logout, notification handlers, bot game errors / stale replies, "your turn" shown while the bot thinks.
3. History showed abandoned games as "DEFEAT".
4. Multiplayer: server errors (e.g. "Room is full") ignored; stale result after leaving; room codes had only 90 possibilities (strangers could land in your room).
5. OOP-lab labels updated to 34 tests.

## Deployment
- `tsx` (needed by `npm start`) was a devDependency -> not installed on Render. Moved to dependencies.
- `render.yaml` built the engine twice; `DEPLOYMENT.md` referenced a Dockerfile that did not exist -> added (untested).
- Compiled binaries added to `.gitignore`.
