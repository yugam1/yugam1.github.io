// ═══════════════════════════════════════════════
//  DEEPER TALK — A conversation game for real ones
//  Loaded dynamically by Party Arena
// ═══════════════════════════════════════════════

const QUESTIONS = {
  "🔥 Hot Takes": [
    "What's a popular opinion you strongly disagree with?",
    "What's something society romanticizes that's actually toxic?",
    "Which widely loved movie or show do you think is overrated?",
    "What's the most controversial food opinion you hold?",
    "Is it ever okay to lie to someone you love? When?",
    "What's an unpopular work habit you think everyone should adopt?",
    "Which 'inspirational' advice is actually terrible?",
    "What's something people pretend to enjoy but secretly hate?",
    "Is revenge ever justified?",
    "What's the most overrated life milestone?",
    "What's a rule you think everyone should break at least once?",
    "Is talent real, or is everything just practice?",
  ],
  "💭 Deep Dives": [
    "What's a belief you held strongly 5 years ago that you've since changed?",
    "If you could know the absolute truth about one mystery of the universe, what would it be?",
    "What do you think consciousness actually is?",
    "Do you think humans are fundamentally good or fundamentally selfish?",
    "What's the most important lesson you learned the hard way?",
    "If you could redesign how society works from scratch, what's the first thing you'd change?",
    "What do you think happens when we die?",
    "Is true altruism possible, or is every good deed secretly selfish?",
    "What's the most beautiful idea you've ever encountered?",
    "If every human suddenly became immortal tomorrow, would that be good or bad?",
    "What would you attempt if you knew you couldn't fail?",
    "Do you think free will exists?",
  ],
  "💕 Connection": [
    "What's something you've never told anyone in this room?",
    "When was the last time you felt truly seen by someone?",
    "What's your love language, and when did you first realize it?",
    "Who in your life has shaped you the most, and do they know it?",
    "What's the kindest thing a stranger ever did for you?",
    "What's a compliment you received that you still think about?",
    "When do you feel most like yourself?",
    "What's a relationship you wish you'd fought harder for?",
    "What's the bravest thing you've ever done emotionally?",
    "If you could send a message to everyone who's ever loved you, what would it say?",
    "What's something about you that people usually get wrong at first?",
    "What are you most afraid of losing?",
  ],
  "🎭 Hypothetical": [
    "If you woke up tomorrow as the opposite gender, what's the first thing you'd do?",
    "You can have dinner with anyone, alive or dead. Who and why?",
    "If you had to live in a different country for a year starting next week, where would you go?",
    "You get $10 million but you can never use the internet again. Deal?",
    "If you could master any skill instantly, what would you choose?",
    "You can erase one invention from history. What goes?",
    "If you could relive one year of your life (without changing anything), which year?",
    "You can swap lives with someone for a month. Who?",
    "If aliens landed and asked one human to represent Earth, who should we send?",
    "You find a time machine but it only goes forward. How far do you go?",
    "If your life were a movie, what genre would it be?",
    "You can make one law that everyone on Earth must follow. What is it?",
  ],
  "⚡ Quick Fire": [
    "Biggest green flag in a person?",
    "Morning person or night owl — and would you change if you could?",
    "What's your guilty pleasure song?",
    "Describe your ideal Sunday in exactly 10 words.",
    "What's the weirdest thing you've Googled recently?",
    "One word to describe your year so far?",
    "What's something you're irrationally proud of?",
    "Hills you'd die on?",
    "What's your phone wallpaper and why?",
    "Worst fashion choice you ever made?",
    "What would your autobiography be called?",
    "What's a small thing that unreasonably annoys you?",
  ],
  "🌙 After Hours": [
    "What's a secret dream you've never pursued and why?",
    "When was the last time you cried, and what triggered it?",
    "What's your biggest regret so far?",
    "What about yourself are you working to accept?",
    "What keeps you up at 3am?",
    "What's the loneliest you've ever felt?",
    "If this were your last year alive, would you change anything about how you're living?",
    "What part of your childhood do you wish you could get back?",
    "What's a wound that healed you?",
    "Who do you owe an apology to?",
    "What's the hardest truth you've accepted about yourself?",
    "What do you need right now that you're afraid to ask for?",
  ],
};

const REACTIONS = [
  "🔥", "😂", "🤔", "❤️", "😮", "👏",
  "😢", "👎", "😭", "😍", "😳", "💀",
];

const CATEGORY_KEYS = Object.keys(QUESTIONS);

export default {
  id: "deeper-talk",
  name: "Deeper Talk",

  create(container, api) {
    const players = api.getPlayers();
    const me = api.getMe();
    const isHost = api.isHost();
    const isLocal = api.isLocal();
    const v = api.cssVars;

    // ── Game State ──
    // Resume support: getResumeState() hands back our last snapshot if
    // we're the host reconnecting mid-game. timerInterval is never part of
    // the saved snapshot (it's a live setInterval handle, meaningless
    // across a reload) — always starts at null and gets recreated by
    // renderPlaying() if a timer is active.
    const resumedGameState = api.getResumeState();
    let gameState = resumedGameState
      ? { ...resumedGameState, timerInterval: null }
      : {
          phase: "setup", // setup | playing | reveal
          categories: [],
          questions: [], // shuffled question pool
          currentQ: 0,
          currentSpeaker: 0,
          reactions: {}, // { peerId: emoji }
          timer: 0,
          timerInterval: null,
          timerDuration: 60,
          localPlayerIndex: 0, // for local pass-and-play
        };

    // Single chokepoint, called after any state-changing action. Excludes
    // timerInterval since setInterval handles aren't JSON-serializable.
    function saveResumeState() {
      if (!isHost || isLocal) return;
      const { timerInterval, ...snapshot } = gameState;
      api.setResumeState(snapshot);
    }

    // ── Styles ──
    const styles = document.createElement("style");
    styles.textContent = `
      .dt-wrap {
        display: flex; flex-direction: column; align-items: center;
        height: 100%; padding: 16px; overflow-y: auto;
        font-family: ${v.fontBody};
      }
      .dt-setup { max-width: 500px; width: 100%; }
      .dt-setup h2 { font-family: ${v.fontDisplay}; font-size: 1.3rem; text-align: center; margin: 12px 0 20px; color: ${v.text}; }
      .dt-cat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
      .dt-cat-btn {
        background: rgba(255,255,255,0.04);
        border: 2px solid rgba(255,255,255,0.08);
        border-radius: 12px; padding: 14px 12px;
        color: ${v.text}; cursor: pointer;
        font-family: ${v.fontBody}; font-size: 0.9rem; font-weight: 600;
        transition: all 0.2s; text-align: center;
      }
      .dt-cat-btn:hover { border-color: ${v.accent}; }
      .dt-cat-btn.active { border-color: ${v.accent}; background: ${v.accentSoft}; }
      .dt-select-all { text-align: center; margin-bottom: 16px; }
      .dt-select-all button {
        background: none; border: none; color: ${v.accent}; cursor: pointer;
        font-family: ${v.fontBody}; font-weight: 700; font-size: 0.85rem;
        text-decoration: underline;
      }
      .dt-timer-pick {
        display: flex; align-items: center; justify-content: center; gap: 12px;
        margin-bottom: 20px; color: ${v.textSec}; font-size: 0.9rem;
      }
      .dt-timer-pick select {
        background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);
        color: ${v.text}; padding: 8px 12px; border-radius: 8px;
        font-family: ${v.fontBody}; font-size: 0.9rem;
      }
      .dt-start-btn {
        width: 100%; padding: 16px; border: none; border-radius: 12px;
        background: linear-gradient(135deg, ${v.accent}, #f59e0b);
        color: #0a0e1a; font-family: ${v.fontBody}; font-weight: 700;
        font-size: 1rem; cursor: pointer; text-transform: uppercase; letter-spacing: 1px;
      }
      .dt-start-btn:disabled { opacity: 0.3; cursor: not-allowed; }

      /* ── Playing ── */
      .dt-play { display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 560px; flex: 1; }
      .dt-speaker-bar {
        display: flex; align-items: center; gap: 12px; padding: 12px 20px;
        background: ${v.accentSoft}; border-radius: 50px;
        margin-bottom: 24px; width: fit-content;
      }
      .dt-speaker-dot { width: 12px; height: 12px; border-radius: 50%; background: ${v.accent}; animation: float 2s ease infinite; }
      .dt-speaker-name { font-weight: 700; color: ${v.accent}; font-size: 0.95rem; }
      .dt-speaker-label { color: ${v.textSec}; font-size: 0.8rem; }

      .dt-question-card {
        background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
        border-radius: 20px; padding: 32px 28px;
        width: 100%; text-align: center;
        margin-bottom: 24px; position: relative;
        animation: slideUp 0.5s cubic-bezier(0.16,1,0.3,1) both;
      }
      .dt-category-tag {
        font-size: 0.75rem; color: ${v.textMuted}; text-transform: uppercase;
        letter-spacing: 2px; font-weight: 700; margin-bottom: 16px;
      }
      .dt-question-text {
        font-family: ${v.fontDisplay}; font-size: clamp(1.2rem, 4vw, 1.6rem);
        line-height: 1.4; color: ${v.text};
      }
      .dt-q-counter {
        position: absolute; top: 12px; right: 16px;
        font-size: 0.7rem; color: ${v.textMuted}; font-weight: 600;
      }

      .dt-timer-bar {
        width: 100%; height: 4px; background: rgba(255,255,255,0.06);
        border-radius: 2px; margin-bottom: 20px; overflow: hidden;
      }
      .dt-timer-fill {
        height: 100%; background: ${v.accent}; border-radius: 2px;
        transition: width 1s linear;
      }
      .dt-timer-text { font-size: 0.8rem; color: ${v.textSec}; margin-bottom: 16px; font-weight: 600; }

      .dt-reactions {
        display: flex; gap: 8px; justify-content: center;
        flex-wrap: wrap; margin-bottom: 20px;
      }
      .dt-react-btn {
        width: 52px; height: 52px;
        background: rgba(255,255,255,0.04); border: 1.5px solid rgba(255,255,255,0.08);
        border-radius: 50%; font-size: 1.5rem;
        cursor: pointer; transition: all 0.2s; position: relative;
      }
      .dt-react-btn:hover { transform: scale(1.15); border-color: ${v.accent}; }
      .dt-react-btn.active { background: ${v.accentSoft}; border-color: ${v.accent}; transform: scale(1.1); }
      .dt-react-count {
        position: absolute; top: -4px; right: -4px;
        background: ${v.accent}; color: #000; font-size: 0.65rem;
        width: 18px; height: 18px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-weight: 700; font-family: ${v.fontBody};
      }

      .dt-float-reaction {
        position: fixed; font-size: 2rem; pointer-events: none;
        animation: floatUp 1.5s ease both; z-index: 999;
      }
      @keyframes floatUp {
        0% { opacity: 1; transform: translateY(0) scale(1); }
        100% { opacity: 0; transform: translateY(-120px) scale(1.8); }
      }

      .dt-controls { display: flex; gap: 10px; width: 100%; }
      .dt-ctrl-btn {
        flex: 1; padding: 14px; border: none; border-radius: 12px;
        font-family: ${v.fontBody}; font-weight: 700; font-size: 0.9rem;
        cursor: pointer; transition: all 0.2s; text-transform: uppercase;
      }
      .dt-next-btn { background: linear-gradient(135deg, ${v.accent}, #f59e0b); color: #0a0e1a; }
      .dt-skip-btn { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: ${v.textSec}; }
      .dt-end-btn { background: rgba(248,113,113,0.15); color: ${v.danger}; }

      .dt-done {
        display: flex; flex-direction: column; align-items: center;
        justify-content: center; flex: 1; text-align: center; gap: 16px;
      }
      .dt-done h2 { font-family: ${v.fontDisplay}; font-size: 2rem; color: ${v.accent}; }
      .dt-done p { color: ${v.textSec}; }

      @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }

      @media (max-width: 480px) {
        .dt-cat-grid { grid-template-columns: 1fr; }
        .dt-question-card { padding: 24px 18px; }
      }
    `;
    container.appendChild(styles);

    // ── Root ──
    const wrap = document.createElement("div");
    wrap.className = "dt-wrap";
    container.appendChild(wrap);

    // ── Setup Phase ──
    function renderSetup() {
      let selectedCats = new Set(CATEGORY_KEYS);

      wrap.innerHTML = `
        <div class="dt-setup" style="animation: slideUp 0.5s ease both;">
          <h2>Choose Your Vibes</h2>
          ${
            isLocal
              ? `
            <div style="text-align:center; margin-bottom:20px;">
              <p style="color:${v.textSec}; font-size:0.85rem; margin-bottom:10px;">Add players for pass-and-play:</p>
              <div style="display:flex; gap:8px; max-width:320px; margin:0 auto;">
                <input type="text" id="dt-add-name" placeholder="Player name" maxlength="20"
                  style="flex:1; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1);
                  padding:10px 14px; border-radius:10px; color:${v.text}; font-family:${v.fontBody};">
                <button id="dt-add-btn" class="dt-ctrl-btn dt-next-btn" style="flex:0 0 auto; padding:10px 18px;">+ Add</button>
              </div>
            </div>
          `
              : ""
          }
          <div class="dt-cat-grid" id="dt-cats"></div>
          <div class="dt-select-all"><button id="dt-toggle-all">Deselect All</button></div>
          <div class="dt-timer-pick">
            <label>⏱ Time per question:</label>
            <select id="dt-timer-sel">
              <option value="0">No timer</option>
              <option value="30">30 sec</option>
              <option value="60" selected>60 sec</option>
              <option value="90">90 sec</option>
              <option value="120">2 min</option>
            </select>
          </div>
          <button class="dt-start-btn" id="dt-go" ${!isHost ? "disabled" : ""}>
            ${isHost ? "Let's Go" : "Waiting for host..."}
          </button>
        </div>
      `;

      const catGrid = wrap.querySelector("#dt-cats");
      CATEGORY_KEYS.forEach((cat) => {
        const btn = document.createElement("button");
        btn.className = "dt-cat-btn active";
        btn.textContent = cat;
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

      wrap.querySelector("#dt-toggle-all").addEventListener("click", () => {
        const allSelected = selectedCats.size === CATEGORY_KEYS.length;
        CATEGORY_KEYS.forEach((cat) => {
          if (allSelected) selectedCats.delete(cat);
          else selectedCats.add(cat);
        });
        catGrid.querySelectorAll(".dt-cat-btn").forEach((b) => {
          b.classList.toggle("active", !allSelected);
        });
        wrap.querySelector("#dt-toggle-all").textContent = allSelected
          ? "Select All"
          : "Deselect All";
      });

      // Local: add players
      if (isLocal) {
        const addBtn = wrap.querySelector("#dt-add-btn");
        const addInput = wrap.querySelector("#dt-add-name");
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

      // Start
      wrap.querySelector("#dt-go").addEventListener("click", () => {
        if (selectedCats.size === 0) return;
        gameState.categories = [...selectedCats];
        gameState.timerDuration = parseInt(
          wrap.querySelector("#dt-timer-sel").value,
        );

        // Build shuffled question pool
        let pool = [];
        gameState.categories.forEach((cat) => {
          QUESTIONS[cat].forEach((q) => pool.push({ category: cat, text: q }));
        });
        // Fisher-Yates shuffle
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        gameState.questions = pool;
        gameState.currentQ = 0;
        gameState.currentSpeaker = 0;
        gameState.phase = "playing";

        // Broadcast to all
        api.send("dt-start", {
          questions: pool,
          timerDuration: gameState.timerDuration,
        });
        saveResumeState();

        renderPlaying();
      });
    }

    // ── Playing Phase ──
    function renderPlaying() {
      if (gameState.currentQ >= gameState.questions.length) {
        renderDone();
        return;
      }

      const q = gameState.questions[gameState.currentQ];
      const allPlayers = api.getPlayers();
      const speaker = allPlayers[gameState.currentSpeaker % allPlayers.length];
      gameState.reactions = {};

      wrap.innerHTML = `
        <div class="dt-play">
          <div class="dt-speaker-bar">
            <div class="dt-speaker-dot"></div>
            <div>
              <div class="dt-speaker-name">${escHtml(speaker?.name || "Player")}'s Turn</div>
              <div class="dt-speaker-label">Answer this one ↓</div>
            </div>
          </div>

          <div class="dt-question-card">
            <div class="dt-q-counter">${gameState.currentQ + 1} / ${gameState.questions.length}</div>
            <div class="dt-category-tag">${q.category}</div>
            <div class="dt-question-text">${escHtml(q.text)}</div>
          </div>

          ${
            gameState.timerDuration > 0
              ? `
            <div class="dt-timer-text" id="dt-timer-text">${gameState.timerDuration}s</div>
            <div class="dt-timer-bar"><div class="dt-timer-fill" id="dt-timer-fill" style="width:100%"></div></div>
          `
              : ""
          }

          <div class="dt-reactions" id="dt-reactions"></div>

          <div class="dt-controls">
            ${
              isHost || isLocal
                ? `
              <button class="dt-ctrl-btn dt-skip-btn" id="dt-skip">Skip</button>
              <button class="dt-ctrl-btn dt-next-btn" id="dt-next">Next →</button>
            `
                : '<div style="flex:1;text-align:center;color:' +
                  v.textMuted +
                  ';font-size:0.85rem;">Host controls the flow</div>'
            }
          </div>
          <div style="margin-top:10px; width:100%;">
            ${isHost || isLocal ? '<button class="dt-ctrl-btn dt-end-btn" id="dt-end" style="width:100%;">End Game</button>' : ""}
          </div>
        </div>
      `;

      // Reactions
      const reactionsEl = wrap.querySelector("#dt-reactions");
      REACTIONS.forEach((emoji) => {
        const btn = document.createElement("button");
        btn.className = "dt-react-btn";
        btn.innerHTML = emoji;
        btn.addEventListener("click", () => {
          api.send("dt-react", { emoji, from: me.id, name: me.name });
          handleReaction(emoji, me.id);
          floatEmoji(emoji, btn);
        });
        reactionsEl.appendChild(btn);
      });

      // Timer
      if (gameState.timerDuration > 0) {
        let remaining = gameState.timerDuration;
        gameState.timerInterval = setInterval(() => {
          remaining--;
          const fill = wrap.querySelector("#dt-timer-fill");
          const text = wrap.querySelector("#dt-timer-text");
          if (fill)
            fill.style.width = `${(remaining / gameState.timerDuration) * 100}%`;
          if (text) text.textContent = `${remaining}s`;
          if (remaining <= 0) {
            clearInterval(gameState.timerInterval);
            api.speak("Time's up!");
            // Auto-advance if host
            if (isHost || isLocal) setTimeout(() => advanceQuestion(), 1500);
          }
        }, 1000);
      }

      // Controls
      wrap
        .querySelector("#dt-next")
        ?.addEventListener("click", () => advanceQuestion());
      wrap
        .querySelector("#dt-skip")
        ?.addEventListener("click", () => advanceQuestion());
      wrap.querySelector("#dt-end")?.addEventListener("click", () => {
        api.stopSpeaking();
        api.endGame();
      });

      // Announce question via TTS (host device speaker)
      const speakerName = speaker?.name || "Player";
      const catClean = q.category.replace(/[^\w\s]/g, "").trim();
      setTimeout(() => {
        api.speak(`${speakerName}'s turn. ${catClean}. ${q.text}`);
      }, 400);
    }

    function advanceQuestion() {
      clearInterval(gameState.timerInterval);
      api.stopSpeaking();
      gameState.currentQ++;
      gameState.currentSpeaker++;

      api.send("dt-advance", {
        currentQ: gameState.currentQ,
        currentSpeaker: gameState.currentSpeaker,
      });
      saveResumeState();

      renderPlaying();
    }

    function handleReaction(emoji, fromId) {
      gameState.reactions[fromId] = emoji;
      updateReactionCounts();
    }

    function updateReactionCounts() {
      const counts = {};
      Object.values(gameState.reactions).forEach((e) => {
        counts[e] = (counts[e] || 0) + 1;
      });

      const buttons = wrap.querySelectorAll(".dt-react-btn");
      buttons.forEach((btn) => {
        const emoji = btn.textContent.trim().replace(/\d/g, "");
        const existing = btn.querySelector(".dt-react-count");
        if (existing) existing.remove();
        if (counts[emoji]) {
          const badge = document.createElement("span");
          badge.className = "dt-react-count";
          badge.textContent = counts[emoji];
          btn.appendChild(badge);
        }
      });
    }

    function floatEmoji(emoji, fromEl) {
      const rect = fromEl.getBoundingClientRect();
      const el = document.createElement("div");
      el.className = "dt-float-reaction";
      el.textContent = emoji;
      el.style.left = rect.left + rect.width / 2 - 16 + "px";
      el.style.top = rect.top + "px";
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1500);
    }

    function renderDone() {
      api.speak(
        `Great session! You went through ${gameState.currentQ} questions together.`,
      );
      wrap.innerHTML = `
        <div class="dt-done" style="animation: slideUp 0.6s ease both;">
          <div style="font-size:4rem;">✨</div>
          <h2>Great Session!</h2>
          <p>You went through ${gameState.currentQ} questions together.</p>
          <button class="dt-ctrl-btn dt-next-btn" style="max-width:280px; margin-top:12px;" id="dt-restart">Play Again</button>
          <button class="dt-ctrl-btn dt-end-btn" style="max-width:280px; margin-top:8px;" id="dt-back">Back to Lobby</button>
        </div>
      `;
      wrap.querySelector("#dt-restart")?.addEventListener("click", () => {
        gameState.phase = "setup";
        renderSetup();
      });
      wrap
        .querySelector("#dt-back")
        ?.addEventListener("click", () => api.endGame());
    }

    // ── Network Event Handlers ──
    api.on("dt-start", (data) => {
      gameState.questions = data.questions;
      gameState.timerDuration = data.timerDuration;
      gameState.currentQ = 0;
      gameState.currentSpeaker = 0;
      gameState.phase = "playing";
      renderPlaying();
    });

    api.on("dt-advance", (data) => {
      clearInterval(gameState.timerInterval);
      gameState.currentQ = data.currentQ;
      gameState.currentSpeaker = data.currentSpeaker;
      renderPlaying();
    });

    api.on("dt-react", (data) => {
      handleReaction(
        data.payload?.emoji || data.emoji,
        data.payload?.from || data.from,
      );
      // Float emoji for visual feedback
      const btns = wrap.querySelectorAll(".dt-react-btn");
      btns.forEach((b) => {
        if (
          b.textContent.trim().startsWith(data.payload?.emoji || data.emoji)
        ) {
          floatEmoji(data.payload?.emoji || data.emoji, b);
        }
      });
    });

    // A guest reconnecting mid-session missed whatever dt-start/dt-advance
    // happened while it was gone — host just ships the whole gameState once
    // (minus the timer, which isn't meaningful to hand to someone else's
    // client anyway; their renderPlaying() doesn't restart a timer it
    // doesn't own — only the host's setInterval drives auto-advance).
    api.on("dt-full-sync", (data) => {
      const d = data.payload || data;
      gameState = { ...d.gameState, timerInterval: null };
      if (gameState.phase === "playing") renderPlaying();
      else renderSetup();
    });

    if (isHost && !isLocal) {
      api.onPlayerRejoinedMidgame(({ playerId }) => {
        if (gameState.phase !== "playing") return;
        const { timerInterval, ...snapshot } = gameState;
        api.sendTo(playerId, "dt-full-sync", { gameState: snapshot });
      });
      // onPlayerRejoinedMidgame can fire before the rejoining guest's own
      // dynamic import finishes and registers the "dt-full-sync" listener
      // above — a push that arrives too early is silently dropped (no
      // buffering/retry). Guests also pull explicitly once ready; same
      // "playing" guard applies.
      api.on("dt-request-state", (_payload, fromPeer) => {
        if (gameState.phase !== "playing") return;
        const { timerInterval, ...snapshot } = gameState;
        api.sendTo(fromPeer, "dt-full-sync", { gameState: snapshot });
      });
    } else if (!isLocal) {
      api.send("dt-request-state", {});
    }

    function escHtml(s) {
      const d = document.createElement("div");
      d.textContent = s;
      return d.innerHTML;
    }

    // ── Init ──
    if (isHost || isLocal) {
      if (resumedGameState && resumedGameState.phase === "playing") {
        // Reconnecting host, mid-game — resume instead of restarting setup.
        renderPlaying();
      } else {
        renderSetup();
      }
    } else {
      wrap.innerHTML = `
        <div class="dt-setup" style="text-align:center; padding-top:40px; animation: slideUp 0.5s ease both;">
          <div style="font-size:3rem; margin-bottom:16px;">💬</div>
          <h2>Deeper Talk</h2>
          <p style="color:${v.textSec};">Waiting for host to configure the game...</p>
          <div style="margin-top:24px;"><div class="spinner" style="margin:0 auto;
            width:32px;height:32px;border:3px solid rgba(255,255,255,0.08);
            border-top-color:${v.accent};border-radius:50%;animation:spin 0.8s linear infinite;"></div></div>
        </div>
      `;
    }

    // ── Cleanup ──
    return {
      destroy() {
        clearInterval(gameState.timerInterval);
        api.stopSpeaking();
        container.innerHTML = "";
      },
    };
  },
};
