/* main.js: builds the jsPsych timeline and runs the experiment.
 * Order: intro → name → relationship → IOS → contact → duration → avatar designer → audio check → filler 1 ("get ready" countdown) →
 *        familiarization (12 scenes) → filler 2 (arithmetic) → tests (3 blocks) → end.
 * start(opts): opts = { base, mode: 'qualtrics'|'local', params: {...}, finish: function } */
SRL.main = (function () {
  const U = SRL.util, UI = SRL.ui;

  // One generic jsPsych plugin: each step is an async function (display_element) => data.
  const SrlStep = (function (jspsych) {
    const info = {
      name: 'srl-step', version: '1.0.0',
      parameters: { stage: { type: jspsych.ParameterType.STRING, default: '' }, run: { type: jspsych.ParameterType.FUNCTION, default: undefined } },
      data: {}
    };
    class Plugin {
      constructor(jsPsych) { this.jsPsych = jsPsych; }
      trial(display_element, trial) {
        const t0 = U.now();
        Promise.resolve().then(() => trial.run(display_element)).then((d) => {
          display_element.innerHTML = '';
          this.jsPsych.finishTrial(Object.assign({ stage: trial.stage, step_ms: Math.round(U.now() - t0) }, d || {}));
        }).catch((err) => {
          console.error(err);
          if (SRL.main._onFatal) SRL.main._onFatal(err, trial.stage);
        });
      }
    }
    Plugin.info = info;
    return Plugin;
  })(window.jsPsychModule);

  function chooseUnfamiliarName(known) {
    const k = known.toLowerCase(), kFirst = k.split(/\s+/)[0];
    const ok = (n) => {
      const c = n.toLowerCase();
      return [k, kFirst].every((x) => U.levenshtein(c, x) > 2 && c.slice(0, 3) !== x.slice(0, 3));
    };
    return SRL_CONFIG.UNFAMILIAR_NAMES.find(ok) || 'Alexis';
  }

  async function start(opts) {
    const C = SRL_CONFIG, params = opts.params || {};
    const debug = params.debug === '1' || params.debug === 'true';
    const S = {
      params, mode: opts.mode, debug, auto: debug && params.auto === '1',
      p: {}, fam: [], tests: [], events: [], filler2Trials: [], saveStatus: {},
      sessionKey: Date.now().toString(36), finished: false
    };
    window.SRL_STATE_FOR_DEBUG = debug ? S : undefined;
    S.timing = Object.assign({}, C.TIMING, debug ? C.DEBUG_TIMING : {});
    // Name text beneath the person in scenes: config default, overridable per participant (name_label=0/1).
    S.showName = params.name_label === '0' ? false : params.name_label === '1' ? true : C.SHOW_NAME_LABEL !== false;
    const tStart = U.now();
    S.p.js_start_epoch_ms = Date.now();

    // Condition from Qualtrics Randomizer (or URL locally). Fallback: random, flagged.
    const cats = Object.keys(C.CATEGORIES);
    S.category = cats.indexOf(params.category) >= 0 ? params.category : null;
    S.list = ['A', 'B'].indexOf(params.list) >= 0 ? params.list : null;
    S.p.assign_fallback = (!S.category || !S.list) ? 1 : 0;
    const seed = (crypto.getRandomValues(new Uint32Array(1))[0] >>> 0) || 1;
    U.seed(seed);
    if (!S.category) S.category = U.pick(cats);
    if (!S.list) S.list = U.pick(['A', 'B']);
    Object.assign(S.p, {
      category: S.category, list: S.list, seed, exp_version: C.VERSION, qualtrics_engine: C.QUALTRICS_ENGINE,
      surprise_test: C.SURPRISE_TEST ? 1 : 0, mouseview_on: C.MOUSEVIEW ? 1 : 0, debug: debug ? 1 : 0,
      name_label_shown: S.showName ? 1 : 0, name_label_source: ['0', '1'].indexOf(params.name_label) >= 0 ? 'override' : 'config',
      browser: U.browserInfo(), screen_w: screen.width, screen_h: screen.height,
      window_w: window.innerWidth, window_h: window.innerHeight, fullscreen_exits: 0, tab_switches: 0,
      reload_pre_fam: 0, reloaded_post_fam: 0, reload_stage: '', js_error: '',
      prolific_pid: params.PROLIFIC_PID || '', study_id: params.STUDY_ID || '', session_id: params.SESSION_ID || ''
    });

    const canvas = UI.mount();
    // Event logging: fullscreen exits and tab switches (counts + timestamps).
    const ev = (type) => S.events.push({ t: Math.round(U.now() - tStart), type });
    const onFs = () => {
      const fs = UI.isFullscreen(); ev(fs ? 'fullscreen_enter' : 'fullscreen_exit');
      if (!fs && S.running) { S.p.fullscreen_exits++; UI.showBanner(true); } else UI.showBanner(false);
    };
    const onVis = () => { ev('visibility_' + document.visibilityState); if (document.visibilityState === 'hidden' && S.running) S.p.tab_switches++; };
    document.addEventListener('fullscreenchange', onFs); document.addEventListener('webkitfullscreenchange', onFs);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('error', (e) => { S.p.js_error = String((e && e.message) || e).slice(0, 200); });

    // Loading screen + preload.
    UI.page(canvas, '<h1>Loading…</h1><p class="srl-lead" id="ld">Preparing the study. This takes a few seconds.</p><div class="srl-timer"><div style="width:0%"></div></div>');
    const ld = canvas.querySelector('.srl-timer > div');
    try {
      await SRL.stimuli.load(opts.base);
      const errs = await SRL.audio.preload(opts.base, SRL.stimuli.clipIds(), (d, n) => (ld.style.width = (100 * d / n) + '%'));
      S.p.audio_load_errors = errs.length;
      if (errs.length) S.p.audio_load_error_list = errs.slice(0, 10).join('; ');
    } catch (e) {
      S.p.js_error = 'load: ' + e.message;
      UI.page(canvas, `<h1>Sorry, the study could not load</h1><p class="srl-lead">Please check your internet connection and reload the page. If this keeps happening, please contact the researchers through Prolific.</p>`);
      return;
    }

    let jsPsych = null;
    const finish = async (reason) => {
      if (S.finished) return; S.finished = true; S.running = false;
      SRL.progress.stage('done'); SRL.progress.guard(false);
      S.p.total_ms = Math.round(U.now() - tStart);
      S.p.js_end_epoch_ms = Date.now();
      S.p.finish_reason = reason || 'complete';
      S.p.fam_fast_advance_count = S.fam.filter((r) => r.view_ms !== null && r.view_ms < S.timing.SPACE_ENABLE_AFTER_LABEL + 300 && !r.timed_out).length;
      S.p.fam_timeout_count = S.fam.filter((r) => r.timed_out).length;
      S.p.audio_simulated_scenes = S.fam.filter((r) => r.audio_simulated).length;
      try {
        if (jsPsych) jsPsych.data.addProperties(Object.fromEntries(window.SRL_FIELDS.participant.map((k) => [k, S.p[k] === undefined ? null : S.p[k]])));
        await SRL.data.finalSave(S, jsPsych || { data: { get: () => ({ csv: () => '' }) } });
      } catch (e) {
        console.error(e);
        S.p.js_error = ('save: ' + e.message).slice(0, 200);
        try { if (S.mode === 'qualtrics') SRL.data.setQualtrics({ js_error: S.p.js_error, reloaded_post_fam: S.p.reloaded_post_fam }); } catch (e2) { /* nothing more we can do */ }
      }
      const pg = UI.page(canvas, S.mode === 'qualtrics'
        ? '<h1>Thank you!</h1><p class="srl-lead">This part is finished. Click <b>Continue</b> to answer a few final questions.</p><div class="srl-actions"><button class="srl-btn" id="go">Continue</button></div>'
        : '<h1>Done (local run)</h1><p class="srl-lead">Data were saved (debug: downloaded / dev server). See the console for the field object.</p><div class="srl-actions"><button class="srl-btn" id="go">Close</button></div>');
      if (S.auto) setTimeout(() => pg.querySelector('#go').click(), 300);
      await UI.onClick(pg.querySelector('#go'));
      UI.exitFullscreen();
      document.removeEventListener('fullscreenchange', onFs); document.removeEventListener('webkitfullscreenchange', onFs);
      document.removeEventListener('visibilitychange', onVis);
      UI.unmount();
      if (opts.finish) opts.finish(S.p);
    };
    SRL.main._onFatal = (err, stage) => { S.p.js_error = ('step ' + stage + ': ' + (err && err.message)).slice(0, 200); finish('error'); };

    // Reload handling.
    const prog = SRL.progress.init(params);
    S.p.reload_pre_fam = prog.reload_pre_fam || 0;
    if (prog.mode === 'post_fam_reload') {
      S.p.reloaded_post_fam = 1; S.p.reload_stage = prog.stage;
      const pg = UI.page(canvas, `<h1>The page was reloaded</h1><p class="srl-lead">It looks like the page was reloaded. This study can't be restarted, but you'll still be paid. Please continue.</p>
        <div class="srl-actions"><button class="srl-btn" id="go">Continue</button></div>`);
      if (S.auto) setTimeout(() => pg.querySelector('#go').click(), 300);
      await UI.onClick(pg.querySelector('#go'));
      S.finished = false;
      await finish('reloaded_post_fam');
      return;
    }

    // Participant design (all randomization uses the recorded seed).
    S.design = SRL.stimuli.design(S.list);
    S.p.test_block_order = S.design.blocks.join('>');
    S.p.word_foil_vowel_relaxed = S.design.word_foil_vowel_relaxed;
    S.p.fam_order = S.design.fam.map((s) => s.id).join('|');
    S.p.incidental_colors = S.design.sets.map((s) => s.id + ':' + s.incidental_color).join('|');
    S.p.aoi_norm = SRL.scene.AOI_NORM;
    if (debug) UI.debug(`DEBUG | category ${S.category} | list ${S.list} | seed ${seed}`);

    S.running = true;
    SRL.progress.guard(true);
    canvas.innerHTML = '';
    jsPsych = initJsPsych({ display_element: canvas, on_finish: () => finish('complete') });

    const sec = (name) => (ms) => (S.p['t_' + name + '_ms'] = (S.p['t_' + name + '_ms'] || 0) + ms);
    const step = (stage, section, fn) => ({
      type: SrlStep, stage,
      run: async (el) => {
        const t0 = U.now();
        const d = await fn(el);
        sec(section)(Math.round(U.now() - t0));
        return d;
      }
    });
    const keep = (d, keys) => { keys.forEach((k) => { if (d[k] !== undefined) S.p[k] = d[k]; }); return d; };
    const F2_KEYS = ['filler2_accuracy', 'filler2_n_attempted', 'filler2_n_timeout', 'filler2_low_engagement'];
    const Sc = SRL.screens;

    const timeline = [
      step('intro', 'intro', async (el) => { UI.debug(''); return keep(await Sc.intro(el, S), ['window_small_prompt', 'window_w', 'window_h']); }),
      step('name', 'setup', async (el) => keep(await Sc.nameEntry(el, S), ['name_length', 'name_flagged_title', 'name_suspect', 'name_attempts', 'name_invalid_attempts'])),
      step('relationship', 'setup', async (el) => keep(await Sc.relationship(el, S), ['relationship_type', 'is_kin'])),
      step('ios', 'setup', async (el) => keep(await Sc.ios(el, S), ['ios'])),
      step('contact_freq', 'setup', async (el) => keep(await Sc.contactFreq(el, S), ['contact_freq'])),
      step('duration', 'setup', async (el) => keep(await Sc.duration(el, S), ['duration'])),
      step('designer', 'designer', async (el) => {
        const d = await SRL.designer.run(el, S);
        S.knownSpec = d.spec;
        const u = SRL.avatarRules.unfamiliar(d.spec, S.p.seed, C);
        S.unfamiliarSpec = u.spec;
        S.unfamiliarName = chooseUnfamiliarName(S.knownName);
        const keys = ['designer_edits', 'designer_resets', 'designer_tabs_visited'].concat(SRL.designer.TABS.map((t) => 't_designer_' + t.id + '_ms'), SRL.designer.TABS.map((t) => 'designer_edits_' + t.id));
        keys.forEach((k) => (S.p[k] = d[k]));
        Object.assign(S.p, {
          known_avatar: SRL.people.vecString(d.spec), unfamiliar_avatar: SRL.people.vecString(u.spec),
          unfam_changes: u.changes.join('|'), unfam_k: u.K, unfam_identity_dist: +u.distance.toFixed(3),
          unfamiliar_name: S.unfamiliarName
        });
        const out = { known_avatar: S.p.known_avatar, unfamiliar_avatar: S.p.unfamiliar_avatar, unfam_changes: S.p.unfam_changes, unfam_k: u.K,
          unfam_identity_dist: S.p.unfam_identity_dist, unfamiliar_name: S.unfamiliarName };
        keys.forEach((k) => (out[k] = d[k]));
        return out;
      }),
      step('likeness', 'designer', async (el) => keep(await SRL.designer.likeness(el, S, S.knownSpec), ['likeness_rating', 'likeness_rt_ms'])),
      step('audio_check', 'audio_check', async (el) => keep(await Sc.audioCheck(el, S), ['audio_check_pass', 'audio_check_attempts'])),
      step('filler1', 'filler1', (el) => SRL.fillers.getReady(el, S, S.timing.FILLER1)),
      step('fam_instructions', 'fam', async (el) => { SRL.progress.stage('fam'); return Sc.famInstructions(el, S); })
    ];
    S.design.fam.forEach((sc, i) => timeline.push(step('fam_scene', 'fam', async (el) => {
      const ctx = { knownSpec: S.knownSpec, unfamiliarSpec: S.unfamiliarSpec, knownName: S.knownName, unfamiliarName: S.unfamiliarName,
        timing: S.timing, debug: S.debug, auto: S.auto, list: S.list, showName: S.showName };
      const r = await SRL.scene.run(el, sc, ctx);
      r.serial_position = i + 1;
      S.fam.push(r);
      return r;
    })));
    timeline.push(step('filler2', 'filler2', async (el) => {
      SRL.progress.stage('post_fam');
      const d = await SRL.fillers.arithmetic(el, S, S.timing.FILLER2, S.timing.FILLER2_DEADLINE);
      S.filler2Trials = d.filler2_trials;
      keep(d, F2_KEYS);
      // Incremental backup after familiarization + filler 2.
      SRL.data.dataPipe(S, 'after_fam', SRL.data.fullJson(S)).then((r) => (S.saveStatus.datapipe_after_fam = r));
      const out = {}; F2_KEYS.forEach((k) => (out[k] = d[k]));
      return out;
    }));
    timeline.push(step('test_intro', 'test', async (el) => {
      SRL.progress.stage('test');
      return Sc.message(el, S, 'Questions about the scenes', '<p class="srl-lead">Now we\'ll ask you some questions about the scenes you saw.</p>');
    }));
    S.design.blocks.forEach((type, bi) => {
      timeline.push(step('test_block_intro', 'test', (el) => SRL.tests.blockIntro(el, S, type, bi)));
      S.design.tests[type].forEach((t) => timeline.push(step('test', 'test', async (el) => {
        const r = await SRL.tests.trial(el, S, t);
        r.block_index = bi + 1;
        S.tests.push(r);
        return r;
      })));
      timeline.push(step('test_block_end', 'test', async () => {
        SRL.data.dataPipe(S, 'after_test_' + type, SRL.data.fullJson(S)).then((r) => (S.saveStatus['datapipe_after_' + type] = r));
        return {};
      }));
    });

    await jsPsych.run(timeline);
  }

  return { start, _onFatal: null };
})();
