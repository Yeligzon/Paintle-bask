/* Smoke test 3D: ejercita Studio3D (three.js) con un contexto WebGL simulado. */
import { JSDOM } from 'jsdom';
import { installCanvasStubs } from './stubs.js';

const dom = new JSDOM('<!doctype html><html><body><div id="host" style="width:900px;height:600px"></div></body></html>', {
  url: 'http://localhost:3000/', pretendToBeVisual: true
});
const win = dom.window;
installCanvasStubs(win);
Object.defineProperty(win.HTMLElement.prototype, 'clientWidth', { get() { return 900; }, configurable: true });
Object.defineProperty(win.HTMLElement.prototype, 'clientHeight', { get() { return 600; }, configurable: true });

// three.js necesita los globales del navegador
for (const k of ['window', 'document', 'navigator', 'HTMLCanvasElement', 'HTMLElement', 'Element', 'Node',
  'Image', 'ImageBitmap', 'OffscreenCanvas', 'DOMParser', 'self', 'requestAnimationFrame', 'cancelAnimationFrame',
  'Event', 'MouseEvent', 'PointerEvent', 'getComputedStyle', 'Blob', 'URL', 'createImageBitmap']) {
  try {
    if (win[k] !== undefined) Object.defineProperty(globalThis, k, { value: win[k], writable: true, configurable: true });
  } catch { /* global de sólo lectura en Node: se omite */ }
}
globalThis.window = win;
globalThis.document = win.document;

const THREE = await import(new URL('../vendor/three.module.js', import.meta.url).href);
const mod = await import(new URL('../3d.js', import.meta.url).href);

let failures = 0;
const ok = (label, cond, extra = '') => {
  if (cond) console.log('  ✓ ' + label);
  else { failures++; console.log('  ✗ ' + label + (extra ? ' — ' + extra : '')); }
};

console.log('\n[1] Catálogos');
ok('three r' + THREE.REVISION + ' cargado', !!THREE.Scene);
ok('12 objetos 3D en el catálogo', mod.OBJECTS.length === 12, String(mod.OBJECTS.length));
ok('8 texturas', mod.TEXTURES.length === 8);
ok('3 acabados', Object.keys(mod.FINISHES).length === 3);
ok('4 vistas de cámara', Object.keys(mod.VIEWS).length === 4);

console.log('\n[2] Constructor del estudio');
const host = win.document.getElementById('host');
let studio;
try {
  studio = new mod.Studio3D(host);
  ok('Studio3D creado con WebGL simulado', !!studio.renderer && !!studio.scene && !!studio.camera);
} catch (e) {
  ok('Studio3D creado con WebGL simulado', false, e.message);
  console.log(e.stack);
  process.exit(1);
}
ok('canvas del renderer insertado', host.querySelector('canvas') !== null);
ok('gizmo y controles listos', !!studio.gizmo && !!studio.controls);
ok('cuadrícula visible', studio.grid.visible === true);

console.log('\n[3] Objetos');
for (const o of mod.OBJECTS) {
  try {
    const m = studio.addObject(o.kind);
    if (!m || !m.geometry || Number.isNaN(m.position.y)) throw new Error('geometría inválida en ' + o.kind);
  } catch (e) {
    ok('crear ' + o.name + ' (' + o.kind + ')', false, e.message);
  }
}
ok('los 12 tipos se crean sin error', studio.objects.length === 12, 'objetos=' + studio.objects.length);
ok('todos proyectan sombra', studio.objects.every(m => m.castShadow));
ok('posiciones distintas (sin apilar)', new Set(studio.objects.map(m => m.position.x.toFixed(2))).size > 5);
ok('contadores de estado', studio.objects.every(m => m.userData.uid > 0 && m.userData.name));

console.log('\n[4] Selección y propiedades');
studio.select(studio.objects[0]);
ok('selección registrada', studio.selected === studio.objects[0]);
ok('resalte visible', studio.outline.visible === true);
studio.setUserData(studio.selected, { color: '#ff00aa' });
ok('color aplicado', studio.selected.material.color.getHexString() === 'ff00aa');
studio.setUserData(studio.selected, { finish: 'metal' });
ok('acabado metal aplicado', studio.selected.material.metalness === mod.FINISHES.metal.metalness);
for (const t of ['stripes', 'dots', 'grid', 'hearts', 'stars', 'checker', 'marble']) {
  studio.setUserData(studio.selected, { texture: t });
  if (!studio.selected.material.map) { ok('textura ' + t, false); break; }
}
ok('todas las texturas generan mapa', !!studio.selected.material.map);
studio.setUserData(studio.selected, { texture: 'none' });
ok('textura «ninguna» quita el mapa', studio.selected.material.map === null);
studio.setUserData(studio.selected, { opacity: 0.4 });
ok('opacidad y transparencia', studio.selected.material.opacity === 0.4 && studio.selected.material.transparent === true);

console.log('\n[5] Duplicar / eliminar');
const n0 = studio.objects.length;
const dup = studio.duplicate();
ok('duplicado creado', !!dup && studio.objects.length === n0 + 1);
ok('el duplicado conserva color y acabado', dup.userData.color === studio.objects[0].userData.color);
studio.remove(dup);
ok('eliminado', studio.objects.length === n0 && studio.selected !== dup);

console.log('\n[6] Serialización (deshacer/rehacer)');
const data = studio.serialize();
ok('serializa los 12 objetos', data.length === 12);
ok('cada objeto lleva kind/color/finish/posición/rotación/escala',
  data.every(d => d.kind && d.color && d.finish && d.position.length === 3 && d.rotation.length === 3 && d.scale.length === 3));
studio.load(data);
ok('recarga la escena', studio.objects.length === 12);
studio.load(data.slice(0, 3));
ok('recarga parcial', studio.objects.length === 3);
studio.load(data);

console.log('\n[7] Cámara y vistas');
for (const v of Object.keys(mod.VIEWS)) {
  studio.setView(v);
  const p = studio.camera.position;
  if (Number.isNaN(p.x) || Number.isNaN(p.y) || Number.isNaN(p.z)) { ok('vista ' + v, false); break; }
}
ok('las 4 vistas colocan la cámara', true);
studio.setGrid(false);
ok('cuadrícula oculta', studio.grid.visible === false);
studio.setShadows(false);
ok('sombras desactivables', studio.renderer.shadowMap.enabled === false);
studio.setShadows(true);
studio.setTheme('dark');
ok('tema oscuro cambia fondo y rejilla', studio.bgColor.getHexString() === '23262b');
studio.setTheme('light');
ok('tema claro restaurado', studio.bgColor.getHexString() === 'eef1f6');
studio.autoSpin = true;
ok('giro automático', studio.autoSpin === true);
studio.autoSpin = false;

console.log('\n[8] Render plano (3D → 2D)');
let src = null;
try {
  src = studio.renderTransparent();
  ok('renderTransparent devuelve el canvas', !!src && src.tagName === 'CANVAS');
} catch (e) {
  console.log('    stack:', (e.stack || '').split('\n').slice(1, 6).join('\n    '));
  ok('renderTransparent devuelve el canvas', false, e.message);
}

console.log('\n[9] Redimensionar y limpiar');
studio.resize();
ok('resize sin error', true);
studio.clear();
ok('escena vacía', studio.objects.length === 0 && studio.selected === null);
studio.dispose();
ok('dispose libera el renderer', host.querySelector('canvas') === null);

console.log(`\nResultado: ${failures === 0 ? 'TODO OK' : failures + ' FALLOS'}`);
process.exit(failures === 0 ? 0 : 1);
