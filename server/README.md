# Relay server (online play)

Tiny zero-dependency WebSocket relay for SANTA vs RUDOLPH. It only does quick matchmaking
(fills the fullest room first, up to `MAX_HUMANS` = 16 real players) and forwards messages.
The first player in a room is the **host**: their browser runs the match (bots, hits, scores).
If the host leaves, the server picks a new host from the players still in the room.

- `GET /health` → `ok` (Render health check / wake-up ping)
- `GET /stats` → rooms and players right now
- WebSocket: `wss://<service>.onrender.com/ws`

Deploy: Render → New → Blueprint → this repo (uses `render.yaml`, free plan).
The game connects to `wss://santa-vs-rudolph.onrender.com/ws` by default
(override for testing with `?server=ws://127.0.0.1:8099/ws`, or play offline with `?offline=1`).
