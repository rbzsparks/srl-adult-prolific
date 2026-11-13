/* designer.js: "Make an avatar that looks like [name]."
 * Features: apparent age, skin tone, hair length, hair style (within length), hair color (age-appropriate),
 * facial hair, glasses, shirt color. ≤ 6 options per feature. */
SRL.designer = (function () {
  const U = SRL.util, P = SRL.people;
  const esc = U.escapeHtml;
  const AGE_LABEL = { young: 'Young adult', middle: 'Middle-aged', older: 'Older adult' };
  const LEN_LABEL = { short: 'Short', medium: 'Medium', long: 'Long' };
  const FACIAL_LABEL = { none: 'None', stubble: 'Stubble', mustache: 'Mustache', beard: 'Beard' };
  const GLASSES_LABEL = { none: 'None', round: 'Round', square: 'Square' };

  async function run(el, S) {
    const spec = { age: 'middle', skin: 'S3', hairStyle: 'crop', hairColor: 'brown', facial: 'none', glasses: 'none', shirt: 'teal' };
    let changes = 0;
    const t0 = U.now();
    el.innerHTML = `<div class="srl-page srl-designer">
      <h1>Make an avatar that looks like ${esc(S.knownName)}</h1>
      <div class="dz-wrap">
        <div class="dz-preview"></div>
        <div class="dz-controls"></div>
      </div>
      <div class="srl-actions"><span class="srl-note">Choose the options that best match ${esc(S.knownName)}. You can change anything before continuing.</span>
        <button class="srl-btn" id="go">Done</button></div></div>`;
    const preview = el.querySelector('.dz-preview'), controls = el.querySelector('.dz-controls');

    const swatch = (hex, sel, data) => `<button type="button" class="dz-sw${sel ? ' sel' : ''}" style="background:${hex}" ${data} aria-label="color"></button>`;
    const textBtn = (label, sel, data) => `<button type="button" class="dz-tb${sel ? ' sel' : ''}" ${data}>${label}</button>`;
    const len = () => P.STYLE_LENGTH[spec.hairStyle];

    function render() {
      preview.innerHTML = P.svg(spec, { attrs: 'width="300" height="360"' });
      const hairStyles = P.HAIR_STYLES[len()].map((st) => {
        const thumb = P.svg(Object.assign({}, spec, { hairStyle: st }), { viewBox: '14 4 72 72', attrs: 'width="52" height="52"' });
        return `<button type="button" class="dz-th${st === spec.hairStyle ? ' sel' : ''}" data-f="hairStyle" data-v="${st}">${thumb}</button>`;
      }).join('');
      controls.innerHTML = `
        <div class="dz-row"><span class="dz-lab">Age</span>${P.AGES.map((a) => textBtn(AGE_LABEL[a], a === spec.age, `data-f="age" data-v="${a}"`)).join('')}</div>
        <div class="dz-row"><span class="dz-lab">Skin</span>${P.SKIN_ORDER.map((k) => swatch(P.SKIN[k], k === spec.skin, `data-f="skin" data-v="${k}"`)).join('')}</div>
        <div class="dz-row"><span class="dz-lab">Hair length</span>${Object.keys(P.HAIR_STYLES).map((l) => textBtn(LEN_LABEL[l], l === len(), `data-f="hairLen" data-v="${l}"`)).join('')}</div>
        <div class="dz-row dz-row-tall"><span class="dz-lab">Hair style</span>${hairStyles}</div>
        <div class="dz-row"><span class="dz-lab">Hair color</span>${P.HAIR_BY_AGE[spec.age].map((c) => swatch(P.HAIR_COLORS[c], c === spec.hairColor, `data-f="hairColor" data-v="${c}"`)).join('')}</div>
        <div class="dz-row"><span class="dz-lab">Facial hair</span>${P.FACIAL.map((f) => textBtn(FACIAL_LABEL[f], f === spec.facial, `data-f="facial" data-v="${f}"`)).join('')}</div>
        <div class="dz-row"><span class="dz-lab">Glasses</span>${P.GLASSES.map((g) => textBtn(GLASSES_LABEL[g], g === spec.glasses, `data-f="glasses" data-v="${g}"`)).join('')}</div>
        <div class="dz-row"><span class="dz-lab">Shirt</span>${Object.keys(P.DESIGNER_SHIRTS).map((k) => swatch(P.DESIGNER_SHIRTS[k], k === spec.shirt, `data-f="shirt" data-v="${k}"`)).join('')}</div>`;
      controls.querySelectorAll('[data-f]').forEach((b) => (b.onclick = () => set(b.dataset.f, b.dataset.v)));
    }
    function set(f, v) {
      changes++;
      if (f === 'hairLen') { if (v !== len()) spec.hairStyle = P.HAIR_STYLES[v][0]; }
      else spec[f] = v;
      if (f === 'age' && P.HAIR_BY_AGE[v].indexOf(spec.hairColor) < 0) spec.hairColor = P.HAIR_BY_AGE[v][0];
      render();
    }
    render();

    const go = el.querySelector('#go');
    if (S.auto) setTimeout(() => { set('age', 'young'); set('skin', 'S2'); set('hairLen', 'long'); set('hairColor', 'darkbrown'); set('glasses', 'round'); go.click(); }, 200);
    await SRL.ui.onClick(go);
    return { spec: Object.assign({}, spec), designer_changes: changes, designer_ms: Math.round(U.now() - t0) };
  }

  return { run };
})();
