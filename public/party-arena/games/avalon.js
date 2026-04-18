// ═══════════════════════════════════════════════
//  AVALON — The Resistance: Avalon
//  Social deduction for 5-10 players
//  v2: Haptics, discussion gates, full TTS, human-centered flow
// ═══════════════════════════════════════════════

const QUEST_CONFIG = {
  5: { good: 3, evil: 2, quests: [2, 3, 2, 3, 3], twoFails: [] },
  6: { good: 4, evil: 2, quests: [2, 3, 4, 3, 4], twoFails: [] },
  7: { good: 4, evil: 3, quests: [2, 3, 3, 4, 4], twoFails: [3] },
  8: { good: 5, evil: 3, quests: [3, 4, 4, 5, 5], twoFails: [3] },
  9: { good: 6, evil: 3, quests: [3, 4, 4, 5, 5], twoFails: [3] },
  10: { good: 6, evil: 4, quests: [3, 4, 4, 5, 5], twoFails: [3] },
};

const ROLES = {
  loyalServant: {
    id: "loyalServant",
    name: "Loyal Servant",
    team: "good",
    icon: "\u{1F6E1}\uFE0F",
    desc: "A faithful servant of Arthur. You have no special information.",
  },
  merlin: {
    id: "merlin",
    name: "Merlin",
    team: "good",
    icon: "\u{1F9D9}",
    desc: "You know who the evil players are (except Mordred).",
  },
  percival: {
    id: "percival",
    name: "Percival",
    team: "good",
    icon: "\u2694\uFE0F",
    desc: "You know who Merlin is (but Morgana looks the same to you).",
  },
  minionOfMordred: {
    id: "minionOfMordred",
    name: "Minion",
    team: "evil",
    icon: "\u{1F479}",
    desc: "A servant of evil. You know your fellow minions.",
  },
  assassin: {
    id: "assassin",
    name: "Assassin",
    team: "evil",
    icon: "\u{1F5E1}\uFE0F",
    desc: "If good wins 3 quests, you get one shot to identify and kill Merlin.",
  },
  morgana: {
    id: "morgana",
    name: "Morgana",
    team: "evil",
    icon: "\u{1F40D}",
    desc: "You appear as Merlin to Percival. Sow confusion.",
  },
  mordred: {
    id: "mordred",
    name: "Mordred",
    team: "evil",
    icon: "\u{1F451}",
    desc: "Hidden from Merlin. Even his magic cannot reveal you.",
  },
  oberon: {
    id: "oberon",
    name: "Oberon",
    team: "evil",
    icon: "\u{1F47B}",
    desc: "Evil but unknown to other evil, and they are unknown to you.",
  },
};

const GOOD_SPECIALS = ["merlin", "percival"];
const EVIL_SPECIALS = ["assassin", "morgana", "mordred", "oberon"];
const OPTIONAL_ROLES = [
  "merlin",
  "assassin",
  "percival",
  "morgana",
  "mordred",
  "oberon",
];

const DISCUSS_PROMPTS = {
  postNight: [
    "Look around. Who seems nervous?",
    "First impressions \u2014 who do you trust?",
    "Anyone acting differently than usual?",
  ],
  postProposal: [
    "Why these players? Leader, defend your choice.",
    "Does this team make sense?",
    "Who would YOU have picked instead?",
  ],
  postVoteReject: [
    "Why was this team rejected?",
    "Who voted reject, and why?",
    "Careful \u2014 5 rejects means evil wins.",
  ],
  postVoteApprove: [
    "The team is locked in. Any last suspicions?",
    "Watch how the team members react.",
    "Good luck on the quest.",
  ],
  postQuestPass: [
    "Quest succeeded! But can you really trust everyone?",
    "Who is being too quiet?",
    "Evil might be playing the long game.",
  ],
  postQuestFail: [
    "Someone played a fail card. Who was it?",
    "Look at who was on the team. Who do you suspect?",
    "Evil is among you. Find them.",
  ],
  preAssassination: [
    "Evil team \u2014 who seemed to know too much?",
    "Who guided the votes a little too well?",
    "This is your last chance. Choose wisely.",
  ],
};
function rndPrompt(k) {
  const a = DISCUSS_PROMPTS[k];
  return a ? a[Math.floor(Math.random() * a.length)] : "";
}

const HP = {
  open: [300, 100, 300, 100, 300],
  close: [100],
  pass: [80, 40, 80, 40, 200],
  fail: [600],
  vote: [50, 30, 50],
  kill: [200, 100, 200, 100, 600],
  turn: [150, 80, 150],
  end: [100, 60, 100, 60, 100, 60, 400],
};
function vib(p) {
  try {
    navigator.vibrate?.(p);
  } catch (e) {}
}

export default {
  id: "avalon",
  name: "Avalon",

  create(container, api) {
    const players = api.getPlayers(),
      me = api.getMe(),
      isHost = api.isHost(),
      isLocal = api.isLocal(),
      v = api.cssVars,
      n = players.length;
    let gs = {
      phase: "setup",
      config: QUEST_CONFIG[n] || QUEST_CONFIG[5],
      roles: {},
      roleInfo: {},
      leader: 0,
      questNum: 0,
      questResults: [],
      proposedTeam: [],
      votes: {},
      questChoices: {},
      rejectStreak: 0,
      goodWins: 0,
      evilWins: 0,
      enabledRoles: ["merlin", "assassin"],
      assassinTarget: null,
      lri: 0,
      lrv: false,
    };

    const sty = document.createElement("style");
    sty.textContent = `
.av{display:flex;flex-direction:column;align-items:center;height:100%;overflow-y:auto;font-family:${v.fontBody};padding:12px;padding-bottom:60px}
.av-s{width:100%;max-width:480px}
.av h2{font-family:${v.fontDisplay};font-size:1.3rem;text-align:center;margin:8px 0 6px;color:${v.text}}
.av-sub{text-align:center;color:${v.textSec};font-size:.85rem;margin-bottom:18px}
.av-comp{display:flex;justify-content:center;gap:20px;margin-bottom:18px;padding:14px;background:rgba(255,255,255,.03);border-radius:12px}
.av-ci{text-align:center}.av-cn{font-family:${v.fontDisplay};font-size:1.5rem}.av-cl{font-size:.7rem;text-transform:uppercase;letter-spacing:1px;font-weight:700}
.av-good{color:#60a5fa}.av-evil{color:#f87171}
.av-rg{display:flex;flex-direction:column;gap:8px;margin-bottom:18px}
.av-rt{display:flex;align-items:center;gap:12px;padding:12px 16px;background:rgba(255,255,255,.03);border:1.5px solid rgba(255,255,255,.08);border-radius:12px;cursor:pointer;transition:all .2s;user-select:none}
.av-rt:hover{border-color:rgba(255,255,255,.2)}.av-rt.on{border-color:var(--rc);background:var(--rb)}
.av-ri{font-size:1.5rem;flex-shrink:0}.av-rf{flex:1}.av-rn{font-weight:700;font-size:.9rem}.av-rd{font-size:.75rem;color:${v.textMuted};margin-top:2px}
.av-rtm{font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:1px}
.av-ck{width:22px;height:22px;border-radius:6px;border:2px solid rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:.8rem;flex-shrink:0}
.av-rt.on .av-ck{background:var(--rc);border-color:var(--rc)}
.av-note{font-size:.75rem;color:${v.textMuted};text-align:center;margin-bottom:14px;font-style:italic}
.av-go{width:100%;padding:16px;border:none;border-radius:12px;background:linear-gradient(135deg,#60a5fa,#3b82f6);color:#fff;font-family:${v.fontBody};font-weight:700;font-size:1rem;cursor:pointer;text-transform:uppercase;letter-spacing:1px}
.av-go:disabled{opacity:.3;cursor:not-allowed}
.av-tk{display:flex;align-items:center;justify-content:center;gap:10px;margin:14px 0;width:100%}
.av-qp{width:48px;height:48px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:700;font-size:.7rem;border:2.5px solid rgba(255,255,255,.1);position:relative;transition:all .3s}
.av-qp.cur{border-color:${v.accent};box-shadow:0 0 16px rgba(251,191,36,.3)}
.av-qp.pass{background:rgba(96,165,250,.2);border-color:#60a5fa;color:#60a5fa}.av-qp.fail{background:rgba(248,113,113,.2);border-color:#f87171;color:#f87171}
.av-qn{font-family:${v.fontDisplay};font-size:1rem}.av-qs{font-size:.6rem;color:${v.textMuted}}
.av-2f{position:absolute;bottom:-6px;font-size:.5rem;background:#f87171;color:#fff;padding:1px 5px;border-radius:8px;font-weight:700}
.av-rej{display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:10px;font-size:.75rem;color:${v.textMuted}}
.av-rjp{width:14px;height:14px;border-radius:50%;border:2px solid rgba(255,255,255,.1)}.av-rjp.on{background:#f87171;border-color:#f87171}
.av-ph{text-align:center;margin-bottom:14px}.av-ph h3{font-family:${v.fontDisplay};font-size:1.2rem;color:${v.text}}.av-ph p{color:${v.textSec};font-size:.85rem;margin-top:4px}
.av-rc{background:rgba(0,0,0,.4);border:2px solid var(--cc,#60a5fa);border-radius:20px;padding:32px 24px;text-align:center;box-shadow:0 0 40px var(--cg,rgba(96,165,250,.15));width:100%;margin-bottom:16px;animation:avF2 .6s cubic-bezier(.16,1,.3,1)}
@keyframes avF2{0%{transform:rotateY(-90deg) scale(.8);opacity:0}50%{transform:rotateY(-10deg) scale(1.02);opacity:1}100%{transform:rotateY(0) scale(1)}}
.av-rci{font-size:3.5rem;margin-bottom:12px}.av-rcr{font-family:${v.fontDisplay};font-size:1.4rem;margin-bottom:6px}
.av-rct{font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin-bottom:14px}
.av-rcd{font-size:.9rem;color:${v.textSec};line-height:1.4;margin-bottom:16px}
.av-kn{background:rgba(255,255,255,.04);border-radius:12px;padding:14px;text-align:left}
.av-kn h4{font-size:.75rem;text-transform:uppercase;letter-spacing:1px;color:${v.textMuted};margin-bottom:8px}
.av-ki{display:flex;align-items:center;gap:8px;padding:4px 0;font-size:.9rem;font-weight:600}
.av-kd{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.av-cv{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;flex:1;min-height:300px;cursor:pointer;user-select:none}
.av-cvn{font-family:${v.fontDisplay};font-size:1.6rem;color:${v.accent};margin-bottom:10px}.av-cvm{color:${v.textSec};font-size:.95rem}
.av-cvi{font-size:4rem;margin-bottom:16px;animation:avBob 2s ease infinite}
@keyframes avBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
.av-disc{text-align:center;padding:10px 0}.av-disc-i{font-size:3rem;margin-bottom:12px}
.av-disc h3{font-family:${v.fontDisplay};font-size:1.2rem;margin-bottom:6px}
.av-disc-pr{color:${v.accent};font-size:1rem;font-weight:600;font-style:italic;margin:12px 0;min-height:24px;line-height:1.4}
.av-disc-ctx{background:rgba(255,255,255,.03);border-radius:12px;padding:14px;margin:12px 0;font-size:.85rem;color:${v.textSec};text-align:left;line-height:1.5}
.av-tg{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:16px}
.av-tp{display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:50px;background:rgba(255,255,255,.04);border:2px solid rgba(255,255,255,.08);cursor:pointer;transition:all .2s;user-select:none;font-weight:600;font-size:.9rem}
.av-tp:hover{border-color:rgba(255,255,255,.2)}.av-tp.sel{border-color:#60a5fa;background:rgba(96,165,250,.15);color:#93c5fd}
.av-td{width:10px;height:10px;border-radius:50%;border:2px solid rgba(255,255,255,.15);transition:all .2s}
.av-tp.sel .av-td{background:#60a5fa;border-color:#60a5fa}
.av-lb{font-size:.6rem;background:${v.accent}20;color:${v.accent};padding:2px 8px;border-radius:10px;font-weight:700}
.av-vb{display:flex;gap:12px;justify-content:center;margin:16px 0}
.av-vt{flex:1;max-width:180px;padding:18px;border:2.5px solid;border-radius:16px;font-family:${v.fontBody};font-weight:700;font-size:1rem;cursor:pointer;transition:all .2s;text-transform:uppercase;background:transparent}
.av-vt:active{transform:scale(.95)}
.av-va{border-color:rgba(96,165,250,.3);color:#60a5fa}.av-va:hover{background:rgba(96,165,250,.1)}.av-va.on{background:rgba(96,165,250,.2);border-color:#60a5fa}
.av-vr{border-color:rgba(248,113,113,.3);color:#f87171}.av-vr:hover{background:rgba(248,113,113,.1)}.av-vr.on{background:rgba(248,113,113,.2);border-color:#f87171}
.av-vc{padding:8px 14px;border-radius:10px;font-weight:700;font-size:.8rem;animation:avSU .3s ease both;display:inline-block;margin:3px}
.av-vc.ap{background:rgba(96,165,250,.15);color:#93c5fd}.av-vc.rj{background:rgba(248,113,113,.15);color:#fca5a5}
.av-qb{display:flex;gap:12px;justify-content:center;margin:16px 0}
.av-qt{flex:1;max-width:180px;padding:20px;border:2.5px solid;border-radius:16px;font-family:${v.fontBody};font-weight:700;font-size:1rem;cursor:pointer;transition:all .2s;text-transform:uppercase;background:transparent}
.av-qt:active{transform:scale(.95)}.av-qts{border-color:rgba(96,165,250,.3);color:#60a5fa}.av-qtf{border-color:rgba(248,113,113,.3);color:#f87171}
.av-tok{display:flex;gap:10px;justify-content:center;margin:16px 0}
.av-to{width:50px;height:50px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.4rem;animation:avSU .4s ease both}
.av-tos{background:rgba(96,165,250,.2);border:2px solid #60a5fa}.av-tof{background:rgba(248,113,113,.2);border:2px solid #f87171}
.av-ag{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin:16px 0}
.av-at{padding:14px 22px;border-radius:14px;background:rgba(255,255,255,.04);border:2px solid rgba(255,255,255,.08);cursor:pointer;transition:all .2s;font-weight:700;font-size:.95rem;user-select:none}
.av-at:hover{border-color:#f87171}.av-at.sel{border-color:#f87171;background:rgba(248,113,113,.15);color:#fca5a5}
.av-gos{text-align:center;padding:20px 0}.av-gos h2{font-family:${v.fontDisplay};font-size:1.8rem;margin-bottom:8px}
.av-rr{display:flex;flex-direction:column;gap:8px;margin:16px 0}
.av-row{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;background:rgba(255,255,255,.03);animation:avSU .3s ease both}
.av-rowi{font-size:1.3rem;flex-shrink:0}.av-rown{font-weight:700;flex:1}.av-rowr{font-size:.8rem;font-weight:600}
.av-b{padding:14px 28px;border:none;border-radius:12px;font-family:${v.fontBody};font-weight:700;font-size:.9rem;cursor:pointer;text-transform:uppercase;letter-spacing:.5px;transition:all .2s}
.av-b:active{transform:scale(.96)}.av-b:disabled{opacity:.3;cursor:not-allowed;transform:none}
.av-bp{background:linear-gradient(135deg,#60a5fa,#3b82f6);color:#fff}
.av-ba{background:linear-gradient(135deg,${v.accent},#f59e0b);color:#0a0e1a}
.av-bd{background:rgba(248,113,113,.15);color:${v.danger};border:1px solid rgba(248,113,113,.2)}
.av-bg{background:rgba(255,255,255,.04);color:${v.textSec};border:1px solid rgba(255,255,255,.08)}
.av-bl{width:100%;margin-top:10px}
.av-w{display:flex;align-items:center;justify-content:center;gap:10px;padding:14px;color:${v.textMuted};font-size:.85rem;font-weight:600}
.av-sp{width:18px;height:18px;border:2px solid rgba(255,255,255,.08);border-top-color:${v.accent};border-radius:50%;animation:avSpin .8s linear infinite}
@keyframes avSpin{to{transform:rotate(360deg)}}@keyframes avSU{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
.av-nl{font-size:1.05rem;color:${v.text};font-style:italic;min-height:50px;line-height:1.5;transition:opacity .3s}
`;
    container.appendChild(sty);
    const W = document.createElement("div");
    W.className = "av";
    container.appendChild(W);

    function esc(s) {
      const d = document.createElement("div");
      d.textContent = s;
      return d.innerHTML;
    }
    function shuf(a) {
      const b = [...a];
      for (let i = b.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [b[i], b[j]] = [b[j], b[i]];
      }
      return b;
    }
    function pN(id) {
      return players.find((p) => p.id === id)?.name || "???";
    }

    function assignRoles() {
      const c = gs.config;
      let gS = c.good,
        eS = c.evil;
      const ra = {};
      const sh = shuf([...players]);
      let i = 0;
      gs.enabledRoles
        .filter((r) => EVIL_SPECIALS.includes(r))
        .forEach((r) => {
          if (i < sh.length && eS > 0) {
            ra[sh[i].id] = r;
            i++;
            eS--;
          }
        });
      while (eS > 0 && i < sh.length) {
        ra[sh[i].id] = "minionOfMordred";
        i++;
        eS--;
      }
      gs.enabledRoles
        .filter((r) => GOOD_SPECIALS.includes(r))
        .forEach((r) => {
          if (i < sh.length && gS > 0) {
            ra[sh[i].id] = r;
            i++;
            gS--;
          }
        });
      while (gS > 0 && i < sh.length) {
        ra[sh[i].id] = "loyalServant";
        i++;
        gS--;
      }
      gs.roles = ra;
      buildRI();
    }
    function buildRI() {
      const info = {};
      const eIds = Object.entries(gs.roles)
        .filter(([, r]) => ROLES[r].team === "evil")
        .map(([id]) => id);
      const merlId = Object.entries(gs.roles).find(
        ([, r]) => r === "merlin",
      )?.[0];
      const morgId = Object.entries(gs.roles).find(
        ([, r]) => r === "morgana",
      )?.[0];
      const mordId = Object.entries(gs.roles).find(
        ([, r]) => r === "mordred",
      )?.[0];
      const oberonId = Object.entries(gs.roles).find(
        ([, r]) => r === "oberon",
      )?.[0];
      players.forEach((p) => {
        const rid = gs.roles[p.id];
        const role = ROLES[rid];
        const sees = [];
        if (role.team === "evil" && rid !== "oberon")
          eIds.forEach((eid) => {
            if (eid !== p.id && eid !== oberonId)
              sees.push({ name: pN(eid), label: "Evil", color: "#f87171" });
          });
        if (rid === "merlin")
          eIds.forEach((eid) => {
            if (eid !== mordId)
              sees.push({ name: pN(eid), label: "Evil", color: "#f87171" });
          });
        if (rid === "percival") {
          const t = [];
          if (merlId) t.push(pN(merlId));
          if (morgId) t.push(pN(morgId));
          shuf(t).forEach((nm) =>
            sees.push({ name: nm, label: "Merlin?", color: "#a78bfa" }),
          );
        }
        info[p.id] = { roleId: rid, role, sees };
      });
      gs.roleInfo = info;
    }

    function tkHTML() {
      const c = gs.config;
      let h = '<div class="av-tk">';
      for (let i = 0; i < 5; i++) {
        const r = gs.questResults[i];
        const cl =
          r === "pass"
            ? "pass"
            : r === "fail"
              ? "fail"
              : i === gs.questNum
                ? "cur"
                : "";
        h += `<div class="av-qp ${cl}"><div class="av-qn">${r === "pass" ? "\u2713" : r === "fail" ? "\u2717" : i + 1}</div><div class="av-qs">${c.quests[i]}p</div>${c.twoFails.includes(i) ? '<div class="av-2f">2 fails</div>' : ""}</div>`;
      }
      h += '</div><div class="av-rej">Rejects: ';
      for (let i = 0; i < 5; i++)
        h += `<div class="av-rjp ${i < gs.rejectStreak ? "on" : ""}"></div>`;
      return h + "</div>";
    }

    // ══════════ DISCUSSION GATE ══════════
    function renderDisc({ icon, title, sub, prompt, ctx, tracker, onNext }) {
      let html = `<div class="av-s av-disc" style="animation:avSU .4s ease both">`;
      html += `<div class="av-disc-i">${icon || "\u{1F4AC}"}</div><h3>${title || "Discuss"}</h3>`;
      if (sub)
        html += `<p style="color:${v.textSec};font-size:.85rem;margin-top:4px">${sub}</p>`;
      html += `<div class="av-disc-pr">"${esc(prompt || "")}"</div>`;
      if (tracker) html += tkHTML();
      if (ctx) html += `<div class="av-disc-ctx">${ctx}</div>`;
      if (isHost || isLocal)
        html += `<button class="av-b av-ba av-bl" id="av-dgo">Everyone Ready \u2014 Continue</button>`;
      else
        html += `<div class="av-w"><div class="av-sp"></div>Discussing... host will continue</div>`;
      html += `</div>`;
      W.innerHTML = html;
      api.speak(prompt || title);
      W.querySelector("#av-dgo")?.addEventListener("click", () => {
        api.stopSpeaking();
        api.send("av-disc-done", {});
        onNext();
      });
    }

    // ══════════ SETUP ══════════
    function renderSetup() {
      gs.config = QUEST_CONFIG[players.length] || QUEST_CONFIG[5];
      const c = gs.config;
      W.innerHTML = `<div class="av-s" style="animation:avSU .4s ease both">
        <h2>\u{1F3F0} Avalon</h2><p class="av-sub">${players.length} Players</p>
        <div class="av-comp"><div class="av-ci av-good"><div class="av-cn">${c.good}</div><div class="av-cl">Good</div></div>
        <div class="av-ci" style="color:${v.textMuted}"><div class="av-cn">vs</div></div>
        <div class="av-ci av-evil"><div class="av-cn">${c.evil}</div><div class="av-cl">Evil</div></div></div>
        <div class="av-note">Merlin + Assassin are auto-paired. Toggle roles below.</div>
        <div class="av-rg" id="av-roles"></div>
        ${isLocal ? `<div style="display:flex;gap:8px;margin-bottom:14px"><input type="text" id="av-ai" placeholder="Add player" maxlength="20" style="flex:1;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.1);padding:10px 14px;border-radius:10px;color:${v.text};font-family:${v.fontBody}"><button class="av-b av-ba" id="av-ab" style="padding:10px 18px">+</button></div>` : ""}
        <button class="av-go" id="av-begin" ${!isHost ? "disabled" : ""}>${isHost ? "Begin Game" : "Waiting for host..."}</button>
      </div>`;
      const rg = W.querySelector("#av-roles");
      OPTIONAL_ROLES.forEach((rId) => {
        const role = ROLES[rId];
        const isG = role.team === "good";
        const col = isG ? "#60a5fa" : "#f87171";
        const el = document.createElement("div");
        el.className = `av-rt ${gs.enabledRoles.includes(rId) ? "on" : ""}`;
        el.style.setProperty("--rc", col);
        el.style.setProperty("--rb", col + "15");
        el.innerHTML = `<span class="av-ri">${role.icon}</span><div class="av-rf"><div class="av-rn">${role.name} <span class="av-rtm" style="color:${col}">${role.team}</span></div><div class="av-rd">${role.desc}</div></div><div class="av-ck">${gs.enabledRoles.includes(rId) ? "\u2713" : ""}</div>`;
        if (isHost)
          el.addEventListener("click", () => {
            const on = gs.enabledRoles.includes(rId);
            if (on) {
              gs.enabledRoles = gs.enabledRoles.filter((r) => r !== rId);
              if (rId === "merlin")
                gs.enabledRoles = gs.enabledRoles.filter(
                  (r) => r !== "assassin" && r !== "percival",
                );
              if (rId === "assassin")
                gs.enabledRoles = gs.enabledRoles.filter(
                  (r) => r !== "merlin" && r !== "percival",
                );
            } else {
              const cG = gs.enabledRoles.filter((r) =>
                GOOD_SPECIALS.includes(r),
              ).length;
              const cE = gs.enabledRoles.filter((r) =>
                EVIL_SPECIALS.includes(r),
              ).length;
              if (isG && cG >= c.good) return;
              if (!isG && cE >= c.evil) return;
              gs.enabledRoles.push(rId);
              if (
                rId === "merlin" &&
                !gs.enabledRoles.includes("assassin") &&
                cE < c.evil
              )
                gs.enabledRoles.push("assassin");
              if (
                rId === "assassin" &&
                !gs.enabledRoles.includes("merlin") &&
                cG < c.good
              )
                gs.enabledRoles.push("merlin");
              if (rId === "percival" && !gs.enabledRoles.includes("merlin")) {
                if (!gs.enabledRoles.includes("merlin"))
                  gs.enabledRoles.push("merlin");
                const cE2 = gs.enabledRoles.filter((r) =>
                  EVIL_SPECIALS.includes(r),
                ).length;
                if (cE2 < c.evil && !gs.enabledRoles.includes("assassin"))
                  gs.enabledRoles.push("assassin");
              }
            }
            renderSetup();
          });
        rg.appendChild(el);
      });
      if (isLocal) {
        const ab = W.querySelector("#av-ab"),
          ai = W.querySelector("#av-ai");
        const add = () => {
          const nm = ai.value.trim();
          if (nm) {
            api.addLocalPlayer(nm);
            ai.value = "";
          }
        };
        ab?.addEventListener("click", add);
        ai?.addEventListener("keydown", (e) => {
          if (e.key === "Enter") add();
        });
      }
      W.querySelector("#av-begin")?.addEventListener("click", () => {
        if (players.length < 5) {
          alert("Need at least 5 players.");
          return;
        }
        assignRoles();
        gs.leader = Math.floor(Math.random() * players.length);
        gs.questNum = 0;
        gs.questResults = [null, null, null, null, null];
        gs.rejectStreak = 0;
        gs.goodWins = 0;
        gs.evilWins = 0;
        api.send("av-start", {
          roles: gs.roles,
          leader: gs.leader,
          enabledRoles: gs.enabledRoles,
        });
        if (!isLocal)
          players.forEach((p) => {
            if (p.id !== me.id)
              api.sendTo(p.id, "av-your-role", { roleInfo: gs.roleInfo[p.id] });
          });
        gs.phase = "night";
        renderNight();
      });
    }

    // ══════════ NIGHT PHASE ══════════
    function renderNight() {
      if (isLocal) {
        renderLocalReveal();
        return;
      }
      const myI = gs.roleInfo[me.id];
      if (!myI) {
        renderPostNight();
        return;
      }
      showRole(myI, () => {
        if (isHost) runNarr(() => renderPostNight());
      });
    }

    function showRole(info, onOk) {
      const role = info.role;
      const isG = role.team === "good";
      const col = isG ? "#60a5fa" : "#f87171";
      const glow = isG ? "rgba(96,165,250,.2)" : "rgba(248,113,113,.2)";
      vib(HP.open);
      W.innerHTML = `<div class="av-s"><div class="av-ph"><h3>Your Secret Role</h3><p>Memorize this. Tell no one.</p></div>
        <div class="av-rc" style="--cc:${col};--cg:${glow}"><div class="av-rci">${role.icon}</div><div class="av-rcr" style="color:${col}">${role.name}</div>
        <div class="av-rct" style="color:${col}">${isG ? "\u269C\uFE0F Loyal to Arthur" : "\u{1F480} Servant of Evil"}</div>
        <div class="av-rcd">${role.desc}</div>
        ${info.sees.length > 0 ? `<div class="av-kn"><h4>\u{1F52E} Your Knowledge</h4>${info.sees.map((s) => `<div class="av-ki"><div class="av-kd" style="background:${s.color}"></div>${esc(s.name)} <span style="color:${v.textMuted};font-size:.75rem;margin-left:4px">(${s.label})</span></div>`).join("")}</div>` : ""}</div>
        ${onOk ? `<button class="av-b av-bp av-bl" id="av-rok">${isHost ? "I've Memorized \u2014 Start Night Phase" : "I've Memorized It"}</button>` : ""}
        ${!isHost ? '<div class="av-w"><div class="av-sp"></div>Waiting for host night phase...</div>' : ""}
      </div>`;
      W.querySelector("#av-rok")?.addEventListener("click", () => {
        if (onOk) onOk();
      });
    }

    function runNarr(cb) {
      const eIds = Object.entries(gs.roles)
        .filter(([, r]) => ROLES[r].team === "evil")
        .map(([id]) => id);
      const obId = Object.entries(gs.roles).find(
        ([, r]) => r === "oberon",
      )?.[0];
      const merlId = Object.entries(gs.roles).find(
        ([, r]) => r === "merlin",
      )?.[0];
      const percId = Object.entries(gs.roles).find(
        ([, r]) => r === "percival",
      )?.[0];
      const eNonOb = eIds.filter((id) => id !== obId);
      const steps = [];
      steps.push({
        t: "Everyone, close your eyes and extend your fist forward.",
        h: null,
        w: 3500,
      });
      if (eNonOb.length > 0) {
        steps.push({
          t: "Minions of Mordred \u2014 not Oberon \u2014 open your eyes and look around, so you know your allies.",
          h: eNonOb,
          w: 6000,
        });
        steps.push({
          t: "Minions of Mordred, close your eyes and lower your fists.",
          h: null,
          hc: eNonOb,
          w: 3500,
        });
      }
      if (merlId) {
        steps.push({ t: "Merlin, open your eyes.", h: [merlId], w: 2500 });
        steps.push({
          t: "Minions of Mordred \u2014 not Mordred himself \u2014 raise your thumb so Merlin may know you.",
          h: null,
          w: 6000,
        });
        steps.push({
          t: "Merlin, close your eyes. Minions, lower your thumbs.",
          h: null,
          hc: [merlId],
          w: 3500,
        });
      }
      if (percId) {
        steps.push({ t: "Percival, open your eyes.", h: [percId], w: 2500 });
        steps.push({
          t: "Merlin and Morgana, raise your thumb so Percival may see you.",
          h: null,
          w: 6000,
        });
        steps.push({
          t: "Percival, close your eyes. Merlin and Morgana, lower your thumbs.",
          h: null,
          hc: [percId],
          w: 3500,
        });
      }
      steps.push({
        t: "Everyone, open your eyes. The quest for the Holy Grail begins.",
        h: null,
        w: 3000,
      });

      W.innerHTML = `<div class="av-s" style="text-align:center;padding-top:30px">
        <div style="font-size:3.5rem;margin-bottom:16px">\u{1F319}</div>
        <h3 style="font-family:${v.fontDisplay};font-size:1.3rem;margin-bottom:8px">Night Phase</h3>
        <p style="color:${v.textSec};margin-bottom:20px">Close your eyes and listen carefully...</p>
        <div class="av-nl" id="av-nl"></div>
        <div class="av-w" style="margin-top:20px"><div class="av-sp"></div>Narrating...</div>
      </div>`;
      const nlEl = W.querySelector("#av-nl");
      let i = 0;
      function next() {
        if (i >= steps.length) {
          cb();
          return;
        }
        const s = steps[i];
        i++;
        if (nlEl) {
          nlEl.style.opacity = "1";
          nlEl.textContent = s.t;
        }
        api.speak(s.t);
        // Haptic: vibrate targeted phones
        if (s.h && !isLocal)
          s.h.forEach((pid) =>
            api.sendTo(pid, "av-haptic", { pattern: HP.open }),
          );
        if (s.hc && !isLocal)
          s.hc.forEach((pid) =>
            api.sendTo(pid, "av-haptic", { pattern: HP.close }),
          );
        if (isLocal && s.h) vib(HP.open);
        setTimeout(next, s.w || 3000);
      }
      next();
    }

    function renderLocalReveal() {
      if (gs.lri >= players.length) {
        runNarr(() => renderPostNight());
        return;
      }
      const p = players[gs.lri];
      const info = gs.roleInfo[p.id];
      if (!gs.lrv) {
        W.innerHTML = `<div class="av-s"><div class="av-cv" id="av-tap"><div class="av-cvi">\u{1F512}</div><div class="av-cvn">${esc(p.name)}</div><div class="av-cvm">Tap to see your secret role<br><small style="color:${v.textMuted}">Make sure only you can see</small></div></div></div>`;
        api.speak(`Pass the device to ${p.name}. Tap when ready.`);
        W.querySelector("#av-tap").addEventListener("click", () => {
          gs.lrv = true;
          vib(HP.open);
          renderLocalReveal();
        });
      } else {
        const role = info.role;
        const isG = role.team === "good";
        const col = isG ? "#60a5fa" : "#f87171";
        const glow = isG ? "rgba(96,165,250,.2)" : "rgba(248,113,113,.2)";
        W.innerHTML = `<div class="av-s">
          <div class="av-rc" style="--cc:${col};--cg:${glow}"><div class="av-rci">${role.icon}</div><div class="av-rcr" style="color:${col}">${role.name}</div>
          <div class="av-rct" style="color:${col}">${isG ? "\u269C\uFE0F Loyal to Arthur" : "\u{1F480} Servant of Evil"}</div><div class="av-rcd">${role.desc}</div>
          ${info.sees.length > 0 ? `<div class="av-kn"><h4>\u{1F52E} Your Knowledge</h4>${info.sees.map((s) => `<div class="av-ki"><div class="av-kd" style="background:${s.color}"></div>${esc(s.name)} <span style="color:${v.textMuted};font-size:.75rem;margin-left:4px">(${s.label})</span></div>`).join("")}</div>` : ""}</div>
          <button class="av-b av-bp av-bl" id="av-nxt">I've Memorized \u2014 Pass Device</button></div>`;
        W.querySelector("#av-nxt").addEventListener("click", () => {
          gs.lri++;
          gs.lrv = false;
          renderLocalReveal();
        });
      }
    }

    // ══════════ POST-NIGHT DISCUSSION ══════════
    function renderPostNight() {
      renderDisc({
        icon: "\u2600\uFE0F",
        title: "Dawn Breaks \u2014 Discuss!",
        sub: "Roles assigned. Open your eyes. Look around.",
        prompt: rndPrompt("postNight"),
        tracker: true,
        onNext: () => {
          gs.phase = "team-build";
          api.send("av-phase", { phase: "team-build" });
          renderTeamBuild();
        },
      });
    }

    // ══════════ TEAM BUILD ══════════
    function renderTeamBuild() {
      gs.phase = "team-build";
      gs.proposedTeam = [];
      const ldr = players[gs.leader % players.length];
      const sz = gs.config.quests[gs.questNum];
      W.innerHTML = `<div class="av-s">${tkHTML()}<div class="av-ph"><h3>Quest ${gs.questNum + 1}: Build a Team</h3>
        <p>\u{1F451} <strong style="color:${v.accent}">${esc(ldr.name)}</strong> picks ${sz} players</p></div>
        <div class="av-tg" id="av-tg"></div>
        ${isHost || isLocal ? `<button class="av-b av-bp av-bl" id="av-prop" disabled>Propose Team (0/${sz})</button>` : `<div class="av-w"><div class="av-sp"></div>${esc(ldr.name)} is selecting...</div>`}</div>`;
      api.speak(
        `Quest ${gs.questNum + 1}. ${ldr.name} is the leader. Pick a team of ${sz}.`,
      );
      vib(HP.turn);
      const gr = W.querySelector("#av-tg");
      players.forEach((p) => {
        const el = document.createElement("div");
        el.className = "av-tp";
        el.innerHTML = `<div class="av-td"></div>${esc(p.name)}${p.id === ldr.id ? '<span class="av-lb">\u{1F451} Leader</span>' : ""}`;
        if (isHost || isLocal)
          el.addEventListener("click", () => {
            const i = gs.proposedTeam.indexOf(p.id);
            if (i >= 0) {
              gs.proposedTeam.splice(i, 1);
              el.classList.remove("sel");
            } else if (gs.proposedTeam.length < sz) {
              gs.proposedTeam.push(p.id);
              el.classList.add("sel");
            }
            const b = W.querySelector("#av-prop");
            if (b) {
              b.disabled = gs.proposedTeam.length !== sz;
              b.textContent = `Propose Team (${gs.proposedTeam.length}/${sz})`;
            }
          });
        gr.appendChild(el);
      });
      W.querySelector("#av-prop")?.addEventListener("click", () => {
        if (gs.proposedTeam.length !== sz) return;
        api.send("av-team", { team: gs.proposedTeam, leader: gs.leader });
        renderPreVoteDisc();
      });
    }

    function renderPreVoteDisc() {
      const ldr = players[gs.leader % players.length];
      const names = gs.proposedTeam.map((id) => pN(id)).join(", ");
      renderDisc({
        icon: "\u{1F5E3}\uFE0F",
        title: "Team Proposed \u2014 Discuss!",
        sub: `${ldr.name}'s team. Debate before you vote.`,
        prompt: rndPrompt("postProposal"),
        ctx: `<strong>Team:</strong> ${names}<br><strong>Quest ${gs.questNum + 1}</strong> needs ${gs.config.quests[gs.questNum]} players.${gs.config.twoFails.includes(gs.questNum) ? ' <strong style="color:#f87171">Needs 2 fails to fail.</strong>' : ""}`,
        tracker: true,
        onNext: () => {
          api.send("av-phase", { phase: "vote" });
          renderVote();
        },
      });
    }

    // ══════════ VOTE ══════════
    function renderVote() {
      gs.phase = "team-vote";
      gs.votes = {};
      const names = gs.proposedTeam.map((id) => pN(id)).join(", ");
      if (isLocal) {
        renderLV(0);
        return;
      }
      W.innerHTML = `<div class="av-s">${tkHTML()}<div class="av-ph"><h3>Vote: Approve or Reject?</h3><p>Team: <strong>${names}</strong></p></div>
        <div class="av-vb"><button class="av-vt av-va" id="av-ya">\u{1F44D} Approve</button><button class="av-vt av-vr" id="av-no">\u{1F44E} Reject</button></div>
        <div class="av-w" id="av-vw" style="display:none"><div class="av-sp"></div>Waiting for all votes...</div></div>`;
      api.speak("Vote now. Approve or reject?");
      vib(HP.vote);
      function doVote(v2) {
        gs.votes[me.id] = v2;
        api.send("av-vote", { playerId: me.id, approve: v2 });
        W.querySelector("#av-ya").disabled = true;
        W.querySelector("#av-no").disabled = true;
        if (v2) W.querySelector("#av-ya").classList.add("on");
        else W.querySelector("#av-no").classList.add("on");
        W.querySelector("#av-vw").style.display = "flex";
      }
      W.querySelector("#av-ya")?.addEventListener("click", () => doVote(true));
      W.querySelector("#av-no")?.addEventListener("click", () => doVote(false));
    }

    function renderLV(idx) {
      if (idx >= players.length) {
        resolveVote();
        return;
      }
      const p = players[idx];
      const names = gs.proposedTeam.map((id) => pN(id)).join(", ");
      W.innerHTML = `<div class="av-s">${tkHTML()}<div class="av-cv" id="av-vc"><div class="av-cvi">\u{1F5F3}\uFE0F</div><div class="av-cvn">${esc(p.name)}</div><div class="av-cvm">Tap to vote<br><small style="color:${v.textMuted}">Team: ${names}</small></div></div></div>`;
      W.querySelector("#av-vc").addEventListener("click", () => {
        vib(HP.vote);
        W.innerHTML = `<div class="av-s">${tkHTML()}<div class="av-ph"><h3>${esc(p.name)}'s Vote</h3></div><div class="av-vb"><button class="av-vt av-va" id="av-ly">\u{1F44D}</button><button class="av-vt av-vr" id="av-ln">\u{1F44E}</button></div></div>`;
        W.querySelector("#av-ly").addEventListener("click", () => {
          gs.votes[p.id] = true;
          renderLV(idx + 1);
        });
        W.querySelector("#av-ln").addEventListener("click", () => {
          gs.votes[p.id] = false;
          renderLV(idx + 1);
        });
      });
    }

    function resolveVote() {
      const ap = Object.values(gs.votes).filter((x) => x).length;
      const rj = Object.values(gs.votes).filter((x) => !x).length;
      const ok = ap > rj;
      vib(ok ? HP.pass : HP.fail);
      const vd = players
        .map(
          (p) =>
            `<span class="av-vc ${gs.votes[p.id] ? "ap" : "rj"}">${esc(p.name)}: ${gs.votes[p.id] ? "\u{1F44D}" : "\u{1F44E}"}</span>`,
        )
        .join(" ");
      W.innerHTML = `<div class="av-s">${tkHTML()}<div class="av-ph"><h3 style="color:${ok ? "#60a5fa" : "#f87171"}">${ok ? "\u2713 Approved!" : "\u2717 Rejected!"}</h3><p>Approve: ${ap} \u2014 Reject: ${rj}</p></div><div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:12px 0">${vd}</div></div>`;
      api.speak(
        ok
          ? `Team approved, ${ap} to ${rj}.`
          : `Team rejected, ${rj} to ${ap}.`,
      );
      setTimeout(() => {
        if (ok) {
          renderDisc({
            icon: "\u2694\uFE0F",
            title: "Approved! Last words?",
            prompt: rndPrompt("postVoteApprove"),
            ctx: vd,
            tracker: true,
            onNext: () => {
              api.send("av-phase", { phase: "quest" });
              renderQuest();
            },
          });
        } else {
          gs.rejectStreak++;
          if (gs.rejectStreak >= 5) {
            gs.evilWins = 3;
            api.send("av-gameover", {
              winner: "evil",
              reason: "5 rejected teams",
            });
            renderGO(
              "evil",
              "Five teams rejected \u2014 Evil wins by default!",
            );
          } else
            renderDisc({
              icon: "\u274C",
              title: "Rejected!",
              sub: `Streak: ${gs.rejectStreak}/5`,
              prompt: rndPrompt("postVoteReject"),
              tracker: true,
              onNext: () => {
                gs.leader = (gs.leader + 1) % players.length;
                api.send("av-phase", {
                  phase: "team-build",
                  leader: gs.leader,
                  rejectStreak: gs.rejectStreak,
                });
                renderTeamBuild();
              },
            });
        }
      }, 2500);
    }

    // ══════════ QUEST ══════════
    function renderQuest() {
      gs.phase = "quest";
      gs.questChoices = {};
      if (isLocal) {
        renderLQ(0);
        return;
      }
      const onT = gs.proposedTeam.includes(me.id);
      if (onT) {
        const rid = gs.roles[me.id];
        const isE = ROLES[rid]?.team === "evil";
        vib(HP.turn);
        W.innerHTML = `<div class="av-s">${tkHTML()}<div class="av-ph"><h3>Quest ${gs.questNum + 1}</h3><p>You're on this quest.</p></div>
          <div class="av-qb"><button class="av-qt av-qts" id="av-qs">\u269C\uFE0F Success</button>${isE ? '<button class="av-qt av-qtf" id="av-qf">\u{1F480} Fail</button>' : ""}</div>
          ${!isE ? '<div style="text-align:center;color:' + v.textMuted + ';font-size:.8rem">You must play Success.</div>' : ""}</div>`;
        api.speak("Make your quest choice.");
        function sq(s) {
          gs.questChoices[me.id] = s;
          api.send("av-qchoice", { playerId: me.id, success: s });
          W.innerHTML = `<div class="av-s">${tkHTML()}<div class="av-w"><div class="av-sp"></div>Waiting for results...</div></div>`;
        }
        W.querySelector("#av-qs")?.addEventListener("click", () => sq(true));
        W.querySelector("#av-qf")?.addEventListener("click", () => sq(false));
      } else {
        W.innerHTML = `<div class="av-s">${tkHTML()}<div class="av-ph"><h3>Quest ${gs.questNum + 1}</h3></div><div class="av-w"><div class="av-sp"></div>Team is questing...</div></div>`;
        api.speak(`Quest ${gs.questNum + 1} underway.`);
      }
    }

    function renderLQ(idx) {
      const tm = gs.proposedTeam;
      if (idx >= tm.length) {
        resolveQuest();
        return;
      }
      const pid = tm[idx];
      const nm = pN(pid);
      const rid = gs.roles[pid];
      const isE = ROLES[rid]?.team === "evil";
      W.innerHTML = `<div class="av-s">${tkHTML()}<div class="av-cv" id="av-qc"><div class="av-cvi">\u2694\uFE0F</div><div class="av-cvn">${esc(nm)}</div><div class="av-cvm">Tap for quest choice</div></div></div>`;
      W.querySelector("#av-qc").addEventListener("click", () => {
        vib(HP.turn);
        W.innerHTML = `<div class="av-s">${tkHTML()}<div class="av-ph"><h3>${esc(nm)}'s Choice</h3></div><div class="av-qb"><button class="av-qt av-qts" id="av-lqs">\u269C\uFE0F Success</button>${isE ? '<button class="av-qt av-qtf" id="av-lqf">\u{1F480} Fail</button>' : ""}</div>${!isE ? '<div style="text-align:center;color:' + v.textMuted + ';font-size:.8rem">Must play Success.</div>' : ""}</div>`;
        W.querySelector("#av-lqs")?.addEventListener("click", () => {
          gs.questChoices[pid] = true;
          renderLQ(idx + 1);
        });
        W.querySelector("#av-lqf")?.addEventListener("click", () => {
          gs.questChoices[pid] = false;
          renderLQ(idx + 1);
        });
      });
    }

    function resolveQuest() {
      const ch = Object.values(gs.questChoices);
      const fails = ch.filter((c) => !c).length;
      const n2 = gs.config.twoFails.includes(gs.questNum);
      const failed = n2 ? fails >= 2 : fails >= 1;
      gs.questResults[gs.questNum] = failed ? "fail" : "pass";
      if (failed) gs.evilWins++;
      else gs.goodWins++;
      vib(failed ? HP.fail : HP.pass);
      const toks = shuf(ch.map((c) => (c ? "success" : "fail")));
      W.innerHTML = `<div class="av-s">${tkHTML()}<div class="av-ph"><h3 style="color:${failed ? "#f87171" : "#60a5fa"}">${failed ? "\u{1F480} Quest Failed!" : "\u269C\uFE0F Quest Passed!"}</h3><p>${fails} fail${fails !== 1 ? "s" : ""} ${n2 ? "(needed 2)" : ""}</p></div>
        <div class="av-tok">${toks.map((t, i) => `<div class="av-to av-to${t === "success" ? "s" : "f"}" style="animation-delay:${i * 0.2}s">${t === "success" ? "\u269C\uFE0F" : "\u{1F480}"}</div>`).join("")}</div></div>`;
      api.speak(
        failed
          ? `Quest ${gs.questNum + 1} failed! ${fails} fail card${fails !== 1 ? "s" : ""}.`
          : `Quest ${gs.questNum + 1} succeeded!`,
      );
      api.send("av-qresult", {
        questNum: gs.questNum,
        result: failed ? "fail" : "pass",
        fails,
        questResults: gs.questResults,
        goodWins: gs.goodWins,
        evilWins: gs.evilWins,
      });
      const teamN = gs.proposedTeam.map((id) => pN(id)).join(", ");
      setTimeout(() => {
        renderDisc({
          icon: failed ? "\u{1F480}" : "\u269C\uFE0F",
          title: failed ? "Quest Failed \u2014 Who?" : "Quest Passed",
          sub: `Good ${gs.goodWins} \u2014 Evil ${gs.evilWins}`,
          prompt: rndPrompt(failed ? "postQuestFail" : "postQuestPass"),
          ctx: `<strong>Team:</strong> ${teamN}<br><strong>Fails:</strong> ${fails}`,
          tracker: true,
          onNext: () => {
            if (gs.goodWins >= 3) {
              if (
                gs.enabledRoles.includes("merlin") &&
                gs.enabledRoles.includes("assassin")
              )
                renderPreKillDisc();
              else {
                api.send("av-gameover", {
                  winner: "good",
                  reason: "3 quests passed",
                });
                renderGO("good", "Three quests passed \u2014 Good wins!");
              }
            } else if (gs.evilWins >= 3) {
              api.send("av-gameover", {
                winner: "evil",
                reason: "3 quests failed",
              });
              renderGO("evil", "Three quests failed \u2014 Evil wins!");
            } else {
              gs.questNum++;
              gs.leader = (gs.leader + 1) % players.length;
              gs.rejectStreak = 0;
              api.send("av-phase", {
                phase: "team-build",
                leader: gs.leader,
                questNum: gs.questNum,
                rejectStreak: 0,
              });
              renderTeamBuild();
            }
          },
        });
      }, 3000);
    }

    // ══════════ ASSASSINATION ══════════
    function renderPreKillDisc() {
      renderDisc({
        icon: "\u{1F5E1}\uFE0F",
        title: "The Assassin Awakens",
        sub: "Good won 3 quests \u2014 but evil gets one last chance.",
        prompt: rndPrompt("preAssassination"),
        ctx: "<strong>Assassin must identify Merlin.</strong> Correct guess = evil steals the victory.<br>Evil team: discuss now who you think Merlin is.",
        tracker: true,
        onNext: () => renderKill(),
      });
    }

    function renderKill() {
      gs.phase = "assassinate";
      const merlId = Object.entries(gs.roles).find(
        ([, r]) => r === "merlin",
      )?.[0];
      const goodP = players.filter(
        (p) => ROLES[gs.roles[p.id]]?.team === "good",
      );
      vib(HP.kill);
      api.speak("Assassin, choose your target. Who is Merlin?");
      W.innerHTML = `<div class="av-s">${tkHTML()}<div class="av-ph"><h3 style="color:#f87171">\u{1F5E1}\uFE0F Assassination</h3><p>Choose from the good players.</p></div><div class="av-ag" id="av-ag"></div><button class="av-b av-bd av-bl" id="av-kill" disabled>\u{1F5E1}\uFE0F Assassinate</button></div>`;
      const gr = W.querySelector("#av-ag");
      goodP.forEach((p) => {
        const el = document.createElement("div");
        el.className = "av-at";
        el.textContent = p.name;
        el.addEventListener("click", () => {
          gs.assassinTarget = p.id;
          gr.querySelectorAll(".av-at").forEach((e) =>
            e.classList.remove("sel"),
          );
          el.classList.add("sel");
          W.querySelector("#av-kill").disabled = false;
        });
        gr.appendChild(el);
      });
      W.querySelector("#av-kill")?.addEventListener("click", () => {
        const k = gs.assassinTarget === merlId;
        vib(HP.kill);
        api.send("av-assassin", {
          target: gs.assassinTarget,
          merlin: merlId,
          killed: k,
        });
        renderGO(
          k ? "evil" : "good",
          k
            ? `Assassin found Merlin (${pN(merlId)})! Evil steals it!`
            : `Assassin chose ${pN(gs.assassinTarget)} \u2014 wrong! Merlin was ${pN(merlId)}. Good wins!`,
        );
      });
    }

    // ══════════ GAME OVER ══════════
    function renderGO(winner, reason) {
      gs.phase = "game-over";
      const isG = winner === "good";
      vib(HP.end);
      api.speak(reason);
      W.innerHTML = `<div class="av-s av-gos" style="animation:avSU .5s ease both">
        <div style="font-size:4rem">${isG ? "\u269C\uFE0F" : "\u{1F480}"}</div>
        <h2 style="color:${isG ? "#60a5fa" : "#f87171"}">${isG ? "Good Wins!" : "Evil Wins!"}</h2>
        <p style="color:${v.textSec};margin-bottom:20px">${esc(reason)}</p>${tkHTML()}
        <div style="text-align:left"><div style="font-weight:700;margin:14px 0 8px;font-size:.85rem;color:${v.textMuted};text-transform:uppercase;letter-spacing:1px">Role Reveal</div>
        <div class="av-rr">${players
          .map((p, i) => {
            const rid = gs.roles[p.id];
            const role = ROLES[rid];
            return `<div class="av-row" style="animation-delay:${i * 0.08}s"><div class="av-rowi">${role.icon}</div><div class="av-rown">${esc(p.name)}</div><div class="av-rowr" style="color:${role.team === "good" ? "#60a5fa" : "#f87171"}">${role.name}</div></div>`;
          })
          .join("")}</div></div>
        <button class="av-b av-ba av-bl" id="av-again" style="margin-top:16px">Play Again</button>
        <button class="av-b av-bg av-bl" id="av-exit">Back to Lobby</button></div>`;
      W.querySelector("#av-again")?.addEventListener("click", () => {
        gs.phase = "setup";
        renderSetup();
      });
      W.querySelector("#av-exit")?.addEventListener("click", () =>
        api.endGame(),
      );
    }

    // ══════════ NETWORK ══════════
    api.on("av-start", (d) => {
      const p = d.payload || d;
      gs.roles = p.roles;
      gs.leader = p.leader;
      gs.enabledRoles = p.enabledRoles;
      gs.config = QUEST_CONFIG[n] || QUEST_CONFIG[5];
      gs.questNum = 0;
      gs.questResults = [null, null, null, null, null];
      gs.rejectStreak = 0;
      gs.goodWins = 0;
      gs.evilWins = 0;
      buildRI();
      gs.phase = "night";
      renderNight();
    });
    api.on("av-your-role", (d) => {
      const p = d.payload || d;
      if (p.roleInfo) {
        gs.roleInfo[me.id] = p.roleInfo;
        if (gs.phase === "night") renderNight();
      }
    });
    api.on("av-haptic", (d) => {
      const p = d.payload || d;
      vib(p.pattern || HP.open);
    });
    api.on("av-disc-done", () => {});
    api.on("av-phase", (d) => {
      const p = d.payload || d;
      if (p.leader !== undefined) gs.leader = p.leader;
      if (p.questNum !== undefined) gs.questNum = p.questNum;
      if (p.rejectStreak !== undefined) gs.rejectStreak = p.rejectStreak;
      if (p.phase === "team-build") renderTeamBuild();
      if (p.phase === "vote") renderVote();
      if (p.phase === "quest") renderQuest();
    });
    api.on("av-team", (d) => {
      const p = d.payload || d;
      gs.proposedTeam = p.team;
      gs.leader = p.leader;
      renderPreVoteDisc();
    });
    api.on("av-vote", (d) => {
      const p = d.payload || d;
      gs.votes[p.playerId] = p.approve;
      if (isHost && Object.keys(gs.votes).length >= players.length) {
        api.send("av-votes", { votes: gs.votes });
        resolveVote();
      }
    });
    api.on("av-votes", (d) => {
      const p = d.payload || d;
      gs.votes = p.votes;
      resolveVote();
    });
    api.on("av-qchoice", (d) => {
      const p = d.payload || d;
      gs.questChoices[p.playerId] = p.success;
      if (
        isHost &&
        Object.keys(gs.questChoices).length >= gs.proposedTeam.length
      )
        resolveQuest();
    });
    api.on("av-qresult", (d) => {
      const p = d.payload || d;
      gs.questResults = p.questResults;
      gs.goodWins = p.goodWins;
      gs.evilWins = p.evilWins;
      gs.questNum = p.questNum;
    });
    api.on("av-assassin", (d) => {
      const p = d.payload || d;
      renderGO(
        p.killed ? "evil" : "good",
        p.killed
          ? `Assassin found Merlin (${pN(p.merlin)})! Evil wins!`
          : `Assassin chose ${pN(p.target)} \u2014 Merlin was ${pN(p.merlin)}. Good wins!`,
      );
    });
    api.on("av-gameover", (d) => {
      const p = d.payload || d;
      renderGO(p.winner, p.reason);
    });

    // ══════════ INIT ══════════
    if (isHost || isLocal) renderSetup();
    else
      W.innerHTML = `<div class="av-s" style="text-align:center;padding-top:60px"><div style="font-size:3.5rem;margin-bottom:16px">\u{1F3F0}</div><h3 style="font-family:${v.fontDisplay};font-size:1.3rem">Avalon</h3><p style="color:${v.textSec};margin-top:8px">Waiting for host...</p><div class="av-w" style="margin-top:20px"><div class="av-sp"></div></div></div>`;

    return {
      destroy() {
        api.stopSpeaking();
        container.innerHTML = "";
      },
    };
  },
};
