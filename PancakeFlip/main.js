/* Pancake Flip - timing based flip mini game */
(()=>{
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const btnStart = document.getElementById('btnStart');
  const btnFlip = document.getElementById('btnFlip');
  const btnRestart = document.getElementById('btnRestart');
  const elScore = document.getElementById('score');
  const elBest = document.getElementById('best');
  const overlay = document.getElementById('overlay');

  const state = {
    running:false,
    pancake:null,
    pan:null,
    heat:0,
    time:0,
    score:0,
    best: Number(localStorage.getItem('pancake_best')||0),
    phase:'idle', // idle, cook, air, land, result
    airT:0,
    perfectWindow: {min:0.46, max:0.54},
    cookLevel:0,
    targetCook:0.5,
    difficulty:1,
    combo:0,
  };
  elBest.textContent = state.best;

  function reset(){
    state.running=false; state.score=0; elScore.textContent=0; state.difficulty=1; state.combo=0;
    newRound();
  }

  function newRound(){
    state.phase='cook';
    state.cookLevel=0; state.targetCook=0.45 + Math.random()*0.2; // range 0.45 - 0.65
    state.pancake={x:canvas.width/2,y:300,r:60,flip:0,rot:0,side:0};
    state.pan={x:canvas.width/2,y:360,w:180,h:30,tilt:0};
    state.airT=0; state.heat=1;
  }

  function start(){
    reset();
    overlay.classList.remove('show');
    state.running=true;
    btnStart.disabled=true; btnRestart.disabled=false; btnFlip.disabled=false;
    requestAnimationFrame(loop);
  }

  function restart(){
    start();
  }

  function flip(){
    if(!state.running) return;
    if(state.phase==='cook'){
      // launch pancake upward, speed depends on cookLevel (bad if uncooked or overcooked)
      const powerBase = 900; // px/s initial velocity
      const quality = 1 - Math.abs(state.cookLevel - state.targetCook)/Math.max(0.001, state.targetCook);
      const vel = powerBase * (0.55 + quality*0.9); // 0.55 - 1.45
      state.phase='air';
      state.pancake.vy = -vel; // upward
      state.pancake.vrot = 6 + quality*10; // rad/s
      state.pancake.y0 = state.pancake.y;
      state.pancake.t0 = performance.now();
      state.pancake.flip = 0; state.pancake.side=1-state.pancake.side;
    } else if(state.phase==='result'){
      newRound();
    }
  }

  function update(dt){
    if(state.phase==='cook'){
      state.cookLevel += dt*0.00012 * (1+state.difficulty*0.4); // 0 - 1+ scale
      if(state.cookLevel>1.5) state.cookLevel=1.5;
    } else if(state.phase==='air'){
      const p = state.pancake;
      p.vy += 1600 * dt/1000; // gravity
      p.y += p.vy * dt/1000;
      p.rot += p.vrot * dt/1000;
      if(p.rot > Math.PI*2){ p.rot -= Math.PI*2; p.flip++; }
      if(p.y >= 300){
        p.y=300; state.phase='land';
      }
    } else if(state.phase==='land'){
      landResult();
    }
  }

  function landResult(){
    // evaluate landing
    const ideal = state.targetCook;
    const diff = Math.abs(state.cookLevel - ideal)/ideal; // relative error
    // rotation closeness to 2*PI * n (flat)
    const rotErr = Math.min(Math.abs(state.pancake.rot % (Math.PI*2)), Math.abs((Math.PI*2) - (state.pancake.rot % (Math.PI*2))));
    const rotNorm = rotErr / (Math.PI); // 0 perfect
    const quality = Math.max(0, 1 - (diff*0.85 + rotNorm*0.5));
    let gained;
    let text;
    if(quality > 0.82){ gained = 200 + Math.round(400*quality); text='PERFECT!'; state.combo++; }
    else if(quality > 0.6){ gained = 120 + Math.round(180*quality); text='GOOD'; state.combo=0; }
    else if(quality > 0.4){ gained = 60 + Math.round(120*quality); text='OK'; state.combo=0; }
    else { gained = Math.round(40*quality); text='MISS'; state.combo=0; }
    const comboBonus = state.combo>1? state.combo*80 : 0;
    const totalGain = gained + comboBonus;
    state.score += totalGain;
    elScore.textContent = state.score;
    flash(elScore);
    if(state.score>state.best){ state.best=state.score; localStorage.setItem('pancake_best', state.best); elBest.textContent=state.best; flash(elBest);}    
    // increase difficulty slowly
    state.difficulty += 0.1;
    displayResult(text + (comboBonus? ` +Combo ${comboBonus}`:''));
  }

  function displayResult(msg){
    state.phase='result';
    overlay.classList.add('show');
    overlay.querySelector('.panel').innerHTML = `<h2>${msg}</h2><p>Score: ${state.score}</p><p class="small">Flip! で次のラウンド / Restart でやり直し</p>`;
  }

  function flash(el){ el.classList.add('flash'); setTimeout(()=> el.classList.remove('flash'),500); }

  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    drawPan();
    drawPancake();
    if(state.phase==='cook') drawCookBar();
    if(state.phase==='air') drawArc();
  }

  function drawPan(){
    const p = state.pan;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle='#222';
    ctx.beginPath(); ctx.ellipse(0,0,p.w/2, p.h/2,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#444';
    ctx.beginPath(); ctx.ellipse(0,0,p.w/2-10, p.h/2-8,0,0,Math.PI*2); ctx.fill();
    // handle
    ctx.fillStyle='#30363d';
    ctx.fillRect(p.w/2 -10, -8, 120,16);
    ctx.restore();
  }

  function drawPancake(){
    const pc = state.pancake;
    if(!pc) return;
    ctx.save();
    ctx.translate(pc.x, pc.y);
    ctx.rotate(pc.rot);
    const cook = Math.min(1, state.cookLevel);
    const raw = '#f8e1a1';
    const done = '#d18c2d';
    const over = '#5d3411';
    let color;
    if(state.cookLevel < state.targetCook*0.5) color=raw; else if(state.cookLevel < state.targetCook*1.25) color=blend(raw,done,(cook)); else if(state.cookLevel < state.targetCook*1.5) color=blend(done,over,(cook- state.targetCook)/ (state.targetCook*0.5)); else color=over;
    ctx.fillStyle=color;
    pancakeShape(pc.r);
    ctx.fill();
    ctx.strokeStyle='#3d2812'; ctx.lineWidth=3; ctx.stroke();
    ctx.restore();
  }

  function pancakeShape(r){
    ctx.beginPath();
    ctx.ellipse(0,0,r*0.95,r,0,0,Math.PI*2);
  }

  function drawCookBar(){
    const w=260, h=18; const x=canvas.width/2 - w/2; const y=40;
    ctx.fillStyle='#111a'; ctx.fillRect(x-4,y-4,w+8,h+8);
    ctx.fillStyle='#233'; ctx.fillRect(x,y,w,h);
    const ratio = Math.min(1, state.cookLevel/ (state.targetCook*1.3));
    const grad = ctx.createLinearGradient(x,y,x+w,y);
    grad.addColorStop(0,'#4caf50'); grad.addColorStop(0.5,'#ffeb3b'); grad.addColorStop(1,'#ff5722');
    ctx.fillStyle=grad; ctx.fillRect(x,y,w*ratio,h);
    // target marker
    const targetX = x + w * (state.targetCook / (state.targetCook*1.3));
    ctx.fillStyle='#fff'; ctx.fillRect(targetX-2,y-4,4,h+8);
    ctx.font='12px system-ui'; ctx.fillStyle='#fff'; ctx.fillText('Cook', x, y-8);
  }

  function drawArc(){
    // optional arc path
  }

  function blend(a,b,t){
    function h(c){return parseInt(c.slice(1),16);} // #rrggbb
    function comp(v,s){return (v>>s)&255;}
    const A=h(a), B=h(b);
    const r = Math.round(comp(A,16)*(1-t)+comp(B,16)*t);
    const g = Math.round(comp(A,8)*(1-t)+comp(B,8)*t);
    const bl = Math.round(comp(A,0)*(1-t)+comp(B,0)*t);
    return `rgb(${r},${g},${bl})`;
  }

  function loop(now){
    if(!state.running) return;
    const dt = 16; // fixed step for stability
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // events
  btnStart.addEventListener('click', start);
  btnRestart.addEventListener('click', restart);
  btnFlip.addEventListener('click', ()=>{
    flip();
  });
  window.addEventListener('keydown', e=>{ if(e.code==='Space'){ e.preventDefault(); flip(); }});
})();
