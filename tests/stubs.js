/* Stubs de canvas 2D / WebGL para ejecutar Paintle 3D bajo jsdom (sin navegador). */
export function make2DStub(canvas) {
  const W = () => canvas.width || 300;
  const H = () => canvas.height || 150;
  const calls = { fillRect: 0, drawImage: 0, stroke: 0, fill: 0, putImageData: 0 };
  const ctx = {
    canvas,
    globalAlpha: 1, globalCompositeOperation: 'source-over',
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, lineCap: 'butt', lineJoin: 'miter',
    shadowBlur: 0, shadowColor: 'transparent', shadowOffsetX: 0, shadowOffsetY: 0,
    font: '10px sans-serif', textAlign: 'start', textBaseline: 'alphabetic',
    imageSmoothingEnabled: true, imageSmoothingQuality: 'low',
    filter: 'none', lineDashOffset: 0, miterLimit: 10,
    save() {}, restore() {},
    scale() {}, rotate() {}, translate() {}, transform() {}, setTransform() {}, resetTransform() {},
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, bezierCurveTo() {}, quadraticCurveTo() {},
    arc() {}, arcTo() {}, ellipse() {}, rect() {}, roundRect() {},
    fill() { calls.fill++; }, stroke() { calls.stroke++; }, clip() {},
    isPointInPath() { return false; }, isPointInStroke() { return false; },
    fillRect() { calls.fillRect++; }, strokeRect() {},
    clearRect() {},
    fillText() {}, strokeText() {},
    measureText(t) { return { width: String(t).length * 6, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }; },
    drawImage() { calls.drawImage++; },
    createLinearGradient() { return { addColorStop() {} }; },
    createRadialGradient() { return { addColorStop() {} }; },
    createConicGradient() { return { addColorStop() {} }; },
    createPattern() { return { setTransform() {} }; },
    getImageData(x, y, w, h) {
      w = Math.max(1, Math.floor(w)); h = Math.max(1, Math.floor(h));
      return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4), colorSpace: 'srgb' };
    },
    putImageData() { calls.putImageData++; },
    createImageData(w, h) { return ctx.getImageData(0, 0, w, h); },
    setLineDash() {}, getLineDash() { return []; },
    _calls: calls
  };
  return ctx;
}

export function makeGLStub(canvas) {
  // Constantes WebGL numéricas (three.js las lee desde el propio contexto)
  const GL = {
    VERSION: 0x1F02, SHADING_LANGUAGE_VERSION: 0x8B8C, VENDOR: 0x1F00, RENDERER: 0x1F01,
    MAX_TEXTURE_SIZE: 0x0D33, MAX_CUBE_MAP_TEXTURE_SIZE: 0x851C, MAX_RENDERBUFFER_SIZE: 0x84E8,
    MAX_VERTEX_ATTRIBS: 0x8869, MAX_TEXTURE_IMAGE_UNITS: 0x8872, MAX_VERTEX_TEXTURE_IMAGE_UNITS: 0x8B4C,
    MAX_COMBINED_TEXTURE_IMAGE_UNITS: 0x8B4D, MAX_VERTEX_UNIFORM_VECTORS: 0x8DFB, MAX_VARYING_VECTORS: 0x8DFC,
    MAX_FRAGMENT_UNIFORM_VECTORS: 0x8DFD, MAX_SAMPLES: 0x8D57, MAX_DRAW_BUFFERS: 0x8824,
    MAX_COLOR_ATTACHMENTS: 0x8CDF, MAX_VIEWPORT_DIMS: 0x0D3A, MAX_3D_TEXTURE_SIZE: 0x8073,
    MAX_ARRAY_TEXTURE_LAYERS: 0x88FF, MAX_VERTEX_UNIFORM_COMPONENTS: 0x8B4A,
    MAX_VERTEX_OUTPUT_COMPONENTS: 0x9198, MAX_FRAGMENT_INPUT_COMPONENTS: 0x9199,
    MAX_TEXTURE_LOD_BIAS: 0x84FD, MAX_RECTANGLE_TEXTURE_SIZE: 0x84F8,
    SCISSOR_BOX: 0x0C10, VIEWPORT: 0x0BA2, ALIASED_LINE_WIDTH_RANGE: 0x846E,
    ALIASED_POINT_SIZE_RANGE: 0x846D, CURRENT_COLOR: 0x0BA1, DEPTH_BITS: 0x0D56, STENCIL_BITS: 0x0D57,
    FRAMEBUFFER_COMPLETE: 0x8CD5, COLOR_ATTACHMENT0: 0x8CE0, DEPTH_ATTACHMENT: 0x8D00,
    STENCIL_ATTACHMENT: 0x8D20, DEPTH_STENCIL_ATTACHMENT: 0x821A, DEPTH24_STENCIL8: 0x88F0,
    FRAMEBUFFER: 0x8D40, RENDERBUFFER: 0x8D41, TEXTURE_2D: 0x0DE1, TEXTURE_CUBE_MAP: 0x8513,
    TEXTURE_3D: 0x806F, TEXTURE_2D_ARRAY: 0x8C1A, ARRAY_BUFFER: 0x8892, ELEMENT_ARRAY_BUFFER: 0x8893,
    STATIC_DRAW: 0x88E4, DYNAMIC_DRAW: 0x88E8, STREAM_DRAW: 0x88E0, TRIANGLES: 4, LINES: 1, POINTS: 0,
    UNSIGNED_BYTE: 0x1401, UNSIGNED_SHORT: 0x1403, UNSIGNED_INT: 0x1405, FLOAT: 0x1406, HALF_FLOAT: 0x140B,
    RGBA: 0x1908, RGB: 0x1907, RGBA8: 0x8058, RGB8: 0x8051, RGBA16F: 0x881A, RGBA32F: 0x8814,
    DEPTH_COMPONENT: 0x1902, DEPTH_COMPONENT16: 0x81A5, DEPTH_COMPONENT24: 0x81A6, DEPTH_COMPONENT32F: 0x8CAC,
    DEPTH_STENCIL: 0x84F9, DEPTH_TEST: 0x0B71, BLEND: 0x0BE2, CULL_FACE: 0x0B44, SCISSOR_TEST: 0x0C11,
    STENCIL_TEST: 0x0B90, POLYGON_OFFSET_FILL: 0x8037, DITHER: 0x0BD0, SAMPLE_ALPHA_TO_COVERAGE: 0x809E,
    FRONT: 0x0404, BACK: 0x0405, FRONT_AND_BACK: 0x0408, CCW: 0x0901, CW: 0x0900,
    NEAREST: 0x2600, LINEAR: 0x2601, LINEAR_MIPMAP_LINEAR: 0x2703, TEXTURE_MAG_FILTER: 0x2800,
    TEXTURE_MIN_FILTER: 0x2801, TEXTURE_WRAP_S: 0x2802, TEXTURE_WRAP_T: 0x2803, REPEAT: 0x2901,
    CLAMP_TO_EDGE: 0x812F, UNPACK_FLIP_Y_WEBGL: 0x9240, UNPACK_PREMULTIPLY_ALPHA_WEBGL: 0x9241,
    UNPACK_ALIGNMENT: 0x0CF5, UNPACK_COLORSPACE_CONVERSION_WEBGL: 0x9243, PACK_ALIGNMENT: 0x0D05,
    COMPILE_STATUS: 0x8B81, LINK_STATUS: 0x8B82, ACTIVE_UNIFORMS: 0x8B86, ACTIVE_ATTRIBUTES: 0x8B89,
    VERTEX_SHADER: 0x8B31, FRAGMENT_SHADER: 0x8B30, TEXTURE0: 0x84C0, FUNC_ADD: 0x8006, ONE: 1, ZERO: 0,
    SRC_ALPHA: 0x0302, ONE_MINUS_SRC_ALPHA: 0x0303, LESS: 0x0201, LEQUAL: 0x0203, ALWAYS: 0x0207,
    KEEP: 0x1E00, REPLACE: 0x1E01, NO_ERROR: 0, CONTEXT_LOST_WEBGL: 0x9242, TEXTURE_MAX_ANISOTROPY_EXT: 0x84FE,
    MAX_TEXTURE_MAX_ANISOTROPY_EXT: 0x84FF, SRGB8_ALPHA8: 0x8C43, RGBA4: 0x8056, RGB5_A1: 0x8057,
    R8: 0x8229, RG8: 0x822B, RED: 0x1903, RG: 0x8227, LUMINANCE: 0x1909, LUMINANCE_ALPHA: 0x190A,
    NEAREST_MIPMAP_NEAREST: 0x2700, NEAREST_MIPMAP_LINEAR: 0x2702, LINEAR_MIPMAP_NEAREST: 0x2701,
    MIRRORED_REPEAT: 0x8370, TEXTURE_WRAP_R: 0x8072, TEXTURE_COMPARE_MODE: 0x884C, COMPARE_REF_TO_TEXTURE: 0x884E,
    TEXTURE_MIN_LOD: 0x813A, TEXTURE_MAX_LOD: 0x813B, TEXTURE_BASE_LEVEL: 0x813C, TEXTURE_MAX_LEVEL: 0x813D,
    MIN: 0x8007, MAX: 0x8008, SAMPLES_PASSED: 0x8914, ANY_SAMPLES_PASSED: 0x8C2F, QUERY_RESULT: 0x8866,
    QUERY_RESULT_AVAILABLE: 0x8867, CURRENT_PROGRAM: 0x8B8D, ACTIVE_UNIFORM_BLOCK_MAX_NAME_LENGTH: 0x8A35,
    UNIFORM_BUFFER: 0x8A11, TRANSFORM_FEEDBACK_BUFFER: 0x8C8E, READ_FRAMEBUFFER: 0x8CA8,
    DRAW_FRAMEBUFFER: 0x8CA9, PIXEL_PACK_BUFFER: 0x88EB, PIXEL_UNPACK_BUFFER: 0x88EC,
    COLOR_BUFFER_BIT: 0x4000, DEPTH_BUFFER_BIT: 0x0100, STENCIL_BUFFER_BIT: 0x0400
  };
  const obj = Object.assign({}, GL);
  const big = 1 << 14;
  const handler = {
    get(target, prop) {
      if (prop === 'canvas') return canvas;
      if (prop === 'drawingBufferWidth') return canvas.width;
      if (prop === 'drawingBufferHeight') return canvas.height;
      if (prop in target) return target[prop];
      // Constante WebGL desconocida: devuelve un número plausible
      if (typeof prop === 'string' && /^[A-Z][A-Z0-9_]*$/.test(prop)) return (target[prop] = 0x7FFF);
      const noop = () => undefined;
      target[prop] = noop;
      return noop;
    },
    set(target, prop, v) { target[prop] = v; return true; }
  };
  Object.assign(obj, {
    getParameter: (p) => {
      // Parámetros de cadena que three.js inspecciona
      if (p === 0x1F02) return 'WebGL 2.0 (Stub)';            // VERSION
      if (p === 0x8B8C) return 'WebGL GLSL ES 3.00 (Stub)';   // SHADING_LANGUAGE_VERSION
      if (p === 0x1F00) return 'Stub Vendor';                 // VENDOR
      if (p === 0x1F01) return 'Stub Renderer';               // RENDERER
      if (p === 0x0D33) return big;                           // MAX_TEXTURE_SIZE
      if (p === 0x851C) return big;                           // MAX_CUBE_MAP_TEXTURE_SIZE
      if (p === 0x8869) return 32;                            // MAX_VERTEX_ATTRIBS
      if (p === 0x8872) return 32;                            // MAX_TEXTURE_IMAGE_UNITS
      if (p === 0x8B4C) return 32;                            // MAX_VERTEX_UNIFORM_VECTORS
      if (p === 0x8B49) return 16;                            // MAX_VARYING_VECTORS
      if (p === 0x8DFB) return 16;                            // MAX_FRAGMENT_UNIFORM_VECTORS
      if (p === 0x84E8) return 8;                             // MAX_DRAW_BUFFERS
      if (p === 0x8CDF) return 8;                             // MAX_COLOR_ATTACHMENTS
      if (p === 0x0D3A) return [big, big];                    // MAX_VIEWPORT_DIMS
      if (p === 0x846D) return [1, 1];                        // ALIASED_LINE_WIDTH_RANGE
      if (p === 0x846E) return [1, 1024];                     // ALIASED_POINT_SIZE_RANGE
      if (p === 0x0BA1) return new Float32Array([0, 0, 0, 0]); // CURRENT_COLOR
      return big;
    },
    getString: () => 'Stub',
    getExtension: () => null,
    getSupportedExtensions: () => [],
    getShaderPrecisionFormat: () => ({ rangeMin: 127, rangeMax: 127, precision: 23 }),
    getShaderInfoLog: () => '',
    getProgramInfoLog: () => '',
    getShaderParameter: () => true,
    getProgramParameter: (prog, pname) => {
      // ACTIVE_UNIFORMS / ACTIVE_ATTRIBUTES / ACTIVE_UNIFORM_BLOCKS: sin entradas
      if (pname === 0x8B86 || pname === 0x8B89 || pname === 0x8A36 || pname === 0x8A35 || pname === 0x8C8B) return 0;
      return true;
    },
    getActiveUniform: (p, i) => ({ name: 'stubUniform' + i, size: 1, type: 0x8B50 }),
    getActiveAttrib: (p, i) => ({ name: 'stubAttrib' + i, size: 1, type: 0x1406 }),
    getUniformLocation: () => ({}),
    getProgramInfoLog: () => '',
    getShaderSource: () => '',
    getAttribLocation: () => 0,
    createTexture: () => ({}),
    createBuffer: () => ({}),
    createFramebuffer: () => ({}),
    createRenderbuffer: () => ({}),
    createProgram: () => ({}),
    createShader: () => ({}),
    shaderSource: () => {},
    compileShader: () => {},
    attachShader: () => {},
    linkProgram: () => {},
    useProgram: () => {},
    bindBuffer: () => {},
    bufferData: () => {},
    enableVertexAttribArray: () => {},
    vertexAttribPointer: () => {},
    activeTexture: () => {},
    bindTexture: () => {},
    texImage2D: () => {},
    texParameteri: () => {},
    generateMipmap: () => {},
    viewport: () => {},
    scissor: () => {},
    clear: () => {},
    clearColor: () => {},
    clearDepth: () => {},
    clearStencil: () => {},
    enable: () => {},
    disable: () => {},
    depthFunc: () => {},
    blendFunc: () => {},
    blendEquation: () => {},
    colorMask: () => {},
    depthMask: () => {},
    frontFace: () => {},
    cullFace: () => {},
    pixelStorei: () => {},
    drawArrays: () => {},
    drawElements: () => {},
    drawBuffers: () => {},
    bindFramebuffer: () => {},
    framebufferTexture2D: () => {},
    checkFramebufferStatus: () => 0x8CD5,
    deleteTexture: () => {},
    deleteBuffer: () => {},
    deleteProgram: () => {},
    deleteShader: () => {},
    deleteFramebuffer: () => {},
    isContextLost: () => false,
    finish: () => {},
    flush: () => {},
    readPixels: () => {},
    getContextAttributes: () => ({ alpha: true, antialias: true, depth: true, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: true, powerPreference: 'default', failIfMajorPerformanceCaveat: false }),
    MAX_TEXTURE_SIZE: 0x0D33
  });
  return new Proxy(obj, handler);
}

export function installCanvasStubs(win) {
  const stubs = new Map();
  win.HTMLCanvasElement.prototype.getContext = function (type) {
    if (!stubs.has(this)) stubs.set(this, {});
    const per = stubs.get(this);
    if (/2d/.test(type)) return (per.ctx2d ||= make2DStub(this));
    if (/webgl2?/.test(type)) return (per.gl ||= makeGLStub(this));
    return null;
  };
  win.HTMLCanvasElement.prototype.toDataURL = function () { return 'data:image/png;base64,AAAA'; };
  win.HTMLCanvasElement.prototype.toBlob = function (cb) { cb && cb(new win.Blob(['x'], { type: 'image/png' })); };
  win.Element.prototype.setPointerCapture = function () {};
  win.Element.prototype.releasePointerCapture = function () {};
  win.Element.prototype.scrollIntoView = function () {};
  return stubs;
}
