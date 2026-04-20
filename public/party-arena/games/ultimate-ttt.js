// ═══════════════════════════════════════════════
//  ULTIMATE TIC-TAC-TOE — Party Arena Game Module
// ═══════════════════════════════════════════════

const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkWinner(board) {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return null;
}

function isFull(board) {
  return board.every(c => c !== null);
}

export default {
  create(container, api) {
    const players = api.getPlayers();
    const me = api.getMe();
    const isLocal = api.isLocal();
    const isHost = api.isHost();
    const v = api.cssVars;

    // ── Player assignment ──
    // Host = X, Guest = O. In local mode, both play on same device.
    let myMark = null;
    let opponentName = '';

    if (isLocal) {
      myMark = null; // both marks played locally
    } else {
      myMark = isHost ? 'X' : 'O';
      const opponent = players.find(p => p.id !== me.id);
      opponentName = opponent ? opponent.name : 'Opponent';
    }

    // ── Game state ──
    let boards = Array.from({ length: 9 }, () => Array(9).fill(null));
    let meta = Array(9).fill(null); // winner per sub-board ('X','O','D',null)
    let turn = 'X';
    let activeBoard = null; // which sub-board is forced, or null = free
    let moveCount = 0;
    let history = [];
    let gameOver = false;
    let globalWinner = null;

    // ── Derived helpers ──
    function getPlayableBoards() {
      if (gameOver) return new Set();
      if (activeBoard !== null && meta[activeBoard] === null) return new Set([activeBoard]);
      const s = new Set();
      for (let i = 0; i < 9; i++) if (meta[i] === null) s.add(i);
      return s;
    }

    function canIPlay() {
      if (isLocal) return true;
      return turn === myMark;
    }

    // ── Render ──
    function render() {
      const playable = getPlayableBoards();
      const gw = checkWinner(meta);
      const isDraw = !gw && meta.every(v => v !== null);
      gameOver = !!gw || isDraw;
      globalWinner = gw;

      // Status line
      let statusHtml = '';
      if (gameOver) {
        const color = gw === 'X' ? '#F43F5E' : gw === 'O' ? '#3B82F6' : v.textSec;
        const text = gw ? `${gw} wins!` : "It's a draw!";
        statusHtml = `<span style="font-weight:800;font-size:18px;color:${color}">${text}</span>`;
        if (gw) api.speak(`${gw} wins the game!`);
      } else {
        const markSvg = turn === 'X' ? xSvg(16) : oSvg(16);
        const hint = activeBoard !== null ? `Board ${activeBoard + 1}` : 'Free choice';
        const myTurn = canIPlay();
        const turnLabel = isLocal ? `${turn}'s turn` : (myTurn ? 'Your turn' : `${opponentName}'s turn`);
        statusHtml = `
          <span style="opacity:0.5">${turnLabel}</span>
          ${markSvg}
          <span style="opacity:0.4;font-size:12px">${hint}</span>
        `;
      }

      // Build grid
      let gridHtml = '';
      for (let mi = 0; mi < 9; mi++) {
        const isActive = playable.has(mi);
        const decided = meta[mi] && meta[mi] !== 'D';
        const drawn = meta[mi] === 'D';

        let bg = 'rgba(255,255,255,0.03)';
        let border = '2px solid rgba(255,255,255,0.08)';
        let shadow = 'none';

        if (meta[mi] === 'X') { bg = 'rgba(244,63,94,0.10)'; border = '2px solid rgba(244,63,94,0.25)'; }
        else if (meta[mi] === 'O') { bg = 'rgba(59,130,246,0.10)'; border = '2px solid rgba(59,130,246,0.25)'; }
        else if (drawn) { bg = 'rgba(120,120,120,0.06)'; border = '2px solid rgba(120,120,120,0.12)'; }
        else if (isActive && !gameOver && canIPlay()) {
          bg = 'rgba(250,204,21,0.08)'; border = '2px solid rgba(250,204,21,0.5)';
          shadow = '0 0 14px rgba(250,204,21,0.12)';
        }

        let cellsHtml = '';
        for (let ci = 0; ci < 9; ci++) {
          const cell = boards[mi][ci];
          const canClick = isActive && cell === null && !gameOver && !meta[mi] && canIPlay();
          const cellBg = canClick ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.015)';
          const opacity = (decided || drawn) ? 0.3 : 1;
          const cursor = canClick ? 'pointer' : 'default';
          const mark = cell === 'X' ? xSvg(16) : cell === 'O' ? oSvg(16) : '';

          cellsHtml += `
            <button class="uttt-cell" data-macro="${mi}" data-cell="${ci}"
              style="width:100%;aspect-ratio:1;display:flex;align-items:center;justify-content:center;
              background:${cellBg};border:1px solid rgba(255,255,255,0.05);border-radius:3px;
              cursor:${cursor};padding:0;transition:background 0.12s;opacity:${opacity};">
              ${mark}
            </button>
          `;
        }

        // Big stamp overlay
        let stampHtml = '';
        if (decided) {
          const stampBg = meta[mi] === 'X' ? 'rgba(244,63,94,0.08)' : 'rgba(59,130,246,0.08)';
          const stampMark = meta[mi] === 'X' ? xSvg(48) : oSvg(48);
          stampHtml = `
            <div style="position:absolute;inset:0;z-index:3;display:flex;align-items:center;
              justify-content:center;pointer-events:none;border-radius:8px;background:${stampBg}">
              ${stampMark}
            </div>
          `;
        }

        gridHtml += `
          <div style="position:relative;display:grid;grid-template-columns:repeat(3,1fr);
            gap:2px;border-radius:8px;padding:3px;background:${bg};border:${border};
            box-shadow:${shadow};transition:all 0.2s ease;">
            ${stampHtml}
            ${cellsHtml}
          </div>
        `;
      }

      container.innerHTML = `
        <div style="min-height:100%;display:flex;flex-direction:column;align-items:center;
          justify-content:center;padding:20px 8px;font-family:'Quicksand',sans-serif;color:#e2e8f0;">

          <h2 style="font-family:'Righteous',cursive;font-size:clamp(15px,3.5vw,22px);font-weight:800;
            letter-spacing:-0.5px;margin:0 0 6px;
            background:linear-gradient(135deg,#F43F5E,#A855F7,#3B82F6);
            -webkit-background-clip:text;-webkit-text-fill-color:transparent;">
            ULTIMATE TIC-TAC-TOE
          </h2>

          <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;font-size:14px;">
            ${statusHtml}
          </div>

          <div id="uttt-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;
            width:min(88vw,420px);aspect-ratio:1;padding:3px;">
            ${gridHtml}
          </div>

          <div style="display:flex;gap:10px;margin-top:16px;">
            <button id="uttt-undo" style="padding:8px 18px;border-radius:6px;
              border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.05);
              color:#e2e8f0;font-family:'Quicksand',sans-serif;font-size:13px;font-weight:600;
              cursor:${history.length ? 'pointer' : 'not-allowed'};
              opacity:${history.length ? 1 : 0.35};transition:all 0.15s;">
              Undo
            </button>
            <button id="uttt-reset" style="padding:8px 18px;border-radius:6px;
              border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.05);
              color:#e2e8f0;font-family:'Quicksand',sans-serif;font-size:13px;font-weight:600;
              cursor:pointer;transition:all 0.15s;">
              New Game
            </button>
            <button id="uttt-leave" style="padding:8px 18px;border-radius:6px;
              border:1px solid rgba(248,113,113,0.2);background:rgba(248,113,113,0.1);
              color:#f87171;font-family:'Quicksand',sans-serif;font-size:13px;font-weight:600;
              cursor:pointer;transition:all 0.15s;">
              Leave
            </button>
          </div>

          ${!isLocal ? `
          <div style="margin-top:12px;font-size:12px;opacity:0.4;">
            You are <strong style="color:${myMark === 'X' ? '#F43F5E' : '#3B82F6'}">${myMark}</strong>
            ${myMark === 'X' ? '(goes first)' : ''}
          </div>` : ''}

          <details style="margin-top:18px;max-width:420px;font-size:12px;opacity:0.45;cursor:pointer;">
            <summary style="font-weight:600">How to play</summary>
            <p style="margin-top:8px;line-height:1.7;padding:0 4px;">
              The board has 9 small tic-tac-toe grids in a 3×3 pattern.
              Where you play in a small grid determines which grid your opponent must play in next
              (matching position on the big board). Win a small grid and it counts as your mark on
              the big board. Get 3 in a row on the big board to win.
              Sent to an already-decided grid? You get free choice.
              The yellow glow shows where you must play.
            </p>
          </details>
        </div>
      `;

      // ── Attach event listeners ──
      container.querySelectorAll('.uttt-cell').forEach(btn => {
        const mi = parseInt(btn.dataset.macro);
        const ci = parseInt(btn.dataset.cell);
        btn.addEventListener('click', () => handleClick(mi, ci));

        // Hover effects
        btn.addEventListener('mouseenter', () => {
          const isClickable = playable.has(mi) && boards[mi][ci] === null && !gameOver && !meta[mi] && canIPlay();
          if (isClickable) btn.style.background = 'rgba(255,255,255,0.13)';
        });
        btn.addEventListener('mouseleave', () => {
          const isClickable = playable.has(mi) && boards[mi][ci] === null && !gameOver && !meta[mi] && canIPlay();
          if (isClickable) btn.style.background = 'rgba(255,255,255,0.06)';
        });
      });

      const undoBtn = container.querySelector('#uttt-undo');
      if (undoBtn) undoBtn.addEventListener('click', undo);

      const resetBtn = container.querySelector('#uttt-reset');
      if (resetBtn) resetBtn.addEventListener('click', resetGame);

      const leaveBtn = container.querySelector('#uttt-leave');
      if (leaveBtn) leaveBtn.addEventListener('click', () => api.endGame());
    }

    // ── SVG helpers ──
    function xSvg(sz) {
      const s = sz * 0.35;
      const c = sz / 2;
      const sw = sz > 30 ? 6 : 2.5;
      return `<svg width="${sz}" height="${sz}" viewBox="0 0 ${sz} ${sz}">
        <line x1="${c - s}" y1="${c - s}" x2="${c + s}" y2="${c + s}" stroke="#F43F5E" stroke-width="${sw}" stroke-linecap="round"/>
        <line x1="${c + s}" y1="${c - s}" x2="${c - s}" y2="${c + s}" stroke="#F43F5E" stroke-width="${sw}" stroke-linecap="round"/>
      </svg>`;
    }

    function oSvg(sz) {
      const c = sz / 2;
      const sw = sz > 30 ? 6 : 2.5;
      return `<svg width="${sz}" height="${sz}" viewBox="0 0 ${sz} ${sz}">
        <circle cx="${c}" cy="${c}" r="${sz * 0.32}" fill="none" stroke="#3B82F6" stroke-width="${sw}"/>
      </svg>`;
    }

    // ── Move logic ──
    function applyMove(mi, ci, mark) {
      history.push({
        boards: boards.map(b => [...b]),
        meta: [...meta],
        turn,
        activeBoard,
        moveCount,
      });

      boards[mi][ci] = mark;

      if (!meta[mi]) {
        const w = checkWinner(boards[mi]);
        if (w) meta[mi] = w;
        else if (isFull(boards[mi])) meta[mi] = 'D';
      }

      let nextActive = ci;
      if (meta[nextActive] !== null) nextActive = null;

      turn = turn === 'X' ? 'O' : 'X';
      activeBoard = nextActive;
      moveCount++;

      render();
    }

    function handleClick(mi, ci) {
      if (gameOver) return;
      if (!canIPlay()) return;

      const playable = getPlayableBoards();
      if (!playable.has(mi)) return;
      if (boards[mi][ci] !== null) return;

      if (isLocal) {
        // Local pass-and-play: apply directly
        applyMove(mi, ci, turn);
      } else {
        // Online: send move to opponent
        api.send('uttt-move', { mi, ci, mark: turn });
        applyMove(mi, ci, turn);
      }
    }

    function undo() {
      if (history.length === 0) return;
      // In online mode, only allow undo if it's a local-only game or both agree
      // For simplicity: only allow undo in local mode
      if (!isLocal) return;

      const prev = history.pop();
      boards = prev.boards;
      meta = prev.meta;
      turn = prev.turn;
      activeBoard = prev.activeBoard;
      moveCount = prev.moveCount;
      gameOver = false;
      globalWinner = null;
      render();
    }

    function resetGame() {
      boards = Array.from({ length: 9 }, () => Array(9).fill(null));
      meta = Array(9).fill(null);
      turn = 'X';
      activeBoard = null;
      moveCount = 0;
      history = [];
      gameOver = false;
      globalWinner = null;

      if (!isLocal) {
        api.send('uttt-reset', {});
      }
      render();
    }

    // ── Network events (online mode) ──
    if (!isLocal) {
      api.on('uttt-move', (payload) => {
        const { mi, ci, mark } = payload;
        // Only apply if it's actually the opponent's move
        if (boards[mi][ci] === null) {
          applyMove(mi, ci, mark);
        }
      });

      api.on('uttt-reset', () => {
        boards = Array.from({ length: 9 }, () => Array(9).fill(null));
        meta = Array(9).fill(null);
        turn = 'X';
        activeBoard = null;
        moveCount = 0;
        history = [];
        gameOver = false;
        globalWinner = null;
        render();
      });

      api.on('player-left', () => {
        // Opponent disconnected
        gameOver = true;
        render();
      });
    }

    // ── Initial render ──
    render();

    // ── Destroy ──
    return {
      destroy() {
        container.innerHTML = '';
      },
    };
  },
};