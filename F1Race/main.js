/* F1 Race - simple vertical scrolling lane overtake game */
(() => {
  const gameArea = document.getElementById('gameArea');
  const btnStart = document.getElementById('btnStart');
  const btnPause = document.getElementById('btnPause');
  const btnRestart = document.getElementById('btnRestart');
  const overlay = document.getElementById('overlay');
  const ovTitle = document.getElementById('ovTitle');
  const ovMessage = document.getElementById('ovMessage');
  const elScore = document.getElementById('score');
  const elHighScore = document.getElementById('highScore');
  const elSpeed = document.getElementById('speed');

  const state = {
    running: false,
    paused: false,
    laneCount: 3,
    playerLane: 1,
    playerEl: null,
    speed: 5, // base scroll speed (pixels/frame approx scaled)
    speedTarget: 5,
    distance: 0,
    score: 0,
    highScore: Number(localStorage.getItem('f1race_high')||0),
    enemies: [],
    lastSpawn: 0,
    spawnInterval: 1100,
    lastFrame: 0,
    keys: new Set(),
    difficultyTimer: 0,
  };
  elHighScore.textContent = state.highScore;

  const laneX = lane => ( (lane + 0.5) * (gameArea.clientWidth / state.laneCount) ) - 21; // 42 width /2

  function createPlayer(){
    const el = document.createElement('div');
    el.className = 'car player';
    el.style.bottom = '30px';
    el.style.left = laneX(state.playerLane)+ 'px';
    el.textContent = 'YOU';
    gameArea.appendChild(el);
    state.playerEl = el;
  }

  function createRoad(){
    for(let i=0;i<state.laneCount-1;i++){
      for(let y=0;y<8;y++){
        const d = document.createElement('div');
        d.className='laneDivider';
        d.style.left = ((i+1)/state.laneCount*100)+'%';
        d.style.top = (y*80)+'px';
        d.dataset.offset = y*80;
        gameArea.appendChild(d);
      }
    }
    const leftEdge = document.createElement('div'); leftEdge.className='roadEdge left'; gameArea.appendChild(leftEdge);
    const rightEdge = document.createElement('div'); rightEdge.className='roadEdge right'; gameArea.appendChild(rightEdge);
  }

  function spawnEnemy(time){
    const lane = Math.floor(Math.random()*state.laneCount);
    const el = document.createElement('div');
    const fast = Math.random() < 0.25 && state.speed > 9;
    el.className = 'car enemy'+(fast?' fast':'');
    el.style.top = '-90px';
    el.style.left = laneX(lane)+'px';
    el.dataset.lane = lane;
    el.dataset.speed = (fast? (state.speed + 2.5) : (state.speed - 0.5 + Math.random()*1.2)).toFixed(2);
    gameArea.appendChild(el);
    state.enemies.push({el,lane,y:-90,speed:parseFloat(el.dataset.speed),passed:false});
    state.lastSpawn = time;
    // adjust spawn interval by speed
    state.spawnInterval = Math.max(320, 1100 - (state.speed-5)*55);
  }

  function moveLaneMarkers(dt){
    const markers = gameArea.querySelectorAll('.laneDivider');
    markers.forEach(m => {
      let off = parseFloat(m.dataset.offset);
      off += state.speed * dt * 0.09; // scroll factor
      if(off > gameArea.clientHeight) off -= (gameArea.clientHeight + 80);
      m.dataset.offset = off;
      m.style.top = off+'px';
    });
  }

  function updateEnemies(dt){
    for(let i=state.enemies.length-1;i>=0;i--){
      const e = state.enemies[i];
      e.y += e.speed * dt * 0.09;
      e.el.style.top = e.y+'px';
      if(!e.passed && e.y > parseFloat(state.playerEl.style.bottom)+120){
        e.passed = true;
        state.score += 10;
        elScore.textContent = state.score;
        flash(elScore);
        if(state.score > state.highScore){
          state.highScore = state.score;
          localStorage.setItem('f1race_high', state.highScore);
          elHighScore.textContent = state.highScore;
          flash(elHighScore);
        }
      }
      if(e.y > gameArea.clientHeight + 120){
        e.el.remove();
        state.enemies.splice(i,1);
      }
    }
  }

  function checkCollisions(){
    const pRect = state.playerEl.getBoundingClientRect();
    for(const e of state.enemies){
      const r = e.el.getBoundingClientRect();
      if(!(r.right < pRect.left+6 || r.left > pRect.right-6 || r.bottom < pRect.top+6 || r.top > pRect.bottom-6)){
        explode((pRect.left + pRect.right)/2 - gameArea.getBoundingClientRect().left,
                (pRect.top + pRect.bottom)/2 - gameArea.getBoundingClientRect().top);
        gameOver();
        return;
      }
    }
  }

  function explode(x,y){
    const ex = document.createElement('div');
    ex.className='explosion';
    ex.style.left = (x-10)+'px';
    ex.style.top = (y-10)+'px';
    gameArea.appendChild(ex);
    setTimeout(()=> ex.remove(), 650);
  }

  function flash(el){
    el.classList.add('flash');
    setTimeout(()=> el.classList.remove('flash'), 500);
  }

  function setOverlay(title,msg){
    ovTitle.textContent = title;
    ovMessage.textContent = msg;
    overlay.classList.remove('hidden');
  }

  function hideOverlay(){
    overlay.classList.add('hidden');
  }

  function gameOver(){
    state.running = false;
    btnStart.disabled = false;
    btnPause.disabled = true;
    btnRestart.disabled = false;
    setOverlay('Game Over', `Score: ${state.score}`);
  }

  function reset(){
    state.running=false; state.paused=false;
    state.playerLane=1; state.speed=5; state.speedTarget=5;
    state.distance=0; state.score=0; state.enemies=[]; state.lastSpawn=0; state.difficultyTimer=0;
    elScore.textContent=0; elSpeed.textContent='0';
    gameArea.innerHTML='';
    createRoad();
    createPlayer();
    hideOverlay();
  }

  function start(){
    reset();
    btnStart.disabled = true;
    btnPause.disabled = false;
    btnRestart.disabled = false;
    state.running = true;
    state.lastFrame = performance.now();
    requestAnimationFrame(loop);
  }

  function togglePause(){
    if(!state.running) return;
    state.paused = !state.paused;
    btnPause.textContent = state.paused? 'Resume':'Pause';
    if(!state.paused){
      state.lastFrame = performance.now();
      requestAnimationFrame(loop);
      hideOverlay();
    } else {
      setOverlay('Paused','P または Pause ボタンで再開');
    }
  }

  function changeLane(dir){
    const newLane = state.playerLane + dir;
    if(newLane < 0 || newLane >= state.laneCount) return;
    state.playerLane = newLane;
    state.playerEl.style.left = laneX(state.playerLane)+'px';
  }

  function difficulty(dt){
    state.difficultyTimer += dt;
    if(state.difficultyTimer > 3000){
      state.difficultyTimer = 0;
      state.speedTarget = Math.min(18, state.speedTarget + 0.6);
    }
    // smooth speed toward target
    state.speed += (state.speedTarget - state.speed)*0.02 * dt/16;
    elSpeed.textContent = state.speed.toFixed(1);
  }

  function loop(now){
    if(!state.running || state.paused) return;
    const dt = Math.min(50, now - state.lastFrame); // ms
    state.lastFrame = now;
    difficulty(dt);
    moveLaneMarkers(dt);
    if(now - state.lastSpawn > state.spawnInterval){
      spawnEnemy(now);
    }
    updateEnemies(dt);
    checkCollisions();
    requestAnimationFrame(loop);
  }

  // Input handling
  window.addEventListener('keydown', e => {
    if(e.code === 'ArrowLeft' || e.code==='KeyA'){ changeLane(-1); }
    else if(e.code === 'ArrowRight' || e.code==='KeyD'){ changeLane(1); }
    else if(e.code === 'KeyP'){ togglePause(); }
  });

  btnStart.addEventListener('click', start);
  btnRestart.addEventListener('click', start);
  btnPause.addEventListener('click', togglePause);

  // init static scene
  createRoad();
  createPlayer();
  setOverlay('F1 Race','Start ボタンで開始');
})();
