(() => {
  const canvas = document.getElementById('canvas');
  const gridCanvas = document.getElementById('grid');
  const bgCanvas = document.getElementById('bg');
  const wrap = document.getElementById('canvasWrap');

  const toolButtons = Array.from(document.querySelectorAll('.tool-btn'));
  const colorEl = document.getElementById('color');
  const sizeEl = document.getElementById('size');
  const sizeValEl = document.getElementById('sizeVal');
  const pressureEl = document.getElementById('pressure');
  const gridToggleEl = document.getElementById('gridToggle');
  const themeToggleEl = document.getElementById('themeToggle');
  const undoBtn = document.getElementById('undo');
  const redoBtn = document.getElementById('redo');
  const clearBtn = document.getElementById('clear');
  const saveBtn = document.getElementById('save');

  const ctx = canvas.getContext('2d');
  const gridCtx = gridCanvas.getContext('2d');
  const bgCtx = bgCanvas.getContext('2d');

  const BASE_W = 1200;
  const BASE_H = 900; // 4:3

  let drawing = false;
  let last = null;
  let imgStack = []; // for undo
  let redoStack = [];
  let tool = 'pen';
  let theme = (localStorage.getItem('cambus-theme') || 'light');

  function resizeCanvas() {
    if (canvas.width !== BASE_W || canvas.height !== BASE_H) {
      canvas.width = BASE_W;
      canvas.height = BASE_H;
    }
    if (gridCanvas.width !== BASE_W || gridCanvas.height !== BASE_H) {
      gridCanvas.width = BASE_W;
      gridCanvas.height = BASE_H;
    }
    if (bgCanvas.width !== BASE_W || bgCanvas.height !== BASE_H) {
      bgCanvas.width = BASE_W;
      bgCanvas.height = BASE_H;
    }
    drawBackground();
    drawGrid();
  }

  function pushUndo() {
    try {
      const url = canvas.toDataURL();
      imgStack.push(url);
      if (imgStack.length > 50) imgStack.shift();
      redoStack.length = 0;
      updateUndoRedoUI();
    } catch {}
  }

  function restoreFrom(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { ctx.clearRect(0,0,BASE_W,BASE_H); ctx.drawImage(img, 0, 0); resolve(); };
      img.src = url;
    });
  }

  function undo() {
    if (!imgStack.length) return;
    const current = canvas.toDataURL();
    const prev = imgStack.pop();
    redoStack.push(current);
    restoreFrom(prev);
    updateUndoRedoUI();
  }
  function redo() {
    if (!redoStack.length) return;
    const current = canvas.toDataURL();
    const next = redoStack.pop();
    imgStack.push(current);
    restoreFrom(next);
    updateUndoRedoUI();
  }
  function updateUndoRedoUI() {
    undoBtn.disabled = imgStack.length === 0;
    redoBtn.disabled = redoStack.length === 0;
  }

  function setTool(next) {
    tool = next;
    toolButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tool === tool)));
  }

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
    themeToggleEl.textContent = theme === 'dark' ? '🌞 ライトモード' : '🌓 ダークモード';
    drawBackground();
    drawGrid();
  }

  function invertDrawingColors() {
    // Invert only non-transparent pixels on the drawing canvas
    const img = ctx.getImageData(0, 0, BASE_W, BASE_H);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3];
      if (a === 0) continue; // skip fully transparent
      d[i] = 255 - d[i];     // R
      d[i + 1] = 255 - d[i + 1]; // G
      d[i + 2] = 255 - d[i + 2]; // B
      // alpha unchanged
    }
    ctx.putImageData(img, 0, 0);
  }

  function drawBackground() {
    const cs = getComputedStyle(document.documentElement);
    const bgColor = cs.getPropertyValue('--canvas').trim() || '#ffffff';
    bgCtx.save();
    bgCtx.fillStyle = bgColor;
    bgCtx.fillRect(0,0,BASE_W,BASE_H);
    bgCtx.restore();
  }

  function startDraw(x, y, p = 1.0) {
    drawing = true;
    last = { x, y };
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = tool === 'eraser' ? '#00000000' : colorEl.value;
    ctx.lineWidth = getLineWidth(p);
    if (tool === 'pen' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(x, y);
      // Ensure a tap without move still affects pixels (esp. eraser)
      if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineTo(x + 0.01, y + 0.01);
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    pushUndo();
  }

  function getLineWidth(pressure) {
    const base = parseInt(sizeEl.value, 10) || 1;
    if (pressureEl.checked) return Math.max(1, base * (pressure || 1));
    return base;
  }

  function drawTo(x, y, p = 1.0) {
    if (!drawing) return;
    const lw = getLineWidth(p);
    if (tool === 'pen') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = colorEl.value;
      ctx.lineWidth = lw;
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = lw;
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    } else {
      drawGuide(last.x, last.y, x, y);
    }
  }

  function endDraw(x, y) {
    if (!drawing) return;
    drawing = false;
    gridCtx.clearRect(0,0,BASE_W,BASE_H);

    if (tool === 'line' && last) {
      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineWidth = parseInt(sizeEl.value, 10) || 1;
      ctx.strokeStyle = colorEl.value;
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === 'rect' && last) {
      const w = x - last.x; const h = y - last.y;
      ctx.lineWidth = Math.max(1, (parseInt(sizeEl.value,10)||1));
      ctx.strokeStyle = colorEl.value;
      ctx.strokeRect(last.x + 0.5, last.y + 0.5, w, h);
    } else if (tool === 'circle' && last) {
      const r = Math.hypot(x - last.x, y - last.y);
      ctx.beginPath();
      ctx.lineWidth = Math.max(1, (parseInt(sizeEl.value,10)||1));
      ctx.strokeStyle = colorEl.value;
      ctx.arc(last.x, last.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    last = null;
  }

  function drawGuide(x0, y0, x1, y1) {
    gridCtx.clearRect(0,0,BASE_W,BASE_H);
    gridCtx.save();
    const guideColor = (theme === 'dark') ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
    gridCtx.strokeStyle = guideColor;
    gridCtx.setLineDash([6, 6]);
    gridCtx.lineWidth = 1;
    if (tool === 'line') {
      gridCtx.beginPath();
      gridCtx.moveTo(x0, y0);
      gridCtx.lineTo(x1, y1);
      gridCtx.stroke();
    } else if (tool === 'rect') {
      gridCtx.strokeRect(x0 + 0.5, y0 + 0.5, x1 - x0, y1 - y0);
    } else if (tool === 'circle') {
      const r = Math.hypot(x1 - x0, y1 - y0);
      gridCtx.beginPath();
      gridCtx.arc(x0, y0, r, 0, Math.PI * 2);
      gridCtx.stroke();
    }
    gridCtx.restore();
  }

  function drawGrid() {
    const enable = gridToggleEl.checked;
    if (!enable) {
      gridCanvas.classList.remove('grid-on');
      gridCtx.clearRect(0,0,BASE_W,BASE_H);
      return;
    }
    gridCanvas.classList.add('grid-on');
  }

  function toCanvasCoords(evt) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = BASE_W / rect.width;
    const scaleY = BASE_H / rect.height;
    const clientX = (evt.touches ? evt.touches[0].clientX : evt.clientX);
    const clientY = (evt.touches ? evt.touches[0].clientY : evt.clientY);
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    const pressure = (evt.pressure && evt.pressure > 0 ? evt.pressure : 1.0);
    return { x, y, pressure };
  }

  function clearAll() {
    ctx.clearRect(0,0,BASE_W,BASE_H);
    gridCtx.clearRect(0,0,BASE_W,BASE_H);
  }

  function savePNG() {
    const tmp = document.createElement('canvas');
    tmp.width = BASE_W; tmp.height = BASE_H;
    const tctx = tmp.getContext('2d');
    tctx.drawImage(bgCanvas, 0, 0);
    tctx.drawImage(canvas, 0, 0);
    const a = document.createElement('a');
    a.href = tmp.toDataURL('image/png');
    a.download = `drawing-${Date.now()}.png`;
    a.click();
  }

  // Events
  sizeEl.addEventListener('input', () => sizeValEl.textContent = sizeEl.value);
  toolButtons.forEach(btn => btn.addEventListener('click', () => setTool(btn.dataset.tool)));
  gridToggleEl.addEventListener('change', drawGrid);
  themeToggleEl.addEventListener('click', () => {
    theme = (theme === 'dark' ? 'light' : 'dark');
    localStorage.setItem('cambus-theme', theme);
    // Invert existing drawing to keep対比 when theme changes
    invertDrawingColors();
    applyTheme();
  });

  // Hotkeys for tools
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (!e.ctrlKey && !e.metaKey) {
      if (k === 'p') setTool('pen');
      else if (k === 'e') setTool('eraser');
      else if (k === 'l') setTool('line');
      else if (k === 'r') setTool('rect');
      else if (k === 'c') setTool('circle');
    }
    if ((e.ctrlKey || e.metaKey) && k === 'z') {
      if (e.shiftKey) redo(); else undo();
      e.preventDefault();
    }
  });

  // Pointer events
  function onDown(e) {
    e.preventDefault();
    const { x, y, pressure } = toCanvasCoords(e);
    startDraw(x, y, pressure);
  }
  function onMove(e) {
    if (!drawing) return; e.preventDefault();
    const { x, y, pressure } = toCanvasCoords(e);
    drawTo(x, y, pressure);
  }
  function onUp(e) {
    if (!drawing) return; e.preventDefault();
    const { x, y } = toCanvasCoords(e);
    endDraw(x, y);
  }

  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);

  // Buttons
  undoBtn.addEventListener('click', undo);
  redoBtn.addEventListener('click', redo);
  clearBtn.addEventListener('click', () => { pushUndo(); clearAll(); });
  saveBtn.addEventListener('click', savePNG);

  // Init
  resizeCanvas();
  sizeValEl.textContent = sizeEl.value;
  setTool('pen');
  applyTheme();
  drawGrid();

  const ro = new ResizeObserver(() => drawGrid());
  ro.observe(wrap);
})();
