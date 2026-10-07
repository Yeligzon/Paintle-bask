/* ═══════════════════════════════════════════════════════════
   Paintle 3D — aplicación principal
   Lienzo 2D (pinceles, formas, relleno) + estudio 3D
   ═══════════════════════════════════════════════════════════ */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const deg = r => (r * 180) / Math.PI;
const rad = d => (d * Math.PI) / 180;

/* ─────────── Referencias DOM ─────────── */
const el = {
  home: $('#home'), gallery: $('#gallery'), app: $('#app'),
  docName: $('#doc-name'), tbMode: $('#tb-mode'),
  stage: $('#stage'), stageInner: $('#stage-inner'), paper: $('#paper'),
  canvas: $('#canvas2d'), overlay: $('#overlay'),
  threed: $('#threed'), threeHost: $('#three-host'), viewcube: $('#viewcube'),
  props: $('#props'), propsForm: $('#props-form'), propsEmpty: $('#props-empty'),
  toasts: $('#toasts'), fileInput: $('#file-input'),
  colorPop: $('#color-pop'),
  galleryGrid: $('#gallery-grid'), galleryEmpty: $('#gallery-empty'),
  statusTool: $('#status-tool'), statusPos: $('#status-pos'), statusSize: $('#status-size'),
  statusObjects: $('#status-objects'), statusZoom: $('#status-zoom')
};

const ctx = el.canvas.getContext('2d', { willReadFrequently: true });
const ov = el.overlay.getContext('2d');
const scratch = document.createElement('canvas');
const sctx = scratch.getContext('2d');

/* ─────────── Estado ─────────── */
const state = {
  mode: '2d',
  tool: 'pencil',
  shape: 'free',
  shapeFill: false,
  strokeColor: '#1b1b1f',
  fillColor: '#4cc2ff',
  target: 'stroke',
  size: 6,
  alpha: 1,
  transparent: false,
  guides: false,
  zoom: 1,
  panX: 0, panY: 0,
  recent: []
};

const HIST_MAX = 45;
let history2d = [];
let future2d = [];
let drawing = false;
let lastPt = null;
let lastStamp = null;
let shapeStart = null;
let panState = null;
let spaceDown = false;
let studio = null;
let hist3d = [];
let fut3d = [];
let pending3dSnapshot = null;
let docName = 'Sin título';

/* ═══════════════════════════════════════════════════════════
   Utilidades de color
   ═══════════════════════════════════════════════════════════ */
function hexToRgb(hex) {
  let h = String(hex).trim().replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return { r: 0, g: 0, b: 0 };
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}
function rgbToHex({ r, g, b }) {
  return '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
}
function rgba(hex, a) { const c = hexToRgb(hex); return `rgba(${c.r},${c.g},${c.b},${a})`; }
function hsvToRgb(h, s, v) {
  h = ((h % 360) + 360) % 360; s = clamp(s, 0, 1); v = clamp(v, 0, 1);
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}
function rgbToHsv({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  return { h: (h + 360) % 360, s: max ? d / max : 0, v: max };
}

const PALETTE = [
  '#000000', '#7f7f7f', '#880015', '#ed1c24', '#ff7f27', '#fff200', '#22b14c', '#00a2e8', '#3f48cc', '#a349a4',
  '#ffffff', '#c3c3c3', '#b97a57', '#ffaec9', '#ffc90e', '#efe4b0', '#b5e61d', '#99d9ea', '#7092be', '#c8bfe7'
];
const CP_SWATCHES = [
  '#000000', '#ffffff', '#7f7f7f', '#c3c3c3', '#ed1c24', '#ff7f27', '#fff200', '#22b14c', '#00a2e8', '#3f48cc',
  '#a349a4', '#b97a57', '#ffaec9', '#ffc90e', '#efe4b0', '#b5e61d', '#99d9ea', '#7092be', '#c8bfe7', '#f2545b',
  '#ff70a6', '#ff9770', '#ffd670', '#e9ff70', '#70d6ff', '#7d5fff', '#c77dff', '#60cd6d', '#2ec4b6', '#8d99ae'
];

/* ═══════════════════════════════════════════════════════════
   Avisos flotantes
   ═══════════════════════════════════════════════════════════ */
function toast(msg, ms = 2400) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  el.toasts.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 220); }, ms);
}

/* ═══════════════════════════════════════════════════════════
   Lienzo 2D: vista, zoom y paneo
   ═══════════════════════════════════════════════════════════ */
function applyView() {
  el.paper.style.width = el.canvas.width + 'px';
  el.paper.style.height = el.canvas.height + 'px';
  el.paper.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
  const label = Math.round(state.zoom * 100) + '%';
  $('#z-label').textContent = label;
  $('#zoom-range').value = clamp(Math.round(state.zoom * 100), 10, 400);
  $('#zoom-out').textContent = label;
  el.statusZoom.textContent = label;
}

function zoomAt(newZoom, cx, cy) {
  const rect = el.stage.getBoundingClientRect();
  const px = cx == null ? rect.width / 2 : cx;
  const py = cy == null ? rect.height / 2 : cy;
  const z = clamp(newZoom, 0.1, 4);
  state.panX = px - ((px - state.panX) * z) / state.zoom;
  state.panY = py - ((py - state.panY) * z) / state.zoom;
  state.zoom = z;
  applyView();
}

function zoomFit() {
  const rect = el.stage.getBoundingClientRect();
  const pad = 44;
  const z = clamp(Math.min((rect.width - pad * 2) / el.canvas.width, (rect.height - pad * 2) / el.canvas.height), 0.1, 4);
  state.zoom = z;
  state.panX = (rect.width - el.canvas.width * z) / 2;
  state.panY = (rect.height - el.canvas.height * z) / 2;
  applyView();
}

function toCanvas(e) {
  const rect = el.stage.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left - state.panX) / state.zoom,
    y: (e.clientY - rect.top - state.panY) / state.zoom
  };
}

/* ═══════════════════════════════════════════════════════════
   Historial 2D
   ═══════════════════════════════════════════════════════════ */
function snapshot2d() { return ctx.getImageData(0, 0, el.canvas.width, el.canvas.height); }

function pushHistory() {
  history2d.push(snapshot2d());
  if (history2d.length > HIST_MAX) history2d.shift();
  future2d = [];
  updateHistoryButtons();
}

function restore(img) { ctx.putImageData(img, 0, 0); }

function undo2d() {
  if (!history2d.length) return;
  future2d.push(snapshot2d());
  restore(history2d.pop());
  updateHistoryButtons();
}

function redo2d() {
  if (!future2d.length) return;
  history2d.push(snapshot2d());
  restore(future2d.pop());
  updateHistoryButtons();
}

function updateHistoryButtons() {
  const is2d = state.mode === '2d';
  const canUndo = is2d ? history2d.length > 0 : hist3d.length > 0;
  const canRedo = is2d ? future2d.length > 0 : fut3d.length > 0;
  ['#btn-undo', '#btn-undo-3d'].forEach(s => { $(s).disabled = !canUndo; });
  ['#btn-redo', '#btn-redo-3d'].forEach(s => { $(s).disabled = !canRedo; });
}

/* ═══════════════════════════════════════════════════════════
   Motor de dibujo 2D
   ═══════════════════════════════════════════════════════════ */
const TOOL_NAMES = {
  pencil: 'Lápiz', brush: 'Pincel', marker: 'Rotulador', neon: 'Neón', eraser: 'Borrador',
  fill: 'Relleno', picker: 'Cuentagotas', select: 'Seleccionar'
};

function stampBrush(x, y, r, color) {
  sctx.globalCompositeOperation = 'source-over';
  sctx.globalAlpha = clamp(0.05 + 2.6 / Math.max(r, 2), 0.05, 1);
  sctx.fillStyle = color;
  sctx.beginPath();
  sctx.arc(x, y, r, 0, Math.PI * 2);
  sctx.fill();
}

function drawSegment(p, q, tool, size, color, alpha) {
  sctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
  sctx.shadowBlur = 0;
  sctx.shadowColor = 'transparent';
  sctx.globalAlpha = 1;
  sctx.lineJoin = 'round';
  sctx.lineCap = 'round';

  const dx = q.x - p.x, dy = q.y - p.y;
  const dist = Math.hypot(dx, dy) || 0.001;

  switch (tool) {
    case 'brush': {
      const speed = Math.min(dist, 34);
      const r = (size / 2) * (1 - speed / 62);
      const steps = Math.max(1, Math.ceil(dist / Math.max(1, r * 0.4)));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        stampBrush(p.x + dx * t, p.y + dy * t, Math.max(0.6, r), color);
      }
      break;
    }
    case 'marker': {
      const w = Math.max(3, size * 1.55);
      sctx.strokeStyle = color;
      sctx.globalAlpha = 0.3;
      sctx.lineWidth = w; sctx.lineCap = 'butt';
      sctx.beginPath(); sctx.moveTo(p.x, p.y); sctx.lineTo(q.x, q.y); sctx.stroke();
      sctx.globalAlpha = 0.16;
      sctx.lineWidth = w * 1.5;
      sctx.beginPath(); sctx.moveTo(p.x, p.y); sctx.lineTo(q.x, q.y); sctx.stroke();
      break;
    }
    case 'neon': {
      const w = Math.max(1.6, size * 0.55);
      sctx.strokeStyle = color;
      sctx.lineWidth = w * 3.4; sctx.globalAlpha = 0.1;
      sctx.shadowColor = color; sctx.shadowBlur = 28;
      sctx.beginPath(); sctx.moveTo(p.x, p.y); sctx.lineTo(q.x, q.y); sctx.stroke();
      sctx.shadowBlur = 16; sctx.globalAlpha = 0.4; sctx.lineWidth = w * 1.9;
      sctx.beginPath(); sctx.moveTo(p.x, p.y); sctx.lineTo(q.x, q.y); sctx.stroke();
      sctx.shadowBlur = 0;
      sctx.strokeStyle = '#ffffff'; sctx.globalAlpha = 0.96; sctx.lineWidth = w * 0.85;
      sctx.beginPath(); sctx.moveTo(p.x, p.y); sctx.lineTo(q.x, q.y); sctx.stroke();
      break;
    }
    case 'eraser': {
      sctx.strokeStyle = '#000';
      sctx.lineWidth = Math.max(4, size * 2);
      sctx.beginPath(); sctx.moveTo(p.x, p.y); sctx.lineTo(q.x, q.y); sctx.stroke();
      break;
    }
    case 'pencil':
    default: {
      sctx.strokeStyle = color;
      sctx.lineWidth = Math.max(0.6, size);
      sctx.beginPath(); sctx.moveTo(p.x, p.y); sctx.lineTo(q.x, q.y); sctx.stroke();
      sctx.beginPath(); sctx.arc(q.x, q.y, Math.max(0.6, size) / 2, 0, Math.PI * 2);
      sctx.fillStyle = color; sctx.fill();
      break;
    }
  }
  sctx.globalCompositeOperation = 'source-over';
  sctx.globalAlpha = 1;
  sctx.shadowBlur = 0;
}

function blitScratch() {
  ctx.save();
  ctx.globalAlpha = state.alpha;
  ctx.drawImage(scratch, 0, 0);
  ctx.restore();
}

function beginStroke(x, y) {
  scratch.width = el.canvas.width;
  scratch.height = el.canvas.height;
  sctx.clearRect(0, 0, scratch.width, scratch.height);
  lastPt = { x, y };
  lastStamp = { x, y };
  const color = state.tool === 'eraser' ? '#000000' : state.strokeColor;
  drawSegment({ x, y }, { x: x + 0.01, y }, state.tool, state.size, color, state.alpha);
  blitScratch();
}

function extendStroke(x, y) {
  if (!lastPt) return;
  if (state.tool === 'brush') {
    const r = Math.max(2, state.size / 2);
    if (Math.hypot(x - lastStamp.x, y - lastStamp.y) < r * 0.32) return;
    lastStamp = { x, y };
  }
  const color = state.tool === 'eraser' ? '#000000' : state.strokeColor;
  drawSegment(lastPt, { x, y }, state.tool, state.size, color, state.alpha);
  lastPt = { x, y };
  blitScratch();
}

function endStroke() {
  pushHistory();
  lastPt = null;
}

/* ─────────── Formas ─────────── */
function shapePath(c, kind, x0, y0, x1, y1) {
  const minX = Math.min(x0, x1), maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1), maxY = Math.max(y0, y1);
  const w = maxX - minX, h = maxY - minY;
  c.beginPath();
  switch (kind) {
    case 'line':
      c.moveTo(x0, y0); c.lineTo(x1, y1);
      break;
    case 'rect':
      c.rect(minX, minY, w, h);
      break;
    case 'ellipse':
      c.ellipse(minX + w / 2, minY + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      break;
    case 'triangle':
      c.moveTo(minX + w / 2, minY); c.lineTo(maxX, maxY); c.lineTo(minX, maxY); c.closePath();
      break;
    case 'star':
      poly(c, minX + w / 2, minY + h / 2, Math.min(w, h) / 2, 5, 0.45, Math.min(w, h) / 2 * 0.0 + -Math.PI / 2, w < h);
      break;
    case 'heart':
      heartPath(c, minX + w / 2, minY + h / 2, Math.max(w, 1), Math.max(h, 1));
      break;
    case 'arrow': {
      const a = Math.atan2(y1 - y0, x1 - x0);
      const len = Math.hypot(x1 - x0, y1 - y0);
      const head = clamp(len * 0.32, 10, Math.max(12, state.size * 4));
      c.moveTo(x0, y0);
      c.lineTo(x1 - Math.cos(a) * head * 0.82, y1 - Math.sin(a) * head * 0.82);
      c.moveTo(x1, y1);
      c.lineTo(x1 - Math.cos(a - 0.42) * head, y1 - Math.sin(a - 0.42) * head);
      c.lineTo(x1 - Math.cos(a + 0.42) * head, y1 - Math.sin(a + 0.42) * head);
      c.closePath();
      break;
    }
  }
}

function poly(c, cx, cy, R, points, inner, startA, squash) {
  const r = R * inner;
  const sx = squash ? R / Math.max(R, 1) : 1;
  for (let i = 0; i < points * 2; i++) {
    const rr = i % 2 ? r : R;
    const a = startA + (i * Math.PI) / points;
    const x = cx + Math.cos(a) * rr * sx;
    const y = cy + Math.sin(a) * rr;
    i ? c.lineTo(x, y) : c.moveTo(x, y);
  }
  c.closePath();
}

function heartPath(c, cx, cy, w, h) {
  const s = Math.min(w, h);
  c.save();
  c.translate(cx, cy);
  c.scale(w / (s || 1), h / (s || 1));
  const u = s / 32;
  c.moveTo(0, 13 * u);
  c.bezierCurveTo(-2 * u, 9 * u, -15 * u, 1 * u, -15 * u, -7 * u);
  c.bezierCurveTo(-15 * u, -14 * u, -6 * u, -16 * u, 0, -9 * u);
  c.bezierCurveTo(6 * u, -16 * u, 15 * u, -14 * u, 15 * u, -7 * u);
  c.bezierCurveTo(15 * u, 1 * u, 2 * u, 9 * u, 0, 13 * u);
  c.closePath();
  c.restore();
}

function renderShape(c, kind, x0, y0, x1, y1, fillIt, strokeIt, lw, color, fillColor) {
  c.save();
  c.lineJoin = 'round';
  c.lineCap = 'round';
  shapePath(c, kind, x0, y0, x1, y1);
  if (kind === 'arrow') {
    c.strokeStyle = color; c.lineWidth = lw; c.stroke();
  } else if (fillIt && strokeIt) {
    c.fillStyle = fillColor; c.fill();
    c.strokeStyle = color; c.lineWidth = lw; c.stroke();
  } else if (fillIt) {
    c.fillStyle = fillColor; c.fill();
  } else {
    c.strokeStyle = color; c.lineWidth = lw; c.stroke();
  }
  c.restore();
}

function previewShape(x1, y1) {
  ov.clearRect(0, 0, el.overlay.width, el.overlay.height);
  const lw = Math.max(1, state.size);
  ov.save();
  ov.shadowColor = 'rgba(255,255,255,.95)';
  ov.shadowBlur = 4;
  renderShape(ov, state.shape, shapeStart.x, shapeStart.y, x1, y1, state.shapeFill, true, lw, state.strokeColor, state.fillColor);
  ov.restore();
}

function commitShape(x1, y1) {
  ov.clearRect(0, 0, el.overlay.width, el.overlay.height);
  scratch.width = el.canvas.width;
  scratch.height = el.canvas.height;
  sctx.clearRect(0, 0, scratch.width, scratch.height);
  renderShape(sctx, state.shape, shapeStart.x, shapeStart.y, x1, y1,
    state.shapeFill, true, Math.max(1, state.size), state.strokeColor, state.fillColor);
  blitScratch();
  pushHistory();
}

/* ─────────── Relleno (balde) ─────────── */
function floodFill(sx, sy, hexColor, alpha) {
  const W = el.canvas.width, H = el.canvas.height;
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  const x0 = Math.round(sx), y0 = Math.round(sy);
  if (x0 < 0 || y0 < 0 || x0 >= W || y0 >= H) return false;
  const idx = (x, y) => (y * W + x) * 4;
  const i0 = idx(x0, y0);
  const tr = d[i0], tg = d[i0 + 1], tb = d[i0 + 2], ta = d[i0 + 3];
  const c = hexToRgb(hexColor);
  const fr = c.r, fg = c.g, fb = c.b, fa = Math.round(alpha * 255);
  if (tr === fr && tg === fg && tb === fb && ta === fa) return false;
  const tol = 34;
  const match = i =>
    Math.abs(d[i] - tr) <= tol && Math.abs(d[i + 1] - tg) <= tol &&
    Math.abs(d[i + 2] - tb) <= tol && Math.abs(d[i + 3] - ta) <= tol;
  const visited = new Uint8Array(W * H);
  const stack = [x0, y0];
  while (stack.length) {
    const y = stack.pop(), x = stack.pop();
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const p = y * W + x;
    if (visited[p]) continue;
    const i = p * 4;
    if (!match(i)) continue;
    visited[p] = 1;
    d[i] = fr; d[i + 1] = fg; d[i + 2] = fb; d[i + 3] = fa;
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }
  ctx.putImageData(img, 0, 0);
  return true;
}

/* ─────────── Puntero sobre el lienzo ─────────── */
el.canvas.addEventListener('pointerdown', e => {
  if (state.mode !== '2d') return;
  // Con Espacio pulsado o botón central, el paneo lo gestiona el escenario
  if (spaceDown || e.button === 1) { e.preventDefault(); return; }
  if (e.button !== 0) return;
  el.canvas.setPointerCapture(e.pointerId);
  const p = toCanvas(e);

  if (state.tool === 'fill') {
    if (floodFill(p.x, p.y, state.strokeColor, state.alpha)) { pushHistory(); addRecent(state.strokeColor); }
    else toast('Haz clic dentro de una zona cerrada para rellenarla');
    return;
  }
  if (state.tool === 'picker') {
    const x = clamp(Math.round(p.x), 0, el.canvas.width - 1);
    const y = clamp(Math.round(p.y), 0, el.canvas.height - 1);
    const d = ctx.getImageData(x, y, 1, 1).data;
    if (d[3] > 8) {
      const hex = rgbToHex({ r: d[0], g: d[1], b: d[2] });
      setColor(state.target === 'fill' ? 'fill' : 'stroke', hex);
      addRecent(hex);
      toast(`Color tomado: ${hex.toUpperCase()}`);
    } else toast('Ese píxel es transparente');
    return;
  }
  if (state.tool === 'select') { setTool('pencil'); return; }

  drawing = true;
  if (state.shape === 'free' || ['fill', 'picker', 'eraser'].includes(state.tool)) {
    beginStroke(p.x, p.y);
  } else {
    shapeStart = p;
    previewShape(p.x, p.y);
  }
});

el.canvas.addEventListener('pointermove', e => {
  if (state.mode !== '2d') return;
  const p = toCanvas(e);
  el.statusPos.textContent = `${Math.round(p.x)} × ${Math.round(p.y)} px`;
  if (!drawing) return;
  if (state.shape === 'free' || ['fill', 'picker', 'eraser'].includes(state.tool)) extendStroke(p.x, p.y);
  else previewShape(p.x, p.y);
});

el.canvas.addEventListener('pointerup', e => {
  if (!drawing) return;
  drawing = false;
  const p = toCanvas(e);
  if (state.shape === 'free' || ['fill', 'picker', 'eraser'].includes(state.tool)) endStroke();
  else if (shapeStart) { commitShape(p.x, p.y); shapeStart = null; }
});

el.canvas.addEventListener('pointercancel', () => {
  drawing = false; shapeStart = null;
  ov.clearRect(0, 0, el.overlay.width, el.overlay.height);
});

/* Paneo también desde el área vacía del escenario */
el.stage.addEventListener('pointerdown', e => {
  if (state.mode !== '2d') return;
  if (e.target !== el.canvas) return;
  if (!(spaceDown || e.button === 1)) return;
  if (panState) return;
  panState = { x: e.clientX, y: e.clientY, px: state.panX, py: state.panY };
  el.stage.classList.add('panning');
  window.addEventListener('pointermove', onPanMove);
  window.addEventListener('pointerup', onPanUp, { once: true });
  e.preventDefault();
});

function onPanMove(e) {
  if (!panState) return;
  state.panX = panState.px + (e.clientX - panState.x);
  state.panY = panState.py + (e.clientY - panState.y);
  applyView();
}
function onPanUp() {
  panState = null;
  el.stage.classList.remove('panning');
  window.removeEventListener('pointermove', onPanMove);
}

/* Zoom con la rueda */
el.stage.addEventListener('wheel', e => {
  if (state.mode !== '2d') return;
  e.preventDefault();
  if (e.ctrlKey || !e.shiftKey) {
    const rect = el.stage.getBoundingClientRect();
    zoomAt(state.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12), e.clientX - rect.left, e.clientY - rect.top);
  } else {
    state.panX -= e.deltaX; state.panY -= e.deltaY; applyView();
  }
}, { passive: false });

/* ═══════════════════════════════════════════════════════════
   Tamaño del lienzo
   ═══════════════════════════════════════════════════════════ */
function resizeCanvas(w, h, keep = true) {
  const old = document.createElement('canvas');
  old.width = el.canvas.width; old.height = el.canvas.height;
  old.getContext('2d').drawImage(el.canvas, 0, 0);

  el.canvas.width = w; el.canvas.height = h;
  el.overlay.width = w; el.overlay.height = h;
  scratch.width = w; scratch.height = h;

  if (!state.transparent) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); }
  else ctx.clearRect(0, 0, w, h);
  if (keep) ctx.drawImage(old, 0, 0);

  el.statusSize.textContent = `${w} × ${h} px`;
  pushHistory();
  zoomFit();
}

function repaintBackground() {
  if (state.transparent) return;
  // Pone fondo blanco detrás de lo ya pintado
  const tmp = document.createElement('canvas');
  tmp.width = el.canvas.width; tmp.height = el.canvas.height;
  tmp.getContext('2d').drawImage(el.canvas, 0, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, el.canvas.width, el.canvas.height);
  ctx.drawImage(tmp, 0, 0);
  pushHistory();
}

/* ═══════════════════════════════════════════════════════════
   Herramientas, colores y UI
   ═══════════════════════════════════════════════════════════ */
function setTool(tool) {
  state.tool = tool;
  $$('#brush-grid .tbtn, #rail-tools .tbtn').forEach(b => b.classList.toggle('active', b.dataset.tool === tool));
  el.statusTool.textContent = TOOL_NAMES[tool] || tool;
  el.stage.className = el.stage.className.replace(/tool-\S+/g, '').trim();
  el.stage.classList.add('tool-' + tool);
}

function setShape(shape) {
  state.shape = shape;
  $$('#shape-grid .tbtn').forEach(b => b.classList.toggle('active', b.dataset.shape === shape));
}

function setColor(target, hex) {
  hex = String(hex).toLowerCase();
  if (target === 'fill') {
    state.fillColor = hex;
    $('#btn-fill-color .swatch').style.background = hex;
    $('#rail-fill .swatch').style.background = hex;
  } else {
    state.strokeColor = hex;
    $('#btn-stroke-color .swatch').style.background = hex;
    $('#rail-stroke .swatch').style.background = hex;
  }
}

function addRecent(hex) {
  hex = String(hex).toLowerCase();
  state.recent = [hex, ...state.recent.filter(c => c !== hex)].slice(0, 10);
  renderRecents();
}

function renderRecents() {
  const mk = c => {
    const b = document.createElement('button');
    b.className = 'pal';
    b.style.background = c;
    b.title = c.toUpperCase();
    b.onclick = () => { setColor(state.target === 'fill' ? 'fill' : 'stroke', c); };
    return b;
  };
  const rail = $('#rail-recent');
  rail.innerHTML = '';
  state.recent.forEach(c => rail.appendChild(mk(c)));
  const list = $('#cp-recent-list');
  list.innerHTML = '';
  state.recent.forEach(c => list.appendChild(mk(c)));
}

function buildPalettes() {
  const pal = $('#palette');
  PALETTE.forEach(c => {
    const b = document.createElement('button');
    b.className = 'pal';
    b.style.background = c;
    b.title = c.toUpperCase();
    b.onclick = () => { setColor(state.target === 'fill' ? 'fill' : 'stroke', c); addRecent(c); };
    pal.appendChild(b);
  });
  const sw = $('#cp-swatches');
  CP_SWATCHES.forEach(c => {
    const b = document.createElement('button');
    b.className = 'pal';
    b.style.background = c;
    b.title = c.toUpperCase();
    b.onclick = () => { cp.setHex(c); };
    sw.appendChild(b);
  });
}

function buildRails() {
  const railTools = $('#rail-tools');
  const tools = ['pencil', 'brush', 'marker', 'neon', 'eraser', 'fill', 'picker', 'shapes'];
  const icons = {
    pencil: 'i-pencil', brush: 'i-brush', marker: 'i-marker', neon: 'i-neon',
    eraser: 'i-eraser', fill: 'i-bucket', picker: 'i-picker', shapes: 'i-shapes'
  };
  tools.forEach(t => {
    const b = document.createElement('button');
    b.className = 'tbtn';
    b.dataset.tool = t;
    b.title = t === 'shapes' ? 'Formas' : TOOL_NAMES[t];
    b.innerHTML = `<svg class="ic sm"><use href="#${icons[t]}"/></svg>`;
    b.onclick = () => {
      if (t === 'shapes') { activateTab('inicio'); $('#shape-grid').scrollIntoView({ block: 'nearest', inline: 'center' }); toast('Elige una forma en la cinta'); return; }
      setTool(t);
    };
    railTools.appendChild(b);
  });
}

/* ─────────── Pestañas de la cinta ─────────── */
function activateTab(name) {
  $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  $$('.tabpage').forEach(p => p.classList.toggle('active', p.dataset.page === name));
  if (name === '3d' && state.mode !== '3d') setMode('3d');
}

/* ─────────── Modo 2D / 3D ─────────── */
async function setMode(mode) {
  if (mode === state.mode && studio) { syncModeUI(); return; }
  if (mode === '3d' && !studio) {
    toast('Preparando el estudio 3D…', 1200);
    try {
      const mod = await import('./3d.js');
      studio = new mod.Studio3D(el.threeHost);
      wire3D(studio, mod);
      mark3d();
      syncProps();
    } catch (err) {
      console.error(err);
      toast('No se pudo cargar el motor 3D (¿sin conexión?)');
      setMode('2d');
      return;
    }
  }
  state.mode = mode;
  if (mode === '3d') {
    el.paper.classList.add('hidden');
    el.threed.classList.remove('hidden');
    requestAnimationFrame(() => { studio.resize(); });
    activateTab('3d');
  } else {
    el.threed.classList.add('hidden');
    el.paper.classList.remove('hidden');
    activateTab('inicio');
  }
  syncModeUI();
}

function syncModeUI() {
  const is3d = state.mode === '3d';
  el.tbMode.textContent = is3d ? '3D' : '2D';
  $$('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === state.mode));
  el.props.classList.toggle('hidden', !is3d);
  $('#hint3d').classList.toggle('hidden', !is3d);
  updateHistoryButtons();
  updateStatusObjects();
}

function updateStatusObjects() {
  el.statusObjects.textContent = studio ? `${studio.objects.length} objeto${studio.objects.length === 1 ? '' : 's'} 3D` : '0 objetos 3D';
}

/* ═══════════════════════════════════════════════════════════
   Historial 3D
   ═══════════════════════════════════════════════════════════ */
/**
 * El historial 3D guarda estados ANTES de cada cambio (patrón memento):
 *   beginChange3d()  → antes de mutar la escena
 *   commitChange3d() → después de mutar (registra el estado previo si hubo cambio real)
 * Así «deshacer» siempre vuelve al paso anterior de verdad.
 */
function beginChange3d() {
  if (!studio) return null;
  pending3dSnapshot = studio.serialize();
  return pending3dSnapshot;
}

function commitChange3d() {
  if (!studio) return;
  const before = pending3dSnapshot;
  pending3dSnapshot = null;
  if (!before) return;
  if (JSON.stringify(before) === JSON.stringify(studio.serialize())) return;
  hist3d.push(before);
  if (hist3d.length > 30) hist3d.shift();
  fut3d = [];
  updateHistoryButtons();
  updateStatusObjects();
}

/** Fuerza un punto de restauración (inicio de escena, carga de documento…). */
function mark3d() {
  if (!studio) return;
  pending3dSnapshot = null;
  hist3d = [];
  fut3d = [];
  updateHistoryButtons();
  updateStatusObjects();
}

function undo3d() {
  if (!studio || !hist3d.length) return;
  pending3dSnapshot = null;
  fut3d.push(studio.serialize());
  studio.load(hist3d.pop());
  updateHistoryButtons();
  updateStatusObjects();
  syncProps();
}

function redo3d() {
  if (!studio || !fut3d.length) return;
  pending3dSnapshot = null;
  hist3d.push(studio.serialize());
  studio.load(fut3d.pop());
  updateHistoryButtons();
  updateStatusObjects();
  syncProps();
}

/* ═══════════════════════════════════════════════════════════
   Panel de propiedades 3D
   ═══════════════════════════════════════════════════════════ */
const TEX_CSS = {
  none: '#ffffff',
  stripes: 'repeating-linear-gradient(45deg,#222 0 5px,#fff 5px 10px)',
  dots: 'radial-gradient(#222 26%, transparent 27%) 0 0/9px 9px, #fff',
  grid: 'linear-gradient(#222 1px,transparent 1px) 0 0/9px 9px, linear-gradient(90deg,#222 1px,transparent 1px) 0 0/9px 9px, #fff',
  hearts: 'radial-gradient(circle at 30% 35%, #ff3b6b 18%, transparent 19%) 0 0/12px 12px, #fff',
  stars: 'conic-gradient(from 45deg, #ffb703 0 25%, #fff 0 50%, #ffb703 0 75%, #fff 0) 0 0/10px 10px',
  checker: 'conic-gradient(#222 0 25%, #fff 0 50%, #222 0 75%, #fff 0) 0 0/10px 10px',
  marble: 'linear-gradient(120deg,#fff,#dfe3ea 40%,#fff 60%,#cfd6e0)'
};

function buildPropsUI() {
  const pal = $('#prop-palette');
  ['#f2545b', '#ff9f45', '#ffce54', '#60cd6d', '#2ec4b6', '#4cc2ff', '#3a86ff', '#8338ec', '#ff5d8f',
   '#ffffff', '#e9ecef', '#8d99ae', '#202024', '#c77dff', '#06d6a0', '#f4a261', '#a3b18a', '#118ab2']
    .forEach(c => {
      const b = document.createElement('button');
      b.className = 'pal';
      b.style.background = c;
      b.title = c.toUpperCase();
      b.onclick = () => { if (!studio || !studio.selected) return; beginChange3d(); $('#prop-color').value = c; applyProp('color', c); commitChange3d(); syncProps(); };
      pal.appendChild(b);
    });

  const tex = $('#prop-tex');
  [['none', 'Ninguna'], ['stripes', 'Rayas'], ['dots', 'Lunares'], ['grid', 'Cuadros'],
   ['hearts', 'Corazones'], ['stars', 'Estrellas'], ['checker', 'Ajedrez'], ['marble', 'Mármol']]
    .forEach(([id, name]) => {
      const b = document.createElement('button');
      b.className = 'tex';
      b.dataset.tex = id;
      b.title = name;
      b.style.background = TEX_CSS[id] || '#fff';
      b.onclick = () => { if (!studio || !studio.selected) return; beginChange3d(); applyProp('texture', id); commitChange3d(); syncProps(); };
      tex.appendChild(b);
    });
}

function applyProp(key, value) {
  if (!studio || !studio.selected) return;
  studio.setUserData(studio.selected, { [key]: value });
  if (key === 'color') addRecent(value);
}

function syncProps() {
  const o = studio && studio.selected;
  $('#props-form').classList.toggle('hidden', !o);
  el.propsEmpty.classList.toggle('hidden', !!o);
  if (!o) return;
  $('#prop-color').value = o.userData.color;
  $$('#prop-finish .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.finish === o.userData.finish));
  $$('#prop-tex .tex').forEach(b => b.classList.toggle('active', b.dataset.tex === o.userData.texture));
  $('#prop-opacity').value = Math.round((o.userData.opacity ?? 1) * 100);
  $('#prop-opacity-out').textContent = Math.round((o.userData.opacity ?? 1) * 100) + '%';
  const sc = Math.round(o.scale.x * 100);
  $('#prop-scale').value = clamp(sc, 10, 300);
  $('#prop-scale-out').textContent = sc + '%';
  $('#prop-rotx').value = Math.round(deg(o.rotation.x) + 360) % 360;
  $('#prop-roty').value = Math.round(deg(o.rotation.y) + 360) % 360;
  $('#prop-rotz').value = Math.round(deg(o.rotation.z) + 360) % 360;
  $('#prop-rotx-out').textContent = $('#prop-rotx').value + '°';
  $('#prop-rot-y-out').textContent = $('#prop-roty').value + '°';
  $('#prop-rotz-out').textContent = $('#prop-rotz').value + '°';
  $('#prop-px').value = +o.position.x.toFixed(2);
  $('#prop-py').value = +o.position.y.toFixed(2);
  $('#prop-pz').value = +o.position.z.toFixed(2);
}

function wirePropsInputs() {
  $('#prop-color').addEventListener('pointerdown', () => beginChange3d());
  $('#prop-color').addEventListener('input', e => applyProp('color', e.target.value));
  $('#prop-color').addEventListener('change', () => { commitChange3d(); syncProps(); });

  $$('#prop-finish .seg-btn').forEach(b => b.onclick = () => {
    if (!studio || !studio.selected) return;
    beginChange3d();
    applyProp('finish', b.dataset.finish);
    commitChange3d(); syncProps();
  });

  const live = (id, fn) => {
    const input = $(id);
    input.addEventListener('pointerdown', () => beginChange3d());
    input.addEventListener('input', fn);
    input.addEventListener('change', () => { commitChange3d(); syncProps(); });
  };

  live('#prop-opacity', e => {
    const v = e.target.value / 100;
    $('#prop-opacity-out').textContent = e.target.value + '%';
    applyProp('opacity', v);
  });
  live('#prop-scale', e => {
    const v = e.target.value / 100;
    $('#prop-scale-out').textContent = e.target.value + '%';
    if (studio && studio.selected) { studio.selected.scale.setScalar(v); studio._fitOutline(); }
  });
  live('#prop-rotx', e => {
    $('#prop-rotx-out').textContent = e.target.value + '°';
    if (studio && studio.selected) { studio.selected.rotation.x = rad(+e.target.value); studio._fitOutline(); }
  });
  live('#prop-roty', e => {
    $('#prop-rot-y-out').textContent = e.target.value + '°';
    if (studio && studio.selected) { studio.selected.rotation.y = rad(+e.target.value); studio._fitOutline(); }
  });
  live('#prop-rotz', e => {
    $('#prop-rotz-out').textContent = e.target.value + '°';
    if (studio && studio.selected) { studio.selected.rotation.z = rad(+e.target.value); studio._fitOutline(); }
  });
  ['#prop-px', '#prop-py', '#prop-pz'].forEach((id, i) => {
    $(id).addEventListener('change', e => {
      if (!studio || !studio.selected) return;
      const v = parseFloat(e.target.value) || 0;
      beginChange3d();
      studio.selected.position.setComponent(i, v);
      studio._fitOutline();
      commitChange3d();
    });
  });

  $('#prop-dup').onclick = () => { if (!studio || !studio.selected) return; beginChange3d(); studio.duplicate(); commitChange3d(); syncProps(); };
  $('#prop-del').onclick = () => { if (!studio || !studio.selected) return; beginChange3d(); studio.remove(); commitChange3d(); syncProps(); };
  $('#prop-center').onclick = () => {
    if (!studio || !studio.selected) return;
    beginChange3d();
    studio.selected.position.set(0, Math.max(0.01, studio.selected.userData._groundOffset || 0.8), 0);
    studio._fitOutline(); commitChange3d(); syncProps();
  };
  $('#props-close').onclick = () => el.props.classList.add('hidden');
}

/* ═══════════════════════════════════════════════════════════
   Cableado del estudio 3D
   ═══════════════════════════════════════════════════════════ */
function wire3D(s, mod) {
  s.onSelect = () => { syncProps(); };
  s.onBeginChange = () => beginChange3d();
  s.onChange = () => { commitChange3d(); syncProps(); };

  // Botones de objetos (cinta + riel)
  const add = kind => {
    if (!studio) return;
    if (state.mode !== '3d') { setMode('3d'); }
    beginChange3d();
    const m = studio.addObject(kind);
    studio.select(m);
    commitChange3d();
    syncProps();
    toast(`${m.userData.name} añadido`);
  };
  $$('#obj-grid .tbtn').forEach(b => { b.onclick = () => add(b.dataset.obj); });

  const rail = $('#rail-objects');
  mod.OBJECTS.slice(0, 8).forEach(o => {
    const b = document.createElement('button');
    b.className = 'tbtn';
    b.title = o.name;
    b.innerHTML = `<svg class="ic sm"><use href="#${o.icon}"/></svg>`;
    b.onclick = () => add(o.kind);
    rail.appendChild(b);
  });

  $('#btn-dup').onclick = () => { if (studio && studio.selected) { beginChange3d(); studio.duplicate(); commitChange3d(); syncProps(); } else toast('Selecciona un objeto primero'); };
  $('#btn-del').onclick = () => { if (studio && studio.selected) { beginChange3d(); studio.remove(); commitChange3d(); syncProps(); } else toast('Selecciona un objeto primero'); };

  $('#btn-flatten').onclick = () => {
    if (!studio || !studio.objects.length) { toast('Añade algún objeto 3D primero'); return; }
    const src = studio.renderTransparent();
    ctx.save();
    ctx.clearRect(0, 0, el.canvas.width, el.canvas.height);
    if (!state.transparent) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, el.canvas.width, el.canvas.height); }
    const r = Math.min(el.canvas.width / src.width, el.canvas.height / src.height);
    const w = src.width * r, h = src.height * r;
    ctx.drawImage(src, (el.canvas.width - w) / 2, (el.canvas.height - h) / 2, w, h);
    ctx.restore();
    pushHistory();
    setMode('2d');
    toast('Escena 3D convertida en dibujo 2D');
  };

  $$('#gizmo-seg .seg-btn').forEach(b => b.onclick = () => {
    $$('#gizmo-seg .seg-btn').forEach(x => x.classList.toggle('active', x === b));
    if (studio) studio.gizmo.setMode(b.dataset.gizmo);
  });
  $$('#view-seg .seg-btn').forEach(b => b.onclick = () => {
    $$('#view-seg .seg-btn').forEach(x => x.classList.toggle('active', x === b));
    if (studio) studio.setView(b.dataset.view);
  });
  el.viewcube.onclick = () => {
    const order = ['persp', 'front', 'top', 'side'];
    const cur = $$('#view-seg .seg-btn').findIndex(x => x.classList.contains('active'));
    const next = order[(cur + 1) % order.length] || 'persp';
    $$('#view-seg .seg-btn').forEach(x => x.classList.toggle('active', x.dataset.view === next));
    if (studio) studio.setView(next);
  };

  $('#chk-grid').onchange = e => studio && studio.setGrid(e.target.checked);
  $('#chk-shadow').onchange = e => studio && studio.setShadows(e.target.checked);
  $('#chk-spin').onchange = e => { if (studio) studio.autoSpin = e.target.checked; };
}

/* ═══════════════════════════════════════════════════════════
   Selector de color (popover)
   ═══════════════════════════════════════════════════════════ */
const cp = (() => {
  const pop = el.colorPop;
  const sv = $('#cp-sv'), cursor = $('#cp-cursor'), hue = $('#cp-hue'),
    alpha = $('#cp-alpha'), alphaOut = $('#cp-alpha-out'),
    preview = $('#cp-preview'), hexInput = $('#cp-hex');
  let h = 200, s = 0.7, v = 0.85, a = 1;
  let target = 'stroke';
  let open = false;

  function paint() {
    sv.style.background =
      `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), ${rgbToHex(hsvToRgb(h, 1, 1))}`;
    const rgb = hsvToRgb(h, s, v);
    const hex = rgbToHex(rgb);
    cursor.style.left = (s * 100) + '%';
    cursor.style.top = ((1 - v) * 100) + '%';
    cursor.style.background = hex;
    preview.style.setProperty('--pv', rgba(hex, a));
    hexInput.value = hex.toUpperCase() + (a < 1 ? '' : '');
    alphaOut.textContent = Math.round(a * 100) + '%';
  }

  function setHex(hex) {
    const rgb = hexToRgb(hex);
    const hsv = rgbToHsv(rgb);
    h = hsv.h; s = Math.max(hsv.s, 0.0001); v = Math.max(hsv.v, 0.0001);
    hue.value = Math.round(h);
    paint();
    commit();
  }

  function commit() {
    const hex = rgbToHex(hsvToRgb(h, s, v));
    setColor(target === 'fill' ? 'fill' : 'stroke', a < 1 ? hex : hex);
    if (target === 'fill') state.alpha = a; else state.alpha = a;
    $('#alpha-range').value = Math.round(a * 100);
    $('#alpha-out').textContent = Math.round(a * 100) + '%';
    addRecent(hex);
  }

  function onSV(e) {
    const r = sv.getBoundingClientRect();
    s = clamp((e.clientX - r.left) / r.width, 0, 1);
    v = clamp(1 - (e.clientY - r.top) / r.height, 0, 1);
    paint();
  }
  sv.addEventListener('pointerdown', e => {
    sv.setPointerCapture(e.pointerId);
    onSV(e);
    sv.addEventListener('pointermove', onSV);
    sv.addEventListener('pointerup', () => { sv.removeEventListener('pointermove', onSV); commit(); }, { once: true });
  });
  hue.addEventListener('input', () => { h = +hue.value; paint(); });
  hue.addEventListener('change', commit);
  alpha.addEventListener('input', () => { a = +alpha.value / 100; paint(); });
  alpha.addEventListener('change', commit);
  hexInput.addEventListener('change', () => {
    const v2 = hexInput.value.trim();
    if (/^#?[0-9a-f]{6}$/i.test(v2)) setHex(v2);
    else paint();
  });
  $('#cp-ok').onclick = () => { commit(); close(); };
  $('#cp-close').onclick = close;

  function show(anchor, tgt) {
    target = tgt || state.target;
    const cur = target === 'fill' ? state.fillColor : state.strokeColor;
    setHexSilent(cur);
    open = true;
    pop.classList.remove('hidden');
    const r = anchor.getBoundingClientRect();
    const pw = pop.offsetWidth || 300, ph = pop.offsetHeight || 400;
    pop.style.left = clamp(r.left, 8, window.innerWidth - pw - 8) + 'px';
    pop.style.top = clamp(r.bottom + 8, 8, window.innerHeight - ph - 8) + 'px';
    paint();
  }
  function setHexSilent(hex) {
    const rgb = hexToRgb(hex);
    const hsv = rgbToHsv(rgb);
    h = hsv.h; s = Math.max(hsv.s, 0.0001); v = Math.max(hsv.v, 0.0001); a = state.alpha;
    hue.value = Math.round(h);
    alpha.value = Math.round(a * 100);
  }
  function close() { open = false; pop.classList.add('hidden'); }

  document.addEventListener('pointerdown', e => {
    if (open && !pop.contains(e.target) && !e.target.closest('#btn-palette, #btn-stroke-color, #btn-fill-color, #rail-stroke, #rail-fill')) close();
  });

  return { show, close, setHex };
})();

/* ═══════════════════════════════════════════════════════════
   Guardar / abrir / descargar
   ═══════════════════════════════════════════════════════════ */
const LS_KEY = 'paintle3d.gallery.v1';

function readGallery() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}
function writeGallery(list) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list.slice(0, 40))); }
  catch { toast('No se pudo guardar (almacenamiento lleno)'); }
}

function makeThumb() {
  const t = document.createElement('canvas');
  t.width = 480; t.height = Math.round(480 * (el.canvas.height / el.canvas.width));
  const c = t.getContext('2d');
  c.fillStyle = '#fff'; c.fillRect(0, 0, t.width, t.height);
  c.drawImage(el.canvas, 0, 0, t.width, t.height);
  return t.toDataURL('image/jpeg', 0.72);
}

function saveToGallery() {
  const name = window.prompt('Nombre de la creación:', docName) || docName;
  docName = name;
  el.docName.textContent = docName;
  const list = readGallery();
  list.unshift({ id: Date.now(), name, date: new Date().toLocaleString('es'), thumb: makeThumb(), mode: state.mode });
  writeGallery(list);
  renderGallery();
  toast('Guardado en la galería');
}

function renderGallery() {
  const list = readGallery();
  el.galleryGrid.innerHTML = '';
  el.galleryEmpty.classList.toggle('hidden', list.length > 0);
  list.forEach(item => {
    const card = document.createElement('div');
    card.className = 'g-item';
    const img = document.createElement('img');
    img.src = item.thumb; img.alt = item.name;
    img.title = 'Abrir en el lienzo';
    img.onclick = () => openGalleryItem(item);
    const meta = document.createElement('div');
    meta.className = 'g-meta';
    meta.innerHTML = `<div style="min-width:0"><div class="g-name">${escapeHtml(item.name)}</div><div class="g-date">${escapeHtml(item.date || '')}</div></div>`;
    const del = document.createElement('button');
    del.className = 'icon-btn';
    del.title = 'Eliminar';
    del.innerHTML = '<svg class="ic sm"><use href="#i-trash"/></svg>';
    del.onclick = () => { writeGallery(readGallery().filter(x => x.id !== item.id)); renderGallery(); toast('Eliminado de la galería'); };
    meta.appendChild(del);
    card.appendChild(img); card.appendChild(meta);
    el.galleryGrid.appendChild(card);
  });
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }

function openGalleryItem(item) {
  const img = new Image();
  img.onload = () => {
    loadImageToCanvas(img);
    docName = item.name;
    el.docName.textContent = docName;
    showApp();
    toast(`«${item.name}» abierto`);
  };
  img.src = item.thumb;
}

function loadImageToCanvas(img) {
  const W = el.canvas.width, H = el.canvas.height;
  ctx.clearRect(0, 0, W, H);
  if (!state.transparent) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); }
  const r = Math.min(W / img.width, H / img.height);
  const w = img.width * r, h = img.height * r;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
  pushHistory();
}

function downloadPNG() {
  el.canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docName.replace(/[^\w\-. ]+/g, '_') || 'paintle'}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    toast('Imagen PNG descargada');
  }, 'image/png');
}

function newDocument() {
  if (!window.confirm('¿Crear un lienzo nuevo? Se perderá lo que no hayas guardado.')) return;
  resizeCanvas(el.canvas.width, el.canvas.height, false);
  history2d = []; future2d = [];
  ctx.clearRect(0, 0, el.canvas.width, el.canvas.height);
  if (!state.transparent) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, el.canvas.width, el.canvas.height); }
  pushHistory();
  if (studio) { studio.clear(); mark3d(); syncProps(); }
  docName = 'Sin título';
  el.docName.textContent = docName;
  zoomFit();
  updateHistoryButtons();
  toast('Lienzo nuevo listo');
}

/* ═══════════════════════════════════════════════════════════
   Navegación entre pantallas
   ═══════════════════════════════════════════════════════════ */
function showApp() {
  el.home.classList.add('hidden');
  el.gallery.classList.add('hidden');
  el.app.classList.remove('hidden');
  requestAnimationFrame(() => { zoomFit(); if (studio) studio.resize(); });
}
function showHome() {
  el.app.classList.add('hidden');
  el.gallery.classList.add('hidden');
  el.home.classList.remove('hidden');
}
function showGallery() {
  renderGallery();
  el.app.classList.add('hidden');
  el.home.classList.add('hidden');
  el.gallery.classList.remove('hidden');
}

/* ═══════════════════════════════════════════════════════════
   Eventos de la interfaz
   ═══════════════════════════════════════════════════════════ */
function wireUI() {
  // Inicio
  $('#home-new').onclick = () => { showApp(); toast('¡A dibujar!'); };
  $('#home-gallery').onclick = showGallery;
  $('#home-open').onclick = () => el.fileInput.click();
  $('#gallery-back').onclick = showHome;

  // Barra de título
  $('#btn-home').onclick = showHome;
  $('#btn-new').onclick = newDocument;
  $('#btn-open').onclick = () => el.fileInput.click();
  $('#btn-save').onclick = saveToGallery;
  $('#btn-download').onclick = downloadPNG;
  $('#btn-gallery').onclick = showGallery;
  $$('.win-btn').forEach((b, i) => b.onclick = () => toast(['Ventana minimizada (demo)', 'Ventana maximizada (demo)', 'Cierra la pestaña para salir 😉'][i]));

  el.fileInput.onchange = e => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const img = new Image();
    img.onload = () => { loadImageToCanvas(img); docName = f.name.replace(/\.[^.]+$/, ''); el.docName.textContent = docName; showApp(); toast('Imagen abierta'); URL.revokeObjectURL(img.src); };
    img.src = URL.createObjectURL(f);
    e.target.value = '';
  };

  // Pestañas
  $$('.tab').forEach(t => t.onclick = () => activateTab(t.dataset.tab));

  // Modo
  $$('.mode-btn').forEach(b => b.onclick = () => setMode(b.dataset.mode));
  $('#btn-to3d').onclick = () => setMode('3d');

  // Herramientas y formas
  $$('#brush-grid .tbtn').forEach(b => b.onclick = () => setTool(b.dataset.tool));
  $$('#shape-grid .tbtn').forEach(b => b.onclick = () => { setShape(b.dataset.shape); setTool('pencil'); });
  $('#shape-fill').onchange = e => { state.shapeFill = e.target.checked; };

  // Deshacer / rehacer
  $('#btn-undo').onclick = () => state.mode === '2d' ? undo2d() : undo3d();
  $('#btn-redo').onclick = () => state.mode === '2d' ? redo2d() : redo3d();
  $('#btn-undo-3d').onclick = undo3d;
  $('#btn-redo-3d').onclick = redo3d;

  // Grosor y opacidad
  $('#size-range').oninput = e => { state.size = +e.target.value; $('#size-out').textContent = e.target.value; };
  $('#alpha-range').oninput = e => { state.alpha = +e.target.value / 100; $('#alpha-out').textContent = e.target.value + '%'; };

  // Objetivo del color
  $$('#color-target .seg-btn').forEach(b => b.onclick = () => {
    state.target = b.dataset.target;
    $$('#color-target .seg-btn').forEach(x => x.classList.toggle('active', x === b));
  });

  // Colores
  $('#btn-stroke-color').onclick = e => { state.target = 'stroke'; syncTargetSeg(); cp.show(e.currentTarget, 'stroke'); };
  $('#btn-fill-color').onclick = e => { state.target = 'fill'; syncTargetSeg(); cp.show(e.currentTarget, 'fill'); };
  $('#btn-palette').onclick = e => cp.show(e.currentTarget, state.target);
  $('#rail-stroke').onclick = e => { state.target = 'stroke'; syncTargetSeg(); cp.show(e.currentTarget, 'stroke'); };
  $('#rail-fill').onclick = e => { state.target = 'fill'; syncTargetSeg(); cp.show(e.currentTarget, 'fill'); };

  // Limpiar lienzo
  $('#btn-clear').onclick = () => {
    ctx.clearRect(0, 0, el.canvas.width, el.canvas.height);
    if (!state.transparent) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, el.canvas.width, el.canvas.height); }
    pushHistory();
    toast('Lienzo limpiado (Ctrl+Z para deshacer)');
  };

  // Vista
  $('#zoom-range').oninput = e => zoomAt(+e.target.value / 100);
  $$('#zoom-seg .seg-btn').forEach(b => b.onclick = () => {
    const z = b.dataset.zoom;
    if (z === 'in') zoomAt(state.zoom * 1.2);
    else if (z === 'out') zoomAt(state.zoom / 1.2);
    else if (z === 'fit') zoomFit();
    else zoomAt(1);
  });
  $('#z-in').onclick = () => zoomAt(state.zoom * 1.2);
  $('#z-out').onclick = () => zoomAt(state.zoom / 1.2);
  $('#z-fit').onclick = zoomFit;

  $('#chk-transp').onchange = e => {
    state.transparent = e.target.checked;
    el.paper.classList.toggle('transparent', state.transparent);
    if (!state.transparent) repaintBackground();
    else pushHistory();
  };
  $('#chk-guides').onchange = e => { state.guides = e.target.checked; el.paper.classList.toggle('guides', state.guides); };

  $('#btn-theme').onclick = () => {
    const dark = document.documentElement.dataset.theme === 'dark';
    document.documentElement.dataset.theme = dark ? 'light' : 'dark';
    $('#btn-theme').querySelector('span').textContent = dark ? 'Tema oscuro' : 'Tema claro';
    if (studio) studio.setTheme(document.documentElement.dataset.theme);
  };

  $$('#size-seg .seg-btn').forEach(b => b.onclick = () => {
    $$('#size-seg .seg-btn').forEach(x => x.classList.toggle('active', x === b));
    resizeCanvas(+b.dataset.cw, +b.dataset.ch);
  });

  window.addEventListener('resize', () => { if (studio && state.mode === '3d') studio.resize(); });
}

function syncTargetSeg() {
  $$('#color-target .seg-btn').forEach(x => x.classList.toggle('active', x.dataset.target === state.target));
}

/* ═══════════════════════════════════════════════════════════
   Atajos de teclado
   ═══════════════════════════════════════════════════════════ */
const KEY_TOOLS = { p: 'pencil', b: 'brush', m: 'marker', n: 'neon', e: 'eraser', g: 'fill', i: 'picker', v: 'select' };

window.addEventListener('keydown', e => {
  if (e.code === 'Space' && !e.repeat) { spaceDown = true; if (state.mode === '2d') el.stage.classList.add('panning'); }

  const typing = /input|textarea|select/i.test(e.target.tagName);
  if (typing) return;

  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? (state.mode === '2d' ? redo2d() : redo3d()) : (state.mode === '2d' ? undo2d() : undo3d()); return; }
  if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); state.mode === '2d' ? redo2d() : redo3d(); return; }
  if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); saveToGallery(); return; }
  if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); if (studio && studio.selected) { beginChange3d(); studio.duplicate(); commitChange3d(); syncProps(); } return; }
  if (mod && e.key.toLowerCase() === 'a' && state.mode === '3d') { e.preventDefault(); toast('Usa el gizmo para mover objetos'); return; }
  if (mod && e.altKey && e.key.toLowerCase() === 'n') { e.preventDefault(); newDocument(); return; }

  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (state.mode === '3d' && studio && studio.selected) { e.preventDefault(); beginChange3d(); studio.remove(); commitChange3d(); syncProps(); }
    return;
  }
  if (e.key === 'Escape') { cp.close(); if (studio) studio.select(null); return; }
  if (e.key === '+' || e.key === '=') { zoomAt(state.zoom * 1.2); return; }
  if (e.key === '-') { zoomAt(state.zoom / 1.2); return; }
  if (e.key === '0') { zoomFit(); return; }
  if (e.key === '1') { setMode('2d'); return; }
  if (e.key === '2') { setMode('3d'); return; }

  if (!mod && KEY_TOOLS[e.key.toLowerCase()]) { setTool(KEY_TOOLS[e.key.toLowerCase()]); if (state.mode !== '2d') setMode('2d'); }
});

window.addEventListener('keyup', e => {
  if (e.code === 'Space') { spaceDown = false; if (!panState) el.stage.classList.remove('panning'); }
});

/* Pegar imágenes desde el portapapeles */
window.addEventListener('paste', e => {
  const items = e.clipboardData && e.clipboardData.items;
  if (!items) return;
  for (const it of items) {
    if (it.type && it.type.startsWith('image/')) {
      const f = it.getAsFile();
      if (!f) continue;
      const img = new Image();
      img.onload = () => { loadImageToCanvas(img); showApp(); toast('Imagen pegada'); URL.revokeObjectURL(img.src); };
      img.src = URL.createObjectURL(f);
      e.preventDefault();
      return;
    }
  }
});

/* ═══════════════════════════════════════════════════════════
   Arranque
   ═══════════════════════════════════════════════════════════ */
function boot() {
  buildPalettes();
  buildRails();
  buildPropsUI();
  wirePropsInputs();
  wireUI();
  renderRecents();

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, el.canvas.width, el.canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  setTool('pencil');
  setShape('free');
  syncTargetSeg();
  setColor('stroke', '#1b1b1f');
  setColor('fill', '#4cc2ff');
  el.statusSize.textContent = `${el.canvas.width} × ${el.canvas.height} px`;
  pushHistory();
  updateHistoryButtons();
  zoomFit();

  // Aviso al cerrar con cambios sin guardar
  window.addEventListener('beforeunload', e => {
    if (history2d.length > 1) { e.preventDefault(); e.returnValue = ''; }
  });

  // Un pequeño detalle de bienvenida en el lienzo
  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = '#0067c0';
  ctx.font = '600 120px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Empieza a dibujar', el.canvas.width / 2, el.canvas.height / 2 + 40);
  ctx.restore();
  pushHistory();
}

boot();
