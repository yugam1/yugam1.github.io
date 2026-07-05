// ─── BOT BUMPER CARS — Party Arena (3D TPP port of FPG) ──────────────────────
// Physics: exact port of server/index.js  |  Renderer: Three.js TPP on every device

const ARENA = { w:1400, h:900, bumpers:[{x:350,y:450,r:55},{x:700,y:450,r:65},{x:1050,y:450,r:55}] };
const CAR_COLORS = [
  {name:'Red',    body:'#e8312a',light:'#ff7a72',dark:'#9e1a15'},
  {name:'Blue',   body:'#3b8ecf',light:'#6bb8f5',dark:'#1a5c9e'},
  {name:'Green',  body:'#2eaa4a',light:'#55dd77',dark:'#1a7030'},
  {name:'Yellow', body:'#d4a824',light:'#f5d04a',dark:'#9e7510'},
  {name:'Orange', body:'#d45a18',light:'#f5824a',dark:'#9e3a08'},
  {name:'Purple', body:'#7b3dbf',light:'#b06ae0',dark:'#4e2080'},
];
const SPEED=6, TURN_SPEED=0.055, FRICTION=0.87, ANG_FRICTION=0.78;
const CW=1.0, CH=0.45, CL=1.6, SCALE=0.01;
const TPP_BEHIND=3.2, TPP_HEIGHT=1.6, CAM_LERP=0.12, LOOK_LERP=0.18;

function ensureThree() {
  if (window.THREE) return Promise.resolve(window.THREE);
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    s.onload = () => res(window.THREE); s.onerror = rej;
    document.head.appendChild(s);
  });
}

function ensureCSS() {
  if (document.getElementById('bc3-css')) return;
  const lnk = document.createElement('link'); lnk.rel='stylesheet';
  lnk.href='https://fonts.googleapis.com/css2?family=Boogaloo&family=Nunito:wght@700;900&display=swap';
  document.head.appendChild(lnk);
  const s = document.createElement('style'); s.id='bc3-css';
  s.textContent=`
.bc3{position:absolute;inset:0;background:#0d0d1a;overflow:hidden;font-family:'Nunito',sans-serif;color:#fff;user-select:none;-webkit-user-select:none;touch-action:none;}
.bc3-scr{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;padding:24px;overflow-y:auto;z-index:10;}
.bc3-scr.on{display:flex;}
.bc3-scr[data-s=game].on{display:block;padding:0;}
.bc3-logo{font-family:'Boogaloo',cursive;font-size:clamp(32px,10vw,64px);text-align:center;letter-spacing:2px;margin-bottom:8px;}
.bc3-sub{font-size:14px;color:rgba(255,255,255,0.5);text-align:center;line-height:1.5;}
.bc3-btn{font-family:'Boogaloo',cursive;font-size:22px;letter-spacing:2px;padding:14px 44px;border-radius:14px;border:none;background:linear-gradient(135deg,#e8312a,#b01a14);color:#fff;cursor:pointer;box-shadow:0 6px 24px rgba(232,49,42,0.4);text-transform:uppercase;touch-action:manipulation;margin-top:12px;}
.bc3-btn:active{transform:scale(0.96);}
.bc3-plist{width:100%;max-width:340px;display:flex;flex-direction:column;gap:8px;margin:12px 0;}
.bc3-prow{display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.06);border-radius:12px;padding:10px 14px;border:1px solid rgba(255,255,255,0.08);}
.bc3-dot{width:14px;height:14px;border-radius:50%;flex-shrink:0;}
.bc3-pname{font-family:'Boogaloo',cursive;font-size:18px;flex:1;}
.bc3-you{font-size:11px;color:rgba(255,255,255,0.4);background:rgba(255,255,255,0.08);padding:2px 8px;border-radius:6px;}
.bc3-hchip{font-size:11px;background:rgba(255,200,0,0.2);color:#ffd700;padding:2px 8px;border-radius:6px;}
.bc3-bo-row{display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px;font-size:13px;color:rgba(255,255,255,0.5);}
.bc3-bo-btn{font-family:'Boogaloo',cursive;font-size:16px;padding:6px 16px;border-radius:10px;border:2px solid rgba(255,255,255,0.2);background:transparent;color:rgba(255,255,255,0.5);cursor:pointer;touch-action:manipulation;}
.bc3-bo-btn.on{border-color:#6bb8f5;color:#6bb8f5;background:rgba(107,184,245,0.12);}
.bc3-mp{font-size:13px;color:rgba(255,255,255,0.5);margin-bottom:4px;text-align:center;}
.bc3-mpdot{width:10px;height:10px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);display:inline-block;margin:0 2px;}
.bc3-mpdot.f{border-color:transparent;}
.bc3-badge{width:80px;height:80px;border-radius:50%;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-size:36px;border:3px solid rgba(255,255,255,0.2);}
.bc3-cd{font-family:'Boogaloo',cursive;font-size:140px;line-height:1;text-shadow:0 0 60px rgba(255,200,0,0.5);}
@keyframes bc3pop{0%{transform:scale(2);opacity:0}40%{opacity:1}100%{transform:scale(1);opacity:1}}
.bc3-pop{animation:bc3pop 0.7s ease-out;}
.bc3-cvs{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;}
.bc3-hud{position:absolute;top:0;left:0;right:0;display:flex;justify-content:space-between;align-items:flex-start;padding:10px 12px;pointer-events:none;z-index:20;}
.bc3-hbox{background:rgba(0,0,0,0.55);backdrop-filter:blur(8px);border-radius:10px;padding:6px 10px;}
.bc3-hctr{text-align:center;}
.bc3-slbl{font-size:9px;letter-spacing:1px;opacity:0.5;}
.bc3-sval{font-family:'Boogaloo',cursive;font-size:22px;}
.bc3-alive{font-family:'Boogaloo',cursive;font-size:16px;}
.bc3-rnd{font-family:'Boogaloo',cursive;font-size:12px;letter-spacing:1px;opacity:0.75;margin-top:2px;}
.bc3-stats{font-size:11px;line-height:1.8;text-align:right;}
.bc3-stats b{font-size:14px;}
.bc3-kf{position:absolute;bottom:175px;left:50%;transform:translateX(-50%);z-index:20;pointer-events:none;display:flex;flex-direction:column;align-items:center;gap:4px;width:90%;}
.bc3-ke{background:rgba(0,0,0,0.72);backdrop-filter:blur(4px);border-radius:8px;padding:5px 14px;font-family:'Boogaloo',cursive;font-size:14px;letter-spacing:0.5px;border:1px solid rgba(255,255,255,0.07);text-align:center;animation:bc3kf 3.2s ease-out forwards;}
@keyframes bc3kf{0%{opacity:0;transform:translateY(6px)}12%{opacity:1;transform:translateY(0)}75%{opacity:1}100%{opacity:0}}
.bc3-touch{position:absolute;bottom:0;left:0;right:0;height:155px;z-index:20;pointer-events:none;display:flex;align-items:flex-end;justify-content:space-between;padding:0 16px 14px;}
.bc3-gl{display:flex;flex-direction:column;gap:8px;pointer-events:all;}
.bc3-gr{display:flex;flex-direction:row;gap:8px;align-items:flex-end;pointer-events:all;}
.bc3-db{width:66px;height:66px;border-radius:16px;border:2px solid rgba(255,255,255,0.18);background:rgba(0,0,0,0.58);backdrop-filter:blur(6px);color:rgba(255,255,255,0.88);font-size:26px;cursor:pointer;touch-action:manipulation;display:flex;align-items:center;justify-content:center;user-select:none;-webkit-user-select:none;transition:background .06s,transform .06s;}
.bc3-db.pr,.bc3-db:active{background:rgba(255,255,255,0.22);transform:scale(0.91);}
.bc3-cam{position:absolute;top:10px;left:12px;z-index:30;width:38px;height:38px;border-radius:10px;border:1px solid rgba(255,255,255,0.15);background:rgba(0,0,0,0.55);backdrop-filter:blur(8px);color:rgba(255,255,255,0.75);font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;touch-action:manipulation;}
.bc3-sens{position:absolute;top:10px;right:12px;z-index:25;display:flex;align-items:center;gap:7px;background:rgba(0,0,0,0.55);backdrop-filter:blur(8px);border-radius:10px;padding:6px 10px;border:1px solid rgba(255,255,255,0.13);}
.bc3-sens input{width:80px;accent-color:rgba(107,184,245,0.9);cursor:pointer;}
.bc3-cm .bc3-touch,.bc3-cm .bc3-hud,.bc3-cm .bc3-sens{display:none!important;}
.bc3-ej{background:radial-gradient(ellipse at 50% 40%,#3a1010,#0d0d1a 70%);}
@keyframes bc3bnc{0%{transform:scale(0) rotate(-15deg)}70%{transform:scale(1.2) rotate(5deg)}100%{transform:scale(1) rotate(0)}}
.bc3-res{background:radial-gradient(ellipse at 50% 30%,#102a10,#0d0d1a 70%);}
.bc3-lb{width:100%;max-width:360px;display:flex;flex-direction:column;gap:8px;margin-top:16px;}
.bc3-lbr{display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.06);border-radius:12px;padding:10px 14px;border:1px solid rgba(255,255,255,0.08);}
.bc3-lbm{font-size:22px;width:28px;text-align:center;}
.bc3-lbn{font-family:'Boogaloo',cursive;font-size:18px;flex:1;}
.bc3-lbs{font-size:11px;text-align:right;color:rgba(255,255,255,0.6);line-height:1.6;}
.bc3-lbs b{color:#fff;}
.bc3-msbar{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin:6px 0 12px;}
.bc3-mse{display:flex;flex-direction:column;align-items:center;gap:4px;}
.bc3-msn{font-family:'Boogaloo',cursive;font-size:13px;}
.bc3-msdots{display:flex;gap:4px;}
.bc3-msd{width:12px;height:12px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);}
.bc3-msd.f{border-color:transparent;}
`;
  document.head.appendChild(s);
}

function getSpawn(index, total) {
  const cx=ARENA.w/2, cy=ARENA.h/2, r=Math.min(ARENA.w,ARENA.h)*0.3, n=Math.max(total,2);
  const a=(index/n)*Math.PI*2-Math.PI/2;
  return { x:cx+Math.cos(a)*r, y:cy+Math.sin(a)*r, angle:a+Math.PI };
}

function makeCarMesh(col, T) {
  const g=new T.Group();
  const bm=new T.MeshLambertMaterial({color:new T.Color(col.body)});
  const dm=new T.MeshLambertMaterial({color:new T.Color(col.dark)});
  const wm=new T.MeshBasicMaterial({color:0x222222});
  const hlm=new T.MeshBasicMaterial({color:0xffffcc});
  const tlm=new T.MeshBasicMaterial({color:0xff2200});
  const body=new T.Mesh(new T.BoxGeometry(CW,CH,CL),bm); body.position.y=CH/2+0.08; g.add(body);
  const ck=new T.Mesh(new T.CylinderGeometry(0.28,0.34,0.30,8),dm); ck.position.set(0,CH+0.22,-0.15); g.add(ck);
  const hlg=new T.SphereGeometry(0.07,5,4);
  [-0.36,0.36].forEach(hx=>{const h=new T.Mesh(hlg,hlm);h.position.set(hx,CH*0.4+0.08,-CL/2-0.04);g.add(h);});
  const tlg=new T.BoxGeometry(0.18,0.09,0.05);
  [-0.36,0.36].forEach(tx=>{const t=new T.Mesh(tlg,tlm);t.position.set(tx,CH*0.5+0.08,CL/2+0.03);g.add(t);});
  const wg=new T.CylinderGeometry(0.18,0.18,0.14,10);
  const fw=[];
  [[-CW/2-0.07,0.18,-CL*0.35],[CW/2+0.07,0.18,-CL*0.35]].forEach(([wx,wy,wz])=>{
    const sg=new T.Group(); sg.position.set(wx,wy,wz); g.add(sg);
    const w=new T.Mesh(wg,wm); w.rotation.z=Math.PI/2; sg.add(w); fw.push(sg);
  });
  [[-CW/2-0.07,0.18,CL*0.35],[CW/2+0.07,0.18,CL*0.35]].forEach(([wx,wy,wz])=>{
    const w=new T.Mesh(wg,wm); w.rotation.z=Math.PI/2; w.position.set(wx,wy,wz); g.add(w);
  });
  return {group:g, frontWheels:fw};
}

function buildArena(scene, T) {
  const fl=new T.Mesh(new T.PlaneGeometry(ARENA.w*SCALE*1.5,ARENA.h*SCALE*1.5),new T.MeshBasicMaterial({color:0x1a1a2e}));
  fl.rotation.x=-Math.PI/2; scene.add(fl);
  scene.add(new T.GridHelper(ARENA.w*SCALE,14,0x252538,0x252538));
  const wm=new T.MeshBasicMaterial({color:0x3a3a5a}), wh=0.6;
  [{w:ARENA.w*SCALE,d:0.1,x:0,z:-ARENA.h*SCALE*0.5},{w:ARENA.w*SCALE,d:0.1,x:0,z:ARENA.h*SCALE*0.5},
   {w:0.1,d:ARENA.h*SCALE,x:-ARENA.w*SCALE*0.5,z:0},{w:0.1,d:ARENA.h*SCALE,x:ARENA.w*SCALE*0.5,z:0}].forEach(wd=>{
    const m=new T.Mesh(new T.BoxGeometry(wd.w,wh,wd.d),wm); m.position.set(wd.x,wh/2,wd.z); scene.add(m);
    const e=new T.Mesh(new T.BoxGeometry(wd.w+0.01,0.06,wd.d+0.01),new T.MeshBasicMaterial({color:0xe8312a}));
    e.position.set(wd.x,wh-0.03,wd.z); scene.add(e);
  });
  const bms=[];
  ARENA.bumpers.forEach(b=>{
    const bx=(b.x-ARENA.w/2)*SCALE, bz=(b.y-ARENA.h/2)*SCALE, r=b.r*SCALE;
    const m=new T.Mesh(new T.CylinderGeometry(r,r*1.1,0.7,10),new T.MeshLambertMaterial({color:0x4a4a7a}));
    m.position.set(bx,0.35,bz); scene.add(m); bms.push(m);
    const c=new T.Mesh(new T.CylinderGeometry(r*0.6,r*0.6,0.08,10),new T.MeshBasicMaterial({color:0x6b9fff}));
    c.position.set(bx,0.74,bz); scene.add(c);
  });
  scene.add(new T.AmbientLight(0x404060,1.2));
  const dir=new T.DirectionalLight(0xffffff,0.6); dir.position.set(5,10,5); scene.add(dir);
  return bms;
}

// ── physics helpers ───────────────────────────────────────────────────────────
function tickPhysics(players) {
  const ejectEvents=[];
  for (const p of players) {
    if (p.ejecting) {
      p.ejectProgress++;
      if (p.ejectProgress>90) { p.ejecting=false; p.alive=false; }
      continue;
    }
    if (!p.alive) continue;
    if (p.hitCooldown>0) p.hitCooldown--;
    const {up,down,steer=0}=p.input||{};
    const cos=Math.cos(p.angle), sin=Math.sin(p.angle);
    const thrust=up?SPEED:down?-SPEED*0.6:0;
    if (thrust!==0) { p.vx+=cos*thrust*0.2; p.vy+=sin*thrust*0.2; }
    if (steer!==0) { const sp=Math.hypot(p.vx,p.vy),sf=0.25+Math.min(0.75,sp*0.28); p.va+=steer*TURN_SPEED*sf; }
    p.va*=ANG_FRICTION; p.angle+=p.va;
    p.vx*=FRICTION; p.vy*=FRICTION;
    const sp=Math.hypot(p.vx,p.vy),mx=SPEED*1.3;
    if (sp>mx) { p.vx=p.vx/sp*mx; p.vy=p.vy/sp*mx; }
    p.x+=p.vx; p.y+=p.vy;
    const mg=60;
    if(p.x<mg){p.x=mg;p.vx*=-0.6;} if(p.x>ARENA.w-mg){p.x=ARENA.w-mg;p.vx*=-0.6;}
    if(p.y<mg){p.y=mg;p.vy*=-0.6;} if(p.y>ARENA.h-mg){p.y=ARENA.h-mg;p.vy*=-0.6;}
    for(let ps=0;ps<3;ps++) {
      for(const b of ARENA.bumpers) {
        const dx=p.x-b.x,dy=p.y-b.y,dist=Math.hypot(dx,dy),md=b.r+58;
        if(dist<md&&dist>0){const push=(md-dist)/dist;p.x+=dx*push;p.y+=dy*push;
          if(ps===0){const dot=p.vx*dx/dist+p.vy*dy/dist;if(dot<0){p.vx-=2*dot*dx/dist;p.vy-=2*dot*dy/dist;p.vx*=0.5;p.vy*=0.5;}}}
      }
    }
  }
  const active=players.filter(p=>p.alive&&!p.ejecting);
  for(let ps=0;ps<2;ps++) for(let i=0;i<active.length;i++) for(let j=i+1;j<active.length;j++) {
    const ev=resolveCollision(active[i],active[j]); if(ev) ejectEvents.push(ev);
  }
  return ejectEvents;
}

function resolveCollision(a,b) {
  const dx=b.x-a.x,dy=b.y-a.y,dist=Math.hypot(dx,dy),md=90;
  if(dist>=md||dist<0.01) return null;
  const nx=dx/dist,ny=dy/dist,ov=md-dist;
  a.x-=nx*ov*0.5;a.y-=ny*ov*0.5;b.x+=nx*ov*0.5;b.y+=ny*ov*0.5;
  const rv=((a.vx-b.vx)*nx+(a.vy-b.vy)*ny);
  if(rv>0){const imp=rv*0.65;a.vx-=imp*nx;a.vy-=imp*ny;b.vx+=imp*nx;b.vy+=imp*ny;}
  if(a.hitCooldown===0&&b.hitCooldown===0){
    const aS=Math.hypot(a.vx,a.vy),bS=Math.hypot(b.vx,b.vy);
    const relX=a.x-b.x,relY=a.y-b.y;
    const bC=Math.cos(b.angle),bSn=Math.sin(b.angle);
    const bFwd=relX*bC+relY*bSn,bLat=-relX*bSn+relY*bC;
    if(Math.abs(bLat)>Math.abs(bFwd)*0.7&&Math.abs(bFwd)<56&&aS>2.5){
      if(b.ejecting||!b.alive)return null;
      b.ejecting=true;b.ejectProgress=0;b.hitsTaken++;a.kills++;b.hitCooldown=120;a.hitCooldown=60;
      return {victimSlot:b.slot,killerSlot:a.slot};
    }
    const aC=Math.cos(a.angle),aSn=Math.sin(a.angle);
    const aFwd=-(relX*aC+relY*aSn),aLat=relX*aSn-relY*aC;
    if(Math.abs(aLat)>Math.abs(aFwd)*0.7&&Math.abs(aFwd)<56&&bS>2.5){
      if(a.ejecting||!a.alive)return null;
      a.ejecting=true;a.ejectProgress=0;a.hitsTaken++;b.kills++;a.hitCooldown=120;b.hitCooldown=60;
      return {victimSlot:a.slot,killerSlot:b.slot};
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
export default {
  id: 'bumper-cars',
  name: 'Bumper Cars',

  create(container, api) {
    ensureCSS();
    const me=api.getMe(), isHost=api.isHost(), isLocal=api.isLocal();
    const evCleaners=[];
    let matchCfg={bestOf:3}, matchScores={}, currentRound=1;

    // ── root & screen manager ─────────────────────────────────────────────────
    const root=document.createElement('div'); root.className='bc3'; container.appendChild(root);
    const screens={};
    function mkScr(id,extra=''){
      const el=document.createElement('div');
      el.className='bc3-scr'+(extra?' '+extra:''); el.dataset.s=id;
      root.appendChild(el); screens[id]=el; return el;
    }
    function show(id){Object.values(screens).forEach(s=>s.classList.remove('on'));screens[id]?.classList.add('on');}

    // ── Three.js state ────────────────────────────────────────────────────────
    let T3=null, renderer=null, scene=null, camera=null;
    let carMeshes={}, bumperMeshes=[], rafId=null;
    let camP, lookV, _cT, _lT;
    let yawOff=0, camTouch=false, camRmb=false, steerSens=5, prevA={};
    let snap=[], mySlot=-1, myEjected=false;

    // ── lobby screen ──────────────────────────────────────────────────────────
    const lobbyScr=mkScr('lobby');
    lobbyScr.style.background='radial-gradient(ellipse at 50% 20%,#1a2a3f,#0d0d1a 70%)';
    lobbyScr.innerHTML=`
      <div class="bc3-logo"><span style="color:#fff">BOT</span> <span style="color:#ff7a72">BUMPER</span><br><span style="color:#6bb8f5">CARS</span></div>
      <div class="bc3-badge" id="bc3-badge">🚗</div>
      <div class="bc3-sub" style="margin-bottom:12px">You're in the arena!</div>
      <div class="bc3-plist" id="bc3-pl"></div>
      <div class="bc3-mp" id="bc3-mp"></div>
      <div id="bc3-la"></div>
      <div class="bc3-sub" id="bc3-ls" style="margin-top:12px;font-size:12px;opacity:0.4">Waiting for host to start…</div>`;

    function renderLobby(players, slot) {
      const badge=document.getElementById('bc3-badge');
      if(badge&&slot>=0) badge.style.background=CAR_COLORS[slot%6].body;
      const pl=document.getElementById('bc3-pl');
      if(pl) pl.innerHTML=players.map((p,i)=>{
        const c=CAR_COLORS[i%6];
        return `<div class="bc3-prow">
          <div class="bc3-dot" style="background:${c.body};box-shadow:0 0 8px ${c.body}"></div>
          <div class="bc3-pname" style="color:${c.light}">${p.name}</div>
          ${p.id===me.id?'<div class="bc3-you">YOU</div>':''}
          ${i===0?'<div class="bc3-hchip">HOST</div>':''}
        </div>`;
      }).join('');
      const mp=document.getElementById('bc3-mp');
      if(mp){
        const has=Object.values(matchScores).some(v=>v>0);
        mp.innerHTML=has?`<span style="opacity:0.4">Round ${currentRound-1} done &nbsp;|&nbsp;</span>`
          +players.map((p,i)=>{const c=CAR_COLORS[i%6],w=matchScores[i]||0;
            return `<span style="color:${c.light}">${c.name}</span> ${Array.from({length:matchCfg.bestOf},(_,di)=>`<span class="bc3-mpdot${di<w?' f':''}" style="${di<w?`background:${c.body}`:''}"></span>`).join('')}`;
          }).join(' &nbsp; '):'';
      }
      const la=document.getElementById('bc3-la');
      if(la&&isHost){
        const bo=matchCfg.bestOf, has=Object.values(matchScores).some(v=>v>0);
        la.innerHTML=`<div class="bc3-bo-row"><span>Best of:</span>
          <button class="bc3-bo-btn${bo===3?' on':''}" id="bc3-bo3">3</button>
          <button class="bc3-bo-btn${bo===5?' on':''}" id="bc3-bo5">5</button></div>`;
        document.getElementById('bc3-bo3')?.addEventListener('click',()=>{matchCfg.bestOf=3;api.send('cfg-sync',{matchCfg,matchScores,currentRound});renderLobby(players,slot);});
        document.getElementById('bc3-bo5')?.addEventListener('click',()=>{matchCfg.bestOf=5;api.send('cfg-sync',{matchCfg,matchScores,currentRound});renderLobby(players,slot);});
        if(players.length>=2||isLocal){
          const btn=document.createElement('button'); btn.className='bc3-btn';
          btn.textContent=has?`ROUND ${currentRound} — FIGHT`:'START BATTLE';
          btn.onclick=()=>hostStart(players); la.appendChild(btn);
          const ls=document.getElementById('bc3-ls'); if(ls) ls.textContent='Tap Start when everyone is ready!';
        }
      }
    }

    // ── countdown screen ──────────────────────────────────────────────────────
    const cdScr=mkScr('countdown'); cdScr.style.background='#0d0d1a';
    cdScr.innerHTML=`<div class="bc3-cd bc3-pop" id="bc3-cdn">3</div><div class="bc3-sub">Get ready!</div>`;
    function showCD(n){
      show('countdown');
      const el=document.getElementById('bc3-cdn');
      if(el){el.style.animation='none';void el.offsetWidth;el.style.animation='bc3pop 0.7s ease-out';el.textContent=n;}
    }

    // ── game screen ───────────────────────────────────────────────────────────
    const gameScr=mkScr('game');
    gameScr.innerHTML=`
      <canvas class="bc3-cvs" id="bc3-cvs"></canvas>
      <div class="bc3-hud">
        <div class="bc3-hbox"><div class="bc3-slbl">SPEED</div><div class="bc3-sval" id="bc3-spd">0</div></div>
        <div class="bc3-hbox bc3-hctr"><div class="bc3-alive" id="bc3-alive">🏁 — left</div><div class="bc3-rnd" id="bc3-rnd">R1</div></div>
        <div class="bc3-hbox"><div class="bc3-stats" id="bc3-stats">💀 0 kills<br>🌀 0 dodges</div></div>
      </div>
      <div class="bc3-kf" id="bc3-kf"></div>
      <div class="bc3-touch">
        <div class="bc3-gl"><button class="bc3-db" id="bc3-u">▲</button><button class="bc3-db" id="bc3-d">▼</button></div>
        <div class="bc3-gr"><button class="bc3-db" id="bc3-l">◀</button><button class="bc3-db" id="bc3-r">▶</button></div>
      </div>
      <button class="bc3-cam" id="bc3-cam">👁</button>
      <div class="bc3-sens"><span style="font-size:14px">↔</span><input type="range" id="bc3-sns" min="1" max="10" value="5"></div>`;
    document.getElementById('bc3-cam').onclick=()=>gameScr.classList.toggle('bc3-cm');
    document.getElementById('bc3-sns').addEventListener('input',e=>steerSens=+e.target.value);

    // ── ejected screen ────────────────────────────────────────────────────────
    const ejScr=mkScr('ejected','bc3-ej');
    ejScr.innerHTML=`
      <div style="font-size:80px;animation:bc3bnc 0.5s ease-out">💥</div>
      <div class="bc3-logo" style="font-size:40px;color:#ff6b63">EJECTED!</div>
      <div class="bc3-sub" id="bc3-ejby"></div>
      <div class="bc3-sub" style="margin-top:24px;opacity:0.5">Watching the rest of the battle…</div>
      <canvas id="bc3-spec" style="margin-top:20px;border-radius:12px;max-width:90%;max-height:38vh;display:block"></canvas>`;

    let specRdr=null, specRaf=null;
    function initSpectate(){
      const oldCv=document.getElementById('bc3-spec');
      if(!oldCv||specRdr||!scene) return;
      const cv=oldCv.cloneNode(false); oldCv.parentNode.replaceChild(cv,oldCv); // fresh canvas
      specRdr=new T3.WebGLRenderer({canvas:cv,antialias:false});
      cv.width=Math.min(window.innerWidth*0.85,480); cv.height=cv.width*0.6;
      specRdr.setSize(cv.width,cv.height);
      const sc=new T3.PerspectiveCamera(60,cv.width/cv.height,0.1,50);
      sc.position.set(0,12,0); sc.lookAt(0,0,0);
      (function l(){specRaf=requestAnimationFrame(l);if(scene&&specRdr)specRdr.render(scene,sc);})();
    }
    // Second WebGL context rendering the same scene — must die on every round
    // boundary (startThree) and on destroy, or it fights the next round's renderer.
    function stopSpectate(){
      if(specRaf){cancelAnimationFrame(specRaf);specRaf=null;}
      if(specRdr){try{specRdr.forceContextLoss();}catch(e){}
        try{specRdr.dispose();}catch(e){} specRdr=null;}
    }

    // ── results screen ────────────────────────────────────────────────────────
    const resScr=mkScr('results','bc3-res');
    function showResults(res){
      if(rafId){cancelAnimationFrame(rafId);rafId=null;}
      show('results');
      if(res.matchScores) res.matchScores.forEach(e=>{matchScores[e.slot]=e.wins;});
      if(res.bestOf) matchCfg.bestOf=res.bestOf;
      if(res.currentRound) currentRound=res.currentRound;
      const dw=res.matchOver?res.matchWinner:res.winner;
      const wc=dw?CAR_COLORS[dw.slot%6]:null;
      const medals=['🥇','🥈','🥉','💀','💀','💀'];
      const msbar=(res.matchScores||[]).map(p=>{const c=CAR_COLORS[p.slot%6];
        return `<div class="bc3-mse"><div class="bc3-msn" style="color:${c.light}">${c.name}</div><div class="bc3-msdots">${Array.from({length:res.bestOf},(_,i)=>`<span class="bc3-msd${i<p.wins?' f':''}" style="${i<p.wins?`background:${c.body}`:''}"></span>`).join('')}</div></div>`;
      }).join('');
      const lb=(res.leaderboard||[]).map((p,i)=>{const c=CAR_COLORS[p.slot%6];
        return `<div class="bc3-lbr"><span class="bc3-lbm">${medals[i]}</span><span class="bc3-lbn" style="color:${c.light}">${c.name} Driver</span><span class="bc3-lbs">Kills <b>${p.kills}</b><br>Dodges <b>${p.dodges}</b></span></div>`;
      }).join('');
      resScr.innerHTML=`
        <div style="font-size:60px;margin-bottom:4px;animation:bc3bnc 0.6s ease-out">${res.matchOver?'🏆':'🏁'}</div>
        <div class="bc3-sub" style="letter-spacing:3px;text-transform:uppercase;opacity:0.5;margin-bottom:2px">${res.matchOver?`Match Over — Best of ${res.bestOf}`:`Round ${res.currentRound} of ${res.bestOf}`}</div>
        <div class="bc3-sub" style="opacity:0.4;font-size:11px;text-transform:uppercase;letter-spacing:2px">Winner</div>
        <div class="bc3-logo" style="font-size:36px;margin-bottom:8px;${wc?`color:${wc.light}`:''}">${dw?`${wc.name} Driver`:''}</div>
        <div class="bc3-msbar">${msbar}</div>
        <div class="bc3-lb">${lb}</div>
        <button class="bc3-btn" id="bc3-pa">${res.matchOver?'NEW MATCH':'NEXT ROUND →'}</button>`;
      document.getElementById('bc3-pa').onclick=()=>{
        if(isHost) hostPlayAgain(res.matchOver);
        else { api.send('play-again',{}); show('lobby'); }
      };
    }

    // ── HUD + kill feed ───────────────────────────────────────────────────────
    function updateHUD(snapshot, slot){
      const m=snapshot.find(s=>s.slot===slot);
      const alive=snapshot.filter(s=>s.alive||s.ejecting);
      const ae=document.getElementById('bc3-alive'); if(ae) ae.innerHTML=`🏁 <b>${alive.length}</b> left`;
      const re=document.getElementById('bc3-rnd');   if(re) re.textContent=`R${currentRound}/${matchCfg.bestOf}`;
      if(m){
        const spd=document.getElementById('bc3-spd'); if(spd) spd.textContent=Math.round(Math.hypot(m.vx||0,m.vy||0)*10);
        const st=document.getElementById('bc3-stats'); if(st) st.innerHTML=`💀 <b>${m.kills||0}</b> kills<br>🌀 <b>${m.dodges||0}</b> dodges`;
      }
    }
    function addKill(killerSlot, victimSlot){
      const kf=document.getElementById('bc3-kf'); if(!kf) return;
      const kc=killerSlot!=null?CAR_COLORS[killerSlot%6]:null, vc=CAR_COLORS[victimSlot%6];
      const d=document.createElement('div'); d.className='bc3-ke';
      d.innerHTML=kc?`<span style="color:${kc.light}">${kc.name}</span> ejected <span style="color:${vc.light}">${vc.name}</span> 💥`:`<span style="color:${vc.light}">${vc.name}</span> ejected 💥`;
      kf.appendChild(d); setTimeout(()=>d.remove(),3200);
    }

    // ── Three.js init ─────────────────────────────────────────────────────────
    async function startThree() {
      T3=await ensureThree();
      if(renderer){renderer.dispose();scene=null;carMeshes={};}
      camP=new T3.Vector3(0,TPP_HEIGHT,TPP_BEHIND); lookV=new T3.Vector3();
      _cT=new T3.Vector3(); _lT=new T3.Vector3();
      yawOff=0; camTouch=false; camRmb=false; prevA={};
      const cv=document.getElementById('bc3-cvs'); if(!cv) return;
      renderer=new T3.WebGLRenderer({canvas:cv,antialias:window.devicePixelRatio<=1});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));
      scene=new T3.Scene(); scene.background=new T3.Color(0x0d0d1a);
      camera=new T3.PerspectiveCamera(68,1,0.05,50); // safe placeholder aspect; applySize() sets the real one
      bumperMeshes=buildArena(scene,T3);
      // Size from the canvas, guarding against a 0×0 first-paint measurement
      // (which would make aspect NaN and blank the first frames). Never divide by zero.
      function applySize(){
        if(!cv||!renderer||!camera) return;
        const w=Math.max(1,Math.floor(cv.clientWidth||cv.getBoundingClientRect().width||window.innerWidth));
        const h=Math.max(1,Math.floor(cv.clientHeight||cv.getBoundingClientRect().height||window.innerHeight));
        renderer.setSize(w,h,false); // false = don't touch the CSS 100%/100%, only the drawing buffer
        camera.aspect=w/h;
        camera.updateProjectionMatrix();
      }
      const ro=new ResizeObserver(()=>applySize());
      ro.observe(cv); evCleaners.push(()=>ro.disconnect());
      applySize();                      // best-effort immediate
      requestAnimationFrame(applySize); // and once more after the layout flush
      setupOrbit(cv);
      threeLoop();
    }

    function syncWorld(snapshot){
      if(!scene) return;
      for(const s of snapshot){
        if(!carMeshes[s.slot]){
          const c=CAR_COLORS[s.slot%6], m=makeCarMesh(c,T3);
          const ax=(s.x-ARENA.w/2)*SCALE, az=(s.y-ARENA.h/2)*SCALE, ta=-(s.angle+Math.PI/2);
          m.group.position.set(ax,0,az); m.group.rotation.set(0,ta,0); scene.add(m.group);
          carMeshes[s.slot]={group:m.group,frontWheels:m.frontWheels,steerA:0,tx:ax,tz:az,ta,ej:false};
        }
        const cm=carMeshes[s.slot], g=cm.group;
        const ax=(s.x-ARENA.w/2)*SCALE, az=(s.y-ARENA.h/2)*SCALE;
        if(s.ejecting){
          cm.ej=true; const t=s.ejectProgress/90;
          g.position.set(ax,Math.sin(t*Math.PI)*2.5,az);
          g.rotation.y=s.angle+Math.PI/2+t*Math.PI*4; g.rotation.z=t*Math.PI*2;
          g.scale.setScalar(Math.max(0,1-t*0.8)); g.visible=true;
        } else if(!s.alive){
          g.visible=false;
        } else {
          cm.ej=false; cm.tx=ax; cm.tz=az; cm.ta=-(s.angle+Math.PI/2);
          g.scale.setScalar(1); g.visible=true;
          const pa=prevA[s.slot]??s.angle; let da=s.angle-pa;
          if(da>Math.PI)da-=2*Math.PI; if(da<-Math.PI)da+=2*Math.PI;
          cm.steerA=cm.steerA*0.65+Math.max(-0.52,Math.min(0.52,da*9))*0.35;
          cm.frontWheels.forEach(w=>{w.rotation.y=-cm.steerA;});
        }
        prevA[s.slot]=s.angle;
      }
      for(const sl of Object.keys(carMeshes)) if(!snapshot.find(s=>s.slot==sl)){scene.remove(carMeshes[sl].group);delete carMeshes[sl];}
    }

    function lerpCars(){
      const L=0.3;
      for(const cm of Object.values(carMeshes)){
        if(cm.ej||!cm.group.visible||cm.tx===undefined) continue;
        cm.group.position.x+=(cm.tx-cm.group.position.x)*L;
        cm.group.position.z+=(cm.tz-cm.group.position.z)*L;
        let da=cm.ta-cm.group.rotation.y;
        if(da>Math.PI)da-=Math.PI*2; if(da<-Math.PI)da+=Math.PI*2;
        cm.group.rotation.y+=da*L;
      }
    }

    function updateCam(){
      const ms=snap.find(s=>s.slot===mySlot);
      if(!ms||(!ms.alive&&!ms.ejecting&&myEjected)) return;
      if(!camTouch&&!camRmb) yawOff*=0.94;
      const cm=carMeshes[mySlot];
      const mx=cm?cm.group.position.x:(ms.x-ARENA.w/2)*SCALE;
      const mz=cm?cm.group.position.z:(ms.y-ARENA.h/2)*SCALE;
      const ang=(cm?cm.group.rotation.y:-(ms.angle+Math.PI/2))+yawOff;
      _cT.set(mx+Math.sin(ang)*TPP_BEHIND,TPP_HEIGHT,mz+Math.cos(ang)*TPP_BEHIND);
      _lT.set(mx,CH+0.3,mz);
      camP.lerp(_cT,CAM_LERP); lookV.lerp(_lT,LOOK_LERP);
      camera.position.copy(camP); camera.lookAt(lookV);
    }

    function threeLoop(){
      rafId=requestAnimationFrame(threeLoop);
      if(!scene||!renderer||!camera) return;
      lerpCars(); updateCam();
      const t=Date.now()/1000;
      bumperMeshes.forEach((b,i)=>b.material.color.setHSL(0.6+Math.sin(t+i)*0.1,0.6,0.35));
      renderer.render(scene,camera);
    }

    function setupOrbit(cv){
      let tid=null,lx=0;
      cv.addEventListener('touchstart',e=>{if(tid!==null)return;const t=e.changedTouches[0];tid=t.identifier;lx=t.clientX;camTouch=true;},{passive:true});
      cv.addEventListener('touchmove',e=>{if(tid===null)return;for(const t of e.changedTouches)if(t.identifier===tid){yawOff+=(t.clientX-lx)*0.003;lx=t.clientX;break;}},{passive:true});
      const te=e=>{for(const t of e.changedTouches)if(t.identifier===tid){tid=null;camTouch=false;break;}};
      cv.addEventListener('touchend',te,{passive:true}); cv.addEventListener('touchcancel',te,{passive:true});
      cv.addEventListener('contextmenu',e=>e.preventDefault());
      let rlx=0;
      cv.addEventListener('mousedown',e=>{if(e.button===2){camRmb=true;rlx=e.clientX;}});
      const mm=e=>{if(!camRmb)return;yawOff+=(e.clientX-rlx)*0.003;rlx=e.clientX;};
      const mu=e=>{if(e.button===2)camRmb=false;};
      window.addEventListener('mousemove',mm); window.addEventListener('mouseup',mu);
      evCleaners.push(()=>{window.removeEventListener('mousemove',mm);window.removeEventListener('mouseup',mu);});
    }

    // ── input ─────────────────────────────────────────────────────────────────
    const keys={up:false,down:false,left:false,right:false};
    function setupInput(sendFn){
      [['bc3-u','up'],['bc3-d','down'],['bc3-l','left'],['bc3-r','right']].forEach(([id,k])=>{
        const b=document.getElementById(id); if(!b) return;
        const pr=()=>{keys[k]=true;b.classList.add('pr');};
        const rl=()=>{keys[k]=false;b.classList.remove('pr');};
        b.addEventListener('touchstart',e=>{e.preventDefault();pr();},{passive:false});
        b.addEventListener('touchend',  e=>{e.preventDefault();rl();},{passive:false});
        b.addEventListener('touchcancel',rl);
        b.addEventListener('mousedown',e=>{e.preventDefault();pr();}); b.addEventListener('mouseup',rl); b.addEventListener('mouseleave',rl);
      });
      const kd=e=>{
        if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
        if(e.key==='ArrowUp'||e.key==='w')keys.up=true;
        if(e.key==='ArrowDown'||e.key==='s')keys.down=true;
        if(e.key==='ArrowLeft'||e.key==='a')keys.left=true;
        if(e.key==='ArrowRight'||e.key==='d')keys.right=true;
      };
      const ku=e=>{
        if(e.key==='ArrowUp'||e.key==='w')keys.up=false;
        if(e.key==='ArrowDown'||e.key==='s')keys.down=false;
        if(e.key==='ArrowLeft'||e.key==='a')keys.left=false;
        if(e.key==='ArrowRight'||e.key==='d')keys.right=false;
      };
      window.addEventListener('keydown',kd); window.addEventListener('keyup',ku);
      evCleaners.push(()=>{window.removeEventListener('keydown',kd);window.removeEventListener('keyup',ku);});
      const iv=setInterval(()=>sendFn({up:keys.up,down:keys.down,steer:keys.right?steerSens*0.1:keys.left?-steerSens*0.1:0}),50);
      evCleaners.push(()=>clearInterval(iv));
    }

    // ── HOST path ─────────────────────────────────────────────────────────────
    let hPlayers=[], hInputs={}, physIv=null, lastBcast=0, roundDone=false;

    function mkHPlayer(p, i, total){
      const sp=getSpawn(i,total);
      return {id:p.id,slot:i,name:p.name,input:{},alive:true,ejecting:false,ejectProgress:0,kills:0,dodges:0,hitsTaken:0,hitCooldown:0,x:sp.x,y:sp.y,angle:sp.angle,vx:0,vy:0,va:0};
    }

    function hostStart(players){
      if(physIv){clearInterval(physIv);physIv=null;}
      hPlayers=players.map((p,i)=>mkHPlayer(p,i,players.length));
      hInputs={}; roundDone=false;
      mySlot=hPlayers.find(p=>p.id===me.id)?.slot??0;
      myEjected=false;
      const gi={players:hPlayers.map(p=>({id:p.id,slot:p.slot,name:p.name})),matchCfg,matchScores,currentRound};
      let cv=3;
      api.send('countdown',{n:cv,gi});
      showCD(cv);
      const ci=setInterval(()=>{
        cv--;
        if(cv>0){api.send('countdown',{n:cv});showCD(cv);}
        else{
          clearInterval(ci);
          api.send('game-go',gi);
          show('game');
          startThree().catch(err=>console.error('[bumper-cars] Three init failed (host):',err)).then(()=>{
            if(!renderer) return; // init failed — don't start the physics loop against a dead renderer
            setupInput(inp=>{hInputs[me.id]=inp;});
            lastBcast=0;
            physIv=setInterval(()=>{
              for(const p of hPlayers) if(hInputs[p.id]) p.input=hInputs[p.id];
              const active=hPlayers.filter(p=>p.alive||p.ejecting);
              const evs=tickPhysics(active);
              for(const ev of evs){
                hPlayers.filter(p=>p.alive&&!p.ejecting&&p.slot!==ev.victimSlot&&p.slot!==ev.killerSlot).forEach(p=>p.dodges++);
                api.send('eject',{victimSlot:ev.victimSlot,killerSlot:ev.killerSlot});
                addKill(ev.killerSlot,ev.victimSlot);
                if(ev.victimSlot===mySlot){
                  myEjected=true;
                  setTimeout(()=>{show('ejected');const kc=ev.killerSlot!=null?CAR_COLORS[ev.killerSlot%6]:null;const el=document.getElementById('bc3-ejby');if(el)el.textContent=kc?`Ejected by ${kc.name} Driver!`:'You were ejected!';initSpectate();},1200);
                }
                if(!roundDone){const surv=hPlayers.filter(p=>p.alive&&!p.ejecting),ej=hPlayers.filter(p=>p.ejecting);if(surv.length<=1&&ej.length===0){roundDone=true;setTimeout(()=>endRound(),800);}}
              }
              const snapshot=hPlayers.map(p=>({slot:p.slot,id:p.id,x:Math.round(p.x*10)/10,y:Math.round(p.y*10)/10,angle:Math.round(p.angle*1000)/1000,vx:Math.round(p.vx*10)/10,vy:Math.round(p.vy*10)/10,alive:p.alive,ejecting:p.ejecting,ejectProgress:p.ejectProgress,kills:p.kills,dodges:p.dodges}));
              snap=snapshot;
              if(T3&&scene) syncWorld(snapshot);
              updateHUD(snapshot,mySlot);
              const now=Date.now();
              if(now-lastBcast>=50){api.send('state',snapshot);api.setResumeState({matchCfg,matchScores,currentRound});lastBcast=now;}
            },1000/60);
          });
        }
      },1000);
    }

    function endRound(){
      if(physIv){clearInterval(physIv);physIv=null;}
      const winner=hPlayers.find(p=>p.alive)||[...hPlayers].sort((a,b)=>b.kills-a.kills)[0];
      if(winner) matchScores[winner.slot]=(matchScores[winner.slot]||0)+1;
      const wn=Math.ceil(matchCfg.bestOf/2);
      const mwe=Object.entries(matchScores).find(([,w])=>w>=wn);
      let matchWinner=null;
      if(mwe){const ws=parseInt(mwe[0]),wp=hPlayers.find(p=>p.slot===ws);if(wp)matchWinner={slot:wp.slot,wins:mwe[1]};}
      const sorted=[...hPlayers].sort((a,b)=>(b.kills*3+b.dodges)-(a.kills*3+a.dodges));
      const res={
        winner:winner?{slot:winner.slot}:null,
        leaderboard:sorted.map(p=>({slot:p.slot,kills:p.kills,dodges:p.dodges})),
        matchScores:hPlayers.map(p=>({slot:p.slot,wins:matchScores[p.slot]||0})),
        matchOver:!!matchWinner,matchWinner,bestOf:matchCfg.bestOf,currentRound
      };
      api.send('results',res);
      showResults(res);
    }

    function hostPlayAgain(resetMatch){
      if(resetMatch){matchScores={};currentRound=1;}else currentRound++;
      const players=api.getPlayers();
      const gi={players:players.map((p,i)=>({id:p.id,slot:i,name:p.name})),matchCfg,matchScores,currentRound};
      api.send('lobby-back',gi);
      renderLobby(players, players.findIndex(p=>p.id===me.id));
      show('lobby');
    }

    // ── GUEST path ────────────────────────────────────────────────────────────
    if(!isHost){
      api.on('countdown',(data)=>{const d=data?.payload??data;showCD(d.n);});
      api.on('game-go',(data)=>{
        const d=data?.payload??data;
        mySlot=d.players?.find(p=>p.id===me.id)?.slot??0;
        if(d.matchCfg)matchCfg=d.matchCfg; if(d.matchScores)matchScores=d.matchScores; if(d.currentRound)currentRound=d.currentRound;
        myEjected=false; show('game');
        startThree()
          .then(()=>{ if(renderer) setupInput(inp=>api.send('input',inp)); })
          .catch(err=>console.error('[bumper-cars] Three init failed (guest):',err));
      });
      api.on('state',(data)=>{
        const s=data?.payload??data;
        if(!Array.isArray(s)) return;
        snap=s;
        if(T3&&scene) syncWorld(s);
        updateHUD(s,mySlot);
      });
      api.on('eject',(data)=>{
        const d=data?.payload??data;
        addKill(d.killerSlot,d.victimSlot);
        if(d.victimSlot===mySlot){
          myEjected=true;
          setTimeout(()=>{show('ejected');const kc=d.killerSlot!=null?CAR_COLORS[d.killerSlot%6]:null;const el=document.getElementById('bc3-ejby');if(el)el.textContent=kc?`Ejected by ${kc.name} Driver!`:'You were ejected!';initSpectate();},1200);
        }
      });
      api.on('results',(data)=>{const d=data?.payload??data;setTimeout(()=>showResults(d),800);});
      api.on('lobby-back',(data)=>{
        const d=data?.payload??data;
        if(d.matchCfg)matchCfg=d.matchCfg; if(d.matchScores)matchScores=d.matchScores; if(d.currentRound)currentRound=d.currentRound;
        const players=api.getPlayers();
        renderLobby(players,d.players?.findIndex(p=>p.id===me.id)??0);
        show('lobby');
      });
      api.on('cfg-sync',(data)=>{
        const d=data?.payload??data;
        if(d.matchCfg)matchCfg=d.matchCfg; if(d.matchScores)matchScores=d.matchScores; if(d.currentRound)currentRound=d.currentRound;
      });
      api.send('bc-request-state',{});
    } else {
      api.on('input',(data,from)=>{const p=data?.payload??data;hInputs[from]=p;});
      api.on('play-again',()=>hostPlayAgain(false));
      api.on('cfg-sync',()=>{});  // host is source of truth, ignore echoes
      api.on('bc-request-state',(_,from)=>{
        const gi={players:api.getPlayers().map((p,i)=>({id:p.id,slot:i,name:p.name})),matchCfg,matchScores,currentRound};
        api.sendTo(from,'lobby-back',gi);
      });
      api.onPlayerRejoinedMidgame(({playerId})=>{
        const gi={players:api.getPlayers().map((p,i)=>({id:p.id,slot:i,name:p.name})),matchCfg,matchScores,currentRound};
        api.sendTo(playerId,'lobby-back',gi);
      });
    }

    // ── init ──────────────────────────────────────────────────────────────────
    const allP=api.getPlayers();
    mySlot=allP.findIndex(p=>p.id===me.id);
    renderLobby(allP,mySlot);
    show('lobby');

    return {
      destroy(){
        if(physIv){clearInterval(physIv);physIv=null;}
        if(rafId){cancelAnimationFrame(rafId);rafId=null;}
        if(renderer){renderer.dispose();renderer=null;}
        evCleaners.splice(0).forEach(fn=>{try{fn();}catch(e){}});
        root.remove();
      }
    };
  }
};
