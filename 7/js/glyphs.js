/* ============================================================
   GLYPHS — typeface JSON → extruded 3D letters, candy materials
   ============================================================ */
import * as THREE from 'three';

export class Font {
  constructor(data) { this.data = data; this.res = data.resolution; }
  has(ch) { return !!this.data.glyphs[ch]; }
  advance(ch, size = 1) { const g = this.data.glyphs[ch]; return g ? (g.ha / this.res) * size : 0.3 * size; }
  shapes(ch, size = 1) {
    const g = this.data.glyphs[ch];
    if (!g || !g.o) return [];
    const s = size / this.res, path = new THREE.ShapePath(), o = g.o.split(' ');
    for (let i = 0; i < o.length;) {
      const a = o[i++];
      if (a === 'm') path.moveTo(o[i++] * s, o[i++] * s);
      else if (a === 'l') path.lineTo(o[i++] * s, o[i++] * s);
      else if (a === 'q') { const x = o[i++] * s, y = o[i++] * s, cx = o[i++] * s, cy = o[i++] * s; path.quadraticCurveTo(cx, cy, x, y); }
      else if (a === 'b') { const x = o[i++] * s, y = o[i++] * s, c1x = o[i++] * s, c1y = o[i++] * s, c2x = o[i++] * s, c2y = o[i++] * s; path.bezierCurveTo(c1x, c1y, c2x, c2y, x, y); }
    }
    return path.toShapes();
  }
}

const GEO = new Map();
export const DEPTH = 0.34;
/** extruded glyph, pivot at the bottom centre of its advance box, z centred */
export function glyphGeo(font, ch, key = 'b') {
  const id = key + ch;
  if (GEO.has(id)) return GEO.get(id);
  const shapes = font.shapes(ch, 1);
  const g = new THREE.ExtrudeGeometry(shapes, { depth: DEPTH, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.032, bevelSegments: 1, curveSegments: 4 });
  g.translate(-font.advance(ch) / 2, 0, -DEPTH / 2);
  g.computeVertexNormals();
  GEO.set(id, g);
  return g;
}

/* ---------------- palettes ---------------- */
export const STYLE = {
  candy:  { face: '#FF3D9A', side: '#7E0F4C' },
  cyan:   { face: '#3BE8FF', side: '#0B4F86' },
  lemon:  { face: '#FFE14D', side: '#B0561A' },
  lilac:  { face: '#C6A2FF', side: '#4B249A' },
  mint:   { face: '#5BFFC6', side: '#0D6B5A' },
  white:  { face: '#F3E8F6', side: '#FF2E88' },
  ice:    { face: '#F2FBFF', side: '#1E7BFF' },
  gold:   { face: '#FFB935', side: '#A8650C', metal: 1, rough: 0.22 },
  chrome: { face: '#C8CCEA', side: '#7E86C8', metal: 1, rough: 0.16 },
  kblue:  { face: '#3478B8', side: '#173E66' },
  kpink:  { face: '#E0558C', side: '#7A2247' },
  kgold:  { face: '#F2B83C', side: '#8F5E0D' },
  kteal:  { face: '#34AE90', side: '#145C4C' },
};
/* Phong / Lambert with a small cube env: glossy enough, and cheap in software GL */
const SIDE = new Map();
export function sideMat(style, env) {
  if (SIDE.has(style)) return SIDE.get(style);
  const s = STYLE[style];
  const m = s.metal
    ? new THREE.MeshPhongMaterial({ color: s.side, specular: '#ffffff', shininess: 60, envMap: env, combine: THREE.AddOperation, reflectivity: 0.45 })
    : new THREE.MeshLambertMaterial({ color: s.side });
  SIDE.set(style, m);
  return m;
}
/** a face material per glyph so each letter can flash on its own */
export function faceMat(style, env) {
  const s = STYLE[style];
  /* metals add the room's light strips on top of a lit base, so they never go dark */
  if (s.metal) return new THREE.MeshPhongMaterial({ color: s.face, specular: '#ffffff', shininess: 110, envMap: env, combine: THREE.AddOperation, reflectivity: 0.55, emissive: new THREE.Color(s.face), emissiveIntensity: 0 });
  return new THREE.MeshPhongMaterial({ color: s.face, specular: '#9a8aa0', shininess: 70, envMap: env, combine: THREE.MixOperation, reflectivity: 0.1, emissive: new THREE.Color(s.face), emissiveIntensity: 0 });
}
export function glyphMesh(font, ch, style, env) {
  const fm = faceMat(style, env);
  const m = new THREE.Mesh(glyphGeo(font, ch), [fm, sideMat(style, env)]);
  m.userData.face = fm;
  return m;
}
