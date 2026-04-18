# 🎯 Party Arena

**No servers. No downloads. Just vibes.**

A peer-to-peer multiplayer party game platform that runs entirely in the browser. Create rooms, invite friends, and play — all communication happens over WebRTC (no game server needed).

## How It Works

```
┌─────────────┐     PeerJS Cloud     ┌─────────────┐
│   Player A   │◄── (signaling only)──►│   Player B   │
│   (Host)     │                      │   (Guest)    │
│              │◄─── WebRTC P2P ────►│              │
│              │     Data Channel      │              │
└─────────────┘                      └─────────────┘
```

- **Signaling**: PeerJS free cloud server (only used to establish connections)
- **Game data**: Direct WebRTC DataChannels between peers (P2P, no server)
- **Games**: Loaded as ES modules on demand — main app stays lightweight
- **Offline mode**: Local pass-and-play mode for same-device play

## Quick Start (Local)

Just open `index.html` in a browser with a local server:

```bash
# Python
python3 -m http.server 8080

# Node
npx serve .

# Then open http://localhost:8080
```

> **Note**: ES modules require a server — `file://` won't work. Any static server is fine.

## Deploy to GitHub Pages

### Option A: Direct Push (Simplest)

```bash
# 1. Create a GitHub repo
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USER/party-arena.git
git push -u origin main

# 2. Go to repo Settings → Pages → Source: "main" branch, root folder
# 3. Your app is live at https://YOUR_USER.github.io/party-arena/
```

### Option B: Using gh-pages branch

```bash
# If you want to keep source separate from deployed files
git checkout -b gh-pages
git push origin gh-pages
# Set GitHub Pages source to gh-pages branch
```

### Option C: Netlify / Vercel / Cloudflare Pages

Just connect your repo — zero config needed. It's all static files.

## Project Structure

```
party-arena/
├── index.html              # Main app (room system, networking, UI)
├── games/
│   ├── deeper-talk.js      # 💬 Conversation/question game
│   └── (your-game.js)      # Add more games here!
└── README.md
```

## Adding a New Game

1. Create a file in `games/` (e.g., `games/trivia-blast.js`)
2. Export a default object following the Game Module API
3. Register it in the `GAME_REGISTRY` array in `index.html`

### Game Module API

```javascript
// games/my-game.js
export default {
  id: "my-game",
  name: "My Game",

  create(container, api) {
    // container: DOM element to render into
    // api: Game API object (see below)

    // Build your game UI inside container
    // ...

    // Return cleanup function
    return {
      destroy() {
        // Clean up timers, listeners, etc.
        container.innerHTML = "";
      },
    };
  },
};
```

### Game API Reference

```javascript
api.getPlayers(); // → [{ id, name, isHost }]
api.getMe(); // → { id, name, isHost }
api.isHost(); // → boolean
api.isLocal(); // → boolean (pass-and-play mode)

api.send(action, payload); // Send data to all players via host
api.on(event, callback); // Listen for game events
api.off(event, callback); // Remove listener

api.endGame(); // Return to lobby

api.addLocalPlayer(name); // Local mode: add a player

api.cssVars; // Theme CSS variables for consistent styling
```

### Register in GAME_REGISTRY

In `index.html`, add to the `GAME_REGISTRY` array:

```javascript
const GAME_REGISTRY = [
  // ... existing games
  {
    id: "my-game",
    name: "My Game",
    emoji: "🎮",
    description: "A short description of your game.",
    minPlayers: 2,
    maxPlayers: 8,
    module: "./games/my-game.js",
  },
];
```

That's it — your game will appear in the lobby automatically.

## Games Included

| Game           | Description                                                | Players |
| -------------- | ---------------------------------------------------------- | ------- |
| 💬 Deeper Talk | Take turns answering deep, spicy, and surprising questions | 2-12    |

## Tech Stack

- **PeerJS** — WebRTC abstraction (free signaling server)
- **Vanilla JS** — No build step, no framework overhead
- **ES Modules** — Native dynamic imports for lazy loading
- **CSS** — Custom properties, backdrop-filter, animations

## Browser Support

Chrome 80+, Firefox 80+, Safari 14+, Edge 80+ (any browser with WebRTC + ES modules)

## License

MIT
