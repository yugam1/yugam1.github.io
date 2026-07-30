// ═══════════════════════════════════════════════
//  PUZZLE MASTER — Party Arena
//  Cooperative jigsaw: host uploads (or keeps default) image, picks a
//  piece count and a mode, everyone pulls pieces one at a time from a
//  shared pieces box and drags them onto the board together.
//  Host-authoritative state; piece shapes are deterministic from a
//  shared seed so every client renders identical geometry.
// ═══════════════════════════════════════════════

// ── Seeded PRNG (mulberry32) ──────────────────
function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function shuffledIndices(n, rng) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Jigsaw tab profile (normalized u along edge, v perpendicular ×amp) ──
const TAB_PROFILE = [
  [0, 0], [0.40, 0], [0.40, 0.15], [0.28, 0.46], [0.38, 0.72],
  [0.5, 1.08], [0.62, 0.72], [0.72, 0.46], [0.60, 0.15], [0.60, 0], [1, 0],
];

function makeTabPoints(a0, a1, bFixed, horizontal, sign, amp, rng) {
  const jScale = 0.82 + rng() * 0.36;
  const len = a1 - a0;
  return TAB_PROFILE.map(([u, vv]) => {
    const v = vv * jScale * sign;
    return horizontal
      ? { x: a0 + u * len, y: bFixed + v * amp }
      : { x: bFixed + v * amp, y: a0 + u * len };
  });
}

// Smooth continuation path through points via quadratic curves through midpoints.
function emitPath(points, reverse) {
  const pts = reverse ? [...points].reverse() : points;
  let s = "";
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i], n = pts[i + 1];
    const mx = (p.x + n.x) / 2, my = (p.y + n.y) / 2;
    s += `Q ${p.x.toFixed(2)} ${p.y.toFixed(2)} ${mx.toFixed(2)} ${my.toFixed(2)} `;
  }
  const last = pts[pts.length - 1];
  s += `L ${last.x.toFixed(2)} ${last.y.toFixed(2)} `;
  return s;
}

// Deterministic piece geometry: interlocking tabs, shared per edge so
// neighboring pieces trace the exact same curve.
function buildGeometryWithRng(rng, rows, cols, imgW, imgH) {
  const pw = imgW / cols, ph = imgH / rows;
  const amp = Math.min(pw, ph) * 0.24;
  const edgesH = Array.from({ length: Math.max(0, rows - 1) }, () => []);
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols; c++) {
      const sign = rng() < 0.5 ? -1 : 1;
      edgesH[r][c] = makeTabPoints(c * pw, (c + 1) * pw, (r + 1) * ph, true, sign, amp, rng);
    }
  }
  const edgesV = Array.from({ length: Math.max(0, cols - 1) }, () => []);
  for (let c = 0; c < cols - 1; c++) {
    for (let r = 0; r < rows; r++) {
      const sign = rng() < 0.5 ? -1 : 1;
      edgesV[c][r] = makeTabPoints(r * ph, (r + 1) * ph, (c + 1) * pw, false, sign, amp, rng);
    }
  }
  const pad = amp + 3;
  const pieces = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x0 = c * pw, y0 = r * ph, x1 = x0 + pw, y1 = y0 + ph;
      let d = `M ${x0.toFixed(2)} ${y0.toFixed(2)} `;
      d += r === 0 ? `L ${x1.toFixed(2)} ${y0.toFixed(2)} ` : emitPath(edgesH[r - 1][c], false);
      d += c === cols - 1 ? `L ${x1.toFixed(2)} ${y1.toFixed(2)} ` : emitPath(edgesV[c][r], false);
      d += r === rows - 1 ? `L ${x0.toFixed(2)} ${y1.toFixed(2)} ` : emitPath(edgesH[r][c], true);
      d += c === 0 ? `L ${x0.toFixed(2)} ${y0.toFixed(2)} ` : emitPath(edgesV[c - 1][r], true);
      d += "Z";
      pieces.push({ id: r * cols + c, r, c, x0, y0, x1, y1, d });
    }
  }
  return { pieces, pw, ph, amp, pad };
}

function computeGrid(target, w, h) {
  const aspect = w / h;
  let cols = Math.max(2, Math.round(Math.sqrt(target * aspect)));
  let rows = Math.max(2, Math.round(target / cols));
  return { rows, cols };
}

function formatTime(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60), r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function loadFileAsImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function resizeToDataUrl(img, maxDim = 1000, quality = 0.82) {
  let w = img.naturalWidth, h = img.naturalHeight;
  const scale = Math.min(1, maxDim / Math.max(w, h));
  w = Math.max(1, Math.round(w * scale));
  h = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  canvas.getContext("2d").drawImage(img, 0, 0, w, h);
  return { dataUrl: canvas.toDataURL("image/jpeg", quality), w, h };
}

// Procedural default puzzle image (sunset mountains) — no external asset needed.
let _defaultImgCache = null;
function getDefaultImage() {
  if (_defaultImgCache) return _defaultImgCache;
  const w = 900, h = 620;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.75);
  sky.addColorStop(0, "#241454"); sky.addColorStop(0.45, "#7c3aed");
  sky.addColorStop(0.75, "#f97316"); sky.addColorStop(1, "#fde68a");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h * 0.75);
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.beginPath(); ctx.arc(w * 0.5, h * 0.42, 90, 0, Math.PI * 2);
  ctx.fillStyle = "#ffedd5"; ctx.fill();
  ctx.restore();
  function mountain(baseY, color, amp, offset) {
    ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(0, baseY);
    for (let x = 0; x <= w; x += 30) {
      const y = baseY - Math.sin((x + offset) * 0.008) * amp - Math.sin((x + offset) * 0.021) * amp * 0.4;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h); ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
  }
  mountain(h * 0.62, "#4c1d95", 40, 0);
  mountain(h * 0.72, "#5b21b6", 55, 300);
  mountain(h * 0.85, "#3730a3", 35, 700);
  ctx.fillStyle = "#1e1b4b"; ctx.fillRect(0, h * 0.85, w, h * 0.15);
  _defaultImgCache = { dataUrl: c.toDataURL("image/jpeg", 0.85), w, h };
  return _defaultImgCache;
}

export default {
  id: "puzzle-master",
  name: "Puzzle Master",

  create(container, api) {
    const me = api.getMe();
    const isHost = api.isHost();
    const v = api.cssVars;

    let gs = null;         // authoritative state (host only)
    let gsView = null;     // last received/applied state (any client)
    let mountedKey = null;
    let pieceDefs = {};    // id -> {d,x0,y0,pad,homeX,homeY,pw,ph,boxW,boxH} (deterministic, local)
    let pieceEls = {};     // id -> DOM element, only present once a piece is out of the box
    let livePos = {};      // id -> {x,y} current world position (free/placed pieces)
    let boxOrder = [];     // shuffled piece id order for the box tray
    let seedRef = null, imageUrlRef = null, imgWRef = 0, imgHRef = 0;
    let boardRect_ = null;
    let zoom = 1, panX = 0, panY = 0, zTop = 30; // stays above .pz-box-tray-wrap's z-index:20
    let localDrag = null, panDrag = null, lastMoveSend = 0;
    let panPointers = new Map(), pinchStart = null; // multi-touch pinch-to-zoom state
    let timerId = null, hideTimerRef = null;
    let chosenImage = getDefaultImage();
    let chosenCount = 54;
    let chosenMode = "visible";

    const resumedGs = api.getResumeState();

    // ── Styles ───────────────────────────────────
    const sty = document.createElement("style");
    sty.textContent = `
.pz{position:relative;height:100%;display:flex;flex-direction:column;font-family:${v.fontBody};color:${v.text};overflow:hidden}
.pz-setup-wrap,.pz-waiting-wrap{flex:1;display:flex;flex-direction:column;align-items:center;overflow-y:auto;padding:24px 16px 60px}
.pz-setup-card{background:${v.bgGlass};border:1px solid rgba(255,255,255,.08);border-radius:${v.radius};padding:22px;width:100%;max-width:460px}
.pz-setup-title{font-family:${v.fontDisplay};font-size:1.3rem;color:${v.accent};text-align:center;margin-bottom:14px}
.pz-preview-wrap{position:relative;border-radius:${v.radiusSm};overflow:hidden;margin-bottom:6px;border:1.5px solid rgba(255,255,255,.1);aspect-ratio:16/10;background:#000}
.pz-preview-wrap img{width:100%;height:100%;object-fit:cover;display:block}
.pz-upload-label{position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);color:${v.text};padding:8px 14px;border-radius:${v.radiusPill};font-size:.78rem;font-weight:700;cursor:pointer;border:1px solid rgba(255,255,255,.15)}
.pz-upload-label:hover{border-color:${v.accent}}
.pz-section-label{font-size:.72rem;text-transform:uppercase;letter-spacing:1px;color:${v.textSec};margin:16px 0 8px;font-weight:700}
.pz-chip-row{display:flex;flex-wrap:wrap;gap:8px}
.pz-chip{padding:8px 14px;border-radius:${v.radiusPill};background:${v.bgCard};border:1.5px solid rgba(255,255,255,.1);color:${v.textSec};font-size:.8rem;font-weight:700;cursor:pointer;transition:all .2s}
.pz-chip:hover{border-color:${v.accent}}
.pz-chip.active{background:${v.accentSoft};border-color:${v.accent};color:${v.accent}}
.pz-mode-desc{font-size:.72rem;color:${v.textMuted};margin-top:8px;line-height:1.4}
.pz-readout{margin-top:10px;font-size:.78rem;color:${v.textMuted};text-align:center}
.pz-start-btn{width:100%;margin-top:18px;padding:14px;border:none;border-radius:${v.radiusSm};background:linear-gradient(135deg,${v.accent},#f59e0b);color:#0a0e1a;font-weight:800;font-size:.92rem;cursor:pointer;text-transform:uppercase;letter-spacing:.5px}
.pz-start-btn:active{transform:scale(.97)}
.pz-spinner-lg{width:44px;height:44px;border:3px solid rgba(255,255,255,.1);border-top-color:${v.accent};border-radius:50%;animation:pzspin .8s linear infinite;margin:40px auto 16px}
@keyframes pzspin{to{transform:rotate(360deg)}}
.pz-wait-txt{color:${v.textSec};font-size:.9rem;text-align:center}
.pz-hud{display:flex;align-items:center;gap:10px;padding:8px 12px;background:rgba(0,0,0,.3);border-bottom:1px solid rgba(255,255,255,.08);flex-wrap:wrap;flex-shrink:0}
.pz-play-wrap{flex:1;min-height:0;flex-direction:column;overflow:hidden}
.pz-progress{flex:1;min-width:110px;display:flex;align-items:center;gap:8px}
.pz-bar-track{flex:1;height:7px;border-radius:4px;background:rgba(255,255,255,.08);overflow:hidden}
.pz-bar-fill{height:100%;background:linear-gradient(90deg,${v.accent},#f59e0b);transition:width .25s ease}
.pz-progress-txt{font-size:.7rem;color:${v.textSec};font-weight:700;white-space:nowrap}
.pz-timer{font-size:.76rem;color:${v.textSec};font-weight:700;white-space:nowrap}
.pz-zoom-controls{display:flex;gap:4px}
.pz-zbtn{width:26px;height:26px;border-radius:8px;background:${v.bgCard};border:1px solid rgba(255,255,255,.1);color:${v.text};cursor:pointer;font-size:.8rem;display:flex;align-items:center;justify-content:center}
.pz-zbtn:hover{border-color:${v.accent};color:${v.accent}}
.pz-info-btn{width:26px;height:26px;border-radius:50%;background:${v.accentSoft};border:1px solid ${v.accent};color:${v.accent};font-weight:800;cursor:pointer;font-size:.8rem}
.pz-info-btn.active{background:${v.accent};color:#0a0e1a}
.pz-new-btn{padding:6px 12px;border-radius:${v.radiusPill};background:rgba(248,113,113,.12);border:1px solid rgba(248,113,113,.25);color:${v.danger};font-size:.7rem;font-weight:700;cursor:pointer;white-space:nowrap}
.pz-hint{padding:4px 12px;font-size:.66rem;color:${v.textMuted};text-align:center;background:rgba(0,0,0,.15);flex-shrink:0}
.pz-stage{flex:1;min-height:0;position:relative;overflow:hidden;cursor:grab;touch-action:none;background:radial-gradient(circle at 1px 1px, rgba(255,255,255,.05) 1px, transparent 0) 0 0/22px 22px}
.pz-stage.panning{cursor:grabbing}
.pz-world{position:absolute;top:0;left:0;transform-origin:0 0}
.pz-board{position:absolute;border:2px dashed rgba(255,255,255,.25);border-radius:6px;overflow:hidden}
.pz-board-img{width:100%;height:100%;object-fit:cover;opacity:.16;display:block;transition:opacity .8s ease}
.pz-board-img.pz-hidden-ref{opacity:0}
.pz-piece{position:absolute;left:0;top:0;cursor:grab;filter:drop-shadow(0 3px 6px rgba(0,0,0,.4))}
.pz-piece svg{display:block}
.pz-piece.placed{cursor:default;filter:none;z-index:1!important}
.pz-piece.flash svg{animation:pzflash .5s ease}
@keyframes pzflash{0%{filter:drop-shadow(0 0 0 ${v.accent})}40%{filter:drop-shadow(0 0 10px ${v.accent})}100%{filter:drop-shadow(0 0 0 transparent)}}
.pz-box-tray-wrap{position:absolute;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);backdrop-filter:blur(6px);border-top:1px solid rgba(255,255,255,.1);padding:8px 10px;z-index:20}
.pz-box-label{font-size:.68rem;color:${v.textSec};font-weight:700;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px}
.pz-box-tray{display:flex;gap:8px;overflow-x:auto;padding-bottom:2px}
.pz-box-thumb{flex-shrink:0;width:52px;height:52px;cursor:grab;touch-action:none;filter:drop-shadow(0 2px 4px rgba(0,0,0,.4))}
.pz-box-thumb svg{display:block}
.pz-box-thumb:active{cursor:grabbing}
.pz-ref-overlay{position:fixed;inset:0;background:rgba(5,7,15,.9);display:flex;align-items:center;justify-content:center;z-index:600;backdrop-filter:blur(6px)}
.pz-ref-overlay.hidden{display:none}
.pz-ref-overlay img{max-width:92vw;max-height:86vh;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.6);border:2px solid rgba(255,255,255,.1)}
.pz-ref-close{position:absolute;top:18px;right:18px;width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:#fff;font-size:1.1rem;cursor:pointer}
.pz-done-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(5,7,15,.72);backdrop-filter:blur(4px);z-index:80}
.pz-done-overlay.hidden{display:none}
.pz-done-card{background:${v.bgGlass};border:1px solid ${v.accent};border-radius:${v.radius};padding:32px 28px;text-align:center;max-width:340px}
.pz-done-card h2{font-family:${v.fontDisplay};color:${v.accent};font-size:1.6rem;margin-bottom:8px}
.pz-done-time{font-size:1.1rem;color:${v.text};font-weight:700;margin-bottom:18px}
    `;
    container.appendChild(sty);

    const root = document.createElement("div");
    root.className = "pz";
    root.innerHTML = `
<div class="pz-setup-wrap"><div class="pz-setup-card">
  <div class="pz-setup-title">🧩 Puzzle Master</div>
  <div class="pz-preview-wrap">
    <img id="pz-preview" src="${chosenImage.dataUrl}" alt="Puzzle image preview"/>
    <label class="pz-upload-label">📤 Upload Image<input type="file" accept="image/*" id="pz-file" hidden></label>
  </div>
  <div class="pz-section-label">Puzzle Size</div>
  <div class="pz-chip-row" id="pz-chips"></div>
  <div class="pz-readout" id="pz-readout"></div>
  <div class="pz-section-label">Mode</div>
  <div class="pz-chip-row" id="pz-mode-chips">
    <div class="pz-chip active" data-mode="visible">👁 Reference Visible</div>
    <div class="pz-chip" data-mode="memory">🧠 Memory Challenge</div>
  </div>
  <div class="pz-mode-desc" id="pz-mode-desc"></div>
  <button class="pz-start-btn" id="pz-start-btn">▶ Start Puzzle</button>
</div></div>
<div class="pz-waiting-wrap" style="display:none">
  <div class="pz-spinner-lg"></div>
  <div class="pz-wait-txt">Waiting for the host to pick an image and puzzle size…</div>
</div>
<div class="pz-play-wrap" style="display:none">
  <div class="pz-hud">
    <div class="pz-progress"><div class="pz-bar-track"><div class="pz-bar-fill" id="pz-bar" style="width:0%"></div></div><span class="pz-progress-txt" id="pz-progress-txt">0/0</span></div>
    <div class="pz-timer" id="pz-timer">0:00</div>
    <div class="pz-zoom-controls">
      <button class="pz-zbtn" id="pz-zoom-out">−</button>
      <button class="pz-zbtn" id="pz-zoom-fit">⤢</button>
      <button class="pz-zbtn" id="pz-zoom-in">+</button>
    </div>
    <button class="pz-info-btn" id="pz-info-btn" title="Peek at the picture">ⓘ</button>
    ${isHost ? '<button class="pz-new-btn" id="pz-new-btn">🔁 New Puzzle</button>' : ""}
  </div>
  <div class="pz-hint">Drag pieces from the box onto the outline · drag empty space to pan · wheel or +/− to zoom</div>
  <div class="pz-stage" id="pz-stage">
    <div class="pz-world" id="pz-world"></div>
    <div class="pz-box-tray-wrap">
      <div class="pz-box-label" id="pz-box-count">📦 Pieces Box (0)</div>
      <div class="pz-box-tray" id="pz-box-tray"></div>
    </div>
  </div>
</div>
<div class="pz-done-overlay hidden" id="pz-done-overlay">
  <div class="pz-done-card">
    <h2>🎉 Solved!</h2>
    <div class="pz-done-time" id="pz-done-time"></div>
    ${isHost ? '<button class="pz-start-btn" id="pz-done-new-btn">🔁 New Puzzle</button>' : '<div class="pz-wait-txt">Waiting for host to start a new puzzle…</div>'}
  </div>
</div>
    `;
    container.appendChild(root);

    const setupWrap = root.querySelector(".pz-setup-wrap");
    const waitingWrap = root.querySelector(".pz-waiting-wrap");
    const playWrap = root.querySelector(".pz-play-wrap");
    const stageEl = root.querySelector("#pz-stage");
    const worldEl = root.querySelector("#pz-world");
    const doneOverlay = root.querySelector("#pz-done-overlay");

    // ── Setup UI (host) ───────────────────────────
    if (isHost) {
      const CHIPS = [12, 24, 54, 96, 150, 240];
      const chipRow = root.querySelector("#pz-chips");
      chipRow.innerHTML = CHIPS.map(n => `<div class="pz-chip${n === chosenCount ? " active" : ""}" data-n="${n}">${n}</div>`).join("");
      function updateReadout() {
        const { rows, cols } = computeGrid(chosenCount, chosenImage.w, chosenImage.h);
        root.querySelector("#pz-readout").textContent = `${rows * cols} pieces · ${cols}×${rows} grid`;
      }
      function updateModeDesc() {
        root.querySelector("#pz-mode-desc").textContent = chosenMode === "memory"
          ? "The picture shows for 10 seconds, then hides — solve from memory. Tap ⓘ any time for a quick peek."
          : "The picture stays faintly visible on the board the whole time.";
      }
      updateReadout(); updateModeDesc();
      chipRow.querySelectorAll(".pz-chip").forEach(chip => {
        chip.addEventListener("click", () => {
          chosenCount = Number(chip.dataset.n);
          chipRow.querySelectorAll(".pz-chip").forEach(c => c.classList.toggle("active", c === chip));
          updateReadout();
        });
      });
      root.querySelector("#pz-mode-chips").querySelectorAll(".pz-chip").forEach(chip => {
        chip.addEventListener("click", () => {
          chosenMode = chip.dataset.mode;
          root.querySelectorAll("#pz-mode-chips .pz-chip").forEach(c => c.classList.toggle("active", c === chip));
          updateModeDesc();
        });
      });
      root.querySelector("#pz-file").addEventListener("change", async (e) => {
        const file = e.target.files[0]; if (!file) return;
        try {
          const img = await loadFileAsImage(file);
          const { dataUrl, w, h } = resizeToDataUrl(img, 1000, 0.82);
          chosenImage = { dataUrl, w, h };
          root.querySelector("#pz-preview").src = dataUrl;
          updateReadout();
        } catch (err) { console.error("[PuzzleMaster] image load failed", err); }
      });
      root.querySelector("#pz-start-btn").addEventListener("click", () => {
        const { rows, cols } = computeGrid(chosenCount, chosenImage.w, chosenImage.h);
        hostStartPuzzle(chosenImage.dataUrl, chosenImage.w, chosenImage.h, rows, cols, chosenMode);
      });
      root.querySelector("#pz-new-btn")?.addEventListener("click", hostNewPuzzle);
      root.querySelector("#pz-done-new-btn")?.addEventListener("click", hostNewPuzzle);
    }

    // ── Info ("i") — click toggles the reference; memory mode auto-hides
    // after 10s unless the player manually hides/shows it first ──
    root.querySelector("#pz-info-btn").addEventListener("click", () => {
      const boardImg = root.querySelector(".pz-board-img");
      const infoBtn = root.querySelector("#pz-info-btn");
      if (!boardImg || !gsView) return;
      if (hideTimerRef) { clearTimeout(hideTimerRef); hideTimerRef = null; }
      const isShowing = !boardImg.classList.contains("pz-hidden-ref");
      if (isShowing) {
        boardImg.classList.add("pz-hidden-ref");
        infoBtn.classList.remove("active");
      } else {
        boardImg.classList.remove("pz-hidden-ref");
        infoBtn.classList.add("active");
        if (gsView.mode === "memory") {
          hideTimerRef = setTimeout(() => {
            boardImg.classList.add("pz-hidden-ref");
            infoBtn.classList.remove("active");
            hideTimerRef = null;
          }, 10000);
        }
      }
    });

    // ── Zoom / pan ─────────────────────────────────
    function applyTransform() {
      worldEl.style.transform = `translate(${panX}px,${panY}px) scale(${zoom})`;
    }
    function zoomBy(factor) {
      const r = stageEl.getBoundingClientRect();
      const cx = r.width / 2, cy = r.height / 2;
      const wx = (cx - panX) / zoom, wy = (cy - panY) / zoom;
      zoom = clamp(zoom * factor, 0.15, 3);
      panX = cx - wx * zoom; panY = cy - wy * zoom;
      applyTransform();
    }
    function fitToBoard() {
      if (!boardRect_) return;
      const r = stageEl.getBoundingClientRect();
      const margin = 40;
      let z = Math.min((r.width - margin) / boardRect_.imgW, (r.height - margin) / boardRect_.imgH, 1.4);
      zoom = clamp(z, 0.2, 3);
      panX = r.width / 2 - (boardRect_.BX + boardRect_.imgW / 2) * zoom;
      panY = 24 - boardRect_.BY * zoom;
      applyTransform();
    }
    root.querySelector("#pz-zoom-in").addEventListener("click", () => zoomBy(1.25));
    root.querySelector("#pz-zoom-out").addEventListener("click", () => zoomBy(1 / 1.25));
    root.querySelector("#pz-zoom-fit").addEventListener("click", fitToBoard);
    stageEl.addEventListener("wheel", (e) => {
      e.preventDefault();
      const r = stageEl.getBoundingClientRect();
      const cx = e.clientX - r.left, cy = e.clientY - r.top;
      const wx = (cx - panX) / zoom, wy = (cy - panY) / zoom;
      zoom = clamp(zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12), 0.15, 3);
      panX = cx - wx * zoom; panY = cy - wy * zoom;
      applyTransform();
    }, { passive: false });

    function startPinch() {
      const r = stageEl.getBoundingClientRect();
      const pts = [...panPointers.values()];
      const cx = (pts[0].x + pts[1].x) / 2, cy = (pts[0].y + pts[1].y) / 2;
      pinchStart = {
        dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
        zoom0: zoom,
        wx: (cx - r.left - panX) / zoom,
        wy: (cy - r.top - panY) / zoom,
      };
      panDrag = null;
    }
    stageEl.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".pz-piece") || e.target.closest(".pz-box-tray-wrap")) return;
      stageEl.setPointerCapture(e.pointerId);
      panPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (panPointers.size === 2) {
        startPinch();
      } else if (panPointers.size === 1) {
        panDrag = { startX: e.clientX, startY: e.clientY, x0: panX, y0: panY };
        stageEl.classList.add("panning");
      }
    });
    stageEl.addEventListener("pointermove", (e) => {
      if (panPointers.has(e.pointerId)) panPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinchStart && panPointers.size === 2) {
        const r = stageEl.getBoundingClientRect();
        const pts = [...panPointers.values()];
        const cx = (pts[0].x + pts[1].x) / 2, cy = (pts[0].y + pts[1].y) / 2;
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        zoom = clamp(pinchStart.zoom0 * (dist / pinchStart.dist), 0.15, 3);
        panX = (cx - r.left) - pinchStart.wx * zoom;
        panY = (cy - r.top) - pinchStart.wy * zoom;
        applyTransform();
        return;
      }
      if (panDrag) {
        panX = panDrag.x0 + (e.clientX - panDrag.startX);
        panY = panDrag.y0 + (e.clientY - panDrag.startY);
        applyTransform();
        return;
      }
      if (localDrag) {
        const r = stageEl.getBoundingClientRect();
        const wx = (e.clientX - r.left - panX) / zoom - localDrag.offX;
        const wy = (e.clientY - r.top - panY) / zoom - localDrag.offY;
        livePos[localDrag.id] = { x: wx, y: wy };
        pieceEls[localDrag.id].style.transform = `translate(${wx}px,${wy}px)`;
        const now = performance.now();
        if (now - lastMoveSend > 45) { lastMoveSend = now; sendMove(localDrag.id, wx, wy); }
      }
    });
    function endStageDrag(e) {
      panPointers.delete(e.pointerId);
      if (panPointers.size < 2) pinchStart = null;
      if (panPointers.size === 1) {
        const [[, p]] = panPointers;
        panDrag = { startX: p.x, startY: p.y, x0: panX, y0: panY };
      } else if (panPointers.size === 0) {
        panDrag = null;
        stageEl.classList.remove("panning");
      }
      if (localDrag) {
        const { id } = localDrag;
        if (pieceEls[id]) pieceEls[id].style.transition = "transform .18s cubic-bezier(.2,.8,.3,1.2)";
        const { x, y } = livePos[id];
        localDrag = null;
        sendRelease(id, x, y);
      }
    }
    stageEl.addEventListener("pointerup", endStageDrag);
    stageEl.addEventListener("pointercancel", endStageDrag);

    // ── Networking helpers ─────────────────────────
    function sendTakeout(id, x, y) { if (isHost) hostAction("pz-takeout", { id, x, y }); else api.send("pz-takeout", { id, x, y }); }
    function sendMove(id, x, y) { if (isHost) hostAction("pz-move", { id, x, y }); else api.send("pz-move", { id, x, y }); }
    function sendRelease(id, x, y) { if (isHost) hostAction("pz-release", { id, x, y }); else api.send("pz-release", { id, x, y }); }

    function pieceSvgMarkup(id, dispW, dispH) {
      const p = pieceDefs[id];
      return `<svg viewBox="${(p.x0 - p.pad).toFixed(2)} ${(p.y0 - p.pad).toFixed(2)} ${p.boxW.toFixed(2)} ${p.boxH.toFixed(2)}" width="${dispW}" height="${dispH}">
        <defs><clipPath id="pzc${id}-${seedRef}"><path d="${p.d}"/></clipPath></defs>
        <image href="${imageUrlRef}" x="0" y="0" width="${imgWRef}" height="${imgHRef}" clip-path="url(#pzc${id}-${seedRef})"/>
        <path d="${p.d}" fill="none" stroke="rgba(0,0,0,.55)" stroke-width="1.4"/>
        <path d="${p.d}" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="0.6"/>
      </svg>`;
    }

    function ensurePieceOnWorld(id, x, y) {
      let el = pieceEls[id];
      if (!el) {
        const p = pieceDefs[id];
        el = document.createElement("div");
        el.className = "pz-piece";
        el.style.width = p.boxW + "px"; el.style.height = p.boxH + "px";
        el.innerHTML = pieceSvgMarkup(id, p.boxW, p.boxH);
        worldEl.appendChild(el);
        pieceEls[id] = el;
        attachPieceHandlers(el, id);
      }
      livePos[id] = { x, y };
      el.style.transform = `translate(${x}px,${y}px)`;
      return el;
    }

    function attachPieceHandlers(el, id) {
      el.addEventListener("pointerdown", (e) => {
        const st = gsView?.pieces?.[id]?.state;
        if (st === "placed") return;
        e.stopPropagation();
        el.setPointerCapture(e.pointerId);
        el.style.transition = "none";
        el.style.zIndex = String(++zTop);
        const r = stageEl.getBoundingClientRect();
        const wx = (e.clientX - r.left - panX) / zoom, wy = (e.clientY - r.top - panY) / zoom;
        const cur = livePos[id] || { x: 0, y: 0 };
        localDrag = { id, offX: wx - cur.x, offY: wy - cur.y };
      });
    }

    // Box thumbnails aren't inside the stage's transform tree, so their
    // drag must be tracked with window-level listeners (not stageEl's).
    function attachTakeoutHandlers(el, id) {
      el.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        const r = stageEl.getBoundingClientRect();
        // Spawn in the middle of the visible (non-tray) viewport, not at the tap point —
        // the tap lands on the box tray strip, which on mobile is near the bottom edge
        // of the stage and can leave the new piece invisible/behind other UI.
        const trayWrapEl = root.querySelector(".pz-box-tray-wrap");
        const trayH = trayWrapEl ? trayWrapEl.getBoundingClientRect().height : 0;
        const visibleH = Math.max(r.height - trayH, 0);
        const cx = r.width / 2, cy = visibleH / 2;
        const wx = (cx - panX) / zoom, wy = (cy - panY) / zoom;
        const def = pieceDefs[id];
        const x = wx - def.boxW / 2, y = wy - def.boxH / 2;
        ensurePieceOnWorld(id, x, y);
        pieceEls[id].style.zIndex = String(++zTop);
        removeBoxThumb(id);
        if (gsView?.pieces) gsView.pieces[id] = { state: "free", x, y };
        const pwx = (e.clientX - r.left - panX) / zoom, pwy = (e.clientY - r.top - panY) / zoom;
        localDrag = { id, offX: pwx - x, offY: pwy - y };
        sendTakeout(id, x, y);
        function onMove(ev) {
          const rr = stageEl.getBoundingClientRect();
          const wx2 = (ev.clientX - rr.left - panX) / zoom - localDrag.offX;
          const wy2 = (ev.clientY - rr.top - panY) / zoom - localDrag.offY;
          livePos[id] = { x: wx2, y: wy2 };
          if (pieceEls[id]) pieceEls[id].style.transform = `translate(${wx2}px,${wy2}px)`;
          const now = performance.now();
          if (now - lastMoveSend > 45) { lastMoveSend = now; sendMove(id, wx2, wy2); }
        }
        function onUp() {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
          window.removeEventListener("pointercancel", onUp);
          if (pieceEls[id]) pieceEls[id].style.transition = "transform .18s cubic-bezier(.2,.8,.3,1.2)";
          const { x: fx, y: fy } = livePos[id];
          localDrag = null;
          sendRelease(id, fx, fy);
        }
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onUp);
      });
    }

    function removeBoxThumb(id) {
      const el = root.querySelector(`.pz-box-thumb[data-id="${id}"]`);
      if (el) el.remove();
      const left = root.querySelectorAll(".pz-box-thumb").length;
      const countEl = root.querySelector("#pz-box-count");
      if (countEl) countEl.textContent = `📦 Pieces Box (${left})`;
    }

    function renderBoxTray() {
      const trayEl = root.querySelector("#pz-box-tray");
      trayEl.innerHTML = "";
      const boxed = boxOrder.filter(id => gsView.pieces[id]?.state === "boxed");
      root.querySelector("#pz-box-count").textContent = `📦 Pieces Box (${boxed.length})`;
      for (const id of boxed) {
        const el = document.createElement("div");
        el.className = "pz-box-thumb";
        el.dataset.id = id;
        el.innerHTML = pieceSvgMarkup(id, 52, 52);
        attachTakeoutHandlers(el, id);
        trayEl.appendChild(el);
      }
    }

    // ── Mount / sync puzzle geometry & positions ──
    function mountPuzzle(state) {
      const { seed, rows, cols, imgW, imgH, imageUrl } = state;
      const rng = mulberry32(seed);
      const geo = buildGeometryWithRng(rng, rows, cols, imgW, imgH);
      const boxW = geo.pw + geo.pad * 2, boxH = geo.ph + geo.pad * 2;
      const worldW = Math.max(900, imgW * 1.35 + 200);
      const worldH = Math.max(700, imgH * 1.35 + 200);
      const BX = Math.round((worldW - imgW) / 2), BY = Math.round((worldH - imgH) / 2);

      worldEl.innerHTML = "";
      worldEl.style.width = worldW + "px";
      worldEl.style.height = worldH + "px";

      const board = document.createElement("div");
      board.className = "pz-board";
      board.style.cssText = `left:${BX}px;top:${BY}px;width:${imgW}px;height:${imgH}px;`;
      board.innerHTML = `<img class="pz-board-img" src="${imageUrl}" alt="target"/>`;
      const grid = document.createElement("div");
      grid.style.cssText = `position:absolute;inset:0;pointer-events:none;background-image:
        repeating-linear-gradient(to right, transparent 0, transparent ${geo.pw - 1}px, rgba(255,255,255,.15) ${geo.pw - 1}px, rgba(255,255,255,.15) ${geo.pw}px),
        repeating-linear-gradient(to bottom, transparent 0, transparent ${geo.ph - 1}px, rgba(255,255,255,.15) ${geo.ph - 1}px, rgba(255,255,255,.15) ${geo.ph}px);`;
      board.appendChild(grid);
      worldEl.appendChild(board);

      pieceEls = {}; livePos = {}; pieceDefs = {};
      for (const p of geo.pieces) {
        pieceDefs[p.id] = {
          d: p.d, x0: p.x0, y0: p.y0, pad: geo.pad,
          homeX: BX + p.x0 - geo.pad, homeY: BY + p.y0 - geo.pad,
          pw: geo.pw, ph: geo.ph, boxW, boxH,
        };
      }
      boxOrder = shuffledIndices(geo.pieces.length, rng);
      seedRef = seed; imageUrlRef = imageUrl; imgWRef = imgW; imgHRef = imgH;
      mountedKey = `${seed}|${rows}|${cols}`;
      boardRect_ = { BX, BY, imgW, imgH };
      requestAnimationFrame(fitToBoard);
    }

    function syncAllPieces(pieces) {
      for (const idStr in pieces) {
        const id = Number(idStr), s = pieces[idStr];
        if (!pieceDefs[id]) continue;
        if (s.state === "boxed") {
          if (pieceEls[id]) { pieceEls[id].remove(); delete pieceEls[id]; delete livePos[id]; }
        } else {
          ensurePieceOnWorld(id, s.x, s.y);
          pieceEls[id].classList.toggle("placed", s.state === "placed");
        }
      }
      renderBoxTray();
      updateHudCounts();
    }

    function onMoveUpdate(id, x, y) {
      if (!pieceEls[id]) return;
      livePos[id] = { x, y };
      pieceEls[id].style.transform = `translate(${x}px,${y}px)`;
      if (gsView?.pieces?.[id]) { gsView.pieces[id].x = x; gsView.pieces[id].y = y; }
    }

    function onReleaseUpdate(id, x, y, state) {
      if (!pieceEls[id]) return;
      livePos[id] = { x, y };
      pieceEls[id].style.transform = `translate(${x}px,${y}px)`;
      const placed = state === "placed";
      pieceEls[id].classList.toggle("placed", placed);
      if (placed) { pieceEls[id].classList.add("flash"); setTimeout(() => pieceEls[id]?.classList.remove("flash"), 500); }
      if (gsView?.pieces?.[id]) { gsView.pieces[id].x = x; gsView.pieces[id].y = y; gsView.pieces[id].state = state; }
      updateHudCounts();
    }

    function onTakeoutUpdate(id, x, y) {
      ensurePieceOnWorld(id, x, y);
      if (gsView?.pieces) gsView.pieces[id] = { state: "free", x, y };
      removeBoxThumb(id);
      updateHudCounts();
    }

    function updateHudCounts() {
      if (!gsView || !gsView.pieces) return;
      const total = gsView.total || 0;
      const placed = Object.values(gsView.pieces).filter(p => p.state === "placed").length;
      const bar = root.querySelector("#pz-bar"), txt = root.querySelector("#pz-progress-txt");
      if (bar) bar.style.width = total ? `${(placed / total) * 100}%` : "0%";
      if (txt) txt.textContent = `${placed}/${total}`;
    }

    function setupModeTimer(state) {
      if (hideTimerRef) { clearTimeout(hideTimerRef); hideTimerRef = null; }
      const boardImg = root.querySelector(".pz-board-img");
      const infoBtn = root.querySelector("#pz-info-btn");
      if (!boardImg) return;
      if (state.mode !== "memory") {
        boardImg.classList.remove("pz-hidden-ref");
        infoBtn?.classList.add("active");
        return;
      }
      infoBtn?.classList.remove("active");
      const remaining = 10000 - (Date.now() - state.startedAt);
      if (remaining <= 0) { boardImg.classList.add("pz-hidden-ref"); }
      else {
        boardImg.classList.remove("pz-hidden-ref");
        infoBtn?.classList.add("active");
        hideTimerRef = setTimeout(() => {
          boardImg.classList.add("pz-hidden-ref");
          infoBtn?.classList.remove("active");
          hideTimerRef = null;
        }, remaining);
      }
    }

    function startTimerLoop() {
      stopTimerLoop();
      timerId = setInterval(() => {
        if (!gsView || !gsView.startedAt) return;
        const end = gsView.finishedAt || Date.now();
        root.querySelector("#pz-timer").textContent = formatTime(end - gsView.startedAt);
        if (gsView.finishedAt) stopTimerLoop();
      }, 500);
    }
    function stopTimerLoop() { if (timerId) { clearInterval(timerId); timerId = null; } }

    // ── Phase rendering ────────────────────────────
    function render() {
      const phase = gsView ? gsView.phase : "setup";
      if (phase === "play" || phase === "done") {
        setupWrap.style.display = "none";
        waitingWrap.style.display = "none";
        playWrap.style.display = "flex";
        doneOverlay.classList.toggle("hidden", phase !== "done");
        if (phase === "done" && gsView.finishedAt && gsView.startedAt) {
          root.querySelector("#pz-done-time").textContent = `Solved in ${formatTime(gsView.finishedAt - gsView.startedAt)}`;
        }
        startTimerLoop();
      } else {
        playWrap.style.display = "none";
        doneOverlay.classList.add("hidden");
        if (isHost) { setupWrap.style.display = "flex"; waitingWrap.style.display = "none"; }
        else { setupWrap.style.display = "none"; waitingWrap.style.display = "flex"; }
        stopTimerLoop();
      }
    }

    function applyView(state) {
      gsView = state;
      if (state && (state.phase === "play" || state.phase === "done")) {
        if (mountedKey !== `${state.seed}|${state.rows}|${state.cols}`) mountPuzzle(state);
        syncAllPieces(state.pieces);
        setupModeTimer(state);
      }
      render();
    }

    // ── Host logic ─────────────────────────────────
    function hostBroadcast() {
      api.setResumeState(gs);
      applyView(gs);
      api.send("pz-state", gs);
    }

    function hostStartPuzzle(imageUrl, imgW, imgH, rows, cols, mode) {
      const seed = Math.floor(Math.random() * 1e9);
      gs = { phase: "play", mode, imageUrl, rows, cols, seed, imgW, imgH, total: rows * cols, placedCount: 0, startedAt: Date.now(), finishedAt: null, pieces: {} };
      mountPuzzle(gs);
      for (const id in pieceDefs) gs.pieces[id] = { state: "boxed" };
      hostBroadcast();
    }

    function hostNewPuzzle() {
      gs = { phase: "setup" };
      hostBroadcast();
    }

    function hostAction(action, payload) {
      if (!gs || !gs.pieces) return;
      const gp = gs.pieces[payload.id];
      if (action === "pz-takeout") {
        if (!gp || gp.state !== "boxed") return;
        gp.state = "free"; gp.x = payload.x; gp.y = payload.y;
        onTakeoutUpdate(payload.id, payload.x, payload.y);
        api.send("pz-taken-out", { id: payload.id, x: payload.x, y: payload.y });
      }
      if (action === "pz-move") {
        if (!gp || gp.state !== "free") return;
        gp.x = payload.x; gp.y = payload.y;
        onMoveUpdate(payload.id, payload.x, payload.y);
        api.send("pz-moved", { id: payload.id, x: payload.x, y: payload.y });
      }
      if (action === "pz-release") {
        if (!gp || gp.state !== "free") return;
        const meta = pieceDefs[payload.id];
        const dx = payload.x - meta.homeX, dy = payload.y - meta.homeY;
        const tol = Math.max(meta.pw, meta.ph) * 0.32;
        let state = "free", fx = payload.x, fy = payload.y;
        if (Math.hypot(dx, dy) <= tol) { state = "placed"; fx = meta.homeX; fy = meta.homeY; gs.placedCount++; }
        gp.state = state; gp.x = fx; gp.y = fy;
        onReleaseUpdate(payload.id, fx, fy, state);
        api.send("pz-released", { id: payload.id, x: fx, y: fy, state });
        api.setResumeState(gs);
        if (gs.placedCount >= gs.total) {
          gs.phase = "done"; gs.finishedAt = Date.now();
          api.send("pz-done", { finishedAt: gs.finishedAt });
          api.setResumeState(gs);
          render();
          api.speak(`Puzzle solved in ${formatTime(gs.finishedAt - gs.startedAt)}!`);
        }
      }
    }

    // ── Network listeners ──────────────────────────
    api.on("pz-state", (payload) => applyView(payload));
    api.on("pz-takeout", (payload) => { if (isHost) hostAction("pz-takeout", payload); });
    api.on("pz-move", (payload) => { if (isHost) hostAction("pz-move", payload); });
    api.on("pz-release", (payload) => { if (isHost) hostAction("pz-release", payload); });
    api.on("pz-taken-out", (payload) => { if (localDrag && localDrag.id === payload.id) return; onTakeoutUpdate(payload.id, payload.x, payload.y); });
    api.on("pz-moved", (payload) => { if (localDrag && localDrag.id === payload.id) return; onMoveUpdate(payload.id, payload.x, payload.y); });
    api.on("pz-released", (payload) => onReleaseUpdate(payload.id, payload.x, payload.y, payload.state));
    api.on("pz-done", (payload) => { if (gsView) { gsView.phase = "done"; gsView.finishedAt = payload.finishedAt; } render(); });
    api.on("pz-request-state", () => { if (isHost && gs) hostBroadcast(); });
    if (isHost) api.onPlayerRejoinedMidgame(() => { if (gs) hostBroadcast(); });
    else api.send("pz-request-state", {});

    // ── Start ───────────────────────────────────────
    if (isHost) {
      if (resumedGs && resumedGs.phase) { gs = resumedGs; applyView(gs); }
      else render();
    } else {
      render();
    }

    return {
      destroy() {
        stopTimerLoop();
        if (hideTimerRef) clearTimeout(hideTimerRef);
        container.innerHTML = "";
      },
    };
  },
};
