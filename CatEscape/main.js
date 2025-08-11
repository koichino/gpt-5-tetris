/* Cat Escape - maze escape with selectable cat (updated: single exit, no holes, responsive size) */
(()=>{
  const gridEl = document.getElementById('grid');
  const btnStart = document.getElementById('btnStart');
  const btnReset = document.getElementById('btnReset');
  const catSelect = document.getElementById('catSelect');
  const overlay = document.getElementById('overlay');
  const ovPanel = document.getElementById('ovPanel');
  const elStage = document.getElementById('stage');
  const elMoves = document.getElementById('moves');

  const cats = [
    {id:'normal', name:'ノーマル', cls:'cat'},
    {id:'orange', name:'みけ(オレンジ)', cls:'cat orange'},
    {id:'gray', name:'グレー', cls:'cat gray'},
    {id:'black', name:'ブラック', cls:'cat black'},
    {id:'calico', name:'三毛', cls:'cat calico'},
  ];
  cats.forEach(c=>{const o=document.createElement('option');o.value=c.id;o.textContent=c.name;catSelect.appendChild(o);});

  const state = {
    stage:1,
    moves:0,
    width:15,
    height:15,
    cells:[],
    catPos:{x:1,y:1},
    catType:'normal',
    exitPos:{x:13,y:13},
    running:false,
  };

  function resizeToViewport(){
    const margin = 40;
    const hudAllowance = 220; // header + controls
    const target = 40; // target cell size px
    const availW = Math.max(320, window.innerWidth - margin);
    const availH = Math.max(320, window.innerHeight - hudAllowance);
    const cols = Math.min(60, Math.floor(availW / (target+2)));
    const rows = Math.min(40, Math.floor(availH / (target+2)));
    state.width = Math.max(15, cols);
    state.height = Math.max(15, rows);
  }

  function randMaze(w,h){
    // simple DFS maze (no holes)
    const maze = Array.from({length:h},()=>Array(w).fill('#'));
    function carve(x,y){
      maze[y][x]='.';
      const dirs = [[2,0],[-2,0],[0,2],[0,-2]];
      for(let i=dirs.length-1;i>0;i--){const j=Math.floor(Math.random()* (i+1));[dirs[i],dirs[j]]=[dirs[j],dirs[i]];}
      for(const [dx,dy] of dirs){
        const nx=x+dx, ny=y+dy;
        if(ny>0 && ny<h-1 && nx>0 && nx<w-1 && maze[ny][nx]==='#'){
          maze[y+dy/2][x+dx/2]='.';
          carve(nx,ny);
        }
      }
    }
    carve(1,1);
    return maze;
  }

  function genStage(){
    resizeToViewport();
    const m = randMaze(state.width, state.height);
    state.exitPos={x:state.width-2,y:state.height-2};
    m[state.exitPos.y][state.exitPos.x]='E'; // single exit only
    state.cells=m;
    state.catPos={x:1,y:1};
  }

  function render(){
    gridEl.innerHTML='';
    gridEl.style.gridTemplateColumns=`repeat(${state.width},32px)`; // keep visual size; could adapt to width if desired
    for(let y=0;y<state.height;y++){
      for(let x=0;x<state.width;x++){
        const t = state.cells[y][x];
        const cell = document.createElement('div');
        cell.className='cell ' + (t==='#'?'wall': t==='E'?'exit':'floor');
        cell.setAttribute('role','gridcell');
        cell.setAttribute('aria-label', `(${x},${y}) ${t}`);
        if(state.catPos.x===x && state.catPos.y===y){
          const catWrapper = document.createElement('div');
          const catCls = cats.find(c=>c.id===state.catType)?.id || 'normal';
          catWrapper.className = 'cat ' + catCls;
          const body = document.createElement('div'); body.className='catBody';
          const face = document.createElement('div'); face.className='face';
            const eyes = document.createElement('div'); eyes.className='eyes'; eyes.innerHTML='<span></span><span></span>';
            const mouth = document.createElement('div'); mouth.className='mouth';
          face.appendChild(eyes); face.appendChild(mouth); body.appendChild(face); catWrapper.appendChild(body);
          cell.appendChild(catWrapper);
        }
        gridEl.appendChild(cell);
      }
    }
  }

  function start(){
    state.stage=1; elStage.textContent=state.stage; state.moves=0; elMoves.textContent=0; state.running=true;
    btnStart.disabled=true; btnReset.disabled=false;
    nextLevel();
    hideOverlay();
  }

  function nextLevel(){
    genStage();
    render();
  }

  function reset(){
    state.running=false; btnStart.disabled=false; btnReset.disabled=true; catSelect.disabled=false; showOverlay(`<h2>Cat Escape</h2><p>Start で開始。矢印キー / ボタンで移動。緑の出口マスに入るとクリア。猫はいつでも変更できます。</p><p class='small'>ステージは毎回ランダム生成し、画面サイズに応じて広がります。</p>`);
  }

  function move(dx,dy){
    if(!state.running) return;
    const nx = state.catPos.x+dx, ny = state.catPos.y+dy;
    if(nx<0||ny<0||nx>=state.width||ny>=state.height) return;
    const tile = state.cells[ny][nx];
    if(tile==='#') return; // wall
    state.catPos={x:nx,y:ny};
    state.moves++; elMoves.textContent=state.moves;
    render();
    if(tile==='E'){
      levelComplete('出口に到達!');
    }
  }

  function levelComplete(msg){
    state.stage++; elStage.textContent=state.stage-1; // show completed number
    state.running=false;
    showOverlay(`<h2>${msg}</h2><p>手数: ${state.moves}</p><p><button id='btnNext'>次のステージ</button></p>`);
    setTimeout(()=>{
      const btnNext = document.getElementById('btnNext');
      btnNext?.addEventListener('click', ()=>{
        hideOverlay();
        state.running=true; elStage.textContent=state.stage; nextLevel();
      });
    },30);
  }

  function showOverlay(html){ overlay.classList.add('show'); ovPanel.innerHTML=html; }
  function hideOverlay(){ overlay.classList.remove('show'); }

  btnStart.addEventListener('click', start);
  btnReset.addEventListener('click', reset);
  catSelect.addEventListener('change', e=>{ state.catType = catSelect.value; render(); });
  document.querySelectorAll('.ctrl').forEach(b=> b.addEventListener('click',()=>{
    const m=b.dataset.move;
    if(m==='up') move(0,-1); else if(m==='down') move(0,1); else if(m==='left') move(-1,0); else if(m==='right') move(1,0);
  }));
  window.addEventListener('keydown', e=>{
    if(!state.running && e.code==='Enter'){ start(); }
    if(!state.running) return;
    if(e.code==='ArrowUp') move(0,-1); else if(e.code==='ArrowDown') move(0,1); else if(e.code==='ArrowLeft') move(-1,0); else if(e.code==='ArrowRight') move(1,0);
  });
  window.addEventListener('resize', ()=>{ if(!state.running){ genStage(); render(); } });

  reset();
})();
