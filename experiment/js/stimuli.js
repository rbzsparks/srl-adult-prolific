/* stimuli.js: loads stimuli.json and builds every participant-level assignment:
 * list → condition per scene set, incidental colors, familiarization order, test trials. */
SRL.stimuli = (function () {
  const U = SRL.util;
  let DATA = null;

  async function load(base) {
    const res = await fetch(base + SRL_CONFIG.STIMULI_JSON, { cache: 'no-cache' });
    if (!res.ok) throw new Error('Could not load stimuli.json (' + res.status + ')');
    DATA = await res.json();
    return DATA;
  }
  const data = () => DATA;

  function clipIds() {
    const ids = [];
    DATA.scene_sets.forEach((s) => ids.push('greet_' + s.id, 'label_' + s.id, 'test_word_' + s.word, 'test_incid_' + s.incidental));
    ids.push('test_face');
    SRL_CONFIG.AUDIO_CHECK_WORDS.forEach((w) => ids.push('check_' + w));
    return ids;
  }

  // Pseudorandom order: no more than 2 consecutive scenes of the same condition.
  function famOrder(sets) {
    for (let attempt = 0; attempt < 5000; attempt++) {
      const o = U.shuffle(sets);
      let ok = true;
      for (let i = 2; i < o.length; i++) {
        if (o[i].condition === o[i - 1].condition && o[i].condition === o[i - 2].condition) { ok = false; break; }
      }
      if (ok) return o;
    }
    throw new Error('Could not build familiarization order');
  }

  /* Word-test foils. For each target: 3 foils from the other 11 scene sets, with at least one foil from each
   * condition (hard rule). Soft rule: all 4 options have different first vowels. Also aims for every object
   * appearing as a foil exactly 3 times. Random-restart search; relaxes the vowel rule only if needed. */
  function wordFoils(sets) {
    const vowel = (s) => DATA.words[s.word].first_vowel;
    const combos = (arr, k) => {
      const out = [];
      const rec = (start, cur) => {
        if (cur.length === k) { out.push(cur.slice()); return; }
        for (let i = start; i < arr.length; i++) { cur.push(arr[i]); rec(i + 1, cur); cur.pop(); }
      };
      rec(0, []);
      return out;
    };
    const candidates = {};
    sets.forEach((t) => {
      const others = sets.filter((s) => s.id !== t.id);
      candidates[t.id] = combos(others, 3).filter((c) => c.some((s) => s.condition === 'known') && c.some((s) => s.condition === 'unfamiliar'))
        .map((c) => ({ foils: c, vowelOk: new Set([vowel(t)].concat(c.map(vowel))).size === 4 }));
    });
    let best = null;
    for (let attempt = 0; attempt < 400; attempt++) {
      const use = {}; sets.forEach((s) => (use[s.id] = 0));
      const result = {}; let relaxed = 0; let fail = false;
      for (const t of U.shuffle(sets)) {
        let pool = candidates[t.id].filter((c) => c.vowelOk && c.foils.every((f) => use[f.id] < 3));
        let rel = false;
        if (!pool.length) { pool = candidates[t.id].filter((c) => c.foils.every((f) => use[f.id] < 3)); rel = true; }
        if (!pool.length) { fail = true; break; }
        const c = U.pick(pool);
        c.foils.forEach((f) => use[f.id]++);
        result[t.id] = { foils: c.foils.map((f) => f.id), vowel_rule_met: !rel };
        if (rel) relaxed++;
      }
      if (fail) continue;
      if (!best || relaxed < best.relaxed) best = { result, relaxed };
      if (relaxed === 0) break;
    }
    if (!best) {
      // Fallback: ignore the usage balance.
      const result = {};
      sets.forEach((t) => { const c = U.pick(candidates[t.id]); result[t.id] = { foils: c.foils.map((f) => f.id), vowel_rule_met: c.vowelOk }; });
      best = { result, relaxed: Object.values(result).filter((r) => !r.vowel_rule_met).length, unbalanced: true };
    }
    return best;
  }

  function testBlockOrder() {
    if (SRL_CONFIG.TEST_BLOCK_ORDER_MODE === 'counterbalanced') return U.shuffle(['word', 'face', 'incid']);
    return SRL_CONFIG.TEST_BLOCK_ORDER_FIXED.slice();
  }

  /* Build the full design for one participant. list = 'A' | 'B'. */
  function design(list) {
    const colors = Object.keys(DATA.incidental_colors);
    const sets = DATA.scene_sets.map((s) => {
      const known = (list === 'A') === (s.half === 1);
      return {
        id: s.id, half: s.half, word: s.word, object_id: s.object_id, incidental: s.incidental,
        incidental_label: DATA.incidental_types[s.incidental],
        incidental_color: U.pick(colors),
        stranger: s.stranger, foil: SRL.people.foilSpec(s.stranger, s.foil),
        condition: known ? 'known' : 'unfamiliar'
      };
    });
    const byId = {}; sets.forEach((s) => (byId[s.id] = s));
    const fam = famOrder(sets);
    const wf = wordFoils(sets);
    const blocks = testBlockOrder();
    const tests = {};
    blocks.forEach((type) => {
      tests[type] = U.shuffle(sets).map((s) => {
        if (type === 'word') {
          const options = U.shuffle([s.id].concat(wf.result[s.id].foils));
          return { type, set: s, options: options.map((id) => ({ id: byId[id].object_id, set_id: id, condition: byId[id].condition })),
            foils: wf.result[s.id].foils, vowel_rule_met: wf.result[s.id].vowel_rule_met };
        }
        if (type === 'face') {
          const opts = U.shuffle([{ id: s.stranger.id, target: true }, { id: s.foil.id, target: false }]);
          return { type, set: s, options: opts };
        }
        const opts = U.shuffle(colors).map((c) => ({ id: c, target: c === s.incidental_color }));
        return { type, set: s, options: opts };
      });
    });
    return { sets, byId, fam, tests, blocks, word_foil_vowel_relaxed: wf.relaxed, word_foil_unbalanced: !!wf.unbalanced };
  }

  return { load, data, clipIds, design };
})();
