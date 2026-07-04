import { DurableObject } from "cloudflare:workers";

const INACTIVITY_TTL_MS = 15 * 60 * 1000; // 15 min — covers empty room AND disconnected player grace period
const TICK_INTERVAL_MS = 50; // 20Hz simulation tick for authoritative rooms
// Don't rewrite the TTL alarm on every single message. Relayed gameplay runs at
// ~20Hz, and setAlarm is a storage write — pushing the 15-min deadline forward
// at most once per minute keeps the room-alive semantics intact (a room is
// "active" if it saw traffic in the last minute) while cutting writes ~1200x.
const ALARM_MIN_INTERVAL_MS = 60 * 1000;

/**
 * One instance of this Durable Object = one game room.
 *
 * Supports two modes (set on room creation, stored in DO storage):
 *   - "relay":         pure WebRTC signaling passthrough (offer/answer/ICE between peers)
 *   - "authoritative": server owns full game state, runs a tick loop, pushes state to clients
 *
 * Resilience model:
 *   - Each player has a persistent `playerId` (client generates/stores it, e.g. localStorage)
 *     which is DIFFERENT from their live WebSocket connection.
 *   - On disconnect, the player's game state is KEPT, only marked `connected: false`.
 *   - Reconnecting with the same `playerId` re-attaches to existing state.
 *   - A single inactivity alarm (15 min) covers both "room is empty" and "player never
 *     came back" — if it fires with no activity, all room state is wiped and the DO
 *     is left to be evicted naturally.
 *
 * Room phase / host tracking:
 *   - The DO is the source of truth for `hostPlayerId` (the playerId of whoever
 *     created the room) and `roomPhase` ("lobby" | "in-game") + `selectedGame`.
 *   - These are inferred by inspecting relayed `message` payloads for the
 *     application-level types the client already sends (game-selected,
 *     game-start, game-end) — the DO doesn't need its own copy of game logic,
 *     it just remembers the last-seen phase so a reconnecting client (especially
 *     the host) can be told where to resume instead of always landing in lobby.
 *   - hostPlayerId is set once, from whichever playerId first connects (relay
 *     mode has no other signal for "who is host" — the client that called
 *     POST /init is assumed to connect first as the host). It is NOT
 *     reassigned on disconnect, so the original host regains host status on
 *     reconnect even if other guests are connected in the meantime.
 *
 * Game state resume (uniform across all games):
 *   - `lastResumeState` is an opaque JSON blob the DO stores and hands back
 *     ONLY to the reconnecting host, inside `welcome`. The DO never reads or
 *     interprets it — it's whatever the host's game module decided to save
 *     via api.setResumeState(...), forwarded here as a `resume-state` message.
 *   - Guests never need their own resume state: in this codebase every game
 *     is host-authoritative (host holds the real state, pushes views to
 *     guests). So guest reconnect just needs the host to re-push its current
 *     view, which `peer-reconnected` already triggers at the app layer.
 *
 * Message shape (JSON over WebSocket), client -> server:
 *   { type: "signal", to: "playerId", payload: {...} }       // relay mode: offer/answer/ICE
 *   { type: "input",  payload: {...} }                       // authoritative mode: player input
 *   { type: "message", payload: {...} }                      // generic broadcast (chat, etc.)
 *     (payload.type "game-selected" | "game-start" | "game-end" are inspected
 *      server-side to update roomPhase/selectedGame — see handleMessage)
 *     (payload.type "resume-state" from the host is stored as lastResumeState
 *      and NOT broadcast further — see handleMessage)
 *
 * Server -> client:
 *   { type: "welcome", playerId, isHost, roomPhase, selectedGame, resumeState, players: [...] }
 *   { type: "peer-joined" | "peer-reconnected" | "peer-disconnected", playerId }
 *   { type: "signal", from, payload }                        // relay mode
 *   { type: "state", payload }                                // authoritative mode tick update
 *   { type: "room-closed", reason }                            // sent right before TTL wipe
 */
export class RoomSignaling extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;

    // playerId -> WebSocket | null (null = currently disconnected, but state retained)
    this.sockets = new Map();

    // playerId -> arbitrary game-specific state (position, score, etc.)
    // Populated lazily; persisted to DO storage so it survives hibernation.
    this.players = new Map();

    this.mode = "relay"; // or "authoritative" — set via init, restored from storage
    this.tickHandle = null;

    // Room phase / host tracking (see file header comment for the model).
    this.hostPlayerId = null; // playerId of whoever created the room; sticky across reconnects
    this.roomPhase = "lobby"; // "lobby" | "in-game"
    this.selectedGame = null; // gameId, mirrors client's GAME_REGISTRY ids
    this.lastResumeState = null; // opaque blob from the host's game module; see header comment
    this._lastAlarmAt = 0; // in-memory throttle for resetInactivityAlarm (see ALARM_MIN_INTERVAL_MS)

    // Restore state after hibernation/restart.
    this.ctx.blockConcurrencyWhile(async () => {
      const stored = await this.ctx.storage.get([
        "mode",
        "players",
        "hostPlayerId",
        "roomPhase",
        "selectedGame",
        "lastResumeState",
      ]);
      if (stored.get("mode")) this.mode = stored.get("mode");
      if (stored.get("hostPlayerId")) this.hostPlayerId = stored.get("hostPlayerId");
      if (stored.get("roomPhase")) this.roomPhase = stored.get("roomPhase");
      if (stored.get("selectedGame")) this.selectedGame = stored.get("selectedGame");
      if (stored.get("lastResumeState") !== undefined) {
        this.lastResumeState = stored.get("lastResumeState");
      }
      if (stored.get("players")) {
        for (const [pid, state] of stored.get("players")) {
          this.players.set(pid, state);
          this.sockets.set(pid, null); // not connected yet until they open a socket
        }
      }
    });
  }

  async fetch(request) {
    const url = new URL(request.url);

    // Optional one-time setup: POST /init { mode: "authoritative" } before first join.
    if (request.method === "POST" && url.pathname.endsWith("/init")) {
      const body = await request.json().catch(() => ({}));
      if (body.mode === "authoritative" || body.mode === "relay") {
        this.mode = body.mode;
        await this.ctx.storage.put("mode", this.mode);
        if (this.mode === "authoritative") this.scheduleTick();
      }
      return new Response(JSON.stringify({ ok: true, mode: this.mode }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const upgradeHeader = request.headers.get("Upgrade");
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 426 });
    }

    // Client supplies its persistent playerId (generated once, stored client-side).
    // If absent, this is a brand-new player.
    const playerId = url.searchParams.get("playerId") || crypto.randomUUID();
    const isReconnect = this.players.has(playerId);

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();

    // Close out any stale prior socket for this playerId (e.g. duplicate tab).
    const existingSocket = this.sockets.get(playerId);
    if (existingSocket) {
      try { existingSocket.close(4000, "Replaced by new connection"); } catch {}
    }

    this.sockets.set(playerId, server);

    if (!isReconnect) {
      this.players.set(playerId, this.createInitialPlayerState());
      // First-ever player to connect to a fresh room becomes the sticky host.
      // (Relay mode has no other signal for "who is host" — the room creator's
      // client calls POST /init then immediately opens this socket, so it's
      // first in practice. Not reassigned later, even if this player leaves.)
      if (!this.hostPlayerId) {
        this.hostPlayerId = playerId;
        await this.ctx.storage.put("hostPlayerId", this.hostPlayerId);
      }
    } else {
      const state = this.players.get(playerId);
      state.connected = true;
    }
    await this.persistPlayers();
    this.resetInactivityAlarm(true); // connect is rare + significant — keep TTL exact

    server.send(
      JSON.stringify({
        type: "welcome",
        playerId,
        isHost: playerId === this.hostPlayerId,
        mode: this.mode,
        roomPhase: this.roomPhase,
        selectedGame: this.selectedGame,
        // Only the host gets resumeState back — guests are never the
        // authoritative source of game state in this codebase, so they have
        // nothing to restore; the host re-pushes views to them instead (see
        // header comment). Keeping this host-only also avoids shipping a
        // potentially large blob to everyone on every reconnect.
        resumeState: playerId === this.hostPlayerId ? this.lastResumeState : null,
        players: this.connectedPlayerIds(),
      })
    );
    this.broadcast(
      { type: isReconnect ? "peer-reconnected" : "peer-joined", playerId },
      playerId
    );

    server.addEventListener("message", (event) => {
      this.handleMessage(playerId, event.data);
    });

    const onDisconnect = () => this.handleDisconnect(playerId);
    server.addEventListener("close", onDisconnect);
    server.addEventListener("error", onDisconnect);

    return new Response(null, { status: 101, webSocket: client });
  }

  createInitialPlayerState() {
    return {
      connected: true,
      // Game-specific fields go here — position, score, etc.
      // Kept generic since this is shared scaffolding for multiple games.
    };
  }

  connectedPlayerIds() {
    return [...this.sockets.entries()].filter(([, ws]) => ws).map(([pid]) => pid);
  }

  async handleDisconnect(playerId) {
    this.sockets.set(playerId, null);
    const state = this.players.get(playerId);
    if (state) state.connected = false;
    await this.persistPlayers();
    this.broadcast({ type: "peer-disconnected", playerId });
    this.resetInactivityAlarm();
  }

  async persistPlayers() {
    await this.ctx.storage.put("players", [...this.players.entries()]);
  }

  handleMessage(fromPlayerId, raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    this.resetInactivityAlarm();

    if (this.mode === "relay" && msg.type === "signal" && msg.to) {
      const target = this.sockets.get(msg.to);
      if (target) {
        target.send(JSON.stringify({ type: "signal", from: fromPlayerId, payload: msg.payload }));
      }
      return;
    }

    if (this.mode === "authoritative" && msg.type === "input") {
      this.applyInput(fromPlayerId, msg.payload);
      return;
    }

    // Generic broadcast (chat, custom events) for either mode.
    if (msg.type === "message") {
      // Inspect the application-level payload to keep roomPhase/selectedGame
      // in sync, so a reconnecting client (especially the host) can be told
      // where to resume instead of always landing back in the lobby. The DO
      // doesn't run any game logic itself — it just tracks these three phase
      // transitions, which mirror exactly what the client already sends.
      const inner = msg.payload;
      if (inner?.type === "game-selected") {
        this.selectedGame = inner.gameId ?? null;
        this.lastResumeState = null; // new game picked — old snapshot is stale
        this.ctx.storage.put("selectedGame", this.selectedGame);
        this.ctx.storage.put("lastResumeState", this.lastResumeState);
      } else if (inner?.type === "game-start") {
        this.selectedGame = inner.gameId ?? this.selectedGame;
        this.roomPhase = "in-game";
        this.ctx.storage.put("selectedGame", this.selectedGame);
        this.ctx.storage.put("roomPhase", this.roomPhase);
      } else if (inner?.type === "game-end") {
        this.roomPhase = "lobby";
        this.lastResumeState = null; // game over — nothing to resume into
        this.ctx.storage.put("roomPhase", this.roomPhase);
        this.ctx.storage.put("lastResumeState", this.lastResumeState);
      } else if (inner?.type === "resume-state") {
        // Host-only snapshot of its game module's current authoritative
        // state (see api.setResumeState in index.html). Stored, never
        // broadcast — only handed back to this same playerId on reconnect,
        // via welcome.resumeState above.
        if (fromPlayerId === this.hostPlayerId) {
          this.lastResumeState = inner.snapshot ?? null;
          this.ctx.storage.put("lastResumeState", this.lastResumeState);
        }
        return; // don't fall through to broadcast — this is host<->DO only
      }

      this.broadcast({ type: "message", from: fromPlayerId, payload: msg.payload }, fromPlayerId);
    }
  }

  // --- Authoritative mode: server-simulated game loop ---

  applyInput(playerId, payload) {
    // TODO (game-specific): mutate this.players.get(playerId) based on input.
    // e.g. set velocity/intent here; actual position integration happens in tick().
    const state = this.players.get(playerId);
    if (state) state.lastInput = payload;
  }

  scheduleTick() {
    // A plain setTimeout loop while the DO is active in memory.
    // (Distinct from the inactivity alarm below — see note there.)
    this.tickHandle = setTimeout(() => this.tick(), TICK_INTERVAL_MS);
  }

  tick() {
    if (this.mode !== "authoritative") return;

    // TODO (game-specific): step the simulation forward using each player's
    // lastInput, resolve collisions, update scores, etc.
    const snapshot = {};
    for (const [pid, state] of this.players) {
      snapshot[pid] = state;
    }

    this.broadcast({ type: "state", payload: snapshot });
    this.scheduleTick();
  }

  // --- Inactivity / TTL handling ---
  //
  // Note: setTimeout-based ticking above works while the DO is active in memory,
  // but for the 15-min inactivity cleanup we use the Durable Object Alarm API
  // (ctx.storage.setAlarm), since alarms persist even if the DO is evicted and
  // survive across hibernation — a plain setTimeout would not.

  resetInactivityAlarm(force = false) {
    // Throttled: skip the storage write if we pushed the deadline forward
    // recently, UNLESS force=true (used for rare, significant events like a
    // connect/disconnect, where we want the TTL to be exact). The hot path —
    // per-message relaying at ~20Hz — passes no arg and is throttled.
    //
    // Safe against hibernation: this._lastAlarmAt is in-memory and resets to 0
    // when the DO is reconstructed, so the first message after a restart always
    // writes. The alarm itself persists in storage across hibernation, so no
    // cleanup is ever missed — throttling only affects how often we *refresh* it.
    const now = Date.now();
    if (!force && now - this._lastAlarmAt < ALARM_MIN_INTERVAL_MS) return;
    this._lastAlarmAt = now;
    this.ctx.storage.setAlarm(now + INACTIVITY_TTL_MS);
  }

  async alarm() {
    // No activity (join/reconnect/message) reset this alarm in the last 15 min.
    // Treat the room as dead: notify anyone still connected, then wipe state.
    this.broadcast({ type: "room-closed", reason: "inactivity-timeout" });

    for (const ws of this.sockets.values()) {
      if (ws) {
        try { ws.close(4001, "Room closed due to inactivity"); } catch {}
      }
    }

    this.sockets.clear();
    this.players.clear();
    if (this.tickHandle) clearTimeout(this.tickHandle);

    await this.ctx.storage.deleteAll();
  }

  broadcast(obj, excludePlayerId) {
    const data = JSON.stringify(obj);
    for (const [playerId, ws] of this.sockets) {
      if (playerId === excludePlayerId || !ws) continue;
      try {
        ws.send(data);
      } catch {
        this.sockets.set(playerId, null);
      }
    }
  }
}
