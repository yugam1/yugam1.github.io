// ═══════════════════════════════════════════════
//  DIXIT — Party Arena
//  Storytelling / deduction card game
//  3–6 players | Host-authoritative state
// ═══════════════════════════════════════════════

const CARD_POOL = [
  { id: 1,  e: "🌙", l: "Moon Dream" },
  { id: 2,  e: "🦋", l: "Butterfly" },
  { id: 3,  e: "🏰", l: "Castle" },
  { id: 4,  e: "🌊", l: "Ocean Wave" },
  { id: 5,  e: "🔮", l: "Crystal Ball" },
  { id: 6,  e: "🦉", l: "Wise Owl" },
  { id: 7,  e: "🌸", l: "Cherry Blossom" },
  { id: 8,  e: "⚡", l: "Lightning" },
  { id: 9,  e: "🗝️", l: "Old Key" },
  { id: 10, e: "🎭", l: "Theater Mask" },
  { id: 11, e: "🌋", l: "Volcano" },
  { id: 12, e: "🦚", l: "Peacock" },
  { id: 13, e: "🕰️", l: "Old Clock" },
  { id: 14, e: "🌈", l: "Rainbow" },
  { id: 15, e: "🐉", l: "Dragon" },
  { id: 16, e: "🕯️", l: "Candle" },
  { id: 17, e: "🌿", l: "Forest Leaf" },
  { id: 18, e: "🎪", l: "Circus Tent" },
  { id: 19, e: "🧿", l: "Evil Eye" },
  { id: 20, e: "🦁", l: "Lion" },
  { id: 21, e: "🌺", l: "Tropical Flower" },
  { id: 22, e: "🎠", l: "Carousel" },
  { id: 23, e: "🌌", l: "Galaxy" },
  { id: 24, e: "🐚", l: "Seashell" },
  { id: 25, e: "🏔️", l: "Mountain" },
  { id: 26, e: "🦜", l: "Parrot" },
  { id: 27, e: "🕸️", l: "Spider Web" },
  { id: 28, e: "🌹", l: "Red Rose" },
  { id: 29, e: "🎆", l: "Fireworks" },
  { id: 30, e: "🐬", l: "Dolphin" },
  { id: 31, e: "🗿", l: "Ancient Statue" },
  { id: 32, e: "🌠", l: "Shooting Star" },
  { id: 33, e: "🎋", l: "Bamboo" },
  { id: 34, e: "🔥", l: "Flame" },
  { id: 35, e: "🦇", l: "Bat" },
  { id: 36, e: "❄️", l: "Snowflake" },
  { id: 37, e: "🐺", l: "Wolf" },
  { id: 38, e: "🌑", l: "Dark Moon" },
  { id: 39, e: "🎑", l: "Moon Festival" },
  { id: 40, e: "🦅", l: "Eagle" },
  { id: 41, e: "🍄", l: "Mushroom" },
  { id: 42, e: "🌀", l: "Spiral" },
  { id: 43, e: "🦊", l: "Fox" },
  { id: 44, e: "🎴", l: "Flower Card" },
  { id: 45, e: "🏺", l: "Ancient Vase" },
  { id: 46, e: "🐋", l: "Whale" },
  { id: 47, e: "✨", l: "Sparkles" },
  { id: 48, e: "🌵", l: "Cactus" },
  { id: 49, e: "🕊️", l: "Dove" },
  { id: 50, e: "🧜", l: "Mermaid" },
  { id: 51, e: "🌏", l: "Earth" },
  { id: 52, e: "🦌", l: "Deer" },
  { id: 53, e: "🪄", l: "Magic Wand" },
  { id: 54, e: "🐸", l: "Frog Prince" },
  { id: 55, e: "🎪", l: "Magic Show" },
  { id: 56, e: "🦋", l: "Metamorphosis" },
  { id: 57, e: "🌊", l: "Tsunami" },
  { id: 58, e: "🧙", l: "Sorcerer" },
  { id: 59, e: "🐲", l: "Sea Dragon" },
  { id: 60, e: "🌙", l: "Crescent" },
];

const HAND_SIZE = 6;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getCard(id) {
  return CARD_POOL.find(c => c.id === id);
}

export default {
  id: "dixit",
  name: "Dixit",

  create(container, api) {
    const players = api.getPlayers();
    const me = api.getMe();
    const isHost = api.isHost();
    const v = api.cssVars;
    const n = players.length;

    let gs = null;          // host-only full state
    let localView = null;   // last view this player received
    let selCard = null;     // selected card id (clue/submit phases)
    let pendingVote = null; // first-tap vote (needs confirm tap)

    // ── Styles ───────────────────────────────────
    const sty = document.createElement("style");
    sty.textContent = `
.dx{display:flex;flex-direction:column;align-items:center;height:100%;overflow-y:auto;font-family:${v.fontBody};padding:12px 12px 60px}
.dx-s{width:100%;max-width:480px}
.dx-clue{background:rgba(192,132,252,.08);border:1px solid rgba(192,132,252,.3);border-radius:12px;padding:10px 16px;text-align:center;margin-bottom:10px;font-size:.9rem;font-style:italic;color:#e9d5ff}
.dx-hand{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:10px 0}
.dx-card{width:76px;height:96px;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;cursor:pointer;background:rgba(255,255,255,.04);border:2px solid rgba(255,255,255,.08);transition:transform .15s,border-color .15s;user-select:none}
.dx-card:hover{border-color:rgba(255,255,255,.2)}
.dx-card.sel{background:rgba(192,132,252,.15);border-color:#c084fc;transform:scale(1.08)}
.dx-card.dim{opacity:.35;cursor:default}
.dx-card .dx-e{font-size:2rem}
.dx-card .dx-l{font-size:.58rem;color:${v.textMuted};text-align:center;line-height:1.2}
.dx-table{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:10px 0}
.dx-tcard{width:82px;min-height:108px;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:4px;padding:8px 4px;background:rgba(255,255,255,.04);border:2px solid rgba(255,255,255,.08);transition:border-color .15s,background .15s;user-select:none}
.dx-tcard.vote-sel{background:rgba(192,132,252,.15);border-color:#c084fc}
.dx-tcard.is-st{background:rgba(192,132,252,.08);border-color:#7c3aed}
.dx-tcard .dx-e{font-size:1.9rem}
.dx-tcard .dx-l{font-size:.58rem;color:${v.textMuted};text-align:center;line-height:1.2}
.dx-tcard .dx-owner{font-size:.6rem;font-weight:700;text-align:center;margin-top:2px}
.dx-tcard .dx-voters{font-size:.58rem;color:#86efac;text-align:center;line-height:1.3;margin-top:2px}
.dx-inp{flex:1;min-width:160px;padding:9px 12px;border-radius:8px;border:1.5px solid rgba(255,255,255,.12);background:rgba(0,0,0,.3);color:#e8e8e8;font-size:.88rem;font-family:${v.fontBody};outline:none;transition:border-color .2s}
.dx-inp:focus{border-color:#c084fc}
.dx-btn{padding:10px 20px;border:none;border-radius:8px;font-family:${v.fontBody};font-weight:700;font-size:.85rem;cursor:pointer;transition:all .2s}
.dx-btn:active{transform:scale(.96)}
.dx-btn-p{background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff}
.dx-btn-g{background:linear-gradient(135deg,#16a34a,#15803d);color:#fff}
.dx-btn-blk{display:block;width:100%;margin-top:10px}
.dx-wait{display:flex;align-items:center;justify-content:center;gap:8px;color:${v.textMuted};font-size:.82rem;margin:10px 0}
.dx-sp{width:16px;height:16px;border:2px solid rgba(255,255,255,.08);border-top-color:#c084fc;border-radius:50%;animation:dxSpin .8s linear infinite;flex-shrink:0}
@keyframes dxSpin{to{transform:rotate(360deg)}}
.dx-conf{text-align:center;margin-top:6px;color:#86efac;font-size:.78rem}
.dx-rows{display:flex;flex-direction:column;gap:4px;margin:10px 0}
.dx-row{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;background:rgba(255,255,255,.02);font-size:.82rem}
.dx-row .dx-dot{width:9px;height:9px;border-radius:50%;border:2px solid rgba(255,255,255,.12);flex-shrink:0}
.dx-row.done .dx-dot{background:#34d399;border-color:#34d399}
.dx-row .dx-rn{flex:1;font-weight:600}
.dx-row .dx-rs{color:${v.textMuted}}
.dx-row.done .dx-rs{color:#34d399}
@keyframes dxSU{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
.dx-anim{animation:dxSU .4s ease both}
    `;
    container.appendChild(sty);

    const W = document.createElement("div");
    W.className = "dx";
    container.appendChild(W);

    // ── Helpers ──────────────────────────────────
    function pN(id) { return players.find(p => p.id === id)?.name ?? id; }
    function mk(tag, opts = {}) {
      const el = document.createElement(tag);
      if (opts.style) el.style.cssText = opts.style;
      if (opts.className) el.className = opts.className;
      if (opts.text != null) el.textContent = opts.text;
      if (opts.placeholder) el.placeholder = opts.placeholder;
      return el;
    }

    // ── HOST: init ───────────────────────────────
    function hostInit() {
      const deck = shuffle(CARD_POOL);
      const hands = {};
      let di = 0;
      for (const p of players) {
        hands[p.id] = deck.slice(di, di + HAND_SIZE).map(c => c.id);
        di += HAND_SIZE;
      }
      gs = {
        phase: "clue", round: 1, stIdx: 0, clue: "",
        submissions: {}, votes: {}, scores: {},
        hands, deck: deck.slice(di).map(c => c.id), tableCards: [],
      };
      for (const p of players) gs.scores[p.id] = 0;
      hostBroadcast();
    }

    function hostBroadcast() {
      for (const p of players) {
        const view = buildView(p.id);
        if (p.id === me.id) applyView(view);
        else api.sendTo(p.id, "dx-state", view);
      }
    }

    function buildView(pid) {
      const reveal = gs.phase === "reveal" || gs.phase === "end";
      return {
        phase: gs.phase, round: gs.round, stIdx: gs.stIdx, clue: gs.clue,
        scores: { ...gs.scores },
        hand: gs.hands[pid] ?? [],
        tableCards: [...gs.tableCards],
        submittedIds: Object.keys(gs.submissions),
        votedIds: Object.keys(gs.votes),
        submissions: reveal ? { ...gs.submissions } : {},
        votes: reveal ? { ...gs.votes } : {},
      };
    }

    // ── HOST: process incoming actions ───────────
    // IMPORTANT: fromId is the peer ID of the sender, passed as second arg to api.on callbacks
    function hostAction(action, payload, fromId) {
      if (!gs) return;
      const stId = players[gs.stIdx]?.id;

      if (action === "dx-set-clue") {
        if (gs.phase !== "clue" || fromId !== stId) return;
        const clue = (payload.clue || "").trim().slice(0, 80);
        if (!clue || !gs.hands[fromId]?.includes(payload.cardId)) return;
        gs.clue = clue;
        gs.submissions[fromId] = payload.cardId;
        gs.phase = "submit";
        hostBroadcast();
      }

      if (action === "dx-submit") {
        if (gs.phase !== "submit" || fromId === stId) return;
        if (gs.submissions[fromId]) return;                         // already submitted
        if (!gs.hands[fromId]?.includes(payload.cardId)) return;   // card not in hand
        gs.submissions[fromId] = payload.cardId;
        const nonSt = players.filter(p => p.id !== stId);
        if (nonSt.every(p => gs.submissions[p.id])) {
          gs.tableCards = shuffle(Object.values(gs.submissions));
          gs.phase = "vote";
        }
        hostBroadcast();
      }

      if (action === "dx-vote") {
        if (gs.phase !== "vote" || fromId === stId) return;
        if (gs.votes[fromId]) return;
        if (gs.submissions[fromId] === payload.cardId) return;  // can't vote own card
        gs.votes[fromId] = payload.cardId;
        const nonSt2 = players.filter(p => p.id !== stId);
        if (nonSt2.every(p => gs.votes[p.id])) {
          hostScore();
          gs.phase = "reveal";
          hostBroadcast();
          api.speak(`Round ${gs.round} results! Clue was: ${gs.clue}`);
        } else {
          hostBroadcast();
        }
      }
    }

    function hostScore() {
      const stId = players[gs.stIdx].id;
      const stCard = gs.submissions[stId];
      const correct = Object.entries(gs.votes).filter(([, c]) => c === stCard).map(([id]) => id);
      const all = correct.length === n - 1, none = correct.length === 0;
      if (all || none) {
        for (const p of players) if (p.id !== stId) gs.scores[p.id] += 2;
      } else {
        gs.scores[stId] += 3;
        for (const id of correct) gs.scores[id] += 3;
      }
      for (const p of players) {
        if (p.id === stId) continue;
        gs.scores[p.id] += Object.values(gs.votes).filter(c => c === gs.submissions[p.id]).length;
      }
    }

    function hostNextRound() {
      if (gs.deck.length < n || gs.round >= n * 3) {
        gs.phase = "end";
        hostBroadcast();
        const top = [...players].sort((a, b) => gs.scores[b.id] - gs.scores[a.id])[0];
        api.speak(`Game over! ${pN(top.id)} wins with ${gs.scores[top.id]} points!`);
        return;
      }
      for (const p of players) { const c = gs.deck.pop(); if (c) gs.hands[p.id].push(c); }
      gs.round++;
      gs.stIdx = (gs.stIdx + 1) % n;
      gs.clue = ""; gs.submissions = {}; gs.votes = {}; gs.tableCards = [];
      gs.phase = "clue";
      hostBroadcast();
      api.speak(`Round ${gs.round}. ${pN(players[gs.stIdx].id)} is the storyteller.`);
    }

    // ── View apply / render ───────────────────────
    // KEY FIX: only reset selCard/pendingVote when the phase changes,
    // not on every state refresh within the same phase.
    function applyView(view) {
      const prevPhase = localView?.phase;
      localView = view;
      if (view.phase !== prevPhase) {
        selCard = null;
        pendingVote = null;
      }
      render();
    }

    function render() {
      if (!localView) {
        W.innerHTML = `<div class="dx-s" style="text-align:center;padding-top:60px"><div style="font-size:3rem;margin-bottom:12px">🌙</div><div class="dx-wait"><div class="dx-sp"></div>Waiting for host to deal cards…</div></div>`;
        return;
      }
      const vw = localView;
      W.innerHTML = "";
      const wrap = mk("div", { className: "dx-s dx-anim" });

      // Header
      const hdr = mk("div", { style: "text-align:center;margin-bottom:8px" });
      hdr.appendChild(mk("div", { style: `font-size:1.3rem;font-weight:700;font-family:${v.fontDisplay};color:#c084fc`, text: "🌙 Dixit" }));
      hdr.appendChild(mk("div", { style: `font-size:.78rem;color:${v.textSec};margin-top:2px`, text: `Round ${vw.round}  ·  Storyteller: ${pN(players[vw.stIdx]?.id)}` }));
      wrap.appendChild(hdr);

      // Scores
      const sr = mk("div", { style: "display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:10px" });
      [...players].sort((a, b) => (vw.scores[b.id] ?? 0) - (vw.scores[a.id] ?? 0)).forEach(p => {
        const isSt = p.id === players[vw.stIdx]?.id;
        sr.appendChild(mk("div", {
          style: `padding:4px 12px;border-radius:20px;font-size:.72rem;font-weight:700;background:${p.id === me.id ? "rgba(192,132,252,.12)" : "rgba(255,255,255,.04)"};border:1px solid ${isSt ? "#c084fc" : p.id === me.id ? "#7c3aed" : "rgba(255,255,255,.08)"};color:${p.id === me.id ? "#e9d5ff" : v.textSec}`,
          text: `${isSt ? "✦ " : ""}${p.name}: ${vw.scores[p.id] ?? 0}pt`
        }));
      });
      wrap.appendChild(sr);

      if (vw.phase === "clue")   renderClue(wrap, vw);
      else if (vw.phase === "submit") renderSubmit(wrap, vw);
      else if (vw.phase === "vote")   renderVote(wrap, vw);
      else if (vw.phase === "reveal") renderReveal(wrap, vw);
      else if (vw.phase === "end")    renderEnd(wrap, vw);

      W.appendChild(wrap);
    }

    // ── Phase renderers ───────────────────────────
    function renderClue(wrap, vw) {
      const stId = players[vw.stIdx]?.id;
      const iAmSt = me.id === stId;
      const ph = mk("div", { style: "text-align:center;margin-bottom:8px" });
      ph.appendChild(mk("div", { style: `font-family:${v.fontDisplay};font-size:1.05rem;margin-bottom:3px`, text: "✦ Give a Clue" }));
      ph.appendChild(mk("div", { style: `color:${v.textSec};font-size:.8rem`, text: iAmSt ? "Pick a card from your hand, then type your clue." : `Waiting for ${pN(stId)} to give a clue…` }));
      wrap.appendChild(ph);
      const hand = vw.hand.map(id => getCard(id)).filter(Boolean);
      if (iAmSt) {
        wrap.appendChild(makeHand(hand, selCard, cid => { selCard = cid; render(); }));
        if (selCard) {
          const row = mk("div", { style: "margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;justify-content:center" });
          const inp = mk("input", { placeholder: "Your clue — a word, phrase, poem, sound…", className: "dx-inp" });
          const btn = mk("button", { text: "Set Clue ✓", className: "dx-btn dx-btn-p" });
          btn.onclick = () => {
            const clue = inp.value.trim();
            if (!clue) { inp.focus(); return; }
            if (isHost) hostAction("dx-set-clue", { clue, cardId: selCard }, me.id);
            else api.send("dx-set-clue", { clue, cardId: selCard });
          };
          inp.onkeydown = e => { if (e.key === "Enter") btn.click(); };
          row.appendChild(inp); row.appendChild(btn);
          wrap.appendChild(row);
        }
      } else {
        wrap.appendChild(makeHandDisabled(hand));
      }
    }

    function renderSubmit(wrap, vw) {
      const stId = players[vw.stIdx]?.id;
      const iAmSt = me.id === stId;
      wrap.appendChild(mk("div", { className: "dx-clue", text: `💬 "${vw.clue}"` }));

      const alreadySubmitted = vw.submittedIds.includes(me.id);
      const nonSt = players.filter(p => p.id !== stId);
      const submittedCount = vw.submittedIds.filter(id => id !== stId).length;

      if (iAmSt) {
        wrap.appendChild(mk("div", { style: "text-align:center;color:#a78bfa;font-size:.82rem;margin-bottom:8px", text: `Waiting for others to submit… (${submittedCount}/${nonSt.length})` }));
        wrap.appendChild(makeStatusList(nonSt, vw.submittedIds));
      } else if (alreadySubmitted) {
        wrap.appendChild(mk("div", { style: "text-align:center;color:#86efac;font-size:.82rem;margin-bottom:8px", text: `✓ Card submitted! Waiting… (${submittedCount}/${nonSt.length})` }));
        wrap.appendChild(makeStatusList(nonSt, vw.submittedIds));
      } else {
        wrap.appendChild(mk("div", { style: "text-align:center;color:#fcd34d;font-size:.82rem;font-weight:700;margin-bottom:8px", text: "Pick a card that best fits the clue!" }));
        const hand = vw.hand.map(id => getCard(id)).filter(Boolean);
        wrap.appendChild(makeHand(hand, selCard, cid => { selCard = cid; render(); }));
        if (selCard) {
          const btn = mk("button", { text: "Submit Card ✓", className: "dx-btn dx-btn-g dx-btn-blk" });
          btn.onclick = () => {
            const cardId = selCard; // capture now — selCard may change
            if (isHost) hostAction("dx-submit", { cardId }, me.id);
            else api.send("dx-submit", { cardId });
          };
          wrap.appendChild(btn);
        }
      }
    }

    function renderVote(wrap, vw) {
      const stId = players[vw.stIdx]?.id;
      const iAmSt = me.id === stId;
      const alreadyVoted = vw.votedIds.includes(me.id);
      const nonSt = players.filter(p => p.id !== stId);
      wrap.appendChild(mk("div", { className: "dx-clue", text: `💬 "${vw.clue}"` }));

      let statusText, statusColor;
      if (iAmSt) { statusText = `Others are voting… (${vw.votedIds.length}/${nonSt.length})`; statusColor = "#a78bfa"; }
      else if (alreadyVoted) { statusText = `✓ Vote cast! Waiting… (${vw.votedIds.length}/${nonSt.length})`; statusColor = "#86efac"; }
      else { statusText = "Which card is the storyteller's?"; statusColor = "#fcd34d"; }
      wrap.appendChild(mk("div", { style: `text-align:center;color:${statusColor};font-size:.82rem;font-weight:700;margin-bottom:8px`, text: statusText }));

      const table = mk("div", { className: "dx-table" });
      for (const cid of vw.tableCards) {
        const c = getCard(cid);
        if (!c) continue;
        const isSel = pendingVote === cid;
        const canVote = !iAmSt && !alreadyVoted;
        const tc = mk("div", { className: "dx-tcard" + (isSel ? " vote-sel" : "") });
        if (canVote) tc.style.cursor = "pointer";
        tc.appendChild(mk("span", { className: "dx-e", text: c.e }));
        tc.appendChild(mk("span", { className: "dx-l", text: c.l }));
        if (canVote) {
          tc.onclick = () => {
            if (pendingVote === cid) {
              pendingVote = null;
              if (isHost) hostAction("dx-vote", { cardId: cid }, me.id);
              else api.send("dx-vote", { cardId: cid });
            } else { pendingVote = cid; render(); }
          };
        }
        table.appendChild(tc);
      }
      wrap.appendChild(table);
      if (!iAmSt && !alreadyVoted && pendingVote) {
        wrap.appendChild(mk("div", { className: "dx-conf", text: "Tap again to confirm your vote ✓" }));
      }
    }

    function renderReveal(wrap, vw) {
      const stId = players[vw.stIdx]?.id;
      const stCard = vw.submissions[stId];
      wrap.appendChild(mk("div", { className: "dx-clue", text: `💬 "${vw.clue}"` }));
      wrap.appendChild(mk("div", { style: "text-align:center;color:#f9a8d4;font-size:.85rem;font-weight:700;margin-bottom:8px", text: "✦ Results!" }));

      const table = mk("div", { className: "dx-table" });
      for (const cid of vw.tableCards) {
        const c = getCard(cid);
        if (!c) continue;
        const isSt = cid === stCard;
        const owner = Object.entries(vw.submissions).find(([, id]) => id === cid)?.[0];
        const voters = Object.entries(vw.votes).filter(([, id]) => id === cid).map(([pid]) => pN(pid));
        const tc = mk("div", { className: "dx-tcard" + (isSt ? " is-st" : "") });
        tc.appendChild(mk("span", { className: "dx-e", text: c.e }));
        tc.appendChild(mk("span", { className: "dx-l", text: c.l }));
        tc.appendChild(mk("div", { className: "dx-owner", style: `color:${isSt ? "#d8b4fe" : v.textSec}`, text: (isSt ? "✦ " : "") + (owner ? pN(owner) : "") }));
        if (voters.length) tc.appendChild(mk("div", { className: "dx-voters", text: "← " + voters.join(", ") }));
        table.appendChild(tc);
      }
      wrap.appendChild(table);

      if (isHost) {
        const btn = mk("button", { text: "▶ Next Round", className: "dx-btn dx-btn-p dx-btn-blk" });
        btn.style.marginTop = "14px";
        btn.onclick = () => hostNextRound();
        wrap.appendChild(btn);
      } else {
        const w = mk("div", { className: "dx-wait", style: "margin-top:12px" });
        w.innerHTML = `<div class="dx-sp"></div> Waiting for host to start next round…`;
        wrap.appendChild(w);
      }
    }

    function renderEnd(wrap, vw) {
      wrap.appendChild(mk("div", { style: `text-align:center;font-family:${v.fontDisplay};font-size:1.5rem;color:#c084fc;margin-bottom:10px`, text: "🌙 Game Over!" }));
      const sorted = [...players].sort((a, b) => (vw.scores[b.id] ?? 0) - (vw.scores[a.id] ?? 0));
      const medals = ["🥇", "🥈", "🥉"];
      const podium = mk("div", { style: "display:flex;flex-direction:column;gap:6px;align-items:center;margin-bottom:16px" });
      sorted.forEach((p, i) => podium.appendChild(mk("div", {
        style: `font-size:${i === 0 ? "1.1rem" : ".9rem"};font-weight:700;color:${p.id === me.id ? "#e9d5ff" : v.text}`,
        text: `${medals[i] ?? "  "} ${p.name}: ${vw.scores[p.id] ?? 0} pts`
      })));
      wrap.appendChild(podium);
      if (isHost) {
        const btn = mk("button", { text: "↺ Play Again", className: "dx-btn dx-btn-p" });
        btn.onclick = () => { selCard = null; pendingVote = null; hostInit(); };
        wrap.appendChild(btn);
      }
    }

    // ── Card hand helpers ─────────────────────────
    function makeHand(hand, selId, onSelect) {
      const wrap = mk("div", { className: "dx-hand" });
      for (const c of hand) {
        const el = mk("div", { className: "dx-card" + (c.id === selId ? " sel" : "") });
        el.appendChild(mk("span", { className: "dx-e", text: c.e }));
        el.appendChild(mk("span", { className: "dx-l", text: c.l }));
        el.onclick = () => onSelect(c.id);
        wrap.appendChild(el);
      }
      return wrap;
    }

    function makeHandDisabled(hand) {
      const wrap = mk("div", { className: "dx-hand", style: "opacity:.4" });
      for (const c of hand) {
        const el = mk("div", { className: "dx-card dim" });
        el.appendChild(mk("span", { className: "dx-e", text: c.e }));
        el.appendChild(mk("span", { className: "dx-l", text: c.l }));
        wrap.appendChild(el);
      }
      return wrap;
    }

    function makeStatusList(playerList, doneIds) {
      const list = mk("div", { className: "dx-rows" });
      for (const p of playerList) {
        const done = doneIds.includes(p.id);
        const row = mk("div", { className: "dx-row" + (done ? " done" : "") });
        row.appendChild(mk("div", { className: "dx-dot" }));
        row.appendChild(mk("div", { className: "dx-rn", text: p.name }));
        row.appendChild(mk("div", { className: "dx-rs", text: done ? "✓ Done" : "Waiting" }));
        list.appendChild(row);
      }
      return list;
    }

    // ── Network listeners ─────────────────────────
    // The Party Arena api.on callback signature is: (payload, fromPeerId)
    // payload = the data.payload field from the game-action message
    // fromPeerId = the peer who sent it (second argument)

    api.on("dx-state", (payload) => {
      // Host sends state directly via sendTo — payload IS the view object
      applyView(payload);
    });

    api.on("dx-set-clue", (payload, fromId) => {
      if (!isHost) return;
      hostAction("dx-set-clue", payload, fromId);
    });

    api.on("dx-submit", (payload, fromId) => {
      if (!isHost) return;
      hostAction("dx-submit", payload, fromId);
    });

    api.on("dx-vote", (payload, fromId) => {
      if (!isHost) return;
      hostAction("dx-vote", payload, fromId);
    });

    api.on("dx-next", (_payload, _fromId) => {
      if (!isHost) return;
      hostNextRound();
    });

    // ── Start ─────────────────────────────────────
    if (isHost) {
      hostInit();
      api.speak(`Dixit! Round 1. ${pN(players[0].id)} is the storyteller.`);
    } else {
      render(); // show waiting screen until first dx-state arrives
    }

    return {
      destroy() {
        api.stopSpeaking();
        container.innerHTML = "";
      }
    };
  }
};
