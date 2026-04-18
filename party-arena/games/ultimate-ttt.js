// ════════════════════════════════════════════════════════════
//  ULTIMATE TIC-TAC-TOE — Party Arena Game Module
//  2 players, networked or local pass-and-play
// ════════════════════════════════════════════════════════════

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8], // rows
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8], // cols
  [0, 4, 8],
  [2, 4, 6], // diags
];

function checkWin(cells) {
  for (const [a, b, c] of LINES) {
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c])
      return cells[a];
  }
  return null;
}

function isFull(cells) {
  return cells.every((c) => c !== null);
}

function freshState() {
  return {
    boards: Array.from({ length: 9 }, () => Array(9).fill(null)),
    boardWinners: Array(9).fill(null), // 'X', 'O', 'D' (draw), or null
    currentPlayer: "X",
    activeBoard: null, // null = free choice
    winner: null, // 'X', 'O', 'D', or null
    playerMap: {}, // peerId -> 'X' | 'O'
    moveHistory: [],
  };
}

export default {
  create(container, api) {
    const players = api.getPlayers();
    const me = api.getMe();
    const isHost = api.isHost();
    const isLocal = api.isLocal();

    let gs = freshState();
    let localTurn = "X"; // for local mode, tracks whose physical turn it is
    let pendingMove = null; // { boardIdx, cellIdx } — tap-to-select, tap-again-to-confirm

    // ── Assign players ──
    if (isHost) {
      if (players.length >= 2) {
        gs.playerMap[players[0].id] = "X";
        gs.playerMap[players[1].id] = "O";
      }
      broadcastState();
    }

    // ── My symbol ──
    function mySymbol() {
      if (isLocal) return localTurn;
      return gs.playerMap[me.id] || null;
    }

    function playerName(symbol) {
      if (isLocal) return `Player ${symbol}`;
      const pid = Object.entries(gs.playerMap).find(
        ([, s]) => s === symbol,
      )?.[0];
      const p = players.find((pl) => pl.id === pid);
      return p ? p.name : symbol;
    }

    function isMyTurn() {
      if (gs.winner) return false;
      if (isLocal) return true; // always your turn in local
      return mySymbol() === gs.currentPlayer;
    }

    // ── Network ──
    function broadcastState() {
      api.send("uttt-sync", gs);
    }

    api.on("uttt-sync", (payload) => {
      if (!isHost) {
        gs = payload;
        pendingMove = null;
        render();
      }
    });

    api.on("uttt-move", (payload) => {
      if (isHost) {
        const { boardIdx, cellIdx, from } = payload;
        const symbol = gs.playerMap[from];
        if (symbol && symbol === gs.currentPlayer) {
          applyMove(boardIdx, cellIdx);
        }
      }
    });

    // ── Game Logic ──
    function applyMove(boardIdx, cellIdx) {
      // Validate
      if (gs.winner) return false;
      if (gs.boardWinners[boardIdx]) return false;
      if (gs.boards[boardIdx][cellIdx] !== null) return false;
      if (gs.activeBoard !== null && gs.activeBoard !== boardIdx) return false;

      // Place
      gs.boards[boardIdx][cellIdx] = gs.currentPlayer;
      gs.moveHistory.push({ boardIdx, cellIdx, player: gs.currentPlayer });

      // Check small board win
      const smallWin = checkWin(gs.boards[boardIdx]);
      if (smallWin) {
        gs.boardWinners[boardIdx] = smallWin;
      } else if (isFull(gs.boards[boardIdx])) {
        gs.boardWinners[boardIdx] = "D";
      }

      // Check overall win
      const bigWin = checkWin(
        gs.boardWinners.map((w) => (w === "D" ? null : w)),
      );
      if (bigWin) {
        gs.winner = bigWin;
      } else if (gs.boardWinners.every((w) => w !== null)) {
        gs.winner = "D";
      }

      // Determine next active board
      const nextBoard = cellIdx;
      if (gs.boardWinners[nextBoard] || isFull(gs.boards[nextBoard])) {
        gs.activeBoard = null; // free choice
      } else {
        gs.activeBoard = nextBoard;
      }

      // Switch turn
      gs.currentPlayer = gs.currentPlayer === "X" ? "O" : "X";

      if (isHost) broadcastState();
      render();

      // Announce
      if (gs.winner) {
        const w =
          gs.winner === "D" ? "It's a draw!" : `${playerName(gs.winner)} wins!`;
        api.speak(w);
      }

      return true;
    }

    function handleCellClick(boardIdx, cellIdx) {
      if (!isMyTurn()) return;

      // Tap-to-select, tap-again-to-confirm
      if (
        pendingMove &&
        pendingMove.boardIdx === boardIdx &&
        pendingMove.cellIdx === cellIdx
      ) {
        // Second tap on same cell — confirm the move
        pendingMove = null;
        commitMove(boardIdx, cellIdx);
      } else {
        // First tap or different cell — select it
        pendingMove = { boardIdx, cellIdx };
        render();
      }
    }

    function commitMove(boardIdx, cellIdx) {
      if (isLocal) {
        if (applyMove(boardIdx, cellIdx)) {
          localTurn = localTurn === "X" ? "O" : "X";
          render();
        }
        return;
      }

      // Networked: send move to host
      if (isHost) {
        applyMove(boardIdx, cellIdx);
      } else {
        api.send("uttt-move", { boardIdx, cellIdx, from: me.id });
      }
    }

    function resetGame() {
      const oldMap = { ...gs.playerMap };
      gs = freshState();
      gs.playerMap = oldMap;
      localTurn = "X";
      pendingMove = null;
      if (isHost) broadcastState();
      render();
      api.speak("New game! X goes first.");
    }

    api.on("uttt-reset", () => {
      const oldMap = { ...gs.playerMap };
      gs = freshState();
      gs.playerMap = oldMap;
      localTurn = "X";
      pendingMove = null;
      render();
    });

    // ── Rendering ──
    function render() {
      const isSpectator = !isLocal && !mySymbol();
      const myTurn = isMyTurn();
      const turnSymbol = gs.currentPlayer;
      const turnName = playerName(turnSymbol);

      container.innerHTML = `
        <style>
          .uttt-wrap {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            padding: 12px;
            gap: 10px;
            font-family: 'Quicksand', sans-serif;
            user-select: none;
            -webkit-user-select: none;
          }

          .uttt-status {
            text-align: center;
            min-height: 48px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .uttt-turn {
            font-family: 'Righteous', cursive;
            font-size: 1.15rem;
            color: #f1f5f9;
          }
          .uttt-turn .sym-x { color: #fbbf24; }
          .uttt-turn .sym-o { color: #60a5fa; }
          .uttt-hint {
            font-size: 0.75rem;
            color: #64748b;
            margin-top: 2px;
          }

          .uttt-mega {
            display: grid;
            grid-template: repeat(3, 1fr) / repeat(3, 1fr);
            gap: 6px;
            width: min(88vw, 88vh - 120px, 420px);
            height: min(88vw, 88vh - 120px, 420px);
            aspect-ratio: 1;
          }

          .uttt-board {
            display: grid;
            grid-template: repeat(3, 1fr) / repeat(3, 1fr);
            gap: 2px;
            border-radius: 8px;
            padding: 3px;
            position: relative;
            background: rgba(255,255,255,0.03);
            border: 2px solid rgba(255,255,255,0.06);
            transition: border-color 0.25s, background 0.25s, box-shadow 0.25s;
          }
          .uttt-board.active-board {
            border-color: rgba(251,191,36,0.5);
            background: rgba(251,191,36,0.06);
            box-shadow: 0 0 18px rgba(251,191,36,0.1);
          }
          .uttt-board.won-x { border-color: rgba(251,191,36,0.4); background: rgba(251,191,36,0.08); }
          .uttt-board.won-o { border-color: rgba(96,165,250,0.4); background: rgba(96,165,250,0.08); }
          .uttt-board.won-d { border-color: rgba(100,116,139,0.3); background: rgba(100,116,139,0.06); }

          .uttt-overlay {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Righteous', cursive;
            font-size: clamp(1.8rem, 6vw, 3rem);
            border-radius: 6px;
            z-index: 2;
            pointer-events: none;
            animation: uttt-pop 0.35s cubic-bezier(0.16,1,0.3,1);
          }
          .uttt-overlay.ov-x { color: #fbbf24; background: rgba(251,191,36,0.12); }
          .uttt-overlay.ov-o { color: #60a5fa; background: rgba(96,165,250,0.12); }
          .uttt-overlay.ov-d { color: #64748b; background: rgba(100,116,139,0.1); font-size: clamp(0.7rem,2vw,1rem); }

          @keyframes uttt-pop {
            0% { transform: scale(0.3); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }

          .uttt-cell {
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0,0,0,0.25);
            border-radius: 4px;
            cursor: pointer;
            font-family: 'Righteous', cursive;
            font-size: clamp(0.9rem, 3.2vw, 1.5rem);
            transition: background 0.15s;
            position: relative;
            z-index: 1;
            aspect-ratio: 1;
            line-height: 1;
          }
          .uttt-cell:hover:not(.taken):not(.dead) {
            background: rgba(255,255,255,0.08);
          }
          .uttt-cell.taken, .uttt-cell.dead {
            cursor: default;
          }
          .uttt-cell .cx { color: #fbbf24; }
          .uttt-cell .co { color: #60a5fa; }

          .uttt-cell.last-move {
            box-shadow: inset 0 0 0 2px rgba(52,211,153,0.6);
          }

          .uttt-cell.pending {
            background: rgba(52,211,153,0.18);
            box-shadow: inset 0 0 0 2px rgba(52,211,153,0.7);
            animation: uttt-pulse 1s ease infinite;
          }
          @keyframes uttt-pulse {
            0%, 100% { box-shadow: inset 0 0 0 2px rgba(52,211,153,0.7); }
            50% { box-shadow: inset 0 0 0 2px rgba(52,211,153,0.3); }
          }
          .uttt-confirm-hint {
            font-size: 0.72rem;
            color: #34d399;
            margin-top: 2px;
            animation: fadeIn 0.2s ease;
          }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

          .uttt-winner-banner {
            text-align: center;
            animation: uttt-pop 0.5s cubic-bezier(0.16,1,0.3,1);
          }
          .uttt-winner-banner h2 {
            font-family: 'Righteous', cursive;
            font-size: 1.6rem;
            margin-bottom: 4px;
          }
          .uttt-winner-banner p {
            color: #94a3b8;
            font-size: 0.85rem;
            margin-bottom: 12px;
          }
          .uttt-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 10px 24px;
            border: none;
            border-radius: 10px;
            font-family: 'Quicksand', sans-serif;
            font-weight: 700;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.2s;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .uttt-btn:active { transform: scale(0.96); }
          .uttt-btn-primary {
            background: linear-gradient(135deg, #fbbf24, #f59e0b);
            color: #0a0e1a;
            box-shadow: 0 4px 16px rgba(251,191,36,0.25);
          }
          .uttt-btn-secondary {
            background: rgba(255,255,255,0.06);
            color: #f1f5f9;
            border: 1.5px solid rgba(255,255,255,0.08);
            margin-left: 8px;
          }

          .uttt-info-row {
            display: flex;
            align-items: center;
            gap: 16px;
            font-size: 0.8rem;
            color: #94a3b8;
          }
          .uttt-info-row .player-tag {
            display: flex;
            align-items: center;
            gap: 5px;
            padding: 4px 12px;
            border-radius: 20px;
            font-weight: 700;
            font-size: 0.8rem;
          }
          .uttt-info-row .tag-x {
            background: rgba(251,191,36,0.12);
            color: #fbbf24;
            border: 1px solid rgba(251,191,36,0.2);
          }
          .uttt-info-row .tag-o {
            background: rgba(96,165,250,0.12);
            color: #60a5fa;
            border: 1px solid rgba(96,165,250,0.2);
          }
          .uttt-info-row .tag-active {
            box-shadow: 0 0 10px rgba(251,191,36,0.2);
          }
        </style>

        <div class="uttt-wrap">
          ${renderStatus()}
          ${renderInfoRow()}
          ${renderMegaBoard()}
          ${gs.winner ? renderWinnerControls() : ""}
        </div>
      `;

      // Wire click handlers
      container.querySelectorAll(".uttt-cell[data-b][data-c]").forEach((el) => {
        el.addEventListener("click", () => {
          const bi = parseInt(el.dataset.b);
          const ci = parseInt(el.dataset.c);
          handleCellClick(bi, ci);
        });
      });

      // Wire reset
      container.querySelector("#uttt-reset")?.addEventListener("click", () => {
        if (isHost || isLocal) {
          api.send("uttt-reset", {});
          resetGame();
        }
      });
    }

    function renderStatus() {
      if (gs.winner) {
        if (gs.winner === "D") {
          return `<div class="uttt-status"><div class="uttt-turn">It's a Draw!</div></div>`;
        }
        const name = playerName(gs.winner);
        const cls = gs.winner === "X" ? "sym-x" : "sym-o";
        return `<div class="uttt-status"><div class="uttt-turn"><span class="${cls}">${name}</span> wins! 🎉</div></div>`;
      }

      const cls = gs.currentPlayer === "X" ? "sym-x" : "sym-o";
      const name = playerName(gs.currentPlayer);
      const myTurn = isMyTurn();
      let hint;
      if (pendingMove && myTurn) {
        hint = `<span class="uttt-confirm-hint">Tap again to confirm</span>`;
      } else if (myTurn) {
        hint =
          gs.activeBoard !== null
            ? `Play in highlighted board`
            : `Play in any open board`;
      } else {
        hint = `Waiting...`;
      }

      return `
        <div class="uttt-status">
          <div class="uttt-turn"><span class="${cls}">${name}</span>'s turn</div>
          <div class="uttt-hint">${hint}</div>
        </div>
      `;
    }

    function renderInfoRow() {
      const xName = playerName("X");
      const oName = playerName("O");
      const xActive =
        gs.currentPlayer === "X" && !gs.winner ? "tag-active" : "";
      const oActive =
        gs.currentPlayer === "O" && !gs.winner ? "tag-active" : "";
      return `
        <div class="uttt-info-row">
          <span class="player-tag tag-x ${xActive}">✕ ${esc(xName)}</span>
          <span style="color:#334155;">vs</span>
          <span class="player-tag tag-o ${oActive}">○ ${esc(oName)}</span>
        </div>
      `;
    }

    function renderMegaBoard() {
      const lastMove =
        gs.moveHistory.length > 0
          ? gs.moveHistory[gs.moveHistory.length - 1]
          : null;

      let html = '<div class="uttt-mega">';
      for (let bi = 0; bi < 9; bi++) {
        const bw = gs.boardWinners[bi];
        const isActive =
          !gs.winner &&
          !bw &&
          (gs.activeBoard === null || gs.activeBoard === bi);
        let cls = "uttt-board";
        if (isActive && isMyTurn()) cls += " active-board";
        if (bw === "X") cls += " won-x";
        else if (bw === "O") cls += " won-o";
        else if (bw === "D") cls += " won-d";

        html += `<div class="${cls}">`;

        // Overlay for won/drawn boards
        if (bw) {
          if (bw === "D") {
            html += `<div class="uttt-overlay ov-d">DRAW</div>`;
          } else {
            html += `<div class="uttt-overlay ov-${bw.toLowerCase()}">${bw === "X" ? "✕" : "○"}</div>`;
          }
        }

        for (let ci = 0; ci < 9; ci++) {
          const v = gs.boards[bi][ci];
          const taken = v !== null;
          const dead = !!bw || (!isActive && !gs.winner);
          const isLast =
            lastMove && lastMove.boardIdx === bi && lastMove.cellIdx === ci;
          const isPending =
            pendingMove &&
            pendingMove.boardIdx === bi &&
            pendingMove.cellIdx === ci;
          let ccls = "uttt-cell";
          if (taken) ccls += " taken";
          if (dead && !taken) ccls += " dead";
          if (isLast && !isPending) ccls += " last-move";
          if (isPending) ccls += " pending";

          const canClick = !taken && !dead && isMyTurn();
          html += `<div class="${ccls}" ${canClick ? `data-b="${bi}" data-c="${ci}"` : ""}>`;
          if (v === "X") html += '<span class="cx">✕</span>';
          else if (v === "O") html += '<span class="co">○</span>';
          html += "</div>";
        }

        html += "</div>";
      }
      html += "</div>";
      return html;
    }

    function renderWinnerControls() {
      const canReset = isHost || isLocal;
      return `
        <div class="uttt-winner-banner">
          ${canReset ? '<button class="uttt-btn uttt-btn-primary" id="uttt-reset">Play Again</button>' : "<p>Waiting for host to restart...</p>"}
          <button class="uttt-btn uttt-btn-secondary" onclick="window.backToLobby && backToLobby()">Back to Lobby</button>
        </div>
      `;
    }

    function esc(s) {
      const d = document.createElement("div");
      d.textContent = s;
      return d.innerHTML;
    }

    // ── Initial render ──
    render();

    if (isHost) {
      api.speak(
        `Ultimate Tic Tac Toe! ${playerName("X")} is X, ${playerName("O")} is O. X goes first.`,
      );
    }

    return {
      destroy() {
        api.off("uttt-sync", () => {});
        api.off("uttt-move", () => {});
        api.off("uttt-reset", () => {});
        container.innerHTML = "";
      },
    };
  },
};
