/**
 * Cloudflare Worker entrypoint.
 * Routes requests to a per-room Durable Object based on room code.
 *
 * Usage:
 *   GET  /room/:roomCode/ws?playerId=...  -> upgrade to WebSocket, join/rejoin that room
 *   POST /room/:roomCode/init             -> { mode: "relay" | "authoritative" } one-time room setup
 */

import { RoomSignaling } from "./room.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean); // ["room", ":roomCode", "ws" | "init"]

    if (parts[0] === "room" && parts[1] && (parts[2] === "ws" || parts[2] === "init")) {
      const roomCode = parts[1];

      // Route to the Durable Object instance for this room.
      // idFromName ensures the same roomCode always maps to the same DO instance.
      const id = env.ROOM_SIGNALING.idFromName(roomCode);
      const stub = env.ROOM_SIGNALING.get(id);

      // Forward the request (including the WebSocket upgrade headers) to the DO.
      return stub.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  },
};

export { RoomSignaling };
