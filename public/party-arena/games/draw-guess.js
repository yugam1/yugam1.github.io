// ═══════════════════════════════════════════════
//  DRAW & GUESS — Party Arena
//  2-player Pictionary: roles alternate every round. Whoever is
//  drawing that round is the sole authority for that round's secret
//  word — it's generated locally and never transmitted, so the other
//  player genuinely can't know it. Turn order is fully deterministic
//  from round parity + host/guest role, so no coordination message is
//  needed to decide whose turn it is.
// ═══════════════════════════════════════════════

const WORD_BANK = [
  "Guitar", "Pizza", "Robot", "Rainbow", "Castle", "Dragon", "Bicycle", "Umbrella",
  "Volcano", "Penguin", "Astronaut", "Skateboard", "Waterfall", "Campfire", "Lighthouse",
  "Octopus", "Butterfly", "Snowman", "Pirate", "Dinosaur", "Helicopter", "Cactus",
  "Mermaid", "Unicorn", "Sandwich", "Telescope", "Bonfire", "Fireworks", "Kangaroo",
  "Jellyfish", "Tornado", "Igloo", "Saxophone", "Pretzel", "Wizard", "Ninja", "Vampire",
  "Zombie", "Spaceship", "Submarine", "Windmill", "Beehive", "Cupcake", "Pancake",
  "Bowling", "Trampoline", "Accordion", "Chandelier", "Scarecrow", "Peacock", "Flamingo",
  "Koala", "Panda", "Hedgehog", "Raccoon", "Otter", "Sloth", "Narwhal", "Chameleon",
  "Toucan", "Avocado", "Broccoli", "Waffle", "Donut", "Popcorn", "Marshmallow",
  "Lava Lamp", "Disco Ball", "Roller Coaster", "Ferris Wheel", "Hot Air Balloon",
  "Snow Globe", "Compass", "Anchor", "Treasure Chest", "Genie Lamp", "Magic Carpet",
  "Crystal Ball", "Time Machine", "Robot Arm", "Alien", "UFO", "Black Hole",
  "Shooting Star", "Puffer Fish", "Seahorse", "Starfish", "Coral Reef", "Iceberg",
  "Glacier", "Quicksand", "Sand Castle", "Beach Ball", "Surfboard", "Kite", "Yo-yo",
  "Rubber Duck", "Piggy Bank", "Traffic Light", "Fire Hydrant", "Skyscraper", "Hammock",
  "Tent", "Backpack", "Binoculars", "Flashlight", "Treasure Map", "Sailboat", "Chef Hat",
  "Wine Glass", "Birthday Cake", "Balloon Animal", "Confetti", "Piñata", "Love Letter",
  "Heart Balloon", "Teddy Bear", "Rose Bouquet", "Wedding Ring", "Slow Dance",
  "Candlelight Dinner", "Ice Cream Cone", "Popcorn Bucket", "Movie Ticket",
];

const COLORS = ["#f1f5f9", "#f87171", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#f472b6"];
const BRUSH_SIZES = [
  { label: "S", w: 4 },
  { label: "M", w: 8 },
  { label: "L", w: 14 },
];

const CANVAS_W = 800;
const CANVAS_H = 500;

function pickWord(usedSet) {
  const pool = WORD_BANK.filter((w) => !usedSet.has(w));
  const list = pool.length ? pool : WORD_BANK;
  const w = list[Math.floor(Math.random() * list.length)];
  usedSet.add(w);
  return w;
}

function wordShape(word) {
  return word.split(" ").map((w) => w.length);
}

function renderBlanks(shape) {
  return shape.map((len) => Array(len).fill("_").join(" ")).join("   ");
}

function normalizeGuess(s) {
  return s.trim().toLowerCase().replace(/[^a-z0-9 ]/g, "");
}

export default {
  id: "draw-guess",
  name: "Draw & Guess",

  create(container, api) {
    const me = api.getMe();
    const isHost = api.isHost();
    const v = api.cssVars;
    const players = api.getPlayers();
    const opponent = players.find((p) => p.id !== me.id);
    const opponentName = opponent ? opponent.name : "Partner";

    // ── State ──────────────────────────────────
    let totalTurns = 6; // turnsPerPlayer * 2
    let turnsPerPlayer = 3;
    let roundSeconds = 90;
    let round = 0;
    let scores = { [me.id]: 0, [opponent?.id]: 0 };
    let iAmDrawer = false;
    let secretWord = null; // only ever set on the drawer's own device
    let shape = [];
    let roundEnded = false; // guards against a guess and a timeout racing to end the same round twice
    let strokes = []; // {color,width,points:[{x,y}]}
    let guessFeed = []; // {id, from:'me'|'them', text, state:'pending'|'correct'|'wrong'}
    let myGuessSeq = 0;
    let timerStart = 0;
    let timerId = null;
    let usedWords = new Set();

    // ── Styles ─────────────────────────────────
    const sty = document.createElement("style");
    sty.textContent = `
.dg{position:relative;height:100%;display:flex;flex-direction:column;font-family:${v.fontBody};color:${v.text};overflow:hidden}
.dg-wrap{flex:1;display:flex;flex-direction:column;align-items:center;overflow-y:auto;padding:24px 16px 40px}
.dg-card{background:${v.bgGlass};border:1px solid rgba(255,255,255,.08);border-radius:${v.radius};padding:22px;width:100%;max-width:460px}
.dg-title{font-family:${v.fontDisplay};font-size:1.3rem;color:${v.accent};text-align:center;margin-bottom:14px}
.dg-section-label{font-size:.72rem;text-transform:uppercase;letter-spacing:1px;color:${v.textSec};margin:16px 0 8px;font-weight:700}
.dg-chip-row{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.dg-chip{padding:8px 14px;border-radius:${v.radiusPill};background:${v.bgCard};border:1.5px solid rgba(255,255,255,.1);color:${v.textSec};font-size:.8rem;font-weight:700;cursor:pointer;transition:all .2s}
.dg-chip:hover{border-color:${v.accent}}
.dg-chip.active{background:${v.accentSoft};border-color:${v.accent};color:${v.accent}}
.dg-start-btn{width:100%;margin-top:18px;padding:14px;border:none;border-radius:${v.radiusSm};background:linear-gradient(135deg,${v.accent},#f59e0b);color:#0a0e1a;font-weight:800;font-size:.92rem;cursor:pointer;text-transform:uppercase;letter-spacing:.5px}
.dg-start-btn:active{transform:scale(.97)}
.dg-spinner{width:44px;height:44px;border:3px solid rgba(255,255,255,.1);border-top-color:${v.accent};border-radius:50%;animation:dgspin .8s linear infinite;margin:40px auto 16px}
@keyframes dgspin{to{transform:rotate(360deg)}}
.dg-wait-txt{color:${v.textSec};font-size:.9rem;text-align:center}
.dg-hud{display:flex;align-items:center;gap:10px;padding:8px 12px;background:rgba(0,0,0,.3);border-bottom:1px solid rgba(255,255,255,.08);flex-wrap:wrap;flex-shrink:0}
.dg-hud-item{font-size:.76rem;color:${v.textSec};font-weight:700;white-space:nowrap}
.dg-hud-item b{color:${v.text}}
.dg-timer{margin-left:auto;font-size:.9rem;font-weight:800;color:${v.accent}}
.dg-word-banner{padding:8px 12px;text-align:center;font-size:1rem;font-weight:800;letter-spacing:2px;color:${v.text};background:rgba(0,0,0,.2);flex-shrink:0}
.dg-word-banner.blanks{color:${v.textSec};letter-spacing:4px}
.dg-play-wrap{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden}
.dg-canvas-wrap{flex:1;min-height:0;position:relative;background:#0d1220;display:flex;align-items:center;justify-content:center;padding:8px}
.dg-canvas-wrap svg{width:100%;height:100%;max-height:100%;touch-action:none;background:rgba(255,255,255,.02);border-radius:${v.radiusSm};border:1px solid rgba(255,255,255,.08)}
.dg-canvas-wrap svg.drawable{cursor:crosshair}
.dg-toolbar{display:flex;align-items:center;gap:8px;padding:8px 12px;flex-wrap:wrap;flex-shrink:0;border-top:1px solid rgba(255,255,255,.06)}
.dg-swatch{width:24px;height:24px;border-radius:50%;cursor:pointer;border:2px solid transparent}
.dg-swatch.active{border-color:${v.text};transform:scale(1.15)}
.dg-brush-btn{padding:4px 10px;border-radius:${v.radiusPill};background:${v.bgCard};border:1.5px solid rgba(255,255,255,.1);color:${v.textSec};font-size:.72rem;font-weight:700;cursor:pointer}
.dg-brush-btn.active{background:${v.accentSoft};border-color:${v.accent};color:${v.accent}}
.dg-clear-btn{margin-left:auto;padding:6px 12px;border-radius:${v.radiusPill};background:rgba(248,113,113,.12);border:1px solid rgba(248,113,113,.25);color:${v.danger};font-size:.7rem;font-weight:700;cursor:pointer}
.dg-guess-panel{flex-shrink:0;border-top:1px solid rgba(255,255,255,.08);background:rgba(0,0,0,.25);padding:8px 12px;display:flex;flex-direction:column;gap:6px;max-height:34%;}
.dg-feed{overflow-y:auto;display:flex;flex-direction:column;gap:4px;font-size:.8rem;padding-right:2px}
.dg-feed-item{display:flex;align-items:center;gap:6px;padding:3px 8px;border-radius:${v.radiusSm};background:${v.bgCard}}
.dg-feed-item.correct{background:rgba(52,211,153,.14);color:${v.success}}
.dg-feed-item.wrong{opacity:.7}
.dg-feed-who{font-weight:700;font-size:.7rem;color:${v.textSec}}
.dg-guess-input-row{display:flex;gap:8px}
.dg-guess-input{flex:1;padding:9px 12px;border-radius:${v.radiusSm};border:1.5px solid rgba(255,255,255,.12);background:${v.bgCard};color:${v.text};font-family:${v.fontBody};font-size:.85rem}
.dg-guess-input:focus{outline:none;border-color:${v.accent}}
.dg-guess-submit{padding:9px 16px;border-radius:${v.radiusSm};border:none;background:${v.accent};color:#0a0e1a;font-weight:800;font-size:.8rem;cursor:pointer}
.dg-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(5,7,15,.78);backdrop-filter:blur(4px);z-index:80}
.dg-overlay.hidden{display:none}
.dg-overlay-card{background:${v.bgGlass};border:1px solid ${v.accent};border-radius:${v.radius};padding:28px 26px;text-align:center;max-width:340px}
.dg-overlay-card h2{font-family:${v.fontDisplay};color:${v.accent};font-size:1.4rem;margin-bottom:10px}
.dg-overlay-word{font-size:1.1rem;font-weight:800;letter-spacing:1px;margin-bottom:8px}
.dg-overlay-sub{font-size:.82rem;color:${v.textSec};margin-bottom:6px}
.dg-score-row{display:flex;justify-content:center;gap:22px;margin-top:14px;font-size:.85rem}
.dg-score-name{color:${v.textSec}}
.dg-score-val{font-weight:800;color:${v.text};font-size:1.1rem}
.dg-next-txt{margin-top:14px;font-size:.72rem;color:${v.textMuted}}
.dg-leave-btn{position:absolute;top:10px;right:10px;z-index:90;padding:6px 12px;border-radius:${v.radiusPill};background:rgba(248,113,113,.12);border:1px solid rgba(248,113,113,.25);color:${v.danger};font-size:.7rem;font-weight:700;cursor:pointer}
    `;
    container.appendChild(sty);

    const root = document.createElement("div");
    root.className = "dg";
    root.innerHTML = `
<button class="dg-leave-btn" id="dg-leave">Leave</button>

<div class="dg-wrap" id="dg-setup-wrap">
  <div class="dg-card">
    <div class="dg-title">🎨 Draw &amp; Guess</div>
    <div class="dg-section-label">Turns Per Player</div>
    <div class="dg-chip-row" id="dg-turns-chips"></div>
    <div class="dg-section-label">Time Per Round</div>
    <div class="dg-chip-row" id="dg-time-chips"></div>
    <button class="dg-start-btn" id="dg-start-btn">▶ Start Game</button>
  </div>
</div>

<div class="dg-wrap" id="dg-waiting-wrap" style="display:none">
  <div class="dg-spinner"></div>
  <div class="dg-wait-txt">Waiting for ${opponentName} to start the game…</div>
</div>

<div class="dg-play-wrap" id="dg-play-wrap" style="display:none">
  <div class="dg-hud">
    <div class="dg-hud-item" id="dg-hud-round">Round 0/0</div>
    <div class="dg-hud-item" id="dg-hud-role">—</div>
    <div class="dg-hud-item">You <b id="dg-hud-my-score">0</b> · ${opponentName} <b id="dg-hud-opp-score">0</b></div>
    <div class="dg-timer" id="dg-timer">0:00</div>
  </div>
  <div class="dg-word-banner" id="dg-word-banner"></div>
  <div class="dg-canvas-wrap">
    <svg id="dg-svg" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}" preserveAspectRatio="xMidYMid meet"></svg>
  </div>
  <div class="dg-toolbar" id="dg-toolbar" style="display:none">
    ${COLORS.map((c, i) => `<div class="dg-swatch${i === 0 ? " active" : ""}" data-color="${c}" style="background:${c}"></div>`).join("")}
    ${BRUSH_SIZES.map((b, i) => `<div class="dg-brush-btn${i === 1 ? " active" : ""}" data-w="${b.w}">${b.label}</div>`).join("")}
    <button class="dg-clear-btn" id="dg-clear-btn">🗑 Clear</button>
  </div>
  <div class="dg-guess-panel" id="dg-guess-panel">
    <div class="dg-feed" id="dg-feed"></div>
    <div class="dg-guess-input-row" id="dg-guess-input-row" style="display:none">
      <input class="dg-guess-input" id="dg-guess-input" placeholder="Type your guess…" autocomplete="off" />
      <button class="dg-guess-submit" id="dg-guess-submit">Guess</button>
    </div>
  </div>
</div>

<div class="dg-overlay hidden" id="dg-round-overlay">
  <div class="dg-overlay-card">
    <h2 id="dg-round-overlay-title"></h2>
    <div class="dg-overlay-word" id="dg-round-overlay-word"></div>
    <div class="dg-overlay-sub" id="dg-round-overlay-sub"></div>
    <div class="dg-score-row">
      <div><div class="dg-score-name">You</div><div class="dg-score-val" id="dg-ov-my-score">0</div></div>
      <div><div class="dg-score-name">${opponentName}</div><div class="dg-score-val" id="dg-ov-opp-score">0</div></div>
    </div>
    <div class="dg-next-txt" id="dg-round-overlay-next"></div>
  </div>
</div>

<div class="dg-overlay hidden" id="dg-final-overlay">
  <div class="dg-overlay-card">
    <h2 id="dg-final-title">🏆 Game Over</h2>
    <div class="dg-score-row">
      <div><div class="dg-score-name">You</div><div class="dg-score-val" id="dg-final-my-score">0</div></div>
      <div><div class="dg-score-name">${opponentName}</div><div class="dg-score-val" id="dg-final-opp-score">0</div></div>
    </div>
    ${isHost ? '<button class="dg-start-btn" id="dg-play-again-btn" style="margin-top:18px">🔁 Play Again</button>' : '<div class="dg-wait-txt" style="margin-top:18px">Waiting for host to start a new game…</div>'}
  </div>
</div>
    `;
    container.appendChild(root);

    const setupWrap = root.querySelector("#dg-setup-wrap");
    const waitingWrap = root.querySelector("#dg-waiting-wrap");
    const playWrap = root.querySelector("#dg-play-wrap");
    const roundOverlay = root.querySelector("#dg-round-overlay");
    const finalOverlay = root.querySelector("#dg-final-overlay");
    const svg = root.querySelector("#dg-svg");
    const toolbar = root.querySelector("#dg-toolbar");
    const wordBanner = root.querySelector("#dg-word-banner");
    const feedEl = root.querySelector("#dg-feed");
    const guessInputRow = root.querySelector("#dg-guess-input-row");
    const guessInput = root.querySelector("#dg-guess-input");
    const timerEl = root.querySelector("#dg-timer");

    function showScreen(s) {
      setupWrap.style.display = s === "setup" ? "flex" : "none";
      waitingWrap.style.display = s === "waiting" ? "flex" : "none";
      playWrap.style.display = s === "playing" ? "flex" : "none";
      roundOverlay.classList.toggle("hidden", s !== "round-end");
      finalOverlay.classList.toggle("hidden", s !== "final");
      if (s === "playing" || s === "round-end") playWrap.style.display = "flex";
    }

    // ── Setup UI (host only) ──────────────────
    let color = COLORS[0];
    let brushW = BRUSH_SIZES[1].w;

    if (isHost) {
      const TURN_OPTS = [2, 3, 5];
      const TIME_OPTS = [60, 90, 120];
      const turnsRow = root.querySelector("#dg-turns-chips");
      const timeRow = root.querySelector("#dg-time-chips");
      turnsRow.innerHTML = TURN_OPTS.map((n) => `<div class="dg-chip${n === turnsPerPlayer ? " active" : ""}" data-n="${n}">${n}</div>`).join("");
      timeRow.innerHTML = TIME_OPTS.map((n) => `<div class="dg-chip${n === roundSeconds ? " active" : ""}" data-n="${n}">${n}s</div>`).join("");
      turnsRow.querySelectorAll(".dg-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
          turnsPerPlayer = Number(chip.dataset.n);
          turnsRow.querySelectorAll(".dg-chip").forEach((c) => c.classList.toggle("active", c === chip));
        });
      });
      timeRow.querySelectorAll(".dg-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
          roundSeconds = Number(chip.dataset.n);
          timeRow.querySelectorAll(".dg-chip").forEach((c) => c.classList.toggle("active", c === chip));
        });
      });
      root.querySelector("#dg-start-btn").addEventListener("click", () => startGame());
    } else {
      showScreen("waiting");
    }

    root.querySelector("#dg-leave").addEventListener("click", () => api.endGame());

    // ── Toolbar wiring ────────────────────────
    toolbar.querySelectorAll(".dg-swatch").forEach((sw) => {
      sw.addEventListener("click", () => {
        color = sw.dataset.color;
        toolbar.querySelectorAll(".dg-swatch").forEach((s) => s.classList.toggle("active", s === sw));
      });
    });
    toolbar.querySelectorAll(".dg-brush-btn").forEach((b) => {
      b.addEventListener("click", () => {
        brushW = Number(b.dataset.w);
        toolbar.querySelectorAll(".dg-brush-btn").forEach((x) => x.classList.toggle("active", x === b));
      });
    });
    root.querySelector("#dg-clear-btn").addEventListener("click", () => {
      if (!iAmDrawer) return;
      clearCanvas();
      api.send("dg-clear", {});
    });

    // ── Drawing (SVG strokes in normalized 0..CANVAS space) ──
    let activeStroke = null;
    let lastSendAt = 0;

    function svgPoint(evt) {
      const pt = svg.createSVGPoint();
      pt.x = evt.clientX;
      pt.y = evt.clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return { x: 0, y: 0 };
      const p = pt.matrixTransform(ctm.inverse());
      return { x: Math.max(0, Math.min(CANVAS_W, p.x)), y: Math.max(0, Math.min(CANVAS_H, p.y)) };
    }

    function pathD(points) {
      if (!points.length) return "";
      return "M" + points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L");
    }

    function addStrokeEl(stroke) {
      const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pathEl.setAttribute("fill", "none");
      pathEl.setAttribute("stroke", stroke.color);
      pathEl.setAttribute("stroke-width", String(stroke.width));
      pathEl.setAttribute("stroke-linecap", "round");
      pathEl.setAttribute("stroke-linejoin", "round");
      pathEl.setAttribute("d", pathD(stroke.points));
      svg.appendChild(pathEl);
      stroke._el = pathEl;
    }

    function clearCanvas() {
      strokes = [];
      svg.innerHTML = "";
    }

    function onPointerDown(evt) {
      if (!iAmDrawer) return;
      evt.preventDefault();
      const p = svgPoint(evt);
      activeStroke = { color, width: brushW, points: [p] };
      strokes.push(activeStroke);
      addStrokeEl(activeStroke);
      api.send("dg-stroke-start", { x: p.x, y: p.y, color, width: brushW });
      svg.setPointerCapture?.(evt.pointerId);
    }
    function onPointerMove(evt) {
      if (!iAmDrawer || !activeStroke) return;
      evt.preventDefault();
      const p = svgPoint(evt);
      activeStroke.points.push(p);
      activeStroke._el.setAttribute("d", pathD(activeStroke.points));
      const now = performance.now();
      if (now - lastSendAt > 35) {
        lastSendAt = now;
        api.send("dg-stroke-point", { x: p.x, y: p.y });
      }
    }
    function onPointerUp() {
      if (!iAmDrawer || !activeStroke) return;
      activeStroke = null;
    }
    svg.addEventListener("pointerdown", onPointerDown);
    svg.addEventListener("pointermove", onPointerMove);
    svg.addEventListener("pointerup", onPointerUp);
    svg.addEventListener("pointerleave", onPointerUp);

    // Remote drawing playback
    api.on("dg-stroke-start", (payload) => {
      if (iAmDrawer) return;
      const stroke = { color: payload.color, width: payload.width, points: [{ x: payload.x, y: payload.y }] };
      strokes.push(stroke);
      addStrokeEl(stroke);
    });
    api.on("dg-stroke-point", (payload) => {
      if (iAmDrawer) return;
      const stroke = strokes[strokes.length - 1];
      if (!stroke) return;
      stroke.points.push({ x: payload.x, y: payload.y });
      stroke._el.setAttribute("d", pathD(stroke.points));
    });
    api.on("dg-clear", () => {
      if (iAmDrawer) return;
      clearCanvas();
    });

    // ── Guess feed ─────────────────────────────
    function renderFeedItem(item) {
      const el = document.createElement("div");
      el.className = "dg-feed-item" + (item.state === "correct" ? " correct" : item.state === "wrong" ? " wrong" : "");
      el.dataset.id = item.id;
      const who = item.from === "me" ? "You" : opponentName;
      const mark = item.state === "correct" ? "✓" : item.state === "wrong" ? "✗" : "…";
      el.innerHTML = `<span class="dg-feed-who">${who}:</span> <span>${item.text}</span> <span>${mark}</span>`;
      feedEl.appendChild(el);
      feedEl.scrollTop = feedEl.scrollHeight;
    }

    function markFeedItem(localId, state) {
      const el = feedEl.querySelector(`[data-id="${localId}"]`);
      if (!el) return;
      el.className = "dg-feed-item" + (state === "correct" ? " correct" : " wrong");
      const spans = el.querySelectorAll("span");
      if (spans[2]) spans[2].textContent = state === "correct" ? "✓" : "✗";
    }

    function submitGuess() {
      if (iAmDrawer) return;
      const text = guessInput.value.trim();
      if (!text) return;
      guessInput.value = "";
      const id = `${me.id}-${myGuessSeq++}`;
      const item = { id, from: "me", text, state: "pending" };
      guessFeed.push(item);
      renderFeedItem(item);
      api.send("dg-guess", { id, text });
    }
    root.querySelector("#dg-guess-submit").addEventListener("click", submitGuess);
    guessInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submitGuess();
    });

    // Drawer validates incoming guesses against the secret word only it knows.
    api.on("dg-guess", (payload, fromPeer) => {
      if (!iAmDrawer) return;
      const item = { id: payload.id, from: "them", text: payload.text, state: "pending" };
      guessFeed.push(item);
      renderFeedItem(item);
      const correct = normalizeGuess(payload.text) === normalizeGuess(secretWord);
      if (correct) {
        markFeedItem(payload.id, "correct");
        endRound({ reason: "guessed", guesserId: fromPeer, word: secretWord });
      } else {
        markFeedItem(payload.id, "wrong");
        api.send("dg-guess-result", { id: payload.id, correct: false });
      }
    });
    api.on("dg-guess-result", (payload) => {
      if (iAmDrawer) return;
      markFeedItem(payload.id, payload.correct ? "correct" : "wrong");
    });

    // ── Timer ──────────────────────────────────
    function fmtTime(s) {
      const m = Math.floor(s / 60);
      const sec = s % 60;
      return `${m}:${String(sec).padStart(2, "0")}`;
    }
    function startTimer() {
      stopTimer();
      timerStart = Date.now();
      timerId = setInterval(() => {
        const elapsed = Math.floor((Date.now() - timerStart) / 1000);
        const remaining = Math.max(0, roundSeconds - elapsed);
        timerEl.textContent = fmtTime(remaining);
        if (remaining <= 0) {
          stopTimer();
          if (iAmDrawer) endRound({ reason: "timeout", word: secretWord });
        }
      }, 250);
    }
    function stopTimer() {
      if (timerId) clearInterval(timerId);
      timerId = null;
    }

    // ── Round lifecycle ────────────────────────
    function updateHud() {
      root.querySelector("#dg-hud-round").innerHTML = `Round <b>${round}/${totalTurns}</b>`;
      root.querySelector("#dg-hud-role").textContent = iAmDrawer ? "You're drawing" : "You're guessing";
      root.querySelector("#dg-hud-my-score").textContent = scores[me.id] || 0;
      root.querySelector("#dg-hud-opp-score").textContent = scores[opponent?.id] || 0;
    }

    function beginRoundUI() {
      clearCanvas();
      guessFeed = [];
      feedEl.innerHTML = "";
      toolbar.style.display = iAmDrawer ? "flex" : "none";
      guessInputRow.style.display = iAmDrawer ? "none" : "flex";
      svg.classList.toggle("drawable", iAmDrawer);
      if (iAmDrawer) {
        wordBanner.textContent = `Draw: ${secretWord}`;
        wordBanner.classList.remove("blanks");
      } else {
        wordBanner.textContent = renderBlanks(shape);
        wordBanner.classList.add("blanks");
      }
      updateHud();
      showScreen("playing");
      startTimer();
      if (!iAmDrawer) guessInput.focus();
    }

    // Called by whoever is drawer this round; picks the word and computes
    // whose turn it is next. Both players independently derive the same
    // drawer for a given round from parity, so this never needs to be
    // negotiated over the network.
    function drawerForRound(r) {
      // Round 1 = host draws, round 2 = guest draws, alternating.
      const hostDraws = r % 2 === 1;
      return hostDraws === isHost;
    }

    function beginRound(r) {
      round = r;
      iAmDrawer = drawerForRound(r);
      roundEnded = false;
      if (iAmDrawer) {
        secretWord = pickWord(usedWords);
        shape = wordShape(secretWord);
        api.send("dg-round-start", { round: r, shape, startedAt: Date.now() });
        beginRoundUI();
      } else {
        secretWord = null;
        // Wait for the drawer's dg-round-start to arrive with the word shape.
        showScreen("waiting");
        root.querySelector("#dg-waiting-wrap .dg-wait-txt").textContent = "Waiting for the next round…";
      }
    }

    api.on("dg-round-start", (payload) => {
      round = payload.round;
      shape = payload.shape;
      iAmDrawer = drawerForRound(round); // false for whoever receives this
      roundEnded = false;
      beginRoundUI();
    });

    function endRound({ reason, guesserId, word }) {
      if (roundEnded) return;
      roundEnded = true;
      stopTimer();
      let newScores = { ...scores };
      if (reason === "guessed") {
        newScores[guesserId] = (newScores[guesserId] || 0) + 100;
        newScores[me.id] = (newScores[me.id] || 0) + 50; // drawer bonus
      }
      scores = newScores;
      if (iAmDrawer) {
        api.send("dg-round-end", { reason, guesserId, word, scores });
      }
      showRoundEnd({ reason, guesserId, word, scores });
    }

    api.on("dg-round-end", (payload) => {
      roundEnded = true;
      stopTimer();
      scores = payload.scores;
      showRoundEnd(payload);
    });

    function showRoundEnd({ reason, guesserId, word }) {
      const title = root.querySelector("#dg-round-overlay-title");
      const wordEl = root.querySelector("#dg-round-overlay-word");
      const sub = root.querySelector("#dg-round-overlay-sub");
      const nextTxt = root.querySelector("#dg-round-overlay-next");
      if (reason === "guessed") {
        const iGuessedIt = guesserId === me.id;
        title.textContent = iGuessedIt ? "🎉 You got it!" : iAmDrawer ? "🎉 Guessed!" : `🎉 ${opponentName} got it!`;
      } else {
        title.textContent = "⏱ Time's up!";
      }
      wordEl.textContent = `The word was: ${word}`;
      sub.textContent = "";
      root.querySelector("#dg-ov-my-score").textContent = scores[me.id] || 0;
      root.querySelector("#dg-ov-opp-score").textContent = scores[opponent?.id] || 0;
      updateHud();

      const isFinal = round >= totalTurns;
      nextTxt.textContent = isFinal ? "" : "Next round starting shortly…";
      showScreen("round-end");

      setTimeout(() => {
        if (isFinal) {
          showFinal();
        } else {
          beginRound(round + 1);
        }
      }, 3200);
    }

    function showFinal() {
      const my = scores[me.id] || 0;
      const opp = scores[opponent?.id] || 0;
      const title = root.querySelector("#dg-final-title");
      title.textContent = my === opp ? "🤝 It's a tie!" : my > opp ? "🏆 You win!" : `🏆 ${opponentName} wins!`;
      root.querySelector("#dg-final-my-score").textContent = my;
      root.querySelector("#dg-final-opp-score").textContent = opp;
      showScreen("final");
    }

    function startGame() {
      round = 0;
      scores = { [me.id]: 0, [opponent?.id]: 0 };
      usedWords = new Set();
      totalTurns = turnsPerPlayer * 2;
      api.send("dg-start", { turnsPerPlayer, roundSeconds, totalTurns });
      beginRound(1);
    }

    api.on("dg-start", (payload) => {
      turnsPerPlayer = payload.turnsPerPlayer;
      roundSeconds = payload.roundSeconds;
      totalTurns = payload.totalTurns;
      round = 0;
      scores = { [me.id]: 0, [opponent?.id]: 0 };
      usedWords = new Set();
      // beginRound(1) is skipped here — the host's paired dg-round-start
      // message (sent right after dg-start in startGame) drives round 1
      // via the dg-round-start listener above.
    });

    if (isHost) {
      root.querySelector("#dg-play-again-btn")?.addEventListener("click", () => startGame());
    }

    // ── Disconnect handling ───────────────────
    api.on("player-left", () => {
      stopTimer();
      const wait = root.querySelector("#dg-waiting-wrap .dg-wait-txt");
      if (wait) wait.textContent = `${opponentName} disconnected.`;
      showScreen("waiting");
    });

    // ── Initial screen ─────────────────────────
    showScreen(isHost ? "setup" : "waiting");

    // ── Destroy ────────────────────────────────
    return {
      destroy() {
        stopTimer();
        container.innerHTML = "";
      },
    };
  },
};
