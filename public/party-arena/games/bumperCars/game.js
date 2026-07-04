// ─── BOT BUMPER CARS — GAME ENGINE ───────────────────────────────────────────

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ── CONSTANTS ────────────────────────────────────────────────────────────────
const CAR_COLORS = [
  { name:'Red',    body:'#e8312a', light:'#ff7a72', dark:'#9e1a15', driver:'#ff4444', class:'red',    cardClass:'red-card' },
  { name:'Blue',   body:'#3b8ecf', light:'#6bb8f5', dark:'#1a5c9e', driver:'#44aaff', class:'blue',   cardClass:'blue-card' },
  { name:'Green',  body:'#2eaa4a', light:'#55dd77', dark:'#1a7030', driver:'#44dd66', class:'green',  cardClass:'green-card' },
  { name:'Yellow', body:'#d4a824', light:'#f5d04a', dark:'#9e7510', driver:'#ffcc33', class:'yellow', cardClass:'yellow-card' },
  { name:'Orange', body:'#d45a18', light:'#f5824a', dark:'#9e3a08', driver:'#ff8833', class:'orange', cardClass:'orange-card' },
  { name:'Purple', body:'#7b3dbf', light:'#b06ae0', dark:'#4e2080', driver:'#aa55ee', class:'purple', cardClass:'purple-card' },
];

const CONTROLS = [
  { up:'w', down:'s', left:'a', right:'d', label:'W/A/S/D' },
  { up:'ArrowUp', down:'ArrowDown', left:'ArrowLeft', right:'ArrowRight', label:'Arrow Keys' },
  { up:'i', down:'k', left:'j', right:'l', label:'I/J/K/L' },
  { up:'t', down:'g', left:'f', right:'h', label:'T/F/G/H' },
  { up:'8', down:'5', left:'4', right:'6', label:'Numpad 8/4/5/6' },
  { up:'y', down:'h', left:'g', right:'j', label:'Y/G/H/J' },
];

const TILE = 60;
const CAR_W = 50, CAR_H = 38;
const DRIVER_R = 14;
const SPEED = 3.8;
const TURN_SPEED = 0.062;
const FRICTION = 0.88;
const BUMP_FORCE = 12;
const EJECT_DIST = 30; // pixels from side hit for eject trigger

// ── STATE ────────────────────────────────────────────────────────────────────
let state = 'start'; // start | countdown | playing | results
let cars = [];
let arena = {};
let keys = {};
let countdown = 3;
let countdownTimer = null;
let animId = null;
let particles = [];
let skidMarks = [];
let killFeedEntries = [];
let gameTime = 0;

// ── RESIZE CANVAS ─────────────────────────────────────────────────────────────
function resizeCanvas() {
  const pw = window.innerWidth;
  const ph = window.innerHeight;
  // Leave space for HUD
  const maxW = pw - 0;
  const maxH = ph - 0;
  canvas.width = maxW;
  canvas.height = maxH;
  if (state === 'playing' || state === 'countdown') buildArena();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ── ARENA ─────────────────────────────────────────────────────────────────────
function buildArena() {
  arena.x = 40;
  arena.y = 80;
  arena.w = canvas.width - 80;
  arena.h = canvas.height - 120;
  arena.cx = arena.x + arena.w / 2;
  arena.cy = arena.y + arena.h / 2;

  // Bumpers (circular obstacles)
  const bw = arena.w, bh = arena.h;
  arena.bumpers = [
    { x: arena.cx - bw*0.25, y: arena.cy - bh*0.25, r: 28 },
    { x: arena.cx + bw*0.25, y: arena.cy - bh*0.25, r: 28 },
    { x: arena.cx - bw*0.25, y: arena.cy + bh*0.25, r: 28 },
    { x: arena.cx + bw*0.25, y: arena.cy + bh*0.25, r: 28 },
    { x: arena.cx, y: arena.cy, r: 36 },
  ];
}

// ── PLAYER SETUP UI ───────────────────────────────────────────────────────────
let numPlayers = 4;
const playerCountDisplay = document.getElementById('playerCountDisplay');
const playersSetupDiv = document.getElementById('playersSetup');

function renderSetupUI() {
  playerCountDisplay.textContent = numPlayers;
  playersSetupDiv.innerHTML = '';
  for (let i = 0; i < numPlayers; i++) {
    const c = CAR_COLORS[i];
    const ctrl = CONTROLS[i];
    const card = document.createElement('div');
    card.className = 'player-setup-card';
    card.innerHTML = `
      <label>Player ${i+1}</label>
      <div style="display:flex;align-items:center;margin-bottom:4px;">
        <span class="color-dot" style="background:${c.body}"></span>
        <span style="font-family:var(--font-game);font-size:16px;color:${c.light}">${c.name} Car</span>
      </div>
      <div class="controls-hint">
        <span class="key-chip">${ctrl.label}</span>
      </div>`;
    playersSetupDiv.appendChild(card);
  }
}

document.getElementById('btnMinus').onclick = () => {
  if (numPlayers > 2) { numPlayers--; renderSetupUI(); }
};
document.getElementById('btnPlus').onclick = () => {
  if (numPlayers < 6) { numPlayers++; renderSetupUI(); }
};
renderSetupUI();

// ── SPAWN POSITIONS ────────────────────────────────────────────────────────
function getSpawns(n) {
  const r = Math.min(arena.w, arena.h) * 0.32;
  const spawns = [];
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    spawns.push({
      x: arena.cx + Math.cos(angle) * r,
      y: arena.cy + Math.sin(angle) * r,
      angle: angle + Math.PI // face center
    });
  }
  return spawns;
}

// ── CAR CLASS ────────────────────────────────────────────────────────────────
class Car {
  constructor(id, colorDef, controlsDef, spawnPos) {
    this.id = id;
    this.color = colorDef;
    this.controls = controlsDef;
    this.x = spawnPos.x;
    this.y = spawnPos.y;
    this.angle = spawnPos.angle;
    this.vx = 0;
    this.vy = 0;
    this.va = 0; // angular velocity
    this.alive = true;
    this.kills = 0;
    this.dodges = 0;
    this.hitsTaken = 0;
    this.ejectTimer = 0; // when > 0, animating ejection
    this.driverX = this.x;
    this.driverY = this.y;
    this.driverVx = 0;
    this.driverVy = 0;
    this.driverAngle = 0;
    this.driverLanded = false;
    this.hitCooldown = 0;
    this.bumping = false; // flash when hit
    this.bumpTimer = 0;
    this.skidTimer = 0;
    this.thrustAnim = 0;
    this.lastHitBy = -1;
  }

  get isEjecting() { return this.ejectTimer > 0; }

  getCorners() {
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    const hw = CAR_W / 2, hh = CAR_H / 2;
    const pts = [
      [-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]
    ];
    return pts.map(([lx, ly]) => ({
      x: this.x + cos * lx - sin * ly,
      y: this.y + sin * lx + cos * ly
    }));
  }

  getSideNormals() {
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    return {
      right:  {  cos,  sin },     // +x in local
      left:   { cos: -cos, sin: -sin },
      front:  { cos: -sin, sin:  cos },  // +y in local
      back:   { cos:  sin, sin: -cos }
    };
  }

  update() {
    if (!this.alive && !this.isEjecting) return;

    // Ejection animation
    if (this.isEjecting) {
      this.ejectTimer--;
      this.driverX += this.driverVx;
      this.driverY += this.driverVy;
      this.driverVy += 0.35; // gravity
      this.driverVx *= 0.98;
      this.driverAngle += 0.15;
      if (this.ejectTimer <= 0) {
        this.alive = false;
        this.ejectTimer = 0;
      }
      return;
    }

    if (this.hitCooldown > 0) this.hitCooldown--;
    if (this.bumpTimer > 0) this.bumpTimer--;

    // Input
    const up = keys[this.controls.up];
    const down = keys[this.controls.down];
    const left = keys[this.controls.left];
    const right = keys[this.controls.right];

    let thrust = 0;
    if (up) thrust = SPEED;
    if (down) thrust = -SPEED * 0.6;

    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);

    if (up || down) {
      this.vx += cos * thrust * 0.18;
      this.vy += sin * thrust * 0.18;
      this.thrustAnim = (this.thrustAnim + 0.4) % (Math.PI * 2);
      this.skidTimer++;
    } else {
      this.thrustAnim *= 0.9;
      this.skidTimer = 0;
    }

    if (left) this.va -= TURN_SPEED;
    if (right) this.va += TURN_SPEED;
    this.va *= 0.8;
    this.angle += this.va;

    // Apply friction
    this.vx *= FRICTION;
    this.vy *= FRICTION;

    // Limit speed
    const spd = Math.hypot(this.vx, this.vy);
    const maxSpd = SPEED * 1.2;
    if (spd > maxSpd) {
      this.vx = (this.vx / spd) * maxSpd;
      this.vy = (this.vy / spd) * maxSpd;
    }

    this.x += this.vx;
    this.y += this.vy;

    // Arena bounds
    const margin = 24;
    if (this.x < arena.x + margin) { this.x = arena.x + margin; this.vx *= -0.6; }
    if (this.x > arena.x + arena.w - margin) { this.x = arena.x + arena.w - margin; this.vx *= -0.6; }
    if (this.y < arena.y + margin) { this.y = arena.y + margin; this.vy *= -0.6; }
    if (this.y > arena.y + arena.h - margin) { this.y = arena.y + arena.h - margin; this.vy *= -0.6; }

    // Bumper obstacles
    for (const b of arena.bumpers) {
      const dx = this.x - b.x;
      const dy = this.y - b.y;
      const dist = Math.hypot(dx, dy);
      const minDist = b.r + 26;
      if (dist < minDist && dist > 0) {
        const push = (minDist - dist) / dist;
        this.x += dx * push;
        this.y += dy * push;
        const dot = this.vx * dx/dist + this.vy * dy/dist;
        this.vx -= 2 * dot * dx/dist;
        this.vy -= 2 * dot * dy/dist;
        this.vx *= 0.5;
        this.vy *= 0.5;
        spawnSparks(this.x, this.y, 6, '#aaa');
      }
    }

    // Skid marks
    if (spd > 1.5 && (left || right) && (up || down)) {
      skidMarks.push({ x: this.x - cos*CAR_W*0.4, y: this.y - sin*CAR_H*0.4, a: this.angle, life: 180, color: this.color.dark });
    }

    // Thrust particles
    if ((up || down) && Math.random() < 0.35) {
      const px = this.x - cos * 28 + (Math.random()-0.5)*10;
      const py = this.y - sin * 28 + (Math.random()-0.5)*10;
      particles.push({
        x: px, y: py,
        vx: -cos * (1.5 + Math.random()*2) + (Math.random()-0.5),
        vy: -sin * (1.5 + Math.random()*2) + (Math.random()-0.5),
        life: 18 + Math.random()*12,
        maxLife: 30,
        r: 3 + Math.random()*3,
        color: Math.random() < 0.5 ? '#ff8833' : '#ffdd66',
        type: 'exhaust'
      });
    }
  }

  eject(hitter) {
    if (this.isEjecting || !this.alive) return;
    this.ejectTimer = 80;
    this.alive = false; // mark not playable
    this.lastHitBy = hitter ? hitter.id : -1;
    if (hitter) hitter.kills++;
    this.hitsTaken++;

    // Launch driver upward
    this.driverX = this.x;
    this.driverY = this.y - 20;
    const launchDir = Math.random() * Math.PI * 2;
    this.driverVx = Math.cos(launchDir) * (4 + Math.random()*3);
    this.driverVy = -(8 + Math.random()*6);
    this.driverAngle = 0;

    // Big explosion
    spawnSparks(this.x, this.y, 30, this.color.light);
    spawnSparks(this.x, this.y, 15, '#ffdd00');

    // Kill feed
    addKillFeed(hitter, this);

    // Dodges for survivors
    for (const c of cars) {
      if (c.id !== this.id && c.alive && c.id !== (hitter ? hitter.id : -1)) {
        c.dodges++;
      }
    }
  }
}

// ── COLLISION DETECTION ───────────────────────────────────────────────────────
function checkCarCollisions() {
  for (let i = 0; i < cars.length; i++) {
    const a = cars[i];
    if (!a.alive || a.isEjecting) continue;
    for (let j = i + 1; j < cars.length; j++) {
      const b = cars[j];
      if (!b.alive || b.isEjecting) continue;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const minDist = CAR_W * 0.8;

      if (dist < minDist && dist > 0.01) {
        // Overlap resolution
        const overlap = minDist - dist;
        const nx = dx / dist;
        const ny = dy / dist;
        a.x -= nx * overlap * 0.5;
        a.y -= ny * overlap * 0.5;
        b.x += nx * overlap * 0.5;
        b.y += ny * overlap * 0.5;

        // Relative velocity
        const relVx = a.vx - b.vx;
        const relVy = a.vy - b.vy;
        const relVDotN = relVx * nx + relVy * ny;

        if (relVDotN > 0) {
          const restitution = 0.7;
          const impulse = relVDotN * restitution;
          a.vx -= impulse * nx;
          a.vy -= impulse * ny;
          b.vx += impulse * nx;
          b.vy += impulse * ny;
        }

        // Side hit detection — check if A hit B's side or vice versa
        checkSideHit(a, b, nx, ny);

        spawnSparks((a.x+b.x)/2, (a.y+b.y)/2, 10, '#fff');
      }
    }
  }
}

function checkSideHit(a, b, nx, ny) {
  // Determine if A hit B's left/right side
  // Project collision normal onto B's local axes
  const bCos = Math.cos(b.angle);
  const bSin = Math.sin(b.angle);
  const localNx =  nx * bCos + ny * bSin;
  const localNy = -nx * bSin + ny * bCos;

  // If |localNx| > |localNy|, it's a side hit on B from A
  const aSpd = Math.hypot(a.vx, a.vy);
  const bSpd = Math.hypot(b.vx, b.vy);

  if (Math.abs(localNx) > 0.55 && aSpd > 1.5 && a.hitCooldown === 0 && b.hitCooldown === 0) {
    // A hit B's side
    if (!b.isEjecting && b.alive) {
      b.eject(a);
      a.hitCooldown = 60;
      b.hitCooldown = 60;
      return;
    }
  }

  // Check if B hit A's side
  const aCos = Math.cos(a.angle);
  const aSin = Math.sin(a.angle);
  const localNxA = -nx * aCos + (-ny) * aSin;
  const localNyA =  nx * aSin + (-ny) * aCos;

  if (Math.abs(localNxA) > 0.55 && bSpd > 1.5 && a.hitCooldown === 0 && b.hitCooldown === 0) {
    if (!a.isEjecting && a.alive) {
      a.eject(b);
      a.hitCooldown = 60;
      b.hitCooldown = 60;
    }
  }
}

// ── PARTICLES ─────────────────────────────────────────────────────────────────
function spawnSparks(x, y, n, color) {
  for (let i = 0; i < n; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = 1 + Math.random() * 5;
    particles.push({
      x, y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd - Math.random()*2,
      life: 20 + Math.random() * 25,
      maxLife: 45,
      r: 2 + Math.random() * 3,
      color,
      type: 'spark'
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.12;
    p.vx *= 0.97;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
  for (let i = skidMarks.length - 1; i >= 0; i--) {
    skidMarks[i].life--;
    if (skidMarks[i].life <= 0) skidMarks.splice(i, 1);
  }
}

// ── KILL FEED ─────────────────────────────────────────────────────────────────
function addKillFeed(killer, victim) {
  const feedEl = document.getElementById('killFeed');
  const div = document.createElement('div');
  div.className = 'kill-entry';
  if (killer) {
    div.innerHTML = `<span style="color:${killer.color.light}">${killer.color.name}</span> ejected <span style="color:${victim.color.light}">${victim.color.name}</span> 💥`;
  } else {
    div.innerHTML = `<span style="color:${victim.color.light}">${victim.color.name}</span> was ejected 💥`;
  }
  feedEl.appendChild(div);
  setTimeout(() => div.remove(), 3200);
}

// ── DRAWING ───────────────────────────────────────────────────────────────────

function drawArena() {
  // Floor
  const grad = ctx.createRadialGradient(arena.cx, arena.cy, 50, arena.cx, arena.cy, Math.max(arena.w, arena.h)*0.7);
  grad.addColorStop(0, '#2a2a40');
  grad.addColorStop(1, '#1a1a2a');
  ctx.fillStyle = grad;
  ctx.roundRect(arena.x, arena.y, arena.w, arena.h, 24);
  ctx.fill();

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let x = arena.x; x < arena.x + arena.w; x += TILE) {
    ctx.beginPath(); ctx.moveTo(x, arena.y); ctx.lineTo(x, arena.y + arena.h); ctx.stroke();
  }
  for (let y = arena.y; y < arena.y + arena.h; y += TILE) {
    ctx.beginPath(); ctx.moveTo(arena.x, y); ctx.lineTo(arena.x + arena.w, y); ctx.stroke();
  }

  // Arena border
  ctx.strokeStyle = '#3a3a5a';
  ctx.lineWidth = 4;
  ctx.roundRect(arena.x, arena.y, arena.w, arena.h, 24);
  ctx.stroke();

  // Danger border glow
  ctx.strokeStyle = 'rgba(232,49,42,0.2)';
  ctx.lineWidth = 12;
  ctx.roundRect(arena.x + 2, arena.y + 2, arena.w - 4, arena.h - 4, 24);
  ctx.stroke();

  // Center circle
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(arena.cx, arena.cy, 80, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(arena.cx, arena.cy, 8, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fill();

  // Bumper obstacles
  for (const b of arena.bumpers) {
    // Glow
    const bg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r * 1.5);
    bg.addColorStop(0, 'rgba(100,200,255,0.15)');
    bg.addColorStop(1, 'rgba(100,200,255,0)');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 1.5, 0, Math.PI * 2); ctx.fill();

    // Body
    const grad2 = ctx.createRadialGradient(b.x - b.r*0.3, b.y - b.r*0.3, 0, b.x, b.y, b.r);
    grad2.addColorStop(0, '#4a4a7a');
    grad2.addColorStop(1, '#2a2a4a');
    ctx.fillStyle = grad2;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();

    // Stripes
    ctx.strokeStyle = '#5a5a8a';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(100,150,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.65, 0, Math.PI * 2); ctx.stroke();
  }
}

function drawSkidMarks() {
  for (const m of skidMarks) {
    const alpha = (m.life / 180) * 0.35;
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(m.a);
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.fillRect(-8, -3, 16, 6);
    ctx.restore();
  }
}

function drawParticles() {
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (p.type === 'exhaust') {
      const r = p.r * alpha;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0, p.color);
      g.addColorStop(1, 'rgba(255,100,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, r * 2, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * alpha, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

function drawCar(car) {
  if (!car.alive && !car.isEjecting) return;

  ctx.save();

  if (car.isEjecting) {
    // Draw ejected car spinning
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle + (80 - car.ejectTimer) * 0.1);
    ctx.globalAlpha = car.ejectTimer / 80;
    drawCarBody(car);
    ctx.restore();

    // Draw flying driver
    ctx.save();
    ctx.translate(car.driverX, car.driverY);
    ctx.rotate(car.driverAngle);
    ctx.globalAlpha = Math.min(1, car.ejectTimer / 40);
    drawDriver(car, 0, 0, DRIVER_R * 1.1);
    ctx.restore();

    // Exclamation
    if (car.ejectTimer > 50) {
      ctx.save();
      ctx.globalAlpha = (car.ejectTimer - 50) / 30;
      ctx.font = `bold ${20 + (80-car.ejectTimer)}px Boogaloo`;
      ctx.fillStyle = car.color.light;
      ctx.textAlign = 'center';
      ctx.fillText('EJECTED! 💥', car.driverX, car.driverY - 30);
      ctx.restore();
    }
    return;
  }

  // Shadow
  ctx.translate(car.x + 4, car.y + 6);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 0, CAR_W*0.5, CAR_H*0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);

  if (car.bumpTimer > 0) {
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 20;
  }

  drawCarBody(car);
  ctx.restore();
}

function drawCarBody(car) {
  const hw = CAR_W / 2, hh = CAR_H / 2;
  const c = car.color;

  // — BASE / BUMPER SKIRT (bottom dark band) —
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.roundRect(-hw - 4, hh - 8, CAR_W + 8, 12, 4);
  ctx.fill();

  // Bumper teeth
  ctx.fillStyle = '#333';
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(-hw + 4 + i * 9, hh, 6, 5);
  }

  // — MAIN BODY —
  const bodyGrad = ctx.createLinearGradient(-hw, -hh, hw, hh);
  bodyGrad.addColorStop(0, c.light);
  bodyGrad.addColorStop(0.5, c.body);
  bodyGrad.addColorStop(1, c.dark);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.roundRect(-hw, -hh + 4, CAR_W, CAR_H - 10, 8);
  ctx.fill();

  // Body outline
  ctx.strokeStyle = c.dark;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-hw, -hh + 4, CAR_W, CAR_H - 10, 8);
  ctx.stroke();

  // — FRONT BUMPER STRIPE —
  ctx.fillStyle = c.dark;
  ctx.beginPath();
  ctx.roundRect(hw - 10, -hh + 8, 10, CAR_H - 22, 3);
  ctx.fill();

  // — WINDSHIELD / COCKPIT —
  ctx.fillStyle = 'rgba(30,30,50,0.85)';
  ctx.beginPath();
  ctx.roundRect(-8, -hh + 2, 20, 10, 4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,200,255,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Windshield shine
  ctx.fillStyle = 'rgba(200,220,255,0.15)';
  ctx.fillRect(-6, -hh + 3, 8, 3);

  // — DRIVER (in cockpit) —
  drawDriver(car, -6, -hh + 7, DRIVER_R * 0.78);

  // — WHEELS —
  const wheelPositions = [
    [-hw - 4, -hh + 10], [-hw - 4, hh - 8],
    [ hw + 4, -hh + 10], [ hw + 4, hh - 8],
  ];
  const spin = Math.atan2(car.vy, car.vx) * 4;
  for (const [wx, wy] of wheelPositions) {
    // Wheel shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(wx+2, wy+2, 5, 8, 0, 0, Math.PI*2); ctx.fill();
    // Wheel
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.ellipse(wx, wy, 5, 8, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#444';
    ctx.beginPath(); ctx.ellipse(wx, wy, 3, 6, 0, 0, Math.PI*2); ctx.fill();
    // Tread line
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(wx, wy - 6); ctx.lineTo(wx, wy + 6); ctx.stroke();
  }

  // — HEADLIGHTS (front) —
  ctx.fillStyle = 'rgba(255,240,180,0.9)';
  ctx.shadowColor = 'rgba(255,240,180,0.8)';
  ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.arc(hw - 2, -hh + 10, 3.5, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(hw - 2,  hh - 14, 3.5, 0, Math.PI*2); ctx.fill();
  ctx.shadowBlur = 0;

  // — EXHAUST / THRUSTER (back) —
  const thrust = Math.hypot(car.vx, car.vy);
  if (thrust > 0.5) {
    const flare = 0.5 + Math.abs(Math.sin(car.thrustAnim)) * thrust * 0.4;
    const exGrad = ctx.createLinearGradient(-hw - 16 * flare, 0, -hw, 0);
    exGrad.addColorStop(0, 'rgba(255,100,0,0)');
    exGrad.addColorStop(1, 'rgba(255,200,80,0.8)');
    ctx.fillStyle = exGrad;
    ctx.beginPath();
    ctx.moveTo(-hw, -6);
    ctx.lineTo(-hw - 14 * flare, 0);
    ctx.lineTo(-hw, 6);
    ctx.closePath();
    ctx.fill();
  }
}

function drawDriver(car, offX, offY, r) {
  const c = car.color;
  // Body
  ctx.fillStyle = c.driver;
  ctx.beginPath();
  ctx.arc(offX, offY, r, 0, Math.PI*2);
  ctx.fill();

  // Helmet highlight
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.arc(offX - r*0.25, offY - r*0.25, r*0.4, 0, Math.PI*2);
  ctx.fill();

  // Angry eyes
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.arc(offX - r*0.28, offY - r*0.05, r*0.2, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(offX + r*0.28, offY - r*0.05, r*0.2, 0, Math.PI*2); ctx.fill();

  // Angry brows
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(offX - r*0.45, offY - r*0.3);
  ctx.lineTo(offX - r*0.1,  offY - r*0.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(offX + r*0.45, offY - r*0.3);
  ctx.lineTo(offX + r*0.1,  offY - r*0.2);
  ctx.stroke();

  // Visor
  ctx.strokeStyle = c.dark;
  ctx.lineWidth = r * 0.15;
  ctx.beginPath();
  ctx.arc(offX, offY + r*0.05, r*0.6, 0.2, Math.PI - 0.2);
  ctx.stroke();
}

// ── HUD ────────────────────────────────────────────────────────────────────────
function updateHUD() {
  const hud = document.getElementById('hud');
  hud.innerHTML = '';
  const alive = cars.filter(c => c.alive || c.isEjecting);

  document.getElementById('aliveCount').innerHTML =
    `🏁 <span style="font-size:20px;font-weight:900">${alive.length}</span> remaining`;

  const groups = [[], []]; // left / right
  cars.forEach((car, i) => { groups[i % 2].push(car); });

  const renderGroup = (group, side) => {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '6px';
    wrapper.style.alignItems = side === 'right' ? 'flex-end' : 'flex-start';

    for (const car of group) {
      const card = document.createElement('div');
      card.className = `hud-card ${car.color.cardClass}`;
      const pip = car.alive || car.isEjecting
        ? '<span class="alive-pip"></span>'
        : '<span class="alive-pip dead-pip"></span>';
      card.innerHTML = `
        <div class="player-name ${car.color.class}">${pip}P${car.id+1} — ${car.color.name}</div>
        <div class="hud-stat">💀 Kills: <span>${car.kills}</span> &nbsp; 🌀 Dodges: <span>${car.dodges}</span></div>`;
      wrapper.appendChild(card);
    }
    return wrapper;
  };

  hud.appendChild(renderGroup(groups[0], 'left'));
  hud.appendChild(renderGroup(groups[1], 'right'));
}

// ── GAME LOOP ─────────────────────────────────────────────────────────────────
function gameLoop() {
  if (state !== 'playing') return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawArena();
  drawSkidMarks();

  // Update & draw
  for (const car of cars) car.update();
  checkCarCollisions();
  updateParticles();

  drawParticles();
  for (const car of cars) drawCar(car);

  updateHUD();

  // Check win
  const survivors = cars.filter(c => c.alive && !c.isEjecting);
  const ejecting  = cars.filter(c => c.isEjecting);
  if (survivors.length <= 1 && ejecting.length === 0) {
    setTimeout(showResults, 600);
    state = 'done';
    return;
  }

  animId = requestAnimationFrame(gameLoop);
}

// ── START / COUNTDOWN ─────────────────────────────────────────────────────────
document.getElementById('btnStart').onclick = startGame;

function startGame() {
  document.getElementById('startScreen').classList.add('hidden');
  document.getElementById('resultsScreen').classList.add('hidden');

  buildArena();
  cars = [];
  particles = [];
  skidMarks = [];

  const spawns = getSpawns(numPlayers);
  for (let i = 0; i < numPlayers; i++) {
    cars.push(new Car(i, CAR_COLORS[i], CONTROLS[i], spawns[i]));
  }

  state = 'countdown';
  runCountdown();
}

function runCountdown() {
  let n = 3;
  const el = document.getElementById('countdown');
  el.style.display = 'block';

  const tick = () => {
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = 'countPop 0.8s ease-out forwards';
    el.textContent = n > 0 ? n : 'GO!';
    el.style.color = n > 0 ? '#fff' : '#aaff55';
    n--;
    if (n >= -1) {
      setTimeout(tick, 900);
    } else {
      el.style.display = 'none';
      state = 'playing';
      gameLoop();
    }
  };
  tick();
}

// ── RESULTS ───────────────────────────────────────────────────────────────────
function showResults() {
  if (animId) cancelAnimationFrame(animId);
  state = 'results';

  const sorted = [...cars].sort((a, b) => (b.kills * 3 + b.dodges) - (a.kills * 3 + a.dodges));
  const winner = cars.find(c => c.alive) || sorted[0];

  document.getElementById('winnerName').textContent = `${winner.color.name} Driver`;
  document.getElementById('winnerName').style.color = winner.color.light;
  document.getElementById('winnerSub').textContent = `${winner.kills} kills · ${winner.dodges} dodges`;

  const medals = ['🥇','🥈','🥉','💀'];
  const grid = document.getElementById('resultsGrid');
  grid.innerHTML = '';

  sorted.forEach((car, i) => {
    const card = document.createElement('div');
    card.className = 'result-card';
    card.innerHTML = `
      <div class="medal">${medals[Math.min(i, 3)]}</div>
      <div class="rc-name" style="color:${car.color.light}">${car.color.name}</div>
      <div class="result-stat">Kills <span>${car.kills}</span></div>
      <div class="result-stat">Dodges <span>${car.dodges}</span></div>
      <div class="result-stat">Hits Taken <span>${car.hitsTaken}</span></div>
      <div class="result-stat" style="margin-top:4px;font-size:10px;color:rgba(255,255,255,0.3)">Score <span style="color:rgba(255,255,255,0.6)">${car.kills*3 + car.dodges}</span></div>`;
    grid.appendChild(card);
  });

  document.getElementById('resultsScreen').classList.remove('hidden');
}

document.getElementById('btnPlayAgain').onclick = startGame;

// ── KEYBOARD ──────────────────────────────────────────────────────────────────
window.addEventListener('keydown', e => {
  keys[e.key] = true;
  // Prevent arrow key scroll
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.key] = false; });

// ── INITIAL RENDER ────────────────────────────────────────────────────────────
function drawStartBg() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Draw some decorative cars
  const t = Date.now() / 1000;
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 3; i++) {
    ctx.save();
    const x = canvas.width * (0.2 + i * 0.3);
    const y = canvas.height * 0.5 + Math.sin(t + i * 2) * 30;
    ctx.translate(x, y);
    ctx.rotate(Math.sin(t * 0.5 + i) * 0.3);
    const mockCar = { color: CAR_COLORS[i * 2], vx: 0, vy: 0, thrustAnim: t, hitCooldown: 0, bumpTimer: 0 };
    drawCarBody(mockCar);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  if (state === 'start') requestAnimationFrame(drawStartBg);
}
drawStartBg();