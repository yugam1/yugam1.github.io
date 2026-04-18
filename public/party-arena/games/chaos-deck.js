// ═══════════════════════════════════════════════
//  CHAOS DECK — Party card game
//  Inspired by Beer Pressure / These Cards Will Get You Drunk
//  130+ cards · 8 categories · Dynamic player targeting
// ═══════════════════════════════════════════════

// Template tokens:
//   {player}  = current player
//   {target}  = random other player
//   {target2} = second random player
//   {left}    = player to the left (next in list)
//   {right}   = player to the right (prev in list)

const CARD_DB = {
  "🎯 Target": {
    color: "#f59e0b",
    cards: [
      {
        text: "{target}, tell us your most embarrassing search history item — or take 2 sips.",
        action: "reveal",
      },
      {
        text: "{target} has to do their best impression of {player}. If the group laughs, {player} drinks.",
        action: "perform",
      },
      {
        text: "{player}, pick someone. They have to let you post anything on their social media — or take 3 sips.",
        action: "dare",
      },
      {
        text: "{target}, you're on the hot seat. Everyone asks you one yes-or-no question. Lie and drink double.",
        action: "hotseat",
      },
      {
        text: "{target}, show the last photo in your camera roll or take 2 sips.",
        action: "reveal",
      },
      {
        text: "{player}, compliment {target} genuinely. If they blush, they drink.",
        action: "social",
      },
      {
        text: "{target}, do 10 pushups or take 3 sips. No half reps.",
        action: "physical",
      },
      {
        text: "{target}, read your last sent text message out loud. No context allowed.",
        action: "reveal",
      },
      {
        text: "{player}, pick someone. They have to speak in an accent for the next 3 rounds — or drink now.",
        action: "dare",
      },
      {
        text: "{target}, you have 10 seconds to make {player} laugh. Fail = drink.",
        action: "perform",
      },
      {
        text: "{target}, swap seats with the person you find most attractive in the room. No explaining.",
        action: "social",
      },
      {
        text: "{player}, stare into {target}'s eyes for 15 seconds. First to break drinks.",
        action: "versus",
      },
      {
        text: "{target}, call the 3rd contact in your phone and tell them you love them — or take 3 sips.",
        action: "dare",
      },
      {
        text: "{target}, name 5 countries in 10 seconds or drink.",
        action: "challenge",
      },
      {
        text: "{player} picks {target}'s drink for the next round. No complaints allowed.",
        action: "power",
      },
    ],
  },

  "👥 Group": {
    color: "#34d399",
    cards: [
      {
        text: "Everyone point to the person most likely to become famous. Whoever gets the most points drinks.",
        action: "vote",
      },
      {
        text: "Thumb Master! {player} becomes Thumb Master. Whenever they put their thumb on the table, last person to copy drinks. Lasts 3 rounds.",
        action: "rule",
        duration: 3,
      },
      {
        text: "Everyone takes a sip. That's it. That's the card. Cheers! 🍻",
        action: "drink",
      },
      {
        text: "Category time! {player} picks a category. Go around — first person who hesitates or repeats drinks.",
        action: "category",
      },
      {
        text: "Everyone raise your hand if you've ever been kicked out of a bar. If you're the only one — chug.",
        action: "poll",
      },
      {
        text: "Rhyme time! {player} says a word. Go around rhyming. Whoever fails drinks.",
        action: "chain",
      },
      {
        text: "Everyone: hold up fingers 1-5 for how many relationships you've been in. Highest and lowest drink.",
        action: "poll",
      },
      {
        text: "Storytime! {player} starts a story with one sentence. Each player adds one sentence. Worst addition (voted) drinks.",
        action: "creative",
      },
      {
        text: "Everyone write down (or whisper to the host) who they think will get the drunkest tonight. Reveal later.",
        action: "predict",
      },
      {
        text: "Group photo! Everyone has to make their ugliest face. Person who breaks character drinks.",
        action: "fun",
      },
      {
        text: "Truth circle: go around, each person says one true thing about themselves nobody here knows. Skip = 2 sips.",
        action: "reveal",
      },
      {
        text: "Floor is lava! Last person to get their feet off the ground drinks. 3... 2... 1... NOW!",
        action: "physical",
      },
      {
        text: "Medusa! Everyone looks down. On 3, look up at someone. If you're looking at each other, you both drink.",
        action: "game",
      },
      {
        text: "Compliment chain! Go around — each person compliments the person to their left. Most awkward compliment (voted) drinks.",
        action: "social",
      },
      {
        text: "Never have I ever: {player} says a 'never have I ever.' Everyone who HAS done it drinks.",
        action: "nhie",
      },
    ],
  },

  "⚔️ Versus": {
    color: "#f87171",
    cards: [
      {
        text: "{target} vs {target2}! Rock-paper-scissors, best of 3. Loser takes 2 sips.",
        action: "rps",
      },
      {
        text: "{player} vs {target}! Staring contest. First to blink drinks.",
        action: "stare",
      },
      {
        text: "{target} vs {target2}! Each person tells their best joke. Group votes. Loser drinks.",
        action: "joke",
      },
      {
        text: "{player} vs {target}! Arm wrestle. Loser takes 3 sips. Ties = both drink.",
        action: "physical",
      },
      {
        text: "{target} vs {target2}! Speed round: name as many animals as possible in 15 seconds. Fewer = drinks.",
        action: "speed",
      },
      {
        text: "{player} vs {target}! Who can hold a plank longer? Loser drinks. Minimum 15 seconds to count.",
        action: "physical",
      },
      {
        text: "{target} vs {target2}! Each say something nice about the other. Least convincing (group vote) drinks.",
        action: "social",
      },
      {
        text: "{player} vs {target}! Thumb war. Best of 3. Loser takes 2 sips and must call the winner 'champ' for 2 rounds.",
        action: "physical",
      },
      {
        text: "{target} vs {target2}! Who can make the best animal noise? Group votes. Loser drinks.",
        action: "perform",
      },
      {
        text: "{player} vs {target}! First person to find a specific emoji (🦭) on their phone wins. Loser drinks.",
        action: "speed",
      },
      {
        text: "DANCE OFF! {target} vs {target2}! 15 seconds each. Group votes. Loser takes 3 sips.",
        action: "perform",
      },
      {
        text: "{player} vs {target}! Flip a coin (or guess a number 1-3). Loser drinks.",
        action: "luck",
      },
    ],
  },

  "📜 Rule": {
    color: "#a78bfa",
    cards: [
      {
        text: "NEW RULE: No saying first names! Anyone who uses a first name drinks. Lasts 5 rounds.",
        action: "rule",
        duration: 5,
      },
      {
        text: "NEW RULE: Everyone must speak in questions only. Statements = drink. Lasts 3 rounds.",
        action: "rule",
        duration: 3,
      },
      {
        text: "NEW RULE: No pointing! Use elbows instead. Violations = drink. Lasts 4 rounds.",
        action: "rule",
        duration: 4,
      },
      {
        text: "NEW RULE: Before drinking, you must make eye contact with {player} and wink. Lasts 3 rounds.",
        action: "rule",
        duration: 3,
      },
      {
        text: "NEW RULE: Everyone must add 'in bed' to the end of every sentence. Forget = drink. Lasts 3 rounds.",
        action: "rule",
        duration: 3,
      },
      {
        text: "NEW RULE: {player} is now the Question Master. If anyone answers their question, they drink. Lasts 4 rounds.",
        action: "rule",
        duration: 4,
      },
      {
        text: "NEW RULE: No laughing! First person to laugh drinks and the rule resets. Lasts 3 rounds.",
        action: "rule",
        duration: 3,
      },
      {
        text: "NEW RULE: You must drink with your non-dominant hand. Caught? Take an extra sip. Lasts 5 rounds.",
        action: "rule",
        duration: 5,
      },
      {
        text: "NEW RULE: Everyone must clap twice before speaking. Forget = drink. Lasts 3 rounds.",
        action: "rule",
        duration: 3,
      },
      {
        text: "NEW RULE: Swap names! {player} is now {target} and vice versa. Wrong name = drink. Lasts 4 rounds.",
        action: "rule",
        duration: 4,
      },
      {
        text: "NEW RULE: No one can say 'drink.' Find another word. Violations = sip. Lasts 5 rounds.",
        action: "rule",
        duration: 5,
      },
      {
        text: "NEW RULE: Little green man! Everyone has an invisible tiny green man on their cup. You must remove him before drinking and put him back after. Forget = drink again. Lasts 5 rounds.",
        action: "rule",
        duration: 5,
      },
    ],
  },

  "🗳️ Vote": {
    color: "#60a5fa",
    cards: [
      {
        text: "VOTE: Who's the worst driver here? Majority winner drinks 2 sips.",
        action: "vote",
      },
      {
        text: "VOTE: Who's most likely to survive a zombie apocalypse? Everyone ELSE drinks.",
        action: "vote",
      },
      {
        text: "VOTE: Who's secretly the smartest person here? Winner assigns 3 sips to anyone.",
        action: "vote",
      },
      {
        text: "VOTE: Who would be the worst roommate? Majority winner takes 2 sips.",
        action: "vote",
      },
      {
        text: "VOTE: Who has the best music taste? Winner picks a song everyone has to vibe to.",
        action: "vote",
      },
      {
        text: "VOTE: Who's the biggest lightweight here? They take a sip to prove everyone wrong (or right).",
        action: "vote",
      },
      {
        text: "VOTE: Who would be most likely to go viral on TikTok? They have to do a 10-second dance. Refusal = 3 sips.",
        action: "vote",
      },
      {
        text: "VOTE: Most likely to become a millionaire? That person assigns 2 sips each to any 2 players.",
        action: "vote",
      },
      {
        text: "VOTE: Who here has the best laugh? Everyone else tries to make them laugh. Success = voted person drinks.",
        action: "vote",
      },
      {
        text: "VOTE: Who's most likely to cry at a movie? They must name the last movie that made them emotional — or drink.",
        action: "vote",
      },
      {
        text: "VOTE: Best dressed person here right now? They're safe from the next drink card. Everyone else = 1 sip.",
        action: "vote",
      },
      {
        text: "VOTE: Who tells the best stories? They have 30 seconds to tell a micro-story. Underwhelming = 2 sips.",
        action: "vote",
      },
    ],
  },

  "🎲 Chance": {
    color: "#fb923c",
    cards: [
      {
        text: "Lucky number! {player}, pick a number 1-6. If anyone else picked the same → both drink. Otherwise, you're safe.",
        action: "luck",
      },
      {
        text: "Odds are: {player} and {target} both say a number 1-5 on the count of 3. Match = both chug. No match = everyone else sips.",
        action: "luck",
      },
      {
        text: "ROULETTE: Point at someone right now! Whoever the most people point at drinks 3 sips.",
        action: "point",
      },
      {
        text: "Phone roulette! {player}, scroll to a random contact and call them. If they pick up, they decide who drinks. If not, you drink.",
        action: "dare",
      },
      {
        text: "Birthday gamble! The person whose birthday is closest to today drinks. If there's a tie, both drink.",
        action: "chance",
      },
      {
        text: "High card! Everyone picks a number 1-10 in their head. {player} guesses who picked the highest. Wrong = drink.",
        action: "luck",
      },
      {
        text: "Jinx! Next two people to say the same word at the same time both drink double.",
        action: "ongoing",
      },
      {
        text: "Dice roll! {player}, pick odd or even. If correct, assign 3 sips. If wrong, drink 3 yourself.",
        action: "luck",
      },
      {
        text: "Mystery sip: {player} takes a sip... but {target} decides what it is (from available drinks).",
        action: "dare",
      },
      {
        text: "GAMBLE: {player}, bet 1-5 sips. Guess heads or tails (someone flips a coin/picks random). Win = assign double. Lose = drink your bet.",
        action: "luck",
      },
    ],
  },

  "💀 Waterfall": {
    color: "#ef4444",
    cards: [
      {
        text: "WATERFALL! Starting from {player}, everyone starts drinking. You can only stop when the person before you stops. Good luck.",
        action: "waterfall",
      },
      {
        text: "REVERSE WATERFALL! Starting from {player} going RIGHT. Same rules — can't stop until the person after you stops.",
        action: "waterfall",
      },
      {
        text: "MINI WATERFALL! Everyone takes one continuous sip for exactly 5 seconds. {player} counts. Anyone who stops early takes another.",
        action: "waterfall",
      },
      {
        text: "SOCIAL! Everyone raise your glass and drink together. Cheers to bad decisions! 🥂",
        action: "social",
      },
      {
        text: "VIKING! {player} puts horns on their head (fingers). People they point at must row. Last to row drinks. Keep going until someone messes up!",
        action: "game",
      },
    ],
  },

  "🃏 Wild": {
    color: "#e879f9",
    cards: [
      {
        text: "SWAP! {player} swaps seats and drink with {target}. You are now them for the next round.",
        action: "swap",
      },
      {
        text: "IMMUNITY! {player} is immune to the next 2 drink penalties. Use it wisely.",
        action: "power",
      },
      {
        text: "DOUBLE TROUBLE! The next card's consequences are doubled. Draw again!",
        action: "modifier",
        drawAgain: true,
      },
      {
        text: "REVERSE! Turn order reverses. Also, {player} assigns 2 sips to anyone.",
        action: "reverse",
      },
      {
        text: "SKIP! {player} skips their turn AND assigns it to {target} instead. They draw the next card.",
        action: "skip",
      },
      {
        text: "CONFESSION BOOTH: {player}, whisper a secret to {target}. If {target} reacts visibly, they drink.",
        action: "reveal",
      },
      {
        text: "BODYGUARD: {player}, pick someone. They're your bodyguard — they drink FOR you for the next 2 rounds.",
        action: "power",
        duration: 2,
      },
      {
        text: "MIND READER: {player}, guess what {target} is thinking about right now. If you're even close, they drink. Group judges.",
        action: "fun",
      },
      {
        text: "COPYCAT: For the next 2 rounds, {target} must copy everything {player} does. Fail = drink each time.",
        action: "rule",
        duration: 2,
      },
      {
        text: "THE FLOOR IS YOURS: {player}, you have 30 seconds to rant about literally anything. Group rates 1-10. Under 5 = drink.",
        action: "perform",
      },
      {
        text: "KINGMAKER: {player} becomes the King/Queen. For the next 3 rounds, they can assign 1 bonus sip per round to anyone.",
        action: "power",
        duration: 3,
      },
      {
        text: "TRUTH BOMB: {player}, tell {target} something you've always thought about them but never said. Positive only! Then both drink.",
        action: "social",
      },
      {
        text: "EVERYBODY SHUFFLE! All players shift one seat to the right. Slowest person drinks.",
        action: "physical",
      },
      {
        text: "PHONE STACK: Everyone puts their phone in the middle. First person to touch their phone before the next card drinks 5 sips.",
        action: "dare",
      },
      {
        text: "MAKE A RULE! {player} invents a rule for the rest of the game. It must be reasonable. Group veto = {player} drinks 3.",
        action: "rule",
        duration: 99,
      },
    ],
  },
};

const CATEGORY_KEYS = Object.keys(CARD_DB);

export default {
  id: "chaos-deck",
  name: "Chaos Deck",

  create(container, api) {
    const players = api.getPlayers();
    const me = api.getMe();
    const isHost = api.isHost();
    const isLocal = api.isLocal();
    const v = api.cssVars;

    // ── Game State ──
    let gs = {
      phase: "setup",
      deck: [],
      currentPlayer: 0,
      currentCard: null,
      activeRules: [], // [{ text, roundsLeft }]
      roundNumber: 0,
      cardsDrawn: 0,
      isDoubled: false, // from DOUBLE TROUBLE
      turnOrder: 1, // 1 or -1
      immunePlayer: null,
      immuneRounds: 0,
      bodyguard: null, // { for: playerId, guard: playerId, roundsLeft }
      king: null, // { playerId, roundsLeft }
    };

    // ── Styles ──
    const styles = document.createElement("style");
    styles.textContent = `
      .cd-wrap {
        display: flex; flex-direction: column; align-items: center;
        height: 100%; overflow-y: auto; font-family: ${v.fontBody};
        padding: 12px;
      }

      /* ── Setup ── */
      .cd-setup { max-width: 480px; width: 100%; padding-top: 12px; }
      .cd-setup h2 { font-family: ${v.fontDisplay}; font-size: 1.3rem; text-align: center; margin-bottom: 20px; color: ${v.text}; }
      .cd-cat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
      .cd-cat-btn {
        background: rgba(255,255,255,0.04); border: 2px solid rgba(255,255,255,0.08);
        border-radius: 12px; padding: 12px 10px; color: ${v.text}; cursor: pointer;
        font-family: ${v.fontBody}; font-size: 0.85rem; font-weight: 600;
        transition: all 0.2s; text-align: center;
      }
      .cd-cat-btn:hover { border-color: var(--btn-color, ${v.accent}); }
      .cd-cat-btn.active { border-color: var(--btn-color, ${v.accent}); background: var(--btn-bg, ${v.accentSoft}); }
      .cd-toggle-row { text-align: center; margin-bottom: 14px; }
      .cd-toggle-row button {
        background: none; border: none; color: ${v.accent}; cursor: pointer;
        font-family: ${v.fontBody}; font-weight: 700; font-size: 0.8rem; text-decoration: underline;
      }
      .cd-start-btn {
        width: 100%; padding: 16px; border: none; border-radius: 12px;
        background: linear-gradient(135deg, ${v.accent}, #f59e0b); color: #0a0e1a;
        font-family: ${v.fontBody}; font-weight: 700; font-size: 1rem;
        cursor: pointer; text-transform: uppercase; letter-spacing: 1px;
      }
      .cd-start-btn:disabled { opacity: 0.3; cursor: not-allowed; }
      .cd-add-row {
        display: flex; gap: 8px; margin-bottom: 16px;
      }
      .cd-add-row input {
        flex: 1; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);
        padding: 10px 14px; border-radius: 10px; color: ${v.text}; font-family: ${v.fontBody};
      }

      /* ── Active Rules Banner ── */
      .cd-rules-bar {
        width: 100%; max-width: 520px;
        margin-bottom: 12px;
      }
      .cd-rule-chip {
        display: inline-flex; align-items: center; gap: 6px;
        background: rgba(167,139,250,0.12); border: 1px solid rgba(167,139,250,0.25);
        border-radius: 20px; padding: 6px 14px; margin: 3px 4px;
        font-size: 0.75rem; font-weight: 600; color: #c4b5fd;
        animation: slideUp 0.3s ease both;
      }
      .cd-rule-chip .cd-rule-rounds {
        background: rgba(167,139,250,0.2); border-radius: 10px;
        padding: 2px 7px; font-size: 0.65rem; font-weight: 700;
      }

      /* ── Play Area ── */
      .cd-play { display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 520px; flex: 1; }
      .cd-turn-bar {
        display: flex; align-items: center; gap: 10px; padding: 10px 20px;
        background: rgba(255,255,255,0.04); border-radius: 50px;
        margin-bottom: 16px;
      }
      .cd-turn-dot { width: 10px; height: 10px; border-radius: 50%; background: ${v.accent}; }
      .cd-turn-name { font-weight: 700; font-size: 0.95rem; color: ${v.accent}; }
      .cd-turn-info { font-size: 0.75rem; color: ${v.textMuted}; }
      .cd-stats { font-size: 0.75rem; color: ${v.textMuted}; margin-bottom: 12px; }

      /* ── Card ── */
      .cd-card-area {
        width: 100%; perspective: 1000px; margin-bottom: 20px;
        min-height: 260px; display: flex; align-items: center; justify-content: center;
      }
      .cd-card {
        width: 100%; max-width: 380px;
        border-radius: 20px; padding: 28px 24px;
        position: relative; text-align: center;
        transform-style: preserve-3d;
        transition: transform 0.5s cubic-bezier(0.16,1,0.3,1);
      }
      .cd-card.flipping { animation: cardFlip 0.6s cubic-bezier(0.16,1,0.3,1); }
      @keyframes cardFlip {
        0% { transform: rotateY(-90deg) scale(0.8); opacity: 0; }
        50% { transform: rotateY(-10deg) scale(1.02); opacity: 1; }
        100% { transform: rotateY(0deg) scale(1); }
      }
      .cd-card-face {
        background: rgba(0,0,0,0.4);
        border: 2px solid var(--card-color, ${v.accent});
        border-radius: 20px; padding: 28px 24px;
        box-shadow: 0 0 40px var(--card-glow, rgba(251,191,36,0.1));
        min-height: 220px;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
      }
      .cd-card-category {
        font-size: 0.7rem; text-transform: uppercase; letter-spacing: 2px;
        font-weight: 700; color: var(--card-color, ${v.accent}); margin-bottom: 16px;
      }
      .cd-card-text {
        font-family: ${v.fontDisplay}; font-size: clamp(1.1rem, 3.5vw, 1.4rem);
        line-height: 1.5; color: ${v.text};
      }
      .cd-card-badge {
        position: absolute; top: -10px; right: 16px;
        background: var(--card-color, ${v.accent}); color: #000;
        padding: 4px 14px; border-radius: 20px;
        font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
        letter-spacing: 1px;
      }
      .cd-card-counter {
        position: absolute; bottom: 12px; right: 18px;
        font-size: 0.65rem; color: ${v.textMuted}; font-weight: 600;
      }

      /* ── Draw deck (back) ── */
      .cd-deck {
        width: 100%; max-width: 380px; min-height: 220px;
        background: linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
        border: 2px dashed rgba(255,255,255,0.12);
        border-radius: 20px;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        cursor: pointer; transition: all 0.2s; user-select: none;
      }
      .cd-deck:hover { border-color: ${v.accent}; background: ${v.accentSoft}; transform: scale(1.01); }
      .cd-deck:active { transform: scale(0.98); }
      .cd-deck-icon { font-size: 3rem; margin-bottom: 10px; }
      .cd-deck-label { font-family: ${v.fontDisplay}; font-size: 1.1rem; color: ${v.text}; }
      .cd-deck-sub { font-size: 0.8rem; color: ${v.textMuted}; margin-top: 4px; }

      /* ── Controls ── */
      .cd-controls { display: flex; gap: 10px; width: 100%; max-width: 380px; }
      .cd-ctrl {
        flex: 1; padding: 13px; border: none; border-radius: 12px;
        font-family: ${v.fontBody}; font-weight: 700; font-size: 0.85rem;
        cursor: pointer; transition: all 0.2s; text-transform: uppercase;
      }
      .cd-ctrl-next { background: linear-gradient(135deg, ${v.accent}, #f59e0b); color: #0a0e1a; }
      .cd-ctrl-skip { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: ${v.textSec}; }
      .cd-ctrl-end { background: rgba(248,113,113,0.15); color: ${v.danger}; }

      /* ── Doubled indicator ── */
      .cd-doubled {
        background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3);
        border-radius: 12px; padding: 8px 16px; margin-bottom: 12px;
        font-size: 0.8rem; font-weight: 700; color: #fca5a5;
        text-align: center; animation: pulse-soft 1s infinite;
      }
      @keyframes pulse-soft { 0%,100% { opacity: 1; } 50% { opacity: 0.7; } }

      /* ── Done ── */
      .cd-done {
        display: flex; flex-direction: column; align-items: center;
        justify-content: center; flex: 1; text-align: center; gap: 14px;
      }
      .cd-done h2 { font-family: ${v.fontDisplay}; font-size: 1.8rem; color: ${v.accent}; }
      .cd-done p { color: ${v.textSec}; font-size: 0.95rem; }

      @media (max-width: 480px) {
        .cd-cat-grid { grid-template-columns: 1fr; }
        .cd-card-face { padding: 20px 16px; min-height: 190px; }
      }
    `;
    container.appendChild(styles);

    const wrap = document.createElement("div");
    wrap.className = "cd-wrap";
    container.appendChild(wrap);

    // ── Helpers ──
    function escHtml(s) {
      const d = document.createElement("div");
      d.textContent = s;
      return d.innerHTML;
    }

    function getRandomOther(excludeIdx) {
      const others = players.filter((_, i) => i !== excludeIdx);
      return others.length > 0
        ? others[Math.floor(Math.random() * others.length)]
        : players[0];
    }

    function fillTemplate(text, currentIdx) {
      const current = players[currentIdx] || players[0];
      const leftIdx = (currentIdx + 1) % players.length;
      const rightIdx = (currentIdx - 1 + players.length) % players.length;
      const target1 = getRandomOther(currentIdx);
      let target2 = getRandomOther(currentIdx);
      // Make sure target2 != target1
      if (players.length > 2) {
        const available = players.filter(
          (p, i) => i !== currentIdx && p.id !== target1.id,
        );
        if (available.length > 0)
          target2 = available[Math.floor(Math.random() * available.length)];
      }

      return text
        .replace(/\{player\}/g, current.name)
        .replace(/\{target\}/g, target1.name)
        .replace(/\{target2\}/g, target2.name)
        .replace(/\{left\}/g, players[leftIdx].name)
        .replace(/\{right\}/g, players[rightIdx].name);
    }

    function shuffle(arr) {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    // ── Setup Screen ──
    function renderSetup() {
      let selectedCats = new Set(CATEGORY_KEYS);

      wrap.innerHTML = `
        <div class="cd-setup" style="animation: slideUp 0.5s ease both;">
          <h2>🃏 Pick Your Chaos</h2>
          ${
            isLocal
              ? `
            <div class="cd-add-row">
              <input type="text" id="cd-add-name" placeholder="Add player name" maxlength="20">
              <button class="cd-ctrl cd-ctrl-next" style="flex:0 0 auto; padding:10px 18px;">+ Add</button>
            </div>
          `
              : ""
          }
          <div class="cd-cat-grid" id="cd-cats"></div>
          <div class="cd-toggle-row"><button id="cd-toggle">Deselect All</button></div>
          <button class="cd-start-btn" id="cd-go" ${!isHost ? "disabled" : ""}>
            ${isHost ? "Shuffle & Deal" : "Waiting for host..."}
          </button>
        </div>
      `;

      const catGrid = wrap.querySelector("#cd-cats");
      CATEGORY_KEYS.forEach((cat) => {
        const info = CARD_DB[cat];
        const btn = document.createElement("button");
        btn.className = "cd-cat-btn active";
        btn.style.setProperty("--btn-color", info.color);
        btn.style.setProperty("--btn-bg", info.color + "20");
        btn.textContent = `${cat} (${info.cards.length})`;
        btn.addEventListener("click", () => {
          if (selectedCats.has(cat)) {
            selectedCats.delete(cat);
            btn.classList.remove("active");
          } else {
            selectedCats.add(cat);
            btn.classList.add("active");
          }
        });
        catGrid.appendChild(btn);
      });

      wrap.querySelector("#cd-toggle").addEventListener("click", function () {
        const allSel = selectedCats.size === CATEGORY_KEYS.length;
        CATEGORY_KEYS.forEach((cat) => {
          if (allSel) selectedCats.delete(cat);
          else selectedCats.add(cat);
        });
        catGrid
          .querySelectorAll(".cd-cat-btn")
          .forEach((b) => b.classList.toggle("active", !allSel));
        this.textContent = allSel ? "Select All" : "Deselect All";
      });

      // Local add players
      if (isLocal) {
        const addBtn = wrap.querySelector(".cd-ctrl-next");
        const addInput = wrap.querySelector("#cd-add-name");
        const doAdd = () => {
          const n = addInput.value.trim();
          if (n) {
            api.addLocalPlayer(n);
            addInput.value = "";
          }
        };
        addBtn.addEventListener("click", doAdd);
        addInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") doAdd();
        });
      }

      wrap.querySelector("#cd-go").addEventListener("click", () => {
        if (selectedCats.size === 0) return;

        // Build deck
        let deck = [];
        selectedCats.forEach((cat) => {
          CARD_DB[cat].cards.forEach((card) => {
            deck.push({ ...card, category: cat, color: CARD_DB[cat].color });
          });
        });
        gs.deck = shuffle(deck);
        gs.currentPlayer = 0;
        gs.roundNumber = 1;
        gs.cardsDrawn = 0;
        gs.activeRules = [];
        gs.phase = "playing";

        api.send("cd-start", { deck: gs.deck });
        renderPlay();
      });
    }

    // ── Play Screen ──
    function renderPlay() {
      const cp = players[gs.currentPlayer % players.length];
      const isMyTurn = isHost || isLocal || (cp && cp.id === me.id);

      wrap.innerHTML = "";

      // Active rules
      if (gs.activeRules.length > 0) {
        const bar = document.createElement("div");
        bar.className = "cd-rules-bar";
        bar.innerHTML = gs.activeRules
          .map(
            (r) =>
              `<span class="cd-rule-chip">📜 ${escHtml(r.text)} <span class="cd-rule-rounds">${r.roundsLeft}r</span></span>`,
          )
          .join("");
        wrap.appendChild(bar);
      }

      // Doubled indicator
      if (gs.isDoubled) {
        const dbl = document.createElement("div");
        dbl.className = "cd-doubled";
        dbl.textContent =
          "⚡ DOUBLE TROUBLE — Next card consequences are DOUBLED!";
        wrap.appendChild(dbl);
      }

      const play = document.createElement("div");
      play.className = "cd-play";

      // Turn bar
      play.innerHTML = `
        <div class="cd-turn-bar">
          <div class="cd-turn-dot"></div>
          <div>
            <div class="cd-turn-name">${escHtml(cp?.name || "Player")}'s Turn</div>
            <div class="cd-turn-info">Round ${gs.roundNumber} · ${gs.deck.length - gs.cardsDrawn} cards left</div>
          </div>
        </div>
      `;

      const cardArea = document.createElement("div");
      cardArea.className = "cd-card-area";

      if (!gs.currentCard) {
        // Show draw deck
        const canDraw = isHost || isLocal;
        const deck = document.createElement("div");
        deck.className = "cd-deck";
        if (!canDraw) deck.style.cursor = "default";
        deck.innerHTML = `
          <div class="cd-deck-icon">🃏</div>
          <div class="cd-deck-label">${canDraw ? "Tap to Draw" : "Waiting for draw..."}</div>
          <div class="cd-deck-sub">${gs.deck.length - gs.cardsDrawn} cards remaining</div>
        `;
        if (canDraw) {
          deck.addEventListener("click", () => drawCard());
        }
        cardArea.appendChild(deck);
      } else {
        // Show drawn card
        const card = gs.currentCard;
        const filled = fillTemplate(
          card.text,
          gs.currentPlayer % players.length,
        );
        const badge =
          card.action === "rule"
            ? "RULE"
            : card.action === "waterfall"
              ? "WATERFALL"
              : card.drawAgain
                ? "2× DRAW AGAIN"
                : gs.isDoubled
                  ? "DOUBLED!"
                  : "";

        const cardEl = document.createElement("div");
        cardEl.className = "cd-card flipping";
        cardEl.innerHTML = `
          <div class="cd-card-face" style="--card-color:${card.color}; --card-glow:${card.color}30;">
            ${badge ? `<div class="cd-card-badge" style="background:${card.color};">${badge}</div>` : ""}
            <div class="cd-card-category">${card.category}</div>
            <div class="cd-card-text">${escHtml(filled)}</div>
            <div class="cd-card-counter">${gs.cardsDrawn} / ${gs.deck.length}</div>
          </div>
        `;
        cardArea.appendChild(cardEl);

        // TTS announce
        const cleanText = filled.replace(/[🍻🥂]/g, "").trim();
        setTimeout(() => api.speak(cleanText), 300);
      }

      play.appendChild(cardArea);

      // Controls
      if (isHost || isLocal) {
        const controls = document.createElement("div");
        controls.className = "cd-controls";
        controls.style.marginBottom = "10px";

        if (gs.currentCard) {
          controls.innerHTML = `
            <button class="cd-ctrl cd-ctrl-skip" id="cd-skip">Skip</button>
            <button class="cd-ctrl cd-ctrl-next" id="cd-next">Next Player →</button>
          `;
        }

        play.appendChild(controls);

        const endBtn = document.createElement("button");
        endBtn.className = "cd-ctrl cd-ctrl-end";
        endBtn.style.width = "100%";
        endBtn.style.maxWidth = "380px";
        endBtn.textContent = "End Game";
        endBtn.addEventListener("click", () => {
          api.stopSpeaking();
          api.endGame();
        });
        play.appendChild(endBtn);
      }

      wrap.appendChild(play);

      // Attach control handlers
      wrap
        .querySelector("#cd-next")
        ?.addEventListener("click", () => nextTurn());
      wrap.querySelector("#cd-skip")?.addEventListener("click", () => {
        api.stopSpeaking();
        gs.currentCard = null;
        nextTurn();
      });
    }

    function drawCard() {
      if (gs.cardsDrawn >= gs.deck.length) {
        renderDone();
        return;
      }

      const card = gs.deck[gs.cardsDrawn];
      gs.cardsDrawn++;
      gs.currentCard = card;

      // Handle rule cards
      if (card.action === "rule" && card.duration) {
        const ruleText = fillTemplate(
          card.text,
          gs.currentPlayer % players.length,
        )
          .replace("NEW RULE: ", "")
          .replace(/lasts \d+ rounds\.?/i, "")
          .trim();
        gs.activeRules.push({ text: ruleText, roundsLeft: card.duration });
      }

      // Handle DOUBLE TROUBLE
      if (card.drawAgain) {
        gs.isDoubled = true;
      }

      // Broadcast
      api.send("cd-draw", {
        cardIndex: gs.cardsDrawn - 1,
        currentPlayer: gs.currentPlayer,
      });

      renderPlay();

      // If draw again, auto-draw next after a delay
      if (card.drawAgain) {
        setTimeout(() => {
          gs.currentCard = null;
          drawCard();
        }, 3000);
      }
    }

    function nextTurn() {
      api.stopSpeaking();
      gs.currentCard = null;
      gs.isDoubled = false;
      gs.currentPlayer =
        (gs.currentPlayer + gs.turnOrder + players.length) % players.length;

      // If we've gone full circle, increment round
      if (
        gs.currentPlayer === 0 ||
        (gs.turnOrder === -1 && gs.currentPlayer === players.length - 1)
      ) {
        gs.roundNumber++;
        // Tick down active rules
        gs.activeRules = gs.activeRules
          .map((r) => ({ ...r, roundsLeft: r.roundsLeft - 1 }))
          .filter((r) => r.roundsLeft > 0);
      }

      api.send("cd-next-turn", {
        currentPlayer: gs.currentPlayer,
        roundNumber: gs.roundNumber,
        activeRules: gs.activeRules,
      });

      if (gs.cardsDrawn >= gs.deck.length) {
        renderDone();
      } else {
        renderPlay();
      }
    }

    function renderDone() {
      gs.phase = "done";
      api.speak(`Game over! You survived ${gs.cardsDrawn} cards of chaos.`);

      wrap.innerHTML = `
        <div class="cd-done" style="animation: slideUp 0.6s ease both;">
          <div style="font-size:4rem;">🃏</div>
          <h2>Deck Demolished!</h2>
          <p>You survived ${gs.cardsDrawn} cards across ${gs.roundNumber} rounds.</p>
          <button class="cd-ctrl cd-ctrl-next" style="max-width:280px; margin-top:8px;" id="cd-again">Reshuffle & Play Again</button>
          <button class="cd-ctrl cd-ctrl-end" style="max-width:280px; margin-top:6px;" id="cd-back">Back to Lobby</button>
        </div>
      `;
      wrap.querySelector("#cd-again")?.addEventListener("click", () => {
        gs.phase = "setup";
        renderSetup();
      });
      wrap
        .querySelector("#cd-back")
        ?.addEventListener("click", () => api.endGame());
    }

    // ── Network Handlers ──
    api.on("cd-start", (data) => {
      gs.deck = data.payload?.deck || data.deck || [];
      gs.currentPlayer = 0;
      gs.roundNumber = 1;
      gs.cardsDrawn = 0;
      gs.activeRules = [];
      gs.phase = "playing";
      renderPlay();
    });

    api.on("cd-draw", (data) => {
      const d = data.payload || data;
      gs.cardsDrawn = d.cardIndex + 1;
      gs.currentPlayer = d.currentPlayer;
      gs.currentCard = gs.deck[d.cardIndex];

      if (gs.currentCard?.action === "rule" && gs.currentCard.duration) {
        const ruleText = fillTemplate(
          gs.currentCard.text,
          gs.currentPlayer % players.length,
        )
          .replace("NEW RULE: ", "")
          .replace(/lasts \d+ rounds\.?/i, "")
          .trim();
        if (!gs.activeRules.find((r) => r.text === ruleText)) {
          gs.activeRules.push({
            text: ruleText,
            roundsLeft: gs.currentCard.duration,
          });
        }
      }
      if (gs.currentCard?.drawAgain) gs.isDoubled = true;
      renderPlay();
    });

    api.on("cd-next-turn", (data) => {
      const d = data.payload || data;
      gs.currentPlayer = d.currentPlayer;
      gs.roundNumber = d.roundNumber;
      gs.activeRules = d.activeRules || [];
      gs.currentCard = null;
      gs.isDoubled = false;
      if (gs.cardsDrawn >= gs.deck.length) renderDone();
      else renderPlay();
    });

    // ── Init ──
    if (isHost || isLocal) {
      renderSetup();
    } else {
      wrap.innerHTML = `
        <div class="cd-done" style="padding-top:60px;">
          <div style="font-size:3rem;">🃏</div>
          <h2 style="font-size:1.3rem;">Chaos Deck</h2>
          <p>Waiting for host to set up the game...</p>
          <div style="margin-top:20px;"><div style="width:32px;height:32px;border:3px solid rgba(255,255,255,0.08);
            border-top-color:${v.accent};border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto;"></div></div>
        </div>
      `;
    }

    return {
      destroy() {
        api.stopSpeaking();
        container.innerHTML = "";
      },
    };
  },
};
