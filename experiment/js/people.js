/* people.js: parametric bust figures (viewBox 0 0 200 240), shaded at "Level 2" as chosen in design/avatar_style_sheet.html.
 * One renderer draws the designer preview, strangers, foils, the known and unfamiliar person, and the face test, so
 * drawing quality is identical for everyone shown. Feature vectors are plain objects (see FEATURE_KEYS / NEUTRAL).
 *
 * Feature contrast: every facial feature is coloured relative to the skin it sits on (CIELAB lightness difference,
 * dL*), so no feature is masked on any skin tone: mouth seam dL* 24, eyes near-black, brows >= 25 and facial hair
 * >= 22 (dark or brown hair only ever pushed darker), age lines 10 / 13, stubble 6.
 * Animation: PersonRig (gaze, head roll, nod, mouth opening, smile, brow raise, bounce) with a three-quarter turn
 * toward the partner (facing). */
SRL.people = (function () {
  const U = SRL.util;
  let uid = 0;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const f = (n) => (+n).toFixed(1);
  const pt = (p) => f(p[0]) + ' ' + f(p[1]);
  const hex2rgb = (h) => { h = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16)); };
  const rgb2hex = (r) => '#' + r.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A.map((v, i) => v + (B[i] - v) * t)); };
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const gam = (c) => { c = clamp(c, 0, 1); return 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055); };
  function lstar(h) { const [r, g, b] = hex2rgb(h).map(lin); const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b; return Y > 0.008856 ? 116 * Math.cbrt(Y) - 16 : 903.3 * Y; }
  function oklch(L, C, H) {
    const a = C * Math.cos(H * Math.PI / 180), b = C * Math.sin(H * Math.PI / 180);
    const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3), m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3), s = Math.pow(L - 0.0894841775 * a - 1.2914855480 * b, 3);
    return rgb2hex([gam(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s), gam(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s), gam(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)]);
  }
  const INK = '#120B09', WHITE = '#FFFFFF';
  // Mix toward INK or WHITE until L* reaches target (clamped when out of reach).
  function towardL(base, target) {
    const L0 = lstar(base); if (Math.abs(target - L0) < 0.05) return base;
    const dark = target < L0, to = dark ? INK : WHITE;
    if (dark ? lstar(to) >= target : lstar(to) <= target) return to;
    let lo = 0, hi = 1;
    for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2, L = lstar(mix(base, to, m)); if (dark ? L <= target : L >= target) hi = m; else lo = m; }
    return mix(base, to, hi);
  }
  const shade = (c, dl) => towardL(c, lstar(c) - dl);
  const light = (c, dl) => towardL(c, lstar(c) + dl);
  // Push base lighter or darker (smaller change) until |L* - L*(skin)| >= dl.
  function away(base, skin, dl) {
    const Ls = lstar(skin), Lb = lstar(base);
    if (Math.abs(Lb - Ls) >= dl) return base;
    const d = towardL(base, Ls - dl), l = towardL(base, Ls + dl);
    const okD = Math.abs(lstar(d) - Ls) >= dl - 0.5, okL = Math.abs(lstar(l) - Ls) >= dl - 0.5;
    if (okD && okL) return Math.abs(lstar(d) - Lb) <= Math.abs(lstar(l) - Lb) ? d : l;
    if (okD) return d; if (okL) return l;
    return Math.abs(lstar(d) - Ls) >= Math.abs(lstar(l) - Ls) ? d : l;
  }
  // Hair-coloured features (brows, facial hair): dark or brown hair is only ever pushed darker, so a brown beard on
  // deep skin becomes near-black rather than lighter than the skin. Light hair uses away().
  function awayHair(base, skin, dl) {
    if (lstar(base) >= 55) return away(base, skin, dl);
    const Ls = lstar(skin);
    return Math.abs(lstar(base) - Ls) >= dl && lstar(base) < Ls ? base : towardL(base, Ls - dl);
  }
  // Tint between skin and c with |dL*| = dl.
  function tint(skin, c, dl) {
    const Ls = lstar(skin); if (Math.abs(lstar(c) - Ls) <= dl) return c;
    let lo = 0, hi = 1;
    for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2; if (Math.abs(lstar(mix(skin, c, m)) - Ls) >= dl) hi = m; else lo = m; }
    return mix(skin, c, hi);
  }

  /* Skin: lightness (0 light .. 1 deep) x undertone (0 cool .. 0.33 neutral .. 0.67 warm .. 1 olive). */
  function skinHex(L01, U01) {
    const L = 0.895 - 0.52 * L01;
    const H = 38 + 38 * U01;
    let C = 0.052 + 0.036 * L01;
    if (U01 > 0.8) C *= 1 - 0.1 * (U01 - 0.8) / 0.2;
    return oklch(L, C, H);
  }
  // Named natural colours sit at fixed points on the slider: black 0, dark brown 0.2, brown 0.4, light brown 0.58,
  // auburn 0.72, blonde 0.92. Neighbouring names differ by about 10-14 L* so a one-step change is visible.
  const HAIR_STOPS = [[0, '#1C1918'], [0.2, '#33231C'], [0.4, '#744C30'], [0.58, '#9C7148'], [0.72, '#8E4A2D'], [0.82, '#B88A55'], [0.92, '#CFAE72'], [1, '#E2CA96']];
  function hairHex(c, gray) {
    let col = HAIR_STOPS[HAIR_STOPS.length - 1][1];
    for (let i = 1; i < HAIR_STOPS.length; i++) if (c <= HAIR_STOPS[i][0]) { const [a, ca] = HAIR_STOPS[i - 1], [b, cb] = HAIR_STOPS[i]; col = mix(ca, cb, (c - a) / (b - a)); break; }
    if (gray > 0) col = mix(col, '#A3A19D', clamp(gray * 1.6, 0, 1));
    if (gray > 0.6) col = mix(col, '#E8E5E0', (gray - 0.6) / 0.4);
    return col;
  }
  const IRIS = { darkbrown: '#3A2416', brown: '#5C3A21', hazel: '#7B6437', green: '#5E7447', blue: '#5A7FA8', gray: '#7E8B95' };
  // Shirt palettes. Designer (known / unfamiliar person) and stranger colours are disjoint, so clothing never links the
  // person on the right to a stranger.
  const DESIGNER_SHIRTS = { warmgray: '#B9B3A8', navy: '#2F3E66', maroon: '#8E3B46', rose: '#D98BA3', olive: '#77763A', charcoal: '#3E3E44' };
  const STRANGER_SHIRTS = { teal: '#3E8C86', blue: '#4C78B5', mustard: '#C9A13B', coral: '#D27860', green: '#5E8F4E', plum: '#7D5A8C', slate: '#6B7480' };
  const SHIRTS = Object.assign({}, DESIGNER_SHIRTS, STRANGER_SHIRTS);
  const COVER = { navy: '#34506E', plum: '#704A66', forest: '#2F5D50', sand: '#A88A5E', saffron: '#C77A2E', white: '#ECE8E1', maroon: '#7A2E33' };

  /* Hair styles: texture(s) and length category. */
  const STYLES = {
    buzz: { tex: ['straight', 'wavy', 'curly', 'coily'], len: ['short'], label: 'Buzz' },
    bald: { tex: ['straight', 'wavy', 'curly', 'coily'], len: ['short'], label: 'Bald / receding' },
    crop: { tex: ['straight', 'wavy'], len: ['short'], label: 'Short crop' },
    sidepart: { tex: ['straight', 'wavy'], len: ['short'], label: 'Side part' },
    curly_short: { tex: ['curly'], len: ['short'], label: 'Short curls' },
    coils_short: { tex: ['coily'], len: ['short'], label: 'Short coils' },
    bangs: { tex: ['straight', 'wavy'], len: ['medium'], label: 'Bob with bangs' },
    shoulder: { tex: ['straight', 'wavy'], len: ['medium'], label: 'Shoulder length' },
    curly_mid: { tex: ['curly', 'coily'], len: ['medium'], label: 'Curls / coils, medium' },
    afro: { tex: ['curly', 'coily'], len: ['medium'], label: 'Afro' },
    bun: { tex: ['straight', 'wavy', 'curly', 'coily'], len: ['medium', 'long'], label: 'Bun / puff' },
    long: { tex: ['straight', 'wavy'], len: ['long'], label: 'Long' },
    curly_long: { tex: ['curly'], len: ['long'], label: 'Curls, long' },
    braids: { tex: ['curly', 'coily'], len: ['long'], label: 'Braids' },
    locs: { tex: ['curly', 'coily'], len: ['long'], label: 'Locs' }
  };

  /* Catmull-Rom sampling. */
  function cr(pts, closed, seg) {
    seg = seg || 8; const n = pts.length, out = [];
    const get = (i) => closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)];
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      for (let k = 0; k < seg; k++) {
        const t = k / seg, t2 = t * t, t3 = t2 * t;
        const c = (j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
        out.push([c(0), c(1)]);
      }
    }
    if (!closed) out.push(pts[n - 1]);
    return out;
  }
  // Three-quarter turn: while W is set, outlines (head, hair, facial hair, covering) are narrowed on the far side.
  let W = null;
  const ptw = (q) => pt(W ? W(q) : q);
  const poly = (pts) => 'M' + pts.map(ptw).join('L') + 'Z';
  const M = (p) => [200 - p[0], p[1]];
  const sym = (r) => r.concat(r.slice(1, -1).reverse().map(M));
  const shape = (...segs) => segs.reduce((acc, s) => acc.concat(cr(s, false, 7)), []);
  const wave = (pts, amp, freq, y0) => pts.map(([x, y]) => (y > y0 ? [x + Math.sign(x - 100) * amp * Math.sin((y - y0) * freq), y] : [x, y]));
  function bumps(pts, r, step) {
    let out = '', acc = step;
    for (let i = 1; i < pts.length; i++) {
      acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (acc >= step) { acc = 0; const q = W ? W(pts[i]) : pts[i]; out += `<circle cx="${f(q[0])}" cy="${f(q[1])}" r="${f(r)}"/>`; }
    }
    return out;
  }
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const FRECKLES = (() => { const r = rng(7), out = []; for (let i = 0; i < 34; i++) { const side = i % 2 ? 1 : -1; const ang = r() * Math.PI * 2, rad = Math.sqrt(r()); out.push(i % 6 === 5 ? [side * 3 * r(), 112 + 8 * r(), 'n'] : [side * (26 + 11 * rad * Math.cos(ang)), 117 + 6 * rad * Math.sin(ang), 'c']); } return out; })();

  function geom(p, o) {
    const hw = 47 + 17 * p.faceW, jawHW = hw * (0.6 + 0.24 * p.jaw), chinHW = 6.5 + 12 * p.jaw;
    // facing: -1 .. 1. Features shift about 9% of face width toward the partner; the far eye narrows.
    const fc = o.facing || 0, turn = Math.abs(fc), dir = Math.sign(fc), dx = fc * 0.09 * 2 * hw;
    const right = [[100, 36], [100 + hw * 0.74, 44], [100 + hw * 0.97, 70], [100 + hw, 100], [100 + hw * 0.95, 126], [100 + jawHW, 151], [100 + chinHW, 167], [100, 172]];
    const nb = 121 + 12 * p.noseL;
    return {
      dx, turn, dir, hw, jawHW, chinHW, head: cr(sym(right), true, 8),
      eyeY: 104, ex: 19.5 + 8 * p.eyeSpacing, a: 9 + 4 * p.eyeSize, b: 5 + 2.2 * p.eyeSize, tilt: (p.eyeTilt - 0.5) * 6.4,
      nb, nw: 6.5 + 6.5 * p.noseW, nx: 100 + dx * 1.3,
      my: nb + 15, mw: 10 + 7 * p.mouthW, ut: 1.7 + 2.5 * p.lipFull, lt: 2.3 + 3.3 * p.lipFull, mx: 100 + dx * 1.15
    };
  }

  function colors(p, lv) {
    const skin = skinHex(p.skinL, p.skinU), hair = hairHex(p.hairColor, p.hairGray), Ls = lstar(skin);
    const facial = awayHair(hair, skin, 22);
    const lip = towardL(mix(skin, '#A4544C', 0.25), Ls - 8);
    return {
      skin, hair, facial, stubble: tint(skin, facial, 6), lip, lipUp: towardL(lip, Ls - 11), lipHi: light(lip, 7),
      seam: towardL(skin, Ls - 24), interior: towardL(skin, Ls - 32), lid: towardL(skin, Ls - 32),
      crease: towardL(skin, Ls - 13), l10: towardL(skin, Ls - 10), l13: towardL(skin, Ls - 13), l16: towardL(skin, Ls - 16), nose: towardL(skin, Ls - 17), nostril: towardL(skin, Ls - 24),
      hi: light(skin, lv >= 3 ? 6 : 3.5), lo: towardL(skin, Ls - (lv >= 3 ? 11 : 7)), socket: towardL(skin, Ls - 8),
      brow: awayHair(mix(hair, '#3A2A22', 0.35), skin, 25), frame: away('#2B2B30', skin, 25),
      freckle: towardL(mix(skin, '#8A5A3A', 0.3), Ls - 13), iris: IRIS[p.iris] || IRIS.brown,
      shirt: SHIRTS[p.shirt] || p.shirt, cover: COVER[p.coverColor] || COVER.navy,
      hairLine: lstar(hair) < 25 ? light(hair, 12) : shade(hair, 12)
    };
  }

  const far = (g, s) => g.turn > 0 && s === g.dir;
  const eyeA = (g, s) => g.a * (far(g, s) ? 1 - 0.12 * g.turn : 1);
  const eyeX = (g, s) => 100 + s * g.ex * (far(g, s) ? 1 - 0.06 * g.turn : 1) + g.dx;
  function eye(s, g, p, o, C, id, lv) {
    const cx = eyeX(g, s), cy = g.eyeY, a = eyeA(g, s), b = g.b, t = g.tilt;
    const I = [cx - s * a, cy + t * 0.5], O = [cx + s * a, cy - t * 0.5];
    // Looking down lowers the upper lid (same amount for every lid type).
    const up = (p.lid === 'mono' ? 1.22 : 1.32) - 0.5 * Math.max(0, o.gaze[1]);
    const U1 = [cx - s * a * 0.45, cy - b * up - t * 0.1], U2 = [cx + s * a * 0.5, cy - b * up - t * 0.35];
    const L1 = [cx + s * a * 0.45, cy + b * 0.95 - t * 0.2], L2 = [cx - s * a * 0.4, cy + b * 0.98 + t * 0.15];
    const upper = `M${pt(I)}C${pt(U1)} ${pt(U2)} ${pt(O)}`;
    const shp = upper + `C${pt(L1)} ${pt(L2)} ${pt(I)}Z`;
    const ix = cx + o.gaze[0] * a * 0.5, iy = cy + 0.4 + o.gaze[1] * b * 0.45, ir = b * 0.92 + 0.6;
    const cid = id + (s > 0 ? 'er' : 'el');
    let out = '';
    if (lv >= 3) out += `<ellipse cx="${f(cx)}" cy="${f(cy - b * 0.9)}" rx="${f(a * 1.45)}" ry="${f(b * 1.7)}" fill="${C.socket}" opacity="0.45"/>`;
    if (p.lid === 'mono' && lv >= 2) out += `<path d="${upper}" transform="translate(0 -1.8)" fill="none" stroke="${C.socket}" stroke-width="3.2" opacity="0.55" stroke-linecap="round"/>`;
    out += `<clipPath id="${cid}"><path d="${shp}"/></clipPath><path d="${shp}" fill="#F6F3EE"/>`;
    out += `<g clip-path="url(#${cid})"><circle cx="${f(ix)}" cy="${f(iy)}" r="${f(ir)}" fill="${C.iris}"/>`;
    if (lv >= 2) out += `<circle cx="${f(ix)}" cy="${f(iy)}" r="${f(ir - 0.4)}" fill="none" stroke="${shade(C.iris, 14)}" stroke-width="0.8"/>`;
    out += `<circle cx="${f(ix)}" cy="${f(iy)}" r="${f(ir * 0.45)}" fill="#0E0A09"/>`;
    if (lv >= 2) out += `<path d="${upper}" fill="none" stroke="#3A2A24" stroke-width="3" opacity="0.18"/>`;
    out += `<circle cx="${f(ix - ir * 0.35)}" cy="${f(iy - ir * 0.4)}" r="1.1" fill="#FFFFFF" opacity="0.92"/></g>`;
    out += `<path d="M${pt(O)}C${pt(L1)} ${pt(L2)} ${pt(I)}" fill="none" stroke="${C.l10}" stroke-width="0.7" opacity="0.8"/>`;
    out += `<path d="${upper}" fill="none" stroke="${C.lid}" stroke-width="1.7" stroke-linecap="round"/>`;
    out += `<path d="M${pt(O)}l${f(s * 1.6)} -0.8" stroke="${C.lid}" stroke-width="1.3" stroke-linecap="round"/>`;
    if (p.lid === 'double') out += `<path d="M${pt([cx - s * a * 0.55, cy - b * 1.05])}Q${pt([cx + s * a * 0.15, cy - b * 2.25 - t * 0.3])} ${pt([cx + s * a * 1.02, cy - b * 0.75 - t * 0.5])}" fill="none" stroke="${C.crease}" stroke-width="0.9" stroke-linecap="round"/>`;
    if (p.lid === 'hooded') {
      const fold = `M${pt([cx - s * a * 0.1, cy - b * 1.85])}Q${pt([cx + s * a * 0.75, cy - b * 1.95 - t * 0.3])} ${pt([O[0] + s * 1.4, O[1] - b * 0.25])}`;
      if (lv >= 2) out += `<path d="${fold}" transform="translate(0 1.2)" fill="none" stroke="${C.socket}" stroke-width="2.4" opacity="0.5"/>`;
      out += `<path d="${fold}" fill="none" stroke="${C.crease}" stroke-width="1.05" stroke-linecap="round"/>`;
    }
    return out;
  }

  function brow(s, g, p, C) {
    const cx = eyeX(g, s), a = eyeA(g, s), y0 = g.eyeY - g.b * 1.35 - 9, th = 1.2 + 3.2 * p.browThick, arch = 0.5 + 5.5 * p.browArch, t = g.tilt;
    const ix = cx - s * a * 0.95, ox = cx + s * a * 1.3, px = ix + (ox - ix) * 0.6;
    const iy = y0 + 1 + t * 0.3, oy = y0 + 2.4 - t * 0.4, py = y0 - arch + 1.6;
    const pts = [[ix, iy], [ix - s * 0.4, iy - th], [px, py - th * 0.85], [ox, oy - th * 0.2], [px + s * 1, py + 0.2]];
    return `<path d="${poly(cr(pts, true, 6))}" fill="${C.brow}"/>`;
  }

  function nose(g, C, lv) {
    const x = g.nx, y = g.nb, w = g.nw;
    let out = '';
    if (lv >= 2) {
      out += `<path d="M${f(x + 2.5)} 100 C${f(x + 4)} ${f(y - 10)} ${f(x + w * 0.9)} ${f(y - 6)} ${f(x + w * 0.7)} ${f(y)} L${f(x + 2)} ${f(y - 1)}Z" fill="${C.lo}" opacity="${lv >= 3 ? 0.55 : 0.4}"/>`;
      out += `<ellipse cx="${f(x - 1.2)}" cy="${f(y - 3.5)}" rx="3.2" ry="2.6" fill="${C.hi}" opacity="0.7"/>`;
      out += `<ellipse cx="${f(x)}" cy="${f(y + 4.5)}" rx="${f(w * 0.45)}" ry="1.6" fill="${C.lo}" opacity="0.35"/>`;
    }
    if (lv >= 3) out += `<path d="M${f(x - 1)} 101 L${f(x - 1.2)} ${f(y - 7)}" stroke="${C.hi}" stroke-width="1.6" opacity="0.5" stroke-linecap="round"/>`;
    out += `<path d="M${f(x - w)} ${f(y - 4)}Q${f(x - w - 1.6)} ${f(y + 0.6)} ${f(x - w * 0.42)} ${f(y + 0.9)}M${f(x + w)} ${f(y - 4)}Q${f(x + w + 1.6)} ${f(y + 0.6)} ${f(x + w * 0.42)} ${f(y + 0.9)}M${f(x - w * 0.34)} ${f(y + 1.3)}Q${f(x)} ${f(y + 2.9)} ${f(x + w * 0.34)} ${f(y + 1.3)}" fill="none" stroke="${C.nose}" stroke-width="1.3" stroke-linecap="round"/>`;
    out += `<ellipse cx="${f(x - w * 0.5)}" cy="${f(y + 0.2)}" rx="1.7" ry="0.9" fill="${C.nostril}" opacity="0.75"/><ellipse cx="${f(x + w * 0.5)}" cy="${f(y + 0.2)}" rx="1.7" ry="0.9" fill="${C.nostril}" opacity="0.75"/>`;
    return out;
  }

  function mouth(g, o, C, lv, halo) {
    const s = clamp(o.smile || 0, 0, 1), op = clamp(o.mouth || 0, 0, 1);
    const mx = g.mx, my = g.my, mw = g.mw, ut = g.ut, lt = g.lt, h = op * 12.75;
    const cyc = my - s * 2.2 + op * 0.5, half = mw + s * 1.2 - op * 1.0;
    const Lc = [mx - half, cyc], Rc = [mx + half, cyc];
    const seamC = [mx, my + s * 1.6], lowC = [mx, my + s * 1.6 + 2 * h];
    const upperLip = `M${pt(Lc)}C${pt([Lc[0] + mw * 0.3, my - ut * 1.05])} ${pt([mx - mw * 0.2, my - ut * 1.15])} ${pt([mx, my - ut * 0.75])}C${pt([mx + mw * 0.2, my - ut * 1.15])} ${pt([Rc[0] - mw * 0.3, my - ut * 1.05])} ${pt(Rc)}Q${pt(seamC)} ${pt(Lc)}Z`;
    const ly = my + (lt + h) * 1.33 + s * 0.8;
    const lowerLip = `M${pt(Lc)}Q${pt(lowC)} ${pt(Rc)}C${pt([Rc[0] - mw * 0.25, ly])} ${pt([Lc[0] + mw * 0.25, ly])} ${pt(Lc)}Z`;
    let out = '';
    if (halo) out += `<g fill="none" stroke="${C.skin}" stroke-width="2.4" stroke-linejoin="round"><path d="${upperLip}"/><path d="${lowerLip}"/></g>`;
    out += `<path d="${lowerLip}" fill="${C.lip}"/><path d="${upperLip}" fill="${C.lipUp}"/>`;
    if (lv >= 2) out += `<ellipse cx="${f(mx - 1)}" cy="${f(my + h + lt * 0.55)}" rx="${f(mw * 0.35)}" ry="${f(lt * 0.25)}" fill="${C.lipHi}" opacity="0.55"/>`;
    if (h > 0.35) {
      const inner = `M${pt(Lc)}Q${pt(seamC)} ${pt(Rc)}Q${pt(lowC)} ${pt(Lc)}Z`;
      out += `<path d="${inner}" fill="${C.interior}"/>`;
      if (h > 2.5) out += `<path d="M${pt([Lc[0] + 2, Lc[1] + 0.6])}Q${pt([mx, seamC[1] + 0.2])} ${pt([Rc[0] - 2, Rc[1] + 0.6])}Q${pt([mx, seamC[1] + Math.min(5.2, h * 0.75)])} ${pt([Lc[0] + 2, Lc[1] + 0.6])}Z" fill="#F1EDE6"/>`;
      out += `<path d="${inner}" fill="none" stroke="${C.seam}" stroke-width="0.9"/>`;
    } else {
      out += `<path d="M${pt(Lc)}Q${pt(seamC)} ${pt(Rc)}" fill="none" stroke="${C.seam}" stroke-width="1.15" stroke-linecap="round"/>`;
    }
    return out;
  }

  function facialHair(p, g, C, lv) {
    if (!p.facial || p.facial === 'none') return '';
    const hw = g.hw, my = g.my, mw = g.mw, ut = g.ut;
    const beard = (ext) => sym([[100, my - ut - 5.5], [100 + mw * 0.6, my - ut - 5.2], [100 + mw + 5, my - 2], [100 + hw * 0.66, 132], [100 + hw * 0.96, 122],
      [100 + hw * 0.95 + ext * 0.15, 134], [100 + g.jawHW + ext * 0.5, 153], [100 + g.chinHW + ext * 0.4, 168 + ext * 0.5], [100, 173 + ext]]);
    const tex = p.texture === 'curly' || p.texture === 'coily';
    let out = '';
    if (p.facial === 'stubble') out = `<path d="${poly(cr(beard(0), true, 7))}" fill="${C.stubble}"/>`;
    if (p.facial === 'beard' || p.facial === 'fullbeard') {
      const ext = p.facial === 'fullbeard' ? 7 : 1.5, pts = cr(beard(ext), true, 7);
      out = `<path d="${poly(pts)}" fill="${C.facial}"/>`;
      if (p.facial === 'fullbeard' && tex) out += `<g fill="${C.facial}">${bumps(pts.filter((q) => q[1] > 140), 3, 3.6)}</g>`;
      if (lv >= 3) out += `<path d="${poly(pts)}" fill="none" stroke="${C.hairLine}" stroke-width="0.6" opacity="0.5"/>`;
    }
    if (p.facial === 'mustache' || p.facial === 'beard' || p.facial === 'fullbeard') {
      const m = sym([[100, my - ut - 4.4], [100 + mw * 0.55, my - ut - 4], [100 + mw + 1.4, my - 0.2], [100 + mw * 0.6, my - ut - 0.9], [100, my - ut - 0.4]]);
      out += `<path d="${poly(cr(m, true, 7))}" fill="${C.facial}"/>`;
    }
    return out;
  }

  function hair(p, g, C, lv, id) {
    if (p.covering === 'hijab' || p.covering === 'turban') return { back: '', front: '', over: '' };
    const hw = g.hw, st = p.hairStyle, tex = p.texture;
    const fill = lv >= 2 ? `url(#${id}h)` : C.hair;
    const outerR = (t, sY) => [[100 + hw + t * 0.35, sY], [100 + hw * 0.98 + t * 0.6, 70], [100 + hw * 0.76, 43 - t * 0.8]];
    const cap = (t, hy, tY, sY, hl, topX) => {
      const R = outerR(t, sY), L = R.slice().reverse().map(M), top = [[100 + (topX || 0), 36 - t]];
      const line = hl || [[100 - hw + 0.6, sY], [100 - hw * 0.92, tY], [100 - hw * 0.58, hy + 4], [100, hy], [100 + hw * 0.58, hy + 4], [100 + hw * 0.92, tY], [100 + hw - 0.6, sY]];
      return { outer: cr(R.concat(top, L), false, 8), pts: shape(R.concat(top, L), line), line: cr(line, false, 8) };
    };
    const P = (pts, fl) => `<path d="${poly(pts)}" fill="${fl || fill}"/>`;
    const B = (pts, r, step, fl) => `<g fill="${fl || C.hair}">${bumps(pts, r, step)}</g>`;
    let back = '', front = '', over = '', frontPts = null, outerPts = null;
    const hiArc = `<path d="M${f(100 - hw * 0.55)} 50 Q${f(100 - hw * 0.1)} 38 ${f(100 + hw * 0.35)} 44" fill="none" stroke="${light(C.hair, 16)}" stroke-width="3.5" opacity="0.4" stroke-linecap="round"/>`;
    const longBack = (bottom, flare) => { const r = [[100, 30], [100 + hw * 0.86, 38], [100 + hw + 9, 74], [100 + hw + 11 + flare * 0.5, 120], [100 + hw + 12 + flare, bottom]]; return shape(r, [[100 + hw + 12 + flare, bottom], [100, bottom + 3], [100 - hw - 12 - flare, bottom]], r.slice().reverse().map(M)); };
    const curtains = (bottom, flare) => {
      const R = [[100 + hw + 11 + flare, bottom], [100 + hw + 10 + flare * 0.5, 120], [100 + hw + 8, 74], [100 + hw * 0.85, 37]];
      const L = R.slice().reverse().map(M);
      const inner = [[100 - hw - 11 - flare + 13, bottom], [100 - hw + 1, 120], [100 - hw * 0.85, 80], [100 - hw * 0.4, 62], [94, 54]];
      const inner2 = [[94, 54], [100 + hw * 0.3, 58], [100 + hw * 0.85, 76], [100 + hw - 1, 120], [100 + hw + 11 + flare - 13, bottom]];
      return shape(R.concat([[96, 30]], L), inner, inner2);
    };
    switch (st) {
      case 'buzz': { const c = cap(1.2, 60, 74, 100); front = P(c.pts, mix(C.hair, C.skin, 0.35)); break; }
      case 'bald': {
        const side = [[100 + hw - 1.5, 90], [100 + hw + 1.8, 95], [100 + hw + 2.4, 110], [100 + hw + 0.5, 122], [100 + hw - 2.2, 110]];
        front = P(cr(side, true, 6), C.hair) + P(cr(side.map(M), true, 6), C.hair); break;
      }
      case 'crop': {
        // Short crop: close to the head with an even hairline.
        const c = cap(3, 63, 76, 98, [[100 - hw + 0.6, 98], [100 - hw * 0.92, 76], [100 - hw * 0.6, 64.5], [100, 63.5], [100 + hw * 0.6, 64.5], [100 + hw * 0.92, 76], [100 + hw - 0.6, 98]]);
        frontPts = c.pts; front = P(c.pts);
        if (lv >= 2) front += hiArc; break;
      }
      case 'sidepart': {
        // Side part: taller, with a visible part and a fringe swept down across the forehead.
        const c = cap(12, 60, 74, 96, [[100 - hw + 0.6, 96], [100 - hw * 0.93, 72], [100 - hw * 0.5, 54], [100 - hw * 0.38, 50], [100 - hw * 0.05, 61], [100 + hw * 0.4, 71], [100 + hw * 0.8, 81], [100 + hw - 0.6, 94]], 12);
        frontPts = c.pts; front = P(c.pts);
        front += `<path d="M${f(100 - hw * 0.38)} 51 Q${f(100 - hw * 0.36)} 38 ${f(100 - hw * 0.26)} 25" fill="none" stroke="${C.hairLine}" stroke-width="1.3" opacity="0.85" stroke-linecap="round"/>`;
        if (lv >= 2) front += hiArc;
        break;
      }
      case 'curly_short': case 'coils_short': {
        const coil = st === 'coils_short', c = cap(coil ? 6 : 9, 63, 77, 98);
        frontPts = c.pts; outerPts = c.outer;
        front = B(c.outer, coil ? 3 : 4.6, coil ? 3.6 : 6) + P(c.pts) + B(c.line.slice(2, -2), coil ? 2.1 : 3, coil ? 3.2 : 5); break;
      }
      case 'bangs': {
        const R = [[100, 30], [100 + hw * 0.86, 38], [100 + hw + 8, 72], [100 + hw + 9, 112], [100 + hw + 8, 146]];
        back = P(shape(R, [[100 + hw + 8, 146], [100 - hw - 8, 146]], R.slice().reverse().map(M)));
        const oR = [[100 + hw + 8, 146], [100 + hw + 9, 112], [100 + hw + 7, 72], [100 + hw * 0.85, 38]];
        const inner = [[100 - hw + 3, 146], [100 - hw + 2, 112], [100 - hw * 0.88, 83], [100 - hw * 0.45, 81], [100, 82], [100 + hw * 0.45, 81], [100 + hw * 0.88, 83], [100 + hw - 2, 112], [100 + hw - 3, 146]];
        let pts = shape(oR.concat([[100, 30]], oR.slice().reverse().map(M)), inner);
        if (tex === 'wavy') pts = wave(pts, 1.8, 0.25, 96);
        frontPts = pts; front = P(pts); if (lv >= 2) front += hiArc; break;
      }
      case 'shoulder': case 'long': case 'curly_long': {
        const bottom = st === 'shoulder' ? 162 : 204, flare = st === 'curly_long' ? 8 : tex === 'wavy' ? 3 : 0;
        let bp = longBack(bottom, flare), fp = curtains(bottom - 8, flare);
        if (tex === 'wavy') { bp = wave(bp, 2.6, 0.2, 90); fp = wave(fp, 2.2, 0.2, 90); }
        back = P(bp); front = P(fp); frontPts = fp;
        if (st === 'curly_long') { back = B(bp.filter((q) => q[1] > 50), 5.5, 6.5) + back; front = B(fp.filter((q) => Math.abs(q[0] - 100) > hw * 0.7 || q[1] < 40), 4.4, 6) + front; }
        if (lv >= 2 && st !== 'curly_long') front += hiArc; break;
      }
      case 'curly_mid': {
        const r = [[100, 24], [100 + hw * 0.9, 32], [100 + hw + 16, 70], [100 + hw + 18, 112], [100 + hw + 14, 148]];
        const bp = shape(r, [[100 + hw + 14, 148], [100, 142], [100 - hw - 14, 148]], r.slice().reverse().map(M));
        back = B(bp.filter((q) => q[1] < 146), 6, 7) + P(bp);
        const oR = [[100 + hw + 12, 124], [100 + hw + 12, 90], [100 + hw * 0.98 + 6, 64], [100 + hw * 0.78, 34]];
        const inner = [[100 - hw + 1, 124], [100 - hw * 0.96, 90], [100 - hw * 0.6, 66], [100, 63], [100 + hw * 0.6, 66], [100 + hw * 0.96, 90], [100 + hw - 1, 124]];
        const fp = shape(oR.concat([[100, 25]], oR.slice().reverse().map(M)), inner);
        frontPts = fp; front = P(fp) + B(cr(inner, false, 8).slice(4, -4), 3.2, 5); break;
      }
      case 'afro': {
        const el = []; for (let i = 0; i < 72; i++) { const a = i / 72 * Math.PI * 2; el.push([100 + (hw + 26) * Math.cos(a), 84 + 62 * Math.sin(a)]); }
        back = B(el.concat([el[0]]), 3.6, 4.2) + P(el);
        const c = cap(2, 63, 78, 102); frontPts = c.pts; front = P(c.pts) + B(c.line.slice(3, -3), 2.4, 3.4); outerPts = el; break;
      }
      case 'bun': {
        const textured = tex === 'curly' || tex === 'coily';
        const c = cap(3.5, 60, 75, 96); frontPts = c.pts;
        const r = textured ? 19 : 14, by = textured ? 24 : 27;
        back = `<circle cx="100" cy="${by}" r="${r}" fill="${fill}"/>` + (textured ? `<g fill="${fill}">${bumps(Array.from({ length: 49 }, (_, i) => [100 + r * Math.cos(i / 48 * Math.PI * 2), by + r * Math.sin(i / 48 * Math.PI * 2)]), 3, 3.6)}</g>` : '');
        front = P(c.pts) + (textured ? B(c.line.slice(3, -3), 2, 3.2) : (lv >= 2 ? hiArc : '')); break;
      }
      case 'braids': case 'locs': {
        const locs = st === 'locs', c = cap(locs ? 5 : 3.5, 61, 76, 100); frontPts = c.pts; front = P(c.pts);
        const w = locs ? 6.2 : 2.5, mass = shade(C.hair, 5), tip = light(C.hair, 8);
        const strand = (pts, k) => {
          const d = 'M' + cr(pts, false, 8).map(ptw).join('L'), ww = locs ? w * (0.86 + 0.28 * ((k * 37) % 10) / 10) : w;
          let out = `<path d="${d}" stroke="${C.hairLine}" stroke-width="${f(ww + 0.9)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="${d}" stroke="${C.hair}" stroke-width="${f(ww)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
          if (locs) { if (lv >= 2) out += `<path d="${d}" transform="translate(-1.1 0)" stroke="${tip}" stroke-width="1" opacity="0.45" fill="none"/>`; }
          else out += `<path d="${d}" stroke="${C.hairLine}" stroke-width="${f(ww * 0.85)}" stroke-dasharray="0.6 ${f(ww * 0.9)}" fill="none" opacity="0.85"/>`;
          return out;
        };
        // A dark mass behind the strands so the hair reads as full, then strands that follow the head and fall
        // behind the shoulders, then strands that fall in front of each shoulder.
        back = P(longBack(locs ? 166 : 206, 4), mass);
        // Locs fall to the shoulders, braids to the chest, so the two differ in outline as well as texture.
        const n = locs ? 7 : 12, m = locs ? 3 : 6, bottom = locs ? 170 : 210;
        for (const s of [-1, 1]) for (let j = 0; j < n; j++) {
          const q = j / (n - 1);
          back += strand([[100 + s * hw * (0.15 + 0.75 * q), 38 + 18 * q * q], [100 + s * (hw * 0.95 + 2 + q * 6), 80 + 8 * q], [100 + s * (hw + 4 + q * 9), 132], [100 + s * (hw + 2 + q * 12), bottom - (j % 3) * 6]], j);
        }
        // In front of the shoulders: braids fall over the chest (to the bottom edge), locs stop at the shoulders.
        const fEnd = locs ? 176 : 238;
        for (const s of [-1, 1]) for (let k = 0; k < m; k++) over += strand([[100 + s * (hw * 0.8 + k * 2), 70 + k * 4], [100 + s * (hw + 0.5 + k * 2.4), 102], [100 + s * (hw + (locs ? 1 : -2) + k * 3.4), 156], [100 + s * (hw + (locs ? 0.5 : -6) + k * 4), fEnd - k * (locs ? 4 : 5)]], k + 3);
        if (locs) {
          // Locs: thick ropes from the crown over the top of the head.
          let r = ''; for (let k = -3; k <= 3; k++) r += `<path d="M${f(100 + k * 2)} 36 Q${f(100 + k * hw * 0.2)} 46 ${f(100 + k * hw * 0.28)} 64" fill="none"/>`;
          front += `<g stroke="${C.hairLine}" stroke-width="0.9" opacity="0.7" stroke-linecap="round">${r}</g>`;
        } else {
          // Box braids: parted sections on the scalp.
          let r = ''; for (let k = -2; k <= 2; k++) r += `<path d="M${f(100 + k * hw * 0.24)} 62 Q${f(100 + k * hw * 0.2)} 46 ${f(100 + k * hw * 0.08)} 36" fill="none"/>`;
          r += `<path d="M${f(100 - hw * 0.7)} 52 Q100 44 ${f(100 + hw * 0.7)} 52" fill="none"/>`;
          front += `<g stroke="${C.hairLine}" stroke-width="0.7" opacity="0.75">${r}</g>`;
        }
        break;
      }
    }
    // Level 3 texture inside the front hair shape.
    if (lv >= 3 && frontPts && st !== 'buzz' && st !== 'bald') {
      const r = rng(11); let t = '';
      const textured = tex === 'curly' || tex === 'coily';
      for (let i = 0; i < 26; i++) {
        const x = 100 - hw + 2 * hw * r(), y = 38 + 50 * r();
        t += textured ? `<circle cx="${f(x)}" cy="${f(y)}" r="${f(1.2 + r())}" fill="none"/>` : `<path d="M${f(x)} ${f(y)} q${f(3 + 3 * r())} ${f(-2 - 2 * r())} ${f(7 + 4 * r())} ${f(1 * r())}" fill="none"/>`;
      }
      front += `<clipPath id="${id}hc"><path d="${poly(frontPts)}"/></clipPath><g clip-path="url(#${id}hc)" stroke="${C.hairLine}" stroke-width="0.5" opacity="0.35">${t}</g>`;
    }
    return { back, front, over };
  }

  function covering(p, g, C, lv, id) {
    const hw = g.hw, fill = lv >= 2 ? `url(#${id}c)` : C.cover, fold = shade(C.cover, 12);
    if (p.covering === 'hijab') {
      const outer = sym([[100, 24], [100 + hw * 0.8, 31], [100 + hw + 9, 62], [100 + hw + 12, 104], [100 + hw + 8, 142], [100 + hw + 18, 178], [100 + hw + 36, 206], [186, 240], [100, 241]]);
      const inner = sym([[100, 59], [100 + hw * 0.78, 67], [100 + hw - 3, 97], [100 + hw - 5, 127], [100 + g.jawHW * 0.97, 151], [100 + g.chinHW + 2, 168], [100, 175]]);
      let s = `<path fill-rule="evenodd" d="${poly(cr(outer, true, 7))}${poly(cr(inner, true, 7))}" fill="${fill}"/>`;
      s += `<path d="${poly(cr(inner, true, 7))}" fill="none" stroke="${fold}" stroke-width="${lv >= 2 ? 2.6 : 1.4}" opacity="${lv >= 2 ? 0.7 : 0.9}"/>`;
      if (lv >= 2) s += `<g fill="none" stroke="${fold}" stroke-width="1.1" opacity="0.6" stroke-linecap="round"><path d="M${f(100 + hw + 2)} 150 Q${f(100 + hw + 14)} 190 ${f(100 + hw + 30)} 236"/><path d="M${f(100 - hw - 2)} 150 Q${f(100 - hw - 14)} 190 ${f(100 - hw - 30)} 236"/><path d="M${f(100 - 18)} 186 Q100 200 ${f(100 + 22)} 188"/></g>`;
      return s;
    }
    if (p.covering === 'turban') {
      const pts = shape([[100 + hw + 3, 92], [100 + hw + 6, 64], [100 + hw * 0.76, 30], [104, 16], [100, 15], [96, 16], [100 - hw * 0.76, 30], [100 - hw - 6, 64], [100 - hw - 3, 92]],
        [[100 - hw - 3, 92], [100 - hw * 0.7, 76], [92, 69], [100, 74], [108, 69], [100 + hw * 0.7, 76], [100 + hw + 3, 92]]);
      let s = `<path d="${poly(pts)}" fill="${fill}"/>`;
      s += `<g fill="none" stroke="${fold}" stroke-width="${lv >= 2 ? 1.3 : 1}" stroke-linecap="round"><path d="M${f(100 - hw - 2)} 76 Q${f(100 - hw * 0.2)} 40 ${f(100 + hw * 0.6)} 30"/><path d="M${f(100 - hw * 0.6)} 74 Q100 46 ${f(100 + hw + 3)} 60"/><path d="M100 74 Q${f(100 + hw * 0.5)} 60 ${f(100 + hw + 3)} 82"/></g>`;
      return s;
    }
    return '';
  }

  function glasses(p, g, C, lv) {
    if (!p.glasses || p.glasses === 'none') return '';
    const y = g.eyeY, r = g.a + 3.6, xs = [-1, 1].map((s) => eyeX(g, s));
    const lens = p.glasses === 'round'
      ? xs.map((x) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}"/>`).join('')
      : xs.map((x) => `<rect x="${f(x - r - 0.5)}" y="${f(y - r * 0.72)}" width="${f(2 * r + 1)}" height="${f(r * 1.5)}" rx="3"/>`).join('');
    const ix = g.ex - r;
    let s = `<g fill="#FFFFFF" fill-opacity="0.13" stroke="${C.frame}" stroke-width="1.7">${lens}<path d="M${f(100 - ix + g.dx)} ${f(y - 1)} Q${f(100 + g.dx)} ${f(y - 4)} ${f(100 + ix + g.dx)} ${f(y - 1)}M${f(xs[0] - r)} ${f(y - 2)} L${f(g.warp ? g.warp([100 - g.hw, 0])[0] : 100 - g.hw)} ${f(y - 4)}M${f(xs[1] + r)} ${f(y - 2)} L${f(g.warp ? g.warp([100 + g.hw, 0])[0] : 100 + g.hw)} ${f(y - 4)}" fill="none"/></g>`;
    if (lv >= 2) s += xs.map((x) => `<path d="M${f(x - r * 0.55)} ${f(y - r * 0.2)} l${f(r * 0.45)} ${f(-r * 0.4)}" stroke="#FFFFFF" stroke-width="1.2" opacity="0.6" stroke-linecap="round"/>`).join('');
    return s;
  }

  function ageLines(p, g, C) {
    if (p.age === 'young') return '';
    const c = p.age === 'older' ? C.l13 : C.l10, w = p.age === 'older' ? 0.9 : 0.75;
    let d = '';
    for (const s of [-1, 1]) {
      const ox = 100 + s * (g.ex + g.a) + g.dx, oy = g.eyeY - g.tilt * 0.5 * s * s;
      d += `M${f(ox + s * 2.6)} ${f(oy - 1.2)} l${f(s * 2.6)} -1.3M${f(ox + s * 2.7)} ${f(oy + 1.3)} l${f(s * 2.6)} 0.9`;
      if (p.age === 'older') d += `M${f(g.nx + s * (g.nw + 3))} ${f(g.nb + 1)} Q${f(g.nx + s * (g.nw + 5.5))} ${f(g.my - 6)} ${f(g.mx + s * (g.mw + 4.2))} ${f(g.my - 1)}`;
      if (p.age === 'older') {
        const cx = 100 + s * g.ex + g.dx;
        d += `M${f(cx - s * g.a * 0.6)} ${f(g.eyeY + g.b + 2.6)} Q${f(cx)} ${f(g.eyeY + g.b + 4.6)} ${f(cx + s * g.a * 0.8)} ${f(g.eyeY + g.b + 2.2)}`;
        
      }
    }
    if (p.age === 'older') d += `M${f(100 - g.hw * 0.45)} 70 Q100 67 ${f(100 + g.hw * 0.45)} 70M${f(100 - g.hw * 0.38)} 76 Q100 73.5 ${f(100 + g.hw * 0.38)} 76`;
    return `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
  }

  /* ---------- Assembly ----------
   * A figure is split into a static part (everything that never moves relative to the head: outline, hair, nose,
   * facial hair, glasses, covering, clothes) and a dynamic part (eyes, brows, mouth). The static part is computed once
   * per feature vector + facing and cached; animation only redraws the dynamic part and updates three transforms. */
  const cache = new Map();
  function staticParts(p, o) {
    const lv = o.level, key = JSON.stringify(p) + '|' + (o.facing || 0) + '|' + lv;
    if (cache.has(key)) return cache.get(key);
    const id = 'avs' + (++uid), g = geom(p, o), C = colors(p, lv);
    const warp = g.turn ? (q) => { const k = Math.sign(q[0] - 100) === g.dir ? 1 - 0.08 * g.turn : 1 + 0.02 * g.turn; return [100 + (q[0] - 100) * k + g.dir * g.turn * 1.5, q[1]]; } : null;
    W = warp;
    const hairP = hair(p, g, C, lv, id), headPath = poly(g.head), coverW = covering(p, g, C, lv, id);
    // Facial hair: points near the middle move with the mouth, points at the jaw edge stay with the outline.
    W = (q) => { const t = Math.max(0, 1 - Math.abs(q[0] - 100) / g.hw); const q2 = [q[0] + g.dx * 1.1 * t, q[1]]; return warp ? warp(q2) : q2; };
    const facialW = facialHair(p, g, C, lv);
    W = null; g.warp = warp;
    const hijab = p.covering === 'hijab';
    let defs = '';
    if (lv >= 2) {
      defs += `<radialGradient id="${id}g" cx="0.42" cy="0.36" r="0.75"><stop offset="0" stop-color="${C.hi}"/><stop offset="0.55" stop-color="${C.skin}"/><stop offset="1" stop-color="${C.lo}"/></radialGradient>`;
      defs += `<linearGradient id="${id}h" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="${light(C.hair, 7)}"/><stop offset="0.5" stop-color="${C.hair}"/><stop offset="1" stop-color="${shade(C.hair, 5)}"/></linearGradient>`;
      defs += `<linearGradient id="${id}s" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="${light(C.shirt, 6)}"/><stop offset="1" stop-color="${shade(C.shirt, 7)}"/></linearGradient>`;
      defs += `<linearGradient id="${id}c" x1="0" y1="0" x2="0.5" y2="1"><stop offset="0" stop-color="${light(C.cover, 7)}"/><stop offset="1" stop-color="${shade(C.cover, 8)}"/></linearGradient>`;
    }
    const skinFill = lv >= 2 ? `url(#${id}g)` : C.skin;
    const nk = clamp(g.jawHW * 0.5, 16, 24);
    let body = `<path d="M16 240 C18 214 46 199 100 199 C154 199 182 214 184 240Z" fill="${lv >= 2 ? `url(#${id}s)` : C.shirt}"/>`;
    if (lv >= 3) body += `<path d="M58 240 Q62 222 70 212M142 240 Q138 222 130 212" fill="none" stroke="${shade(C.shirt, 10)}" stroke-width="1.2" opacity="0.6"/>`;
    let neck = `<clipPath id="${id}n"><path d="M${f(100 - nk)} 150 L${f(100 - nk)} 200 Q100 214 ${f(100 + nk)} 200 L${f(100 + nk)} 150Z"/></clipPath>`;
    neck += `<path d="M${f(100 - nk)} 150 L${f(100 - nk)} 200 Q100 214 ${f(100 + nk)} 200 L${f(100 + nk)} 150Z" fill="${C.skin}"/>`;
    if (lv >= 2) neck += `<g clip-path="url(#${id}n)"><ellipse cx="100" cy="166" rx="${f(g.jawHW * 0.8)}" ry="11" fill="${C.lo}" opacity="0.45"/></g>`;
    const ears = [-1, 1].filter((s) => !(g.turn > 0.3 && s === g.dir)).map((s) => { const ex = warp ? warp([100 + s * (g.hw - 1), 110])[0] : 100 + s * (g.hw - 1); return `<ellipse cx="${f(ex)}" cy="110" rx="6.5" ry="10.5" fill="${C.skin}"/><path d="M${f(ex + s * 2.5)} 104 q${f(s * 2.6)} 6 0 12" fill="none" stroke="${C.l10}" stroke-width="1"/>`; }).join('');
    let head = `<clipPath id="${id}hd"><path d="${headPath}"/></clipPath><path d="${headPath}" fill="${skinFill}"/>`;
    let model = '';
    if (lv >= 3) model += [-1, 1].map((s) => `<ellipse cx="${f(100 + s * g.hw * 0.55 - 3)}" cy="117" rx="9" ry="5.5" fill="${C.hi}" opacity="0.5"/>`).join('') + `<path d="M${f(100 - g.jawHW - 4)} 146 Q100 186 ${f(100 + g.jawHW + 4)} 146" fill="none" stroke="${C.lo}" stroke-width="5" opacity="0.4"/>` + [-1, 1].map((s) => `<ellipse cx="${f(100 + s * g.hw * 0.55)}" cy="124" rx="7" ry="4" fill="${C.lip}" opacity="0.13"/>`).join('');
    if (lv >= 2) model += `<path d="${headPath}" fill="none" stroke="${C.lo}" stroke-width="${lv >= 3 ? 3 : 2}" opacity="0.35" transform="translate(1.2 0.6)"/>`;
    head += `<g clip-path="url(#${id}hd)">${model}</g>`;
    const nFreck = Math.round((p.freckles || 0) * FRECKLES.length);
    const freck = nFreck ? `<g fill="${C.freckle}">` + FRECKLES.slice(0, nFreck).map(([x, y, k]) => `<circle cx="${f((k === 'n' ? g.nx : 100 + g.dx) + x)}" cy="${f(y)}" r="0.8"/>`).join('') + '</g>' : '';
    const out = {
      g, C, lv, defs, back: hairP.back, body, neck, over: hairP.over,
      headUnder: (hijab ? '' : ears) + head + ageLines(p, g, C) + freck + facialW + nose(g, C, lv),
      headOver: glasses(p, g, C, lv) + hairP.front + coverW,
      halo: p.facial === 'mustache' || p.facial === 'beard' || p.facial === 'fullbeard'
    };
    cache.set(key, out);
    if (cache.size > 60) cache.delete(cache.keys().next().value);
    return out;
  }
  function dynamicPart(p, o, S) {
    const id = 'avd' + (++uid);
    return eye(-1, S.g, p, o, S.C, id, S.lv) + eye(1, S.g, p, o, S.C, id, S.lv) + mouth(S.g, o, S.C, S.lv, S.halo) +
      `<g transform="translate(0 ${f(-3 * (o.brow || 0))})">${brow(-1, S.g, p, S.C)}${brow(1, S.g, p, S.C)}</g>`;
  }
  const DEFAULT_STATE = { level: 2, gaze: [0, 0], mouth: 0, smile: 0.55, brow: 0, facing: 0, rot: 0, nod: 0, bounce: 0 };
  const headT = (o) => `translate(0 ${f(o.nod || 0)}) rotate(${f(o.rot || 0)} 100 165)`;
  const bounceT = (o) => `translate(0 ${f(-(o.bounce || 0))})`;

  /* Full SVG markup. p: feature vector; o: { level, gaze:[x,y], mouth, smile, brow, facing, rot, nod, bounce, viewBox,
   * label, attrs }. gaze x/y in -1..1; facing -1 (turned to the viewer's left) .. 1 (right); rot in degrees. */
  function svg(p, o) {
    o = Object.assign({}, DEFAULT_STATE, o || {});
    const S = staticParts(p, o);
    return `<svg viewBox="${o.viewBox || '0 0 200 240'}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${o.label || 'person'}" ${o.attrs || ''}>` +
      `<defs>${S.defs}</defs><g class="p-bounce" transform="${bounceT(o)}"><g class="p-back" transform="${headT(o)}">${S.back}</g>${S.body}${S.neck}` +
      `<g class="p-head" transform="${headT(o)}">${S.headUnder}<g class="p-dyn">${dynamicPart(p, o, S)}</g>${S.headOver}</g>${S.over}</g></svg>`;
  }

  /* Live, animatable figure. el = the <svg> element produced by svg(p, { facing }). */
  class PersonRig {
    constructor(el, p, facing, state) {
      this.el = el; this.p = p;
      this.s = Object.assign({}, DEFAULT_STATE, { facing: facing || 0 }, state || {});
      this.S = staticParts(p, this.s);
      this.bounceEl = el.querySelector('.p-bounce'); this.backEl = el.querySelector('.p-back');
      this.headEl = el.querySelector('.p-head'); this.dynEl = el.querySelector('.p-dyn');
      this.render();
    }
    set(st) { Object.assign(this.s, st); this.render(); }
    render() {
      const s = this.s, t = headT(s);
      this.bounceEl.setAttribute('transform', bounceT(s));
      this.backEl.setAttribute('transform', t); this.headEl.setAttribute('transform', t);
      this.dynEl.innerHTML = dynamicPart(this.p, s, this.S);
    }
    // Tween numeric state (and the gaze pair) to targets.
    to(target, ms, ease) {
      const from = {}; Object.keys(target).forEach((k) => (from[k] = Array.isArray(this.s[k]) ? this.s[k].slice() : this.s[k]));
      return U.tween(ms, (t) => {
        const st = {};
        Object.keys(target).forEach((k) => { st[k] = Array.isArray(target[k]) ? target[k].map((v, i) => U.lerp(from[k][i], v, t)) : U.lerp(from[k], target[k], t); });
        this.set(st);
      }, ease);
    }
  }

  /* ---------- Feature vectors ---------- */
  const FEATURE_KEYS = ['age', 'skinL', 'skinU', 'faceW', 'jaw', 'lid', 'eyeSize', 'eyeTilt', 'eyeSpacing', 'iris', 'browThick', 'browArch',
    'noseW', 'noseL', 'lipFull', 'mouthW', 'texture', 'length', 'hairStyle', 'hairColor', 'hairGray', 'facial', 'glasses', 'covering', 'coverColor', 'freckles', 'shirt'];
  // The neutral starting face for the designer: every slider at its midpoint, default categorical options.
  const NEUTRAL = { age: 'middle', skinL: 0.5, skinU: 0.45, faceW: 0.5, jaw: 0.5, lid: 'double', eyeSize: 0.5, eyeTilt: 0.5, eyeSpacing: 0.5, iris: 'brown',
    browThick: 0.5, browArch: 0.5, noseW: 0.5, noseL: 0.5, lipFull: 0.5, mouthW: 0.5, texture: 'straight', length: 'short', hairStyle: 'crop',
    hairColor: 0.2, hairGray: 0, facial: 'none', glasses: 'none', covering: 'none', coverColor: 'navy', freckles: 0, shirt: 'warmgray' };
  const GRAY_MAX = { young: 0.15, middle: 0.6, older: 1 };
  const AGES = ['young', 'middle', 'older'];
  const TEXTURES = ['straight', 'wavy', 'curly', 'coily'];
  const LENGTHS = ['short', 'medium', 'long'];
  const FACIAL = ['none', 'stubble', 'mustache', 'beard', 'fullbeard'];
  const GLASSES = ['none', 'round', 'rect'];
  const COVERINGS = ['none', 'hijab', 'turban'];
  const stylesFor = (texture, length) => Object.keys(STYLES).filter((s) => STYLES[s].tex.includes(texture) && STYLES[s].len.includes(length));
  // Compact, ordered "key=value;..." string for data files (numbers to 2 decimals).
  const vecString = (p) => FEATURE_KEYS.map((k) => k + '=' + (typeof p[k] === 'number' ? p[k].toFixed(2) : p[k])).join(';');

  return { svg, PersonRig, STYLES, IRIS, SHIRTS, DESIGNER_SHIRTS, STRANGER_SHIRTS, COVER, HAIR_STOPS, skinHex, hairHex, rng, lstar,
    FEATURE_KEYS, NEUTRAL, GRAY_MAX, AGES, TEXTURES, LENGTHS, FACIAL, GLASSES, COVERINGS, stylesFor, vecString };
})();
