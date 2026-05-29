// ═══════════════════════════════════════════════════════════════
//  🚗 FAO SCHWARZ BOT BUMPER CARS — Party Arena  v1
//  RC Bumper Car arena — every player drives their own car!
//  Host renders the arena & simulates physics
//  Each player's device = RC remote (same joystick as RC Soccer)
//  2–8 players | Host-authoritative physics | 2-min rounds
// ═══════════════════════════════════════════════════════════════

const RAIL        = 18;
const CAR_RX      = 22, CAR_RY = 15, BUMP_R = 27;
const SPEED       = 115;
const TURN_SPEED  = 2.8;
const FRICTION    = 0.87;
const COOLDOWN    = 2.0;   // seconds after a hit before car re-enters play
const RESET_DUR   = 0.45;  // seconds to slide back to spawn
const ROUND_SECS  = 120;
const TICK_MS     = 33;

const CAR_DEFS = [
  { col:'#ff3b30', dark:'#aa2010', led:'#ff7060', name:'Red Rocket'    },
  { col:'#007aff', dark:'#004eaa', led:'#60aaff', name:'Blue Blaze'    },
  { col:'#ffd000', dark:'#aa8800', led:'#ffe860', name:'Gold Glider'   },
  { col:'#34c759', dark:'#1a8030', led:'#70ee80', name:'Green Goblin'  },
  { col:'#af52de', dark:'#6a2090', led:'#d090ff', name:'Purple Plum'   },
  { col:'#ff9500', dark:'#aa5500', led:'#ffcc60', name:'Orange Outlaw' },
  { col:'#ff2d55', dark:'#aa0030', led:'#ff80a0', name:'Pink Panther'  },
  { col:'#5ac8fa', dark:'#1a80cc', led:'#a0e8ff', name:'Cyan Cyclone'  },
];

function spawnPositions(n, W, H) {
  const positions = [];
  const slots = [
    { x: W * 0.28, y: H * 0.30 }, { x: W * 0.72, y: H * 0.30 },
    { x: W * 0.28, y: H * 0.70 }, { x: W * 0.72, y: H * 0.70 },
    { x: W * 0.50, y: H * 0.18 }, { x: W * 0.50, y: H * 0.82 },
    { x: W * 0.10, y: H * 0.50 }, { x: W * 0.90, y: H * 0.50 },
  ];
  for (let i = 0; i < n; i++) {
    const s = slots[i % slots.length];
    const cx = W / 2, cy = H / 2;
    positions.push({ x: s.x, y: s.y, angle: Math.atan2(cy - s.y, cx - s.x) });
  }
  return positions;
}

function easeOut(t) { return 1 - (1 - t) * (1 - t); }
function lerp(a, b, t) { return a + (b - a) * t; }
function springPop(t) {
  if (t >= 1) return 1;
  const c = 2 * Math.PI / 3;
  return Math.pow(2, -8 * t) * Math.sin((t * 8 - .75) * c) + 1;
}

// ── one-time global CSS ────────────────────────────────────────
function ensureGlobals() {
  if (document.getElementById('bcar-fonts')) return;
  const l = document.createElement('link');
  l.id = 'bcar-fonts'; l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Fredoka+One&family=Quicksand:wght@600;700&display=swap';
  document.head.appendChild(l);
  const s = document.createElement('style');
  s.id = 'bcar-css';
  s.textContent = '@keyframes bcPop{from{transform:scale(.3);opacity:0}to{transform:scale(1);opacity:1}}@keyframes bcFade{from{opacity:1}to{opacity:0}}';
  document.head.appendChild(s);
}

// ═══════════════════════════════════════════════════════════════
export default {
  id: 'bumper-cars',
  name: 'Bumper Cars',

  create(container, api) {
    ensureGlobals();
    const me = api.getMe(), isHost = api.isHost(), isLocal = api.isLocal();

    // ── module state ───────────────────────────────────────────
    let W = 0, H = 0;
    let cars   = [];    // full car objects (host only builds, guests mirror)
    let scores = {};
    let timeLeft  = ROUND_SECS;
    let gameOver  = false;
    let rafId     = null;
    let tickTimer = null;
    let cdTimer   = null;
    let lastTs    = 0;
    let particles = [], shockwaves = [];
    const inputMap = {};   // { [playerId]: { axisX, axisY, boost } }
    const evCleaners = [];

    // ── root ───────────────────────────────────────────────────
    const root = document.createElement('div');
    root.style.cssText = 'width:100%;height:100%;position:relative;background:#0d0d0d;overflow:hidden;font-family:Quicksand,sans-serif;';
    container.appendChild(root);

    function stopAll() {
      cancelAnimationFrame(rafId); rafId = null;
      clearInterval(tickTimer); tickTimer = null;
      clearTimeout(cdTimer); cdTimer = null;
      evCleaners.splice(0).forEach(fn => { try { fn(); } catch(e) {} });
    }

    // ════════════════════════════════════════
    //  HOST ARENA VIEW
    // ════════════════════════════════════════
    function startArena(players) {
      stopAll();
      root.innerHTML = '';

      // canvas
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'position:absolute;display:block;';
      root.appendChild(canvas);
      const ctx = canvas.getContext('2d');

      // sidebar
      const sb = document.createElement('div');
      sb.style.cssText = 'position:absolute;right:0;top:0;bottom:0;width:130px;background:rgba(8,8,18,.96);border-left:1px solid #1e1e1e;padding:10px 8px;overflow-y:auto;z-index:10;display:flex;flex-direction:column;gap:0;';
      root.appendChild(sb);

      // hud timer
      const hud = document.createElement('div');
      hud.style.cssText = 'position:absolute;top:8px;left:50%;transform:translateX(-50%);z-index:20;background:rgba(0,0,0,.72);border:1px solid #2a2a2a;border-radius:20px;padding:4px 16px;pointer-events:none;';
      hud.innerHTML = '<span id="bcar-timer" style="font-family:Fredoka One,sans-serif;font-size:1.1rem;color:#fff;">2:00</span>';
      root.appendChild(hud);

      // countdown overlay
      const cdEl = document.createElement('div');
      cdEl.style.cssText = 'position:absolute;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;pointer-events:none;';
      root.appendChild(cdEl);

      // win overlay
      const winEl = document.createElement('div');
      winEl.style.cssText = 'position:absolute;inset:0;z-index:35;background:rgba(0,0,0,.88);display:none;flex-direction:column;align-items:center;justify-content:center;gap:14px;';
      root.appendChild(winEl);

      function applySize() {
        const cw = (container.offsetWidth || container.getBoundingClientRect().width || 500);
        const ch = (container.offsetHeight || container.getBoundingClientRect().height || 340);
        W = cw - 130; H = ch;
        canvas.width = W; canvas.height = H;
        canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
        canvas.style.left = '0'; canvas.style.top = '0';
        initCars(players);
      }

      const ro = new ResizeObserver(() => applySize());
      ro.observe(container);
      evCleaners.push(() => ro.disconnect());
      requestAnimationFrame(applySize);

      // ── init cars ──────────────────────────────────────────
      function initCars(pls) {
        const spawns = spawnPositions(pls.length, W, H);
        cars = pls.map((p, i) => {
          const d = CAR_DEFS[i % CAR_DEFS.length];
          scores[p.id] = scores[p.id] || 0;
          return {
            id: p.id, name: p.name, i,
            ...d,
            x: spawns[i].x, y: spawns[i].y,
            spawnX: spawns[i].x, spawnY: spawns[i].y,
            vx: 0, vy: 0, angle: spawns[i].angle,
            state: 'alive',   // alive | resetting | cooldown
            cooldown: 0,
            resetT: 0,
            resetFromX: spawns[i].x, resetFromY: spawns[i].y,
            cryT: 0,
            popT: -i * 0.14,
          };
        });
      }

      // ── physics ────────────────────────────────────────────
      function physStep(dt) {
        cars.forEach((c, ci) => {
          c.popT = Math.min(1, c.popT + dt * 2.5);

          if (c.state === 'resetting') {
            c.resetT = Math.min(1, c.resetT + dt / RESET_DUR);
            const t = easeOut(c.resetT);
            c.x = lerp(c.resetFromX, c.spawnX, t);
            c.y = lerp(c.resetFromY, c.spawnY, t);
            c.vx = 0; c.vy = 0;
            if (c.resetT >= 1) { c.state = 'cooldown'; c.cooldown = COOLDOWN; c.cryT = COOLDOWN; }
            return;
          }
          if (c.state === 'cooldown') {
            c.cooldown = Math.max(0, c.cooldown - dt);
            c.cryT     = Math.max(0, c.cryT - dt);
            if (c.cooldown <= 0) c.state = 'alive';
            return;
          }

          // apply input
          const inp = inputMap[c.id] || {};
          const axisX = inp.axisX || 0, axisY = inp.axisY || 0;
          const mag = Math.hypot(axisX, axisY);
          const boost = inp.boost ? 1.7 : 1;

          if (mag > 0.1) {
            const targetAngle = Math.atan2(axisY, axisX);
            let da = targetAngle - c.angle;
            while (da > Math.PI) da -= Math.PI * 2;
            while (da < -Math.PI) da += Math.PI * 2;
            c.angle += Math.sign(da) * Math.min(Math.abs(da), TURN_SPEED * dt);
            const sp = mag * SPEED * boost;
            c.vx += Math.cos(c.angle) * sp * dt;
            c.vy += Math.sin(c.angle) * sp * dt;
          }

          c.vx *= FRICTION; c.vy *= FRICTION;
          const sp = Math.hypot(c.vx, c.vy), maxV = SPEED * 1.6 * boost;
          if (sp > maxV) { c.vx = c.vx / sp * maxV; c.vy = c.vy / sp * maxV; }

          c.x += c.vx * dt; c.y += c.vy * dt;

          // wall bounce
          const pad = RAIL + 4;
          if (c.x < pad + CAR_RX)       { c.x = pad + CAR_RX;         c.vx =  Math.abs(c.vx) * .6; }
          if (c.x > W - pad - CAR_RX)   { c.x = W - pad - CAR_RX;     c.vx = -Math.abs(c.vx) * .6; }
          if (c.y < pad + CAR_RY)        { c.y = pad + CAR_RY;         c.vy =  Math.abs(c.vy) * .6; }
          if (c.y > H - pad - CAR_RY)   { c.y = H - pad - CAR_RY;     c.vy = -Math.abs(c.vy) * .6; }
        });

        // car-car collisions
        for (let i = 0; i < cars.length; i++) {
          for (let j = i + 1; j < cars.length; j++) {
            const a = cars[i], b = cars[j];
            if (a.state !== 'alive' || b.state !== 'alive') continue;
            const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), minD = BUMP_R * 2;
            if (d < minD && d > 0.01) {
              const nx = dx / d, ny = dy / d, ov = (minD - d) / 2;
              a.x -= nx * ov; a.y -= ny * ov;
              b.x += nx * ov; b.y += ny * ov;
              const relV = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
              if (relV < 0) {
                const imp = relV * 1.2;
                a.vx += imp * nx; a.vy += imp * ny;
                b.vx -= imp * nx; b.vy -= imp * ny;
                if (Math.abs(relV) > 20) {
                  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
                  spawnFX(mx, my, a.col, b.col);
                  const spA = Math.hypot(a.vx, a.vy), spB = Math.hypot(b.vx, b.vy);
                  if (spA > spB + 8) { scores[a.id] = (scores[a.id] || 0) + 1; }
                  else if (spB > spA + 8) { scores[b.id] = (scores[b.id] || 0) + 1; }
                  a.cryT = COOLDOWN; b.cryT = COOLDOWN;
                  a.resetFromX = a.x; a.resetFromY = a.y; a.resetT = 0; a.state = 'resetting'; a.vx = 0; a.vy = 0;
                  b.resetFromX = b.x; b.resetFromY = b.y; b.resetT = 0; b.state = 'resetting'; b.vx = 0; b.vy = 0;
                  updateSidebar(sb, cars, scores);
                  broadcastState();
                }
              }
            }
          }
        }

        particles = particles.filter(p => {
          p.life -= dt * (p.type === 'text' ? 1.1 : 1.8);
          p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.type !== 'text') p.vy += 90 * dt;
          return p.life > 0;
        });
        shockwaves = shockwaves.filter(s => {
          s.r += s.maxR * dt * 3; s.life = Math.max(0, 1 - s.r / s.maxR);
          return s.life > 0;
        });
      }

      function spawnFX(x, y, c1, c2) {
        shockwaves.push({ x, y, r: 0, maxR: 65, life: 1, col: c1 });
        for (let i = 0; i < 20; i++) {
          const a = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 160;
          particles.push({ x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp, life: 1, r: 2+Math.random()*3.5, col: Math.random()<.5?c1:c2, type: Math.random()<.28?'star':'dot' });
        }
        particles.push({ x, y: y-10, vx: (Math.random()-.5)*14, vy: -55, life: 1, type: 'text', text: '😭' });
      }

      // ── draw ───────────────────────────────────────────────
      function drawFloor() {
        ctx.fillStyle = '#1c1c1c'; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = '#232323'; ctx.lineWidth = .6;
        for (let gx = 0; gx < W; gx += 28) { ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,H); ctx.stroke(); }
        for (let gy = 0; gy < H; gy += 28) { ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(W,gy); ctx.stroke(); }
        ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 1.4; ctx.setLineDash([7,5]);
        ctx.beginPath(); ctx.moveTo(W/2, RAIL+10); ctx.lineTo(W/2, H-RAIL-10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(RAIL+10, H/2); ctx.lineTo(W-RAIL-10, H/2); ctx.stroke();
        ctx.beginPath(); ctx.arc(W/2, H/2, Math.min(W,H)*.18, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(W/2, H/2, 5, 0, Math.PI*2); ctx.stroke();
        ctx.setLineDash([]);
        const arrs = [[W/2,RAIL+22,'d'],[W/2,H-RAIL-22,'u'],[RAIL+22,H/2,'r'],[W-RAIL-22,H/2,'l']];
        ctx.strokeStyle='#2e2e2e'; ctx.lineWidth=2; ctx.lineCap='round'; ctx.lineJoin='round';
        arrs.forEach(([ax,ay,dir]) => {
          ctx.beginPath();
          if(dir==='d'){ctx.moveTo(ax-8,ay-7);ctx.lineTo(ax,ay+7);ctx.lineTo(ax+8,ay-7);}
          if(dir==='u'){ctx.moveTo(ax-8,ay+7);ctx.lineTo(ax,ay-7);ctx.lineTo(ax+8,ay+7);}
          if(dir==='r'){ctx.moveTo(ax-7,ay-8);ctx.lineTo(ax+7,ay);ctx.lineTo(ax-7,ay+8);}
          if(dir==='l'){ctx.moveTo(ax+7,ay-8);ctx.lineTo(ax-7,ay);ctx.lineTo(ax+7,ay+8);}
          ctx.stroke();
        });
        cars.forEach(c => {
          ctx.strokeStyle = c.col + '25'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(c.spawnX, c.spawnY, 30, 0, Math.PI*2); ctx.stroke();
        });
      }

      function drawRail() {
        const t = Date.now() / 1000;
        ctx.fillStyle = '#0f0f0f';
        ctx.fillRect(0,0,W,RAIL); ctx.fillRect(0,H-RAIL,W,RAIL);
        ctx.fillRect(0,RAIL,RAIL,H-RAIL*2); ctx.fillRect(W-RAIL,RAIL,RAIL,H-RAIL*2);
        ctx.strokeStyle = '#1e1e1e'; ctx.lineWidth = .8;
        const seg = 22;
        for(let x=RAIL;x<W-RAIL;x+=seg){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,RAIL);ctx.stroke();ctx.beginPath();ctx.moveTo(x,H-RAIL);ctx.lineTo(x,H);ctx.stroke();}
        for(let y=RAIL;y<H-RAIL;y+=seg){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(RAIL,y);ctx.stroke();ctx.beginPath();ctx.moveTo(W-RAIL,y);ctx.lineTo(W,y);ctx.stroke();}
        const leds = [];
        for(let x=RAIL+seg*.5;x<W-RAIL;x+=seg){leds.push([x,RAIL/2,leds.length]);leds.push([x,H-RAIL/2,leds.length]);}
        for(let y=RAIL+seg*.5;y<H-RAIL;y+=seg){leds.push([RAIL/2,y,leds.length]);leds.push([W-RAIL/2,y,leds.length]);}
        leds.forEach(([lx,ly,idx]) => {
          const isR=idx%2===0, br=.35+.65*Math.abs(Math.sin(t*1.9+idx*.6));
          ctx.globalAlpha=br*.9; ctx.fillStyle=isR?'#ff2020':'#2255ff';
          ctx.beginPath(); ctx.arc(lx,ly,2.8,0,Math.PI*2); ctx.fill();
          ctx.globalAlpha=br*.28; ctx.fillStyle=isR?'#ff4040':'#3366ff';
          ctx.beginPath(); ctx.arc(lx,ly,5.5,0,Math.PI*2); ctx.fill();
          ctx.globalAlpha=1;
        });
        [[0,0],[W-RAIL*2,0],[0,H-RAIL*2],[W-RAIL*2,H-RAIL*2]].forEach(([ox,oy],ci) => {
          ctx.fillStyle='#121212'; ctx.fillRect(ox,oy,RAIL*2,RAIL*2);
          const cx2=ox+RAIL, cy2=oy+RAIL;
          [['#ff2020',-5],['#2255ff',5]].forEach(([col,ddx]) => {
            const br=.4+.6*Math.abs(Math.sin(t*2.1+ci));
            ctx.globalAlpha=br; ctx.fillStyle=col; ctx.beginPath(); ctx.arc(cx2+ddx,cy2,3,0,Math.PI*2); ctx.fill();
            ctx.globalAlpha=.2*br; ctx.beginPath(); ctx.arc(cx2+ddx,cy2,6,0,Math.PI*2); ctx.fill();
            ctx.globalAlpha=1;
          });
        });
      }

      function drawFace(cx, cy, size, mode, cryT) {
        const s = size, isCry = mode === 'cry';
        ctx.fillStyle = '#f5c870';
        ctx.beginPath(); ctx.arc(cx,cy,s,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#d4930a'; ctx.lineWidth = s*.1;
        ctx.beginPath(); ctx.arc(cx,cy,s,0,Math.PI*2); ctx.stroke();
        if (isCry) {
          ctx.fillStyle='#111';
          ctx.beginPath(); ctx.ellipse(cx-s*.3,cy-s*.2,s*.18,s*.12,-.4,0,Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(cx+s*.3,cy-s*.2,s*.18,s*.12,.4,0,Math.PI*2); ctx.fill();
          ctx.strokeStyle='#555'; ctx.lineWidth=s*.1;
          ctx.beginPath(); ctx.moveTo(cx-s*.45,cy-s*.42); ctx.lineTo(cx-s*.15,cy-s*.3); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx+s*.45,cy-s*.42); ctx.lineTo(cx+s*.15,cy-s*.3); ctx.stroke();
          ctx.strokeStyle='#111'; ctx.lineWidth=s*.11; ctx.lineCap='round';
          ctx.beginPath(); ctx.arc(cx,cy+s*.28,s*.25,Math.PI*.1,Math.PI*.9); ctx.stroke();
          const tearProg = Math.min(1, 1 - cryT / COOLDOWN);
          const tearH = s*1.2*tearProg;
          [cx-s*.28, cx+s*.28].forEach(tx => {
            const g = ctx.createLinearGradient(tx,cy+s*.12,tx,cy+s*.12+tearH);
            g.addColorStop(0,'rgba(100,180,255,.9)'); g.addColorStop(1,'rgba(100,180,255,0)');
            ctx.fillStyle=g;
            ctx.beginPath(); ctx.moveTo(tx-s*.07,cy+s*.12); ctx.quadraticCurveTo(tx-s*.13,cy+s*.12+tearH*.5,tx,cy+s*.12+tearH); ctx.quadraticCurveTo(tx+s*.13,cy+s*.12+tearH*.5,tx+s*.07,cy+s*.12); ctx.closePath(); ctx.fill();
          });
        } else {
          ctx.fillStyle='#111';
          ctx.beginPath(); ctx.arc(cx-s*.3,cy-s*.18,s*.15,0,Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(cx+s*.3,cy-s*.18,s*.15,0,Math.PI*2); ctx.fill();
          ctx.fillStyle='rgba(255,255,255,.65)';
          ctx.beginPath(); ctx.arc(cx-s*.22,cy-s*.24,s*.055,0,Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(cx+s*.36,cy-s*.24,s*.055,0,Math.PI*2); ctx.fill();
          ctx.strokeStyle='#333'; ctx.lineWidth=s*.11; ctx.lineCap='round';
          ctx.beginPath(); ctx.arc(cx,cy+s*.1,s*.3,Math.PI*.15,Math.PI*.85); ctx.stroke();
          ctx.fillStyle='rgba(255,100,100,.3)';
          ctx.beginPath(); ctx.arc(cx-s*.43,cy+s*.05,s*.09,0,Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(cx+s*.43,cy+s*.05,s*.09,0,Math.PI*2); ctx.fill();
        }
      }

      function drawCar(c) {
        const sc = c.popT < 0 ? 0 : Math.min(1, springPop(Math.min(1, c.popT)));
        if (sc <= 0.02) return;
        const isCool = c.state === 'cooldown', isReset = c.state === 'resetting';
        const faceMode = c.cryT > 0 ? 'cry' : 'happy';

        ctx.save();
        ctx.translate(c.x, c.y);
        if (isReset) ctx.globalAlpha = Math.sin(Date.now()/60) > .2 ? .9 : .4;
        if (isCool)  ctx.globalAlpha = .45 + .35*Math.sin(Date.now()/120);

        ctx.rotate(c.angle + Math.PI/2);
        ctx.scale(sc, sc);

        // shadow
        ctx.fillStyle='rgba(0,0,0,.38)';
        ctx.beginPath(); ctx.ellipse(3,CAR_RY+5,CAR_RX*.9,6,0,0,Math.PI*2); ctx.fill();

        // bumper ring
        ctx.strokeStyle=c.col; ctx.lineWidth=5;
        const prevAlpha = ctx.globalAlpha;
        ctx.globalAlpha=prevAlpha*.55;
        ctx.beginPath(); ctx.ellipse(0,0,BUMP_R,BUMP_R*.76,0,0,Math.PI*2); ctx.stroke();
        ctx.globalAlpha=isCool||isReset ? prevAlpha*.6 : 1;

        // body
        ctx.fillStyle=c.dark; ctx.beginPath(); ctx.ellipse(0,1,CAR_RX,CAR_RY,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=c.col;  ctx.beginPath(); ctx.ellipse(0,-1,CAR_RX,CAR_RY,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='rgba(255,255,255,.14)';
        ctx.beginPath(); ctx.ellipse(-4,-6,CAR_RX*.5,CAR_RY*.38,-.2,0,Math.PI*2); ctx.fill();

        ctx.globalAlpha=1;
        drawFace(2, -1, 5.2, faceMode, c.cryT);

        // LED strip
        const ledY = CAR_RY - 2;
        for(let li=-3;li<=3;li++){
          const br = isCool ? .25 : .6+.4*Math.abs(Math.sin(Date.now()/200+li*.5));
          ctx.globalAlpha=br; ctx.fillStyle=c.led;
          ctx.beginPath(); ctx.arc(li*3.2,ledY,1.6,0,Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha=1;

        // headlights
        ctx.fillStyle='rgba(255,255,220,.9)';
        ctx.beginPath(); ctx.ellipse(CAR_RX-4,-5,4,2.8,-.25,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(CAR_RX-4,5,4,2.8,.25,0,Math.PI*2); ctx.fill();

        // cooldown bar
        if (isCool) {
          const bW=36, bH=4, fill=c.cooldown/COOLDOWN;
          ctx.fillStyle='rgba(0,0,0,.55)'; ctx.beginPath(); ctx.roundRect(-bW/2,-CAR_RY-14,bW,bH,2); ctx.fill();
          ctx.fillStyle='#60aaff';         ctx.beginPath(); ctx.roundRect(-bW/2,-CAR_RY-14,bW*fill,bH,2); ctx.fill();
        }

        ctx.restore();

        // name tag
        if (sc > .5 && !isReset) {
          ctx.save();
          ctx.font='bold 10px Quicksand,sans-serif'; ctx.textAlign='center';
          const label = isCool ? c.name+' 😭' : c.name;
          const tw = ctx.measureText(label).width+10;
          ctx.fillStyle='rgba(0,0,0,.72)';
          ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(c.x-tw/2,c.y-CAR_RY*sc-18,tw,14,3); else ctx.rect(c.x-tw/2,c.y-CAR_RY*sc-18,tw,14);
          ctx.fill();
          ctx.fillStyle = isCool ? '#888' : c.col;
          ctx.fillText(label, c.x, c.y-CAR_RY*sc-7);
          ctx.restore();
        }
      }

      function drawFX() {
        shockwaves.forEach(s => {
          ctx.globalAlpha=s.life*.45; ctx.strokeStyle=s.col; ctx.lineWidth=3;
          ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.stroke();
          ctx.globalAlpha=s.life*.18; ctx.strokeStyle='#fff'; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.arc(s.x,s.y,s.r*.65,0,Math.PI*2); ctx.stroke();
          ctx.globalAlpha=1;
        });
        particles.forEach(p => {
          const al=Math.max(0,p.life);
          if(p.type==='text'){
            ctx.globalAlpha=al; ctx.font=`bold ${Math.round(13+al*6)}px sans-serif`; ctx.textAlign='center';
            ctx.strokeStyle='#000'; ctx.lineWidth=3; ctx.strokeText(p.text,p.x,p.y);
            ctx.fillStyle='#fff'; ctx.fillText(p.text,p.x,p.y);
            ctx.globalAlpha=1; return;
          }
          ctx.globalAlpha=al*.88; ctx.fillStyle=p.col;
          if(p.type==='star'){
            ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.life*9);
            ctx.beginPath();
            for(let si=0;si<5;si++){const a1=si*2*Math.PI/5-Math.PI/2,a2=(si+.5)*2*Math.PI/5-Math.PI/2;ctx.lineTo(Math.cos(a1)*p.r,Math.sin(a1)*p.r);ctx.lineTo(Math.cos(a2)*p.r*.42,Math.sin(a2)*p.r*.42);}
            ctx.closePath(); ctx.fill(); ctx.restore();
          } else {
            ctx.beginPath(); ctx.arc(p.x,p.y,p.r*Math.max(.2,al),0,Math.PI*2); ctx.fill();
          }
          ctx.globalAlpha=1;
        });
      }

      // ── broadcast ──────────────────────────────────────────
      function broadcastState() {
        if (!isHost || isLocal) return;
        api.send('state', {
          cars: cars.map(c=>({ id:c.id, x:c.x, y:c.y, angle:c.angle, state:c.state, cryT:c.cryT, cooldown:c.cooldown })),
          scores, timeLeft, gameOver
        });
      }

      // ── sidebar ────────────────────────────────────────────
      function updateSidebar(sbEl, crs, sc) {
        const sorted = [...crs].sort((a,b)=>(sc[b.id]||0)-(sc[a.id]||0));
        sbEl.innerHTML = `<div style="font-family:Fredoka One,sans-serif;color:#e8e0d0;font-size:.82rem;text-align:center;margin-bottom:8px;letter-spacing:.5px;">SCORES</div>`
          + sorted.map(c=>`<div style="display:flex;align-items:center;gap:5px;padding:4px 5px;margin-bottom:3px;border-radius:6px;background:#161616;border-left:3px solid ${c.col};">
              <div style="color:${c.col};font-size:.7rem;font-weight:700;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.name}</div>
              <div style="color:#ffd700;font-size:.8rem;font-weight:700;">${sc[c.id]||0}</div>
            </div>`).join('')
          + `<div style="margin-top:10px;border-top:1px solid #1e1e1e;padding-top:7px;text-align:center;">
              <div style="color:#444;font-size:.6rem;letter-spacing:1px;margin-bottom:2px;">ROOM</div>
              <div style="color:#e8e0d0;font-size:.95rem;letter-spacing:3px;font-weight:700;">BUMP</div>
            </div>`;
      }

      // ── timer ─────────────────────────────────────────────
      function updateTimerEl() {
        const el = document.getElementById('bcar-timer'); if (!el) return;
        const m = Math.floor(timeLeft/60), s = timeLeft%60;
        el.textContent = `${m}:${String(s).padStart(2,'0')}`;
        el.style.color = timeLeft <= 10 ? '#ff3b30' : '#fff';
      }

      // ── countdown ─────────────────────────────────────────
      function runCD(n, onDone) {
        cdEl.innerHTML = '';
        if (n === 0) {
          cdEl.innerHTML='<div style="font-family:Fredoka One,sans-serif;font-size:clamp(40px,12vw,90px);color:#00e676;text-shadow:0 0 50px #00e676;animation:bcPop .5s both;">GO!</div>';
          cdTimer=setTimeout(()=>{ cdEl.innerHTML=''; onDone(); },700); return;
        }
        cdEl.innerHTML=`<div style="font-family:Fredoka One,sans-serif;font-size:clamp(50px,15vw,110px);color:#fff;text-shadow:0 0 50px rgba(255,255,255,.4);animation:bcPop .7s both;">${n}</div>`;
        cdTimer=setTimeout(()=>runCD(n-1,onDone), 900);
      }

      // ── game loop ──────────────────────────────────────────
      function loop(ts) {
        rafId = requestAnimationFrame(loop);
        if (!W || !H) return;
        const dt = Math.min((ts - lastTs) / 1000, .05); lastTs = ts;
        if (!gameOver && isHost) physStep(dt);
        ctx.clearRect(0,0,W,H);
        drawFloor(); drawRail();
        cars.forEach(drawCar);
        drawFX();
      }
      lastTs = performance.now();
      rafId = requestAnimationFrame(loop);

      // ── timer tick (host only) ─────────────────────────────
      if (isHost) {
        runCD(3, () => {
          tickTimer = setInterval(() => {
            if (gameOver) return;
            timeLeft = Math.max(0, timeLeft - 1);
            updateTimerEl();
            updateSidebar(sb, cars, scores);
            broadcastState();
            if (timeLeft <= 0) {
              gameOver = true;
              clearInterval(tickTimer);
              broadcastState();
              showWin(winEl, cars, scores);
            }
          }, 1000);
        });
      }

      // ── network ────────────────────────────────────────────
      api.on('input', (data, from) => {
        if (!isHost) return;
        const p = data.payload || data;
        inputMap[from] = p;
      });

      api.on('state', (data) => {
        if (isHost) return;
        const s = data.payload || data;
        if (s.cars) {
          s.cars.forEach(sc2 => {
            const c = cars.find(x=>x.id===sc2.id); if(!c) return;
            c.x=sc2.x; c.y=sc2.y; c.angle=sc2.angle; c.state=sc2.state; c.cryT=sc2.cryT; c.cooldown=sc2.cooldown;
          });
        }
        if (s.scores) Object.assign(scores, s.scores);
        if (s.timeLeft !== undefined) { timeLeft = s.timeLeft; updateTimerEl(); }
        if (s.gameOver && !gameOver) { gameOver=true; showWin(winEl,cars,scores); }
        updateSidebar(sb, cars, scores);
      });

      function showWin(el, crs, sc) {
        const sorted=[...crs].sort((a,b)=>(sc[b.id]||0)-(sc[a.id]||0));
        const top=sorted[0], medals=['🥇','🥈','🥉'];
        el.style.display='flex';
        el.innerHTML=`<div style="font-family:Fredoka One,sans-serif;font-size:clamp(22px,6vw,52px);color:${top.col};text-shadow:0 0 40px ${top.col}88;text-align:center;">🏆 ${top.name} WINS!</div>`
          +`<div style="display:flex;gap:7px;flex-wrap:wrap;justify-content:center;">`
          +sorted.map((c,ri)=>`<div style="padding:4px 10px;border-radius:8px;background:${c.col}22;border:1px solid ${c.col}44;color:${c.col};font-size:.75rem;font-weight:700;">${medals[ri]||`${ri+1}.`} ${c.name} — ${sc[c.id]||0} pts</div>`).join('')
          +`</div>`;
      }
    }

    // ════════════════════════════════════════
    //  GUEST CONTROLLER VIEW  — full-screen phone layout
    //  Matches RC Soccer: joystick left, bump right, info centre
    // ════════════════════════════════════════
    function startController(players) {
      stopAll();
      root.innerHTML = '';

      const myIdx = players.findIndex(p => p.id === me.id);
      const def   = CAR_DEFS[myIdx >= 0 ? myIdx % CAR_DEFS.length : 0];
      const col   = def.col;

      // ── root becomes the full controller screen ────────────
      root.style.cssText = [
        'width:100%;height:100%;position:relative;overflow:hidden;',
        'background:#070710;',
        'display:flex;flex-direction:column;',
        'font-family:Quicksand,sans-serif;',
        'user-select:none;-webkit-user-select:none;',
      ].join('');

      // ── top info bar ───────────────────────────────────────
      const topBar = document.createElement('div');
      topBar.style.cssText = [
        'display:flex;align-items:center;justify-content:space-between;',
        'padding:10px 18px 6px;flex-shrink:0;',
        'background:rgba(0,0,0,.6);backdrop-filter:blur(10px);',
        'border-bottom:1px solid rgba(255,255,255,.06);',
      ].join('');

      // car colour pill + name
      const carLabel = document.createElement('div');
      carLabel.style.cssText = [
        `color:${col};font-family:Fredoka One,sans-serif;font-size:1rem;`,
        'display:flex;align-items:center;gap:8px;',
      ].join('');
      carLabel.innerHTML = `<div style="width:11px;height:11px;border-radius:50%;background:${col};box-shadow:0 0 8px ${col}88;flex-shrink:0;"></div>${def.name}`;

      // live rank / timer
      const rankEl = document.createElement('div');
      rankEl.id    = 'bcar-rank';
      rankEl.style.cssText = 'font-size:.8rem;color:#555;font-weight:700;text-align:right;';
      rankEl.textContent   = 'Waiting for host…';

      topBar.appendChild(carLabel);
      topBar.appendChild(rankEl);
      root.appendChild(topBar);

      // ── controller area — fills remaining height ───────────
      const ctrlArea = document.createElement('div');
      ctrlArea.style.cssText = [
        'flex:1;display:flex;align-items:center;justify-content:space-between;',
        'padding:0 28px;gap:0;position:relative;',
      ].join('');
      root.appendChild(ctrlArea);

      // ── LEFT: joystick (identical sizing logic to RC Soccer) ─
      const JOY_S  = 90;   // outer circle diameter
      const KNOB_S = 36;   // knob diameter
      const MAX_D  = 28;   // max drag pixels

      const joyWrap = document.createElement('div');
      joyWrap.style.cssText = [
        `width:${JOY_S}px;height:${JOY_S}px;border-radius:50%;`,
        'background:radial-gradient(circle at 35% 30%,#2a2a2a,#0c0c0c);',
        'border:2px solid #333;position:relative;cursor:pointer;touch-action:none;',
        'flex-shrink:0;box-shadow:0 4px 18px rgba(0,0,0,.8);',
      ].join('');

      const knob = document.createElement('div');
      knob.style.cssText = [
        `width:${KNOB_S}px;height:${KNOB_S}px;border-radius:50%;`,
        'background:radial-gradient(circle at 35% 30%,#666,#1e1e1e);',
        'border:1px solid #444;position:absolute;top:50%;left:50%;',
        'transform:translate(-50%,-50%);pointer-events:none;transition:transform .07s;',
      ].join('');
      joyWrap.appendChild(knob);

      // ── CENTRE: player dot + label ─────────────────────────
      const centreInfo = document.createElement('div');
      centreInfo.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px;flex-shrink:0;';
      centreInfo.innerHTML = [
        `<div style="width:14px;height:14px;border-radius:50%;background:${col};`,
        `box-shadow:0 0 12px ${col}99;"></div>`,
        `<div style="color:${col};font-size:.65rem;font-weight:700;letter-spacing:1.5px;">P${myIdx + 1}</div>`,
      ].join('');

      // ── RIGHT: boost button (same raised-disc style as RC Soccer bump) ─
      const BTN_S = 80;
      const boostBtn = document.createElement('div');
      boostBtn.style.cssText = [
        `width:${BTN_S}px;height:${BTN_S}px;border-radius:50%;`,
        `background:radial-gradient(circle at 38% 32%,${col}ee,${col}66);`,
        `border:2px solid ${col}44;`,
        `box-shadow:0 6px 0 rgba(0,0,0,.65),0 0 22px ${col}44;`,
        'cursor:pointer;flex-shrink:0;touch-action:none;',
        'transition:transform .06s,box-shadow .06s;',
        'display:flex;align-items:center;justify-content:center;',
        'font-size:1.8rem;',
      ].join('');
      boostBtn.textContent = '🚀';

      ctrlArea.appendChild(joyWrap);
      ctrlArea.appendChild(centreInfo);
      ctrlArea.appendChild(boostBtn);

      // ── hint strip at very bottom ──────────────────────────
      const hint = document.createElement('div');
      hint.style.cssText = [
        'text-align:center;font-size:.62rem;color:#2a2a2a;',
        'padding:6px 0 10px;flex-shrink:0;',
      ].join('');
      hint.textContent = 'drag joystick to steer  ·  tap 🚀 for boost';
      root.appendChild(hint);

      // ── joystick interaction ───────────────────────────────
      let drag = false, ox = 0, oy = 0;
      const inp = { axisX: 0, axisY: 0, boost: false };

      function sendInp() { api.send('input', { ...inp }); }

      function startDrag(cx, cy) {
        drag = true;
        const r = joyWrap.getBoundingClientRect();
        ox = r.left + r.width  / 2;
        oy = r.top  + r.height / 2;
        moveDrag(cx, cy);
      }
      function moveDrag(cx, cy) {
        if (!drag) return;
        let dx = cx - ox, dy = cy - oy;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > MAX_D) { dx = dx / d * MAX_D; dy = dy / d * MAX_D; }
        knob.style.transform = `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
        inp.axisX = dx / MAX_D;
        inp.axisY = dy / MAX_D;
        sendInp();
      }
      function endDrag() {
        drag = false;
        knob.style.transform = 'translate(-50%,-50%)';
        inp.axisX = 0; inp.axisY = 0;
        sendInp();
      }

      joyWrap.addEventListener('mousedown',  e => { e.preventDefault(); startDrag(e.clientX, e.clientY); });
      joyWrap.addEventListener('touchstart', e => { e.preventDefault(); startDrag(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });

      const onMM = e => moveDrag(e.clientX, e.clientY);
      const onTM = e => { e.preventDefault(); moveDrag(e.touches[0].clientX, e.touches[0].clientY); };
      document.addEventListener('mousemove',  onMM);
      document.addEventListener('touchmove',  onTM, { passive: false });
      document.addEventListener('mouseup',    endDrag);
      document.addEventListener('touchend',   endDrag);
      evCleaners.push(() => {
        document.removeEventListener('mousemove',  onMM);
        document.removeEventListener('touchmove',  onTM);
        document.removeEventListener('mouseup',    endDrag);
        document.removeEventListener('touchend',   endDrag);
      });

      // ── boost button interaction ───────────────────────────
      const boostDown = () => {
        inp.boost = true;
        boostBtn.style.transform   = 'translateY(5px)';
        boostBtn.style.boxShadow   = `0 1px 0 rgba(0,0,0,.65),0 0 8px ${col}44`;
        sendInp();
      };
      const boostUp = () => {
        inp.boost = false;
        boostBtn.style.transform   = '';
        boostBtn.style.boxShadow   = `0 6px 0 rgba(0,0,0,.65),0 0 22px ${col}44`;
        sendInp();
      };
      boostBtn.addEventListener('mousedown',  e => { e.preventDefault(); boostDown(); });
      boostBtn.addEventListener('touchstart', e => { e.preventDefault(); boostDown(); }, { passive: false });
      boostBtn.addEventListener('mouseup',    boostUp);
      boostBtn.addEventListener('touchend',   boostUp);
      boostBtn.addEventListener('mouseleave', boostUp);

      // ── receive host state — update rank strip ─────────────
      api.on('state', (data) => {
        const s = data.payload || data;
        if (!s.scores || !s.cars) return;
        const sorted = [...s.cars].sort((a, b) => (s.scores[b.id] || 0) - (s.scores[a.id] || 0));
        const rank   = sorted.findIndex(c => c.id === me.id) + 1;
        const myPts  = s.scores[me.id] || 0;
        const tl     = s.timeLeft !== undefined ? s.timeLeft : 0;
        const mm     = Math.floor(tl / 60), ss = tl % 60;
        rankEl.style.color = '#aaa';
        rankEl.textContent = `#${rank}  ·  ${myPts} pts  ·  ${mm}:${String(ss).padStart(2, '0')}`;
        if (s.gameOver) {
          carLabel.textContent = '🏁 Game Over!';
          carLabel.style.color = '#888';
        }
      });
    }

    // ════════════════════════════════════════
    //  ENTRY POINT
    // ════════════════════════════════════════
    const players = api.getPlayers();
    if (isHost || isLocal) {
      startArena(players);
      if (!isLocal) {
        // tell guests to show controller
        api.send('init', { players: players.map(p=>({id:p.id,name:p.name})) });
      }
    } else {
      startController(players);
      api.on('init', (data) => {
        const p = data.payload || data;
        startController(p.players || players);
      });
    }

    return {
      destroy() {
        stopAll();
        root.remove();
      }
    };
  }
};
