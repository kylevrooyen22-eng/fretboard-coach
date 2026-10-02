/* ===== Fretboard Coach app ===== */
(function () {
  const G = GC, S = STAGES;
  const byId = (id) => S.find((s) => s.id === id);

  /* ---------- tiny DOM helper ---------- */
  function el(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'text') e.textContent = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) e.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    return e;
  }
  const fmt = (sec) => { const s = Math.max(0, Math.round(Math.abs(sec))); return (sec < 0 ? '+' : '') + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const todayISO = () => new Date().toISOString().slice(0, 10);

  /* ---------- progress + saving ---------- */
  const DEFAULT = () => ({ v: 1, current: 'notes', labelMode: 'deg', stages: {}, log: [] });
  let P = DEFAULT();
  const sp = (id) => (P.stages[id] = P.stages[id] || { sessions: 0, playLevel: -1, test: null, ruleIdx: 0, quiz: 0 });

  const WEB = window.FC_WEB || null; // set only in the website build (Supabase + Google sign-in)
  let sb = null, sbUser = null;
  const localKey = () => 'fretboard-coach' + (sbUser ? '-' + sbUser.id : '');
  const Store = {
    mode: 'local', ref: null, timer: null, writing: false, pending: false, status: 'Loading progress…',
    async waitClaude(ms) { const t0 = Date.now(); while (!window.claude && Date.now() - t0 < ms) await new Promise((r) => setTimeout(r, 100)); return window.claude || null; },
    async load() {
      let cloud = null;
      if (WEB) {
        sb = window.supabase.createClient(WEB.url, WEB.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' } });
        const { data: { session } } = await sb.auth.getSession();
        if (!session) return { needLogin: true };
        sbUser = session.user;
        // tidy the address bar after the Google redirect
        if (location.hash.includes('access_token') || location.search.includes('code=')) history.replaceState(null, '', location.pathname);
        try {
          const { data, error } = await sb.from('progress').select('data').eq('user_id', sbUser.id).maybeSingle();
          if (error) throw error;
          this.mode = 'web';
          if (data && data.data) cloud = data.data;
        } catch (e) { this.mode = 'local'; }
      } else {
        try {
          const c = await this.waitClaude(2500);
          if (c && c.use) {
            const [db, user] = await Promise.all([c.use('db'), c.use('user')]);
            const id = user ? await user.id() : null;
            if (db && id) {
              this.ref = db.collection('data/users/' + id).doc('progress');
              const snap = await this.ref.get();
              this.mode = 'cloud';
              if (snap.exists) cloud = snap.data();
            }
          }
        } catch (e) { this.mode = 'local'; this.ref = null; }
      }
      let local = null;
      try { const raw = localStorage.getItem(localKey()); local = raw ? JSON.parse(raw) : null; } catch (e) { /* storage blocked */ }
      const data = cloud || local;
      this.status = this.mode === 'web' ? 'Progress saves to your account' : this.mode === 'cloud' ? 'Progress saves to your Claude account' : 'Progress saves in this browser only';
      return data ? { ...DEFAULT(), ...JSON.parse(JSON.stringify(data)) } : DEFAULT();
    },
    save() { clearTimeout(this.timer); this.timer = setTimeout(() => this.flush(), 700); },
    async flush() {
      if (this.writing) { this.pending = true; return; }
      this.writing = true;
      const body = JSON.parse(JSON.stringify(P));
      try { localStorage.setItem(localKey(), JSON.stringify(body)); } catch (e) { /* ignore */ }
      if (this.mode === 'web' && sb && sbUser) {
        const { error } = await sb.from('progress').upsert({ user_id: sbUser.id, data: body, updated_at: new Date().toISOString() });
        this.status = error ? 'Couldn\u2019t reach your account. Saved in this browser for now.' : 'Saved to your account';
      } else if (this.mode === 'cloud' && this.ref) {
        try { await this.ref.set(body); this.status = 'Saved to your Claude account'; }
        catch (e) { this.status = 'Couldn\u2019t reach your account. Saved in this browser for now.'; }
      } else this.status = 'Saved in this browser';
      paintSave();
      this.writing = false;
      if (this.pending) { this.pending = false; this.flush(); }
    },
  };
  const commit = () => { Store.save(); paintRail(); };

  function status(id) {
    const st = byId(id), p = P.stages[id];
    if (!p) return 'new';
    const knowOk = p.test && p.test.passed;
    const playOk = (p.playLevel ?? -1) >= st.test.playLevel;
    if (knowOk && playOk) return 'passed';
    if (p.sessions || p.test || p.playLevel >= 0 || p.quiz) return 'started';
    return 'new';
  }

  /* ---------- audio: metronome + chime ---------- */
  const Metro = {
    ctx: null, bpm: 60, on: false, beat: 0, next: 0, timer: null, onBeat: null, onState: null,
    ensure() { if (!this.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false; this.ctx = new AC(); } if (this.ctx.state === 'suspended') this.ctx.resume(); return true; },
    start(bpm) { if (!this.ensure()) return; if (bpm) this.bpm = bpm; this.on = true; this.beat = 0; this.next = this.ctx.currentTime + 0.1; clearInterval(this.timer); this.timer = setInterval(() => this.tick(), 25); this.onState && this.onState(); },
    stop() { this.on = false; clearInterval(this.timer); this.onState && this.onState(); },
    tick() {
      const ctx = this.ctx;
      while (this.next < ctx.currentTime + 0.12) {
        const b = this.beat, t = this.next;
        this.click(t, b % 4 === 0);
        setTimeout(() => { if (this.on && this.onBeat) this.onBeat(b); }, Math.max(0, (t - ctx.currentTime) * 1000));
        this.beat++; this.next += 60 / this.bpm;
      }
    },
    click(t, acc) {
      const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'square'; o.frequency.value = acc ? 1760 : 1175;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(acc ? 0.22 : 0.13, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.05);
    },
    chime() {
      if (!this.ensure()) return;
      const ctx = this.ctx, t = ctx.currentTime + 0.02;
      [[784, 0], [1047, 0.18]].forEach(([f, d]) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.35, t + d + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.6); o.connect(g).connect(ctx.destination); o.start(t + d); o.stop(t + d + 0.65); });
    },
  };

  /* ---------- fretboard SVG ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  const KIND = {
    root: { fill: 'var(--brass)', stroke: 'none', text: '#fff' },
    note: { fill: 'var(--teal)', stroke: 'none', text: '#fff' },
    minor: { fill: 'var(--minor)', stroke: 'none', text: '#fff' },
    white: { fill: '#F6F1E6', stroke: '#1A1E1C', text: '#1A1E1C' },
    black: { fill: '#0E0F0E', stroke: '#F6F1E6', text: '#F6F1E6' },
    ghost: { fill: 'var(--ghost)', stroke: 'none', text: 'rgba(255,255,255,.75)' },
    target: { fill: 'var(--target)', stroke: 'none', text: '#1A1E1C' },
    right: { fill: 'var(--good)', stroke: 'none', text: '#fff' },
    wrong: { fill: 'var(--bad)', stroke: 'none', text: '#fff' },
    ring: { fill: 'none', stroke: 'var(--brass)', text: 'none' },
  };
  function svg(tag, attrs) { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v); return e; }
  function fretboard(spec, opts = {}) {
    const lo = spec.lo ?? 0, hi = spec.hi ?? 15;
    const FW = 54, OW = lo === 0 ? 34 : 0, LW = 26, TOP = 16, SG = 24, BOT = 26;
    const start = Math.max(lo, 1), nCols = hi - start + 1;
    const nutX = LW + OW, W = nutX + nCols * FW + 10, H = TOP + 5 * SG + BOT + 12;
    const yS = (s) => TOP + 6 + (5 - s) * SG;
    const xF = (f) => f === 0 ? LW + OW / 2 : nutX + (f - start + 0.5) * FW;
    const root = svg('svg', { class: 'fb', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': opts.label || 'Fretboard diagram' });
    root.style.minWidth = Math.min(900, Math.max(420, nCols * 34)) + 'px';
    root.style.maxWidth = Math.round(W * 1.15) + 'px';
    root.append(svg('rect', { x: nutX, y: TOP, width: nCols * FW, height: 5 * SG + 12, rx: 6, style: 'fill:var(--wood)' }));
    // inlays
    const mid = (a, b) => (yS(a) + yS(b)) / 2;
    for (let f = start; f <= hi; f++) {
      if ([3, 5, 7, 9, 15, 17, 19, 21].includes(f)) root.append(svg('circle', { cx: xF(f), cy: mid(2, 3), r: 6, style: 'fill:var(--inlay)' }));
      if (f === 12 || f === 24) { root.append(svg('circle', { cx: xF(f), cy: mid(1, 2), r: 6, style: 'fill:var(--inlay)' })); root.append(svg('circle', { cx: xF(f), cy: mid(3, 4), r: 6, style: 'fill:var(--inlay)' })); }
    }
    // highlighted strings (where to play)
    (spec.bands || []).forEach((bs) => root.append(svg('rect', { x: lo === 0 ? LW : nutX, y: yS(bs) - SG / 2 + 2, width: nutX + nCols * FW - (lo === 0 ? LW : nutX), height: SG - 4, rx: 4, style: 'fill:var(--target);opacity:.38' })));
    // frets
    for (let i = 0; i <= nCols; i++) {
      const x = nutX + i * FW;
      const isNut = i === 0 && lo === 0;
      root.append(svg('line', { x1: x, x2: x, y1: TOP, y2: TOP + 5 * SG + 12, style: `stroke:${isNut ? '#EDE6D6' : 'var(--fret)'};stroke-width:${isNut ? 6 : 2}` }));
    }
    // strings
    for (let s = 0; s < 6; s++) {
      const lit = (spec.bands || []).includes(s);
      root.append(svg('line', { x1: lo === 0 ? LW + 4 : nutX, x2: nutX + nCols * FW, y1: yS(s), y2: yS(s), style: `stroke:${lit ? 'var(--target)' : 'var(--string)'};stroke-width:${((lit ? 3.4 : 2.3) - s * 0.3).toFixed(2)};opacity:.95` }));
      const t = svg('text', { x: 10, y: yS(s) + 4, 'text-anchor': 'middle', style: `fill:${lit ? 'var(--ink)' : 'var(--muted)'};font:${lit ? 800 : 600} ${lit ? 13 : 11}px var(--f-round)` }); t.textContent = G.STRING_SHORT[s]; root.append(t);
    }
    // fret numbers
    for (let f = lo; f <= hi; f++) {
      const t = svg('text', { x: xF(f), y: H - 8, 'text-anchor': 'middle', style: `fill:var(--muted);font:${[3, 5, 7, 9, 12, 15, 17].includes(f) ? 600 : 400} 11px var(--f-round)` });
      t.textContent = f; root.append(t);
    }
    // links (slides / octave shapes)
    (spec.links || []).forEach(([s1, f1, s2, f2]) => root.append(svg('line', { x1: xF(f1), y1: yS(s1), x2: xF(f2), y2: yS(s2), style: 'stroke:rgba(255,255,255,.75);stroke-width:2;stroke-dasharray:4 4' })));
    // dots
    const mode = opts.labelMode || P.labelMode;
    const order = { ghost: 0, ring: 5 };
    [...spec.dots].sort((a, b) => (order[a.kind] ?? 2) - (order[b.kind] ?? 2)).forEach((d) => {
      if (d.f < lo || d.f > hi) return;
      const k = KIND[d.kind] || KIND.note;
      const cx = xF(d.f), cy = yS(d.s);
      if (d.kind === 'ring') { root.append(svg('circle', { cx, cy, r: 13.5, style: 'fill:none;stroke:var(--brass);stroke-width:2.5' })); return; }
      root.append(svg('circle', { cx, cy, r: d.kind === 'ghost' ? 8 : 10.5, style: `fill:${k.fill};stroke:${k.stroke};stroke-width:${k.stroke === 'none' ? 0 : 1.5}` }));
      if (d.kind === 'target') root.append(svg('circle', { class: 'pulse', cx, cy, r: 14, style: 'fill:none;stroke:var(--target);stroke-width:2.5' }));
      let label = d.text;
      if (label == null && d.deg) label = mode === 'note' && opts.keyPc != null ? G.nameIn(G.pcAt(d.s, d.f), opts.keyPc) : String(d.deg);
      if (label) { const t = svg('text', { x: cx, y: cy + 4, 'text-anchor': 'middle', style: `fill:${k.text};font:700 ${label.length > 2 ? 9 : 11}px var(--f-round);pointer-events:none` }); t.textContent = label; root.append(t); }
    });
    // click cells
    if (opts.onClick) {
      for (let s = 0; s < 6; s++) for (let f = lo; f <= hi; f++) {
        const w = f === 0 ? OW : FW;
        const off = opts.clickString != null && s !== opts.clickString;
        const r = svg('rect', { class: 'cell' + (off ? ' off' : ''), x: f === 0 ? LW : nutX + (f - start) * FW, y: yS(s) - SG / 2, width: w, height: SG });
        if (!off) r.addEventListener('click', () => opts.onClick(s, f));
        root.append(r);
      }
    }
    return el('div', { class: 'fb-wrap' }, root);
  }
  const LEGEND = () => el('div', { class: 'legend' },
    el('span', null, el('i', { style: 'background:var(--brass)' }), '1 (root)'),
    el('span', null, el('i', { style: 'background:#F6F1E6;border:1.5px solid #1A1E1C' }), '3 → 4 white keystone'),
    el('span', null, el('i', { style: 'background:#0E0F0E;border:1.5px solid #F6F1E6' }), '7 → 1 black keystone'),
    el('span', null, el('i', { style: 'background:var(--teal)' }), 'other scale notes'));

  /* ---------- figures (Learn) ---------- */
  function figure(f, stage) {
    let key = f.defaultKey ?? 0, vi = 0;
    const box = el('div', { class: 'card stack' });
    function paint() {
      box.innerHTML = '';
      const variants = f.fn(key);
      const v = variants[Math.min(vi, variants.length - 1)];
      const hasDeg = v.spec.dots.some((d) => d.deg && d.text == null);
      const head = el('div', { class: 'row', style: 'justify-content:space-between' }, el('h3', { text: f.title }),
        el('div', { class: 'row' },
          f.keyed ? el('label', { class: 'row', style: 'gap:6px' }, el('span', { class: 'muted', text: 'Key' }),
            (() => { const s = el('select', { id: 'key-' + stage.id + '-' + f.title.replace(/\W/g, ''), onchange: (e) => { key = +e.target.value; paint(); } }, G.KEYS.map((k) => el('option', { value: k.pc, text: G.keyLabel(k.pc) }))); s.value = key; return s; })()) : null,
          hasDeg ? el('div', { class: 'seg' }, ...[['deg', 'Numbers'], ['note', 'Notes']].map(([m, l]) => el('button', { 'aria-pressed': P.labelMode === m ? 'true' : 'false', onclick: () => { P.labelMode = m; commit(); paint(); } }, l))) : null));
      box.append(head);
      if (variants.length > 1) box.append(el('div', { class: 'seg' }, ...variants.map((x, i) => el('button', { 'aria-pressed': i === vi ? 'true' : 'false', onclick: () => { vi = i; paint(); } }, x.label))));
      box.append(fretboard(v.spec, { keyPc: key, label: f.title }));
      if (v.caption) box.append(el('p', { class: 'fig-caption', text: v.caption }));
      if (v.spec.dots.some((d) => d.deg)) box.append(LEGEND());
    }
    paint();
    return box;
  }

  /* ---------- keyboard shortcuts for the active quiz ---------- */
  let keyHandler = null;
  document.addEventListener('keydown', (e) => { if (keyHandler && !/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) keyHandler(e); });

  /* ---------- quiz runner ---------- */
  // gens: array of generator functions (mixed at random); mode: practice | test
  function quiz({ gens, mode = 'practice', n = 0, onDone, onAnswer, label }) {
    const box = el('div', { class: 'stack' });
    let q, t0, answered = false, count = 0, right = 0, times = [], missed = [];
    const tally = el('div', { class: 'scoreline' });
    function paintTally() { tally.textContent = mode === 'test' ? `Question ${count + (answered ? 0 : 1)} of ${n}` : `${right} / ${count} right this round`; }
    function next() {
      if (mode === 'test' && count >= n) return finish();
      const g = gens[Math.floor(Math.random() * gens.length)];
      q = g(); q.src = g.src || ''; t0 = performance.now(); answered = false; paint();
    }
    function answer(ok, chosenLabel) {
      if (answered) return; answered = true;
      const sec = (performance.now() - t0) / 1000;
      count++; if (ok) right++; times.push(sec);
      if (!ok) missed.push({ prompt: q.prompt, answer: q.type === 'choice' ? (q.choices.find((c) => c.value === q.answer) || {}).label : 'see board', chose: chosenLabel });
      onAnswer && onAnswer(ok);
      paint(ok);
    }
    function finish() {
      keyHandler = null;
      const avg = times.reduce((a, b) => a + b, 0) / (times.length || 1);
      onDone && onDone({ right, n: count, avg, missed });
    }
    function paint(result) {
      box.innerHTML = '';
      paintTally();
      box.append(el('div', { class: 'row', style: 'justify-content:space-between' }, el('span', { class: 'eyebrow', text: label || (mode === 'test' ? 'Ready test' : 'Know it') }), tally));
      box.append(el('p', { class: 'quiz-q', html: q.prompt }));
      // board
      let spec = q.board;
      if (answered && q.type === 'click') spec = { ...q.board, dots: [...q.board.dots, ...(q.clicked ? [{ s: q.clicked[0], f: q.clicked[1], kind: result ? 'right' : 'wrong', text: '' }] : []), ...q.solution] };
      if (answered && q.solutionBoard) spec = q.solutionBoard;
      if (spec) box.append(fretboard(spec, {
        onClick: q.type === 'click' && !answered ? (s, f) => { q.clicked = [s, f]; answer(q.isCorrect(s, f), `string ${G.STRING_SHORT[s]} fret ${f}`); } : null,
        clickString: q.clickString,
      }));
      if (q.type === 'click' && !answered) box.append(el('p', { class: 'muted', text: q.clickString != null ? `Click on the ${G.STRING_NAMES[q.clickString]} string.` : 'Click a spot on the fretboard.' }));
      // choices
      if (q.type === 'choice') {
        const wide = q.choices.some((c) => String(c.label).length > 12);
        const grid = el('div', { class: 'choices' + (wide ? ' wide' : '') });
        q.choices.forEach((c, i) => {
          const isAns = c.value === q.answer;
          const cls = 'choice' + (answered && isAns ? ' right' : '') + (answered && q.chosen === i && !isAns ? ' wrong' : '');
          grid.append(el('button', { class: cls, disabled: answered, onclick: () => { q.chosen = i; answer(isAns, c.label); } }, i < 9 ? el('span', { class: 'k', text: i + 1 }) : null, String(c.label)));
        });
        box.append(grid);
      }
      if (answered) {
        const ansLabel = q.type === 'choice' ? (q.choices.find((c) => c.value === q.answer) || {}).label : null;
        box.append(el('div', { class: 'feedback ' + (result ? 'ok' : 'no') },
          el('div', null, el('b', { text: result ? 'Right. ' : (ansLabel ? `It's ${ansLabel}. ` : 'Not quite. ') }), el('span', { html: q.explain || '' }))));
        const nb = el('button', { class: 'btn primary', onclick: next }, mode === 'test' && count >= n ? 'See result' : 'Next question');
        box.append(el('div', { class: 'row' }, nb, el('span', { class: 'muted', text: 'or press Enter' })));
        setTimeout(() => nb.focus({ preventScroll: true }), 0);
      }
      keyHandler = (e) => {
        if (answered && e.key === 'Enter') { e.preventDefault(); next(); return; }
        if (!answered && q.type === 'choice' && /^[1-9]$/.test(e.key)) { const i = +e.key - 1; if (q.choices[i]) { q.chosen = i; answer(q.choices[i].value === q.answer, q.choices[i].label); } }
      };
    }
    next();
    return box;
  }

  /* ---------- Play drill panel ---------- */
  function playPanel(stage, { session } = {}) {
    const p = sp(stage.id);
    const D = stage.play;
    let lvl = Math.min(2, Math.max(0, p.playLevel + 1));
    if (session && p.playLevel >= 2) lvl = 2;
    const box = el('div', { class: 'stack' });
    const calloutState = {};
    let call = null, sinceCall = 0;
    function paint() {
      box.innerHTML = '';
      const L = D.levels[lvl];
      Metro.bpm = L.bpm;
      box.append(el('div', { class: 'row', style: 'justify-content:space-between' }, el('h2', { text: D.title }), el('span', { class: 'eyebrow', text: 'Play it' })));
      box.append(el('div', { class: 'levels' }, ...D.levels.map((x, i) => el('button', { class: 'level', 'aria-pressed': i === lvl ? 'true' : 'false', onclick: () => { lvl = i; Metro.stop(); call = null; paint(); } },
        el('span', { class: 'lv' }, el('span', { text: x.label }), p.playLevel >= i ? el('span', { class: 'done', text: '✓ done' }) : el('span', { text: x.bpm + ' bpm' })),
        el('span', { text: x.detail })))));
      box.append(el('ol', { class: 'how' }, ...D.how.map((t) => el('li', { html: t }))));
      // metronome
      const bpmEl = el('span', { class: 'bpm', text: Metro.bpm });
      const beats = el('div', { class: 'beats' }, ...[0, 1, 2, 3].map((i) => el('i', { class: i === 0 ? 'accent' : '' })));
      const startBtn = el('button', { class: 'btn primary', onclick: () => { if (Metro.on) Metro.stop(); else { call = null; sinceCall = 0; Metro.start(Metro.bpm); } } });
      const setBpm = (d) => { Metro.bpm = Math.max(30, Math.min(220, Metro.bpm + d)); bpmEl.textContent = Metro.bpm; };
      const paintBtn = () => { startBtn.textContent = Metro.on ? 'Stop' : 'Start metronome'; };
      Metro.onState = paintBtn; paintBtn();
      box.append(el('div', { class: 'metro' }, startBtn,
        el('div', { class: 'row', style: 'gap:6px' }, el('button', { class: 'btn', 'aria-label': 'Slower', onclick: () => setBpm(-5) }, '−'), bpmEl, el('span', { class: 'muted', text: 'bpm' }), el('button', { class: 'btn', 'aria-label': 'Faster', onclick: () => setBpm(5) }, '+')),
        beats));
      // callout
      const hasCall = D.callout && L.every > 0 && D.callout(lvl, {}) !== null;
      const cBig = el('div', { class: 'big', text: '—' }), cSmall = el('div', { class: 'where', text: 'Start the metronome to get your first call' }), cAns = el('div', { class: 'ans' }), cBoard = el('div', { class: 'call-board' });
      if (hasCall) box.append(el('div', { class: 'callout' }, el('div', { class: 'call-head' }, cBig, cSmall), cBoard, cAns));
      const showBoard = (withAnswer) => {
        cBoard.innerHTML = '';
        if (!call || !call.board) return;
        const spec = withAnswer && call.reveal ? { ...call.board, dots: [...call.board.dots, ...call.reveal] } : call.board;
        cBoard.append(fretboard(spec, { keyPc: call.keyPc, label: 'Where to play' }));
      };
      Metro.onBeat = (b) => {
        beats.querySelectorAll('i').forEach((x, i) => x.classList.toggle('on', i === b % 4));
        if (!hasCall) return;
        if (call === null || sinceCall >= L.every) { call = D.callout(lvl, calloutState); sinceCall = 0; cBig.textContent = call.big; cSmall.textContent = call.where || ''; cAns.textContent = ''; showBoard(false); }
        if (call.answer && sinceCall === Math.floor(L.every / 2)) { cAns.textContent = 'Check: ' + call.answer; showBoard(true); }
        sinceCall++;
      };
      // the shape: shown open for drills without calls (runs), tucked away when the calls already show the board
      if (stage.figures[0]) {
        if (!hasCall) box.append(figure(stage.figures[0], stage));
        else {
          const det = el('details', null, el('summary', { class: 'muted', style: 'cursor:pointer', text: 'Show the full diagram' }));
          det.addEventListener('toggle', () => { if (det.open && det.children.length === 1) det.append(figure(stage.figures[0], stage)); });
          box.append(det);
        }
      }
      // pass
      const done = p.playLevel >= lvl;
      box.append(el('div', { class: 'row', style: 'justify-content:space-between;border-top:1px solid var(--line);padding-top:14px' },
        el('p', null, el('b', { text: 'Pass this level: ' }), D.pass),
        el('button', { class: 'btn' + (done ? '' : ' primary'), disabled: done, onclick: () => { p.playLevel = Math.max(p.playLevel, lvl); commit(); if (lvl < 2) lvl++; Metro.stop(); call = null; paint(); } }, done ? `${L.label} done ✓` : `I nailed ${L.label}`)));
    }
    paint();
    return box;
  }

  /* ---------- Use (jam) panel ---------- */
  function usePanel(stage, { session } = {}) {
    const p = sp(stage.id);
    const box = el('div', { class: 'stack' });
    function paint() {
      box.innerHTML = '';
      const rules = stage.use.rules;
      const idx = (p.ruleIdx || 0) % rules.length;
      box.append(el('div', { class: 'row', style: 'justify-content:space-between' }, el('h2', { text: 'Jam with a rule' }), el('span', { class: 'eyebrow', text: 'Use it' })));
      if (stage.use.track) {
        const q = stage.use.track;
        box.append(el('div', { class: 'track' }, el('span', { class: 'muted', text: 'Put on:' }), el('code', { text: q }),
          el('a', { class: 'btn', href: 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q), target: '_blank', rel: 'noopener' }, 'Search YouTube')));
      } else box.append(el('div', { class: 'track' }, el('span', { class: 'muted', text: 'No track needed. Just you and the guitar.' })));
      box.append(el('p', { class: 'eyebrow', text: 'Today’s rule' }));
      box.append(el('p', { class: 'rule', html: rules[idx] }));
      box.append(el('div', { class: 'row' }, el('button', { class: 'btn', onclick: () => { p.ruleIdx = idx + 1; commit(); paint(); } }, 'Give me another rule'),
        el('span', { class: 'muted', text: 'Stick to the rule. When you catch yourself falling back on old licks, that’s the moment it’s working.' })));
      const det = el('details', null, el('summary', { class: 'muted', style: 'cursor:pointer', text: `All ${rules.length} rules for this stage` }), el('ul', { class: 'points', style: 'margin-top:8px' }, ...rules.map((r) => el('li', { html: r }))));
      box.append(det);
    }
    paint();
    return box;
  }

  /* ---------- Ready test ---------- */
  function testPanel(stage, onBack) {
    const p = sp(stage.id), T = stage.test;
    const box = el('div', { class: 'stack' });
    function intro() {
      box.innerHTML = '';
      const L = stage.play.levels[T.playLevel];
      const playOk = p.playLevel >= T.playLevel;
      box.append(el('h2', { text: 'Ready test' }));
      box.append(el('p', { style: 'max-width:65ch', text: 'Two checks. Pass both and the stage is done. You can move on any time, this just tells you when you’ve really got it.' }));
      box.append(el('div', { class: 'stack card' },
        el('div', { class: 'row', style: 'justify-content:space-between' }, el('h3', { text: `1 · Know it: ${T.n} questions` }), p.test ? el('span', { class: 'badge ' + (p.test.passed ? 'ok' : 'no'), text: p.test.passed ? 'Passed' : `Best ${p.test.right}/${p.test.n}` }) : null),
        el('p', null, `Pass mark: ${T.pass} right` + (T.maxAvg ? `, averaging under ${T.maxAvg} seconds per question.` : '. No time limit.')),
        el('div', null, el('button', { class: 'btn primary', onclick: run }, p.test ? 'Retake the quiz test' : 'Start the quiz test'))));
      box.append(el('div', { class: 'stack card' },
        el('div', { class: 'row', style: 'justify-content:space-between' }, el('h3', { text: `2 · Play it: ${L.label}` }), el('span', { class: 'badge ' + (playOk ? 'ok' : 'no'), text: playOk ? 'Done' : 'Not yet' })),
        el('p', null, `${stage.play.title}, ${L.detail} at ${L.bpm} bpm. ${stage.play.pass}`),
        el('p', { class: 'muted', text: 'Mark it done on the Play it tab when you’ve nailed it.' })));
    }
    function run() {
      box.innerHTML = '';
      box.append(quiz({ gens: [stage.know], mode: 'test', n: T.n, onDone: result }));
    }
    function result(r) {
      const passed = r.right >= T.pass && (!T.maxAvg || r.avg <= T.maxAvg);
      const prev = p.test;
      if (!prev || passed || r.right > prev.right) p.test = { right: r.right, n: r.n, avg: +r.avg.toFixed(1), passed: passed || !!(prev && prev.passed), date: todayISO() };
      commit();
      box.innerHTML = '';
      const res = el('div', { class: 'test-result card' },
        el('span', { class: 'badge ' + (passed ? 'ok' : 'no'), text: passed ? 'Passed' : 'Not yet' }),
        el('div', { class: 'stat' }, el('div', null, el('span', { class: 'v', text: `${r.right}/${r.n}` }), el('span', { class: 'l', text: `right (need ${T.pass})` })),
          el('div', null, el('span', { class: 'v', text: r.avg.toFixed(1) + 's' }), el('span', { class: 'l', text: T.maxAvg ? `average (need under ${T.maxAvg}s)` : 'average per question' }))));
      if (r.missed.length) res.append(el('div', { class: 'missed' }, el('h3', { text: 'Review these' }), ...r.missed.map((m) => el('div', null, el('span', { html: m.prompt }), ' → ', el('b', { text: m.answer })))));
      const done = status(stage.id) === 'passed';
      res.append(el('div', { class: 'row' }, el('button', { class: 'btn', onclick: intro }, 'Back'),
        done && stage.n < S.length ? el('button', { class: 'btn primary', onclick: () => { P.current = S[stage.n].id; commit(); go('stage', S[stage.n].id); } }, `Stage complete. Start stage ${stage.n + 1}: ${S[stage.n].title}`) : null));
      box.append(res);
    }
    intro();
    return box;
  }

  /* ---------- views ---------- */
  const app = document.getElementById('app');
  const rail = el('nav', { class: 'rail', 'aria-label': 'Stages' });
  const main = el('main', { class: 'main' });
  app.append(rail, main);
  let view = { name: 'home', id: null, tab: 'learn' };
  let sessionTimer = null;

  function paintSave() { const s = rail.querySelector('.save'); if (s) s.textContent = Store.status; }
  function paintRail() {
    rail.innerHTML = '';
    rail.append(el('div', { class: 'brand' },
      el('span', { html: '<svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><defs><linearGradient id="fcg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3D9BFF"/><stop offset="1" stop-color="#0062E0"/></linearGradient></defs><rect width="28" height="28" rx="7" fill="url(#fcg)"/><g stroke="#fff" stroke-opacity=".85" stroke-width="1.3" stroke-linecap="round"><line x1="6" y1="9" x2="22" y2="9"/><line x1="6" y1="14" x2="22" y2="14"/><line x1="6" y1="19" x2="22" y2="19"/></g><g stroke="#fff" stroke-opacity=".45" stroke-width="1"><line x1="11" y1="6" x2="11" y2="22"/><line x1="17" y1="6" x2="17" y2="22"/></g><circle cx="14" cy="14" r="3.4" fill="#FF9500" stroke="#fff" stroke-width="1.2"/></svg>' }),
      el('b', { text: 'Fretboard Coach' })));
    rail.append(el('p', { class: 'save', text: Store.status }));
    rail.append(el('button', { class: 'home-link', 'aria-current': view.name === 'home' ? 'page' : null, onclick: () => go('home') }, 'Today'));
    const list = el('div', { class: 'list' });
    let g = null;
    S.forEach((st) => {
      if (st.group !== g) { g = st.group; list.append(el('div', { class: 'group-name', text: g })); }
      const stt = status(st.id);
      const chip = P.current === st.id ? el('span', { class: 'chip current', text: 'Now' }) : stt === 'passed' ? el('span', { class: 'chip passed', text: '✓' }) : stt === 'started' ? el('span', { class: 'chip started', text: 'Started' }) : null;
      list.append(el('button', { class: 'stage-btn', 'aria-current': view.id === st.id && view.name !== 'home' ? 'page' : null, onclick: () => go('stage', st.id) },
        el('span', { class: 'num', text: String(st.n).padStart(2, '0') }), el('span', { class: 't', text: st.title }), chip));
    });
    rail.append(list);
    if (sbUser) rail.append(el('div', { class: 'account' }, el('span', { class: 'who', text: sbUser.email || 'Signed in' }),
      el('button', { class: 'signout', onclick: async () => { try { await Store.flush(); await sb.auth.signOut(); } catch (e) { /* ignore */ } location.reload(); } }, 'Sign out')));
  }

  function go(name, id, tab) {
    Metro.stop(); Metro.onBeat = null; Metro.onState = null; keyHandler = null;
    if (sessionTimer) { clearInterval(sessionTimer); sessionTimer = null; }
    view = { name, id: id || null, tab: tab || 'learn' };
    paintRail(); render();
    window.scrollTo({ top: 0 });
  }

  function render() {
    main.innerHTML = '';
    if (view.name === 'home') return renderHome();
    if (view.name === 'stage') return renderStage();
    if (view.name === 'session') return renderSession();
  }

  function weekPlan(st) {
    const p = sp(st.id);
    const nextLvl = Math.min(2, p.playLevel + 1);
    const L = st.play.levels[nextLvl];
    const rule = st.use.rules[(p.ruleIdx || 0) % st.use.rules.length];
    return el('div', { class: 'week' },
      el('div', { class: 'item' }, el('span', { class: 'eyebrow', text: 'Know it' }), el('span', null, `${st.test.n} questions on the Know it tab each day. Aim for ${st.test.pass}+ right.`)),
      el('div', { class: 'item' }, el('span', { class: 'eyebrow', text: 'Play it' }), el('span', null, el('b', { text: st.play.title }), ` · ${L.label}: ${L.detail}, ${L.bpm} bpm.`)),
      el('div', { class: 'item' }, el('span', { class: 'eyebrow', text: 'Use it' }), el('span', { html: rule })),
      el('div', { class: 'item' }, el('span', { class: 'eyebrow', text: 'Ready?' }), el('span', null, `Take the ready test once you’ve nailed ${st.play.levels[st.test.playLevel].label}.`)));
  }

  function renderHome() {
    const st = byId(P.current) || S[0];
    const p = sp(st.id);
    const sessions = P.log.length;
    main.append(el('div', { class: 'stack', style: 'gap:6px' }, el('span', { class: 'eyebrow', text: 'Today' }), el('h1', { text: `Stage ${st.n}: ${st.title}` }), el('p', { class: 'muted', style: 'font-size:1.05rem', text: st.goal })));
    main.append(el('section', { class: 'today' },
      el('div', { class: 'card lead' },
        el('div', { class: 'plan' }, ...[['10', 'Review'], ['5', 'Know it'], ['15', 'Play it'], ['15', 'Use it']].map(([m, l]) => el('div', null, el('div', { class: 'm', text: m + ' min' }), el('div', { class: 'l', text: l })))),
        el('p', null, 'One 45-minute session. The app tells you what to do in each block, and when to move on.'),
        el('div', { class: 'row' }, el('button', { class: 'btn primary big', onclick: () => startSession(st.id) }, 'Start 45-minute session'),
          el('button', { class: 'btn', onclick: () => go('stage', st.id) }, 'Open stage'))),
      el('div', { class: 'card stack' }, el('h3', { text: 'Between sessions this week' }), weekPlan(st))));
    main.append(el('section', { class: 'card stack' },
      el('h3', { text: 'Your progress' }),
      el('div', { class: 'stat' },
        el('div', null, el('span', { class: 'v', text: `${S.filter((x) => status(x.id) === 'passed').length}/16` }), el('span', { class: 'l', text: 'stages passed' })),
        el('div', null, el('span', { class: 'v', text: sessions }), el('span', { class: 'l', text: 'sessions done' })),
        el('div', null, el('span', { class: 'v', text: p.sessions }), el('span', { class: 'l', text: 'sessions on this stage' })),
        el('div', null, el('span', { class: 'v', text: p.playLevel >= 0 ? `Level ${p.playLevel + 1}` : '—' }), el('span', { class: 'l', text: 'play level reached' })),
        el('div', null, el('span', { class: 'v', text: p.test ? `${p.test.right}/${p.test.n}` : '—' }), el('span', { class: 'l', text: 'best ready test' }))),
      P.log.length ? el('div', { class: 'muted', style: 'font-size:.88rem' }, 'Recent: ', P.log.slice(-5).reverse().map((l) => `${l.d} · stage ${byId(l.stage)?.n} · ${l.mins} min`).join('   ·   ')) : el('p', { class: 'muted', text: 'No sessions yet. Your first one starts with a short warm-up.' })));
  }

  function renderStage() {
    const st = byId(view.id);
    const stt = status(st.id);
    main.append(el('div', { class: 'stack', style: 'gap:8px' },
      el('span', { class: 'eyebrow', text: `Stage ${st.n} · ${st.group}` + (st.light ? ' · light touch' : '') }),
      el('div', { class: 'row', style: 'justify-content:space-between;align-items:flex-end' }, el('h1', { text: st.title }),
        el('div', { class: 'row' },
          stt === 'passed' ? el('span', { class: 'badge ok', text: 'Passed' }) : null,
          P.current !== st.id ? el('button', { class: 'btn', onclick: () => { P.current = st.id; commit(); render(); } }, 'Make this my current stage') : el('span', { class: 'chip current', text: 'Current stage' }),
          el('button', { class: 'btn primary', onclick: () => startSession(st.id) }, 'Start session'))),
      el('p', { class: 'muted', style: 'font-size:1.05rem', text: st.goal }),
      el('p', { class: 'muted', style: 'font-size:.82rem', text: 'From the course: ' + st.course })));
    const tabs = [['learn', 'Learn'], ['know', 'Know it'], ['play', 'Play it'], ['use', 'Use it'], ['test', 'Ready test']];
    main.append(el('div', { class: 'tabs', role: 'tablist' }, ...tabs.map(([k, l]) => el('button', { class: 'tab', role: 'tab', 'aria-selected': view.tab === k ? 'true' : 'false', onclick: () => { Metro.stop(); keyHandler = null; view.tab = k; render(); } }, l))));
    const body = el('div', { class: 'stack', style: 'gap:18px' });
    main.append(body);
    if (view.tab === 'learn') {
      const lesson = (typeof LESSONS !== 'undefined' && LESSONS[st.id]) || null;
      const placed = new Set();
      if (lesson) {
        lesson.forEach((sec, i) => {
          const card = el('section', { class: 'card lesson' },
            el('div', { class: 'lesson-h' }, el('span', { class: 'lesson-n', text: i + 1 }), el('h2', { text: sec.h })),
            ...(sec.p || []).map((t) => el('p', { html: t })));
          if (sec.table) {
            const [head, ...rows] = sec.table;
            card.append(el('div', { class: 'tbl-wrap' }, el('table', { class: 'mini' },
              el('thead', null, el('tr', null, ...head.map((c) => el('th', { text: c })))),
              el('tbody', null, ...rows.map((r) => el('tr', null, ...r.map((c, j) => el(j === 0 ? 'th' : 'td', { text: c }))))))));
          }
          if (sec.ex) card.append(el('div', { class: 'example' }, el('span', { class: 'eyebrow', text: 'Try it' }), el('p', { html: sec.ex })));
          body.append(card);
          if (sec.fig != null && st.figures[sec.fig]) { placed.add(sec.fig); body.append(figure(st.figures[sec.fig], st)); }
        });
      }
      st.figures.forEach((f, i) => { if (!placed.has(i)) body.append(figure(f, st)); });
      body.append(el('div', { class: 'card recap' }, el('span', { class: 'eyebrow', text: 'Quick recap' }), el('ul', { class: 'points' }, ...st.learn.map((t) => el('li', { html: t })))));
    } else if (view.tab === 'know') {
      body.append(el('div', { class: 'card' }, quiz({ gens: [st.know], onAnswer: () => { sp(st.id).quiz++; Store.save(); } })));
    } else if (view.tab === 'play') body.append(el('div', { class: 'card' }, playPanel(st)));
    else if (view.tab === 'use') body.append(el('div', { class: 'card' }, usePanel(st)));
    else body.append(testPanel(st));
  }

  /* ---------- session ---------- */
  let SES = null;
  function startSession(id) {
    const st = byId(id);
    const idx = st.n - 1;
    const earlier = S.slice(0, idx);
    let pool = earlier.filter((x) => status(x.id) !== 'new');
    if (!pool.length) pool = earlier.slice(-4);
    const blocks = [];
    if (!pool.length) {
      blocks.push({ kind: 'warm', title: 'Warm-up: fingers', mins: 5 });
      blocks.push({ kind: 'recall', title: 'Warm-up: recall', mins: 5, gens: [st.know] });
    } else {
      const recent = pool.slice(-5);
      blocks.push({ kind: 'recall', title: 'Review: recall', mins: 5, gens: recent.map((x) => { const g = () => x.know(); g.src = x.title; return g; }) });
      const rp = recent.filter((x) => x.play)[Math.floor(Math.random() * recent.length)] || recent[recent.length - 1];
      blocks.push({ kind: 'replay', title: 'Review: play', mins: 5, stage: rp });
    }
    blocks.push({ kind: 'know', title: 'Know it', mins: 5 });
    blocks.push({ kind: 'play', title: 'Play it', mins: 15 });
    blocks.push({ kind: 'use', title: 'Use it', mins: 15 });
    SES = { id, blocks, i: 0, elapsed: 0, running: true, last: Date.now(), startedAt: Date.now(), right: 0, asked: 0, chimed: false };
    go('session', id);
  }
  function renderSession() {
    const st = byId(SES.id);
    const B = SES.blocks;
    const head = el('div', { class: 'session-head' },
      el('div', { class: 'stack', style: 'gap:4px' }, el('span', { class: 'eyebrow', text: `Session · Stage ${st.n}: ${st.title}` }), el('h1', { text: B[SES.i].title })),
      el('div', { class: 'stack', style: 'gap:6px;align-items:flex-end' }, el('div', { class: 'clock', id: 'clock' }), el('div', { class: 'row' },
        el('button', { class: 'btn', id: 'pause', onclick: () => { SES.running = !SES.running; SES.last = Date.now(); tickSession(); } }),
        el('button', { class: 'btn', onclick: () => { B[SES.i].mins += 2; SES.chimed = false; tickSession(); } }, '+2 min'),
        el('button', { class: 'btn', onclick: nextBlock }, SES.i === B.length - 1 ? 'Finish' : 'Next block'))));
    const cols = B.map((b) => b.mins + 'fr').join(' ');
    const bars = el('div', { class: 'blocks', style: `grid-template-columns:${cols}` }, ...B.map((b, i) => el('div', { class: 'blk' }, el('i', { style: `width:${i < SES.i ? 100 : 0}%` }))));
    const labels = el('div', { class: 'blk-labels', style: `grid-template-columns:${cols}` }, ...B.map((b, i) => el('span', { class: i === SES.i ? 'on' : '', text: `${b.title} · ${b.mins}m` })));
    const timeup = el('div', { class: 'timeup', id: 'timeup', hidden: true }, el('span', null, el('b', { text: 'Time’s up for this block. ' }), 'Finish your phrase, then move on.'), el('button', { class: 'btn primary', onclick: nextBlock }, SES.i === B.length - 1 ? 'Finish session' : 'Next block'));
    main.append(head, el('div', { class: 'stack', style: 'gap:6px' }, bars, labels), timeup);
    const b = B[SES.i];
    const card = el('div', { class: 'card' });
    if (b.kind === 'warm') {
      card.append(el('div', { class: 'stack' }, el('h2', { text: 'Wake the fingers up' }),
        el('ol', { class: 'how' }, el('li', null, 'Low E string, frets 1-2-3-4, one finger per fret. Then the same on every string up to high e, and back down.'), el('li', null, 'One note per click. Keep each note clean and even.'), el('li', null, 'Then move the pattern up one fret (2-3-4-5) and repeat.')),
        metroOnly(60)));
    } else if (b.kind === 'recall') {
      card.append(quiz({ gens: b.gens, label: b.title, onAnswer: (ok) => { SES.asked++; if (ok) SES.right++; } }));
    } else if (b.kind === 'replay') {
      card.append(el('p', { class: 'muted', style: 'margin-bottom:12px', text: `From stage ${b.stage.n}: ${b.stage.title}. Play it at the highest level you’ve nailed.` }), playPanel(b.stage, { session: true }));
    } else if (b.kind === 'know') {
      card.append(quiz({ gens: [st.know], onAnswer: (ok) => { SES.asked++; if (ok) SES.right++; sp(st.id).quiz++; } }));
    } else if (b.kind === 'play') card.append(playPanel(st, { session: true }));
    else if (b.kind === 'use') card.append(usePanel(st, { session: true }));
    else if (b.kind === 'done') {
      main.innerHTML = '';
      renderDone(); return;
    }
    if (SES.i === 0 && b.kind !== 'done') card.prepend(el('details', { style: 'margin-bottom:14px' }, el('summary', { class: 'muted', style: 'cursor:pointer', text: `Stage ${st.n} in a nutshell` }), el('ul', { class: 'points', style: 'margin-top:8px' }, ...st.learn.map((t) => el('li', { html: t })))));
    main.append(card);
    tickSession();
    sessionTimer = setInterval(tickSession, 250);
  }
  function metroOnly(bpm) {
    Metro.bpm = bpm;
    const bpmEl = el('span', { class: 'bpm', text: bpm });
    const beats = el('div', { class: 'beats' }, ...[0, 1, 2, 3].map((i) => el('i', { class: i === 0 ? 'accent' : '' })));
    const btn = el('button', { class: 'btn primary', onclick: () => Metro.on ? Metro.stop() : Metro.start(Metro.bpm) });
    Metro.onState = () => { btn.textContent = Metro.on ? 'Stop' : 'Start metronome'; }; Metro.onState();
    Metro.onBeat = (b) => beats.querySelectorAll('i').forEach((x, i) => x.classList.toggle('on', i === b % 4));
    const set = (d) => { Metro.bpm = Math.max(30, Math.min(220, Metro.bpm + d)); bpmEl.textContent = Metro.bpm; };
    return el('div', { class: 'metro' }, btn, el('div', { class: 'row', style: 'gap:6px' }, el('button', { class: 'btn', onclick: () => set(-5) }, '−'), bpmEl, el('span', { class: 'muted', text: 'bpm' }), el('button', { class: 'btn', onclick: () => set(5) }, '+')), beats);
  }
  function tickSession() {
    if (!SES) return;
    const now = Date.now();
    if (SES.running) SES.elapsed += (now - SES.last) / 1000;
    SES.last = now;
    const b = SES.blocks[SES.i];
    const left = b.mins * 60 - SES.elapsed;
    const clock = document.getElementById('clock'); if (clock) clock.textContent = fmt(left);
    const pause = document.getElementById('pause'); if (pause) pause.textContent = SES.running ? 'Pause' : 'Resume';
    const bars = main.querySelectorAll('.blk > i'); if (bars[SES.i]) bars[SES.i].style.width = Math.min(100, (SES.elapsed / (b.mins * 60)) * 100) + '%';
    const tu = document.getElementById('timeup'); if (tu) tu.hidden = left > 0;
    if (left <= 0 && !SES.chimed) { SES.chimed = true; Metro.chime(); }
  }
  function nextBlock() {
    Metro.stop(); keyHandler = null;
    if (SES.i >= SES.blocks.length - 1) return finishSession();
    SES.i++; SES.elapsed = 0; SES.last = Date.now(); SES.chimed = false; SES.running = true;
    if (sessionTimer) clearInterval(sessionTimer);
    render(); window.scrollTo({ top: 0 });
  }
  function finishSession() {
    const mins = Math.round((Date.now() - SES.startedAt) / 60000);
    const p = sp(SES.id); p.sessions++;
    P.log.push({ d: todayISO(), stage: SES.id, mins });
    if (P.log.length > 200) P.log = P.log.slice(-200);
    commit();
    SES.blocks.push({ kind: 'done', title: 'Done', mins: 0 });
    SES.i = SES.blocks.length - 1;
    if (sessionTimer) { clearInterval(sessionTimer); sessionTimer = null; }
    render();
  }
  function renderDone() {
    const st = byId(SES.id);
    const p = sp(st.id);
    main.append(el('div', { class: 'stack', style: 'gap:6px' }, el('span', { class: 'eyebrow', text: 'Session done' }), el('h1', { text: 'Nice work.' })));
    main.append(el('div', { class: 'today' },
      el('div', { class: 'card stack' },
        el('div', { class: 'stat' },
          el('div', null, el('span', { class: 'v', text: Math.round((Date.now() - SES.startedAt) / 60000) + ' min' }), el('span', { class: 'l', text: 'practised' })),
          el('div', null, el('span', { class: 'v', text: SES.asked ? `${SES.right}/${SES.asked}` : '—' }), el('span', { class: 'l', text: 'quiz answers right' })),
          el('div', null, el('span', { class: 'v', text: p.playLevel >= 0 ? `Level ${p.playLevel + 1}` : '—' }), el('span', { class: 'l', text: 'play level reached' }))),
        el('div', { class: 'row' },
          el('button', { class: 'btn primary', onclick: () => go('stage', st.id, 'test') }, 'Take the ready test'),
          el('button', { class: 'btn', onclick: () => go('home') }, 'Back to Today'))),
      el('div', { class: 'card stack' }, el('h3', { text: 'Until next session' }), weekPlan(st))));
  }

  /* ---------- boot ---------- */
  paintRail();
  main.append(el('p', { class: 'muted', text: 'Loading your progress…' }));
  function renderLogin() {
    app.classList.add('login-mode');
    rail.hidden = true;
    main.innerHTML = '';
    const err = el('p', { class: 'muted', style: 'min-height:1.4em' });
    main.append(el('div', { class: 'login' },
      el('div', { class: 'login-card card' },
        el('span', { html: '<svg width="64" height="64" viewBox="0 0 28 28" aria-hidden="true"><defs><linearGradient id="fcg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3D9BFF"/><stop offset="1" stop-color="#0062E0"/></linearGradient></defs><rect width="28" height="28" rx="7" fill="url(#fcg2)"/><g stroke="#fff" stroke-opacity=".85" stroke-width="1.3" stroke-linecap="round"><line x1="6" y1="9" x2="22" y2="9"/><line x1="6" y1="14" x2="22" y2="14"/><line x1="6" y1="19" x2="22" y2="19"/></g><g stroke="#fff" stroke-opacity=".45" stroke-width="1"><line x1="11" y1="6" x2="11" y2="22"/><line x1="17" y1="6" x2="17" y2="22"/></g><circle cx="14" cy="14" r="3.4" fill="#FF9500" stroke="#fff" stroke-width="1.2"/></svg>' }),
        el('h1', { text: 'Fretboard Coach' }),
        el('p', { class: 'muted', text: '45-minute guitar sessions that tell you exactly what to practise. Sign in with your email so your progress saves to your own account.' }),
        (() => {
          const form = el('form', { class: 'login-form' });
          const input = el('input', { id: 'login-email', type: 'email', required: true, autocomplete: 'email', placeholder: 'you@example.com', 'aria-label': 'Email address' });
          const btn = el('button', { class: 'btn primary big', type: 'submit' }, 'Email me a sign-in link');
          form.append(input, btn);
          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = input.value.trim();
            if (!email) return;
            err.textContent = ''; btn.disabled = true; btn.textContent = 'Sending…';
            const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname, shouldCreateUser: true } });
            if (error) {
              btn.disabled = false; btn.textContent = 'Email me a sign-in link';
              err.textContent = /rate|limit|security purposes/i.test(error.message) ? 'Too many links sent just now. Wait a few minutes and try again.' : 'Couldn\u2019t send the link: ' + error.message;
              return;
            }
            form.replaceWith(el('div', { class: 'sent stack' },
              el('h2', { text: 'Check your email' }),
              el('p', null, 'We sent a sign-in link to ', el('b', { text: email }), '. Open it on this device and you\u2019re in.'),
              el('div', { class: 'spam-note' }, el('b', { text: 'Can\u2019t find it? ' }), 'Check your spam or junk folder. The first email often lands there. Mark it as "not spam" so the next one doesn\u2019t.'),
              el('p', { class: 'muted', text: 'You\u2019ll stay signed in on this device, so you only do this once.' }),
              el('button', { class: 'btn ghost', type: 'button', onclick: () => renderLogin() }, 'Use a different email')));
          });
          return form;
        })(),
        el('p', { class: 'muted small', text: 'No password needed. First time? The email may land in your spam folder.' }),
        err)));
  }
  Store.load().then((data) => {
    if (data && data.needLogin) return renderLogin();
    P = data; if (!byId(P.current)) P.current = 'notes'; paintRail(); render();
  }).catch((e) => { main.innerHTML = ''; main.append(el('div', { class: 'card' }, el('h2', { text: 'Couldn\u2019t load the app' }), el('p', { class: 'muted', text: String(e && e.message || e) }))); });
})();
