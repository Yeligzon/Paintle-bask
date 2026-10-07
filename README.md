# Paintle 3D 🎨🧊

Un clon web del **Paint 3D de Windows 11**: lienzo 2D con pinceles y formas, más un
estudio 3D con objetos, materiales y texturas — todo en la misma aplicación y con el
aspecto Fluent Design (cinta de opciones, panel lateral, barra de estado, tema claro/oscuro).

Sin dependencias que instalar y sin compilación: **abre `index.html` a través de un
servidor estático** y listo. Three.js r160 va vendorizado en `vendor/`, así que el modo 3D
funciona incluso sin acceso a un CDN.

```bash
python3 -m http.server 3000 --bind 0.0.0.0
# → http://localhost:3000
```

## Qué incluye

### Lienzo 2D
- **Pinceles:** lápiz, pincel suave (con grosor variable según la velocidad), rotulador
  translúcido, neón con halo luminoso y borrador real (borra, no pinta de blanco).
- **Formas:** línea, rectángulo, elipse, triángulo, flecha, estrella y corazón, con o sin relleno
  y con vista previa en vivo mientras arrastras.
- **Relleno** por inundación con tolerancia, **cuentagotas** y selector de color.
- **Color:** paleta clásica de Paint, selector HSV con opacidad, recientes y doble objetivo
  (contorno / relleno).
- Grosor y opacidad ajustables, deshacer/rehacer (45 pasos), zoom 10–400 % con rueda,
  paneo con Espacio o botón central, fondo transparente, guías y cuatro tamaños de lienzo.

### Estudio 3D
- **12 primitivas:** cubo, esfera, cilindro, cono, donut, diamante, cápsula, nudo toroidal,
  corazón, estrella, pirámide y anillo.
- **Materiales:** mate, satín y metal; **8 texturas** generadas por código (rayas, lunares,
  cuadros, corazones, estrellas, ajedrez, mármol); color y opacidad por objeto.
- **Gizmo** de mover / girar / escalar, cuadrícula y sombras suaves, 4 vistas de cámara
  predefinidas y giro automático.
- Panel de propiedades con escala, rotación por ejes y posición numérica.
- **«Pasar a 2D»**: aplana la escena 3D sobre el lienzo 2D para seguir dibujando encima.
- Deshacer/rehacer propio de la escena (patrón memento: el estado previo se guarda *antes*
  de cada cambio).

### Documento
- Nuevo, abrir imagen, pegar desde el portapapeles, descargar PNG y **galería** de creaciones
  guardadas en `localStorage` (con miniatura, apertura y borrado).
- Tema claro/oscuro y atajos de teclado.

## Atajos

| Tecla | Acción | Tecla | Acción |
|---|---|---|---|
| `P` `B` `M` `N` | lápiz / pincel / rotulador / neón | `Ctrl+Z` `Ctrl+Y` | deshacer / rehacer |
| `E` `G` `I` | borrador / relleno / cuentagotas | `Ctrl+S` | guardar en la galería |
| `1` / `2` | modo 2D / modo 3D | `Ctrl+D` | duplicar objeto 3D |
| `+` `-` `0` | acercar / alejar / ajustar | `Supr` | eliminar objeto 3D |
| `Espacio` + arrastrar | mover el lienzo | `Esc` | cerrar paneles / deseleccionar |

## Estructura

```
index.html      interfaz completa (barra de título, cinta, riel, escenario, paneles)
styles.css      sistema de diseño Fluent (claro/oscuro) con variables CSS
app.js          estado, motor de dibujo 2D, historial, color, galería, atajos
3d.js           estudio 3D sobre three.js (escena, objetos, materiales, gizmo, vistas)
vendor/         three.js r160 + OrbitControls + TransformControls (MIT, ver LICENSE-three.txt)
```

## Pruebas

La lógica se valida con dos suites que corren en Node + jsdom (sin navegador), usando stubs
de contexto 2D y WebGL:

```bash
cd tests && npm i && npm test
```

- `test-2d.mjs` — arranque, dibujo, formas, herramientas, historial, colores, zoom, galería, atajos.
- `test-3d.mjs` — catálogos, constructor del estudio, las 12 primitivas, materiales y texturas,
  selección, duplicado/borrado, serialización, cámara, aplanado a 2D y liberación de recursos.

## Créditos

Interfaz inspirada en Paint 3D / Paint de Windows 11 (Microsoft). Motor 3D:
[three.js](https://threejs.org/) r160, licencia MIT.
