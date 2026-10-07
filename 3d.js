/* ═══════════════════════════════════════════════════════════
   Paintle 3D — estudio 3D (Three.js)
   Carga diferida: sólo se importa cuando entras al modo 3D.
   ═══════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { TransformControls } from 'three/addons/TransformControls.js';

/* ─────────── Catálogos ─────────── */
export const FINISHES = {
  matte: { roughness: 0.95, metalness: 0.0 },
  satin: { roughness: 0.34, metalness: 0.06 },
  metal: { roughness: 0.2, metalness: 0.95 }
};

export const PASTELS = [
  '#f2545b', '#ff9f45', '#ffce54', '#60cd6d', '#2ec4b6',
  '#4cc2ff', '#3a86ff', '#8338ec', '#ff5d8f', '#a3b18a',
  '#f4a261', '#e9ecef', '#8d99ae', '#c77dff', '#06d6a0'
];

export const OBJECTS = [
  { kind: 'box', name: 'Cubo', icon: 'i-cube' },
  { kind: 'sphere', name: 'Esfera', icon: 'i-sphere' },
  { kind: 'cylinder', name: 'Cilindro', icon: 'i-cylinder' },
  { kind: 'cone', name: 'Cono', icon: 'i-cone' },
  { kind: 'torus', name: 'Donut', icon: 'i-torus' },
  { kind: 'diamond', name: 'Diamante', icon: 'i-diamond' },
  { kind: 'capsule', name: 'Cápsula', icon: 'i-capsule' },
  { kind: 'knot', name: 'Nudo', icon: 'i-knot' },
  { kind: 'heart', name: 'Corazón', icon: 'i-heart' },
  { kind: 'star', name: 'Estrella', icon: 'i-star' },
  { kind: 'pyramid', name: 'Pirámide', icon: 'i-cone' },
  { kind: 'ring', name: 'Anillo', icon: 'i-torus' }
];

export const TEXTURES = [
  { id: 'none', name: 'Ninguna' },
  { id: 'stripes', name: 'Rayas' },
  { id: 'dots', name: 'Lunares' },
  { id: 'grid', name: 'Cuadros' },
  { id: 'hearts', name: 'Corazones' },
  { id: 'stars', name: 'Estrellas' },
  { id: 'checker', name: 'Ajedrez' },
  { id: 'marble', name: 'Mármol' }
];

export const VIEWS = {
  persp: { pos: [9, 6.5, 11], target: [0, 1.4, 0] },
  front: { pos: [0, 2.6, 15], target: [0, 1.6, 0] },
  top: { pos: [0.001, 16, 0.001], target: [0, 0, 0] },
  side: { pos: [15, 2.6, 0.001], target: [0, 1.6, 0] }
};

/* ─────────── Texturas proceduralmente generadas ─────────── */
const texCache = new Map();

function makeTexture(id) {
  if (id === 'none' || !id) return null;
  if (texCache.has(id)) return texCache.get(id);

  const S = 512;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const c = cv.getContext('2d');
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, S, S);

  switch (id) {
    case 'stripes': {
      c.fillStyle = '#202024';
      for (let x = -S; x < S * 2; x += 72) {
        c.save(); c.translate(x, 0); c.rotate(-Math.PI / 5);
        c.fillRect(0, -S, 30, S * 3); c.restore();
      }
      break;
    }
    case 'dots': {
      c.fillStyle = '#202024';
      const step = 76, half = step / 2, odd = half / 2;
      for (let y = 0; y < S + step; y += step) {
        const shift = (y / step) % 2 ? odd : 0;
        for (let x = 0; x < S + step; x += step) {
          c.beginPath(); c.arc(x + shift, y, 17, 0, Math.PI * 2); c.fill();
        }
      }
      break;
    }
    case 'grid': {
      c.strokeStyle = '#2a2a30'; c.lineWidth = 8;
      for (let i = 0; i <= S; i += 64) {
        c.beginPath(); c.moveTo(i, 0); c.lineTo(i, S); c.stroke();
        c.beginPath(); c.moveTo(0, i); c.lineTo(S, i); c.stroke();
      }
      break;
    }
    case 'checker': {
      c.fillStyle = '#202024';
      const q = 64;
      for (let y = 0; y < S; y += q)
        for (let x = 0; x < S; x += q)
          if (((x + y) / q) % 2 === 0) c.fillRect(x, y, q, q);
      break;
    }
    case 'hearts': {
      c.fillStyle = '#ff3b6b';
      const step = 128;
      for (let y = 0; y < S + step; y += step) {
        const shift = (y / step) % 2 ? step / 2 : 0;
        for (let x = 0; x < S + step; x += step) heart(c, x + shift, y, 34);
      }
      break;
    }
    case 'stars': {
      c.fillStyle = '#ffb703';
      const step = 128;
      for (let y = 0; y < S + step; y += step) {
        const shift = (y / step) % 2 ? step / 2 : 0;
        for (let x = 0; x < S + step; x += step) star(c, x + shift, y, 34, 5);
      }
      break;
    }
    case 'marble': {
      for (let i = 0; i < 120; i++) {
        const g = 214 + Math.floor(Math.random() * 34);
        c.strokeStyle = `rgba(${g - 54}, ${g - 48}, ${g}, ${0.1 + Math.random() * 0.4})`;
        c.lineWidth = 1 + Math.random() * 11;
        c.beginPath();
        let x = Math.random() * S, y = Math.random() * S;
        c.moveTo(x, y);
        for (let s = 0; s < 5; s++) {
          const nx = x + (Math.random() - 0.5) * 240;
          const ny = y + (Math.random() - 0.5) * 240;
          c.quadraticCurveTo(x + (Math.random() - 0.5) * 130, y + (Math.random() - 0.5) * 130, nx, ny);
          x = nx; y = ny;
        }
        c.stroke();
      }
      break;
    }
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  texCache.set(id, tex);
  return tex;
}

function heart(c, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s / 24, s / 24);
  c.beginPath();
  c.moveTo(0, -7);
  c.bezierCurveTo(0, -11, -6, -15, -12, -11);
  c.bezierCurveTo(-20, -6, -19, 6, 0, 18);
  c.bezierCurveTo(19, 6, 20, -6, 12, -11);
  c.bezierCurveTo(6, -15, 0, -11, 0, -7);
  c.fill(); c.restore();
}

function star(c, x, y, R, points = 5) {
  const inner = R * 0.45;
  c.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : R;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    i ? c.lineTo(px, py) : c.moveTo(px, py);
  }
  c.closePath(); c.fill();
}

/* ─────────── Geometrías ─────────── */
function makeGeometry(kind) {
  switch (kind) {
    case 'sphere': return new THREE.SphereGeometry(1, 64, 40);
    case 'cylinder': return new THREE.CylinderGeometry(0.72, 0.72, 1.9, 48);
    case 'cone': return new THREE.ConeGeometry(1.05, 2, 48);
    case 'torus': return new THREE.TorusGeometry(1, 0.42, 28, 72);
    case 'diamond': return new THREE.OctahedronGeometry(1.25, 0);
    case 'capsule': return new THREE.CapsuleGeometry(0.62, 1.1, 12, 32);
    case 'knot': return new THREE.TorusKnotGeometry(0.78, 0.27, 190, 28);
    case 'pyramid': return new THREE.ConeGeometry(1.25, 1.7, 4);
    case 'ring': return new THREE.TorusGeometry(1.25, 0.13, 20, 96);
    case 'heart': {
      const s = new THREE.Shape();
      s.moveTo(0, -1);
      s.bezierCurveTo(-1.6, 0.15, -1.05, 1.25, 0, 0.52);
      s.bezierCurveTo(1.05, 1.25, 1.6, 0.15, 0, -1);
      const g = new THREE.ExtrudeGeometry(s, {
        depth: 0.55, bevelEnabled: true, bevelThickness: 0.16,
        bevelSize: 0.15, bevelSegments: 8, curveSegments: 40
      });
      g.center();
      return g;
    }
    case 'star': {
      const pts = [], R = 1.3, r = 0.56, n = 5;
      for (let i = 0; i < n * 2; i++) {
        const rad = i % 2 ? r : R;
        const a = Math.PI / 2 + (i * Math.PI) / n;
        pts.push(new THREE.Vector2(Math.cos(a) * rad, Math.sin(a) * rad));
      }
      const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts), {
        depth: 0.42, bevelEnabled: true, bevelThickness: 0.12,
        bevelSize: 0.11, bevelSegments: 5, curveSegments: 12
      });
      g.center();
      return g;
    }
    case 'box':
    default: return new THREE.BoxGeometry(1.6, 1.6, 1.6);
  }
}

/* ─────────── Estudio 3D ─────────── */
export class Studio3D {
  constructor(host) {
    this.host = host;
    this.objects = [];
    this.selected = null;
    this.uid = 1;
    this.onSelect = () => {};
    this.onBeginChange = () => {};
    this.onChange = () => {};
    this.autoSpin = false;
    this._pendingMove = false;
    this._init();
  }

  _init() {
    const w = this.host.clientWidth || 800;
    const h = this.host.clientHeight || 600;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setClearColor(0x000000, 0);
    this.host.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.bgColor = new THREE.Color('#eef1f6');

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 400);
    this.camera.position.set(9, 6.5, 11);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, 1.4, 0);
    this.controls.maxDistance = 70;
    this.controls.minDistance = 2;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN
    };

    // Luces
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xc3c9d6, 0.72));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(7, 13, 9);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -16; key.shadow.camera.right = 16;
    key.shadow.camera.top = 16; key.shadow.camera.bottom = -16;
    key.shadow.camera.far = 60;
    key.shadow.bias = -0.0006;
    key.shadow.radius = 3;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xbfe0ff, 0.45);
    rim.position.set(-9, 5, -8);
    this.scene.add(rim);

    // Suelo
    this.grid = new THREE.GridHelper(48, 48, 0x9aa6b5, 0xd6dce5);
    this.grid.position.y = 0.002;
    this.scene.add(this.grid);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 240),
      new THREE.ShadowMaterial({ opacity: 0.2 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Resalte de selección
    this.outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
      new THREE.LineBasicMaterial({ color: 0x0f6cbd, transparent: true, opacity: 0.95 })
    );
    this.outline.visible = false;
    this.outline.raycast = () => {};
    this.scene.add(this.outline);

    // Gizmo
    this.gizmo = new TransformControls(this.camera, this.renderer.domElement);
    this.gizmo.setSize(0.85);
    this.gizmo.addEventListener('dragging-changed', (e) => { this.controls.enabled = !e.value; });
    this.gizmo.addEventListener('mouseDown', () => { this._pendingMove = true; this.onBeginChange(); });
    this.gizmo.addEventListener('mouseUp', () => {
      if (this._pendingMove) { this._pendingMove = false; this.onChange(); }
    });
    this.scene.add(this.gizmo);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    const el = this.renderer.domElement;
    el.addEventListener('pointerdown', (e) => this._onDown(e));
    el.addEventListener('pointerup', (e) => this._onUp(e));

    this.renderer.setAnimationLoop(() => {
      this.controls.autoRotate = this.autoSpin;
      this.controls.autoRotateSpeed = 1.1;
      this.controls.update();
      this.renderer.setClearAlpha(1);
      this.renderer.setClearColor(this.bgColor, 1);
      this.renderer.render(this.scene, this.camera);
    });
  }

  /* ── Selección con el ratón ── */
  _onDown(e) {
    if (e.button !== 0) return;
    if (this.gizmo.dragging) return;
    this._down = { x: e.clientX, y: e.clientY, t: performance.now() };
  }

  _onUp(e) {
    if (e.button !== 0 || !this._down) return;
    const d = this._down; this._down = null;
    const dist = Math.hypot(e.clientX - d.x, e.clientY - d.y);
    if (dist > 6 || performance.now() - d.t > 700) return;
    if (this.gizmo.dragging) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.objects, false);
    this.select(hits.length ? hits[0].object : null);
  }

  select(obj) {
    this.selected = obj && this.objects.includes(obj) ? obj : null;
    if (this.selected) {
      this.gizmo.attach(this.selected);
      this._fitOutline();
    } else {
      this.gizmo.detach();
      this.outline.visible = false;
    }
    this.onSelect(this.selected);
  }

  _fitOutline() {
    const o = this.selected;
    if (!o) return;
    o.geometry.computeBoundingBox();
    const bb = o.geometry.boundingBox;
    const size = new THREE.Vector3(); bb.getSize(size);
    const center = new THREE.Vector3(); bb.getCenter(center);
    this.outline.geometry.dispose();
    this.outline.geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(size.x, size.y, size.z));
    this.outline.position.copy(o.position);
    this.outline.rotation.copy(o.rotation);
    this.outline.scale.copy(o.scale);
    this.outline.translateX(center.x); this.outline.translateY(center.y); this.outline.translateZ(center.z);
    this.outline.visible = true;
  }

  /* ── Creación de objetos ── */
  addObject(kind, opts = {}) {
    const data = Object.assign({
      kind,
      color: PASTELS[Math.floor(Math.random() * PASTELS.length)],
      finish: 'matte',
      texture: 'none',
      opacity: 1
    }, opts);

    const mesh = new THREE.Mesh(makeGeometry(kind), this._makeMaterial(data));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = {
      kind, uid: this.uid++, name: (OBJECTS.find(o => o.kind === kind) || { name: kind }).name,
      color: data.color, finish: data.finish, texture: data.texture, opacity: data.opacity
    };

    const s = opts.scale != null ? opts.scale : 1;
    mesh.scale.setScalar(s);

    if (opts.position) {
      mesh.position.fromArray(opts.position);
    } else {
      const n = this.objects.length;
      const a = n * 2.4;
      mesh.position.set(Math.cos(a) * Math.min(2 + n * 0.45, 6), 4, Math.sin(a) * Math.min(2 + n * 0.45, 6));
    }
    if (opts.rotation) mesh.rotation.fromArray(opts.rotation);

    this.scene.add(mesh);
    this.objects.push(mesh);
    this._dropToGround(mesh, opts.position != null);
    return mesh;
  }

  /** Deja el objeto apoyado sobre el suelo (salvo que venga con posición fija). */
  _dropToGround(mesh, keepY) {
    mesh.geometry.computeBoundingBox();
    const bb = mesh.geometry.boundingBox.clone().applyMatrix4(
      new THREE.Matrix4().makeScale(mesh.scale.x, mesh.scale.y, mesh.scale.z)
    );
    const minY = bb.min.y;
    if (!keepY) mesh.position.y = Math.max(0.001, mesh.position.y);
    // Ajuste fino: que la base toque el suelo al soltarse
    mesh.userData._groundOffset = -minY;
    if (!keepY && mesh.position.y < 8) mesh.position.y = Math.max(mesh.position.y, -minY + 0.001);
  }

  _makeMaterial(d) {
    const f = FINISHES[d.finish] || FINISHES.matte;
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(d.color),
      map: makeTexture(d.texture),
      roughness: f.roughness,
      metalness: f.metalness,
      transparent: (d.opacity ?? 1) < 1,
      opacity: d.opacity ?? 1
    });
  }

  setUserData(mesh, patch) {
    Object.assign(mesh.userData, patch);
    const d = mesh.userData;
    const mat = mesh.material;
    if (patch.color != null) mat.color.set(d.color);
    if (patch.finish != null) {
      const f = FINISHES[d.finish] || FINISHES.matte;
      mat.roughness = f.roughness;
      mat.metalness = f.metalness;
    }
    if (patch.texture !== undefined) {
      if (mat.map) mat.map = null;
      mat.map = makeTexture(d.texture);
    }
    if (patch.opacity != null) {
      mat.transparent = d.opacity < 1;
      mat.opacity = d.opacity;
    }
    mat.needsUpdate = true;
  }

  duplicate(mesh) {
    const src = mesh || this.selected;
    if (!src) return null;
    const d = this.serialize([src])[0];
    d.position = [src.position.x + 1.2, src.position.y + 0.6, src.position.z + 1.2];
    const copy = this.addObject(d.kind, d);
    copy.scale.fromArray(d.scale || [1, 1, 1]);
    copy.rotation.fromArray(d.rotation || [0, 0, 0]);
    copy.position.fromArray(d.position);
    this.select(copy);
    return copy;
  }

  remove(mesh) {
    const src = mesh || this.selected;
    if (!src) return false;
    if (this.selected === src) { this.gizmo.detach(); this.outline.visible = false; this.selected = null; }
    this.scene.remove(src);
    src.geometry.dispose();
    src.material.dispose();
    const i = this.objects.indexOf(src);
    if (i >= 0) this.objects.splice(i, 1);
    this.onSelect(null);
    return true;
  }

  clear() {
    for (const o of [...this.objects]) this.remove(o);
    this.objects = [];
    this.selected = null;
    this.gizmo.detach();
    this.outline.visible = false;
    this.onSelect(null);
  }

  /* ── Cámara ── */
  setView(name) {
    const v = VIEWS[name] || VIEWS.persp;
    this.camera.position.set(...v.pos);
    this.controls.target.set(...v.target);
    this.controls.update();
  }

  setGrid(visible) { this._gridVisible = !!visible; this.grid.visible = !!visible; }

  setTheme(theme) {
    const dark = theme === 'dark';
    this.bgColor = new THREE.Color(dark ? '#23262b' : '#eef1f6');
    const wasVisible = this._gridVisible !== false && this.grid.visible;
    this.scene.remove(this.grid);
    this.grid.geometry.dispose();
    [].concat(this.grid.material).forEach(m => m && m.dispose && m.dispose());
    this.grid = new THREE.GridHelper(48, 48,
      dark ? 0x8b93a1 : 0x9aa6b5,
      dark ? 0x3b4149 : 0xd6dce5);
    this.grid.position.y = 0.002;
    this.grid.visible = wasVisible;
    this.scene.add(this.grid);
  }

  setShadows(on) {
    this.renderer.shadowMap.enabled = !!on;
    this.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
  }

  /* ── Serialización (para deshacer/rehacer) ── */
  serialize(list) {
    return (list || this.objects).map(o => ({
      kind: o.userData.kind,
      color: o.userData.color,
      finish: o.userData.finish,
      texture: o.userData.texture,
      opacity: o.userData.opacity,
      position: o.position.toArray().map(n => +n.toFixed(4)),
      rotation: o.rotation.toArray().slice(0, 3).map(n => +n.toFixed(4)),
      scale: o.scale.toArray().map(n => +n.toFixed(4))
    }));
  }

  load(data) {
    const keep = this.selected ? this.objects.indexOf(this.selected) : -1;
    this.gizmo.detach();
    this.outline.visible = false;
    for (const o of [...this.objects]) {
      this.scene.remove(o);
      o.geometry.dispose();
      o.material.dispose();
    }
    this.objects = [];
    this.selected = null;
    (data || []).forEach(d => {
      const m = this.addObject(d.kind, d);
      if (d.scale) m.scale.fromArray(d.scale);
      if (d.rotation) m.rotation.fromArray(d.rotation);
      if (d.position) m.position.fromArray(d.position);
    });
    if (keep >= 0 && keep < this.objects.length) this.select(this.objects[keep]);
    else this.onSelect(null);
  }

  /* ── Renderizado plano (3D → 2D) ── */
  renderTransparent() {
    const hadSel = this.selected;
    this.gizmo.visible = false;
    this.outline.visible = false;
    this.renderer.setClearAlpha(0);
    this.renderer.setClearColor(0x000000, 0);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.gizmo.visible = true;
    if (hadSel) this._fitOutline();
    return this.renderer.domElement;
  }

  resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    this.controls.dispose();
    this.gizmo.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
  }
}
