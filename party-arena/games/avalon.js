// ═══════════════════════════════════════════════
//  AVALON — The Resistance: Avalon
//  v3: Host as game master, in-app night ack, online only
// ═══════════════════════════════════════════════

const QC = {
  5: { g: 3, e: 2, q: [2, 3, 2, 3, 3], tf: [] },
  6: { g: 4, e: 2, q: [2, 3, 4, 3, 4], tf: [] },
  7: { g: 4, e: 3, q: [2, 3, 3, 4, 4], tf: [3] },
  8: { g: 5, e: 3, q: [3, 4, 4, 5, 5], tf: [3] },
  9: { g: 6, e: 3, q: [3, 4, 4, 5, 5], tf: [3] },
  10: { g: 6, e: 4, q: [3, 4, 4, 5, 5], tf: [3] },
};
const R = {
  loyalServant: {
    id: "loyalServant",
    name: "Loyal Servant",
    team: "good",
    icon: "🛡️",
    desc: "A faithful servant of Arthur. No special info.",
  },
  merlin: {
    id: "merlin",
    name: "Merlin",
    team: "good",
    icon: "🧙",
    desc: "You know who the evil players are (except Mordred).",
  },
  percival: {
    id: "percival",
    name: "Percival",
    team: "good",
    icon: "⚔️",
    desc: "You know who Merlin is (but Morgana looks the same).",
  },
  minionOfMordred: {
    id: "minionOfMordred",
    name: "Minion",
    team: "evil",
    icon: "👹",
    desc: "A servant of evil. You know your fellow minions.",
  },
  assassin: {
    id: "assassin",
    name: "Assassin",
    team: "evil",
    icon: "🗡️",
    desc: "If good wins 3 quests, identify Merlin to steal victory.",
  },
  morgana: {
    id: "morgana",
    name: "Morgana",
    team: "evil",
    icon: "🐍",
    desc: "You appear as Merlin to Percival. Sow confusion.",
  },
  mordred: {
    id: "mordred",
    name: "Mordred",
    team: "evil",
    icon: "👑",
    desc: "Hidden from Merlin. His magic cannot reveal you.",
  },
  oberon: {
    id: "oberon",
    name: "Oberon",
    team: "evil",
    icon: "👻",
    desc: "Evil but unknown to other evil — and they to you.",
  },
};
const GS = ["merlin", "percival"],
  ES = ["assassin", "morgana", "mordred", "oberon"],
  OPT = ["merlin", "assassin", "percival", "morgana", "mordred", "oberon"];
const DP = {
  postNight: [
    "Look around. Who seems nervous?",
    "First impressions — who do you trust?",
    "Anyone acting strange?",
  ],
  postProp: [
    "Why these players?",
    "Does this team make sense?",
    "Who would you have picked?",
  ],
  postReject: [
    "Why rejected?",
    "Who voted no?",
    "Careful — 5 rejects = evil wins.",
  ],
  postApprove: [
    "Team locked. Any suspicions?",
    "Watch the team's reactions.",
    "Good luck.",
  ],
  postPass: [
    "Succeeded, but trust everyone?",
    "Who's too quiet?",
    "Evil plays the long game.",
  ],
  postFail: [
    "Someone played fail. Who?",
    "Look at the team. Suspect who?",
    "Evil is here. Find them.",
  ],
  preKill: [
    "Who knew too much?",
    "Who guided votes too well?",
    "Last chance. Choose wisely.",
  ],
};
function rP(k) {
  const a = DP[k];
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
      v = api.cssVars,
      n = players.length;
    const cfg = QC[n] || QC[5];

    // Resume support: only restores into the clean, named phases
    // (team-build / vote / quest / kill / over) — see saveResumeState()
    // for why night-phase and mid-discussion-gate moments are deliberately
    // never snapshotted. If resumedGs is non-null, the host reconnected
    // while in one of those clean phases.
    const resumedGs = api.getResumeState();
    let gs = resumedGs
      ? {
          ...resumedGs,
          votedSet: new Set(resumedGs.votedSet || []),
          qcSet: new Set(resumedGs.qcSet || []),
          nightAcks: new Set(), // night phase is never resumed into; always start empty
        }
      : {
          phase: "setup",
          roles: {},
          roleInfo: {},
          leader: 0,
          qn: 0,
          qr: [],
          team: [],
          votes: {},
          qc: {},
          rej: 0,
          gw: 0,
          ew: 0,
          er: ["merlin", "assassin"],
          aTarget: null,
          nightAcks: new Set(),
        };

    // Only call this from the clean phase-entry points listed above —
    // NOT from inside night phase or while a disc() gate is showing.
    // Those have no reliable re-entry point (night's step index lives in a
    // closure, not on gs; disc()'s onNext is a callback, not data) — saving
    // mid-way through either would resume into a half-built state, which is
    // worse than not resuming at all. A host reconnecting during those
    // moments falls back to the last clean phase saved before it.
    function saveResumeState() {
      if (!isHost) return;
      api.setResumeState({
        ...gs,
        votedSet: [...(gs.votedSet || [])],
        qcSet: [...(gs.qcSet || [])],
        nightAcks: undefined, // never part of the snapshot — see above
      });
    }

    const sty = document.createElement("style");
    sty.textContent = `
.av{display:flex;flex-direction:column;align-items:center;height:100%;overflow-y:auto;font-family:${v.fontBody};padding:12px;padding-bottom:60px}
.av-s{width:100%;max-width:480px}
.av h2{font-family:${v.fontDisplay};font-size:1.3rem;text-align:center;margin:8px 0 6px}
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
.av-start{width:100%;padding:16px;border:none;border-radius:12px;background:linear-gradient(135deg,#60a5fa,#3b82f6);color:#fff;font-family:${v.fontBody};font-weight:700;font-size:1rem;cursor:pointer;text-transform:uppercase;letter-spacing:1px}
.av-start:disabled{opacity:.3;cursor:not-allowed}
.av-tk{display:flex;align-items:center;justify-content:center;gap:10px;margin:14px 0;width:100%}
.av-qp{width:48px;height:48px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:700;font-size:.7rem;border:2.5px solid rgba(255,255,255,.1);position:relative;transition:all .3s}
.av-qp.cur{border-color:${v.accent};box-shadow:0 0 16px rgba(251,191,36,.3)}
.av-qp.pass{background:rgba(96,165,250,.2);border-color:#60a5fa;color:#60a5fa}.av-qp.fail{background:rgba(248,113,113,.2);border-color:#f87171;color:#f87171}
.av-qn{font-family:${v.fontDisplay};font-size:1rem}.av-qs{font-size:.6rem;color:${v.textMuted}}
.av-2f{position:absolute;bottom:-6px;font-size:.5rem;background:#f87171;color:#fff;padding:1px 5px;border-radius:8px;font-weight:700}
.av-rej{display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:10px;font-size:.75rem;color:${v.textMuted}}
.av-rjp{width:14px;height:14px;border-radius:50%;border:2px solid rgba(255,255,255,.1)}.av-rjp.on{background:#f87171;border-color:#f87171}
.av-ph{text-align:center;margin-bottom:14px}.av-ph h3{font-family:${v.fontDisplay};font-size:1.2rem;color:${v.text}}.av-ph p{color:${v.textSec};font-size:.85rem;margin-top:4px}
.av-rc{background:rgba(0,0,0,.4);border:2px solid var(--cc,#60a5fa);border-radius:20px;padding:32px 24px;text-align:center;box-shadow:0 0 40px var(--cg,rgba(96,165,250,.15));width:100%;margin-bottom:16px;animation:avFlip .6s cubic-bezier(.16,1,.3,1)}
@keyframes avFlip{0%{transform:rotateY(-90deg) scale(.8);opacity:0}50%{transform:rotateY(-10deg) scale(1.02);opacity:1}100%{transform:rotateY(0) scale(1)}}
.av-rci{font-size:3.5rem;margin-bottom:12px}.av-rcr{font-family:${v.fontDisplay};font-size:1.4rem;margin-bottom:6px}
.av-rct{font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin-bottom:14px}
.av-rcd{font-size:.9rem;color:${v.textSec};line-height:1.4;margin-bottom:16px}
.av-kn{background:rgba(255,255,255,.04);border-radius:12px;padding:14px;text-align:left}
.av-kn h4{font-size:.75rem;text-transform:uppercase;letter-spacing:1px;color:${v.textMuted};margin-bottom:8px}
.av-ki{display:flex;align-items:center;gap:8px;padding:6px 0;font-size:.9rem;font-weight:600}
.av-kd{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.av-disc{text-align:center;padding:10px 0}.av-disc-i{font-size:3rem;margin-bottom:12px}
.av-disc h3{font-family:${v.fontDisplay};font-size:1.2rem;margin-bottom:6px}
.av-disc-pr{color:${v.accent};font-size:1rem;font-weight:600;font-style:italic;margin:12px 0;line-height:1.4}
.av-disc-ctx{background:rgba(255,255,255,.03);border-radius:12px;padding:14px;margin:12px 0;font-size:.85rem;color:${v.textSec};text-align:left;line-height:1.5}
.av-tg{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:16px}
.av-tp{display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:50px;background:rgba(255,255,255,.04);border:2px solid rgba(255,255,255,.08);cursor:pointer;transition:all .2s;user-select:none;font-weight:600;font-size:.9rem}
.av-tp:hover{border-color:rgba(255,255,255,.2)}.av-tp.sel{border-color:#60a5fa;background:rgba(96,165,250,.15);color:#93c5fd}
.av-td{width:10px;height:10px;border-radius:50%;border:2px solid rgba(255,255,255,.15)}.av-tp.sel .av-td{background:#60a5fa;border-color:#60a5fa}
.av-lb{font-size:.6rem;background:${v.accent}20;color:${v.accent};padding:2px 8px;border-radius:10px;font-weight:700}
.av-vb{display:flex;gap:12px;justify-content:center;margin:16px 0}
.av-vt{flex:1;max-width:180px;padding:18px;border:2.5px solid;border-radius:16px;font-family:${v.fontBody};font-weight:700;font-size:1rem;cursor:pointer;transition:all .2s;text-transform:uppercase;background:transparent}
.av-vt:active{transform:scale(.95)}
.av-va{border-color:rgba(96,165,250,.3);color:#60a5fa}.av-va:hover{background:rgba(96,165,250,.1)}.av-va.on{background:rgba(96,165,250,.2);border-color:#60a5fa}
.av-vr{border-color:rgba(248,113,113,.3);color:#f87171}.av-vr:hover{background:rgba(248,113,113,.1)}.av-vr.on{background:rgba(248,113,113,.2);border-color:#f87171}
.av-vc{padding:6px 12px;border-radius:10px;font-weight:700;font-size:.8rem;animation:avSU .3s ease both;display:inline-block;margin:3px}
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

/* Night: host dashboard */
.av-night-dash{padding:16px 0}
.av-night-step{font-family:${v.fontDisplay};font-size:1.1rem;text-align:center;margin-bottom:8px;color:${v.accent}}
.av-night-inst{text-align:center;color:${v.text};font-size:.95rem;font-style:italic;margin-bottom:16px;line-height:1.4}
.av-night-acks{margin:12px 0}
.av-ack-row{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;background:rgba(255,255,255,.03);margin-bottom:6px;transition:all .3s}
.av-ack-row.done{background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.2)}
.av-ack-dot{width:12px;height:12px;border-radius:50%;border:2px solid rgba(255,255,255,.15);flex-shrink:0;transition:all .3s}
.av-ack-row.done .av-ack-dot{background:#34d399;border-color:#34d399}
.av-ack-name{font-weight:600;flex:1;font-size:.9rem}
.av-ack-status{font-size:.75rem;color:${v.textMuted};font-weight:600}
.av-ack-row.done .av-ack-status{color:#34d399}

/* Night: player sleep screen */
.av-sleep{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;min-height:70vh}
.av-sleep-icon{font-size:4rem;margin-bottom:16px;opacity:.5}
.av-sleep-msg{font-size:1.1rem;color:${v.textMuted};font-weight:600}
.av-sleep-sub{font-size:.8rem;color:rgba(255,255,255,.2);margin-top:8px}

/* Night: player awake reveal */
.av-awake{animation:avSU .4s ease both}
.av-awake-hdr{text-align:center;margin-bottom:16px}
.av-awake-hdr h3{font-family:${v.fontDisplay};font-size:1.2rem;color:#fbbf24}
.av-awake-hdr p{color:${v.textSec};font-size:.85rem;margin-top:4px}
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
      let gS = cfg.g,
        eS = cfg.e;
      const ra = {};
      const sh = shuf([...players]);
      let i = 0;
      gs.er
        .filter((r) => ES.includes(r))
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
      gs.er
        .filter((r) => GS.includes(r))
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
        .filter(([, r]) => R[r].team === "evil")
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
      const obId = Object.entries(gs.roles).find(
        ([, r]) => r === "oberon",
      )?.[0];
      players.forEach((p) => {
        const rid = gs.roles[p.id];
        const role = R[rid];
        const sees = [];
        if (role.team === "evil" && rid !== "oberon")
          eIds.forEach((eid) => {
            if (eid !== p.id && eid !== obId)
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
      let h = '<div class="av-tk">';
      for (let i = 0; i < 5; i++) {
        const r = gs.qr[i];
        const cl =
          r === "pass"
            ? "pass"
            : r === "fail"
              ? "fail"
              : i === gs.qn
                ? "cur"
                : "";
        h += `<div class="av-qp ${cl}"><div class="av-qn">${r === "pass" ? "✓" : r === "fail" ? "✗" : i + 1}</div><div class="av-qs">${cfg.q[i]}p</div>${cfg.tf.includes(i) ? '<div class="av-2f">2 fails</div>' : ""}</div>`;
      }
      h += '</div><div class="av-rej">Rejects: ';
      for (let i = 0; i < 5; i++)
        h += `<div class="av-rjp ${i < gs.rej ? "on" : ""}"></div>`;
      return h + "</div>";
    }

    // ════════════ DISCUSSION GATE ════════════
    function disc({ icon, title, sub, prompt, ctx, tracker, onNext }) {
      let html = `<div class="av-s av-disc" style="animation:avSU .4s ease both"><div class="av-disc-i">${icon || "💬"}</div><h3>${title}</h3>`;
      if (sub)
        html += `<p style="color:${v.textSec};font-size:.85rem;margin-top:4px">${sub}</p>`;
      html += `<div class="av-disc-pr">"${esc(prompt || "")}"</div>`;
      if (tracker) html += tkHTML();
      if (ctx) html += `<div class="av-disc-ctx">${ctx}</div>`;
      html += isHost
        ? `<button class="av-b av-ba av-bl" id="av-dgo">Everyone Ready — Continue</button>`
        : `<div class="av-w"><div class="av-sp"></div>Discussing... host continues</div>`;
      html += `</div>`;
      W.innerHTML = html;
      api.speak(prompt || title);
      W.querySelector("#av-dgo")?.addEventListener("click", () => {
        api.stopSpeaking();
        api.send("av-disc-done", {});
        onNext();
      });
    }

    // ════════════ SETUP ════════════
    function renderSetup() {
      W.innerHTML = `<div class="av-s" style="animation:avSU .4s ease both">
        <h2>🏰 Avalon</h2><p class="av-sub">${n} Players — Online Only</p>
        <div class="av-comp"><div class="av-ci av-good"><div class="av-cn">${cfg.g}</div><div class="av-cl">Good</div></div>
        <div class="av-ci" style="color:${v.textMuted}"><div class="av-cn">vs</div></div>
        <div class="av-ci av-evil"><div class="av-cn">${cfg.e}</div><div class="av-cl">Evil</div></div></div>
        <div class="av-note">Each player needs their own device. Host is the game master.</div>
        <div class="av-rg" id="av-roles"></div>
        <button class="av-start" id="av-go" ${!isHost ? "disabled" : ""}>${isHost ? "Begin Game" : "Waiting for host..."}</button>
      </div>`;
      const rg = W.querySelector("#av-roles");
      OPT.forEach((rId) => {
        const role = R[rId];
        const isG = role.team === "good";
        const col = isG ? "#60a5fa" : "#f87171";
        const el = document.createElement("div");
        el.className = `av-rt ${gs.er.includes(rId) ? "on" : ""}`;
        el.style.setProperty("--rc", col);
        el.style.setProperty("--rb", col + "15");
        el.innerHTML = `<span class="av-ri">${role.icon}</span><div class="av-rf"><div class="av-rn">${role.name} <span class="av-rtm" style="color:${col}">${role.team}</span></div><div class="av-rd">${role.desc}</div></div><div class="av-ck">${gs.er.includes(rId) ? "✓" : ""}</div>`;
        if (isHost)
          el.addEventListener("click", () => {
            const on = gs.er.includes(rId);
            if (on) {
              gs.er = gs.er.filter((r) => r !== rId);
              if (rId === "merlin")
                gs.er = gs.er.filter(
                  (r) => r !== "assassin" && r !== "percival",
                );
              if (rId === "assassin")
                gs.er = gs.er.filter((r) => r !== "merlin" && r !== "percival");
            } else {
              const cG = gs.er.filter((r) => GS.includes(r)).length;
              const cE = gs.er.filter((r) => ES.includes(r)).length;
              if (isG && cG >= cfg.g) return;
              if (!isG && cE >= cfg.e) return;
              gs.er.push(rId);
              if (rId === "merlin" && !gs.er.includes("assassin") && cE < cfg.e)
                gs.er.push("assassin");
              if (rId === "assassin" && !gs.er.includes("merlin") && cG < cfg.g)
                gs.er.push("merlin");
              if (rId === "percival" && !gs.er.includes("merlin")) {
                gs.er.push("merlin");
                const cE2 = gs.er.filter((r) => ES.includes(r)).length;
                if (cE2 < cfg.e && !gs.er.includes("assassin"))
                  gs.er.push("assassin");
              }
            }
            renderSetup();
          });
        rg.appendChild(el);
      });
      W.querySelector("#av-go")?.addEventListener("click", () => {
        if (n < 5) {
          alert("Need 5+ players.");
          return;
        }
        assignRoles();
        gs.leader = Math.floor(Math.random() * n);
        gs.qn = 0;
        gs.qr = [null, null, null, null, null];
        gs.rej = 0;
        gs.gw = 0;
        gs.ew = 0;
        api.send("av-start", { roles: gs.roles, leader: gs.leader, er: gs.er });
        // Send private role info
        players.forEach((p) => {
          if (p.id !== me.id)
            api.sendTo(p.id, "av-your-role", { roleInfo: gs.roleInfo[p.id] });
        });
        gs.phase = "night";
        nightPhase();
      });
    }

    // ════════════════════════════════════════════
    //  NIGHT PHASE — Host as Game Master
    // ════════════════════════════════════════════

    function nightPhase() {
      const eIds = Object.entries(gs.roles)
        .filter(([, r]) => R[r].team === "evil")
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
        id: "role-reveal",
        blindTitle: "🌙 Role Reveal",
        blindDesc: "Everyone is memorizing their secret role.",
        tts: "Everyone, look at your phone to see your secret role. Memorize it. Then close your eyes.",
        targets: players.map((p) => p.id),
        playerScreen: "role",
        ackLabel: "I've memorized my role & closed my eyes",
      });

      if (eNonOb.length > 0) {
        steps.push({
          id: "evil-open",
          blindTitle: "🌙 Night Step",
          blindDesc: "A group is checking their phones.",
          tts: "Minions of Mordred — not Oberon — open your eyes and check your phone.",
          targets: eNonOb,
          playerScreen: "info",
          playerTitle: "👹 You are Evil",
          playerMsg: "Your fellow minions:",
          showSees: true,
          ackLabel: "I see my allies — closing my eyes",
        });
      }

      if (merlId) {
        steps.push({
          id: "merlin-open",
          blindTitle: "🌙 Night Step",
          blindDesc: "A player is checking their phone.",
          tts: "Merlin, open your eyes and check your phone.",
          targets: [merlId],
          playerScreen: "info",
          playerTitle: "🧙 You are Merlin",
          playerMsg: "The forces of evil (except Mordred):",
          showSees: true,
          ackLabel: "I see them — closing my eyes",
        });
      }

      if (percId) {
        steps.push({
          id: "percival-open",
          blindTitle: "🌙 Night Step",
          blindDesc: "A player is checking their phone.",
          tts: "Percival, open your eyes and check your phone.",
          targets: [percId],
          playerScreen: "info",
          playerTitle: "⚔️ You are Percival",
          playerMsg: "One of these is Merlin (the other may be Morgana):",
          showSees: true,
          ackLabel: "I see them — closing my eyes",
        });
      }

      steps.push({
        id: "all-open",
        blindTitle: "☀️ Dawn",
        blindDesc: "Night phase complete.",
        tts: "Everyone, open your eyes. The game begins.",
        targets: [],
        playerScreen: null,
        ackLabel: null,
      });

      runNightSteps(steps, 0);
    }

    function runNightSteps(steps, idx) {
      if (idx >= steps.length) {
        api.send("av-phase", { phase: "post-night" });
        disc({
          icon: "☀️",
          title: "Dawn Breaks — Discuss!",
          sub: "Roles assigned. Look around.",
          prompt: rP("postNight"),
          tracker: true,
          onNext: () => {
            gs.phase = "team-build";
            api.send("av-phase", { phase: "team-build" });
            renderTeamBuild();
          },
        });
        return;
      }

      const step = steps[idx];
      gs.nightAcks = new Set();
      const hostIsTarget = step.targets.includes(me.id);

      // ── Common: send messages to other players ──
      if (isHost) {
        api.speak(step.tts);
        // Send step to targeted players (not self)
        step.targets.forEach((pid) => {
          if (pid !== me.id)
            api.sendTo(pid, "av-night-step", {
              stepId: step.id,
              screen: step.playerScreen,
              title: step.playerTitle,
              msg: step.playerMsg,
              showSees: step.showSees,
              ackLabel: step.ackLabel,
            });
        });
        // Send sleep to non-targeted non-host players
        players.forEach((p) => {
          if (p.id !== me.id && !step.targets.includes(p.id))
            api.sendTo(p.id, "av-night-sleep", {});
        });
      }

      if (isHost) {
        if (hostIsTarget) {
          // Host IS a target — show their player screen first
          if (step.playerScreen === "role")
            showPlayerRole(step, () => showHostAdvance(step, steps, idx));
          else if (step.playerScreen === "info")
            showPlayerInfo2(step, () => showHostAdvance(step, steps, idx));
          else showHostAdvance(step, steps, idx);
        } else if (step.targets.length > 0) {
          // Host is NOT targeted — go straight to advance screen
          showHostAdvance(step, steps, idx);
        } else {
          // No targets (final "open eyes" step)
          W.innerHTML = `<div class="av-s" style="text-align:center;padding-top:40px;animation:avSU .3s ease both">
            <div style="font-size:3rem;margin-bottom:12px">☀️</div>
            <div class="av-ph"><h3>${step.blindTitle}</h3><p>${step.blindDesc}</p></div>
            <button class="av-b av-ba av-bl" id="av-nn">Continue</button>
          </div>`;
          W.querySelector("#av-nn")?.addEventListener("click", () => {
            step.targets.forEach((pid) => {
              if (pid !== me.id) api.sendTo(pid, "av-night-sleep", {});
            });
            runNightSteps(steps, idx + 1);
          });
        }
      } else {
        // ── Non-host player ──
        if (step.playerScreen === "role") showPlayerRole(step);
        else showSleepScreen();
      }
    }

    // Host advance screen — anonymous count, no names
    function showHostAdvance(step, steps, idx) {
      const total = step.targets.filter((pid) => pid !== me.id).length; // others to wait for
      gs._checkNightDone = updateAdvance;

      renderAdvanceUI();

      function renderAdvanceUI() {
        const acked = step.targets.filter(
          (pid) => pid !== me.id && gs.nightAcks.has(pid),
        ).length;
        const allDone = acked >= total;

        W.innerHTML = `<div class="av-s" style="text-align:center;padding-top:30px;animation:avSU .3s ease both">
          <div style="font-size:2.5rem;margin-bottom:12px">🎭</div>
          <div class="av-ph"><h3>${step.blindTitle}</h3><p>${step.blindDesc}</p></div>
          ${
            total > 0
              ? `
            <div style="margin:16px 0">
              <div style="font-family:${v.fontDisplay};font-size:1.8rem;color:${allDone ? "#34d399" : v.accent}">${acked} / ${total}</div>
              <div style="font-size:.8rem;color:${v.textMuted};margin-top:4px">${allDone ? "All players confirmed" : "players confirmed — waiting..."}</div>
            </div>
            <div style="width:100%;height:4px;background:rgba(255,255,255,.06);border-radius:2px;margin:8px 0;overflow:hidden">
              <div style="width:${total > 0 ? (acked / total) * 100 : 100}%;height:100%;background:${allDone ? "#34d399" : v.accent};border-radius:2px;transition:width .3s"></div>
            </div>
          `
              : ""
          }
          <button class="av-b ${allDone ? "av-ba" : "av-bp"} av-bl" id="av-nn" ${!allDone && total > 0 ? "disabled" : ""}>${allDone || total === 0 ? "Everyone Confirmed — Next Step" : "Waiting..."}</button>
        </div>`;

        W.querySelector("#av-nn")?.addEventListener("click", () => {
          step.targets.forEach((pid) => {
            if (pid !== me.id) api.sendTo(pid, "av-night-sleep", {});
          });
          runNightSteps(steps, idx + 1);
        });
      }

      function updateAdvance() {
        renderAdvanceUI();
      }
    }

    // Host's own player info screen (when host is a target) — with callback to advance
    function showPlayerInfo2(step, onDone) {
      const info = gs.roleInfo[me.id];
      if (!info) {
        onDone();
        return;
      }
      vib(HP.open);
      let seesHTML = "";
      if (step.showSees && info.sees.length > 0) {
        seesHTML = `<div class="av-kn" style="margin-top:16px"><h4>🔮 ${step.playerMsg || "You can see:"}</h4>${info.sees.map((s) => `<div class="av-ki"><div class="av-kd" style="background:${s.color}"></div>${esc(s.name)} <span style="color:${v.textMuted};font-size:.75rem;margin-left:4px">(${s.label})</span></div>`).join("")}</div>`;
      }
      W.innerHTML = `<div class="av-s av-awake">
        <div class="av-awake-hdr"><h3>${step.playerTitle || "Open your eyes"}</h3><p>Check below, then confirm.</p></div>
        ${seesHTML}
        <button class="av-b av-bp av-bl" id="av-host-ack" style="margin-top:16px">${step.ackLabel || "Done — closing my eyes"}</button>
      </div>`;
      W.querySelector("#av-host-ack")?.addEventListener("click", () => {
        gs.nightAcks.add(me.id);
        onDone();
      });
    }

    function showSleepScreen() {
      W.innerHTML = `<div class="av-s"><div class="av-sleep">
        <div class="av-sleep-icon">😴</div>
        <div class="av-sleep-msg">Keep your eyes closed</div>
        <div class="av-sleep-sub">Wait for the announcer's instructions</div>
      </div></div>`;
    }

    function showPlayerRole(step, onDone) {
      const info = gs.roleInfo[me.id];
      if (!info) {
        if (onDone) onDone();
        else showSleepScreen();
        return;
      }
      const role = info.role;
      const isG = role.team === "good";
      const col = isG ? "#60a5fa" : "#f87171";
      const glow = isG ? "rgba(96,165,250,.2)" : "rgba(248,113,113,.2)";
      vib(HP.open);
      W.innerHTML = `<div class="av-s av-awake">
        <div class="av-awake-hdr"><h3>Your Secret Role</h3><p>Memorize this. Then close your eyes.</p></div>
        <div class="av-rc" style="--cc:${col};--cg:${glow}"><div class="av-rci">${role.icon}</div><div class="av-rcr" style="color:${col}">${role.name}</div>
        <div class="av-rct" style="color:${col}">${isG ? "⚜️ Loyal to Arthur" : "💀 Servant of Evil"}</div>
        <div class="av-rcd">${role.desc}</div>
        ${info.sees.length > 0 ? `<div class="av-kn"><h4>🔮 Your Knowledge</h4>${info.sees.map((s) => `<div class="av-ki"><div class="av-kd" style="background:${s.color}"></div>${esc(s.name)} <span style="color:${v.textMuted};font-size:.75rem;margin-left:4px">(${s.label})</span></div>`).join("")}</div>` : ""}</div>
        <button class="av-b av-bp av-bl" id="av-role-ack">${step.ackLabel || "I've memorized — closing my eyes"}</button>
      </div>`;
      W.querySelector("#av-role-ack")?.addEventListener("click", () => {
        if (onDone) {
          // Host flow — go to advance screen
          gs.nightAcks.add(me.id);
          onDone();
        } else {
          // Regular player — send ack to host, go to sleep
          api.send("av-night-ack", { playerId: me.id, stepId: step.id });
          showSleepScreen();
        }
      });
    }

    function showPlayerInfo(data) {
      const info = gs.roleInfo[me.id];
      if (!info) return;
      vib(HP.open);
      let seesHTML = "";
      if (data.showSees && info.sees.length > 0) {
        seesHTML = `<div class="av-kn" style="margin-top:16px"><h4>🔮 ${data.msg || "You can see:"}</h4>${info.sees.map((s) => `<div class="av-ki"><div class="av-kd" style="background:${s.color}"></div>${esc(s.name)} <span style="color:${v.textMuted};font-size:.75rem;margin-left:4px">(${s.label})</span></div>`).join("")}</div>`;
      }
      W.innerHTML = `<div class="av-s av-awake">
        <div class="av-awake-hdr"><h3>${data.title || "Open your eyes"}</h3><p>Check the information below, then confirm.</p></div>
        ${seesHTML}
        <button class="av-b av-bp av-bl" id="av-info-ack" style="margin-top:16px">${data.ackLabel || "Done — closing my eyes"}</button>
      </div>`;
      W.querySelector("#av-info-ack")?.addEventListener("click", () => {
        api.send("av-night-ack", { playerId: me.id, stepId: data.stepId });
        showSleepScreen();
      });
    }

    // ════════════ TEAM BUILD ════════════
    function renderTeamBuild() {
      gs.phase = "team-build";
      gs.team = [];
      saveResumeState();
      const ldr = players[gs.leader % n];
      const sz = cfg.q[gs.qn];
      const amLeader = ldr.id === me.id;

      W.innerHTML = `<div class="av-s">${tkHTML()}<div class="av-ph"><h3>Quest ${gs.qn + 1}: Build a Team</h3>
        <p>👑 <strong style="color:${v.accent}">${esc(ldr.name)}${amLeader ? " (You)" : ""}</strong> picks ${sz} players</p></div>
        <div class="av-tg" id="av-tg"></div>
        ${amLeader ? `<button class="av-b av-bp av-bl" id="av-prop" disabled>Propose (0/${sz})</button>` : `<div class="av-w"><div class="av-sp"></div>${esc(ldr.name)} is selecting a team...</div>`}</div>`;
      api.speak(
        `Quest ${gs.qn + 1}. ${ldr.name}${amLeader ? ", you are" : " is"} the leader. ${amLeader ? "Pick" : "They pick"} ${sz} players.`,
      );
      if (amLeader) vib(HP.turn);

      const gr = W.querySelector("#av-tg");
      players.forEach((p) => {
        const el = document.createElement("div");
        el.className = "av-tp";
        const youTag =
          p.id === me.id
            ? ' <span style="color:' +
              v.accent +
              ';font-size:.7rem">(You)</span>'
            : "";
        el.innerHTML = `<div class="av-td"></div>${esc(p.name)}${youTag}${p.id === ldr.id ? '<span class="av-lb">👑</span>' : ""}`;
        if (amLeader)
          el.addEventListener("click", () => {
            const i = gs.team.indexOf(p.id);
            if (i >= 0) {
              gs.team.splice(i, 1);
              el.classList.remove("sel");
            } else if (gs.team.length < sz) {
              gs.team.push(p.id);
              el.classList.add("sel");
            }
            const b = W.querySelector("#av-prop");
            if (b) {
              b.disabled = gs.team.length !== sz;
              b.textContent = `Propose (${gs.team.length}/${sz})`;
            }
          });
        gr.appendChild(el);
      });
      W.querySelector("#av-prop")?.addEventListener("click", () => {
        if (gs.team.length !== sz) return;
        api.send("av-team", { team: gs.team, leader: gs.leader });
        preVoteDisc();
      });
    }

    function preVoteDisc() {
      const names = gs.team.map((id) => pN(id)).join(", ");
      disc({
        icon: "🗣️",
        title: "Team Proposed — Discuss!",
        sub: "Debate before voting.",
        prompt: rP("postProp"),
        ctx: `<strong>Team:</strong> ${names}<br><strong>Quest ${gs.qn + 1}</strong>: ${cfg.q[gs.qn]} players${cfg.tf.includes(gs.qn) ? ' — <strong style="color:#f87171">needs 2 fails</strong>' : ""}`,
        tracker: true,
        onNext: () => {
          api.send("av-phase", { phase: "vote" });
          renderVote();
        },
      });
    }

    // ════════════ VOTE ════════════
    function renderVote() {
      gs.phase = "vote";
      gs.votes = {};
      gs.votedSet = new Set();
      saveResumeState();
      const names = gs.team.map((id) => pN(id)).join(", ");
      renderVoteUI(false);
    }

    function renderVoteUI(hasVoted) {
      const names = gs.team.map((id) => pN(id)).join(", ");
      const total = players.length;
      const voted = gs.votedSet ? gs.votedSet.size : 0;

      let statusHTML = players
        .map((p) => {
          const isMe = p.id === me.id;
          const didVote = gs.votedSet && gs.votedSet.has(p.id);
          return `<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;background:rgba(255,255,255,.02);margin-bottom:4px;${isMe ? "border-left:3px solid " + v.accent : ""}">
          <div style="width:10px;height:10px;border-radius:50%;flex-shrink:0;${didVote ? "background:#34d399;border:2px solid #34d399" : "border:2px solid rgba(255,255,255,.12)"}"></div>
          <span style="font-weight:600;font-size:.85rem;flex:1">${esc(p.name)}${isMe ? ' <span style="color:' + v.accent + ';font-size:.7rem">(You)</span>' : ""}</span>
          <span style="font-size:.75rem;color:${didVote ? "#34d399" : v.textMuted};font-weight:600">${didVote ? "✓ Voted" : "Waiting"}</span>
        </div>`;
        })
        .join("");

      W.innerHTML = `<div class="av-s">${tkHTML()}
        <div class="av-ph"><h3>Vote: Approve or Reject?</h3><p>Team: <strong>${esc(names)}</strong></p></div>
        ${
          !hasVoted
            ? `<div class="av-vb">
          <button class="av-vt av-va" id="av-ya">👍 Approve</button>
          <button class="av-vt av-vr" id="av-no">👎 Reject</button>
        </div>`
            : `<div style="text-align:center;padding:12px;color:${v.textSec};font-weight:600">✓ Your vote is submitted</div>`
        }
        <div style="margin:12px 0">
          <div style="font-size:.75rem;color:${v.textMuted};text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:6px">Player Status — ${voted}/${total} voted</div>
          ${statusHTML}
        </div>
      </div>`;

      if (!hasVoted) {
        api.speak("Vote now!");
        vib(HP.vote);
        W.querySelector("#av-ya")?.addEventListener("click", () =>
          doVote(true),
        );
        W.querySelector("#av-no")?.addEventListener("click", () =>
          doVote(false),
        );
      }
    }

    function doVote(val) {
      gs.votes[me.id] = val;
      gs.votedSet.add(me.id);
      api.send("av-vote", { playerId: me.id, approve: val });
      renderVoteUI(true);
    }

    function resolveVote() {
      const ap = Object.values(gs.votes).filter((x) => x).length;
      const rj = Object.values(gs.votes).filter((x) => !x).length;
      const ok = ap > rj;
      vib(ok ? HP.pass : HP.fail);
      const vd = players
        .map((p) => {
          const isMe = p.id === me.id;
          return `<span class="av-vc ${gs.votes[p.id] ? "ap" : "rj"}">${esc(p.name)}${isMe ? " (You)" : ""}: ${gs.votes[p.id] ? "👍" : "👎"}</span>`;
        })
        .join(" ");
      W.innerHTML = `<div class="av-s">${tkHTML()}<div class="av-ph"><h3 style="color:${ok ? "#60a5fa" : "#f87171"}">${ok ? "✓ Approved!" : "✗ Rejected!"}</h3><p>${ap} to ${rj}</p></div><div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:12px 0">${vd}</div></div>`;
      api.speak(ok ? `Approved ${ap} to ${rj}.` : `Rejected ${rj} to ${ap}.`);
      setTimeout(() => {
        if (ok) {
          disc({
            icon: "⚔️",
            title: "Approved!",
            prompt: rP("postApprove"),
            ctx: vd,
            tracker: true,
            onNext: () => {
              api.send("av-phase", { phase: "quest" });
              renderQuest();
            },
          });
        } else {
          gs.rej++;
          if (gs.rej >= 5) {
            gs.ew = 3;
            api.send("av-gameover", { winner: "evil", reason: "5 rejects" });
            renderGO("evil", "Five teams rejected — Evil wins!");
          } else
            disc({
              icon: "❌",
              title: "Rejected!",
              sub: `Streak: ${gs.rej}/5`,
              prompt: rP("postReject"),
              tracker: true,
              onNext: () => {
                gs.leader = (gs.leader + 1) % n;
                api.send("av-phase", {
                  phase: "team-build",
                  leader: gs.leader,
                  rej: gs.rej,
                });
                renderTeamBuild();
              },
            });
        }
      }, 2500);
    }

    // ════════════ QUEST ════════════
    function renderQuest() {
      gs.phase = "quest";
      gs.qc = {};
      gs.qcSet = new Set();
      saveResumeState();
      const onT = gs.team.includes(me.id);
      renderQuestUI(onT, false);
    }

    function renderQuestUI(onTeam, hasChosen) {
      const rid = gs.roles[me.id];
      const isE = R[rid]?.team === "evil";
      const submitted = gs.qcSet ? gs.qcSet.size : 0;
      const total = gs.team.length;

      // Status list: team members show chosen/waiting, non-team show as observers
      let statusHTML = players
        .map((p) => {
          const isMe = p.id === me.id;
          const isOnTeam = gs.team.includes(p.id);
          const didChoose = gs.qcSet && gs.qcSet.has(p.id);
          return `<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;background:rgba(255,255,255,.02);margin-bottom:4px;${isMe ? "border-left:3px solid " + v.accent : ""}">
          <div style="width:10px;height:10px;border-radius:50%;flex-shrink:0;${isOnTeam ? (didChoose ? "background:#34d399;border:2px solid #34d399" : "border:2px solid rgba(255,255,255,.12)") : "background:rgba(255,255,255,.06);border:2px solid rgba(255,255,255,.06)"}"></div>
          <span style="font-weight:600;font-size:.85rem;flex:1">${esc(p.name)}${isMe ? ' <span style="color:' + v.accent + ';font-size:.7rem">(You)</span>' : ""}</span>
          <span style="font-size:.75rem;color:${isOnTeam ? (didChoose ? "#34d399" : v.textMuted) : "rgba(255,255,255,.15)"};font-weight:600">${isOnTeam ? (didChoose ? "✓ Submitted" : "On Quest") : "—"}</span>
        </div>`;
        })
        .join("");

      W.innerHTML = `<div class="av-s">${tkHTML()}
        <div class="av-ph"><h3>Quest ${gs.qn + 1}</h3>
          <p>${onTeam ? (hasChosen ? "Your choice is submitted." : "You're on this quest. Choose wisely.") : "The team is questing."}</p>
        </div>
        ${
          onTeam && !hasChosen
            ? `<div class="av-qb">
          <button class="av-qt av-qts" id="av-qs">⚜️ Success</button>
          ${isE ? '<button class="av-qt av-qtf" id="av-qf">💀 Fail</button>' : ""}
        </div>
        ${!isE ? '<div style="text-align:center;color:' + v.textMuted + ';font-size:.8rem;margin-bottom:12px">As a loyal servant, you must play Success.</div>' : ""}`
            : onTeam && hasChosen
              ? '<div style="text-align:center;padding:12px;color:' +
                v.textSec +
                ';font-weight:600">✓ Choice submitted</div>'
              : ""
        }
        <div style="margin:12px 0">
          <div style="font-size:.75rem;color:${v.textMuted};text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:6px">Quest Status — ${submitted}/${total} submitted</div>
          ${statusHTML}
        </div>
      </div>`;

      if (onTeam && !hasChosen) {
        api.speak("Make your quest choice.");
        vib(HP.turn);
        W.querySelector("#av-qs")?.addEventListener("click", () =>
          doQuest(true),
        );
        W.querySelector("#av-qf")?.addEventListener("click", () =>
          doQuest(false),
        );
      } else if (!onTeam) {
        api.speak(`Quest ${gs.qn + 1} underway.`);
      }
    }

    function doQuest(success) {
      gs.qc[me.id] = success;
      gs.qcSet.add(me.id);
      api.send("av-qchoice", { playerId: me.id, success });
      renderQuestUI(true, true);
    }

    function resolveQuest() {
      const ch = Object.values(gs.qc);
      const fails = ch.filter((c) => !c).length;
      const n2 = cfg.tf.includes(gs.qn);
      const failed = n2 ? fails >= 2 : fails >= 1;
      gs.qr[gs.qn] = failed ? "fail" : "pass";
      if (failed) gs.ew++;
      else gs.gw++;
      vib(failed ? HP.fail : HP.pass);
      const toks = shuf(ch.map((c) => (c ? "s" : "f")));
      W.innerHTML = `<div class="av-s">${tkHTML()}<div class="av-ph"><h3 style="color:${failed ? "#f87171" : "#60a5fa"}">${failed ? "💀 Failed!" : "⚜️ Passed!"}</h3><p>${fails} fail${fails !== 1 ? "s" : ""}</p></div>
        <div class="av-tok">${toks.map((t, i) => `<div class="av-to av-to${t}" style="animation-delay:${i * 0.2}s">${t === "s" ? "⚜️" : "💀"}</div>`).join("")}</div></div>`;
      api.speak(
        failed
          ? `Quest failed! ${fails} fail card${fails !== 1 ? "s" : ""}.`
          : "Quest succeeded!",
      );
      api.send("av-qresult", {
        qn: gs.qn,
        result: failed ? "fail" : "pass",
        fails,
        qr: gs.qr,
        gw: gs.gw,
        ew: gs.ew,
      });
      const tn = gs.team.map((id) => pN(id)).join(", ");
      setTimeout(() => {
        disc({
          icon: failed ? "💀" : "⚜️",
          title: failed ? "Failed — Who?" : "Passed",
          sub: `Good ${gs.gw} — Evil ${gs.ew}`,
          prompt: rP(failed ? "postFail" : "postPass"),
          ctx: `<strong>Team:</strong> ${tn}<br><strong>Fails:</strong> ${fails}`,
          tracker: true,
          onNext: () => {
            if (gs.gw >= 3) {
              if (gs.er.includes("merlin") && gs.er.includes("assassin"))
                preKillDisc();
              else {
                api.send("av-gameover", { winner: "good", reason: "3 passed" });
                renderGO("good", "Three quests passed — Good wins!");
              }
            } else if (gs.ew >= 3) {
              api.send("av-gameover", { winner: "evil", reason: "3 failed" });
              renderGO("evil", "Three quests failed — Evil wins!");
            } else {
              gs.qn++;
              gs.leader = (gs.leader + 1) % n;
              gs.rej = 0;
              api.send("av-phase", {
                phase: "team-build",
                leader: gs.leader,
                qn: gs.qn,
                rej: 0,
              });
              renderTeamBuild();
            }
          },
        });
      }, 3000);
    }

    // ════════════ ASSASSINATION ════════════
    function preKillDisc() {
      disc({
        icon: "🗡️",
        title: "Assassin Awakens",
        sub: "Good won 3 — evil gets one shot.",
        prompt: rP("preKill"),
        ctx: "<strong>Assassin: identify Merlin to steal the win.</strong><br>Evil team — discuss who Merlin is.",
        tracker: true,
        onNext: () => renderKill(),
      });
    }
    function renderKill() {
      gs.phase = "kill";
      saveResumeState();
      const mId = Object.entries(gs.roles).find(([, r]) => r === "merlin")?.[0];
      const goodP = players.filter((p) => R[gs.roles[p.id]]?.team === "good");
      vib(HP.kill);
      api.speak("Assassin, choose. Who is Merlin?");
      W.innerHTML = `<div class="av-s">${tkHTML()}<div class="av-ph"><h3 style="color:#f87171">🗡️ Assassination</h3><p>Choose from good players.</p></div><div class="av-ag" id="av-ag"></div><button class="av-b av-bd av-bl" id="av-kill" disabled>🗡️ Assassinate</button></div>`;
      const gr = W.querySelector("#av-ag");
      goodP.forEach((p) => {
        const el = document.createElement("div");
        el.className = "av-at";
        el.textContent = p.name;
        el.addEventListener("click", () => {
          gs.aTarget = p.id;
          gr.querySelectorAll(".av-at").forEach((e) =>
            e.classList.remove("sel"),
          );
          el.classList.add("sel");
          W.querySelector("#av-kill").disabled = false;
        });
        gr.appendChild(el);
      });
      W.querySelector("#av-kill")?.addEventListener("click", () => {
        const k = gs.aTarget === mId;
        vib(HP.kill);
        api.send("av-assassin", { target: gs.aTarget, merlin: mId, killed: k });
        renderGO(
          k ? "evil" : "good",
          k
            ? `Assassin found Merlin (${pN(mId)})! Evil steals it!`
            : `Wrong! Merlin was ${pN(mId)}. Good wins!`,
        );
      });
    }

    // ════════════ GAME OVER ════════════
    function renderGO(winner, reason) {
      gs.phase = "over";
      gs.winner = winner;
      gs.reason = reason;
      saveResumeState();
      const isG = winner === "good";
      vib(HP.end);
      api.speak(reason);
      W.innerHTML = `<div class="av-s av-gos" style="animation:avSU .5s ease both">
        <div style="font-size:4rem">${isG ? "⚜️" : "💀"}</div><h2 style="color:${isG ? "#60a5fa" : "#f87171"}">${isG ? "Good Wins!" : "Evil Wins!"}</h2>
        <p style="color:${v.textSec};margin-bottom:20px">${esc(reason)}</p>${tkHTML()}
        <div style="text-align:left"><div style="font-weight:700;margin:14px 0 8px;font-size:.85rem;color:${v.textMuted};text-transform:uppercase;letter-spacing:1px">Role Reveal</div>
        <div class="av-rr">${players
          .map((p, i) => {
            const rid = gs.roles[p.id];
            const role = R[rid];
            return `<div class="av-row" style="animation-delay:${i * 0.08}s"><div class="av-rowi">${role.icon}</div><div class="av-rown">${esc(p.name)}</div><div class="av-rowr" style="color:${role.team === "good" ? "#60a5fa" : "#f87171"}">${role.name}</div></div>`;
          })
          .join("")}</div></div>
        <button class="av-b av-ba av-bl" id="av-again" style="margin-top:16px">Play Again</button>
        <button class="av-b av-bg av-bl" id="av-exit">Back to Lobby</button></div>`;
      W.querySelector("#av-again")?.addEventListener("click", () => {
        gs.phase = "setup";
        if (isHost) api.setResumeState(null);
        renderSetup();
      });
      W.querySelector("#av-exit")?.addEventListener("click", () =>
        api.endGame(),
      );
    }

    // ════════════ NETWORK ════════════
    api.on("av-start", (d) => {
      const p = d.payload || d;
      gs.roles = p.roles;
      gs.leader = p.leader;
      gs.er = p.er;
      gs.qn = 0;
      gs.qr = [null, null, null, null, null];
      gs.rej = 0;
      gs.gw = 0;
      gs.ew = 0;
      buildRI();
      gs.phase = "night";
      nightPhase();
    });
    api.on("av-your-role", (d) => {
      const p = d.payload || d;
      if (p.roleInfo) {
        gs.roleInfo[me.id] = p.roleInfo;
        if (gs.phase === "night") nightPhase();
      }
    });

    // Night phase: player receives step instruction
    api.on("av-night-step", (d) => {
      const p = d.payload || d;
      if (p.screen === "role")
        showPlayerRole({ id: p.stepId, ackLabel: p.ackLabel });
      else if (p.screen === "info") showPlayerInfo(p);
    });

    // Night phase: player told to go to sleep
    api.on("av-night-sleep", () => {
      showSleepScreen();
    });

    // Night phase: host receives ack from player
    api.on("av-night-ack", (d) => {
      const p = d.payload || d;
      gs.nightAcks.add(p.playerId);
      // Update host UI
      const row = W.querySelector(`#av-ack-${p.playerId}`);
      if (row) {
        row.classList.add("done");
        row.querySelector(".av-ack-status").textContent = "✓ Confirmed";
      }
      if (gs._checkNightDone) gs._checkNightDone();
    });

    api.on("av-disc-done", () => {});
    api.on("av-phase", (d) => {
      const p = d.payload || d;
      if (p.leader !== undefined) gs.leader = p.leader;
      if (p.qn !== undefined) gs.qn = p.qn;
      if (p.rej !== undefined) gs.rej = p.rej;
      if (p.phase === "post-night")
        disc({
          icon: "☀️",
          title: "Dawn — Discuss!",
          prompt: rP("postNight"),
          tracker: true,
          onNext: () => {
            gs.phase = "team-build";
            renderTeamBuild();
          },
        });
      if (p.phase === "team-build") renderTeamBuild();
      if (p.phase === "vote") renderVote();
      if (p.phase === "quest") renderQuest();
    });
    api.on("av-team", (d) => {
      const p = d.payload || d;
      gs.team = p.team;
      gs.leader = p.leader;
      preVoteDisc();
    });

    api.on("av-vote", (d) => {
      const p = d.payload || d;
      gs.votes[p.playerId] = p.approve;
      if (!gs.votedSet) gs.votedSet = new Set();
      gs.votedSet.add(p.playerId);
      // Host: broadcast status + check completion
      if (isHost) {
        api.send("av-vote-status", { votedIds: [...gs.votedSet] });
        if (Object.keys(gs.votes).length >= n) {
          api.send("av-votes", { votes: gs.votes });
          resolveVote();
        }
      }
    });

    api.on("av-vote-status", (d) => {
      const p = d.payload || d;
      gs.votedSet = new Set(p.votedIds || []);
      // Re-render if we're on vote screen and already voted
      if (gs.phase === "vote" && gs.votedSet.has(me.id)) renderVoteUI(true);
    });

    api.on("av-votes", (d) => {
      const p = d.payload || d;
      gs.votes = p.votes;
      resolveVote();
    });

    api.on("av-qchoice", (d) => {
      const p = d.payload || d;
      gs.qc[p.playerId] = p.success;
      if (!gs.qcSet) gs.qcSet = new Set();
      gs.qcSet.add(p.playerId);
      // Host: broadcast status + check completion
      if (isHost) {
        api.send("av-quest-status", { chosenIds: [...gs.qcSet] });
        if (Object.keys(gs.qc).length >= gs.team.length) resolveQuest();
      }
    });

    api.on("av-quest-status", (d) => {
      const p = d.payload || d;
      gs.qcSet = new Set(p.chosenIds || []);
      // Re-render if we already submitted
      if (gs.phase === "quest") {
        const onT = gs.team.includes(me.id);
        const done = gs.qcSet.has(me.id);
        renderQuestUI(onT, done);
      }
    });
    api.on("av-qresult", (d) => {
      const p = d.payload || d;
      gs.qr = p.qr;
      gs.gw = p.gw;
      gs.ew = p.ew;
      gs.qn = p.qn;
    });
    api.on("av-assassin", (d) => {
      const p = d.payload || d;
      renderGO(
        p.killed ? "evil" : "good",
        p.killed
          ? `Assassin found Merlin (${pN(p.merlin)})! Evil wins!`
          : `Wrong! Merlin was ${pN(p.merlin)}. Good wins!`,
      );
    });
    api.on("av-gameover", (d) => {
      const p = d.payload || d;
      renderGO(p.winner, p.reason);
    });

    // A guest reconnecting mid-game has missed whatever av-* messages
    // happened while it was gone. Rather than replaying that history, the
    // host ships everything the guest's local gs needs in one shot —
    // including their own roleInfo (safe to resend: it was always meant
    // for this specific player, originally delivered via av-your-role).
    // Skipped during night/setup for the same reason saveResumeState()
    // skips them — there's no clean state to hand back yet.
    api.on("av-full-sync", (d) => {
      const p = d.payload || d;
      gs = {
        ...p.gs,
        roleInfo: { ...gs.roleInfo, [me.id]: p.myRoleInfo || gs.roleInfo[me.id] },
        votedSet: new Set(p.gs.votedSet || []),
        qcSet: new Set(p.gs.qcSet || []),
        nightAcks: new Set(),
      };
      const phaseRenderers = {
        "team-build": renderTeamBuild,
        vote: () => renderVoteUI(gs.votedSet?.has(me.id) ?? false),
        quest: () => renderQuestUI(gs.team.includes(me.id), gs.qcSet?.has(me.id) ?? false),
        kill: () => W.innerHTML = `<div class="av-s" style="text-align:center;padding-top:60px"><p style="color:${v.textSec}">Waiting for the assassin's choice...</p></div>`,
        over: () => renderGO(gs.winner, gs.reason),
      };
      (phaseRenderers[gs.phase] || (() => {}))();
    });

    if (isHost) {
      api.onPlayerRejoinedMidgame(({ playerId }) => {
        if (gs.phase === "setup" || gs.phase === "night") return; // nothing safe to resync yet
        api.sendTo(playerId, "av-full-sync", {
          gs: {
            ...gs,
            votedSet: [...(gs.votedSet || [])],
            qcSet: [...(gs.qcSet || [])],
            nightAcks: undefined,
          },
          myRoleInfo: gs.roleInfo[playerId],
        });
      });
      // onPlayerRejoinedMidgame fires as soon as the server reports the
      // reconnect, which can race the rejoining guest's own dynamic import —
      // if "av-full-sync" arrives before the guest's listener above is
      // registered, fireGameEvent finds no listener and the message is
      // silently dropped (no retry). So guests also explicitly ask for a
      // resync once they're definitely ready to receive it; same guard
      // applies (no resync mid setup/night), so the host just no-ops if asked
      // too early.
      api.on("av-request-sync", (_payload, fromPeer) => {
        if (gs.phase === "setup" || gs.phase === "night") return;
        api.sendTo(fromPeer, "av-full-sync", {
          gs: {
            ...gs,
            votedSet: [...(gs.votedSet || [])],
            qcSet: [...(gs.qcSet || [])],
            nightAcks: undefined,
          },
          myRoleInfo: gs.roleInfo[fromPeer],
        });
      });
    } else {
      api.send("av-request-sync", {});
    }

    // ════════════ INIT ════════════
    if (isHost) {
      if (resumedGs) {
        // Reconnecting host — resumedGs.phase is guaranteed to be one of
        // the clean phases saveResumeState() snapshots from (never "setup",
        // "night", or mid-disc()), so this switch is exhaustive in practice.
        const phaseRenderers = {
          "team-build": renderTeamBuild,
          vote: () => renderVoteUI(gs.votedSet?.has(me.id) ?? false),
          quest: () => renderQuestUI(gs.team.includes(me.id), gs.qcSet?.has(me.id) ?? false),
          kill: renderKill,
          over: () => renderGO(resumedGs.winner, resumedGs.reason),
        };
        (phaseRenderers[resumedGs.phase] || renderSetup)();
      } else {
        renderSetup();
      }
    } else
      W.innerHTML = `<div class="av-s" style="text-align:center;padding-top:60px"><div style="font-size:3.5rem;margin-bottom:16px">🏰</div><h3 style="font-family:${v.fontDisplay};font-size:1.3rem">Avalon</h3><p style="color:${v.textSec};margin-top:8px">Waiting for host...</p><div class="av-w" style="margin-top:20px"><div class="av-sp"></div></div></div>`;

    return {
      destroy() {
        api.stopSpeaking();
        container.innerHTML = "";
      },
    };
  },
};
