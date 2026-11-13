/* fillers.js
 * Filler 1: 3×3 sliding-tile puzzle, fixed duration (ends at time limit, solved or not; a new puzzle appears if solved early).
 * Filler 2: arithmetic verification ("7 + 5 = 13?"), fixed duration; accuracy is the engagement check. */
SRL.fillers = (function () {
  const U = SRL.util, UI = SRL.ui;

  function timerBar(el, ms) {
    const bar = el.querySelector('.srl-timer > div');
    const t0 = U.now();
    let stop = false;
    const loop = () => {
      if (stop) return;
      bar.style.width = (100 * U.clamp(1 - (U.now() - t0) / ms, 0, 1)) + '%';
      U.frame(loop);
    };
    U.frame(loop);
    return () => (stop = true);
  }

  function scramble() {
    let b = [1, 2, 3, 4, 5, 6, 7, 8, 0], prev = -1;
    const nb = (i) => [i - 3, i + 3, i % 3 ? i - 1 : -1, i % 3 < 2 ? i + 1 : -1].filter((j) => j >= 0 && j < 9);
    for (let k = 0; k < 60; k++) {
      const z = b.indexOf(0);
      const opts = nb(z).filter((j) => j !== prev);
      const j = U.pick(opts);
      [b[z], b[j]] = [b[j], b[z]]; prev = z;
    }
    if (b.join() === '1,2,3,4,5,6,7,8,0') return scramble();
    return b;
  }

  async function puzzle(el, S, ms) {
    await SRL.screens.message(el, S, 'A short puzzle',
      `<p class="srl-lead">Here's a short break from the main task: a sliding puzzle.</p>
       <p>Click a tile next to the empty space to slide it. Try to put the tiles in order from 1 to 8, with the empty space at the bottom right.</p>
       <p>The puzzle ends automatically after ${Math.round(ms / 1000)} seconds, whether or not it's solved.</p>`, 'Start the puzzle');
    const pg = UI.page(el, `<h1>Sliding puzzle</h1><div class="srl-timer"><div></div></div>
      <div class="pz-wrap"><div class="pz-board"></div><div class="pz-goal"><p class="srl-note">Goal</p><div class="pz-mini"></div></div></div>
      <p class="pz-msg srl-note">&nbsp;</p>`);
    pg.querySelector('.pz-mini').innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 0].map((n) => `<div class="pz-m${n ? '' : ' e'}">${n || ''}</div>`).join('');
    const board = pg.querySelector('.pz-board'), msg = pg.querySelector('.pz-msg');
    const stopBar = timerBar(pg, ms);
    const t0 = U.now();
    let b = scramble(), puzzles = 1, solvedCount = 0, firstSolved = 0, firstMoves = 0, firstTime = null, moves = 0, totalMoves = 0;
    let locked = false;
    const draw = () => {
      board.innerHTML = b.map((n, i) => `<button type="button" class="pz-t${n ? '' : ' e'}" data-i="${i}">${n || ''}</button>`).join('');
      board.querySelectorAll('.pz-t').forEach((t) => (t.onclick = () => move(+t.dataset.i)));
    };
    const move = (i) => {
      if (locked) return;
      const z = b.indexOf(0);
      const adj = (Math.abs(i - z) === 3) || (Math.abs(i - z) === 1 && Math.floor(i / 3) === Math.floor(z / 3));
      if (!adj) return;
      [b[z], b[i]] = [b[i], b[z]]; moves++; totalMoves++;
      draw();
      if (b.join() === '1,2,3,4,5,6,7,8,0') {
        solvedCount++;
        if (puzzles === 1) { firstSolved = 1; firstMoves = moves; firstTime = Math.round(U.now() - t0); }
        locked = true; msg.textContent = 'Solved! Here is another one.';
        setTimeout(() => { b = scramble(); puzzles++; moves = 0; locked = false; msg.innerHTML = '&nbsp;'; draw(); }, 1200);
      }
    };
    draw();
    let autoTimer = null;
    if (S.auto) autoTimer = setInterval(() => { const z = b.indexOf(0); const n = [z - 3, z + 3, z - 1, z + 1].filter((j) => j >= 0 && j < 9); move(U.pick(n)); }, 250);
    await U.sleep(ms);
    if (autoTimer) clearInterval(autoTimer);
    stopBar(); locked = true;
    msg.textContent = "Time's up!";
    await U.sleep(1200);
    return { filler1_solved: firstSolved, filler1_moves: puzzles === 1 ? moves : firstMoves, filler1_time_to_solve_ms: firstTime,
      filler1_n_solved: solvedCount, filler1_total_moves: totalMoves, filler1_ms: Math.round(U.now() - t0) };
  }

  function problem() {
    let a, b, op, ans;
    if (U.random() < 0.5) { a = 2 + U.randInt(8); b = 2 + U.randInt(8); }
    else { a = 11 + U.randInt(19); b = 2 + U.randInt(8); }
    op = U.random() < 0.6 ? '+' : '−';
    if (op === '−' && b > a) [a, b] = [b, a];
    ans = op === '+' ? a + b : a - b;
    const truth = U.random() < 0.5;
    let shown = ans;
    if (!truth) { const d = U.pick([-2, -1, 1, 2, 10, -10]); shown = ans + d; if (shown < 0) shown = ans + Math.abs(d); }
    return { a, b, op, ans, shown, truth: truth ? 1 : 0 };
  }

  async function arithmetic(el, S, ms) {
    await SRL.screens.message(el, S, 'A short arithmetic task',
      `<p class="srl-lead">Now a short arithmetic task.</p>
       <p>You'll see equations like <b>7 + 5 = 13</b>. Press <b>Y</b> if the equation is correct, or <b>N</b> if it is wrong. (You can also click the buttons.)</p>
       <p>Answer as quickly and accurately as you can. The task ends automatically after ${Math.round(ms / 1000)} seconds.</p>`, 'Start');
    const pg = UI.page(el, `<h1>Is it correct?</h1><div class="srl-timer"><div></div></div>
      <div class="ar-eq"></div>
      <div class="srl-actions srl-center"><button class="srl-btn" id="y">Y: correct</button> <button class="srl-btn" id="n">N: wrong</button></div>`);
    const eq = pg.querySelector('.ar-eq');
    const stopBar = timerBar(pg, ms);
    const tEnd = U.now() + ms;
    const trials = [];
    while (U.now() < tEnd) {
      const p = problem();
      eq.textContent = `${p.a} ${p.op} ${p.b} = ${p.shown}`;
      const t0 = U.now();
      const resp = await new Promise((resolve) => {
        let done = false;
        const fin = (r) => { if (done) return; done = true; cleanup(); resolve(r); };
        const key = (e) => { const k = e.key.toLowerCase(); if (k === 'y' || k === 'n') { e.preventDefault(); fin(k); } };
        const cy = () => fin('y'), cn = () => fin('n');
        const timer = setTimeout(() => fin(null), Math.max(0, tEnd - U.now()));
        const cleanup = () => { window.removeEventListener('keydown', key, true); pg.querySelector('#y').removeEventListener('click', cy); pg.querySelector('#n').removeEventListener('click', cn); clearTimeout(timer); };
        window.addEventListener('keydown', key, true);
        pg.querySelector('#y').addEventListener('click', cy); pg.querySelector('#n').addEventListener('click', cn);
        if (S.auto) setTimeout(() => fin(U.random() < 0.85 ? (p.truth ? 'y' : 'n') : (p.truth ? 'n' : 'y')), 250);
      });
      if (resp === null) break; // time ran out mid-item: not scored
      trials.push({ eq: `${p.a}${p.op}${p.b}=${p.shown}`, truth: p.truth, resp, correct: (resp === 'y') === !!p.truth ? 1 : 0, rt_ms: Math.round(U.now() - t0) });
      eq.textContent = '';
      await U.sleep(200);
    }
    stopBar();
    const n = trials.length, acc = n ? trials.reduce((s, t) => s + t.correct, 0) / n : null;
    return { filler2_accuracy: acc === null ? null : +acc.toFixed(3), filler2_n: n, filler2_trials: trials };
  }

  return { puzzle, arithmetic };
})();
