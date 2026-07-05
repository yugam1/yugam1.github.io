// ═══════════════════════════════════════════════════════════════
//  RC ROBOT SOCCER — Party Arena Module  v6
//  Fixed: container sizing (clientWidth=0 on first paint),
//         canvas coordinate space, stopLoop recursion
// ═══════════════════════════════════════════════════════════════

const FRICTION  = 0.983;
const BUMP_COOL = 620;
const PLAYER_COLORS = ['#00e5ff','#ffd600','#ef5350','#1e88e5','#76ff03','#ff6d00','#e040fb','#f06292'];
const TEAM_COLORS   = ['#00e5ff','#ff5252'];
const TEAM_NAMES    = ['TEAM A','TEAM B'];
const KB = [
  {neg:'a',        pos:'d',          bump:'q'    },
  {neg:'w',        pos:'s',          bump:'e'    },
  {neg:'ArrowLeft',pos:'ArrowRight', bump:'Enter'},
  {neg:'ArrowUp',  pos:'ArrowDown',  bump:'Shift'},
];

// ── geometry ───────────────────────────────────────────────────
function octVerts(cx,cy,R){
  const cr=R/Math.cos(Math.PI/8);
  return Array.from({length:8},(_,i)=>{const a=i*Math.PI/4-Math.PI/8;return{x:cx+cr*Math.sin(a),y:cy-cr*Math.cos(a)};});
}
function octSides(verts){
  return verts.map((v,i)=>{
    const n=verts[(i+1)%8],dx=n.x-v.x,dy=n.y-v.y,len=Math.sqrt(dx*dx+dy*dy);
    return{v0:v,v1:n,mx:(v.x+n.x)/2,my:(v.y+n.y)/2,nx:-dy/len,ny:dx/len,axX:dx/len,axY:dy/len,len};
  });
}
function pickSides(n){
  return({1:[0],2:[0,4],3:[0,3,5],4:[0,2,4,6],5:[0,1,3,5,6],6:[0,1,3,4,5,7],7:[0,1,2,3,4,5,7],8:[0,1,2,3,4,5,6,7]})[n]||[0,2,4,6];
}
function lighten(h,a){const[r,g,b]=[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];return`rgb(${Math.min(255,r+a*255)},${Math.min(255,g+a*255)},${Math.min(255,b+a*255)})`;}
function darken(h,a) {const[r,g,b]=[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];return`rgb(${Math.max(0,r-a*255)},${Math.max(0,g-a*255)},${Math.max(0,b-a*255)})`;}

// ── game state ─────────────────────────────────────────────────
function buildState(bs,nP,mode,gameSecs,goalWin){
  // Tuned for easier scoring: field ~7% bigger (more room to maneuver),
  // puck ~15% smaller (less blocking surface), goal ~12% wider.
  const cx=bs/2,cy=bs/2,fieldR=bs*0.395,puckR=bs*0.044,goalHW=bs*0.103;
  const verts=octVerts(cx,cy,fieldR),sides=octSides(verts),sideIdx=pickSides(nP);
  const pucks=sideIdx.map((si,pi)=>{
    const s=sides[si];
    // Keyboard-only sign fix: octSides() walks the octagon in one
    // consistent rotational direction, so "t increasing" moves left→right
    // on a top-ish edge but right→left on the directly-opposite bottom-ish
    // edge (same reason opposite sides of a loop mirror). Without this,
    // two players on opposite sides (e.g. 2-player mode) get their
    // "positive" key mapped to opposite screen directions. dirSign makes
    // the raw keyboard axis consistent with screen space regardless of
    // which side a player sits on. Joystick input is unaffected — it
    // already derives direction from the real screen-space stick delta.
    const dirSign=(Math.abs(s.axX)>=Math.abs(s.axY))?(s.axX<0?-1:1):(s.axY<0?-1:1);
    return{x:s.mx+s.nx*puckR*1.35,y:s.my+s.ny*puckR*1.35,vx:0,vy:0,
      sideIdx:si,playerIdx:pi,team:mode==='teams'?pi%2:pi,
      color:PLAYER_COLORS[pi%8],t:0.5,dirSign,
      minT:0.5-goalHW/s.len,maxT:0.5+goalHW/s.len,
      cool:0,bumping:false,bumpT:0};
  });
  return{bs,cx,cy,fieldR,puckR,goalHW,verts,sides,sideIdx,nP,mode,
    gameSecs:gameSecs>0?gameSecs:9999,goalWin:goalWin>0?goalWin:9999,
    pucks,ball:{x:cx,y:cy,vx:0,vy:0},
    scores:Array(nP).fill(0),teamScores:[0,0],
    gameTime:gameSecs>0?gameSecs:9999,
    running:false,goalEvent:null,_stuck:null,_flash:0};
}
function launchBall(gs){
  const ang=Math.random()*Math.PI*2,spd=gs.bs*0.0038;
  gs.ball.vx=Math.cos(ang)*spd;gs.ball.vy=Math.sin(ang)*spd;gs.running=true;
}
function resetAfterGoal(gs){
  const{cx,cy,sides,sideIdx,puckR}=gs;
  gs.ball={x:cx,y:cy,vx:0,vy:0};gs.running=false;gs.goalEvent=null;
  gs._stuck={x:cx,y:cy,t:0};gs._flash=0;
  gs.pucks.forEach((p,i)=>{
    const s=sides[sideIdx[i]];
    p.x=s.mx+s.nx*puckR*1.35;p.y=s.my+s.ny*puckR*1.35;
    p.vx=0;p.vy=0;p.t=0.5;p.cool=0;p.bumping=false;
  });
}

// ── physics ────────────────────────────────────────────────────
function stepGame(gs,inp,dt){
  if(!gs.running||gs.goalEvent)return;
  const{bs,puckR,goalHW,sides}=gs;
  const br=bs*0.026,pSp=bs*0.0058,maxB=bs*0.015,jB=bs*0.020;
  gs.pucks.forEach((p,i)=>{
    const s=sides[p.sideIdx],a=inp[i]?.axis??0;
    p.t=Math.max(p.minT,Math.min(p.maxT,p.t+a*pSp/s.len));
    const bx=s.v0.x+p.t*(s.v1.x-s.v0.x),by=s.v0.y+p.t*(s.v1.y-s.v0.y),off=puckR*1.35;
    p.vx=(bx+s.nx*off)-p.x;p.vy=(by+s.ny*off)-p.y;p.x=bx+s.nx*off;p.y=by+s.ny*off;
    if(p.cool>0)p.cool=Math.max(0,p.cool-dt*1000);
    if(p.bumping){p.bumpT=Math.min(1,p.bumpT+dt*3.5);if(p.bumpT>=1)p.bumping=false;}
    if(inp[i]?.bump&&p.cool===0){
      p.cool=BUMP_COOL;p.bumping=true;p.bumpT=0;
      const dx=gs.ball.x-p.x,dy=gs.ball.y-p.y,dist=Math.sqrt(dx*dx+dy*dy);
      if(dist<puckR+br+bs*0.07&&dist>0.01){
        const nx=dx/dist,ny=dy/dist;gs.ball.vx+=nx*jB;gs.ball.vy+=ny*jB;capB(gs.ball,maxB);
      }
    }
  });
  gs.ball.x+=gs.ball.vx;gs.ball.y+=gs.ball.vy;gs.ball.vx*=FRICTION;gs.ball.vy*=FRICTION;
  gs.pucks.forEach(p=>{
    const dx=gs.ball.x-p.x,dy=gs.ball.y-p.y,dist=Math.sqrt(dx*dx+dy*dy),minD=puckR+br;
    if(dist<minD&&dist>0.01){
      const nx=dx/dist,ny=dy/dist;gs.ball.x=p.x+nx*minD;gs.ball.y=p.y+ny*minD;
      const rel=(gs.ball.vx-p.vx)*nx+(gs.ball.vy-p.vy)*ny;
      if(rel<0){gs.ball.vx-=rel*nx*1.45;gs.ball.vy-=rel*ny*1.45;}capB(gs.ball,maxB);
    }
  });
  sides.forEach((s,si)=>{
    const dx=gs.ball.x-s.mx,dy=gs.ball.y-s.my;
    const perp=dx*(-s.nx)+dy*(-s.ny),par=dx*s.axX+dy*s.axY;
    if(perp>-br-2){
      const ps=gs.pucks.find(p=>p.sideIdx===si);
      if(ps&&Math.abs(par)<goalHW&&perp>-br*1.5){
        if(!gs.goalEvent){gs.goalEvent={playerIdx:ps.playerIdx,team:ps.team};gs.scores[ps.playerIdx]++;if(gs.mode==='teams')gs.teamScores[ps.team]++;}
        return;
      }
      if(perp>-br*0.5){
        gs.ball.x+=s.nx*(perp+br+1);gs.ball.y+=s.ny*(perp+br+1);
        const dot=gs.ball.vx*(-s.nx)+gs.ball.vy*(-s.ny);
        if(dot>0){gs.ball.vx-=2*dot*(-s.nx)*0.82;gs.ball.vy-=2*dot*(-s.ny)*0.82;}
      }
    }
  });
  antiStuck(gs,dt);
}
function capB(b,m){const s=Math.sqrt(b.vx**2+b.vy**2);if(s>m){b.vx=b.vx/s*m;b.vy=b.vy/s*m;}}
function antiStuck(gs,dt){
  const{bs,puckR,pucks,ball,cx,cy}=gs;
  const br=bs*0.026,mn=bs*0.003,mx=bs*0.015,es=mx*1.5;
  const sp=Math.sqrt(ball.vx**2+ball.vy**2);
  if(sp<0.0001){const a=Math.random()*Math.PI*2;ball.vx=Math.cos(a)*mn;ball.vy=Math.sin(a)*mn;}
  else if(sp<mn){ball.vx=ball.vx/sp*mn;ball.vy=ball.vy/sp*mn;}
  for(let p=0;p<4;p++){
    let ov=false;
    pucks.forEach(pk=>{
      const dx=ball.x-pk.x,dy=ball.y-pk.y,d=Math.sqrt(dx*dx+dy*dy),mD=puckR+br;
      if(d<mD&&d>0.001){ov=true;const nx=dx/d,ny=dy/d;ball.x=pk.x+nx*(mD+0.5);ball.y=pk.y+ny*(mD+0.5);const dot=ball.vx*nx+ball.vy*ny;if(dot<mn){ball.vx+=(mn-dot)*nx;ball.vy+=(mn-dot)*ny;}}
    });
    if(!ov)break;
  }
  const s2=Math.sqrt(ball.vx**2+ball.vy**2);if(s2>mx*2)capB(ball,mx*2);
  if(!gs._stuck)gs._stuck={x:ball.x,y:ball.y,t:0};
  const st=gs._stuck,mv=Math.sqrt((ball.x-st.x)**2+(ball.y-st.y)**2);
  if(mv>bs*0.025){st.x=ball.x;st.y=ball.y;st.t=0;}
  else{st.t+=dt;if(st.t>2.4){const tcx=cx-ball.x,tcy=cy-ball.y,tl=Math.sqrt(tcx*tcx+tcy*tcy)||1,sp2=(Math.random()<0.5?1:-1)*0.6;ball.vx=(tcx/tl+(-tcy/tl)*sp2)*es;ball.vy=(tcy/tl+(tcx/tl)*sp2)*es;st.x=ball.x;st.y=ball.y;st.t=0;gs._flash=0.55;}}
  if(gs._flash>0)gs._flash=Math.max(0,gs._flash-dt*2.2);
}

// ── draw ───────────────────────────────────────────────────────
function drawBoard(ctx,gs,rotAngle){
  const{bs,cx,cy,fieldR,puckR,goalHW,verts,sides,sideIdx}=gs;
  const br=bs*0.026;
  ctx.clearRect(0,0,bs,bs);
  ctx.save();
  if(rotAngle){ctx.translate(cx,cy);ctx.rotate(rotAngle);ctx.translate(-cx,-cy);}
  ctx.fillStyle='#0d0d0d';ctx.fillRect(0,0,bs,bs);
  ctx.fillStyle='#1a3d1a';pFill(ctx,octVerts(cx,cy,fieldR+bs*0.12));
  ctx.fillStyle='#111111';pFill(ctx,octVerts(cx,cy,fieldR+bs*0.04));
  ctx.save();pClip(ctx,verts);
  const sw=(fieldR*2)/12;
  for(let i=0;i<12;i++){ctx.fillStyle=i%2===0?'#2d7d2d':'#358c35';ctx.fillRect(cx-fieldR+i*sw,cy-fieldR,sw,fieldR*2);}
  ctx.strokeStyle='rgba(255,255,255,0.78)';ctx.lineWidth=Math.max(1.5,bs*0.0026);ctx.lineCap='round';
  ctx.beginPath();ctx.arc(cx,cy,fieldR*0.28,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.arc(cx,cy,3,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,0.85)';ctx.fill();
  sideIdx.forEach(si=>{
    const s=sides[si],hw=goalHW,pd=fieldR*0.22,gd=fieldR*0.1;
    ctx.beginPath();ctx.moveTo(s.mx-s.axX*hw,s.my-s.axY*hw);ctx.lineTo(s.mx-s.axX*hw+s.nx*pd,s.my-s.axY*hw+s.ny*pd);ctx.lineTo(s.mx+s.axX*hw+s.nx*pd,s.my+s.axY*hw+s.ny*pd);ctx.lineTo(s.mx+s.axX*hw,s.my+s.axY*hw);ctx.stroke();
    const gbW=hw*0.52;ctx.beginPath();ctx.moveTo(s.mx-s.axX*gbW,s.my-s.axY*gbW);ctx.lineTo(s.mx-s.axX*gbW+s.nx*gd,s.my-s.axY*gbW+s.ny*gd);ctx.lineTo(s.mx+s.axX*gbW+s.nx*gd,s.my+s.axY*gbW+s.ny*gd);ctx.lineTo(s.mx+s.axX*gbW,s.my+s.axY*gbW);ctx.stroke();
  });
  ctx.restore();
  sideIdx.forEach((si,pi)=>{
    const s=sides[si],col=PLAYER_COLORS[pi%8];
    ctx.save();ctx.globalAlpha=0.22;ctx.fillStyle=col;
    ctx.beginPath();ctx.moveTo(s.mx-s.axX*goalHW,s.my-s.axY*goalHW);ctx.lineTo(s.mx+s.axX*goalHW,s.my+s.axY*goalHW);ctx.lineTo(s.mx+s.axX*goalHW-s.nx*bs*0.1,s.my+s.axY*goalHW-s.ny*bs*0.1);ctx.lineTo(s.mx-s.axX*goalHW-s.nx*bs*0.1,s.my-s.axY*goalHW-s.ny*bs*0.1);ctx.closePath();ctx.fill();ctx.restore();
    [[s.mx-s.axX*goalHW,s.my-s.axY*goalHW],[s.mx+s.axX*goalHW,s.my+s.axY*goalHW]].forEach(([px,py])=>{ctx.beginPath();ctx.arc(px,py,Math.max(3,bs*0.006),0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();});
  });
  verts.forEach((v,i)=>{
    if(!sideIdx.includes((i+7)%8)||!sideIdx.includes(i)){
      const r=bs*0.009,pg=ctx.createRadialGradient(v.x,v.y,0,v.x,v.y,r);
      pg.addColorStop(0,'#ffe57a');pg.addColorStop(1,'#9a7100');
      ctx.beginPath();ctx.arc(v.x,v.y,r,0,Math.PI*2);ctx.fillStyle=pg;ctx.fill();
    }
  });
  gs.pucks.forEach(p=>{
    const r=puckR;
    if(p.bumping&&p.bumpT<1){ctx.beginPath();ctx.arc(p.x,p.y,r+(1-p.bumpT)*r*0.85,0,Math.PI*2);ctx.strokeStyle=p.color;ctx.globalAlpha=(1-p.bumpT)*0.6;ctx.lineWidth=2.5;ctx.stroke();ctx.globalAlpha=1;}
    ctx.save();ctx.shadowColor='rgba(0,0,0,0.6)';ctx.shadowBlur=10;ctx.shadowOffsetX=3;ctx.shadowOffsetY=4;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fillStyle='#000';ctx.fill();ctx.restore();
    ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fillStyle='#101010';ctx.fill();ctx.strokeStyle='#252525';ctx.lineWidth=2;ctx.stroke();
    const br2=r*0.76,g=ctx.createRadialGradient(p.x-r*0.22,p.y-r*0.22,0,p.x,p.y,br2);
    g.addColorStop(0,lighten(p.color,0.28));g.addColorStop(0.6,p.color);g.addColorStop(1,darken(p.color,0.35));
    ctx.beginPath();ctx.arc(p.x,p.y,br2,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();
    ctx.save();ctx.beginPath();ctx.ellipse(p.x,p.y,r*0.8,r*0.38,0,0,Math.PI*2);ctx.fillStyle='rgba(0,0,0,0.32)';ctx.fill();
    for(let rr=0;rr<2;rr++)for(let c=0;c<4;c++){const ddx=p.x-3*r*0.185/2+c*r*0.185,ddy=p.y-r*0.185/2+rr*r*0.185;ctx.beginPath();ctx.arc(ddx,ddy,r*0.026,0,Math.PI*2);ctx.fillStyle=p.color+'99';ctx.fill();}
    ctx.restore();
    ctx.beginPath();ctx.arc(p.x-r*0.2,p.y-r*0.22,r*0.13,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,0.22)';ctx.fill();
  });
  if(gs._flash>0){ctx.beginPath();ctx.arc(gs.ball.x,gs.ball.y,br*(1+gs._flash*1.8),0,Math.PI*2);ctx.strokeStyle='rgba(255,255,80,'+gs._flash*0.85+')';ctx.lineWidth=br*0.5;ctx.stroke();}
  ctx.save();ctx.shadowColor='rgba(0,0,0,0.5)';ctx.shadowBlur=7;ctx.shadowOffsetX=2;ctx.shadowOffsetY=3;
  const bg=ctx.createRadialGradient(gs.ball.x-br*0.3,gs.ball.y-br*0.3,0,gs.ball.x,gs.ball.y,br);
  bg.addColorStop(0,'#fff');bg.addColorStop(1,'#d5d5d5');
  ctx.beginPath();ctx.arc(gs.ball.x,gs.ball.y,br,0,Math.PI*2);ctx.fillStyle=bg;ctx.fill();ctx.restore();
  ctx.fillStyle='#1a1a1a';ctx.beginPath();ctx.arc(gs.ball.x,gs.ball.y,br*0.28,0,Math.PI*2);ctx.fill();
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5-Math.PI/2;ctx.beginPath();ctx.arc(gs.ball.x+Math.cos(a)*br*0.57,gs.ball.y+Math.sin(a)*br*0.57,br*0.18,0,Math.PI*2);ctx.fill();}
  ctx.strokeStyle='rgba(80,80,80,0.35)';ctx.lineWidth=br*0.09;
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5-Math.PI/2;ctx.beginPath();ctx.moveTo(gs.ball.x,gs.ball.y);ctx.lineTo(gs.ball.x+Math.cos(a)*br*0.46,gs.ball.y+Math.sin(a)*br*0.46);ctx.stroke();}
  ctx.restore();
}
function pFill(ctx,v){ctx.beginPath();v.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fill();}
function pClip(ctx,v){ctx.beginPath();v.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.clip();}
function povAngle(si){ return Math.PI - si*(Math.PI/4); }

// ── one-time injects ───────────────────────────────────────────
function ensureGlobals(){
  if(!document.getElementById('rcs-css')){
    const s=document.createElement('style');s.id='rcs-css';
    s.textContent='@keyframes rcsGPop{from{transform:scale(0.3);opacity:0}to{transform:scale(1);opacity:1}}@keyframes rcsCd{from{transform:scale(1.4);opacity:1}to{transform:scale(0.7);opacity:0}}';
    document.head.appendChild(s);
  }
  if(!document.getElementById('rcs-fonts')){
    const l=document.createElement('link');l.id='rcs-fonts';l.rel='stylesheet';
    l.href='https://fonts.googleapis.com/css2?family=Quicksand:wght@600;700&family=Righteous&display=swap';
    document.head.appendChild(l);
  }
}

// ── safe board size: tries clientWidth, falls back to getBoundingClientRect ──
function getBoardSize(el, ctrlHeight){
  // Force layout recalc by reading offsetWidth (triggers reflow)
  const w = el.offsetWidth  || el.getBoundingClientRect().width  || 400;
  const h = el.offsetHeight || el.getBoundingClientRect().height || 400;
  const avail = ctrlHeight ? h - ctrlHeight : h;
  return Math.max(100, Math.floor(Math.min(w, avail)));
}

// ═══════════════════════════════════════════════════════════════
export default {
  create(container, api){
    ensureGlobals();

    const me=api.getMe(), isHost=api.isHost(), isLocal=api.isLocal();

    // Resume support: RC Soccer runs live physics independently on every
    // client (positions/velocities are never networked, only joystick
    // inputs are) — so there is no "frozen mid-motion" state worth
    // restoring, and attempting to snapshot puck/ball positions would be
    // stale the instant a reconnect happens anyway. What DOES carry
    // meaning across a reconnect is the match config and the score/clock,
    // matching exactly what the existing resize-preservation code below
    // already does for a window resize (see `prev` in applySize) — reuse
    // of the same idea, just triggered by reconnect instead of resize.
    const resumedRcs = isLocal ? null : api.getResumeState();

    // ── module state
    let gs=null, animId=null, timerInt=null, lastT=0;
    let goalLocked=false, myIdx=-1, myPovAngle=0, currentBS=0, appliedResume=false;
    const keys={}, inp=[];
    let cfg=resumedRcs?.cfg ?? {mode:'individual',gameSecs:180,goalWin:3};
    const evCleaners=[];

    // root fills the game-container exactly
    // Use width/height 100% with position relative so children can be absolute
    const root=document.createElement('div');
    root.style.cssText='width:100%;height:100%;position:relative;background:#070710;overflow:hidden;font-family:Quicksand,sans-serif;';
    container.appendChild(root);

    function stopEverything(){
      cancelAnimationFrame(animId);animId=null;
      clearInterval(timerInt);timerInt=null;
      evCleaners.splice(0).forEach(fn=>{try{fn();}catch(e){}});
      goalLocked=false;
    }

    // Host-only. Called whenever score/time changes (goal scored, timer
    // tick) — NOT every animation frame, since live positions aren't part
    // of what's saved (see note above cfg declaration). Throttled further
    // on the transport side, so calling this on every goal/tick is cheap.
    function saveResumeState(){
      if(!isHost||isLocal||!gs) return;
      api.setResumeState({
        cfg,
        scores:[...gs.scores],
        teamScores:[...gs.teamScores],
        gameTime:gs.gameTime,
      });
    }

    // ════════════════════════════════════════
    //  CONFIG SCREEN
    // ════════════════════════════════════════
    function showConfig(){
      stopEverything();gs=null;currentBS=0;
      root.innerHTML='';

      const players=api.getPlayers();
      const nP=Math.min(8,Math.max(1,players.length));

      // Non-host waiting screen
      if(!isHost&&!isLocal){
        const d=document.createElement('div');
        d.style.cssText='position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:rgba(255,255,255,0.6);text-align:center;padding:24px;gap:16px;';
        d.innerHTML='<div style="font-family:Righteous,cursive;font-size:2rem;color:#00e5ff;">⚽ RC SOCCER</div>'
          +'<div>Waiting for host to configure the game…</div>'
          +'<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">'
          +players.map((p,i)=>'<div style="padding:6px 14px;border-radius:20px;background:'+PLAYER_COLORS[i%8]+'22;border:1px solid '+PLAYER_COLORS[i%8]+'44;color:'+PLAYER_COLORS[i%8]+';font-size:0.8rem;font-weight:700;">'+p.name+'</div>').join('')
          +'</div>';
        root.appendChild(d);
        return;
      }

      // Host config panel — scrollable
      const scroller=document.createElement('div');
      scroller.style.cssText='position:absolute;inset:0;overflow-y:auto;display:flex;justify-content:center;padding:20px 16px;';
      const card=document.createElement('div');
      card.style.cssText='background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);border-radius:20px;padding:26px 28px;width:100%;max-width:420px;height:fit-content;box-shadow:0 20px 60px rgba(0,0,0,0.6);flex-shrink:0;';

      // title
      card.innerHTML='<div style="text-align:center;margin-bottom:22px;">'
        +'<div style="font-family:Righteous,cursive;font-size:clamp(1.4rem,5vw,2rem);background:linear-gradient(135deg,#00e5ff,#ffd600);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:3px;">RC SOCCER</div>'
        +'<div style="color:rgba(255,255,255,0.3);font-size:0.75rem;margin-top:4px;">'+nP+' player'+(nP>1?'s':'')+' · Octagon field</div>'
        +'</div>';

      function sectionLabel(text){
        const d=document.createElement('div');
        d.style.cssText='color:rgba(255,255,255,0.4);font-size:0.67rem;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;';
        d.textContent=text;return d;
      }

      function pillGroup(items,getValue,accent,onPick){
        const row=document.createElement('div');
        row.style.cssText='display:flex;gap:7px;flex-wrap:wrap;margin-bottom:20px;';
        const btns=items.map(it=>{
          const b=document.createElement('button');
          function refresh(){
            const on=getValue()===it.val;
            b.style.cssText='padding:9px 14px;border-radius:9px;cursor:pointer;font-family:Quicksand,sans-serif;font-weight:700;font-size:0.82rem;border:2px solid '+(on?accent+'55':'rgba(255,255,255,0.09)')+';background:'+(on?'linear-gradient(135deg,'+accent+','+darken(accent,0.18)+')'  :'rgba(255,255,255,0.06)')+';color:'+(on?'#000':'rgba(255,255,255,0.65)')+';';
          }
          b.textContent=it.label;
          b.onclick=()=>{onPick(it.val);btns.forEach(x=>x._refresh());};
          b._refresh=refresh;refresh();
          row.appendChild(b);return b;
        });
        return row;
      }

      // mode buttons
      card.appendChild(sectionLabel('Game Mode'));
      const modeRow=document.createElement('div');modeRow.style.cssText='display:flex;gap:8px;margin-bottom:20px;';
      [{id:'individual',label:'👤 Individual',sub:'Fewest goals conceded wins'},{id:'teams',label:'👥 Teams A vs B',sub:'Alternating teams'}].forEach(m=>{
        const b=document.createElement('button');
        function rr(){const on=cfg.mode===m.id;b.style.cssText='flex:1;padding:10px;border-radius:11px;cursor:pointer;text-align:left;color:#fff;background:'+(on?'rgba(0,229,255,0.1)':'rgba(255,255,255,0.04)')+';border:'+(on?'2px solid rgba(0,229,255,0.45)':'2px solid rgba(255,255,255,0.09)')+';';}
        b.innerHTML='<div style="font-weight:700;font-size:0.82rem;margin-bottom:2px;">'+m.label+'</div><div style="color:rgba(255,255,255,0.35);font-size:0.65rem;">'+m.sub+'</div>';
        b.onclick=()=>{cfg.mode=m.id;modeRow.querySelectorAll('button').forEach(x=>x._rr());};
        b._rr=rr;rr();modeRow.appendChild(b);
      });
      card.appendChild(modeRow);

      card.appendChild(sectionLabel('Time Limit'));
      card.appendChild(pillGroup([{label:'1 min',val:60},{label:'2 min',val:120},{label:'3 min',val:180},{label:'5 min',val:300},{label:'∞',val:0}],()=>cfg.gameSecs,'#ffd600',v=>{cfg.gameSecs=v;}));

      card.appendChild(sectionLabel('Goals Conceded Limit'));
      card.appendChild(pillGroup([{label:'1',val:1},{label:'2',val:2},{label:'3',val:3},{label:'5',val:5},{label:'∞',val:0}],()=>cfg.goalWin,'#ef5350',v=>{cfg.goalWin=v;}));

      // player dots
      const dots=document.createElement('div');dots.style.cssText='display:flex;gap:6px;margin-bottom:18px;justify-content:center;flex-wrap:wrap;';
      players.forEach((p,i)=>{
        const col=PLAYER_COLORS[i%8];
        dots.innerHTML+='<div style="display:flex;flex-direction:column;align-items:center;gap:3px;"><div style="width:26px;height:26px;border-radius:50%;background:'+col+';box-shadow:0 0 8px '+col+'66;display:flex;align-items:center;justify-content:center;font-size:0.58rem;font-weight:700;color:#000;">'+p.name.charAt(0).toUpperCase()+'</div><div style="font-size:0.5rem;color:rgba(255,255,255,0.38);max-width:34px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+p.name+'</div></div>';
      });
      card.appendChild(dots);

      const ko=document.createElement('button');
      ko.style.cssText='width:100%;padding:14px;border-radius:12px;border:none;background:linear-gradient(135deg,#00e5ff,#0099cc);color:#000;font-family:Righteous,cursive;font-size:1rem;letter-spacing:2px;cursor:pointer;box-shadow:0 4px 24px rgba(0,229,255,0.3);margin-bottom:10px;';
      ko.textContent='KICK OFF ⚽';
      ko.onmouseenter=()=>{ko.style.transform='translateY(-2px)';};
      ko.onmouseleave=()=>{ko.style.transform='';};
      ko.onclick=()=>{
        const c={...cfg};
        if(!isLocal) api.broadcast('rcs-cfg',c);
        startGame(c, api.getPlayers());
        if(!isLocal) saveResumeState();
      };
      card.appendChild(ko);

      const hint=document.createElement('div');
      hint.style.cssText='color:rgba(255,255,255,0.14);font-size:0.58rem;text-align:center;';
      hint.textContent='Keyboard: P1 A/D+Q  ·  P2 W/S+E  ·  P3 ←→+Enter  ·  P4 ↑↓+Shift';
      card.appendChild(hint);

      scroller.appendChild(card);root.appendChild(scroller);
    }

    // ════════════════════════════════════════
    //  GAME SCREEN
    // ════════════════════════════════════════
    function startGame(gameCfg, players){
      stopEverything();gs=null;currentBS=0;
      cfg={...gameCfg};
      root.innerHTML='';

      const nP=Math.min(8,Math.max(1,players.length));
      myIdx=isLocal?-1:players.findIndex(p=>p.id===me.id);
      const sides4=pickSides(nP);
      const mySide=(myIdx>=0&&myIdx<sides4.length)?sides4[myIdx]:-1;
      myPovAngle=(isLocal||mySide<0)?0:povAngle(mySide);

      const CTRL_H=88; // height of bottom controller strip

      // ── canvas (explicit px size set after first layout)
      const canvas=document.createElement('canvas');
      canvas.style.cssText='position:absolute;display:block;';
      root.appendChild(canvas);
      const ctx=canvas.getContext('2d');

      // ── HUD
      const hud=document.createElement('div');
      hud.style.cssText='position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:20;display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:center;background:rgba(0,0,0,0.72);backdrop-filter:blur(10px);padding:5px 16px;border-radius:22px;border:1px solid rgba(255,255,255,0.07);max-width:94%;pointer-events:none;white-space:nowrap;';
      root.appendChild(hud);

      // ── countdown overlay
      const cdEl=document.createElement('div');
      cdEl.style.cssText='position:absolute;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;pointer-events:none;';
      root.appendChild(cdEl);

      // ── goal flash
      const flashEl=document.createElement('div');
      flashEl.style.cssText='position:absolute;inset:0;z-index:30;display:none;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;';
      root.appendChild(flashEl);

      // ── win overlay
      const winEl=document.createElement('div');
      winEl.style.cssText='position:absolute;inset:0;z-index:35;background:rgba(0,0,0,0.87);display:none;flex-direction:column;align-items:center;justify-content:center;gap:14px;';
      root.appendChild(winEl);

      // ── my controller (bottom strip, only if I have a puck)
      const hasCtrl=myIdx>=0;
      if(hasCtrl){
        root.appendChild(makeController(myIdx));
      }

      // ── SIZE CANVAS: deferred to next animation frame so layout is complete
      function applySize(){
        const W=container.offsetWidth||container.getBoundingClientRect().width||400;
        const H=container.offsetHeight||container.getBoundingClientRect().height||400;
        const availH=hasCtrl?H-CTRL_H:H;
        const bs=Math.max(100,Math.floor(Math.min(W,availH)));
        if(bs===currentBS) return;
        currentBS=bs;

        canvas.width=bs;canvas.height=bs;
        // center the square canvas in the container
        const left=Math.floor((W-bs)/2);
        const top=hasCtrl?0:Math.floor((H-bs)/2);
        canvas.style.left=left+'px';
        canvas.style.top=top+'px';
        canvas.style.width=bs+'px';
        canvas.style.height=bs+'px';

        // preserve state across resize
        const prev=gs?{scores:[...gs.scores],teamScores:[...gs.teamScores],gameTime:gs.gameTime,running:gs.running,goalEvent:gs.goalEvent}:null;
        gs=buildState(bs,nP,cfg.mode,cfg.gameSecs,cfg.goalWin);
        if(prev){
          gs.scores=prev.scores;gs.teamScores=prev.teamScores;
          gs.gameTime=prev.gameTime;gs.running=prev.running;
          gs.goalEvent=prev.goalEvent;
        } else if(resumedRcs && !appliedResume){
          // First build after a reconnect, before any resize has happened —
          // apply the score/clock we resumed instead of resize's `prev`
          // path (which only exists once gs already existed once before).
          gs.scores=[...resumedRcs.scores];
          gs.teamScores=[...resumedRcs.teamScores];
          gs.gameTime=resumedRcs.gameTime;
          appliedResume=true;
        }
        renderHUD(hud,gs,cfg);
      }

      // ResizeObserver on the container (not root, which might be 0 initially)
      const ro=new ResizeObserver(()=>applySize());
      ro.observe(container);
      evCleaners.push(()=>ro.disconnect());

      // CRITICAL: defer first size call so the flex layout has painted
      requestAnimationFrame(()=>{ applySize(); });

      // inp array
      for(let i=0;i<nP;i++) inp[i]={axis:0,axisX:0,axisY:0,bump:false};

      // ── countdown
      function runCD(n,onDone){
        cdEl.innerHTML='';
        if(n===0){
          cdEl.innerHTML='<div style="font-family:Righteous,cursive;font-size:clamp(40px,12vw,100px);color:#00e676;font-weight:900;text-shadow:0 0 60px #00e676;animation:rcsCd 0.6s ease-out both;">GO!</div>';
          setTimeout(()=>{cdEl.innerHTML='';onDone();},700);return;
        }
        cdEl.innerHTML='<div style="font-family:Righteous,cursive;font-size:clamp(50px,15vw,120px);color:#fff;font-weight:900;text-shadow:0 0 60px rgba(255,255,255,0.5);animation:rcsCd 0.8s ease-out both;">'+n+'</div>';
        setTimeout(()=>runCD(n-1,onDone),900);
      }

      function doLaunch(){
        if(gs){launchBall(gs);}
        if(isHost&&!isLocal) api.broadcast('rcs-launch',{});
      }

      function startTimerAndCD(){
        runCD(3,()=>{
          doLaunch();
          if(cfg.gameSecs>0){
            timerInt=setInterval(()=>{
              if(!gs?.running)return;
              gs.gameTime=Math.max(0,gs.gameTime-1);
              renderHUD(hud,gs,cfg);
              saveResumeState();
              if(gs.gameTime<=0){gs.running=false;clearInterval(timerInt);timerInt=null;showWinner(winEl,gs,doRematch,doLeave);}
            },1000);
          }
        });
      }
      // start countdown after layout paint
      requestAnimationFrame(()=>{ setTimeout(startTimerAndCD, 0); });

      // ── keyboard
      function kd(e){
        keys[e.key]=true;
        if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Enter'].includes(e.key))e.preventDefault();
      }
      function ku(e){
        keys[e.key]=false;
      }
      document.addEventListener('keydown',kd);document.addEventListener('keyup',ku);
      evCleaners.push(()=>{document.removeEventListener('keydown',kd);document.removeEventListener('keyup',ku);});

      // ── game loop
      function loop(ts){
        animId=requestAnimationFrame(loop);
        if(!gs||!currentBS)return;   // wait until canvas is sized
        const dt=Math.min((ts-lastT)/1000,0.05);lastT=ts;

        // keyboard
        if(!isLocal&&myIdx>=0){
          if(inp[myIdx]){
            inp[myIdx].axis=0;
            const sign=gs.pucks[myIdx]?.dirSign??1;
            KB.forEach(kb=>{
              if(keys[kb.neg])inp[myIdx].axis=-1*sign;
              else if(keys[kb.pos])inp[myIdx].axis=1*sign;
              if(keys[kb.bump])inp[myIdx].bump=true;
            });
          }
        }else{
          KB.forEach((kb,pi)=>{
            if(!inp[pi])return;
            inp[pi].axis=0;
            const sign=gs.pucks[pi]?.dirSign??1;
            if(keys[kb.neg])inp[pi].axis=-1*sign;
            else if(keys[kb.pos])inp[pi].axis=1*sign;
            if(keys[kb.bump])inp[pi].bump=true;
          });
        }
        // joystick → puck axis
        if(gs.pucks){
          gs.pucks.forEach((p,i)=>{
            if(!inp[i])return;
            const s=gs.sides[p.sideIdx];
            const proj=inp[i].axisX*s.axX+inp[i].axisY*s.axY;
            if(Math.abs(proj)>0.1)inp[i].axis=proj;
          });
        }
        // send input to host — throttled to ~30Hz (was every rAF, up to
        // 60Hz); a 1D constrained puck doesn't need 60 axis updates/sec.
        if(!isLocal&&!isHost&&myIdx>=0&&inp[myIdx]){
          if(!loop._lastInp||ts-loop._lastInp>33){
            loop._lastInp=ts;
            api.send('rcs-inp',{pi:myIdx,axis:inp[myIdx].axis,axisX:inp[myIdx].axisX,axisY:inp[myIdx].axisY,bump:inp[myIdx].bump});
          }
        }

        // ease toward the last host-authoritative state (guest only). We
        // interpolate p.t (track position), not x/y directly, because
        // stepGame() below recomputes x/y from t every frame anyway —
        // smoothing t is what actually removes the visible snap.
        if(!isHost&&!isLocal&&gs._net){
          const net=gs._net,k=Math.min(1,dt*8);
          gs.ball.x+=(net.bx-gs.ball.x)*k;
          gs.ball.y+=(net.by-gs.ball.y)*k;
          gs.ball.vx=net.bvx;gs.ball.vy=net.bvy;
          net.pt.forEach((t,i)=>{
            if(t==null)return; // myIdx — left alone, driven by local input
            const p=gs.pucks[i];
            if(p) p.t+=(t-p.t)*k;
          });
        }

        stepGame(gs,inp,dt);
        if(!isLocal&&myIdx>=0){
          if(inp[myIdx]){
            let anyBump=false;
            KB.forEach(kb=>{if(keys[kb.bump])anyBump=true;});
            if(!anyBump)inp[myIdx].bump=false;
          }
        }else{
          inp.forEach((ii,pi)=>{if(!keys[KB[pi]?.bump])ii.bump=false;});
        }

        // goal (only Host or Local mode detects and triggers goal sequence)
        if((isHost||isLocal)&&gs.goalEvent&&!goalLocked){
          goalLocked=true;
          const{playerIdx,team}=gs.goalEvent;
          const conceded=gs.scores[playerIdx];
          if(!isLocal) api.broadcast('rcs-goal-ev',{playerIdx,team,scores:[...gs.scores],teamScores:[...gs.teamScores]});
          saveResumeState();
          showFlash(flashEl,gs.pucks[playerIdx],cfg.mode==='teams'?TEAM_NAMES[team]:null);
          renderHUD(hud,gs,cfg);
          if(conceded>=gs.goalWin){
            gs.running=false;clearInterval(timerInt);timerInt=null;
            setTimeout(()=>{hideFlash(flashEl);showWinner(winEl,gs,doRematch,doLeave);},1900);
          } else {
            setTimeout(()=>{hideFlash(flashEl);resetAfterGoal(gs);goalLocked=false;runCD(3,doLaunch);},1900);
          }
        }

        // host broadcast
        if(isHost&&!isLocal){
          if(!loop._ls||ts-loop._ls>100){loop._ls=ts;
            api.broadcast('rcs-state',{bx:gs.ball.x,by:gs.ball.y,bvx:gs.ball.vx,bvy:gs.ball.vy,px:gs.pucks.map(p=>({x:p.x,y:p.y,t:p.t})),scores:[...gs.scores],teamScores:[...gs.teamScores],gameTime:gs.gameTime,bs:gs.bs});
          }
        }

        drawBoard(ctx,gs,myPovAngle);
      }
      lastT=performance.now();
      animId=requestAnimationFrame(loop);

      // network
      if(!isLocal){
        api.on('rcs-launch',()=>{if(!isHost&&gs)launchBall(gs);});
        api.on('rcs-inp',({pi,axis,axisX,axisY,bump})=>{if(!isHost||!inp[pi])return;inp[pi].axis=axis;inp[pi].axisX=axisX;inp[pi].axisY=axisY;inp[pi].bump=bump;});
        api.on('rcs-state',({bx,by,bvx,bvy,px,scores:sc,teamScores:ts2,gameTime:gt,bs:rbs})=>{
          if(isHost||!gs)return;
          const sc2=gs.bs/(rbs||gs.bs);
          // Soft-correction target, applied via interpolation in the loop
          // instead of a hard snap here. myIdx is stored as null on purpose:
          // the local player's own puck is driven by their own real-time
          // input, and overwriting it with a ~100ms-stale echo of itself
          // is exactly what produced the visible rubber-band/lag. Remote
          // pucks and the ball ease toward this target each frame instead.
          gs._net={
            bx:bx*sc2,by:by*sc2,bvx,bvy,
            pt:px.map((rp,i)=>i===myIdx?null:rp.t)
          };
          gs.scores=[...sc];gs.teamScores=[...ts2];gs.gameTime=gt;
        });
        api.on('rcs-goal-ev',({playerIdx,team,scores:sc,teamScores:ts2})=>{
          if(isHost||!gs)return;
          goalLocked=true;
          gs.scores=[...sc];gs.teamScores=[...ts2];
          showFlash(flashEl,gs.pucks[playerIdx],cfg.mode==='teams'?TEAM_NAMES[team]:null);
          renderHUD(hud,gs,cfg);
          
          const conceded=gs.scores[playerIdx];
          if(conceded>=gs.goalWin){
            gs.running=false;
            setTimeout(()=>{hideFlash(flashEl);showWinner(winEl,gs,doRematch,doLeave);},1900);
          } else {
            setTimeout(()=>{hideFlash(flashEl);resetAfterGoal(gs);goalLocked=false;runCD(3,()=>{});},1900);
          }
        });
        api.on('rcs-restart',(c)=>startGame(c,api.getPlayers()));
      }

      function doRematch(){if(!isLocal)api.broadcast('rcs-restart',{...cfg});startGame({...cfg},api.getPlayers());}
      function doLeave(){api.endGame();}
    }

    // ════════════════════════════════════════
    //  CONTROLLER STRIP
    // ════════════════════════════════════════
    function makeController(pi){
      const col=PLAYER_COLORS[pi%8];
      const el=document.createElement('div');
      el.style.cssText='position:absolute;bottom:0;left:0;right:0;height:88px;background:rgba(8,8,18,0.95);backdrop-filter:blur(12px);border-top:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:center;gap:20px;z-index:20;padding:0 24px;';

      const joyS=58,knobS=24,btnS=50,maxD=16;
      const jw=document.createElement('div');
      jw.style.cssText='width:'+joyS+'px;height:'+joyS+'px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#2a2a2a,#0c0c0c);border:2px solid #333;position:relative;cursor:pointer;touch-action:none;flex-shrink:0;box-shadow:0 4px 14px rgba(0,0,0,0.7);';
      const knob=document.createElement('div');
      knob.style.cssText='width:'+knobS+'px;height:'+knobS+'px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#666,#1e1e1e);border:1px solid #444;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;transition:transform 0.07s;';
      jw.appendChild(knob);

      const info=document.createElement('div');
      info.style.cssText='display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0;';
      info.innerHTML='<div style="width:10px;height:10px;border-radius:50%;background:'+col+';box-shadow:0 0 10px '+col+'88;"></div><div style="color:'+col+';font-size:0.58rem;font-weight:700;letter-spacing:1px;">P'+(pi+1)+'</div>';

      const btn=document.createElement('div');
      btn.style.cssText='width:'+btnS+'px;height:'+btnS+'px;border-radius:50%;background:radial-gradient(circle at 38% 32%,'+col+'ee,'+col+'66);border:2px solid '+col+'44;box-shadow:0 5px 0 rgba(0,0,0,0.6),0 0 18px '+col+'44;cursor:pointer;flex-shrink:0;touch-action:none;transition:transform 0.06s,box-shadow 0.06s;';

      el.appendChild(jw);el.appendChild(info);el.appendChild(btn);

      let drag=false,ox=0,oy=0;
      function sd(cx,cy){drag=true;const r=jw.getBoundingClientRect();ox=r.left+r.width/2;oy=r.top+r.height/2;md(cx,cy);}
      function md(cx,cy){if(!drag)return;let dx=cx-ox,dy=cy-oy;const d=Math.sqrt(dx*dx+dy*dy);if(d>maxD){dx=dx/d*maxD;dy=dy/d*maxD;}knob.style.transform='translate(calc(-50% + '+dx+'px),calc(-50% + '+dy+'px))';if(inp[pi]){inp[pi].axisX=dx/maxD;inp[pi].axisY=dy/maxD;}}
      function ed(){drag=false;knob.style.transform='translate(-50%,-50%)';if(inp[pi]){inp[pi].axisX=0;inp[pi].axisY=0;inp[pi].axis=0;}}
      jw.addEventListener('mousedown',e=>{e.preventDefault();sd(e.clientX,e.clientY);});
      jw.addEventListener('touchstart',e=>{e.preventDefault();sd(e.touches[0].clientX,e.touches[0].clientY);},{passive:false});
      const mm=e=>{if(drag)md(e.clientX,e.clientY);};
      const tm=e=>{if(drag)md(e.touches[0].clientX,e.touches[0].clientY);};
      document.addEventListener('mousemove',mm);document.addEventListener('touchmove',tm,{passive:false});
      document.addEventListener('mouseup',ed);document.addEventListener('touchend',ed);
      evCleaners.push(()=>{document.removeEventListener('mousemove',mm);document.removeEventListener('touchmove',tm);document.removeEventListener('mouseup',ed);document.removeEventListener('touchend',ed);});

      function pb(){if(inp[pi])inp[pi].bump=true;btn.style.transform='translateY(4px)';btn.style.boxShadow='0 1px 0 rgba(0,0,0,0.6),0 0 8px '+col+'44';}
      function rb(){if(inp[pi])inp[pi].bump=false;btn.style.transform='';btn.style.boxShadow='0 5px 0 rgba(0,0,0,0.6),0 0 18px '+col+'44';}
      btn.addEventListener('mousedown',e=>{e.preventDefault();pb();});
      btn.addEventListener('touchstart',e=>{e.preventDefault();pb();},{passive:false});
      btn.addEventListener('mouseup',rb);btn.addEventListener('touchend',rb);btn.addEventListener('mouseleave',rb);
      return el;
    }

    // ════════════════════════════════════════
    //  HUD / FLASH / WIN
    // ════════════════════════════════════════
    function renderHUD(bar,gs,cfg){
      if(!gs){bar.innerHTML='';return;}
      const urgent=cfg.gameSecs>0&&gs.gameTime<=30;
      const mm=String(Math.floor(gs.gameTime/60)).padStart(2,'0'),ss=String(gs.gameTime%60).padStart(2,'0');
      let h='';
      if(gs.mode==='teams'){
        h='<span style="color:'+TEAM_COLORS[0]+';font-weight:700;font-size:clamp(10px,2.5vw,14px);">A '+gs.teamScores[0]+'</span><span style="color:rgba(255,255,255,0.22);font-size:0.8em;"> vs </span><span style="color:'+TEAM_COLORS[1]+';font-weight:700;font-size:clamp(10px,2.5vw,14px);">B '+gs.teamScores[1]+'</span>';
      }else{
        h=gs.pucks.map((p,i)=>'<div style="display:flex;align-items:center;gap:3px;"><div style="width:8px;height:8px;border-radius:50%;background:'+p.color+';"></div><span style="color:rgba(255,255,255,0.6);font-size:clamp(9px,2vw,12px);font-weight:600;">P'+(i+1)+':<span style="color:'+p.color+';margin-left:1px;">'+gs.scores[i]+'</span></span></div>').join('');
      }
      if(cfg.gameSecs>0) h+='<div style="padding:2px 8px;border-radius:7px;background:'+(urgent?'rgba(255,80,80,0.2)':'rgba(255,255,255,0.07)')+';border:1px solid '+(urgent?'rgba(255,80,80,0.4)':'rgba(255,255,255,0.08)')+';color:'+(urgent?'#ff6060':'rgba(255,255,255,0.65)')+';font-size:clamp(9px,2vw,12px);font-weight:700;letter-spacing:2px;">'+mm+':'+ss+'</div>';
      bar.innerHTML=h;
    }
    function showFlash(el,puck,teamLabel){
      el.style.display='flex';el.style.background='radial-gradient(circle,'+puck.color+'20 0%,transparent 60%)';
      el.innerHTML='<div style="font-family:Righteous,cursive;font-size:clamp(28px,10vw,72px);color:'+puck.color+';font-weight:900;letter-spacing:4px;text-shadow:0 0 50px '+puck.color+';animation:rcsGPop 0.22s cubic-bezier(0.16,1,0.3,1) both;">GOAL!</div>'
        +'<div style="color:'+puck.color+';opacity:0.8;font-size:clamp(12px,4vw,22px);font-weight:700;margin-top:6px;animation:rcsGPop 0.28s 0.06s cubic-bezier(0.16,1,0.3,1) both;">P'+(puck.playerIdx+1)+' concedes'+(teamLabel?' ('+teamLabel+')':'')+'</div>';
    }
    function hideFlash(el){el.style.display='none';el.innerHTML='';}
    function showWinner(el,gs,rematch,leave){
      let label,color;
      if(gs.mode==='teams'){
        const lT=gs.teamScores[0]>gs.teamScores[1]?0:gs.teamScores[1]>gs.teamScores[0]?1:-1,wT=lT===0?1:lT===1?0:-1;
        label=wT===-1?'🤝 DRAW!':'🏆 '+TEAM_NAMES[wT]+' WINS!';color=wT===-1?'#fff':TEAM_COLORS[wT];
      }else{
        const minG=Math.min(...gs.scores),wins=gs.pucks.filter(p=>gs.scores[p.playerIdx]===minG);
        if(wins.length===1){label='🏆 P'+(wins[0].playerIdx+1)+' WINS!';color=wins[0].color;}
        else{label='🤝 DRAW!';color='#fff';}
      }
      const scoreHtml=gs.mode==='teams'
        ?[0,1].map(t=>'<div style="padding:4px 10px;border-radius:8px;background:'+TEAM_COLORS[t]+'20;border:1px solid '+TEAM_COLORS[t]+'44;color:'+TEAM_COLORS[t]+';font-size:0.75rem;font-weight:700;">'+TEAM_NAMES[t]+': '+gs.teamScores[t]+'⚽</div>').join('')
        :gs.pucks.map((p,i)=>'<div style="padding:4px 8px;border-radius:8px;background:'+p.color+'20;border:1px solid '+p.color+'44;color:'+p.color+';font-size:0.72rem;font-weight:700;">P'+(i+1)+': '+gs.scores[i]+'⚽</div>').join('');
      el.style.display='flex';
      el.innerHTML='<div style="font-family:Righteous,cursive;font-size:clamp(22px,6vw,52px);color:'+color+';text-shadow:0 0 40px '+color+'88;text-align:center;padding:0 20px;">'+label+'</div>'
        +'<div style="display:flex;gap:7px;flex-wrap:wrap;justify-content:center;">'+scoreHtml+'</div>'
        +'<div style="display:flex;gap:9px;margin-top:8px;"><button id="rcs-rm" style="padding:10px 26px;background:linear-gradient(135deg,#00e5ff,#0099cc);border:none;border-radius:10px;color:#000;font-family:Righteous,cursive;font-size:0.9rem;cursor:pointer;">REMATCH</button><button id="rcs-lv" style="padding:10px 18px;background:rgba(255,255,255,0.07);border:1.5px solid rgba(255,255,255,0.12);border-radius:10px;color:rgba(255,255,255,0.65);font-family:Quicksand,sans-serif;font-size:0.85rem;cursor:pointer;font-weight:700;">Leave</button></div>';
      el.querySelector('#rcs-rm').onclick=rematch;
      el.querySelector('#rcs-lv').onclick=leave;
    }

    // non-host receives config
    if(!isLocal) api.on('rcs-cfg',(c)=>startGame({...c},api.getPlayers()));

    // A guest reconnecting mid-match has no running game at all yet (fresh
    // create() call) — host resends cfg plus the current score/clock so
    // their fresh startGame() lands at the right score instead of 0-0.
    if(isHost && !isLocal){
      api.onPlayerRejoinedMidgame(({playerId})=>{
        if(!gs) return; // still on config screen — nothing to resync
        api.sendTo(playerId,'rcs-cfg-resume',{
          cfg,
          scores:[...gs.scores],
          teamScores:[...gs.teamScores],
          gameTime:gs.gameTime,
        });
      });
      // onPlayerRejoinedMidgame can fire before the rejoining guest's own
      // dynamic import finishes and registers the 'rcs-cfg-resume' listener
      // below — a push that arrives too early is silently dropped (no
      // buffering/retry). Guests also pull explicitly once ready; same gs
      // guard applies (host just no-ops if asked before a match exists).
      api.on('rcs-request-state',(_payload,fromPeer)=>{
        if(!gs) return;
        api.sendTo(fromPeer,'rcs-cfg-resume',{
          cfg,
          scores:[...gs.scores],
          teamScores:[...gs.teamScores],
          gameTime:gs.gameTime,
        });
      });
    }
    // Guest has no gs at all until it receives cfg from the host (fresh
    // create() call, nothing built yet) — so unlike other games there's no
    // local guard to check before asking; always request once ready to
    // listen. Harmless on a normal fresh game start: the host just hasn't
    // called startGame() yet, so the guard above no-ops and the guest's
    // normal 'rcs-cfg' broadcast (sent when the host actually starts) still
    // arrives separately.
    if(!isLocal) api.send('rcs-request-state',{});
    if(!isLocal) api.on('rcs-cfg-resume',(d)=>{
      const p=d.payload||d;
      startGame({...p.cfg},api.getPlayers());
      // Patch the score/clock in after startGame's own buildState runs —
      // same timing as the resumedRcs path on the host side.
      const apply=()=>{
        if(!gs){requestAnimationFrame(apply);return;}
        gs.scores=[...p.scores];
        gs.teamScores=[...p.teamScores];
        gs.gameTime=p.gameTime;
      };
      requestAnimationFrame(apply);
    });

    if(isHost && resumedRcs){
      // Reconnecting host with an in-progress match — skip the config
      // screen and rebuild the field at the resumed score/clock instead of
      // a fresh 0-0 game. Positions still start fresh (see note above);
      // only score/time/config carry over.
      startGame(resumedRcs.cfg, api.getPlayers());
    } else {
      showConfig();
    }

    return{
      destroy(){
        stopEverything();
        document.getElementById('rcs-css')?.remove();
        root.remove();
      }
    };
  }
};
