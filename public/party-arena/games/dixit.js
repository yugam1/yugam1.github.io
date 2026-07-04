// ═══════════════════════════════════════════════
//  DIXIT — Party Arena
//  Storytelling / deduction card game
//  3–6 players | Host-authoritative state
//  Cards: procedurally generated abstract SVG art
// ═══════════════════════════════════════════════

const HAND_SIZE = 6;

// ── Seeded PRNG (mulberry32) ──────────────────
function prng(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) >>> 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Colour palettes — dreamlike / surreal ─────
const PALETTES = [
  // Twilight
  { bg: ["#0d0221","#190933","#2d1b69"], accent: ["#c084fc","#818cf8","#f0abfc","#e879f9"], glow: "#a855f7" },
  // Ocean depths
  { bg: ["#03071e","#023e8a","#0077b6"], accent: ["#48cae4","#90e0ef","#caf0f8","#ade8f4"], glow: "#00b4d8" },
  // Golden dusk
  { bg: ["#240046","#7b2d8b","#c77dff"], accent: ["#ffd166","#ef476f","#ffc8a2","#ffd700"], glow: "#fbbf24" },
  // Emerald forest
  { bg: ["#081c15","#1b4332","#2d6a4f"], accent: ["#95d5b2","#52b788","#d8f3dc","#b7e4c7"], glow: "#52b788" },
  // Crimson dream
  { bg: ["#10002b","#3c096c","#7b2d8b"], accent: ["#ff6b6b","#ffd166","#ff9a8b","#ff6a88"], glow: "#ef233c" },
  // Arctic
  { bg: ["#03045e","#0077b6","#023e8a"], accent: ["#caf0f8","#90e0ef","#ffffff","#ade8f4"], glow: "#48cae4" },
  // Autumn
  { bg: ["#370617","#6a040f","#9d0208"], accent: ["#f48c06","#faa307","#ffba08","#e85d04"], glow: "#f48c06" },
  // Monochrome mist
  { bg: ["#0a0a0a","#1a1a2e","#16213e"], accent: ["#e2e8f0","#94a3b8","#cbd5e1","#f8fafc"], glow: "#94a3b8" },
];

// ── Card archetypes — each has a generator fn ─
const ARCHETYPES = [
  "moon_and_figure",
  "floating_island",
  "eye_in_sky",
  "spiraling_tower",
  "underwater_cathedral",
  "mirror_world",
  "doorway_to_nowhere",
  "tree_of_dreams",
  "celestial_clockwork",
  "creature_silhouette",
  "geometric_cosmos",
  "labyrinth",
];

// ── Generate SVG for a card ───────────────────
function generateCardSVG(cardId, w = 200, h = 280) {
  const r = prng(cardId * 7919 + 31337);
  const palette = PALETTES[Math.floor(r() * PALETTES.length)];
  const archetype = ARCHETYPES[cardId % ARCHETYPES.length];
  const uid = `c${cardId}`;

  function pick(arr) { return arr[Math.floor(r() * arr.length)]; }
  function ri(min, max) { return Math.floor(r() * (max - min + 1)) + min; }
  function rf(min, max) { return r() * (max - min) + min; }
  function col(arr) { return pick(arr); }

  const bg0 = palette.bg[0], bg1 = palette.bg[1], bg2 = palette.bg[2] || bg1;
  const acc = palette.accent;
  const glow = palette.glow;

  // Helper: random star field
  function stars(n, opacity = 0.6) {
    let s = "";
    for (let i = 0; i < n; i++) {
      const x = rf(0, w), y = rf(0, h * 0.7);
      const rad = rf(0.5, 2.5);
      s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(1)}" fill="${pick(acc)}" opacity="${(r() * opacity).toFixed(2)}"/>`;
    }
    return s;
  }

  // Helper: wavy path
  function wavePath(y0, amp, freq, fill, opacity = 1) {
    let d = `M0,${y0}`;
    for (let x = 0; x <= w; x += 20) {
      const y = y0 + Math.sin((x / w) * Math.PI * freq + r() * 2) * amp;
      d += ` Q${x + 10},${y - amp * 0.5} ${x + 20},${y}`;
    }
    d += ` L${w},${h} L0,${h} Z`;
    return `<path d="${d}" fill="${fill}" opacity="${opacity}"/>`;
  }

  // Helper: radial glow
  function glowCircle(cx, cy, rx, ry, col, op = 0.3) {
    return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${col}" opacity="${op}" filter="url(#${uid}blur)"/>`;
  }

  // ── Per-archetype scene content ────────────
  let scene = "";

  if (archetype === "moon_and_figure") {
    const moonY = ri(40, 90), moonR = ri(30, 55);
    scene += glowCircle(w / 2, moonY, moonR * 1.5, moonR * 1.5, glow, 0.25);
    scene += `<circle cx="${w/2}" cy="${moonY}" r="${moonR}" fill="${pick(acc)}" opacity="0.9"/>`;
    // craters
    for (let i = 0; i < 3; i++) {
      const cx = w/2 + rf(-moonR*0.5, moonR*0.5), cy = moonY + rf(-moonR*0.4, moonR*0.4);
      scene += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${rf(4,10).toFixed(1)}" fill="${bg0}" opacity="0.3"/>`;
    }
    // silhouette figure on hill
    const hx = w/2 + rf(-30,30), hy = h - ri(40,70);
    scene += wavePath(hy + 20, 15, 2, bg0, 0.7);
    scene += `<ellipse cx="${hx}" cy="${hy}" rx="22" ry="14" fill="${bg1}"/>`;
    scene += `<line x1="${hx}" y1="${hy-14}" x2="${hx}" y2="${hy-50}" stroke="${pick(acc)}" stroke-width="2.5"/>`;
    scene += `<circle cx="${hx}" cy="${hy-54}" r="8" fill="${pick(acc)}" opacity="0.9"/>`;
    // birds
    for (let i = 0; i < ri(3,7); i++) {
      const bx = rf(10,w-10), by = rf(moonY-30, moonY+30);
      scene += `<path d="M${bx},${by} Q${bx+7},${by-5} ${bx+14},${by}" stroke="${pick(acc)}" stroke-width="1.5" fill="none" opacity="0.7"/>`;
    }
  }

  else if (archetype === "floating_island") {
    const ix = w/2, iy = h*0.45, irx = ri(45,65), iry = ri(18,28);
    scene += glowCircle(ix, iy, irx*1.3, iry*1.3, glow, 0.2);
    // island bottom (rock)
    scene += `<ellipse cx="${ix}" cy="${iy+5}" rx="${irx}" ry="${iry}" fill="${pick([bg1,bg2])}"/>`;
    // island top (grass/terrain)
    scene += `<ellipse cx="${ix}" cy="${iy-8}" rx="${irx}" ry="${iry*0.7}" fill="${pick(acc)}" opacity="0.8"/>`;
    // tree
    const tx = ix + rf(-15,15);
    scene += `<rect x="${tx-3}" y="${iy-45}" width="6" height="28" fill="${pick(acc)}" opacity="0.9"/>`;
    scene += `<ellipse cx="${tx}" cy="${iy-52}" rx="16" ry="20" fill="${pick(acc)}" opacity="0.85"/>`;
    // hanging roots
    for (let i = 0; i < ri(4,8); i++) {
      const rx2 = ix + rf(-irx+5, irx-5);
      const len = rf(15, 40);
      scene += `<line x1="${rx2.toFixed(1)}" y1="${(iy+iry).toFixed(1)}" x2="${(rx2+rf(-8,8)).toFixed(1)}" y2="${(iy+iry+len).toFixed(1)}" stroke="${pick(acc)}" stroke-width="1.5" opacity="0.5"/>`;
    }
    // clouds
    for (let i = 0; i < 2; i++) {
      const cx2 = rf(20,w-20), cy2 = rf(20,60);
      scene += `<ellipse cx="${cx2}" cy="${cy2}" rx="${rf(20,35)}" ry="${rf(8,14)}" fill="${pick(acc)}" opacity="0.2"/>`;
    }
  }

  else if (archetype === "eye_in_sky") {
    const ex = w/2, ey = h*0.38, erx = ri(35,50), ery = ri(20,32);
    scene += glowCircle(ex, ey, erx*1.5, ery*1.5, glow, 0.35);
    // eyelids
    scene += `<ellipse cx="${ex}" cy="${ey}" rx="${erx}" ry="${ery}" fill="${bg1}" stroke="${pick(acc)}" stroke-width="2"/>`;
    // iris
    scene += `<ellipse cx="${ex}" cy="${ey}" rx="${erx*0.55}" ry="${ery*0.8}" fill="${pick(acc)}" opacity="0.9"/>`;
    // pupil
    scene += `<ellipse cx="${ex}" cy="${ey}" rx="${erx*0.22}" ry="${ery*0.38}" fill="${bg0}"/>`;
    // pupil shine
    scene += `<circle cx="${ex+erx*0.08}" cy="${ey-ery*0.15}" r="4" fill="white" opacity="0.7"/>`;
    // lashes
    for (let i = 0; i < ri(6,10); i++) {
      const ang = rf(-Math.PI * 0.7, -Math.PI * 0.3) + (i / 8) * Math.PI * 0.7;
      const lx = ex + Math.cos(ang) * erx, ly = ey + Math.sin(ang) * ery;
      scene += `<line x1="${lx.toFixed(1)}" y1="${ly.toFixed(1)}" x2="${(lx+Math.cos(ang)*rf(8,18)).toFixed(1)}" y2="${(ly+Math.sin(ang)*rf(8,18)).toFixed(1)}" stroke="${pick(acc)}" stroke-width="1.5" opacity="0.7"/>`;
    }
    // rays from eye
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      scene += `<line x1="${(ex + Math.cos(ang)*erx).toFixed(1)}" y1="${(ey + Math.sin(ang)*ery).toFixed(1)}" x2="${(ex+Math.cos(ang)*(erx+rf(15,30))).toFixed(1)}" y2="${(ey+Math.sin(ang)*(ery+rf(10,25))).toFixed(1)}" stroke="${glow}" stroke-width="1" opacity="0.4"/>`;
    }
  }

  else if (archetype === "spiraling_tower") {
    const tx = w/2, ty = h;
    // tower base to top
    const tw = ri(24,32), th = ri(140,180);
    scene += `<rect x="${tx-tw/2}" y="${ty-th}" width="${tw}" height="${th}" fill="${pick([bg1,bg2])}" opacity="0.9"/>`;
    // windows
    for (let i = 0; i < ri(5,9); i++) {
      const wy = ty - th + ri(20,30) + i * ri(18,24);
      scene += `<rect x="${tx-5}" y="${wy}" width="10" height="14" rx="5" fill="${pick(acc)}" opacity="${rf(0.5,1).toFixed(2)}"/>`;
    }
    // spiral staircase lines
    for (let i = 0; i < ri(8,14); i++) {
      const ang = (i / 12) * Math.PI * 3;
      const rad = tw/2 + rf(5,18);
      const sx = tx + Math.cos(ang) * rad, sy = ty - th/2 - (i / 12) * th * 0.4;
      scene += `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="2.5" fill="${pick(acc)}" opacity="0.6"/>`;
    }
    // pointy top / flag
    scene += `<polygon points="${tx},${ty-th-30} ${tx-tw/2},${ty-th} ${tx+tw/2},${ty-th}" fill="${pick(acc)}" opacity="0.8"/>`;
    // glow at top
    scene += glowCircle(tx, ty - th - 30, 20, 20, glow, 0.4);
    // clouds
    scene += `<ellipse cx="${rf(20,60)}" cy="${rf(40,80)}" rx="30" ry="10" fill="${pick(acc)}" opacity="0.15"/>`;
    scene += `<ellipse cx="${rf(w-60,w-20)}" cy="${rf(50,90)}" rx="25" ry="9" fill="${pick(acc)}" opacity="0.15"/>`;
  }

  else if (archetype === "underwater_cathedral") {
    // arched windows
    for (let i = 0; i < 3; i++) {
      const ax = 30 + i * 60, ay = h * 0.2, aw = 36, ah = 70;
      scene += `<rect x="${ax}" y="${ay}" width="${aw}" height="${ah}" rx="${aw/2}" fill="${pick(acc)}" opacity="0.18"/>`;
      scene += `<rect x="${ax+4}" y="${ay+4}" width="${aw-8}" height="${ah-4}" rx="${(aw-8)/2}" fill="${pick(acc)}" opacity="0.1"/>`;
    }
    // pillars
    for (let i = 0; i < 4; i++) {
      const px = 18 + i * 55;
      scene += `<rect x="${px}" y="${h*0.15}" width="10" height="${h*0.65}" fill="${pick([bg1,bg2])}" opacity="0.7"/>`;
    }
    // light rays from surface
    for (let i = 0; i < ri(4,7); i++) {
      const lx = rf(10, w-10);
      scene += `<polygon points="${lx},0 ${lx-20},${h*0.6} ${lx+20},${h*0.6}" fill="${pick(acc)}" opacity="0.06"/>`;
    }
    // bubbles
    for (let i = 0; i < ri(8,16); i++) {
      scene += `<circle cx="${rf(0,w)}" cy="${rf(0,h)}" r="${rf(2,7)}" fill="none" stroke="${pick(acc)}" stroke-width="1" opacity="${rf(0.2,0.6).toFixed(2)}"/>`;
    }
    // sea floor plants
    for (let i = 0; i < ri(4,8); i++) {
      const px = rf(10,w-10), py = h - ri(5,15);
      scene += `<path d="M${px},${py} Q${px+rf(-10,10)},${py-rf(20,40)} ${px+rf(-5,5)},${py-rf(40,70)}" stroke="${pick(acc)}" stroke-width="2.5" fill="none" opacity="0.5"/>`;
    }
  }

  else if (archetype === "mirror_world") {
    // horizon line
    const hy = h/2;
    scene += `<line x1="0" y1="${hy}" x2="${w}" y2="${hy}" stroke="${pick(acc)}" stroke-width="1.5" opacity="0.5"/>`;
    // tree above
    const tx2 = w/2 + rf(-20,20);
    scene += `<line x1="${tx2}" y1="${hy}" x2="${tx2}" y2="${hy-80}" stroke="${pick(acc)}" stroke-width="3" opacity="0.8"/>`;
    for (let i = 0; i < ri(4,7); i++) {
      const bx = tx2 + rf(-30,30), by = rf(hy-80, hy-20);
      scene += `<line x1="${tx2}" y1="${by}" x2="${bx}" y2="${by - rf(10,25)}" stroke="${pick(acc)}" stroke-width="2" opacity="0.6"/>`;
    }
    // reflected tree below (mirrored)
    scene += `<line x1="${tx2}" y1="${hy}" x2="${tx2}" y2="${hy+80}" stroke="${pick(acc)}" stroke-width="3" opacity="0.4"/>`;
    for (let i = 0; i < ri(4,7); i++) {
      const bx = tx2 + rf(-30,30), by = rf(hy+20, hy+80);
      scene += `<line x1="${tx2}" y1="${by}" x2="${bx}" y2="${by + rf(10,25)}" stroke="${pick(acc)}" stroke-width="2" opacity="0.25"/>`;
    }
    // ripples
    for (let i = 0; i < 3; i++) {
      scene += `<ellipse cx="${w/2}" cy="${hy+10+i*12}" rx="${30+i*20}" ry="${3+i*2}" fill="none" stroke="${pick(acc)}" stroke-width="1" opacity="${(0.3-i*0.08).toFixed(2)}"/>`;
    }
  }

  else if (archetype === "doorway_to_nowhere") {
    const dx = w/2, dy = h*0.55, dw = 54, dh = 90;
    // frame shadow
    scene += glowCircle(dx, dy - dh/2, dw, dh/2, glow, 0.2);
    // door frame
    scene += `<rect x="${dx-dw/2-5}" y="${dy-dh-5}" width="${dw+10}" height="${dh+5}" rx="4" fill="${pick([bg1,bg2])}" opacity="0.8"/>`;
    // door opening — different world inside
    scene += `<rect x="${dx-dw/2}" y="${dy-dh}" width="${dw}" height="${dh}" rx="2" fill="${pick(acc)}" opacity="0.15"/>`;
    // inner scene (stars / light)
    for (let i = 0; i < ri(8,16); i++) {
      const sx = dx + rf(-dw/2+3, dw/2-3), sy = dy - dh + rf(5, dh-5);
      scene += `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${rf(0.8,2.5).toFixed(1)}" fill="${pick(acc)}" opacity="${rf(0.4,1).toFixed(2)}"/>`;
    }
    // arch top
    scene += `<path d="M${dx-dw/2-5},${dy-dh} A${dw/2+5},${dw/2+5} 0 0 1 ${dx+dw/2+5},${dy-dh}" fill="${pick(acc)}" opacity="0.6"/>`;
    // handle
    scene += `<circle cx="${dx+dw/2-8}" cy="${dy-dh/2}" r="4" fill="${pick(acc)}" opacity="0.8"/>`;
    // path leading to door
    scene += `<path d="M${dx-20},${h} Q${dx},${dy+20} ${dx+20},${h}" stroke="${pick(acc)}" stroke-width="2" fill="none" opacity="0.3"/>`;
  }

  else if (archetype === "tree_of_dreams") {
    const tx3 = w/2 + rf(-10,10), ty3 = h;
    // roots
    for (let i = 0; i < ri(3,6); i++) {
      const ang = rf(Math.PI*0.7, Math.PI*1.3);
      const len = rf(25,55);
      scene += `<path d="M${tx3},${ty3} Q${tx3+Math.cos(ang)*len*0.5},${ty3+Math.sin(ang)*len*0.4} ${(tx3+Math.cos(ang)*len).toFixed(1)},${ty3}" stroke="${pick(acc)}" stroke-width="${rf(1.5,3).toFixed(1)}" fill="none" opacity="0.5"/>`;
    }
    // trunk
    scene += `<path d="M${tx3-8},${ty3} Q${tx3-5},${ty3-80} ${tx3},${ty3-130} Q${tx3+5},${ty3-180} ${tx3+3},${ty3-220}" stroke="${pick(acc)}" stroke-width="9" fill="none" stroke-linecap="round" opacity="0.85"/>`;
    // branches & dream objects
    function branch(bx, by, ang, len, depth) {
      if (depth === 0 || len < 8) return;
      const ex = bx + Math.cos(ang) * len, ey = by + Math.sin(ang) * len;
      scene += `<line x1="${bx.toFixed(1)}" y1="${by.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="${pick(acc)}" stroke-width="${(depth*1.5).toFixed(1)}" opacity="0.7"/>`;
      // dream objects at tips
      if (depth === 1) {
        const obj = ri(0,3);
        if (obj === 0) scene += `<circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="${rf(4,9).toFixed(1)}" fill="${pick(acc)}" opacity="${rf(0.5,0.9).toFixed(2)}"/>`;
        else if (obj === 1) scene += `<polygon points="${ex},${ey-8} ${ex+7},${ey+6} ${ex-7},${ey+6}" fill="${pick(acc)}" opacity="0.7"/>`;
        else if (obj === 2) scene += `<rect x="${ex-5}" y="${ey-5}" width="10" height="10" fill="${pick(acc)}" opacity="0.6" transform="rotate(${rf(0,45)},${ex},${ey})"/>`;
        else scene += `<ellipse cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" rx="${rf(5,10).toFixed(1)}" ry="${rf(3,7).toFixed(1)}" fill="${pick(acc)}" opacity="0.6"/>`;
      }
      branch(ex, ey, ang - rf(0.3, 0.7), len * rf(0.6, 0.75), depth - 1);
      branch(ex, ey, ang + rf(0.3, 0.7), len * rf(0.6, 0.75), depth - 1);
    }
    branch(tx3, ty3-130, -Math.PI/2 - 0.2, 40, 4);
    branch(tx3, ty3-160, -Math.PI/2 + 0.15, 35, 3);
    branch(tx3, ty3-100, -Math.PI/2 - 0.5, 28, 3);
  }

  else if (archetype === "celestial_clockwork") {
    const cx3 = w/2, cy3 = h*0.44;
    // outer rings
    for (let i = 3; i >= 1; i--) {
      scene += `<circle cx="${cx3}" cy="${cy3}" r="${i*28}" fill="none" stroke="${pick(acc)}" stroke-width="${i===1?2:1}" opacity="${(0.15+i*0.1).toFixed(2)}" stroke-dasharray="${i%2===0?"8,6":"4,4"}"/>`;
    }
    scene += glowCircle(cx3, cy3, 30, 30, glow, 0.3);
    // main clock face
    scene += `<circle cx="${cx3}" cy="${cy3}" r="26" fill="${bg1}" stroke="${pick(acc)}" stroke-width="2.5" opacity="0.9"/>`;
    // hour markers
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2 - Math.PI/2;
      const r1 = 19, r2 = 23;
      scene += `<line x1="${(cx3+Math.cos(ang)*r1).toFixed(1)}" y1="${(cy3+Math.sin(ang)*r1).toFixed(1)}" x2="${(cx3+Math.cos(ang)*r2).toFixed(1)}" y2="${(cy3+Math.sin(ang)*r2).toFixed(1)}" stroke="${pick(acc)}" stroke-width="${i%3===0?2:1}" opacity="0.8"/>`;
    }
    // hands
    const h1 = rf(0, Math.PI*2), h2 = rf(0, Math.PI*2);
    scene += `<line x1="${cx3}" y1="${cy3}" x2="${(cx3+Math.cos(h1)*16).toFixed(1)}" y2="${(cy3+Math.sin(h1)*16).toFixed(1)}" stroke="${pick(acc)}" stroke-width="2.5" stroke-linecap="round"/>`;
    scene += `<line x1="${cx3}" y1="${cy3}" x2="${(cx3+Math.cos(h2)*10).toFixed(1)}" y2="${(cy3+Math.sin(h2)*10).toFixed(1)}" stroke="${pick(acc)}" stroke-width="3.5" stroke-linecap="round"/>`;
    scene += `<circle cx="${cx3}" cy="${cy3}" r="3" fill="${glow}"/>`;
    // orbiting planets / gears
    for (let i = 0; i < ri(2,4); i++) {
      const ang = rf(0, Math.PI*2), rad = 55 + i*25;
      const px = cx3 + Math.cos(ang)*rad, py = cy3 + Math.sin(ang)*rad;
      scene += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${rf(5,12).toFixed(1)}" fill="${pick(acc)}" opacity="0.6"/>`;
    }
  }

  else if (archetype === "creature_silhouette") {
    // mysterious creature built from shapes
    const bx = w/2, by = h*0.55;
    // body
    scene += glowCircle(bx, by, 45, 55, glow, 0.2);
    scene += `<ellipse cx="${bx}" cy="${by}" rx="38" ry="50" fill="${bg1}" opacity="0.85"/>`;
    // head
    const hrad = ri(20,28);
    scene += `<ellipse cx="${bx}" cy="${by-55}" rx="${hrad}" ry="${hrad*0.9}" fill="${bg1}" opacity="0.85"/>`;
    // eyes (glowing)
    scene += glowCircle(bx-10, by-58, 8, 6, pick(acc), 0.5);
    scene += glowCircle(bx+10, by-58, 8, 6, pick(acc), 0.5);
    scene += `<ellipse cx="${bx-10}" cy="${by-58}" rx="6" ry="5" fill="${pick(acc)}" opacity="0.9"/>`;
    scene += `<ellipse cx="${bx+10}" cy="${by-58}" rx="6" ry="5" fill="${pick(acc)}" opacity="0.9"/>`;
    scene += `<circle cx="${bx-10}" cy="${by-58}" r="2.5" fill="${bg0}"/>`;
    scene += `<circle cx="${bx+10}" cy="${by-58}" r="2.5" fill="${bg0}"/>`;
    // tentacle/wing appendages
    for (let i = 0; i < ri(3,6); i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const ax = bx + side*38, ay = by + rf(-20,20);
      const cx4 = ax + side*rf(15,40), cy4 = ay + rf(-30,30);
      const ex2 = ax + side*rf(30,60), ey2 = ay + rf(-20,40);
      scene += `<path d="M${ax.toFixed(1)},${ay.toFixed(1)} Q${cx4.toFixed(1)},${cy4.toFixed(1)} ${ex2.toFixed(1)},${ey2.toFixed(1)}" stroke="${pick(acc)}" stroke-width="${rf(2,4).toFixed(1)}" fill="none" opacity="${rf(0.4,0.8).toFixed(2)}" stroke-linecap="round"/>`;
    }
    // particles / aura
    for (let i = 0; i < ri(6,12); i++) {
      const ang = rf(0, Math.PI*2), rad = rf(50,75);
      scene += `<circle cx="${(bx+Math.cos(ang)*rad).toFixed(1)}" cy="${(by-10+Math.sin(ang)*rad*0.7).toFixed(1)}" r="${rf(1.5,4).toFixed(1)}" fill="${pick(acc)}" opacity="${rf(0.2,0.6).toFixed(2)}"/>`;
    }
  }

  else if (archetype === "geometric_cosmos") {
    const cx5 = w/2, cy5 = h*0.45;
    // nested geometric shapes
    const shapes = ri(3,5);
    for (let i = shapes; i >= 1; i--) {
      const sides = [3,4,5,6,8][Math.floor(r()*5)];
      const rad = i * ri(18,24);
      const rot = rf(0, Math.PI*2);
      let pts = "";
      for (let j = 0; j < sides; j++) {
        const ang = (j/sides)*Math.PI*2 + rot;
        pts += `${(cx5+Math.cos(ang)*rad).toFixed(1)},${(cy5+Math.sin(ang)*rad).toFixed(1)} `;
      }
      scene += `<polygon points="${pts}" fill="none" stroke="${pick(acc)}" stroke-width="${i===1?2:1}" opacity="${(0.1+i*0.12).toFixed(2)}"/>`;
    }
    scene += glowCircle(cx5, cy5, 20, 20, glow, 0.4);
    scene += `<circle cx="${cx5}" cy="${cy5}" r="12" fill="${pick(acc)}" opacity="0.8"/>`;
    // orbiting dots
    for (let i = 0; i < ri(5,10); i++) {
      const ang = rf(0, Math.PI*2), rad = ri(40,90);
      const px = cx5 + Math.cos(ang)*rad, py = cy5 + Math.sin(ang)*rad;
      scene += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${rf(1.5,5).toFixed(1)}" fill="${pick(acc)}" opacity="${rf(0.3,0.8).toFixed(2)}"/>`;
    }
    // connecting lines
    for (let i = 0; i < ri(3,6); i++) {
      const a1 = rf(0,Math.PI*2), a2 = rf(0,Math.PI*2);
      const r1 = ri(30,80), r2 = ri(30,80);
      scene += `<line x1="${(cx5+Math.cos(a1)*r1).toFixed(1)}" y1="${(cy5+Math.sin(a1)*r1).toFixed(1)}" x2="${(cx5+Math.cos(a2)*r2).toFixed(1)}" y2="${(cy5+Math.sin(a2)*r2).toFixed(1)}" stroke="${pick(acc)}" stroke-width="0.8" opacity="0.2"/>`;
    }
  }

  else { // labyrinth
    const cx6 = w/2, cy6 = h*0.45;
    // concentric maze rings
    for (let ring = 1; ring <= ri(4,6); ring++) {
      const rad = ring * ri(16,20);
      const gaps = ri(2,4);
      const gapSize = Math.PI * 0.3;
      for (let g = 0; g < gaps; g++) {
        const startA = (g/gaps)*Math.PI*2 + rf(0,0.5);
        const endA = startA + (Math.PI*2/gaps) - gapSize;
        const x1 = cx6 + Math.cos(startA)*rad, y1 = cy6 + Math.sin(startA)*rad;
        const x2 = cx6 + Math.cos(endA)*rad, y2 = cy6 + Math.sin(endA)*rad;
        const laf = (endA - startA) > Math.PI ? 1 : 0;
        scene += `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} A${rad},${rad} 0 ${laf} 1 ${x2.toFixed(1)},${y2.toFixed(1)}" fill="none" stroke="${pick(acc)}" stroke-width="2" opacity="${(0.3+ring*0.08).toFixed(2)}" stroke-linecap="round"/>`;
      }
    }
    // center glow & figure
    scene += glowCircle(cx6, cy6, 18, 18, glow, 0.5);
    scene += `<circle cx="${cx6}" cy="${cy6}" r="8" fill="${pick(acc)}" opacity="0.9"/>`;
    // small person in maze
    scene += `<circle cx="${cx6+ri(20,35)}" cy="${cy6+ri(-10,10)}" r="4" fill="${pick(acc)}" opacity="0.6"/>`;
    scene += `<line x1="${cx6+ri(20,35)}" y1="${cy6+ri(-5,15)}" x2="${cx6+ri(20,35)}" y2="${cy6+ri(20,35)}" stroke="${pick(acc)}" stroke-width="1.5" opacity="0.5"/>`;
  }

  const cardLabel = [
    "Moon & Shadow","Floating Isle","The Watching Eye","Spiral Tower",
    "Drowned Cathedral","Mirror World","Door to Nowhere","Dream Tree",
    "Clockwork Sky","The Creature","Cosmic Geometry","The Labyrinth",
  ][cardId % 12];

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <defs>
    <filter id="${uid}blur"><feGaussianBlur stdDeviation="8"/></filter>
    <radialGradient id="${uid}bg" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="${bg2}"/>
      <stop offset="60%" stop-color="${bg1}"/>
      <stop offset="100%" stop-color="${bg0}"/>
    </radialGradient>
    <clipPath id="${uid}clip"><rect width="${w}" height="${h}" rx="10"/></clipPath>
  </defs>
  <g clip-path="url(#${uid}clip)">
    <rect width="${w}" height="${h}" fill="url(#${uid}bg)"/>
    ${stars(ri(20,45), 0.7)}
    ${wavePath(h*0.72, ri(8,18), ri(2,4), bg0, rf(0.3,0.6))}
    ${wavePath(h*0.82, ri(6,14), ri(2,3), bg0, rf(0.5,0.8))}
    ${scene}
    <rect width="${w}" height="${h}" rx="10" fill="none" stroke="${glow}" stroke-width="2" opacity="0.3"/>
    <rect x="8" y="${h-28}" width="${w-16}" height="20" rx="4" fill="${bg0}" opacity="0.5"/>
    <text x="${w/2}" y="${h-14}" text-anchor="middle" font-size="9" fill="${pick(acc)}" opacity="0.85" font-family="serif">${cardLabel}</text>
  </g>
</svg>`;
}

// ── Card pool: 60 cards, IDs 1–60 ────────────
const CARD_POOL = Array.from({ length: 60 }, (_, i) => ({ id: i + 1 }));

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Cache rendered SVGs as data URLs
const svgCache = new Map();
function cardDataUrl(id) {
  if (!svgCache.has(id)) {
    const svg = generateCardSVG(id);
    svgCache.set(id, "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg));
  }
  return svgCache.get(id);
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

    let gs = null;
    let localView = null;
    let selCard = null;
    let pendingVote = null;

    // Resume support: if we're the host reconnecting mid-game, this hands
    // back the last gs snapshot instead of nothing — checked in the
    // isHost startup branch at the bottom, since hostInit() is only called
    // for a genuinely fresh game.
    const resumedGs = api.getResumeState();

    // ── Styles ───────────────────────────────────
    const sty = document.createElement("style");
    sty.textContent = `
.dx{display:flex;flex-direction:column;align-items:center;height:100%;overflow-y:auto;font-family:${v.fontBody};padding:12px 12px 60px}
.dx-s{width:100%;max-width:520px}
.dx-clue{background:rgba(192,132,252,.08);border:1px solid rgba(192,132,252,.3);border-radius:12px;padding:10px 16px;text-align:center;margin-bottom:10px;font-size:.9rem;font-style:italic;color:#e9d5ff}
.dx-hand{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin:10px 0}
.dx-card{width:90px;height:126px;border-radius:10px;cursor:pointer;border:2.5px solid rgba(255,255,255,.08);transition:transform .15s,border-color .15s,box-shadow .15s;user-select:none;overflow:hidden;flex-shrink:0}
.dx-card:hover{border-color:rgba(255,255,255,.3);transform:translateY(-3px)}
.dx-card.sel{border-color:#c084fc;transform:scale(1.08) translateY(-4px);box-shadow:0 0 18px rgba(192,132,252,.5)}
.dx-card.dim{opacity:.35;cursor:default;transform:none!important}
.dx-card img{width:100%;height:100%;object-fit:cover;display:block}
.dx-table{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin:10px 0}
.dx-tcard{width:96px;min-height:140px;border-radius:10px;display:flex;flex-direction:column;align-items:center;border:2.5px solid rgba(255,255,255,.08);transition:border-color .15s,box-shadow .15s;user-select:none;overflow:hidden;position:relative}
.dx-tcard img{width:100%;height:108px;object-fit:cover;display:block}
.dx-tcard .dx-tinfo{width:100%;padding:4px 4px 4px;background:rgba(0,0,0,.5);font-size:.6rem;text-align:center;flex:1;display:flex;flex-direction:column;gap:2px}
.dx-tcard.vote-sel{border-color:#c084fc;box-shadow:0 0 14px rgba(192,132,252,.4)}
.dx-tcard.is-st{border-color:#7c3aed;box-shadow:0 0 18px rgba(124,58,237,.5)}
.dx-tcard .dx-owner{font-size:.62rem;font-weight:700;text-align:center}
.dx-tcard .dx-voters{font-size:.58rem;color:#86efac;text-align:center}
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

    function pN(id) { return players.find(p => p.id === id)?.name ?? id; }
    function mk(tag, opts = {}) {
      const el = document.createElement(tag);
      if (opts.style) el.style.cssText = opts.style;
      if (opts.className) el.className = opts.className;
      if (opts.text != null) el.textContent = opts.text;
      if (opts.placeholder) el.placeholder = opts.placeholder;
      return el;
    }
    function cardImg(id) {
      const img = document.createElement("img");
      img.src = cardDataUrl(id);
      img.alt = `Card ${id}`;
      img.loading = "lazy";
      return img;
    }

    // ── HOST logic ────────────────────────────────
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
      api.setResumeState(gs);
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
        if (gs.submissions[fromId]) return;
        if (!gs.hands[fromId]?.includes(payload.cardId)) return;
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
        if (gs.submissions[fromId] === payload.cardId) return;
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
        gs.phase = "end"; hostBroadcast();
        const top = [...players].sort((a, b) => gs.scores[b.id] - gs.scores[a.id])[0];
        api.speak(`Game over! ${pN(top.id)} wins with ${gs.scores[top.id]} points!`);
        return;
      }
      for (const p of players) { const c = gs.deck.pop(); if (c) gs.hands[p.id].push(c); }
      gs.round++; gs.stIdx = (gs.stIdx + 1) % n;
      gs.clue = ""; gs.submissions = {}; gs.votes = {}; gs.tableCards = [];
      gs.phase = "clue";
      hostBroadcast();
      api.speak(`Round ${gs.round}. ${pN(players[gs.stIdx].id)} is the storyteller.`);
    }

    // ── Render ────────────────────────────────────
    function applyView(view) {
      const prevPhase = localView?.phase;
      localView = view;
      if (view.phase !== prevPhase) { selCard = null; pendingVote = null; }
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

      const hdr = mk("div", { style: "text-align:center;margin-bottom:8px" });
      hdr.appendChild(mk("div", { style: `font-size:1.3rem;font-weight:700;font-family:${v.fontDisplay};color:#c084fc`, text: "🌙 Dixit" }));
      hdr.appendChild(mk("div", { style: `font-size:.78rem;color:${v.textSec};margin-top:2px`, text: `Round ${vw.round}  ·  Storyteller: ${pN(players[vw.stIdx]?.id)}` }));
      wrap.appendChild(hdr);

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

    function renderClue(wrap, vw) {
      const stId = players[vw.stIdx]?.id, iAmSt = me.id === stId;
      const ph = mk("div", { style: "text-align:center;margin-bottom:8px" });
      ph.appendChild(mk("div", { style: `font-family:${v.fontDisplay};font-size:1.05rem;margin-bottom:3px`, text: "✦ Give a Clue" }));
      ph.appendChild(mk("div", { style: `color:${v.textSec};font-size:.8rem`, text: iAmSt ? "Pick a card from your hand, then type your clue." : `Waiting for ${pN(stId)} to give a clue…` }));
      wrap.appendChild(ph);
      if (iAmSt) {
        wrap.appendChild(makeHand(vw.hand, selCard, cid => { selCard = cid; render(); }));
        if (selCard) {
          const row = mk("div", { style: "margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;justify-content:center" });
          const inp = mk("input", { placeholder: "Your clue — a word, phrase, poem, sound…", className: "dx-inp" });
          const btn = mk("button", { text: "Set Clue ✓", className: "dx-btn dx-btn-p" });
          btn.onclick = () => {
            const clue = inp.value.trim(); if (!clue) { inp.focus(); return; }
            if (isHost) hostAction("dx-set-clue", { clue, cardId: selCard }, me.id);
            else api.send("dx-set-clue", { clue, cardId: selCard });
          };
          inp.onkeydown = e => { if (e.key === "Enter") btn.click(); };
          row.appendChild(inp); row.appendChild(btn); wrap.appendChild(row);
        }
      } else {
        wrap.appendChild(makeHand(vw.hand, null, null, true));
      }
    }

    function renderSubmit(wrap, vw) {
      const stId = players[vw.stIdx]?.id, iAmSt = me.id === stId;
      wrap.appendChild(mk("div", { className: "dx-clue", text: `💬 "${vw.clue}"` }));
      const alreadySubmitted = vw.submittedIds.includes(me.id);
      const nonSt = players.filter(p => p.id !== stId);
      const sc = vw.submittedIds.filter(id => id !== stId).length;

      if (iAmSt) {
        wrap.appendChild(mk("div", { style: "text-align:center;color:#a78bfa;font-size:.82rem;margin-bottom:8px", text: `Waiting for others to submit… (${sc}/${nonSt.length})` }));
        wrap.appendChild(makeStatusList(nonSt, vw.submittedIds));
      } else if (alreadySubmitted) {
        wrap.appendChild(mk("div", { style: "text-align:center;color:#86efac;font-size:.82rem;margin-bottom:8px", text: `✓ Card submitted! Waiting… (${sc}/${nonSt.length})` }));
        wrap.appendChild(makeStatusList(nonSt, vw.submittedIds));
      } else {
        wrap.appendChild(mk("div", { style: "text-align:center;color:#fcd34d;font-size:.82rem;font-weight:700;margin-bottom:8px", text: "Pick a card that best fits the clue!" }));
        wrap.appendChild(makeHand(vw.hand, selCard, cid => { selCard = cid; render(); }));
        if (selCard) {
          const btn = mk("button", { text: "Submit Card ✓", className: "dx-btn dx-btn-g dx-btn-blk" });
          btn.onclick = () => {
            const cardId = selCard;
            if (isHost) hostAction("dx-submit", { cardId }, me.id);
            else api.send("dx-submit", { cardId });
          };
          wrap.appendChild(btn);
        }
      }
    }

    function renderVote(wrap, vw) {
      const stId = players[vw.stIdx]?.id, iAmSt = me.id === stId;
      const alreadyVoted = vw.votedIds.includes(me.id);
      const nonSt = players.filter(p => p.id !== stId);
      wrap.appendChild(mk("div", { className: "dx-clue", text: `💬 "${vw.clue}"` }));

      let st, sc;
      if (iAmSt) { st = `Others are voting… (${vw.votedIds.length}/${nonSt.length})`; sc = "#a78bfa"; }
      else if (alreadyVoted) { st = `✓ Vote cast! Waiting… (${vw.votedIds.length}/${nonSt.length})`; sc = "#86efac"; }
      else { st = "Which card is the storyteller's?"; sc = "#fcd34d"; }
      wrap.appendChild(mk("div", { style: `text-align:center;color:${sc};font-size:.82rem;font-weight:700;margin-bottom:8px`, text: st }));

      const table = mk("div", { className: "dx-table" });
      for (const cid of vw.tableCards) {
        const isSel = pendingVote === cid, canVote = !iAmSt && !alreadyVoted;
        const tc = mk("div", { className: "dx-tcard" + (isSel ? " vote-sel" : "") });
        if (canVote) tc.style.cursor = "pointer";
        tc.appendChild(cardImg(cid));
        const info = mk("div", { className: "dx-tinfo" });
        info.appendChild(mk("div", { style: `color:${v.textMuted};font-size:.58rem`, text: `Card ${cid}` }));
        tc.appendChild(info);
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
      if (!iAmSt && !alreadyVoted && pendingVote)
        wrap.appendChild(mk("div", { className: "dx-conf", text: "Tap again to confirm your vote ✓" }));
    }

    function renderReveal(wrap, vw) {
      const stId = players[vw.stIdx]?.id, stCard = vw.submissions[stId];
      wrap.appendChild(mk("div", { className: "dx-clue", text: `💬 "${vw.clue}"` }));
      wrap.appendChild(mk("div", { style: "text-align:center;color:#f9a8d4;font-size:.85rem;font-weight:700;margin-bottom:8px", text: "✦ Results!" }));

      const table = mk("div", { className: "dx-table" });
      for (const cid of vw.tableCards) {
        const isSt = cid === stCard;
        const owner = Object.entries(vw.submissions).find(([, id]) => id === cid)?.[0];
        const voters = Object.entries(vw.votes).filter(([, id]) => id === cid).map(([pid]) => pN(pid));
        const tc = mk("div", { className: "dx-tcard" + (isSt ? " is-st" : "") });
        tc.appendChild(cardImg(cid));
        const info = mk("div", { className: "dx-tinfo" });
        info.appendChild(mk("div", { className: "dx-owner", style: `color:${isSt ? "#d8b4fe" : v.textSec}`, text: (isSt ? "✦ " : "") + (owner ? pN(owner) : "") }));
        if (voters.length) info.appendChild(mk("div", { className: "dx-voters", text: "← " + voters.join(", ") }));
        tc.appendChild(info);
        table.appendChild(tc);
      }
      wrap.appendChild(table);

      if (isHost) {
        const btn = mk("button", { text: "▶ Next Round", className: "dx-btn dx-btn-p dx-btn-blk" });
        btn.style.marginTop = "14px";
        btn.onclick = () => hostNextRound();
        wrap.appendChild(btn);
      } else {
        const w2 = mk("div", { className: "dx-wait", style: "margin-top:12px" });
        w2.innerHTML = `<div class="dx-sp"></div> Waiting for host to start next round…`;
        wrap.appendChild(w2);
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

    // ── Hand / table helpers ──────────────────────
    function makeHand(hand, selId, onSelect, disabled = false) {
      const wrap = mk("div", { className: "dx-hand" });
      for (const id of hand) {
        const el = mk("div", { className: "dx-card" + (id === selId ? " sel" : "") + (disabled ? " dim" : "") });
        el.appendChild(cardImg(id));
        if (!disabled && onSelect) el.onclick = () => onSelect(id);
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

    // ── Network ───────────────────────────────────
    api.on("dx-state", (payload) => { applyView(payload); });
    api.on("dx-set-clue", (payload, fromId) => { if (!isHost) return; hostAction("dx-set-clue", payload, fromId); });
    api.on("dx-submit",   (payload, fromId) => { if (!isHost) return; hostAction("dx-submit", payload, fromId); });
    api.on("dx-vote",     (payload, fromId) => { if (!isHost) return; hostAction("dx-vote", payload, fromId); });
    api.on("dx-next",     ()                => { if (!isHost) return; hostNextRound(); });

    // Guest reconnecting mid-game has no state of its own (Dixit is fully
    // host-authoritative) — host just re-runs its normal broadcast, which
    // already sends every player (including the rejoining one) a full view.
    //
    // onPlayerRejoinedMidgame fires as soon as the server reports the
    // reconnect, which can be before the rejoining guest's own module has
    // finished its dynamic import and registered the "dx-state" listener
    // below — a broadcast that arrives before anyone is listening is
    // silently dropped (no buffering/retry in the event system). So guests
    // also explicitly request a resync once they're definitely ready;
    // hostBroadcast() is idempotent (always derives from current gs) so
    // calling it twice for the same reconnect is harmless.
    if (isHost) {
      api.onPlayerRejoinedMidgame(() => hostBroadcast());
      api.on("dx-request-state", () => { if (gs) hostBroadcast(); });
    } else {
      api.send("dx-request-state", {});
    }

    // ── Start ─────────────────────────────────────
    if (isHost) {
      if (resumedGs) {
        // Reconnecting host — restore the saved round/hands/scores instead
        // of dealing a fresh deck.
        gs = resumedGs;
        hostBroadcast();
      } else {
        hostInit();
        api.speak(`Dixit! Round 1. ${pN(players[0].id)} is the storyteller.`);
      }
    } else {
      render();
    }

    return {
      destroy() { api.stopSpeaking(); svgCache.clear(); container.innerHTML = ""; }
    };
  }
};
