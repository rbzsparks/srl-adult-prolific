/* people.js: parametric bust figures in the lab's flat style (viewBox 0 0 100 120).
 * One renderer draws strangers, foils, designer avatars and the unfamiliar person,
 * so drawing quality is identical for everyone shown.
 * Animation is done through PersonRig (gaze, head rotation, mouth, smile, brows, bounce, nod). */
SRL.people = (function () {
  const U = SRL.util;

  const SKIN = { S1: '#F3D5BA', S2: '#E9C7A5', S3: '#D2A47E', S4: '#B98A64', S5: '#8D5E3C', S6: '#5E3B24' };
  const SKIN_ORDER = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
  const HAIR_COLORS = { black: '#1C1A1A', darkbrown: '#3A2A22', brown: '#7A5638', auburn: '#9A4A2A', blonde: '#D6B26E', gray: '#9C9A96', white: '#E4E2DE' };
  const HAIR_BY_AGE = {
    young: ['black', 'darkbrown', 'brown', 'auburn', 'blonde'],
    middle: ['black', 'darkbrown', 'brown', 'auburn', 'blonde', 'gray'],
    older: ['black', 'darkbrown', 'brown', 'blonde', 'gray', 'white']
  };
  const HAIR_STYLES = {
    short: ['crop', 'sidepart', 'buzz', 'curly_short'],
    medium: ['bob', 'swept', 'curly_medium'],
    long: ['long_straight', 'long_wavy', 'bun']
  };
  const STYLE_LENGTH = {};
  Object.keys(HAIR_STYLES).forEach((len) => HAIR_STYLES[len].forEach((s) => (STYLE_LENGTH[s] = len)));
  const DESIGNER_SHIRTS = { teal: '#2A7F8F', warmgray: '#B9B3A8', maroon: '#8E3B46', mustard: '#C9A03A', navy: '#2F3E66', rose: '#D98BA3' };
  const FACIAL = ['none', 'stubble', 'mustache', 'beard'];
  const GLASSES = ['none', 'round', 'square'];
  const AGES = ['young', 'middle', 'older'];

  const ring = (cx, cy, rad, a0, a1, n, r, fill) => {
    let s = '';
    for (let i = 0; i < n; i++) {
      const a = ((a0 + (a1 - a0) * (n === 1 ? 0.5 : i / (n - 1))) * Math.PI) / 180;
      s += `<circle cx="${(cx + rad * Math.cos(a)).toFixed(2)}" cy="${(cy + rad * Math.sin(a)).toFixed(2)}" r="${r}" fill="${fill}"/>`;
    }
    return s;
  };

  // Each style: back(c) drawn behind the shoulders; behindHead(c) inside head group, behind head; front(c) over head.
  const STYLE_DEF = {
    crop: { front: (c) => `<path d="M27 44 C26 24 38 18 51 18 C66 18 75 27 73 44 C68 34 58 31 48 32 C39 33 31 37 27 44 Z" fill="${c}"/>` },
    sidepart: { front: (c) => `<path d="M27.5 45 C25 25 37 18 50 18 C64 18 75 25 72.5 45 C71 37 69 33 66 31 C58 34 46 33 38 29 C33 33 29 38 27.5 45 Z" fill="${c}"/>` },
    buzz: { front: (c) => `<path d="M28.6 40 C29.5 26 39 21.5 50 21.5 C61 21.5 70.5 26 71.4 40 C66 33 58 30.5 50 30.5 C42 30.5 34 33 28.6 40 Z" fill="${c}"/>` },
    curly_short: {
      front: (c) => `<path d="M29 42 C29 26 39 21 50 21 C61 21 71 26 71 42 C66 34 58 31 50 31 C42 31 34 34 29 42 Z" fill="${c}"/>` + ring(50, 41, 20.5, 192, 348, 9, 5.2, c)
    },
    bob: {
      back: (c) => `<path d="M26 44 C24 22 38 16 50 16 C62 16 76 22 74 44 L75 63 Q74 68 68 67 L66 50 L34 50 L32 67 Q26 68 25 63 Z" fill="${c}"/>`,
      front: (c) => `<path d="M28 42 C28 24 39 19 50 19 C61 19 72 24 72 42 C70 38 68 36 66 35 L34 35 C32 36 30 38 28 42 Z" fill="${c}"/>`
    },
    swept: {
      back: (c) => `<path d="M26 46 C24 22 38 16 50 16 C62 16 76 22 74 46 L74 62 Q71 66 67 63 L66 50 L34 50 L33 63 Q29 66 26 62 Z" fill="${c}"/>`,
      front: (c) => `<path d="M27 46 C25 24 38 18 51 18 C66 18 76 26 73 46 C70 38 65 33 58 31 C50 36 38 37 30 40 C29 42 28 44 27 46 Z" fill="${c}"/>`
    },
    curly_medium: {
      back: (c) => ring(50, 45, 23.5, 140, 400, 15, 7, c),
      front: (c) => `<path d="M29 42 C29 26 39 21 50 21 C61 21 71 26 71 42 C66 34 58 31 50 31 C42 31 34 34 29 42 Z" fill="${c}"/>` + ring(50, 40, 19.5, 200, 340, 7, 5.4, c)
    },
    long_straight: {
      back: (c) => `<path d="M25 46 C23 22 38 16 50 16 C63 16 78 22 75 46 L77 86 L63 86 L64 50 L36 50 L37 86 L23 86 Z" fill="${c}"/>`,
      front: (c) => `<path d="M28 40 C30 24 40 20 50 20 C62 20 71 25 72 40 C64 33 56 31 50 31 C42 31 34 34 28 40 Z" fill="${c}"/>`
    },
    long_wavy: {
      back: (c) => `<path d="M25 46 C23 22 38 16 50 16 C63 16 78 22 75 46 C79 56 73 64 78 74 C80 80 76 86 72 86 L63 86 L64 50 L36 50 L37 86 L28 86 C24 86 20 80 22 74 C27 64 21 56 25 46 Z" fill="${c}"/>`,
      front: (c) => `<path d="M28 42 C29 24 39 19 50 19 C61 19 71 24 72 42 C68 33 58 28 51 27 C44 28 33 33 28 42 Z" fill="${c}"/>`
    },
    bun: {
      behindHead: (c) => `<circle cx="50" cy="16.5" r="8.5" fill="${c}"/>`,
      front: (c) => `<path d="M28 41 C29 24 39 19 50 19 C61 19 71 24 72 41 C66 32 58 29 50 29 C42 29 34 32 28 41 Z" fill="${c}"/>`
    }
  };

  function resolve(spec) {
    // Accepts palette keys (skin 'S3', hairColor 'gray', shirt key) or raw hex values.
    const skin = SKIN[spec.skin] || spec.skinHex || spec.skin;
    const hair = HAIR_COLORS[spec.hairColor] || spec.hairColor;
    const shirt = DESIGNER_SHIRTS[spec.shirt] || spec.shirt;
    return { skin, hair, shirt };
  }

  function mouthPath(dx, open, smile) {
    const s = U.clamp(smile, 0, 1);
    if (open < 0.08) {
      const cy = 56 - 0.8 * s, ctrl = 60 + 2.2 * s;
      return { d: `M${45 + dx - s} ${cy} Q${50 + dx} ${ctrl} ${55 + dx + s} ${cy}`, filled: false };
    }
    const o = U.clamp(open, 0, 1);
    const l = 45.8 + dx, r = 54.2 + dx, top = 55.6 - 0.6 * s;
    return { d: `M${l} ${top} Q${50 + dx} ${top - 0.6} ${r} ${top} Q${50 + dx} ${top + 3 + 6 * o} ${l} ${top} Z`, filled: true };
  }

  /* opts: { facing: 0 (front) | 1 (faces right) | -1 (faces left), state: {...} } */
  function svg(spec, opts) {
    opts = opts || {};
    const facing = opts.facing || 0;
    const dx = 3 * facing;
    const { skin, hair, shirt } = resolve(spec);
    const style = STYLE_DEF[spec.hairStyle] || STYLE_DEF.crop;
    const hairStroke = U.mixHex(hair, '#000000', 0.25);
    const browColor = U.mixHex(hair, '#3A2A22', 0.45);
    const lineColor = U.mixHex(skin, '#000000', 0.32);
    const st = Object.assign({ gazeX: 0, gazeY: 0, mouth: 0, smile: 0, brow: 0 }, opts.state || {});
    const ex = dx + st.gazeX, ey = st.gazeY;
    const m = mouthPath(dx, st.mouth, st.smile);
    const hs = (s) => `<g stroke="${hairStroke}" stroke-width="0.6">${s}</g>`;

    let face = '';
    if (spec.age === 'middle') {
      face += `<path d="M${40.5 + dx} 51 Q${43 + dx} 52 ${45.5 + dx} 51 M${54.5 + dx} 51 Q${57 + dx} 52 ${59.5 + dx} 51" fill="none" stroke="${lineColor}" stroke-width="0.8" opacity="0.35" stroke-linecap="round"/>`;
    } else if (spec.age === 'older') {
      face += `<path d="M${36.6 + dx} 45.6 l-2.6 -1.2 M${36.6 + dx} 47.6 l-2.8 0.5 M${63.4 + dx} 45.6 l2.6 -1.2 M${63.4 + dx} 47.6 l2.8 0.5 M${40.5 + dx} 51.2 Q${43 + dx} 52.4 ${45.5 + dx} 51.2 M${54.5 + dx} 51.2 Q${57 + dx} 52.4 ${59.5 + dx} 51.2 M${44 + dx} 53 Q${42.4 + dx} 56 ${44.2 + dx} 58.8 M${56 + dx} 53 Q${57.6 + dx} 56 ${55.8 + dx} 58.8" fill="none" stroke="${lineColor}" stroke-width="0.9" opacity="0.6" stroke-linecap="round"/>`;
    }
    const must = `<path d="M${43.5 + dx} 54.6 Q${47 + dx} 52.3 ${50 + dx} 53.6 Q${53 + dx} 52.3 ${56.5 + dx} 54.6 Q${55 + dx} 56.4 ${50 + dx} 55.4 Q${45 + dx} 56.4 ${43.5 + dx} 54.6 Z" fill="${hair}"/>`;
    if (spec.facial === 'stubble') face += `<path d="M30 50 Q31 63 ${50 + dx} 66.5 Q69 63 70 50 Q66 58 ${60 + dx} 59.5 Q${50 + dx} 57 ${40 + dx} 59.5 Q34 58 30 50 Z" fill="${hair}" opacity="0.35"/>`;
    if (spec.facial === 'mustache') face += must;
    if (spec.facial === 'beard') face += `<path d="M28.5 46 Q28 66 ${50 + dx} 69.5 Q72 66 71.5 46 Q69 55 ${63 + dx} 58.5 Q${58 + dx} 61 ${56 + dx} 59.5 Q${50 + dx} 63.5 ${44 + dx} 59.5 Q${42 + dx} 61 ${37 + dx} 58.5 Q31 55 28.5 46 Z" fill="${hair}"/>` + must;

    const brows = `<g class="p-brows" transform="translate(0 ${-1.6 * st.brow})"><path d="M${39.6 + dx} 41.6 Q${43 + dx} 40.2 ${46.4 + dx} 41.6 M${53.6 + dx} 41.6 Q${57 + dx} 40.2 ${60.4 + dx} 41.6" fill="none" stroke="${browColor}" stroke-width="1.4" stroke-linecap="round"/></g>`;
    const eyes = `<circle class="p-eye-l" cx="${43 + ex}" cy="${47 + ey}" r="2.6" fill="#2A2420"/><circle class="p-eye-r" cx="${57 + ex}" cy="${47 + ey}" r="2.6" fill="#2A2420"/>`;
    const mouth = `<path class="p-mouth" d="${m.d}" fill="${m.filled ? '#7A3B34' : 'none'}" stroke="#6B4A3A" stroke-width="${m.filled ? 1 : 1.8}" stroke-linecap="round" stroke-linejoin="round"/>`;
    let glasses = '';
    if (spec.glasses === 'round') glasses = `<g fill="#FFFFFF" fill-opacity="0.18" stroke="#2F2F33" stroke-width="1.3"><circle cx="${43 + dx}" cy="47" r="5.2"/><circle cx="${57 + dx}" cy="47" r="5.2"/><path d="M${48.2 + dx} 47 Q${50 + dx} 45.6 ${51.8 + dx} 47 M${37.8 + dx} 46 L29 45 M${62.2 + dx} 46 L71 45" fill="none"/></g>`;
    if (spec.glasses === 'square') glasses = `<g fill="#FFFFFF" fill-opacity="0.18" stroke="#2F2F33" stroke-width="1.3"><rect x="${37.6 + dx}" y="42.7" width="10.8" height="8.6" rx="2"/><rect x="${51.6 + dx}" y="42.7" width="10.8" height="8.6" rx="2"/><path d="M${48.4 + dx} 46.5 Q${50 + dx} 45.3 ${51.6 + dx} 46.5 M${37.6 + dx} 46 L29 45 M${62.4 + dx} 46 L71 45" fill="none"/></g>`;

    const back = style.back ? hs(style.back(hair)) : '';
    const behind = style.behindHead ? hs(style.behindHead(hair)) : '';
    const front = hs(style.front(hair));
    const cls = opts.cls ? ` class="${opts.cls}"` : '';
    const attrs = opts.attrs || '';
    return `<svg${cls} viewBox="${opts.viewBox || '0 0 100 120'}" overflow="visible" xmlns="http://www.w3.org/2000/svg" ${attrs}>` +
      `<g class="p-root">${back}` +
      `<path d="M8 120 C8 90 26 78 50 78 C74 78 92 90 92 120 Z" fill="${shirt}"/>` +
      `<rect x="43" y="60" width="14" height="20" rx="4" fill="${skin}"/>` +
      `<g class="p-head">${behind}<circle cx="50" cy="44" r="22" fill="${skin}"/>${front}` +
      `<g class="p-face">${face}${brows}${eyes}${mouth}${glasses}</g></g></g></svg>`;
  }

  /* Live, animatable figure. el = the <svg> element produced by svg(). */
  class PersonRig {
    constructor(el, spec, facing) {
      this.el = el; this.spec = spec; this.facing = facing || 0;
      this.dx = 3 * this.facing;
      this.root = el.querySelector('.p-root');
      this.head = el.querySelector('.p-head');
      this.eyeL = el.querySelector('.p-eye-l');
      this.eyeR = el.querySelector('.p-eye-r');
      this.mouthEl = el.querySelector('.p-mouth');
      this.brows = el.querySelector('.p-brows');
      this.s = { gazeX: 0, gazeY: 0, headRot: 0, mouth: 0, smile: 0, brow: 0, bounce: 0, nod: 0 };
      this.render();
    }
    set(p) { Object.assign(this.s, p); this.render(); }
    render() {
      const s = this.s, dx = this.dx;
      this.root.setAttribute('transform', `translate(0 ${-s.bounce})`);
      this.head.setAttribute('transform', `translate(0 ${s.nod}) rotate(${s.headRot} 50 64)`);
      this.eyeL.setAttribute('cx', 43 + dx + s.gazeX); this.eyeL.setAttribute('cy', 47 + s.gazeY);
      this.eyeR.setAttribute('cx', 57 + dx + s.gazeX); this.eyeR.setAttribute('cy', 47 + s.gazeY);
      const m = mouthPath(dx, s.mouth, s.smile);
      this.mouthEl.setAttribute('d', m.d);
      this.mouthEl.setAttribute('fill', m.filled ? '#7A3B34' : 'none');
      this.mouthEl.setAttribute('stroke-width', m.filled ? 1 : 1.8);
      this.brows.setAttribute('transform', `translate(0 ${-1.6 * s.brow})`);
    }
    // Tween a subset of numeric state to targets.
    to(target, ms, ease) {
      const from = {}; Object.keys(target).forEach((k) => (from[k] = this.s[k]));
      return U.tween(ms, (t) => {
        const p = {}; Object.keys(target).forEach((k) => (p[k] = U.lerp(from[k], target[k], t)));
        this.set(p);
      }, ease);
    }
  }

  // Feature-vector string for data files.
  function featureString(spec) {
    return ['age=' + spec.age, 'skin=' + spec.skin, 'hairLen=' + STYLE_LENGTH[spec.hairStyle], 'hairStyle=' + spec.hairStyle,
      'hairColor=' + spec.hairColor, 'facial=' + spec.facial, 'glasses=' + spec.glasses, 'shirt=' + spec.shirt].join(';');
  }

  // Foil = stranger with overrides; skin nudged slightly toward the neighbouring tone.
  function foilSpec(stranger, foil) {
    const idx = SKIN_ORDER.indexOf(stranger.skin);
    const neighbour = SKIN[SKIN_ORDER[idx === SKIN_ORDER.length - 1 ? idx - 1 : idx + 1]];
    const skinHex = U.mixHex(SKIN[stranger.skin], neighbour, foil.skinNudge || 0);
    return Object.assign({}, stranger, { id: foil.id, hairStyle: foil.hairStyle, hairColor: foil.hairColor, skin: skinHex });
  }

  /* Unfamiliar avatar: copies age, skin, hair-length category and facial hair (presence and type);
   * differs on exactly k of {hairColor, hairStyle, glasses, shirt}. Shirt stays in the designer palette
   * (disjoint from all stranger shirts). */
  function makeUnfamiliar(known, k) {
    const free = ['hairColor', 'hairStyle', 'glasses', 'shirt'];
    const diff = U.sample(free, k).sort((a, b) => free.indexOf(a) - free.indexOf(b));
    const u = Object.assign({}, known);
    diff.forEach((f) => {
      if (f === 'hairColor') u.hairColor = U.pick(HAIR_BY_AGE[known.age].filter((c) => c !== known.hairColor));
      if (f === 'hairStyle') u.hairStyle = U.pick(HAIR_STYLES[STYLE_LENGTH[known.hairStyle]].filter((s) => s !== known.hairStyle));
      if (f === 'glasses') u.glasses = known.glasses === 'none' ? U.pick(['round', 'square']) : 'none';
      if (f === 'shirt') u.shirt = U.pick(Object.keys(DESIGNER_SHIRTS).filter((s) => s !== known.shirt));
    });
    return { spec: u, diff };
  }

  return { SKIN, SKIN_ORDER, HAIR_COLORS, HAIR_BY_AGE, HAIR_STYLES, STYLE_LENGTH, DESIGNER_SHIRTS, FACIAL, GLASSES, AGES,
    svg, PersonRig, featureString, foilSpec, makeUnfamiliar };
})();
