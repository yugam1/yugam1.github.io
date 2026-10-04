// ═══════════════════════════════════════════════
//  17 POKER — Party Arena Game Module
//  "Seventeen Poker" from the manga Liar Game.
//  Heads-up, 10 hands, 17-card deck, Joker wild.
// ═══════════════════════════════════════════════

const SUITS = ['s', 'h', 'd', 'c'];
const SUIT_CHAR = { s: '♠', h: '♥', d: '♦', c: '♣' };
const RANK_VAL = { T: 0, J: 1, Q: 2, K: 3, A: 4 };
const NATURAL_RANKS = ['J', 'Q', 'K', 'A'];
// The Joker may also play as the 10 that completes T-J-Q-K-A — the deck's
// only possible straight, and its only possible flush (a Royal Flush).
const JOKER_RANKS = ['T', 'J', 'Q', 'K', 'A'];

const ANTE = 5;
const MIN_BET = 5;
const MAX_BET = ANTE * 6; // 30 — "the maximum bet is six times the ante"
const MAX_RAISES = 3;
const HANDS_PER_MATCH = 10;
const START_CHIPS = 200;

const DECK_MODES = {
  random: {
    label: 'Random shuffle',
    short: 'Random shuffle',
    blurb: 'The dealer shuffles properly every hand. Nothing is predictable — pure poker.',
  },
  sealed: {
    label: 'Sealed deck + perfect riffles',
    short: 'Sealed deck',
    blurb: 'A factory-ordered deck riffled perfectly a stated number of times. The order is fully determined — and so is the deal, if you can do the maths.',
  },
};

const CAT_NAME = [
  'One Pair', 'Two Pair', 'Three of a Kind', 'Straight',
  'Full House', 'Four of a Kind', 'Royal Flush', 'Five of a Kind',
];
const C_PAIR = 0, C_TWO = 1, C_TRIPS = 2, C_STRAIGHT = 3,
      C_FULL = 4, C_QUADS = 5, C_ROYAL = 6, C_FIVE = 7;

// A sealed deck's order is knowable, which is the whole premise of the
// manga's exploit: suit by suit, low to high (J Q K A), Joker last.
function factoryDeck() {
  const d = [];
  for (const s of SUITS) for (const r of NATURAL_RANKS) d.push({ r, s });
  d.push({ r: 'X', s: null });
  return d;
}

// Perfect riffle (out-shuffle) on 17 cards: top 9 / bottom 8, interleaved
// top first. It is a permutation of order 8 — eight of them restore the
// deck exactly — because 2^8 = 1 (mod 17). The TV adaptation says six;
// that is wrong for a 17-card faro.
const FARO_PERIOD = 8;

function faro(d) {
  const half = Math.ceil(d.length / 2);
  const top = d.slice(0, half);
  const bot = d.slice(half);
  const out = [];
  for (let i = 0; i < half; i++) {
    out.push(top[i]);
    if (i < bot.length) out.push(bot[i]);
  }
  return out;
}

// ── Deck ──────────────────────────────────────────────────────────
function makeDeck() {
  const d = [];
  for (const r of NATURAL_RANKS) for (const s of SUITS) d.push({ r, s });
  d.push({ r: 'X', s: null }); // Joker
  return d;
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Move n cards from the top of the pack to the bottom. deck[0] is the top.
function cutDeck(deck, n) {
  const k = ((n % deck.length) + deck.length) % deck.length;
  return deck.slice(k).concat(deck.slice(0, k));
}

// ── Hand evaluation ───────────────────────────────────────────────
// Scores are comparable arrays: [category, ...rank tiebreakers].
// Only four natural ranks exist, so every five-card hand pairs; there is no
// high-card tier. Five of a Kind, Royal Flush and Straight all need the
// Joker, and there is exactly one — so at most one player can hold any of
// them in a given hand.
function scoreNatural(cards) {
  const counts = new Map();
  for (const c of cards) counts.set(c.r, (counts.get(c.r) || 0) + 1);

  const groups = [...counts.entries()]
    .map(([r, n]) => ({ v: RANK_VAL[r], n }))
    .sort((a, b) => b.n - a.n || b.v - a.v);
  const kickers = groups.filter((g) => g.n === 1).map((g) => g.v);

  const flush = cards.every((c) => c.s === cards[0].s);
  const run = counts.size === 5; // only T-J-Q-K-A can give five distinct ranks

  if (groups[0].n === 5) return [C_FIVE, groups[0].v];
  if (run && flush) return [C_ROYAL];
  if (groups[0].n === 4) return [C_QUADS, groups[0].v, ...kickers];
  if (groups[0].n === 3 && groups[1].n === 2) return [C_FULL, groups[0].v, groups[1].v];
  if (run) return [C_STRAIGHT];
  if (groups[0].n === 3) return [C_TRIPS, groups[0].v, ...kickers];
  if (groups[0].n === 2 && groups[1].n === 2) return [C_TWO, groups[0].v, groups[1].v, ...kickers];
  return [C_PAIR, groups[0].v, ...kickers];
}

function cmpScore(a, b) {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i] ?? -1;
    const y = b[i] ?? -1;
    if (x !== y) return x - y;
  }
  return 0;
}

// The Joker is wild: it takes any rank and suit, including a duplicate of a
// card already in the hand (that is what makes Five of a Kind reachable).
// Brute-force all 20 substitutions and keep the best — provably optimal.
function evalHand(cards) {
  const ji = cards.findIndex((c) => c.r === 'X');
  if (ji < 0) {
    const score = scoreNatural(cards);
    return { score, jokerAs: null, name: CAT_NAME[score[0]] };
  }
  let best = null;
  for (const r of JOKER_RANKS) {
    for (const s of SUITS) {
      const trial = cards.slice();
      trial[ji] = { r, s };
      const score = scoreNatural(trial);
      if (!best || cmpScore(score, best.score) > 0) best = { score, jokerAs: { r, s } };
    }
  }
  return { ...best, name: CAT_NAME[best.score[0]] };
}

// ── Formatting ────────────────────────────────────────────────────
function rankLabel(r) {
  return r === 'T' ? '10' : r;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

// Compact form used by the deal audit: "A♠", "10♦", "JK".
function code(c) {
  if (!c) return '??';
  return c.r === 'X' ? 'JK' : rankLabel(c.r) + SUIT_CHAR[c.s];
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export default {
  create(container, api) {
    const me = api.getMe();
    const isLocal = api.isLocal();
    const isHost = api.isHost();
    const v = api.cssVars;

    // Seat 0 is the host, seat 1 the guest. In local mode one device plays both.
    const mySeat = isLocal ? null : (isHost ? 0 : 1);
    const authoritative = isHost || isLocal;

    function seatNames() {
      const ps = api.getPlayers();
      if (isLocal) return [ps[0]?.name || 'Player 1', ps[1]?.name || 'Player 2'];
      const hostP = ps.find((p) => p.isHost);
      const guestP = ps.find((p) => !p.isHost);
      return [hostP?.name || 'Host', guestP?.name || 'Opponent'];
    }

    function guestId() {
      return api.getPlayers().find((p) => p.id !== me.id)?.id || null;
    }

    // ── State ───────────────────────────────────────────────────────
    // PS is the public state every player sees. H/STUB/DECK are host-only
    // (hidden information) and never leave the authoritative device except
    // as a private per-seat deal.
    let PS = null;
    let H = [[], []];
    let STUB = [];
    let DECK = [];
    // Deal audit, host-only. Kept out of PS so it isn't re-sent on every
    // action; it ships once, attached to the final state at match end.
    let TRACES = [];
    let T = null;
    let myHand = null; // this device's own cards (guest copy / host mirror)

    // UI-local
    let betAmt = MIN_BET;
    let cutAmt = 0;
    let selected = new Set(); // card indices marked for discard
    let curtain = false;      // local mode: hide cards while passing the device
    let lastSeen = null;
    // Animations fire only when the thing they describe actually changed —
    // render() runs on every click, and re-dealing on each one would twitch.
    let lastHandKey = '';
    let lastOppKey = '';
    let lastRevealKey = '';
    let revealAnim = '';

    function freshPS() {
      return {
        phase: 'setup', // setup | cut | bet1 | draw | bet2 | result | match-over
        setupStep: 'mode', // mode | faros
        deckMode: null,
        faroChoice: null, // fixed riffle count, or 0 for "random each hand"
        faros: null,
        handNo: 1,
        chips: [START_CHIPS, START_CHIPS],
        pot: 0,
        house: 0,
        button: 0, // acts first this hand; alternates each hand
        toAct: 0,
        bets: [0, 0],
        checked: [false, false],
        raises: 0,
        cuts: [null, null],
        drawn: [null, null],
        result: null,
        lastAudit: null,
        finalMsg: '',
        log: [],
        names: seatNames(),
      };
    }

    function note(msg) {
      PS.log.push(msg);
      if (PS.log.length > 40) PS.log.shift();
    }

    // ── Host: hand lifecycle ────────────────────────────────────────
    function startHand() {
      if (PS.deckMode === 'sealed') {
        // Everything here is public: both players are told how many riffles
        // the dealer gave it, and a sealed deck's starting order is known.
        PS.faros = PS.faroChoice > 0
          ? PS.faroChoice
          : 1 + Math.floor(Math.random() * FARO_PERIOD);
        DECK = factoryDeck();
        for (let i = 0; i < PS.faros; i++) DECK = faro(DECK);
      } else {
        PS.faros = null;
        DECK = shuffle(makeDeck());
      }
      T = {
        hand: PS.handNo,
        button: PS.button,
        names: PS.names.slice(),
        mode: PS.deckMode,
        faros: PS.faros,
        factory: PS.deckMode === 'sealed' ? factoryDeck().map(code) : null,
        shuffled: DECK.map(code),
        cuts: [],
        dealt: [[], []],
        stub: [],
        draws: [],
        final: null,
        outcome: null,
      };
      H = [[], []];
      STUB = [];
      PS.pot = 0;
      PS.bets = [0, 0];
      PS.checked = [false, false];
      PS.raises = 0;
      PS.cuts = [null, null];
      PS.drawn = [null, null];
      PS.result = null;
      PS.lastAudit = null;
      PS.phase = 'cut';
      PS.toAct = PS.button;
      note(PS.deckMode === 'sealed'
        ? `— Hand ${PS.handNo} — sealed deck, riffled ${plural(PS.faros, 'time')}. ${PS.names[PS.button]} cuts first.`
        : `— Hand ${PS.handNo} — fresh deck, shuffled. ${PS.names[PS.button]} cuts first.`);
    }

    function deal() {
      PS.chips[0] -= ANTE;
      PS.chips[1] -= ANTE;
      PS.pot = ANTE * 2;
      const first = PS.button;
      const second = 1 - first;
      for (let i = 0; i < 5; i++) {
        H[first].push(DECK.shift());
        H[second].push(DECK.shift());
      }
      STUB = DECK.slice(); // 7 cards remain
      DECK = [];
      T.dealt = [H[0].map(code), H[1].map(code)];
      T.stub = STUB.map(code);
      PS.phase = 'bet1';
      PS.toAct = PS.button;
      note(`Antes posted (${ANTE} each). Cards dealt.`);
    }

    function commit(seat, amt) {
      PS.chips[seat] -= amt;
      PS.bets[seat] += amt;
      PS.pot += amt;
    }

    function endBettingRound() {
      if (PS.phase === 'bet1') {
        if (PS.checked[0] && PS.checked[1]) return resolveNoContest();
        PS.bets = [0, 0];
        PS.checked = [false, false];
        PS.raises = 0;
        PS.drawn = [null, null];
        PS.phase = 'draw';
        PS.toAct = PS.button;
        note('Both in — the draw.');
      } else {
        resolveShowdown();
      }
    }

    // Every hand ends through exactly one of the three resolvers below, so
    // this is the single place the trace gets sealed.
    function closeTrace(summary) {
      if (!T) return;
      const e0 = evalHand(H[0]);
      const e1 = evalHand(H[1]);
      T.final = [
        { cards: H[0].map(code), name: e0.name, jokerAs: e0.jokerAs ? code(e0.jokerAs) : null },
        { cards: H[1].map(code), name: e1.name, jokerAs: e1.jokerAs ? code(e1.jokerAs) : null },
      ];
      T.outcome = summary;
      TRACES.push(T);
      PS.lastAudit = T; // shown on the hand-over screen, cleared next deal
      T = null;
    }

    function resolveNoContest() {
      PS.house += PS.pot;
      PS.result = { reason: 'no-contest', winner: -1, potWon: 0, toHouse: PS.pot, reveal: null };
      note(`No contest — both checked. ${PS.pot} chips to the dealer.`);
      closeTrace({ reason: 'no-contest', winner: -1, potWon: 0, toHouse: PS.pot });
      PS.pot = 0;
      PS.phase = 'result';
    }

    function resolveFold(folder) {
      const winner = 1 - folder;
      const toHouse = Math.min(PS.pot, ANTE * 2);
      const toWinner = PS.pot - toHouse;
      PS.house += toHouse;
      PS.chips[winner] += toWinner;
      PS.result = { reason: 'fold', winner, folder, potWon: toWinner, toHouse, reveal: null };
      note(`${PS.names[folder]} folds. No contest: antes (${toHouse}) to the dealer, ${toWinner} to ${PS.names[winner]}.`);
      closeTrace({ reason: 'fold', winner, folder, potWon: toWinner, toHouse });
      PS.pot = 0;
      PS.phase = 'result';
    }

    function resolveShowdown() {
      const e0 = evalHand(H[0]);
      const e1 = evalHand(H[1]);
      const c = cmpScore(e0.score, e1.score);
      const winner = c > 0 ? 0 : c < 0 ? 1 : -1;
      const pot = PS.pot;

      if (winner >= 0) {
        PS.chips[winner] += pot;
      } else {
        const half = Math.floor(pot / 2);
        PS.chips[0] += half;
        PS.chips[1] += half;
        PS.chips[PS.button] += pot - half * 2; // odd chip to the button
      }

      PS.result = {
        reason: 'showdown',
        winner,
        potWon: pot,
        toHouse: 0,
        reveal: [
          { cards: H[0], name: e0.name, jokerAs: e0.jokerAs },
          { cards: H[1], name: e1.name, jokerAs: e1.jokerAs },
        ],
      };
      note(
        winner < 0
          ? `Split pot — both hold ${e0.name}.`
          : `${PS.names[winner]} wins ${pot} with ${winner === 0 ? e0.name : e1.name}.`,
      );
      closeTrace({ reason: 'showdown', winner, potWon: pot, toHouse: 0 });
      PS.pot = 0;
      PS.phase = 'result';
    }

    function nextHand() {
      if (PS.handNo >= HANDS_PER_MATCH) return endMatch('All 10 hands played.');
      if (PS.chips[0] < ANTE || PS.chips[1] < ANTE) {
        return endMatch('A player can no longer post the ante.');
      }
      PS.handNo += 1;
      PS.button = 1 - PS.button;
      startHand();
    }

    function endMatch(why) {
      PS.phase = 'match-over';
      PS.result = null;
      const [a, b] = PS.chips;
      PS.finalMsg = a === b
        ? `Dead even at ${a} chips each.`
        : `${PS.names[a > b ? 0 : 1]} takes the match, ${Math.max(a, b)} chips to ${Math.min(a, b)}.`;
      PS.audit = TRACES;
      note(`${why} ${PS.finalMsg}`);
    }

    function restartMatch() {
      const names = PS.names;
      TRACES = [];
      T = null;
      PS = freshPS();
      PS.names = names;
      note('New match — the host picks how the deck is prepared.');
    }

    // ── Host: action reducer ────────────────────────────────────────
    function applyAction(seat, a) {
      if (!authoritative || !a) return;

      if (PS.phase === 'match-over') {
        if (a.k === 'restart') { restartMatch(); pushState(); }
        return;
      }
      if (PS.phase === 'result') {
        if (a.k === 'next') { nextHand(); pushState(); }
        return;
      }
      if (PS.phase === 'setup') {
        // Host's call only — the guest never gets these controls.
        if (seat !== 0) return;
        if (a.k === 'back') {
          PS.setupStep = 'mode';
          PS.deckMode = null;
          pushState();
          return;
        }
        if (a.k === 'mode') {
          if (!DECK_MODES[a.m]) return;
          PS.deckMode = a.m;
          if (a.m === 'sealed') {
            PS.setupStep = 'faros'; // one more question before we deal
            pushState();
            return;
          }
          note(`Deck: ${DECK_MODES[a.m].label}.`);
          startHand();
          pushState();
          return;
        }
        if (a.k === 'faros') {
          if (PS.deckMode !== 'sealed') return;
          const n = Math.floor(a.n);
          if (!Number.isInteger(n) || n < 0 || n > FARO_PERIOD) return;
          PS.faroChoice = n;
          note(n > 0
            ? `Deck: sealed, ${plural(n, 'perfect riffle')} every hand.`
            : 'Deck: sealed, riffle count varies each hand.');
          startHand();
          pushState();
        }
        return;
      }
      if (seat !== PS.toAct) return;

      const other = 1 - seat;

      if (PS.phase === 'cut') {
        if (a.k !== 'cut') return;
        const n = Math.max(0, Math.min(16, Math.floor(a.n) || 0));
        DECK = cutDeck(DECK, n);
        T.cuts.push({ seat, n, after: DECK.map(code) });
        PS.cuts[seat] = n;
        note(`${PS.names[seat]} sends ${plural(n, 'card')} to the bottom.`);
        if (PS.cuts[other] !== null) deal();
        else PS.toAct = other;
        pushState();
        return;
      }

      if (PS.phase === 'draw') {
        if (a.k !== 'draw') return;
        const idx = [...new Set((a.idx || []).map(Number))]
          .filter((i) => Number.isInteger(i) && i >= 0 && i < 5)
          .slice(0, 5);
        const discards = idx.map((i) => H[seat][i]);
        const keep = H[seat].filter((_, i) => !idx.includes(i));
        // Discards go to the bottom of the stub, replacements come off the
        // top — so the pack never runs dry, and a player who draws big may
        // be handed cards the other player just threw away.
        const fresh = STUB.splice(0, discards.length);
        STUB.push(...discards);
        H[seat] = keep.concat(fresh);
        T.draws.push({
          seat,
          discarded: discards.map(code),
          received: fresh.map(code),
          handAfter: H[seat].map(code),
          stubAfter: STUB.map(code),
        });
        PS.drawn[seat] = discards.length;
        note(discards.length === 0
          ? `${PS.names[seat]} stands pat.`
          : `${PS.names[seat]} draws ${plural(discards.length, 'card')}.`);
        if (PS.drawn[other] !== null) {
          PS.phase = 'bet2';
          PS.toAct = PS.button;
          note('Second round of betting.');
        } else {
          PS.toAct = other;
        }
        pushState();
        return;
      }

      if (PS.phase !== 'bet1' && PS.phase !== 'bet2') return;

      const owed = PS.bets[other] - PS.bets[seat];

      if (a.k === 'check') {
        if (owed > 0) return;
        PS.checked[seat] = true;
        note(`${PS.names[seat]} checks.`);
        if (PS.checked[other]) endBettingRound();
        else PS.toAct = other;
        pushState();
        return;
      }

      if (a.k === 'bet') {
        if (owed > 0) return;
        const amt = Math.min(
          Math.max(MIN_BET, Math.min(MAX_BET, Math.floor(a.amt) || 0)),
          PS.chips[seat],
        );
        if (amt <= 0) return;
        commit(seat, amt);
        PS.checked = [false, false];
        PS.raises = 0;
        note(`${PS.names[seat]} bets ${amt}.`);
        PS.toAct = other;
        pushState();
        return;
      }

      if (a.k === 'raise') {
        if (owed <= 0 || PS.raises >= MAX_RAISES) return;
        const extra = Math.max(MIN_BET, Math.min(MAX_BET, Math.floor(a.amt) || 0));
        const total = Math.min(owed + extra, PS.chips[seat]);
        if (total <= owed) return; // can't actually raise — call or fold
        commit(seat, total);
        PS.raises += 1;
        note(`${PS.names[seat]} raises ${total - owed} (to ${PS.bets[seat]}).`);
        PS.toAct = other;
        pushState();
        return;
      }

      if (a.k === 'call') {
        if (owed <= 0) return;
        const paid = Math.min(owed, PS.chips[seat]);
        commit(seat, paid);
        const short = owed - paid;
        if (short > 0) {
          // All-in for less: hand the uncalled remainder back.
          PS.pot -= short;
          PS.chips[other] += short;
          PS.bets[other] -= short;
          note(`${PS.names[seat]} calls all-in for ${paid}; ${short} returned.`);
        } else {
          note(`${PS.names[seat]} calls ${paid}.`);
        }
        endBettingRound();
        pushState();
        return;
      }

      if (a.k === 'fold') {
        resolveFold(seat);
        pushState();
      }
    }

    // ── Networking ──────────────────────────────────────────────────
    function publicState() {
      return JSON.parse(JSON.stringify(PS));
    }

    function pushState() {
      if (isLocal) { onStateChanged(); return; }
      api.send('p17-state', publicState());
      const gid = guestId();
      if (gid) api.sendTo(gid, 'p17-hand', { cards: H[1] });
      myHand = H[0];
      api.setResumeState({ PS: publicState(), H, STUB, DECK, TRACES });
      onStateChanged();
    }

    function act(a) {
      if (authoritative) applyAction(isLocal ? PS.toAct : 0, a);
      else api.send('p17-act', a);
    }

    // ── Local-mode privacy curtain ──────────────────────────────────
    const PRIVATE_PHASES = new Set(['bet1', 'draw', 'bet2']);

    function onStateChanged() {
      if (isLocal) {
        const key = `${PS.phase}:${PS.toAct}`;
        if (PRIVATE_PHASES.has(PS.phase) && lastSeen !== null && key !== lastSeen) {
          curtain = true;
        }
        lastSeen = key;
      }
      selected = new Set();
      betAmt = MIN_BET;
      cutAmt = 0;
      render();
    }

    // ── Views ───────────────────────────────────────────────────────
    // Whose cards this device is allowed to see right now.
    function viewSeat() {
      if (!isLocal) return mySeat;
      if (PS.phase === 'result' || PS.phase === 'match-over') return PS.button;
      return PS.toAct;
    }

    function handFor(seat) {
      if (isLocal) return H[seat];
      if (seat === mySeat) return myHand;
      return null;
    }

    function myTurn() {
      if (PS.phase === 'result' || PS.phase === 'match-over') return true;
      return isLocal ? true : PS.toAct === mySeat;
    }

    // #game-container is `position:relative; overflow:hidden` in the host app
    // (canvas games must not scroll), so a tall screen like this one gets
    // clipped and the bottom becomes unreachable. Fill the container
    // absolutely and scroll inside it instead of trying to grow it.
    const ROOT = `position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;
      -webkit-overflow-scrolling:touch;display:flex;flex-direction:column;
      align-items:center;font-family:'Quicksand',sans-serif;color:#e2e8f0;`;
    // Centring a scroll container with justify-content makes the overflow
    // unreachable at the top — centre with auto margins instead.
    const CENTRED = 'margin:auto;width:100%;display:flex;flex-direction:column;align-items:center;';

    // ── Card rendering ──────────────────────────────────────────────
    // Real card faces, built from CSS + inline SVG rather than a sprite
    // library: the deck is only 17 faces (A/K/Q/J in four suits, plus the
    // Joker) and local/offline play must keep working with nothing loaded
    // from the network.
    const EMBLEM = {
      // King: heraldic crown topped by a bold cross.
      K: `<svg viewBox="0 0 24 21" aria-hidden="true">
            <path d="M10.8 0h2.4v2.1h2.1v2.4h-2.1v2.1h-2.4V4.5H8.7V2.1h2.1z"/>
            <path d="M2.6 16.2 1 6.6l6.3 4.1L12 4.9l4.7 5.8L23 6.6l-1.6 9.6z"/>
            <rect x="2.4" y="17.4" width="19.2" height="2.6" rx="1.2"/>
            <circle cx="1.5" cy="6" r="1.6"/><circle cx="22.5" cy="6" r="1.6"/>
          </svg>`,
      // Queen: fleur-de-lis — a silhouette nothing like the King's crown,
      // which matters at 62px where two crowns read as the same card.
      Q: `<svg viewBox="0 0 24 21" aria-hidden="true">
            <path d="M12 .8c1.8 2.9 2.6 5.2 2.6 7 0 1.6-.8 2.9-2.6 4.3-1.8-1.4-2.6-2.7-2.6-4.3 0-1.8.8-4.1 2.6-7z"/>
            <path d="M9.6 6.9c-2.3-1.1-4.6-.7-5.8.9-1.2 1.6-.7 3.9 1.1 5.2 1.2.9 2.8 1.2 4.3.9-1.1-1.3-1.5-2.8-1.3-4.2.1-1 .5-1.9 1.7-2.8z"/>
            <path d="M14.4 6.9c2.3-1.1 4.6-.7 5.8.9 1.2 1.6.7 3.9-1.1 5.2-1.2.9-2.8 1.2-4.3.9 1.1-1.3 1.5-2.8 1.3-4.2-.1-1-.5-1.9-1.7-2.8z"/>
            <rect x="7.2" y="13.6" width="9.6" height="2.2" rx="1"/>
            <rect x="10.9" y="15.8" width="2.2" height="4.4" rx="1"/>
          </svg>`,
      J: `<svg viewBox="0 0 24 21" aria-hidden="true">
            <path d="M12 .7 13.9 4.6v9.1h-3.8V4.6z"/>
            <rect x="6.4" y="14.1" width="11.2" height="2.3" rx="1.1"/>
            <rect x="10.7" y="16.6" width="2.6" height="3.9" rx="1.2"/>
            <circle cx="12" cy="18.6" r="1.6"/>
          </svg>`,
      X: `<svg viewBox="0 0 24 21" aria-hidden="true">
            <path d="M12 5.4c-3.7 0-6.8 2.3-7.6 5.4L1.6 8.6l1.1 7.9h18.6l1.1-7.9-2.8 2.2c-.8-3.1-3.9-5.4-7.6-5.4z"/>
            <circle cx="12" cy="3.6" r="2"/>
            <circle cx="1.4" cy="8.1" r="1.7"/><circle cx="22.6" cy="8.1" r="1.7"/>
          </svg>`,
    };

    const STYLE_ID = 'p17-card-styles';

    function ensureStyles() {
      if (document.getElementById(STYLE_ID)) return;
      const el = document.createElement('style');
      el.id = STYLE_ID;
      el.textContent = `
        .p17-hand { display:flex; justify-content:center; flex-wrap:wrap; perspective:1000px; }
        .p17-hand--lg { gap:8px; }
        .p17-hand--sm { gap:5px; }

        .p17c {
          --w:62px; --h:88px;
          position:relative; flex:0 0 auto; width:var(--w); height:var(--h);
          border:0; padding:0; border-radius:calc(var(--w) * 0.13);
          background:linear-gradient(157deg,#fffdf7 0%,#f6f3e9 52%,#e9e4d4 100%);
          box-shadow:0 1px 0 rgba(0,0,0,.45), 0 5px 14px rgba(0,0,0,.45),
                     inset 0 0 0 1px rgba(255,255,255,.85);
          font-family:'Quicksand',sans-serif; color:#1b2030; overflow:hidden;
          transform-style:preserve-3d;
          transition:transform .18s cubic-bezier(.2,.8,.3,1), box-shadow .18s ease, filter .18s ease;
        }
        .p17c--sm { --w:46px; --h:65px; }

        /* gloss + inner rule */
        .p17c::before {
          content:''; position:absolute; inset:0; pointer-events:none;
          background:linear-gradient(140deg,rgba(255,255,255,.7),rgba(255,255,255,0) 45%);
        }
        .p17c::after {
          content:''; position:absolute; inset:3px; pointer-events:none;
          border-radius:calc(var(--w) * 0.09);
          border:1px solid rgba(27,32,48,.13);
        }

        .p17c--red { color:#c0283f; }
        .p17c--black { color:#1d2230; }
        .p17c--joker {
          background:linear-gradient(157deg,#fffdf5 0%,#f8f0da 55%,#efe2bd 100%);
          color:#b07a12;
        }

        .p17c__idx {
          position:absolute; display:flex; flex-direction:column; align-items:center;
          line-height:.92; font-weight:800; letter-spacing:-.5px;
        }
        .p17c__idx--tl { top:5%; left:7%; }
        .p17c__idx--br { bottom:5%; right:7%; transform:rotate(180deg); }
        .p17c__r { font-size:calc(var(--w) * .27); }
        .p17c__s { font-size:calc(var(--w) * .22); margin-top:1px; }

        .p17c__mid {
          position:absolute; inset:0; display:flex; align-items:center;
          justify-content:center; flex-direction:column; gap:2px;
        }
        .p17c__mid svg { width:52%; height:auto; fill:currentColor; opacity:.92; }
        .p17c__pip { font-size:calc(var(--w) * .62); line-height:1; }
        .p17c__word {
          font-family:'Righteous',cursive; font-size:calc(var(--w) * .145);
          letter-spacing:1.5px; opacity:.75;
        }

        /* card back */
        .p17c--back {
          background:
            repeating-linear-gradient(45deg, rgba(251,191,36,.17) 0 5px, transparent 5px 10px),
            repeating-linear-gradient(-45deg, rgba(251,191,36,.17) 0 5px, transparent 5px 10px),
            linear-gradient(157deg,#19203a 0%,#0d1222 100%);
          box-shadow:0 1px 0 rgba(0,0,0,.5), 0 5px 14px rgba(0,0,0,.5),
                     inset 0 0 0 1px rgba(251,191,36,.3);
          color:rgba(251,191,36,.85);
        }
        .p17c--back::before { background:none; }
        .p17c--back::after { border-color:rgba(251,191,36,.25); }
        .p17c__crest {
          position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
          font-family:'Righteous',cursive; font-size:calc(var(--w) * .3);
          letter-spacing:-1px; opacity:.5;
        }

        /* interaction */
        .p17-card { cursor:pointer; }
        .p17-card:hover { transform:translateY(-9px); box-shadow:0 10px 22px rgba(0,0,0,.5); }
        .p17c--picked, .p17-card.p17c--picked:hover {
          transform:translateY(-15px) rotate(-4deg);
          filter:grayscale(.55) brightness(.78);
        }
        .p17c--picked::after { border-color:rgba(248,113,113,.85); }
        .p17c__x {
          position:absolute; top:3px; right:3px; width:15px; height:15px; border-radius:50%;
          background:#f87171; color:#1b2030; font-size:10px; font-weight:800;
          display:flex; align-items:center; justify-content:center; line-height:1;
        }

        @keyframes p17-deal {
          from { opacity:0; transform:translateY(-26px) rotate(-8deg) scale(.88); }
          to   { opacity:1; transform:none; }
        }
        @keyframes p17-flip {
          from { opacity:0; transform:rotateY(85deg) scale(.94); }
          to   { opacity:1; transform:none; }
        }
        .p17c--deal { animation:p17-deal .34s cubic-bezier(.2,.8,.3,1) both; }
        .p17c--flip { animation:p17-flip .46s cubic-bezier(.2,.8,.3,1) both; }

        @media (prefers-reduced-motion: reduce) {
          .p17c--deal, .p17c--flip { animation:none; }
          .p17c, .p17-card:hover { transition:none; }
        }
      `;
      document.head.appendChild(el);
    }

    function cardHtml(c, opts = {}) {
      const {
        faceDown = false, idx = null, pickable = false,
        picked = false, small = false, anim = '', delay = 0,
      } = opts;

      const sizeCls = small ? ' p17c--sm' : '';
      const animCls = anim ? ` p17c--${anim}` : '';
      const animStyle = anim ? ` style="animation-delay:${delay}ms"` : '';

      if (faceDown || !c) {
        return `<div class="p17c${sizeCls} p17c--back${animCls}"${animStyle}>
          <span class="p17c__crest">17</span>
        </div>`;
      }

      const isJoker = c.r === 'X';
      const tone = isJoker ? ' p17c--joker' : (c.s === 'h' || c.s === 'd') ? ' p17c--red' : ' p17c--black';
      const pickCls = picked ? ' p17c--picked' : '';
      const tag = pickable ? 'button' : 'div';
      const hook = pickable ? ` p17-card" data-idx="${idx}` : '';

      const corner = isJoker
        ? '<span class="p17c__r">★</span>'
        : `<span class="p17c__r">${rankLabel(c.r)}</span><span class="p17c__s">${SUIT_CHAR[c.s]}</span>`;

      // Aces get a single oversized pip; the court cards and the Joker get an emblem.
      const middle = isJoker
        ? `${EMBLEM.X}<span class="p17c__word">JOKER</span>`
        : c.r === 'A'
          ? `<span class="p17c__pip">${SUIT_CHAR[c.s]}</span>`
          : EMBLEM[c.r] || `<span class="p17c__pip">${SUIT_CHAR[c.s]}</span>`;

      return `<${tag} class="p17c${sizeCls}${tone}${pickCls}${animCls}${hook}"${animStyle}>
        <span class="p17c__idx p17c__idx--tl">${corner}</span>
        <span class="p17c__mid">${middle}</span>
        <span class="p17c__idx p17c__idx--br">${corner}</span>
        ${picked ? '<span class="p17c__x">✕</span>' : ''}
      </${tag}>`;
    }

    function handRow(cards, opts = {}) {
      const { faceDown = false, count = 5, pickable = false, small = false, anim = '' } = opts;
      const hidden = faceDown || !cards;
      const list = hidden ? Array(count).fill(null) : cards;
      return `<div class="p17-hand p17-hand--${small ? 'sm' : 'lg'}">
        ${list.map((c, i) => cardHtml(c, {
          faceDown: hidden,
          idx: i,
          pickable,
          picked: selected.has(i),
          small,
          anim,
          delay: i * 55,
        })).join('')}
      </div>`;
    }

    function chipPill(label, value, color) {
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:1px;">
        <span style="font-size:10px;letter-spacing:0.6px;text-transform:uppercase;opacity:0.45;">${label}</span>
        <span style="font-size:15px;font-weight:800;color:${color || '#e2e8f0'};">${value}</span>
      </div>`;
    }

    function stepper(id, value) {
      return `<div style="display:flex;align-items:center;gap:6px;">
        <button data-step="${id}:-" style="width:28px;height:28px;border-radius:6px;
          border:1px solid rgba(255,255,255,0.14);background:rgba(255,255,255,0.05);
          color:#e2e8f0;font-size:16px;font-weight:700;cursor:pointer;padding:0;line-height:1;">−</button>
        <span style="min-width:34px;text-align:center;font-size:16px;font-weight:800;color:${v.accent};">${value}</span>
        <button data-step="${id}:+" style="width:28px;height:28px;border-radius:6px;
          border:1px solid rgba(255,255,255,0.14);background:rgba(255,255,255,0.05);
          color:#e2e8f0;font-size:16px;font-weight:700;cursor:pointer;padding:0;line-height:1;">+</button>
      </div>`;
    }

    function btn(action, label, kind) {
      const styles = {
        primary: `background:${v.accent};color:#111827;border:1px solid ${v.accent};`,
        ghost: 'background:rgba(255,255,255,0.06);color:#e2e8f0;border:1px solid rgba(255,255,255,0.14);',
        danger: 'background:rgba(248,113,113,0.12);color:#f87171;border:1px solid rgba(248,113,113,0.25);',
      };
      return `<button data-act="${action}" style="${styles[kind || 'ghost']}
        padding:9px 16px;border-radius:8px;font-family:'Quicksand',sans-serif;
        font-size:13px;font-weight:700;cursor:pointer;transition:filter 0.15s;">${label}</button>`;
    }

    function actionBar() {
      if (PS.phase === 'match-over') {
        return `${btn('restart', 'Play Again', 'primary')} ${btn('leave', 'Leave', 'danger')}`;
      }

      if (PS.phase === 'result') {
        const last = PS.handNo >= HANDS_PER_MATCH;
        return btn('next', last ? 'Final Standings' : `Next Hand (${PS.handNo + 1}/${HANDS_PER_MATCH})`, 'primary');
      }

      if (!myTurn()) {
        return `<span style="font-size:13px;opacity:0.5;">Waiting for ${esc(PS.names[PS.toAct])}…</span>`;
      }

      if (PS.phase === 'cut') {
        return `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:center;">
          ${stepper('cut', cutAmt)}
          ${btn('cut', cutAmt === 0 ? 'No Cut' : `Send ${cutAmt} to Bottom`, 'primary')}
        </div>`;
      }

      if (PS.phase === 'draw') {
        const n = selected.size;
        return btn('draw', n === 0 ? 'Stand Pat' : `Discard ${plural(n, 'card')}`, 'primary');
      }

      const seat = isLocal ? PS.toAct : mySeat;
      const other = 1 - seat;
      const owed = PS.bets[other] - PS.bets[seat];
      const mine = PS.chips[seat];

      if (owed === 0) {
        const canBet = mine >= MIN_BET;
        return `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:center;">
          ${btn('check', 'Check', 'ghost')}
          ${canBet ? `${stepper('bet', betAmt)} ${btn('bet', `Bet ${Math.min(betAmt, mine)}`, 'primary')}` : ''}
        </div>`;
      }

      const callAmt = Math.min(owed, mine);
      const canRaise = PS.raises < MAX_RAISES && mine > owed;
      return `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:center;">
        ${btn('fold', 'Fold', 'danger')}
        ${btn('call', callAmt < owed ? `Call All-In ${callAmt}` : `Call ${callAmt}`, 'ghost')}
        ${canRaise ? `${stepper('bet', betAmt)} ${btn('raise', `Raise ${Math.min(betAmt, mine - owed)}`, 'primary')}` : ''}
      </div>`;
    }

    // ── Deal audit ──────────────────────────────────────────────────
    // Shown only once the match is over: revealing the deck mid-match would
    // also reveal folded and mucked hands, which would wreck the bluffing.
    function codeChip(cd) {
      const joker = cd === 'JK';
      const red = cd.includes('♥') || cd.includes('♦');
      const color = joker ? v.accent : red ? '#fb7185' : '#cbd5e1';
      return `<span style="display:inline-block;min-width:25px;text-align:center;padding:1px 3px;
        margin:1px;border-radius:4px;background:rgba(255,255,255,0.05);
        border:1px solid rgba(255,255,255,0.07);font-size:11px;font-weight:700;
        color:${color};">${cd}</span>`;
    }

    function codeRow(list) {
      return (list || []).map(codeChip).join('');
    }

    function auditRow(label, inner) {
      return `<div style="margin:7px 0;">
        <div style="font-size:9.5px;letter-spacing:0.7px;text-transform:uppercase;
          opacity:0.4;margin-bottom:2px;">${esc(label)}</div>
        <div style="line-height:1.95;">${inner}</div>
      </div>`;
    }

    function outcomeText(t) {
      const o = t.outcome;
      const n = t.names;
      if (!o) return 'unfinished';
      if (o.reason === 'no-contest') return `No contest, both checked — ${o.toHouse} to the dealer`;
      if (o.reason === 'fold') return `${n[o.folder]} folded — ${o.potWon} to ${n[o.winner]}, ${o.toHouse} to the dealer`;
      if (o.winner < 0) return `Split pot — ${o.potWon}`;
      return `${n[o.winner]} won ${o.potWon} with ${t.final[o.winner].name}`;
    }

    function auditHand(t, label) {
      const n = t.names;
      const cuts = t.cuts.map((c) => auditRow(
        `${n[c.seat]} sent ${plural(c.n, 'card')} to the bottom`,
        codeRow(c.after),
      )).join('');

      const draws = t.draws.map((d) => auditRow(
        d.discarded.length === 0
          ? `${n[d.seat]} stood pat`
          : `${n[d.seat]} discarded ${d.discarded.join(' ')} → drew ${d.received.join(' ')}`,
        `${codeRow(d.handAfter)}
         <span style="opacity:0.35;font-size:10px;margin-left:6px;">stub:</span> ${codeRow(d.stubAfter)}`,
      )).join('');

      const finals = t.final ? t.final.map((f, seat) => auditRow(
        `${n[seat]} — ${f.name}${f.jokerAs ? ` (Joker as ${f.jokerAs})` : ''}`,
        codeRow(f.cards),
      )).join('') : '';

      return `<details style="margin:8px 0;border:1px solid rgba(255,255,255,0.07);
        border-radius:9px;padding:8px 10px;background:rgba(255,255,255,0.02);">
        <summary style="cursor:pointer;font-size:12px;font-weight:700;">
          ${esc(label || `Hand ${t.hand}`)}
          <span style="opacity:0.5;font-weight:600;"> · ${esc(outcomeText(t))}</span>
        </summary>
        ${t.mode === 'sealed' ? auditRow('Sealed deck, factory order', codeRow(t.factory)) : ''}
        ${auditRow(
          t.mode === 'sealed'
            ? `After ${plural(t.faros, 'perfect riffle')} — ${n[t.button]} cuts first`
            : `Deck as opened — top → bottom (${n[t.button]} cuts first)`,
          codeRow(t.shuffled),
        )}
        ${cuts}
        ${auditRow(`Dealt, alternating from ${n[t.button]} — ${n[0]}`, codeRow(t.dealt[0]))}
        ${auditRow(`Dealt — ${n[1]}`, codeRow(t.dealt[1]))}
        ${auditRow('Stub after the deal', codeRow(t.stub))}
        ${draws}
        ${finals}
      </details>`;
    }

    function auditText(list) {
      const lines = [];
      for (const t of list || []) {
        const n = t.names;
        lines.push(`=== Hand ${t.hand} === ${outcomeText(t)}`);
        if (t.mode === 'sealed') {
          lines.push(`sealed deck, factory order: ${t.factory.join(' ')}`);
          lines.push(`after ${t.faros} perfect riffle(s): ${t.shuffled.join(' ')}`);
        } else {
          lines.push(`deck opened (top->bottom): ${t.shuffled.join(' ')}`);
        }
        for (const c of t.cuts) lines.push(`cut: ${n[c.seat]} sent ${c.n} to bottom -> ${c.after.join(' ')}`);
        lines.push(`dealt (alternating from ${n[t.button]}):`);
        lines.push(`  ${n[0]}: ${t.dealt[0].join(' ')}`);
        lines.push(`  ${n[1]}: ${t.dealt[1].join(' ')}`);
        lines.push(`stub: ${t.stub.join(' ')}`);
        for (const d of t.draws) {
          lines.push(`draw: ${n[d.seat]} discarded [${d.discarded.join(' ') || '-'}] drew [${d.received.join(' ') || '-'}]`);
          lines.push(`  hand: ${d.handAfter.join(' ')} | stub: ${d.stubAfter.join(' ')}`);
        }
        if (t.final) for (let i = 0; i < 2; i++) {
          lines.push(`final ${n[i]}: ${t.final[i].cards.join(' ')} = ${t.final[i].name}${t.final[i].jokerAs ? ` (Joker as ${t.final[i].jokerAs})` : ''}`);
        }
        lines.push('');
      }
      return lines.join('\n');
    }

    function handAuditPanel() {
      const t = PS.lastAudit;
      if (!t) return '';
      return `<div style="width:min(94vw,520px);text-align:left;margin-top:10px;">
        ${auditHand(t, `How hand ${t.hand} was dealt`)}
        <div style="text-align:center;margin-top:4px;">
          ${btn('copy-hand', 'Copy this hand', 'ghost')}
        </div>
      </div>`;
    }

    function auditPanel() {
      const audit = PS.audit;
      if (!audit || !audit.length) return '';
      return `<details style="margin-top:12px;width:min(94vw,520px);text-align:left;">
        <summary style="cursor:pointer;font-size:12px;font-weight:700;color:${v.accent};
          text-align:center;">Deal audit — all ${audit.length} hands</summary>
        <div style="font-size:11px;opacity:0.45;margin:8px 0 4px;text-align:center;line-height:1.6;">
          A fresh deck is opened each hand, so nothing carries between them.
          Each hand below shows the shuffled order, both cuts, the deal, and every draw.
        </div>
        <div style="text-align:center;margin-bottom:6px;">
          ${btn('copy-audit', 'Copy as text', 'ghost')}
        </div>
        ${audit.map(auditHand).join('')}
      </details>`;
    }

    function resultPanel() {
      const r = PS.result;
      if (!r) return '';
      let head = '';
      let tint = v.textSec;
      if (r.reason === 'no-contest') {
        head = 'No contest — both checked';
      } else if (r.reason === 'fold') {
        head = `${PS.names[r.folder]} folded`;
        tint = v.info;
      } else if (r.winner < 0) {
        head = 'Split pot';
        tint = v.info;
      } else {
        head = `${PS.names[r.winner]} wins the hand`;
        tint = v.success;
      }

      let revealHtml = '';
      if (r.reveal) {
        revealHtml = `<div style="display:flex;gap:18px;justify-content:center;flex-wrap:wrap;margin-top:10px;">
          ${r.reveal.map((h, s) => `
            <div style="text-align:center;">
              <div style="font-size:11px;opacity:0.5;margin-bottom:5px;">${esc(PS.names[s])}</div>
              ${handRow(h.cards, { small: true, anim: revealAnim })}
              <div style="font-size:12px;font-weight:700;margin-top:5px;
                color:${r.winner === s ? v.success : '#e2e8f0'};">${h.name}</div>
              ${h.jokerAs ? `<div style="font-size:10px;opacity:0.45;">Joker as ${rankLabel(h.jokerAs.r)}${SUIT_CHAR[h.jokerAs.s]}</div>` : ''}
            </div>
          `).join('')}
        </div>`;
      }

      const lines = [];
      if (r.potWon) lines.push(`${r.potWon} chips to ${PS.names[r.winner]}`);
      if (r.toHouse) lines.push(`${r.toHouse} to the dealer`);

      return `<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
        border-radius:12px;padding:14px 16px;margin:14px 0 4px;text-align:center;">
        <div style="font-size:15px;font-weight:800;color:${tint};">${esc(head)}</div>
        ${lines.length ? `<div style="font-size:12px;opacity:0.55;margin-top:3px;">${esc(lines.join(' · '))}</div>` : ''}
        ${revealHtml}
      </div>`;
    }

    function faroStep() {
      const counts = Array.from({ length: FARO_PERIOD }, (_, i) => i + 1).map((n) => `
        <button data-act="faros-${n}" style="width:46px;height:46px;border-radius:10px;cursor:pointer;
          background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.14);
          color:${n === FARO_PERIOD ? v.accent : '#e2e8f0'};font-family:'Quicksand',sans-serif;
          font-size:16px;font-weight:800;">${n}</button>`).join('');

      return `<div style="width:min(92vw,420px);">
        <div style="font-size:13px;opacity:0.65;margin-bottom:10px;line-height:1.6;">
          How many perfect riffles does the dealer give the sealed deck?
          Both players are told the number, so this is public either way.
        </div>
        <div style="display:flex;gap:7px;flex-wrap:wrap;justify-content:center;margin-bottom:12px;">
          ${counts}
        </div>
        <div style="font-size:11px;opacity:0.45;text-align:center;margin-bottom:12px;line-height:1.6;">
          A fixed count means the deck before the cuts is identical every hand —
          the most predictable setting. ${FARO_PERIOD} riffles leaves it in factory order.
        </div>
        <button data-act="faros-0" style="display:block;width:100%;text-align:left;
          padding:12px 15px;border-radius:12px;cursor:pointer;margin-bottom:10px;
          background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);
          color:#e2e8f0;font-family:'Quicksand',sans-serif;">
          <div style="font-size:14px;font-weight:800;color:${v.accent};">Vary each hand</div>
          <div style="font-size:12px;opacity:0.6;margin-top:3px;line-height:1.5;">
            A different count from 1 to ${FARO_PERIOD} every hand, announced each time.
            Still fully deducible, but you have to keep up.
          </div>
        </button>
        <div style="text-align:center;">${btn('back', '← Back', 'ghost')}</div>
      </div>`;
    }

    function setupScreen() {
      const amHost = isLocal || isHost;
      const onFaros = PS.setupStep === 'faros';
      const choices = Object.entries(DECK_MODES).map(([id, m]) => `
        <button data-act="mode-${id}" style="display:block;width:100%;text-align:left;
          margin-bottom:10px;padding:13px 15px;border-radius:12px;cursor:pointer;
          background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);
          color:#e2e8f0;font-family:'Quicksand',sans-serif;">
          <div style="font-size:14px;font-weight:800;color:${v.accent};">${esc(m.label)}</div>
          <div style="font-size:12px;opacity:0.6;margin-top:3px;line-height:1.5;">${esc(m.blurb)}</div>
        </button>`).join('');

      return `<div style="${ROOT}padding:26px 14px;">
        <div style="${CENTRED}">
        <h2 style="font-family:'Righteous',cursive;font-size:clamp(15px,3.5vw,22px);margin:0 0 4px;
          background:linear-gradient(135deg,#fbbf24,#f43f5e,#a855f7);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;">17 POKER</h2>
        <div style="font-size:12px;opacity:0.5;margin-bottom:18px;">
          ${amHost
            ? (onFaros ? 'Sealed deck — how many riffles?' : 'How should the dealer prepare the deck?')
            : 'Waiting for the host to pick the deck…'}
        </div>
        ${amHost
          ? (onFaros ? faroStep() : `<div style="width:min(92vw,420px);">${choices}</div>`)
          : ''}
        <details style="margin-top:6px;max-width:430px;font-size:12px;opacity:0.45;cursor:pointer;">
          <summary style="font-weight:600;">What's the difference?</summary>
          <div style="margin-top:8px;line-height:1.7;text-align:left;">
            <p><strong>Random shuffle</strong> is ordinary poker — the deck is genuinely
            shuffled each hand and nobody can predict it.</p>
            <p><strong>Sealed deck</strong> is the premise from the manga. Every hand starts
            from the same factory order and gets a stated number of perfect riffles, then
            both players cut. All of that is public, so the entire deal is deducible — if you
            can actually track the permutation.</p>
            <p>A perfect riffle on 17 cards has a period of <strong>8</strong>: riffle a sealed
            deck eight times and it is back exactly as it started. (That's the multiplicative
            order of 2 mod 17 — the TV version's "every sixth shuffle" is wrong.)</p>
            <p style="opacity:0.8;">Factory order, top to bottom:<br>
            <span style="font-size:11px;">${factoryDeck().map(code).join(' ')}</span></p>
          </div>
        </details>
        <div style="margin-top:16px;">${btn('leave', 'Leave', 'danger')}</div>
        </div>
      </div>`;
    }

    function render() {
      if (!PS) {
        container.innerHTML = `<div style="${ROOT}">
          <div style="${CENTRED}padding:40px;text-align:center;opacity:0.5;">
            Waiting for the dealer…
          </div></div>`;
        return;
      }

      if (PS.phase === 'setup') {
        container.innerHTML = setupScreen();
        bindEvents();
        return;
      }

      // Curtain: in local mode, hide the table while the device changes hands.
      if (curtain) {
        container.innerHTML = `
          <div style="${ROOT}padding:40px 20px;">
            <div style="${CENTRED}gap:16px;text-align:center;">
            <div style="font-size:40px;">🂠</div>
            <div style="font-family:'Righteous',cursive;font-size:20px;">Pass the device</div>
            <div style="font-size:14px;opacity:0.6;max-width:300px;">
              ${esc(PS.names[PS.toAct])}, it's your turn — make sure no one else is looking.
            </div>
            ${btn('uncurtain', 'Show my hand', 'primary')}
            </div>
          </div>`;
        bindEvents();
        return;
      }

      const vs = viewSeat();
      const them = 1 - vs;
      const showAll = PS.phase === 'result' || PS.phase === 'match-over';
      const myCards = handFor(vs);

      const phaseLabel = {
        cut: 'The cut',
        bet1: 'First betting round',
        draw: 'The draw',
        bet2: 'Second betting round',
        result: 'Hand over',
        'match-over': 'Match over',
      }[PS.phase];

      const oppInfo = [
        `${PS.chips[them]} chips`,
        PS.bets[them] ? `in for ${PS.bets[them]}` : null,
        PS.drawn[them] !== null ? (PS.drawn[them] === 0 ? 'stood pat' : `drew ${PS.drawn[them]}`) : null,
        PS.phase === 'cut' && PS.cuts[them] !== null ? `cut ${PS.cuts[them]}` : null,
      ].filter(Boolean).join(' · ');

      const myInfo = [
        `${PS.chips[vs]} chips`,
        PS.bets[vs] ? `in for ${PS.bets[vs]}` : null,
        PS.drawn[vs] !== null ? (PS.drawn[vs] === 0 ? 'stood pat' : `drew ${PS.drawn[vs]}`) : null,
        PS.phase === 'cut' && PS.cuts[vs] !== null ? `cut ${PS.cuts[vs]}` : null,
      ].filter(Boolean).join(' · ');

      const myEval = myCards && myCards.length === 5 ? evalHand(myCards) : null;
      const pickable = PS.phase === 'draw' && myTurn() && !showAll;

      const handKey = myCards ? myCards.map((c) => c.r + (c.s || '')).join('') : '';
      const dealAnim = handKey && handKey !== lastHandKey ? 'deal' : '';
      lastHandKey = handKey;

      const oppKey = `${PS.handNo}:${PS.drawn[them]}:${PS.phase === 'cut' ? 'x' : 'd'}`;
      const oppAnim = oppKey !== lastOppKey ? 'deal' : '';
      lastOppKey = oppKey;

      const revealKey = PS.result ? `${PS.handNo}:${PS.result.reason}` : '';
      revealAnim = revealKey && revealKey !== lastRevealKey ? 'flip' : '';
      lastRevealKey = revealKey;

      container.innerHTML = `
        <div style="${ROOT}padding:14px 10px 24px;">

          <h2 style="font-family:'Righteous',cursive;font-size:clamp(15px,3.5vw,22px);
            margin:0 0 2px;letter-spacing:-0.5px;
            background:linear-gradient(135deg,#fbbf24,#f43f5e,#a855f7);
            -webkit-background-clip:text;-webkit-text-fill-color:transparent;">17 POKER</h2>
          <div style="font-size:11px;opacity:0.45;margin-bottom:4px;letter-spacing:0.5px;">
            HAND ${PS.handNo}/${HANDS_PER_MATCH} · ${phaseLabel.toUpperCase()}
          </div>
          <div style="font-size:11px;margin-bottom:12px;${PS.deckMode === 'sealed'
            ? `color:${v.accent};` : 'opacity:0.35;'}">
            ${PS.deckMode === 'sealed'
              ? `Sealed deck · riffled ${plural(PS.faros, 'time')}${PS.faroChoice > 0 ? ', fixed' : ''}${PS.faros === FARO_PERIOD ? ' · back to factory order' : ''}`
              : esc(DECK_MODES[PS.deckMode]?.short || '')}
          </div>

          <div style="display:flex;gap:22px;align-items:center;justify-content:center;flex-wrap:wrap;
            background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
            border-radius:12px;padding:9px 18px;margin-bottom:14px;">
            ${chipPill('Pot', PS.pot, v.accent)}
            ${chipPill('Dealer', PS.house, v.textMuted)}
            ${chipPill(esc(PS.names[vs]), PS.chips[vs], v.success)}
            ${chipPill(esc(PS.names[them]), PS.chips[them], v.info)}
          </div>

          <div style="text-align:center;margin-bottom:6px;">
            <div style="font-size:12px;font-weight:700;">
              ${esc(PS.names[them])}
              ${PS.button === them ? '<span style="font-size:10px;opacity:0.45;font-weight:600;"> · acts first</span>' : ''}
              ${PS.toAct === them && !showAll ? `<span style="color:${v.accent};"> ●</span>` : ''}
            </div>
            <div style="font-size:11px;opacity:0.45;">${esc(oppInfo)}</div>
          </div>
          ${handRow(null, { faceDown: true, small: true, anim: oppAnim })}

          ${showAll ? resultPanel() : `
            <div style="height:1px;width:min(80%,320px);background:rgba(255,255,255,0.07);margin:16px 0;"></div>
          `}
          ${PS.phase === 'result' ? handAuditPanel() : ''}

          ${PS.phase === 'match-over' ? `
            <div style="text-align:center;margin:10px 0 14px;">
              <div style="font-family:'Righteous',cursive;font-size:18px;color:${v.accent};">
                ${esc(PS.finalMsg || '')}
              </div>
              ${auditPanel()}
            </div>
          ` : `
            <div style="text-align:center;margin-bottom:6px;">
              <div style="font-size:12px;font-weight:700;">
                ${esc(PS.names[vs])}${isLocal ? '' : ' (you)'}
                ${PS.button === vs ? '<span style="font-size:10px;opacity:0.45;font-weight:600;"> · acts first</span>' : ''}
                ${PS.toAct === vs && !showAll ? `<span style="color:${v.accent};"> ●</span>` : ''}
              </div>
              <div style="font-size:11px;opacity:0.45;">${esc(myInfo)}</div>
            </div>
            ${PS.phase === 'cut'
              ? '<div style="font-size:12px;opacity:0.4;padding:18px 0;">Cards not dealt yet.</div>'
              : handRow(myCards, { pickable, anim: dealAnim })}
            ${myEval ? `<div style="font-size:12px;font-weight:700;color:${v.accent};margin-top:7px;">
                ${myEval.name}${myEval.jokerAs ? ` <span style="opacity:0.55;font-weight:600;">(Joker as ${rankLabel(myEval.jokerAs.r)}${SUIT_CHAR[myEval.jokerAs.s]})</span>` : ''}
              </div>` : ''}
            ${pickable ? '<div style="font-size:11px;opacity:0.4;margin-top:5px;">Tap cards to throw them away.</div>' : ''}
          `}

          <div style="display:flex;gap:10px;align-items:center;justify-content:center;
            flex-wrap:wrap;margin-top:18px;min-height:40px;">
            ${actionBar()}
          </div>

          ${PS.phase !== 'match-over' ? `<div style="margin-top:14px;">${btn('leave', 'Leave', 'danger')}</div>` : ''}

          <div style="margin-top:18px;width:min(92vw,420px);font-size:11px;opacity:0.4;
            line-height:1.7;text-align:center;">
            ${PS.log.slice(-5).map((l) => `<div>${esc(l)}</div>`).join('')}
          </div>

          <details style="margin-top:16px;max-width:430px;font-size:12px;opacity:0.45;cursor:pointer;">
            <summary style="font-weight:600;">How to play</summary>
            <div style="margin-top:8px;line-height:1.7;padding:0 4px;text-align:left;">
              <p><strong>Deck (17 cards):</strong> 4 Aces, 4 Kings, 4 Queens, 4 Jacks and one Joker.
              The Joker is wild — any rank, any suit, even a duplicate of a card you already hold.</p>
              <p><strong>Ranking (high to low):</strong> Five of a Kind, Royal Flush, Four of a Kind,
              Full House, Straight, Three of a Kind, Two Pair, One Pair. Five cards across four ranks
              always pair, so there is no high-card hand. A Straight is 10-J-Q-K-A with the Joker as
              the 10 — and a Royal Flush if all five share a suit. All three top hands need the Joker,
              and there is only one: at most one player per hand can hold any of them.</p>
              <p><strong>A hand:</strong> fresh deck → each player sends any number of cards to the
              bottom → ante ${ANTE} each → first betting round → discard and draw → second betting
              round → reveal. Minimum bet ${MIN_BET}, maximum ${MAX_BET}, up to ${MAX_RAISES} raises per round.</p>
              <p><strong>No contest:</strong> if both players check the first round, or if anyone folds,
              the two antes go to the dealer instead of the winner. On a fold, everything wagered above
              the antes goes to the player still standing.</p>
              <p><strong>Draw detail:</strong> discards go to the bottom of the pack and replacements
              come off the top — draw big right after your opponent did and you may end up holding
              their trash.</p>
              <p>Most chips after ${HANDS_PER_MATCH} hands wins the match.</p>
            </div>
          </details>
        </div>`;

      bindEvents();
    }

    function bindEvents() {
      container.querySelectorAll('.p17-card').forEach((el) => {
        el.addEventListener('click', () => {
          const i = Number(el.dataset.idx);
          if (selected.has(i)) selected.delete(i);
          else selected.add(i);
          render();
        });
      });

      container.querySelectorAll('[data-step]').forEach((el) => {
        el.addEventListener('click', () => {
          const [which, dir] = el.dataset.step.split(':');
          const d = dir === '+' ? 1 : -1;
          if (which === 'bet') betAmt = Math.max(MIN_BET, Math.min(MAX_BET, betAmt + d * MIN_BET));
          else cutAmt = Math.max(0, Math.min(16, cutAmt + d));
          render();
        });
      });

      container.querySelectorAll('[data-act]').forEach((el) => {
        el.addEventListener('click', () => {
          const a = el.dataset.act;
          if (a === 'leave') return api.endGame();
          if (a === 'uncurtain') { curtain = false; return render(); }
          if (a === 'copy-audit' || a === 'copy-hand') {
            const text = auditText(a === 'copy-hand' ? [PS.lastAudit] : PS.audit);
            navigator.clipboard?.writeText(text).then(
              () => { el.textContent = 'Copied'; },
              () => { el.textContent = 'Copy failed'; },
            );
            return;
          }
          if (a.startsWith('mode-')) return act({ k: 'mode', m: a.slice(5) });
          if (a.startsWith('faros-')) return act({ k: 'faros', n: Number(a.slice(6)) });
          if (a === 'back') return act({ k: 'back' });
          if (a === 'cut') return act({ k: 'cut', n: cutAmt });
          if (a === 'draw') return act({ k: 'draw', idx: [...selected] });
          if (a === 'bet' || a === 'raise') return act({ k: a, amt: betAmt });
          return act({ k: a });
        });
      });
    }

    // ── Wiring ──────────────────────────────────────────────────────
    ensureStyles();

    if (authoritative) {
      const resumed = isLocal ? null : api.getResumeState();
      if (resumed?.PS) {
        PS = resumed.PS;
        H = resumed.H || [[], []];
        STUB = resumed.STUB || [];
        DECK = resumed.DECK || [];
        TRACES = resumed.TRACES || [];
        PS.names = seatNames();
      } else {
        PS = freshPS();
      }

      if (isLocal) {
        lastSeen = `${PS.phase}:${PS.toAct}`;
        render();
      } else {
        api.on('p17-act', (payload, from) => {
          if (from && from === me.id) return;
          applyAction(1, payload);
        });
        api.on('p17-request-state', () => pushState());
        api.onPlayerRejoinedMidgame(() => pushState());
        api.on('player-left', () => {
          note('Opponent disconnected — waiting for them to rejoin.');
          render();
        });
        pushState();
      }
    } else {
      api.on('p17-state', (s) => {
        PS = s;
        selected = new Set();
        render();
      });
      api.on('p17-hand', (d) => {
        myHand = d.cards;
        render();
      });
      api.on('player-left', () => render());
      // The host may push before this module finished importing, and an event
      // with no listener is dropped — so ask once we're definitely listening.
      api.send('p17-request-state', {});
      render();
    }

    return {
      destroy() {
        container.innerHTML = '';
        document.getElementById(STYLE_ID)?.remove();
      },
    };
  },
};
