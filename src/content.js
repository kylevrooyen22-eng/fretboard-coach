/* ===== Stage content, figures and quiz generators ===== */
const STAGES = (function (G) {
  const { pick, rnd, shuffle, weighted, mod } = G;
  const NOTE_CHOICES = G.PC_LABEL.map((label, pc) => ({ label, value: pc }));
  const DEG_CHOICES = [1, 2, 3, 4, 5, 6, 7].map((d) => ({ label: String(d), value: d }));
  const ALL_KEYS = G.KEYS.map((k) => k.pc);
  const COMMON_KEYS = [0, 7, 2, 9, 4, 5];
  const C = 0;
  const kindOf = (deg) => deg === 1 ? 'root' : deg === 3 || deg === 4 ? 'white' : deg === 7 ? 'black' : 'note';
  const withKinds = (dots) => dots.map((d) => ({ ...d, kind: d.kind || (d.deg ? kindOf(d.deg) : 'note') }));
  const four = (correct, pool, key = (x) => x.value) => {
    const others = shuffle(pool.filter((p) => key(p) !== key(correct))).slice(0, 3);
    return shuffle([correct, ...others]);
  };
  const kn = (k) => G.keyName(k) + ' major';
  const triadName = (d, k) => (d === 7 ? G.nameIn(G.chordRootPc(7, k), k) + 'dim' : G.chordName(d, k));
  const an = (name) => (/^[AEF]/.test(name) ? 'an ' : 'a ') + name;
  const ordinal = (n) => n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');
  const span = (dots, pad = 1) => { const [a, b] = G.posSpan(dots); return [Math.max(0, a - pad), Math.min(17, Math.max(b + pad, a - pad + 6))]; };

  /* ---------- Stage 1: find any note ---------- */
  function q1() {
    const t = weighted([[40, 'ea'], [35, 'upper'], [25, 'find']]);
    if (t === 'find') {
      const s = pick([2, 3, 4, 5, 0, 1]);
      const pc = rnd(12);
      return {
        type: 'click', prompt: `Click any <b>${G.PC_LABEL[pc]}</b> on the <b>${G.STRING_NAMES[s]}</b> string.`,
        board: { lo: 0, hi: 15, dots: [] }, clickString: s,
        isCorrect: (cs, cf) => cs === s && G.pcAt(cs, cf) === pc,
        solution: [0, 12].map((o) => ({ s, f: G.mod(pc - G.OPEN_PC[s]) + o, kind: 'right', text: G.PC_SHORT[pc] })).filter((d) => d.f <= 15),
        explain: s <= 1 ? 'Use the landmark notes at frets 3, 5, 7, 9 and 12, then count up or down.' : 'Find it two strings down (towards low E), then use the octave shape: 2 strings up, 2 frets higher (3 frets when you land on B or high e).',
      };
    }
    const s = t === 'ea' ? pick([0, 1]) : pick([2, 3, 4, 5]);
    const f = t === 'ea' ? rnd(13) : 1 + rnd(12);
    const pc = G.pcAt(s, f);
    let explain;
    if (s <= 1) {
      const lm = [0, ...G.LANDMARKS].reduce((a, b) => Math.abs(b - f) < Math.abs(a - f) ? b : a);
      explain = `Nearest landmark: fret ${lm} on the ${G.STRING_NAMES[s]} string is ${G.PC_SHORT[G.pcAt(s, lm)]}` + (lm === f ? '.' : `, then count ${Math.abs(f - lm)} fret${Math.abs(f - lm) > 1 ? 's' : ''} ${f > lm ? 'up' : 'down'}.`);
    } else {
      const chain = G.traceToEA(s, f);
      const last = chain[chain.length - 1];
      explain = 'Trace it back with the octave shape: ' + chain.map((c) => `${G.STRING_SHORT[c.s]} fret ${c.f}`).join(' → ') + ` = ${G.PC_SHORT[G.pcAt(last.s, last.f)]}.`;
    }
    const chain = s > 1 ? G.traceToEA(s, f).slice(1) : [];
    return {
      type: 'choice', prompt: 'What note is this?',
      board: { lo: 0, hi: 15, dots: [{ s, f, kind: 'target', text: '?' }] },
      solutionBoard: chain.length ? { lo: 0, hi: 15, dots: [{ s, f, kind: 'right', text: G.PC_SHORT[pc] }, ...chain.map((c) => ({ ...c, kind: 'note', text: G.PC_SHORT[pc] }))], links: chain.map((c, i) => { const a = i === 0 ? { s, f } : chain[i - 1]; return [a.s, a.f, c.s, c.f]; }) } : null,
      choices: NOTE_CHOICES, answer: pc, explain,
    };
  }

  /* ---------- Stage 2: intervals ---------- */
  const CROSS_RULE = { '1,-2': 'next string up, two frets lower = minor 3rd', '1,-1': 'next string up, one fret lower = major 3rd', '1,0': 'next string up, same fret = perfect 4th', '1,1': 'next string up, one fret higher = tritone', '1,2': 'next string up, two frets higher = perfect 5th', '2,2': 'two strings up, two frets higher = octave', '2,0': 'two strings up, same fret = minor 7th', '2,-1': 'two strings up, one fret lower = major 6th' };
  function q2() {
    const t = weighted([[45, 'same'], [30, 'cross'], [25, 'count']]);
    if (t === 'count') {
      const n = 1 + rnd(12);
      const opts = four({ label: String(n), value: n }, [...Array(12)].map((_, i) => ({ label: String(i + 1), value: i + 1 })));
      return { type: 'choice', prompt: `How many frets wide is a <b>${G.INTERVALS[n]}</b>?`, choices: opts, answer: n, explain: `${G.INTERVALS[n]} = ${n} fret${n > 1 ? 's' : ''} (semitones).` };
    }
    let s1, f1, s2, f2, crossRule = '';
    if (t === 'same') { s1 = pick([0, 1]); f1 = 1 + rnd(5); const n = 1 + rnd(12); s2 = s1; f2 = f1 + n; }
    else {
      const shapes = [[1, -2], [1, -1], [1, 0], [1, 2], [2, 2], [1, 1], [2, 0], [2, -1]]; // m3, M3, P4, P5, octave, tritone, m7, M6
      const [ds, df] = pick(shapes); s1 = pick([0, 1]); f1 = 3 + rnd(5); s2 = s1 + ds; f2 = f1 + df; crossRule = CROSS_RULE[ds + ',' + df];
    }
    const n = G.midiAt(s2, f2) - G.midiAt(s1, f1);
    const pool = G.INTERVALS.slice(1).map((label, i) => ({ label, value: i + 1 }));
    return {
      type: 'choice', prompt: 'The orange note is the root. What is the interval up to the other note?',
      board: { lo: 0, hi: 17, dots: [{ s: s1, f: f1, kind: 'root', text: 'R' }, { s: s2, f: f2, kind: 'target', text: '?' }] },
      choices: four({ label: G.INTERVALS[n], value: n }, pool), answer: n,
      explain: `${n} semitone${n > 1 ? 's' : ''} up = ${G.INTERVALS[n]}.` + (t === 'cross' ? ' Shape: ' + crossRule + '.' : ''),
    };
  }

  /* ---------- Stage 3: major scale + numbers ---------- */
  function q3() {
    const k = pick(ALL_KEYS); const sc = G.spelledScale(k);
    const t = weighted([[40, 'nth'], [40, 'which'], [20, 'notin']]);
    if (t === 'nth') {
      const d = 2 + rnd(6);
      const pool = [...new Set([...sc, ...[...Array(12)].map((_, i) => G.nameIn(i, k))])].map((l) => ({ label: l, value: l }));
      return { type: 'choice', prompt: `What is note <b>${d}</b> of <b>${kn(k)}</b>?`, choices: four({ label: sc[d - 1], value: sc[d - 1] }, pool), answer: sc[d - 1], explain: `${kn(k)}: ${sc.map((n, i) => `${i + 1}=${n}`).join('  ')}` };
    }
    if (t === 'which') {
      const d = 1 + rnd(7);
      return { type: 'choice', prompt: `In <b>${kn(k)}</b>, what number is <b>${sc[d - 1]}</b>?`, choices: DEG_CHOICES, answer: d, explain: `${kn(k)}: ${sc.map((n, i) => `${i + 1}=${n}`).join('  ')}` };
    }
    const out = shuffle([...Array(12)].map((_, i) => i).filter((pc) => !G.degreeOf(pc, k)))[0];
    const ins = shuffle(sc).slice(0, 3);
    const outName = G.nameIn(out, k);
    return { type: 'choice', prompt: `Which note is <b>not</b> in <b>${kn(k)}</b>?`, choices: shuffle([...ins, outName].map((l) => ({ label: l, value: l }))), answer: outName, explain: `${kn(k)} = ${sc.join(' ')}` };
  }

  /* ---------- Stage 4: chords in a key ---------- */
  const chordPool = (k) => { const a = []; G.scalePcs(k).forEach((pc) => { const n = G.nameIn(pc, k); a.push(n, n + 'm'); }); return [...new Set(a)].map((l) => ({ label: l, value: l })); };
  function q4() {
    const k = weighted([[70, pick(COMMON_KEYS)], [30, pick(ALL_KEYS)]]);
    const t = weighted([[40, 'name'], [35, 'number'], [25, 'quality']]);
    const list = [1, 2, 3, 4, 5, 6, 7].map((d) => `${d}=${G.chordName(d, k)}`).join('  ');
    if (t === 'name') {
      const d = 1 + rnd(7); const name = G.chordName(d, k);
      return { type: 'choice', prompt: `What is chord <b>${d}</b> in <b>${kn(k)}</b>?`, choices: four({ label: name, value: name }, chordPool(k)), answer: name, explain: `${kn(k)}: ${list}` };
    }
    if (t === 'number') {
      const d = 1 + rnd(6); const name = G.chordName(d, k);
      return { type: 'choice', prompt: `In <b>${kn(k)}</b>, <b>${name}</b> is chord number…`, choices: DEG_CHOICES, answer: d, explain: `${kn(k)}: ${list}` };
    }
    const d = 1 + rnd(7);
    const q = G.QUAL[d - 1];
    return { type: 'choice', prompt: `In any major key, chord <b>${d}</b> is…`, choices: [{ label: 'Major', value: 'M' }, { label: 'Minor', value: 'm' }, { label: 'Diminished', value: 'dim' }], answer: q, explain: '1, 4, 5 are major. 2, 3, 6 are minor. 7 is diminished (played as m7♭5).' };
  }

  /* ---------- Roadmaps (stages 5, 6) ---------- */
  const RM_KEYS = { 1: [7, 9, 5, 8, 6], 2: [0, 2, 4, 11, 10, 3, 1] };
  function rmBoard(n, k, opts = {}) {
    const r = G.roadmap(n, k);
    const dots = r.dots.map((d) => ({ ...d, kind: d.deg === 1 ? 'root' : 'note', text: String(d.deg) }));
    return { r, spec: { lo: Math.max(0, r.root - 2), hi: Math.min(17, r.root + 8), dots, ...opts } };
  }
  function qRoadmap(n) {
    return function () {
      const t = weighted([[40, 'click'], [30, 'which'], [20, 'shape'], ...(n === 2 ? [[15, 'pick']] : [])]);
      const k = weighted([[75, pick(RM_KEYS[n])], [25, pick(ALL_KEYS)]]);
      const r = G.roadmap(n, k);
      if (t === 'pick') {
        const kk = pick(ALL_KEYS); const b = G.bestRoadmap(kk);
        return { type: 'choice', prompt: `Key of <b>${G.keyName(kk)}</b>. Which roadmap keeps your hand lowest on the neck?`, choices: [{ label: 'Roadmap 1 (root on low E)', value: 1 }, { label: 'Roadmap 2 (root on A)', value: 2 }], answer: b, explain: `${G.keyName(kk)} sits at fret ${G.fretOf(kk, 0, 1)} on low E and fret ${G.fretOf(kk, 1, 1)} on A. Pick the lower one.` };
      }
      if (t === 'click') {
        const d = 2 + rnd(6); const target = r.dots.find((x) => x.deg === d);
        const lo = Math.max(0, r.root - 2), hi = Math.min(17, r.root + 8);
        return {
          type: 'click', prompt: `<b>Roadmap ${n}</b> in <b>${kn(k)}</b>. Chord 1 is shown. Click the root of chord <b>${d}</b> (${G.chordName(d, k)}).`,
          board: { lo, hi, dots: [{ ...r.dots[0], kind: 'root', text: '1' }] },
          isCorrect: (cs, cf) => cs === target.s && (cf === target.f || cf === target.f - 12 || cf === target.f + 12),
          solution: [{ s: target.s, f: target.f, kind: 'right', text: String(d) }],
          explain: `Roadmap ${n}: ${n === 1 ? '1-2-3 along low E, 4-5-6 right above on A, 7 two frets further.' : '1-2-3-4 along A, 5-6-7-1 right below on low E.'}`,
        };
      }
      if (t === 'which') {
        const target = pick(r.dots.filter((x) => x.deg !== 1));
        const dots = r.dots.map((x) => ({ ...x, kind: x === target ? 'target' : x.deg === 1 && x === r.dots[0] ? 'root' : 'ghost', text: x === target ? '?' : x === r.dots[0] ? '1' : '' }));
        return { type: 'choice', prompt: `<b>Roadmap ${n}</b> in <b>${kn(k)}</b>. Which chord number is the highlighted root?`, board: { lo: Math.max(0, r.root - 2), hi: Math.min(17, r.root + 8), dots }, choices: DEG_CHOICES, answer: target.deg, explain: `That's chord ${target.deg}: ${G.chordName(target.deg, k)}.` };
      }
      const d = 1 + rnd(7);
      const shape = G.shapeFor(n, d);
      const pool = ['E-shape major', 'E-shape minor', 'A-shape major', 'A-shape minor', 'm7♭5 shape'].map((l) => ({ label: l, value: l }));
      return { type: 'choice', prompt: `<b>Roadmap ${n}</b>: which barre shape plays chord <b>${d}</b> in its main spot (not a shortcut)?`, choices: four({ label: shape, value: shape }, pool), answer: shape, explain: `Chord ${d} is ${d === 7 ? 'the m7♭5' : G.QUAL_WORD[G.QUAL[d - 1]]} and its main root spot is on the ${G.roadmap(n, 0).dots.find((x) => x.deg === d).s === 0 ? 'low E' : 'A'} string.` };
    };
  }

  /* ---------- Stage 7: keystones ---------- */
  function q7() {
    const t = weighted([[45, 'click'], [30, 'which'], [25, 'nums']]);
    const k = pick(ALL_KEYS);
    if (t === 'nums') {
      const w = pick(['white', 'black']);
      return { type: 'choice', prompt: `The <b>${w}</b> keystone is the 1-fret step between which numbers?`, choices: shuffle(['3 → 4', '7 → 1', '1 → 2', '5 → 6'].map((l) => ({ label: l, value: l }))), answer: w === 'white' ? '3 → 4' : '7 → 1', explain: 'White keystone = 3 → 4. Black keystone = 7 → 1. They are the only 1-fret steps in the major scale.' };
    }
    const s = pick([5, 0]);
    const ks = G.keystones(s, k);
    if (t === 'click') {
      const w = pick(['white', 'black']);
      const targets = ks.filter((x) => x.type === w);
      return {
        type: 'click', prompt: `Key of <b>${G.keyName(k)}</b> on the <b>${G.STRING_NAMES[s]}</b> string: click the first note of the <b>${w}</b> keystone (note ${w === 'white' ? 3 : 7}).`,
        board: { lo: 0, hi: 15, dots: [] }, clickString: s,
        isCorrect: (cs, cf) => cs === s && G.pcAt(cs, cf) === G.scalePcs(k)[w === 'white' ? 2 : 6],
        solution: targets.flatMap((x) => [{ s, f: x.f, kind: w, text: w === 'white' ? '3' : '7' }, { s, f: x.f2, kind: w === 'white' ? 'white' : 'root', text: w === 'white' ? '4' : '1' }]),
        explain: `In ${G.keyName(k)}, note ${w === 'white' ? 3 : 7} is ${G.spelledScale(k)[w === 'white' ? 2 : 6]}.`,
      };
    }
    const x = pick(ks);
    return {
      type: 'choice', prompt: `Key of <b>${G.keyName(k)}</b>. Is the highlighted pair the white or the black keystone?`,
      board: { lo: 0, hi: 15, dots: [{ s, f: x.f, kind: 'target', text: '' }, { s, f: x.f2, kind: 'target', text: '' }] },
      choices: [{ label: 'White (3 → 4)', value: 'white' }, { label: 'Black (7 → 1)', value: 'black' }], answer: x.type,
      explain: `Those notes are ${G.nameIn(G.pcAt(s, x.f), k)} → ${G.nameIn(G.pcAt(s, x.f2), k)}, numbers ${x.type === 'white' ? '3 → 4' : '7 → 1'} in ${G.keyName(k)}.`,
    };
  }

  /* ---------- Positions (stages 8-10, 13) ---------- */
  function posQuestion(p, k, mode) {
    const dots = G.position(p, k);
    const [lo, hi] = span(dots);
    if (mode === 'deg') {
      const target = pick(dots);
      return { type: 'choice', prompt: `<b>Position ${p}</b> in ${G.keyLabel(k)}. What number is the highlighted note?`, board: { lo, hi, dots: dots.map((d) => ({ ...d, kind: d === target ? 'target' : 'ghost', text: d === target ? '?' : '' })) }, choices: DEG_CHOICES, answer: target.deg, explain: `It's ${G.nameIn(G.pcAt(target.s, target.f), k)}, note ${target.deg} of ${G.keyName(k)} major.` };
    }
    const d = 1 + rnd(7);
    return {
      type: 'click', prompt: `<b>Position ${p}</b> in ${G.keyLabel(k)}. Click any note <b>${d}</b> (${G.spelledScale(k)[d - 1]}).`,
      board: { lo, hi, dots: dots.map((x) => ({ ...x, kind: 'ghost', text: '' })) },
      isCorrect: (cs, cf) => dots.some((x) => x.s === cs && x.f === cf && x.deg === d),
      solution: dots.filter((x) => x.deg === d).map((x) => ({ ...x, kind: 'right', text: String(d) })),
      explain: `Every ${d} in this shape is ${G.spelledScale(k)[d - 1]}.`,
    };
  }
  function whichPosition(k, among) {
    const p = pick(among);
    const dots = G.position(p, k);
    const [lo, hi] = span(dots);
    return { type: 'choice', prompt: `Which position is this? (${G.keyLabel(k)})`, board: { lo, hi, dots: withKinds(dots).map((d) => ({ ...d, text: String(d.deg) })) }, choices: among.map((x) => ({ label: 'Position ' + x, value: x })), answer: p, explain: `Position ${p}: the low E string plays ${dots.filter((d) => d.s === 0).map((d) => d.deg).join(' – ')}.` + (p === 1 ? ' It starts on the minor root (6) and finishes on the black keystone (7 → 1).' : p === 4 ? ' It starts on the white keystone (3 → 4).' : '') };
  }
  function startFret(k) {
    const f = G.pos1StartFret(k);
    const m = G.relMinorFretE(k);
    return {
      type: 'click', prompt: `Key of <b>${G.keyLabel(k)}</b>. Click the <b>minor root on the low E string</b> that anchors position 1.`,
      board: { lo: 0, hi: 15, dots: [] }, clickString: 0,
      isCorrect: (cs, cf) => cs === 0 && cf >= 1 && G.pcAt(0, cf) === G.mod(k + 9),
      solution: [m, m + 12, m - 12].filter((x) => x >= 1 && x <= 15).map((x) => ({ s: 0, f: x, kind: 'root', text: G.relMinorName(k).replace('m', '') })),
      explain: `${G.relMinorName(k)} is the relative minor of ${G.keyName(k)}. Its root on low E (fret ${m}) is the first note of position 1. (The shape reaches one fret lower, to fret ${f}, on the G string.)`,
    };
  }
  function q8() {
    const t = weighted([[40, 'deg'], [35, 'click'], [15, 'start'], [10, 'pent']]);
    if (t === 'start') return startFret(pick([0, 7, 2]));
    if (t === 'pent') return { type: 'choice', prompt: 'Which two numbers do you add to the pentatonic to get the full 7-note scale?', choices: shuffle(['4 and 7', '2 and 6', '3 and 5', '1 and 4'].map((l) => ({ label: l, value: l }))), answer: '4 and 7', explain: 'Pentatonic = the major scale without 4 and 7. Those are the top note of the white keystone and the bottom note of the black keystone.' };
    return posQuestion(1, C, t);
  }
  function q9() {
    const t = weighted([[35, 'deg'], [30, 'click'], [35, 'which']]);
    if (t === 'which') return whichPosition(C, [5, 1, 2]);
    return posQuestion(pick([2, 5]), C, t);
  }
  function q10() {
    const t = weighted([[30, 'deg'], [25, 'click'], [45, 'which']]);
    if (t === 'which') return whichPosition(C, [1, 2, 3, 4, 5]);
    return posQuestion(pick([3, 4]), C, t);
  }

  /* ---------- Stage 11: CAGED, one chord everywhere ---------- */
  const CAGED_CH = ['C', 'A', 'G', 'E', 'D'].map((l) => ({ label: l + ' shape', value: l }));
  const CAGED_MIN_CH = ['Cm', 'Am', 'Gm', 'Em', 'Dm'].map((l) => ({ label: l + ' shape', value: l }));
  function q11() {
    const t = weighted([[35, 'which'], [40, 'see'], [25, 'minor']]);
    const p = 1 + rnd(5);
    if (t === 'which') return { type: 'choice', prompt: `In any major key, which CAGED shape of the <b>1 chord</b> lives inside <b>position ${p}</b>?`, choices: CAGED_CH, answer: G.CAGED_MAJOR[p], explain: 'Up the neck: C shape = position 4, A = 5, G = 1, E = 2, D = 3.' };
    if (t === 'minor') return { type: 'choice', prompt: `Which <b>minor</b> shape of the 6 chord (the relative minor) lives inside <b>position ${p}</b>?`, choices: CAGED_MIN_CH, answer: G.CAGED_MINOR[p], explain: 'Minor shapes: Am = position 4, Gm = 5, Em = 1, Dm = 2, Cm = 3.' };
    const dots = G.position(p, C);
    const tones = G.chordTonesIn(dots, 1, C);
    const [lo, hi] = span(dots);
    return { type: 'choice', prompt: 'These are the C major chord tones inside one position. Which CAGED shape is it?', board: { lo, hi, dots: [...dots.map((d) => ({ ...d, kind: 'ghost', text: '' })), ...tones.map((d) => ({ ...d, kind: d.role === 'R' ? 'root' : 'note', text: d.role }))] }, choices: CAGED_CH, answer: G.CAGED_MAJOR[p], explain: `That's position ${p}, home of the ${G.CAGED_MAJOR[p]} shape.` };
  }

  /* ---------- Stage 12: CAGED, every chord in one spot ---------- */
  function q12() {
    const t = weighted([[50, 'see'], [50, 'shape']]);
    const p = 1;
    const d = 1 + rnd(6);
    const code = G.CAGED_VERTICAL[p][d - 1];
    if (t === 'shape') {
      const pool = ['C', 'A', 'G', 'E', 'D', 'Cm', 'Am', 'Gm', 'Em', 'Dm'].map((l) => ({ label: l + ' shape', value: l }));
      return { type: 'choice', prompt: `Inside <b>position ${p}</b> of C major, which shape plays chord <b>${d}</b> (${G.chordName(d, C)})?`, choices: four({ label: code + ' shape', value: code }, pool), answer: code, explain: `Position ${p}: ` + G.CAGED_VERTICAL[p].slice(0, 6).map((c, i) => `${G.chordName(i + 1, C)} = ${c}`).join(', ') + '.' };
    }
    const dots = G.position(p, C);
    const tones = G.chordTonesIn(dots, d, C);
    const [lo, hi] = span(dots);
    const names = [1, 2, 3, 4, 5, 6].map((x) => ({ label: G.chordName(x, C), value: x }));
    return { type: 'choice', prompt: `Position ${p} in C major. Which chord's tones are highlighted?`, board: { lo, hi, dots: [...dots.map((x) => ({ ...x, kind: 'ghost', text: '' })), ...tones.map((x) => ({ ...x, kind: x.role === 'R' ? 'root' : 'note', text: x.role }))] }, choices: names, answer: d, explain: `${G.chordName(d, C)} (chord ${d}), played with the ${code} shape here.` };
  }

  /* ---------- Stage 13: connecting it all ---------- */
  function q13() {
    const k = pick(ALL_KEYS);
    const t = weighted([[25, 'start'], [20, 'rel'], [20, 'stone'], [15, 'rm'], [20, 'deg']]);
    if (t === 'start') return startFret(k);
    if (t === 'rel') { const ans = G.relMinorName(k); const pool = ALL_KEYS.map((x) => ({ label: G.relMinorName(x), value: G.relMinorName(x) })); return { type: 'choice', prompt: `What is the relative minor of <b>${kn(k)}</b>?`, choices: four({ label: ans, value: ans }, pool), answer: ans, explain: 'The relative minor is chord 6 of the key: count 3 frets down from the major root.' }; }
    if (t === 'stone') {
      const str = pick(['low E', 'A']);
      return { type: 'choice', prompt: `Key of <b>${G.keyName(k)}</b>. You play the <b>${G.relMinorName(k)}</b> barre chord with its root on the <b>${str}</b> string. Which position are you in?`, choices: [{ label: 'Position 1 (black keystone 2–3 frets above the barre)', value: 'black' }, { label: 'Position 4 (white keystone right under the barre)', value: 'white' }], answer: str === 'A' ? 'white' : 'black', explain: 'Relative-minor barre on low E = position 1; the black keystone (7 → 1) is 2 and 3 frets above the barre on both E strings. On the A string = position 4; your barre finger is on the white keystone (3 → 4) on low E.' };
    }
    if (t === 'rm') { const b = G.bestRoadmap(k); return { type: 'choice', prompt: `Key of <b>${G.keyName(k)}</b>. Which chord roadmap keeps you lowest on the neck?`, choices: [{ label: 'Roadmap 1 (root on low E)', value: 1 }, { label: 'Roadmap 2 (root on A)', value: 2 }], answer: b, explain: `${G.keyName(k)}: fret ${G.fretOf(k, 0, 1)} on low E, fret ${G.fretOf(k, 1, 1)} on A. Pick the lower one.` }; }
    return posQuestion(1, k, 'deg');
  }

  /* ---------- Stage 14: jamming in real keys ---------- */
  function q14() {
    const t = weighted([[50, 'key'], [25, 'prog'], [25, 'rm']]);
    const k = pick(ALL_KEYS);
    if (t === 'key') {
      const prog = pick([[1, 5, 6, 4], [6, 4, 1, 5], [1, 4, 5], [2, 5, 1], [6, 2, 5, 1], [1, 6, 4, 5], [4, 1, 5, 6]]);
      const names = prog.map((d) => G.chordName(d, k));
      const pool = ALL_KEYS.map((x) => ({ label: G.keyLabel(x), value: x }));
      return { type: 'choice', prompt: `A song uses these chords: <b>${names.join(' – ')}</b>. What key is it in?`, choices: four({ label: G.keyLabel(k), value: k }, pool), answer: k, explain: `In ${G.keyName(k)} major those are chords ${prog.join(' – ')}. Look for the one chord set where every chord fits.` };
    }
    if (t === 'prog') {
      const prog = pick([[1, 5, 6, 4], [6, 4, 1, 5], [1, 4, 5, 1], [2, 5, 1, 6], [1, 6, 2, 5]]);
      const right = prog.map((d) => G.chordName(d, k)).join(' – ');
      const wrongs = [[...prog].reverse(), prog.map((d) => (d % 7) + 1), prog.map((d) => d === 1 ? 4 : d === 4 ? 1 : d)].map((p) => p.map((d) => G.chordName(d, k)).join(' – ')).filter((x) => x !== right);
      const ch = shuffle([right, ...[...new Set(wrongs)].slice(0, 3)]).map((l) => ({ label: l, value: l }));
      return { type: 'choice', prompt: `Play <b>${prog.join(' – ')}</b> in <b>${kn(k)}</b>. Which chords are those?`, choices: ch, answer: right, explain: `${kn(k)}: ` + [1, 2, 3, 4, 5, 6].map((d) => `${d}=${G.chordName(d, k)}`).join('  ') };
    }
    const b = G.bestRoadmap(k);
    return { type: 'choice', prompt: `A song is in <b>${kn(k)}</b>. Which roadmap do you reach for?`, choices: [{ label: 'Roadmap 1 (root on low E)', value: 1 }, { label: 'Roadmap 2 (root on A)', value: 2 }], answer: b, explain: `${G.keyName(k)}: fret ${G.fretOf(k, 0, 1)} on low E, fret ${G.fretOf(k, 1, 1)} on A. Pick the lower one.` };
  }

  /* ---------- Stage 15: triads ---------- */
  function q15() {
    const k = weighted([[70, C], [30, pick(COMMON_KEYS)]]);
    const d = pick([1, 2, 3, 4, 5, 6]);
    const minor = G.QUAL[d - 1] === 'm';
    const set = pick(G.STRING_SETS.slice(0, 3));
    const v = pick(G.triadVoicings(G.chordRootPc(d, k), minor, set));
    const lo = Math.max(0, Math.min(...v.frets) - 2), hi = Math.min(17, Math.max(...v.frets) + 3);
    const t = weighted([[35, 'quality'], [35, 'inv'], [30, 'bass']]);
    const dots = v.set.map((s, i) => ({ s, f: v.frets[i], kind: t === 'quality' ? (v.roles[i] === 'R' ? 'root' : 'note') : 'note', text: t === 'quality' ? v.roles[i] : '' }));
    if (t === 'quality') return { type: 'choice', prompt: `This triad's root is ${G.nameIn(G.chordRootPc(d, k), k)}. Major or minor?`, board: { lo, hi, dots }, choices: [{ label: 'Major', value: 'M' }, { label: 'Minor', value: 'm' }], answer: minor ? 'm' : 'M', explain: `Count up from the root to the 3rd: ${minor ? '3 semitones (minor 3rd)' : '4 semitones (major 3rd)'}, so it's ${G.chordName(d, k)}. Its notes: ${G.chordPcs(d, k).map((pc) => G.nameIn(pc, k)).join(' ')}.` };
    if (t === 'inv') return { type: 'choice', prompt: `This is ${an(G.chordName(d, k)).replace(/ (.+)$/, ' <b>$1</b>')} triad on the ${G.SET_NAME(v.set)} strings. Which inversion?`, board: { lo, hi, dots }, choices: ['root position', '1st inversion', '2nd inversion'].map((l) => ({ label: l, value: l })), answer: v.inversion, explain: `Lowest note is the ${v.roles[0] === 'R' ? 'root' : v.roles[0] === '3' ? '3rd' : '5th'}: ${v.inversion}. (Notes low to high: ${v.roles.join(' ')})` };
    return { type: 'choice', prompt: `<b>${G.chordName(d, k)}</b> triad. What is its <b>lowest</b> note: root, 3rd or 5th?`, board: { lo, hi, dots }, choices: [{ label: 'Root', value: 'R' }, { label: '3rd', value: '3' }, { label: '5th', value: '5' }], answer: v.roles[0], explain: `Low to high: ${v.roles.join(' – ')} (${v.inversion}).` };
  }

  /* ---------- Stage 16: lead + rhythm, songs, writing ---------- */
  function q16() {
    const t = weighted([[45, 'hand'], [35, 'prog'], [20, 'pull']]);
    if (t === 'hand') {
      const d = 1 + rnd(7);
      const pos = { 1: 5, 5: 5, 2: 1, 6: 1, 3: 2, 4: 2, 7: 2 }[d];
      const where = d === 1 ? ' at fret 3 on the A string' : '';
      return { type: 'choice', prompt: `Roadmap 2 in C. You hold <b>chord ${d} (${G.chordName(d, C)})</b>${where}. Which scale position is under your hand?`, choices: [{ label: 'Position 5', value: 5 }, { label: 'Position 1', value: 1 }, { label: 'Position 2', value: 2 }], answer: pos, explain: 'Fret 3 (chords 1 and 5) sits on position 5. Fret 5 (chords 2 and 6) sits on position 1. Frets 7–8 (chords 3, 4, 7) sit on position 2.' };
    }
    if (t === 'pull') return { type: 'choice', prompt: 'Of these four, which chord pulls hardest back to chord 1?', choices: shuffle([7, 2, 3, 6].map((x) => ({ label: 'Chord ' + x, value: x }))), answer: 7, explain: 'Chord 7 (the m7♭5) has its root one fret under the key\'s root, so it pulls hard back to 1. (Chord 5 pulls to 1 too; it\'s the most common way to end a phrase.) 1, 4, 5 and 6 are the workhorse chords for writing.' };
    return q14();
  }

  /* ---------- Callout helpers for Play drills ---------- */
  const NATURALS = [0, 2, 4, 5, 7, 9, 11];
  const keyCall = (pool) => () => { const k = pick(pool); return { big: G.keyName(k), small: 'major  ·  ' + G.relMinorName(k) }; };

  /* ---------- Figures ---------- */
  const fig = {
    landmarks: () => [{ label: 'Landmarks', spec: { lo: 0, hi: 12, dots: [0, 1].flatMap((s) => G.LANDMARKS.map((f) => ({ s, f, kind: f === 12 ? 'root' : 'note', text: G.PC_SHORT[G.pcAt(s, f)] }))) } }],
    octaves: () => [
      { label: 'Low E → D', spec: { lo: 0, hi: 12, dots: [{ s: 0, f: 3, kind: 'root', text: 'G' }, { s: 2, f: 5, kind: 'note', text: 'G' }, { s: 0, f: 7, kind: 'root', text: 'B' }, { s: 2, f: 9, kind: 'note', text: 'B' }], links: [[0, 3, 2, 5], [0, 7, 2, 9]] } },
      { label: 'A → G', spec: { lo: 0, hi: 12, dots: [{ s: 1, f: 3, kind: 'root', text: 'C' }, { s: 3, f: 5, kind: 'note', text: 'C' }, { s: 1, f: 7, kind: 'root', text: 'E' }, { s: 3, f: 9, kind: 'note', text: 'E' }], links: [[1, 3, 3, 5], [1, 7, 3, 9]] } },
      { label: 'Onto B and e (+1)', spec: { lo: 0, hi: 12, dots: [{ s: 2, f: 5, kind: 'root', text: 'G' }, { s: 4, f: 8, kind: 'note', text: 'G' }, { s: 3, f: 5, kind: 'root', text: 'C' }, { s: 5, f: 8, kind: 'note', text: 'C' }], links: [[2, 5, 4, 8], [3, 5, 5, 8]] } },
    ],
    intervals: () => [
      { label: 'One string', spec: { lo: 4, hi: 17, dots: [{ s: 0, f: 5, kind: 'root', text: 'R' }, ...[...Array(12)].map((_, i) => ({ s: 0, f: 6 + i, kind: [3, 4, 7, 12].includes(i + 1) ? 'note' : 'ghost', text: G.INT_SHORT[i + 1] }))] } },
      { label: 'Across strings', spec: { lo: 1, hi: 9, dots: [{ s: 0, f: 5, kind: 'root', text: 'R' }, { s: 1, f: 3, kind: 'note', text: 'm3' }, { s: 1, f: 4, kind: 'note', text: 'M3' }, { s: 1, f: 5, kind: 'note', text: 'P4' }, { s: 1, f: 7, kind: 'note', text: 'P5' }, { s: 2, f: 7, kind: 'note', text: '8va' }] } },
    ],
    scaleOnString: (k) => [{ label: 'A string', spec: { lo: 0, hi: 15, dots: withKinds(G.stringScale(1, k)).map((d) => ({ ...d, text: String(d.deg) })) } }, { label: 'Low E', spec: { lo: 0, hi: 15, dots: withKinds(G.stringScale(0, k)).map((d) => ({ ...d, text: String(d.deg) })) } }],
    barreShapes: () => {
      const role = (root, s, f) => ({ 0: 'R', 3: '♭3', 4: '3', 6: '♭5', 7: '5', 10: '♭7' })[G.mod(G.pcAt(s, f) - root)] || '';
      const mk = (frets, rootPc, lo, hi) => ({ lo, hi, dots: frets.map((f, s) => f == null ? null : { s, f, kind: role(rootPc, s, f) === 'R' ? 'root' : 'note', text: role(rootPc, s, f) }).filter(Boolean) });
      return [
        { label: 'E-shape major (G)', spec: mk([3, 5, 5, 4, 3, 3], 7, 1, 7) },
        { label: 'E-shape minor (Gm)', spec: mk([3, 5, 5, 3, 3, 3], 7, 1, 7) },
        { label: 'A-shape major (C)', spec: mk([null, 3, 5, 5, 5, 3], 0, 1, 7) },
        { label: 'A-shape minor (Cm)', spec: mk([null, 3, 5, 5, 4, 3], 0, 1, 7) },
        { label: 'm7♭5 on low E (Bm7♭5)', spec: mk([7, 8, 7, 7, null, null], 11, 5, 11) },
        { label: 'm7♭5 on A (F♯m7♭5)', spec: mk([null, 9, 10, 9, 10, null], 6, 7, 12) },
      ];
    },
    roadmap: (n) => (k) => {
      const r = G.roadmap(n, k);
      const dots = [...r.alts.map((d) => ({ ...d, kind: 'ghost', text: String(d.deg) })), ...r.dots.map((d) => ({ ...d, kind: d.deg === 1 ? 'root' : G.QUAL[d.deg - 1] === 'M' ? 'note' : 'minor', text: String(d.deg) }))];
      return [{ label: `Roadmap ${n} in ${G.keyName(k)}`, spec: { lo: Math.max(0, r.root - 2), hi: Math.min(17, r.root + 8), dots }, caption: r.dots.map((d) => `${d.deg} ${G.chordName(d.deg, k)}`).join(' · ') }];
    },
    keystones: (k) => [5, 0].map((s) => ({ label: G.STRING_NAMES[s] + ' string', spec: { lo: 0, hi: 15, dots: withKinds(G.stringScale(s, k)) } })),
    pos: (list, opts = {}) => (k) => list.map((p) => {
      let dots = G.position(p, k);
      if (opts.pentOnly) dots = dots.filter((d) => G.isPent(d.deg));
      const [lo, hi] = span(dots);
      return { label: `Position ${p}`, spec: { lo, hi, dots: withKinds(dots) } };
    }),
    pos1Both: (k) => {
      const dots = G.position(1, k);
      const [lo, hi] = span(dots);
      return [
        { label: 'Full scale', spec: { lo, hi, dots: withKinds(dots) } },
        { label: 'Pentatonic only', spec: { lo, hi, dots: withKinds(dots.filter((d) => G.isPent(d.deg))) } },
      ];
    },
    neck: (k) => [{ label: 'Whole neck', spec: { lo: 0, hi: 15, dots: withKinds([0, 1, 2, 3, 4, 5].flatMap((s) => G.stringScale(s, k))) } }],
    cagedH: (k) => [4, 5, 1, 2, 3].map((p) => {
      const dots = G.position(p, k); const tones = G.chordTonesIn(dots, 1, k); const [lo, hi] = span(dots);
      return { label: `${G.CAGED_MAJOR[p]} shape · pos ${p}`, spec: { lo, hi, dots: [...dots.map((d) => ({ ...d, kind: 'ghost', text: '' })), ...tones.map((d) => ({ ...d, kind: d.role === 'R' ? 'root' : 'note', text: d.role }))] } };
    }),
    cagedHMinor: (k) => [4, 5, 1, 2, 3].map((p) => {
      const dots = G.position(p, k); const tones = G.chordTonesIn(dots, 6, k); const [lo, hi] = span(dots);
      return { label: `${G.CAGED_MINOR[p]} shape · pos ${p}`, spec: { lo, hi, dots: [...dots.map((d) => ({ ...d, kind: 'ghost', text: '' })), ...tones.map((d) => ({ ...d, kind: d.role === 'R' ? 'root' : 'minor', text: d.role }))] } };
    }),
    cagedV: (k) => [1, 2, 3, 4, 5, 6, 7].map((d) => {
      const dots = G.position(1, k); const tones = G.chordTonesIn(dots, d, k); const [lo, hi] = span(dots);
      return { label: `${d} · ${triadName(d, k)}`, caption: G.shapeLabel(G.CAGED_VERTICAL[1][d - 1]), spec: { lo, hi, dots: [...dots.map((x) => ({ ...x, kind: 'ghost', text: '' })), ...tones.map((x) => ({ ...x, kind: x.role === 'R' ? 'root' : 'note', text: x.role }))] } };
    }),
    map: (k) => {
      const n = G.bestRoadmap(k); const r = G.roadmap(n, k); const p1 = G.positionNear(1, k, r.root + 2, 15);
      const ks = [0, 5].flatMap((s) => G.keystones(s, k).flatMap((x) => [{ s, f: x.f }, { s, f: x.f2 }]));
      return [
        { label: 'Position 1 + roadmap', caption: `Roadmap ${n} roots (rings) with position 1 in ${G.keyName(k)}.`, spec: { lo: 0, hi: 15, dots: [...withKinds(p1), ...r.dots.map((d) => ({ ...d, kind: 'ring', text: '' }))] } },
        { label: 'Keystones on both E strings', spec: { lo: 0, hi: 15, dots: withKinds(ks.map((x) => ({ ...x, deg: G.degreeOf(G.pcAt(x.s, x.f), k) }))) } },
        { label: 'Diagonal pentatonic', caption: 'Two notes, then three with a slide on the last step. Repeat up each pair of strings.', spec: (() => { const dg = G.diagonal(k); return { lo: 0, hi: Math.max(17, ...dg.dots.map((d) => d.f)), dots: withKinds(dg.dots), links: dg.links }; })() },
        { label: 'One-string scale (B)', spec: { lo: 0, hi: 15, dots: withKinds(G.stringScale(4, k)) } },
      ];
    },
    triads: (k) => G.STRING_SETS.slice(0, 3).map((set) => {
      const vs = G.triadVoicings(G.chordRootPc(1, k), false, set);
      return { label: `${G.keyName(k)} on ${G.SET_NAME(set)}`, spec: { lo: 0, hi: 15, dots: vs.flatMap((v) => v.set.map((s, i) => ({ s, f: v.frets[i], kind: v.roles[i] === 'R' ? 'root' : 'note', text: v.roles[i] }))) }, caption: 'Root position, 1st and 2nd inversion repeat up the neck.' };
    }),
    handPos: (k) => {
      const r = G.roadmap(2, k);
      const groups = [{ label: 'Chords 1 & 5 → position 5', p: 5, degs: [1, 5], off: [0] }, { label: 'Chords 2 & 6 → position 1', p: 1, degs: [2, 6], off: [2] }, { label: 'Chords 3, 4, 7 → position 2', p: 2, degs: [3, 4, 7], off: [4, 5] }];
      return groups.map((g) => {
        const dots = G.positionNear(g.p, k, r.root + g.off[0] + 1);
        const roots = r.dots.filter((d) => g.off.includes(d.f - r.root) && g.degs.includes(d.deg));
        const all = [...dots, ...roots].map((d) => d.f);
        return { label: g.label, spec: { lo: Math.max(0, Math.min(...all) - 1), hi: Math.min(17, Math.max(...all) + 1), dots: [...withKinds(dots), ...roots.map((d) => ({ ...d, kind: 'ring', text: '' }))] } };
      });
    },
  };

  /* ---------- The 16 stages ---------- */
  const S = [
    {
      id: 'notes', group: 'Foundations', title: 'Find any note', course: 'Module 1 · The 12 Notes, Notes on E & A, Octave Centers',
      goal: 'Name any note on the neck, without a chart.',
      learn: [
        'There are 12 notes. The letters run A B C D E F G, then start again.',
        'Between every pair of letters is a sharp/flat note, except <b>B–C</b> and <b>E–F</b>. Sharp and flat are two names for the same fret (C♯ = D♭).',
        'Don\'t memorise every fret. Learn the <b>landmark frets</b> on the low E and A strings (3, 5, 7, 9, 12) and count from there.',
        'Directions: "up a string" = towards the thin high e string. "Higher" = a higher fret number, towards the guitar body.',
        'The <b>octave shape</b>: two strings up, two frets higher gives the same note. Landing on the B or high e string? Go <b>three</b> frets higher.',
        'To name a note on D, G, B or high e, run the octave shape <b>backwards</b> until you reach low E or A.',
      ],
      figures: [{ title: 'Landmark notes', fn: fig.landmarks }, { title: 'The octave shape', fn: fig.octaves }],
      know: q1,
      play: {
        title: 'Note hunt', how: ['Start the metronome. A note name appears.', 'Find it on each string from low E upwards, saying the name out loud as you play it.', 'Keep going when the next note appears. Don\'t stop to fix mistakes.'],
        levels: [{ label: 'Level 1', detail: 'Low E and A strings only', bpm: 60, every: 8 }, { label: 'Level 2', detail: 'All six strings', bpm: 60, every: 16 }, { label: 'Level 3', detail: 'All six strings, faster', bpm: 80, every: 12 }],
        callout: (lvl) => { const pc = lvl === 0 ? pick(NATURALS) : rnd(12); return { big: G.PC_LABEL[pc], small: lvl === 0 ? 'low E and A' : 'every string' }; },
        pass: 'Ten notes in a row without stopping.',
      },
      use: { track: 'A minor backing track slow', rules: [
        'Use only the notes A, C, D, E and G (they all fit the track), on the low E and A strings, frets 0–12. Say each note name before you play it.',
        'Play only C. Find it on all six strings and play them in rhythm with the track. Then do the same with E.',
        'Stay on the A string, frets 0 to 12. Make a slow melody from A, C, D, E and G, naming every note.',
        'Play a short phrase on the low E string using A, C, D, E and G. Then play the same notes one octave up with the octave shape (two strings up, two frets higher).',
      ] },
      test: { n: 20, pass: 18, maxAvg: 5, playLevel: 2 },
    },
    {
      id: 'intervals', group: 'Foundations', title: 'Intervals', course: 'Module 1 · Intervals', light: true,
      goal: 'Know the distance names and how they sound.',
      learn: [
        'An interval is the distance between two notes. 1 fret = a <b>semitone</b> (half step), 2 frets = a <b>tone</b> (whole step).',
        'There are 12. Learn the four below first. The quiz drills the rest, so look back at the table when you need to.',
        'The four to really know: <b>minor 3rd</b> (3 frets, sounds sad, inside minor chords), <b>major 3rd</b> (4 frets, sounds happy, inside major chords), <b>perfect 5th</b> (7 frets, the power chord) and the <b>octave</b> (12 frets, same note).',
        'Across strings, from a root on low E or A: next string, same fret = perfect 4th; two frets higher = perfect 5th. Two strings up, two frets higher = octave.',
      ],
      figures: [{ title: 'Intervals from the root', fn: fig.intervals }],
      know: q2,
      play: {
        title: 'Interval hop', how: ['Root = A, 5th fret low E.', 'When an interval appears, play the root, then the interval note. Let both ring and say the name.', 'Listen to how each one sounds. That sound is the point.'],
        levels: [{ label: 'Level 1', detail: 'm3, M3, P4, P5, octave on one string', bpm: 60, every: 8 }, { label: 'Level 2', detail: 'All 12 on one string', bpm: 60, every: 8 }, { label: 'Level 3', detail: 'Use cross-string shapes', bpm: 70, every: 6 }],
        callout: (lvl) => { const n = lvl === 0 ? pick([3, 4, 5, 7, 12]) : 1 + rnd(12); return { big: G.INTERVALS[n], small: `${n} fret${n > 1 ? 's' : ''}` }; },
        pass: 'Every interval played and named without looking anything up.',
      },
      use: { track: 'A minor backing track slow', rules: [
        'Play only power chords (root + 5th) on A, C, D, E and G, in rhythm with the track.',
        'On the low E string, frets 5–17, use only A, C, E and G (frets 5, 8, 12, 15, 17) and make a melody where every jump is a 3rd (3 or 4 frets).',
        'Play one phrase using only small steps (1–2 frets), then one using only big jumps. Hear the difference.',
      ] },
      test: { n: 10, pass: 8, maxAvg: null, playLevel: 1 },
    },
    {
      id: 'scale', group: 'Foundations', title: 'Major scale + numbers', course: 'Module 1 · The 221 Rule & The Number System',
      goal: 'Build any major scale and think in numbers 1–7.',
      learn: [
        'A major scale picks 7 of the 12 notes using the steps <b>2-2-1 · 2-2-2-1</b> (frets). Remember it like a phone number.',
        'Number the notes 1 to 7. Note 8 is the octave, back to 1.',
        'The numbers work the same in every key. Note 5 of C is G; note 5 of D is A. Same job, different name.',
        'Naming the notes: use each letter A–G exactly once, in order. That decides ♯ or ♭ (F major has B♭, not A♯).',
        'The two 1-fret steps (3→4 and 7→1) will become your <b>keystones</b> in stage 7.',
      ],
      figures: [{ title: 'Major scale along one string', keyed: true, fn: fig.scaleOnString }],
      know: q3,
      play: {
        title: 'Scale on one string', how: ['A key appears. Find its root on the low E or A string.', 'Play the major scale up that one string with 2-2-1-2-2-2-1, one note per click.', 'Say the numbers out loud: "one, two, three…".'],
        levels: [{ label: 'Level 1', detail: 'Keys C, G, D, F', bpm: 60, every: 16 }, { label: 'Level 2', detail: 'Any key', bpm: 70, every: 16 }, { label: 'Level 3', detail: 'Any key, up and back down', bpm: 80, every: 16 }],
        callout: (lvl) => keyCall(lvl === 0 ? [0, 7, 2, 5] : ALL_KEYS)(),
        pass: 'Every key played clean, numbers said out loud.',
      },
      use: { track: 'C major backing track slow', rules: [
        'Play the C major scale along the B string only (C is at fret 1, the next C at fret 13) and turn it into a melody.',
        'End every phrase on note 1 (C).',
        'Play only notes 1, 3 and 5. Say the numbers as you go.',
        'Play a 4-note phrase on the B string, then find the exact same notes (same pitch) on the G string and play it there.',
      ] },
      test: { n: 20, pass: 18, maxAvg: 6, playLevel: 2 },
    },
    {
      id: 'chords', group: 'Foundations', title: 'Chords in a key', course: 'Module 2 · Keys & Chords',
      goal: 'Know which 7 chords belong to any key, and their shapes.',
      learn: [
        'Every key has 7 chords, one built on each note of its scale.',
        'The rule is always the same: <b>1, 4, 5 = major</b>. <b>2, 3, 6 = minor</b>. <b>7 = diminished</b> (we play it as a m7♭5).',
        'Four barre shapes cover chords 1–6: E-shape major and minor (root on low E), A-shape major and minor (root on A). Chord 7 gets its own m7♭5 shape (4 strings, mute the rest).',
        'The 7 chord is a passing chord. It pulls hard back to 1.',
      ],
      figures: [{ title: 'The barre shapes (R = root)', fn: fig.barreShapes }],
      know: q4,
      play: {
        title: 'Chord caller', how: ['A key and a chord number appear.', 'Work out the chord name, then play it as a barre chord anywhere on the neck.', 'Strum it until the next one appears.'],
        levels: [{ label: 'Level 1', detail: 'Keys C and G', bpm: 60, every: 8 }, { label: 'Level 2', detail: 'Any key', bpm: 60, every: 8 }, { label: 'Level 3', detail: 'Any key, quicker changes', bpm: 80, every: 4 }],
        callout: (lvl) => { const k = lvl === 0 ? pick([0, 7]) : pick(ALL_KEYS); const d = 1 + rnd(6); return { big: `${G.keyName(k)} · ${d}`, small: 'key · chord number', answer: G.chordName(d, k) }; },
        pass: 'Ten chords in a row on time.',
      },
      use: { track: '', rules: [
        'Write your own 4-chord progression in C using numbers (try 1-5-6-4). Loop it with a strum pattern you like.',
        'Play the same numbers in G, then in D (the Learn tab lists both keys). Notice it sounds like the same song, just higher or lower.',
        'Use 2, 3 or 6 somewhere in your progression and hear how it changes the mood.',
        'End your progression with 7 → 1 and hear the pull.',
      ] },
      test: { n: 20, pass: 18, maxAvg: 6, playLevel: 2 },
    },
    {
      id: 'rm1', group: 'Chords', title: 'Chord Roadmap 1', course: 'Module 2 · Chord Roadmap 1',
      goal: 'Play all 7 chords of a key from one hand spot, root on low E.',
      learn: [
        'Put chord <b>1</b> on the <b>low E</b> string. Chords 2 and 3 follow along the same string (2 frets apart).',
        'Chords 4, 5, 6 sit <b>right above</b> 1, 2, 3 on the A string. Chord 7 is two frets past 6.',
        'Major or minor? Just follow the numbers: 1, 4, 5 major, 2, 3, 6 minor, 7 m7♭5.',
        'It\'s movable: slide the whole map to the key\'s root on low E. Best for keys with a low root on E: F, F♯, G, A♭, A.',
        'Shortcuts (faded dots on the diagram): 7 one fret behind 1 on low E, 3 one fret behind 4 on the A string, and 4 also on low E, 5 frets above chord 1.',
      ],
      figures: [{ title: 'Roadmap 1', keyed: true, defaultKey: 7, fn: fig.roadmap(1) }],
      know: qRoadmap(1),
      play: {
        title: 'Roadmap 1 caller', how: ['A key is shown, then chord numbers appear.', 'Play each chord from the roadmap as a barre chord. Don\'t think of chord names, think of numbers.', 'Strum on every click until the next number.'],
        levels: [{ label: 'Level 1', detail: 'Key of G, chords 1–6', bpm: 60, every: 8 }, { label: 'Level 2', detail: 'Roadmap 1 keys, chords 1–7', bpm: 60, every: 8 }, { label: 'Level 3', detail: 'Roadmap 1 keys, faster', bpm: 80, every: 4 }],
        callout: (lvl, st) => { if (!st.key || st.count % 8 === 0) st.key = lvl === 0 ? 7 : pick(RM_KEYS[1].slice(0, 6)); st.count = (st.count || 0) + 1; const d = 1 + rnd(lvl === 0 ? 6 : 7); return { big: String(d), small: 'Key of ' + G.keyName(st.key), answer: G.chordName(d, st.key) }; },
        pass: 'Sixteen chords in a row on time.',
      },
      use: { track: 'I V vi IV backing track in A', rules: [
        'Roadmap 1 in A (chord 1 at low E fret 5): play 1-5-6-4 along with the track, then make up your own rhythm.',
        'Pick a song you like in G or A. Play its chords from the roadmap instead of open chords.',
        'Track off, metronome on. Loop 1-4-3-6, playing chord 3 at its shortcut (one fret behind chord 4, A string). End with 7 → 1, using the shortcut 7 (one fret behind chord 1, low E).',
      ] },
      test: { n: 15, pass: 13, maxAvg: 6, playLevel: 2 },
    },
    {
      id: 'rm2', group: 'Chords', title: 'Chord Roadmap 2', course: 'Module 2 · Chord Roadmap 2, Positioning & Modifying Roadmaps',
      goal: 'The second roadmap, root on A, so every key has a comfy spot.',
      learn: [
        'Put chord <b>1</b> on the <b>A</b> string. Chords 2, 3 follow along it, and 4 is one more fret up.',
        'Chords 5, 6, 7 sit at the <b>same frets</b> as 1, 2, 3, on the low E string. Chord 1 repeats on low E at the same fret as 4.',
        'Best for keys with a low root on A: B♭, B, C, D♭, D, E♭, E.',
        'Rule of thumb: find the key\'s root on low E and on A (ignore open strings, count them as fret 12). Use the roadmap that\'s lower on the neck.',
        'Shortcut (faded dot): chord 4 also sits on low E, two frets below chord 5.',
        'You don\'t need chord names any more. "Play 6, 4, 1, 5 in E♭" is easy once you think in numbers.',
      ],
      figures: [{ title: 'Roadmap 2', keyed: true, defaultKey: 0, fn: fig.roadmap(2) }],
      know: qRoadmap(2),
      play: {
        title: 'Roadmap 2 caller', how: ['A key is shown, then chord numbers appear.', 'Play each chord from Roadmap 2.', 'At Level 3, the key also changes: pick the right roadmap first.'],
        levels: [{ label: 'Level 1', detail: 'Key of C, chords 1–6', bpm: 60, every: 8 }, { label: 'Level 2', detail: 'Roadmap 2 keys, chords 1–7', bpm: 60, every: 8 }, { label: 'Level 3', detail: 'Any key, either roadmap', bpm: 80, every: 4 }],
        callout: (lvl, st) => { if (!st.key || st.count % 8 === 0) st.key = lvl === 0 ? 0 : lvl === 1 ? pick(RM_KEYS[2]) : pick(ALL_KEYS); st.count = (st.count || 0) + 1; const d = 1 + rnd(lvl === 0 ? 6 : 7); return { big: String(d), small: 'Key of ' + G.keyName(st.key) + (lvl === 2 ? ' · Roadmap ' + G.bestRoadmap(st.key) : ''), answer: G.chordName(d, st.key) }; },
        pass: 'Sixteen chords in a row on time.',
      },
      use: { track: 'C major backing track slow', rules: [
        'Roadmap 2 in C: play along with the track using only chords 1, 4, 5, 6.',
        'Track off, metronome on at 70. Play 1-4-5-6 in D (chord 1 at A string fret 5), then in E (fret 7). Same shapes, slide the map.',
        'Pick a song whose chords you can look up. Find its key, then write each chord as a number using the stage 4 pattern.',
      ] },
      test: { n: 15, pass: 13, maxAvg: 6, playLevel: 2 },
    },
    {
      id: 'keystones', group: 'Scales', title: 'Keystones', course: 'Module 3 · The 2 Keystones, The First 2 Scale Positions',
      goal: 'Spot the two landmarks that tell you where you are in any scale.',
      learn: [
        'Play a major scale along one string. Almost every step is 2 frets. Only two steps are 1 fret.',
        '<b>White keystone</b> = notes 3 → 4. <b>Black keystone</b> = notes 7 → 1.',
        'Those two spots are your lighthouses. When you\'re lost, find a keystone and you know where you are.',
        'Finding them in any key: find the root on the string. Black keystone = the fret just below the root, then the root (7 → 1). White keystone = 4 and 5 frets above the root (3 → 4). Open-string root? Use fret 12 instead.',
        'Coming next: on the E strings, position 1 finishes on the black keystone and position 4 starts on the white one.',
        'The pentatonic scale is just the major scale with notes 4 and 7 taken out.',
      ],
      figures: [{ title: 'Keystones along one string', keyed: true, defaultKey: 7, fn: fig.keystones }],
      know: q7,
      play: {
        title: 'Keystone spotter', how: ['A key appears.', 'Find both keystones on the high e string. Play the white one (3→4) then the black one (7→1), saying the numbers.', 'At Level 3, do it on low E too.'],
        levels: [{ label: 'Level 1', detail: 'Keys C, G, D, A, E · high e', bpm: 60, every: 8 }, { label: 'Level 2', detail: 'Any key · high e', bpm: 70, every: 8 }, { label: 'Level 3', detail: 'Any key · both E strings', bpm: 80, every: 8 }],
        callout: (lvl) => keyCall(lvl === 0 ? [0, 7, 2, 9, 4] : ALL_KEYS)(),
        pass: 'Twelve keys in a row, both keystones each time.',
      },
      use: { track: 'C major backing track slow', rules: [
        'Improvise on the high e string only, frets 0–13. In C the black keystone is frets 7 → 8 (B → C). End every phrase by playing fret 7 then fret 8.',
        'Make a melody on high e that keeps returning to the white keystone: in C that\'s fret 12 → 13 (E → F), or open → fret 1.',
        'Play 3 → 4 (high e frets 12 → 13), then 7 → 1 (frets 7 → 8), over and over. Which one sounds finished? (7 → 1 should.)',
      ] },
      test: { n: 15, pass: 13, maxAvg: 6, playLevel: 2 },
    },
    {
      id: 'pos1', group: 'Scales', title: 'Position 1 · home base', course: 'Module 3 · Pentatonic to Major or Minor · Module 4 · Homebase, Position 1',
      goal: 'Own one scale shape so well it feels like home.',
      learn: [
        'Position 1 is the minor pentatonic box, plus the two missing notes (4 and 7). That makes it the full 7-note scale.',
        'It\'s the same shape for <b>C major and A minor</b>. They share the same notes.',
        'Place it with the low E string: the first note is the <b>minor root</b> (A for C major / A minor).',
        'On both E strings it plays 6 – 7 – 1: it finishes on the black keystone (7 → 1).',
        'Fingering: one finger per fret. Index on fret 5, middle 6, ring 7, pinky 8. The index stretches back to fret 4 on the G string.',
        'This is your home base. Drill it until you can play it with your eyes closed, before adding more positions.',
        'Jam in C major / A minor until stage 13. Only Level 3 of the drill and a few quiz questions move the shape to G and D.',
      ],
      figures: [{ title: 'Position 1', keyed: true, defaultKey: 0, fn: fig.pos1Both }],
      know: q8,
      play: {
        title: 'Home base run', how: ['Start on the lowest note (A, fret 5, low E).', 'Play every note up to the top, then back down. One note per click.', 'Say "one" every time you hit a 1. At Level 3, also try it in G and D.'],
        levels: [{ label: 'Level 1', detail: 'Up and down', bpm: 60, every: 0 }, { label: 'Level 2', detail: 'Up and down', bpm: 90, every: 0 }, { label: 'Level 3', detail: 'Eyes closed, then in G and D', bpm: 120, every: 0 }],
        callout: null,
        pass: 'Three clean runs in a row at the level tempo.',
      },
      use: { track: 'A minor backing track slow', rules: [
        'Stay in position 1. Start with pentatonic notes only, then add 4 and 7 one at a time.',
        'End every phrase on A (note 6, the minor root). The track is in A minor, so A sounds like home.',
        'Call and response: play for 2 bars, rest for 2 bars.',
        'Use only two strings at a time. Change pair every minute.',
        'Play the same short phrase in three different octaves inside the shape.',
      ] },
      test: { n: 20, pass: 18, maxAvg: 5, playLevel: 2 },
    },
    {
      id: 'pos25', group: 'Scales', title: 'Positions 2 & 5', course: 'Module 4 · Positions 2 & 5',
      goal: 'Grow home base one shape in each direction.',
      learn: [
        'Positions share a wall: the top edge of one shape is the bottom edge of the next.',
        '<b>Position 2</b> sits just above position 1. <b>Position 5</b> sits just below.',
        'They hold the exact same notes as position 1, just starting and ending in different places.',
        'Moving between them: slide the finger on your last note to the next scale note on the same string (2 frets, or 1 at a keystone). Your hand lands in the next shape.',
      ],
      figures: [{ title: 'Positions 5, 1, 2', keyed: true, defaultKey: 0, fn: fig.pos([5, 1, 2]) }],
      know: q9,
      play: {
        title: 'Link the shapes', how: ['Level 1: play position 5 up and down, then position 2.', 'Level 2: run 5 → 1 → 2 without stopping, sliding into each new shape.', 'Level 3: go up and come back down.'],
        levels: [{ label: 'Level 1', detail: 'Each shape on its own', bpm: 60, every: 0 }, { label: 'Level 2', detail: '5 → 1 → 2 continuous', bpm: 70, every: 0 }, { label: 'Level 3', detail: '5 → 1 → 2 → 1 → 5', bpm: 90, every: 0 }],
        callout: null,
        pass: 'Three clean runs in a row at the level tempo.',
      },
      use: { track: 'A minor backing track slow', rules: [
        'Start every 4 bars in position 1, then slide into position 2 or 5 for the next 4.',
        'Play a short phrase in position 1, then play the same pitches using position 2\'s frets.',
        'Pick a note you like and find it in all three shapes.',
      ] },
      test: { n: 15, pass: 13, maxAvg: 6, playLevel: 2 },
    },
    {
      id: 'pos34', group: 'Scales', title: 'Positions 3 & 4', course: 'Module 3 · The 5 Positions Explained · Module 4 · Positions 3 & 4',
      goal: 'Finish the neck: all five shapes, joined up.',
      learn: [
        'Position 4 sits below position 5 (in C it\'s the open-string shape). Position 3 sits above position 2.',
        'They matter a bit less than 1, 2 and 5. Learn them, but keep position 1 as home.',
        'On both E strings position 4 plays 3 – 4 – 5: it starts on the white keystone (3 → 4).',
        'Up the neck the order is 4 → 5 → 1 → 2 → 3, then position 4 again 12 frets higher (frets 12–15), the same shape as the open one.',
        'All five shapes are the same 7 notes. The whole neck is one big scale.',
      ],
      figures: [{ title: 'Positions 3 and 4', keyed: true, defaultKey: 0, fn: fig.pos([4, 3]) }, { title: 'All five together', keyed: true, defaultKey: 0, fn: fig.neck }],
      know: q10,
      play: {
        title: 'Whole-neck run', how: ['Level 1: play positions 3 and 4 on their own.', 'Level 2: run all five in order up the neck (4 → 5 → 1 → 2 → 3).', 'Level 3: up and back down.'],
        levels: [{ label: 'Level 1', detail: 'Positions 3 and 4', bpm: 60, every: 0 }, { label: 'Level 2', detail: 'All five, going up', bpm: 70, every: 0 }, { label: 'Level 3', detail: 'All five, up and down', bpm: 90, every: 0 }],
        callout: null,
        pass: 'Three clean runs in a row at the level tempo.',
      },
      use: { track: 'C major backing track slow', rules: [
        'Start low in position 4 and end the track high in position 3, travelling only upwards.',
        'Every time the chord changes, move to a different position.',
        'Pick one position you\'re weakest in and only improvise there.',
      ] },
      test: { n: 15, pass: 13, maxAvg: 6, playLevel: 2 },
    },
    {
      id: 'cagedH', group: 'CAGED', title: 'CAGED · one chord everywhere', course: 'Module 5 · CAGED Basics, Minor CAGED, Horizontal CAGED',
      goal: 'See a chord shape inside every scale position.',
      learn: [
        'C, A, G, E and D are the five open chord shapes. Every major chord can be played with each of them.',
        'Barre chords are just moved E and A shapes.',
        'Play one chord up the neck and the shapes come in order: <b>C → A → G → E → D</b>, then repeat.',
        'Each shape lives inside a position: <b>C = 4, A = 5, G = 1, E = 2, D = 3</b>. That gives each position its own landmark.',
        'Minor works the same for the relative minor: <b>Am = 4, Gm = 5, Em = 1, Dm = 2, Cm = 3</b>.',
        'Some shapes are awkward to play in full. You only need to <b>see</b> them.',
        'New meaning of "3" and "5": from here they are the <b>chord\'s</b> own 3rd and 5th, counted from the chord\'s root (R). Not the key\'s note numbers.',
      ],
      figures: [{ title: 'The 1 chord in every position', keyed: true, defaultKey: 0, fn: fig.cagedH }, { title: 'The 6 chord (minor) in every position', keyed: true, defaultKey: 0, fn: fig.cagedHMinor }],
      know: q11,
      play: {
        title: 'One chord, five shapes', how: ['Play C major in the C shape (open), then A shape (fret 3), G shape (fret 5), E shape (fret 8), D shape (fret 10).', 'Strum or pick each for 4 clicks, saying the shape and position.', 'Level 2: A minor. Level 3: a new key each round.'],
        levels: [{ label: 'Level 1', detail: 'C major up the neck', bpm: 60, every: 0 }, { label: 'Level 2', detail: 'A minor up the neck', bpm: 60, every: 0 }, { label: 'Level 3', detail: 'A random key', bpm: 70, every: 20 }],
        callout: (lvl) => lvl < 2 ? null : keyCall(COMMON_KEYS)(),
        pass: 'All five shapes in order without stopping.',
      },
      use: { track: 'C major backing track slow', rules: [
        'Strum C major in a different shape every 2 bars.',
        'Improvise in position 1 only (frets 4–8) and end every phrase on C, E or G: the notes of the C chord (which looks like a G shape here).',
        'Take the E shape of C major (barre at fret 8) and play its notes one at a time as a melody.',
      ] },
      test: { n: 15, pass: 13, maxAvg: 6, playLevel: 2 },
    },
    {
      id: 'cagedV', group: 'CAGED', title: 'CAGED · every chord in one spot', course: 'Module 5 · The Vertical CAGED System', light: true,
      goal: 'Find all 7 chords of the key inside position 1.',
      learn: [
        'Stay in one position and you can still play every chord of the key.',
        'In position 1 (C major): C = G shape, Dm = Am shape, Em = Cm shape, F = C shape, G = D shape, Am = Em shape. Bdim (chord 7) = Em shape with its 5th lowered.',
        'R, 3 and 5 on the diagrams are each chord\'s own root, 3rd and 5th (as in stage 11).',
        'You don\'t need to play these as full chords. Seeing them helps you <b>target chord tones</b> when you solo.',
        'The same idea works in every position. Start with position 1 only.',
      ],
      figures: [{ title: 'Chords inside position 1', keyed: true, defaultKey: 0, fn: fig.cagedV }],
      know: q12,
      play: {
        title: 'Chords inside home base', how: ['A chord number appears (key of C).', 'Inside position 1, play that chord\'s tones one note at a time, low to high.', 'Say R, 3, 5 as you play them.'],
        levels: [{ label: 'Level 1', detail: 'Chords 1, 4, 5, 6', bpm: 60, every: 8 }, { label: 'Level 2', detail: 'All 7 chords', bpm: 60, every: 8 }, { label: 'Level 3', detail: 'All 7, quicker', bpm: 80, every: 4 }],
        callout: (lvl) => { const d = lvl === 0 ? pick([1, 4, 5, 6]) : 1 + rnd(7); return { big: G.chordName(d, C), small: `chord ${d} · position 1` }; },
        pass: 'Twelve chords in a row on time.',
      },
      use: { track: 'Am C F G backing track', rules: [
        'Stay in position 1. When the chord changes, land on its root.',
        'Same again, but land on the chord\'s 3rd instead.',
        'Play a phrase that ends on a chord tone of the next chord, right as it arrives.',
      ] },
      test: { n: 10, pass: 8, maxAvg: null, playLevel: 1 },
    },
    {
      id: 'connect', group: 'Putting it together', title: 'Connecting it all', course: 'Module 6 · 4 Systems, 1 Fretboard',
      goal: 'Drop the whole map into any key, fast.',
      learn: [
        'Roadmap 2 sits on top of positions 5, 1 and 2: each of its barre chords puts your hand over one of them.',
        'Quick trick: play the key\'s <b>relative minor</b> barre chord (chord 6). Root on low E = position 1, with the black keystone 2–3 frets above the barre. Root on A = position 4, with your barre on the white keystone.',
        'The <b>diagonal pentatonic</b> travels through positions with slides, so you stop getting stuck in one box.',
        'Every single string is a horizontal scale. Improvising on one string is great training.',
        'From here on the quizzes and drills use <b>any key</b>. Everything just slides.',
      ],
      figures: [{ title: 'The map', keyed: true, defaultKey: 0, fn: fig.map }],
      know: q13,
      play: {
        title: 'Find home in any key', how: ['A key appears.', '1) Play its relative minor barre on low E (that\'s position 1 / black keystone). 2) Play it on the A string (position 4 / white keystone).', '3) Run position 1 once, up and down.'],
        levels: [{ label: 'Level 1', detail: 'Keys C, G, D, A', bpm: 70, every: 32 }, { label: 'Level 2', detail: 'Any key', bpm: 70, every: 32 }, { label: 'Level 3', detail: 'Any key, faster', bpm: 80, every: 24 }],
        callout: (lvl) => keyCall(lvl === 0 ? [0, 7, 2, 9] : ALL_KEYS)(),
        pass: 'Eight keys in a row without stopping.',
      },
      use: { track: 'E major backing track', rules: [
        'Improvise on one string only (try B, then G).',
        'Use the diagonal pentatonic to travel from the bottom of the neck to the top.',
        'Start in position 1. Every 8 bars, switch to position 4: play the relative-minor barre with its root on the A string and improvise from there.',
        'Put on a backing track in a key you haven\'t used yet. Within 10 seconds, play the relative-minor barre on low E (that\'s position 1) and start improvising.',
      ] },
      test: { n: 20, pass: 18, maxAvg: 6, playLevel: 2 },
    },
    {
      id: 'jam', group: 'Putting it together', title: 'Jamming in real keys', course: 'Module 7 · Practice & Application',
      goal: 'Use the whole map over real progressions.',
      learn: [
        'The same 5 steps work over any track: <b>1</b> find the key, <b>2</b> play the chords from the roadmap, <b>3</b> spot the keystones, <b>4</b> explore position 1, <b>5</b> spread out and aim for chord tones (stage 12).',
        'When the chords change, your map doesn\'t. You\'re locked to the key, not the chord.',
        'Stay with one track for a long time. Getting 2% comfortable on many tracks doesn\'t help.',
        'Wrong note? Good. Work out <b>why</b> it was wrong (not in the key) and where the right one was.',
        'A chord from outside the key (like A7 in a D minor song)? While it plays, land on its root (A). Then carry on in the key.',
      ],
      figures: [{ title: 'Your map for the track', keyed: true, defaultKey: 0, fn: fig.map }],
      know: q14,
      play: {
        title: 'Five-step jam', how: ['Put on the track for this level.', 'Do all 5 steps in order: key → roadmap chords → keystones → position 1 → spread out.', 'Spend about 2 minutes on each step.'],
        levels: [{ label: 'Level 1', detail: 'C major / Am: "Am C F G backing track"', bpm: 80, every: 0 }, { label: 'Level 2', detail: 'A major / F♯m: "F#m A D backing track"', bpm: 80, every: 0 }, { label: 'Level 3', detail: 'F major / Dm: "Dm Bb F backing track"', bpm: 80, every: 0 }],
        callout: null,
        pass: 'All 5 steps over the track without losing your place.',
      },
      use: { track: 'your favourite song', rules: [
        'Pick a song you love. Look up its key and chords, and jam over it with the 5 steps.',
        'Start a list of songs with their keys. Add one each session.',
        'Play a whole song only with roadmap chords, then only with single notes.',
      ] },
      test: { n: 15, pass: 13, maxAvg: 8, playLevel: 2 },
    },
    {
      id: 'triads', group: 'Putting it together', title: 'Triads', course: 'Module 8 · Triads Level 1 & 2',
      goal: 'Play chords as small 3-note shapes anywhere.',
      learn: [
        'A triad is 3 notes: <b>root, 3rd, 5th</b>. Major = the 3rd is 4 semitones above the root. Minor = 3 semitones.',
        'Any major triad shape becomes minor by moving its 3rd down one fret.',
        'The chords of C: C = C E G, Dm = D F A, Em = E G B, F = F A C, G = G B D, Am = A C E.',
        'A full barre chord is just a triad with doubled notes. Drop the barre and play 3 strings to get a triad.',
        'The lowest note names the inversion: root = <b>root position</b>, 3rd = <b>1st inversion</b>, 5th = <b>2nd inversion</b>.',
        'Triads sound clean when playing with others. They don\'t step on the bass or keys.',
        'Every CAGED shape contains triads. Start with the top three strings (G-B-e), then D-G-B, then A-D-G.',
      ],
      figures: [{ title: 'Major triads up the neck', keyed: true, defaultKey: 0, fn: fig.triads }],
      know: q15,
      play: {
        title: 'Triad caller', how: ['A chord appears (key of C).', 'Play it as a triad on the G-B-e strings, as close to your hand as possible.', 'Level 2 adds the D-G-B strings. Level 3 is faster.'],
        levels: [{ label: 'Level 1', detail: 'C, F, G, Am on G-B-e', bpm: 60, every: 8 }, { label: 'Level 2', detail: 'All 6 chords, G-B-e or D-G-B', bpm: 60, every: 8 }, { label: 'Level 3', detail: 'All 6 chords, faster', bpm: 80, every: 4 }],
        callout: (lvl) => { const d = lvl === 0 ? pick([1, 4, 5, 6]) : 1 + rnd(6); return { big: G.chordName(d, C), small: lvl === 0 ? 'G-B-e strings' : pick(['G-B-e strings', 'D-G-B strings']) }; },
        pass: 'Twelve triads in a row on time.',
      },
      use: { track: 'Am C F G backing track', rules: [
        'Play the chords of the track as triads only, all inside one 4-fret zone: frets 3–6 on G-B-e (Am 5-5-5, C 5-5-3, F 5-6-5, G 4-3-3).',
        'Same again, then add one single note between each chord change.',
        'Play Am – C – F – G with the lowest triad shape of each on G-B-e, then repeat with the next shape up the neck, and the next.',
      ] },
      test: { n: 15, pass: 13, maxAvg: 8, playLevel: 2 },
    },
    {
      id: 'lead', group: 'Putting it together', title: 'Lead + rhythm, songs, writing', course: 'Module 8 · Learning New Things, Songwriting, Lead & Rhythm',
      goal: 'Mix chords and lines, learn songs, write your own.',
      learn: [
        'Play the chord <b>on</b> the change. Fill the gap until the next change with notes from the position under your hand. Land on the next chord.',
        'Roadmap 2 in C: chords 1 and 5 put your hand on position 5, chords 2 and 6 on position 1, chords 3, 4, 7 on position 2. In any Roadmap 2 key it\'s the same.',
        'Learning a song or riff? Find its key, then find where it sits on your map. Now you can move it to any key.',
        'Writing: pick chords from the roadmap. Lean on 1, 4, 5, 6. Use 7 to lead back to 1.',
        'Record your chords, then improvise over your own loop.',
      ],
      figures: [{ title: 'What\'s under your hand (Roadmap 2)', keyed: true, defaultKey: 0, fn: fig.handPos }],
      know: q16,
      play: {
        title: 'Chord, fill, chord', how: ['Loop C – Am – F – G (or the progression shown).', 'Hit the chord on beat 1. Fill beats 2-4 with notes from the position under your hand.', 'Land on the next chord exactly on time.'],
        levels: [{ label: 'Level 1', detail: 'C – Am – F – G, 1 bar each', bpm: 60, every: 0 }, { label: 'Level 2', detail: '2 bars each, longer fills', bpm: 80, every: 0 }, { label: 'Level 3', detail: 'A new key each round', bpm: 80, every: 32 }],
        callout: (lvl) => { if (lvl < 2) return null; const k = pick(ALL_KEYS); return { big: G.keyName(k), small: [1, 6, 4, 5].map((d) => G.chordName(d, k)).join(' – ') }; },
        pass: 'Four rounds in a row without dropping a chord.',
      },
      use: { track: '', rules: [
        'Write a 4-chord progression, record it on your phone, and improvise over it.',
        'Learn the main riff of a song you love. Then find where it sits on your map.',
        'Take that riff and play it in a different key.',
        'Write a verse and a chorus with different progressions in the same key.',
      ] },
      test: { n: 15, pass: 13, maxAvg: 8, playLevel: 2 },
    },
  ];

  /* ---------- Play drills: every call shows WHAT (big) and WHERE (lit-up fretboard), then a check on the board ---------- */
  const SN = (s) => G.STRING_NAMES[s] + ' string';
  const fretsOn = (pc, s, max = 12) => { const a = []; for (let f = 0; f <= max; f++) if (G.pcAt(s, f) === G.mod(pc)) a.push(f); return a; };
  const fretWord = (a) => a.length === 1 ? 'fret ' + a[0] : 'frets ' + a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  const fresh = (st, makeKey, make) => { let r, k, tries = 0; do { r = make(); k = makeKey(r); tries++; } while (k === st.last && tries < 20); st.last = k; return r; };
  const lit = (strings, lo, hi, dots = []) => ({ lo, hi, bands: [].concat(strings), dots });
  const ROLE = { 0: 'R', 3: '♭3', 4: '3', 6: '♭5', 7: '5', 10: '♭7' };
  const roleOf = (rootPc, s, f) => ROLE[G.mod(G.pcAt(s, f) - rootPc)] || '';
  // Barre shapes as fret offsets from the root fret, low E -> high e (null = not played)
  const SHAPES = {
    E: { M: [0, 2, 2, 1, 0, 0], m: [0, 2, 2, 0, 0, 0], dim: [0, 1, 0, 0, null, null] },
    A: { M: [null, 0, 2, 2, 2, 0], m: [null, 0, 2, 2, 1, 0], dim: [null, 0, 1, 0, 1, null] },
  };
  function barreDots(rootPc, s, f, q) {
    const offs = SHAPES[s === 0 ? 'E' : 'A'][q];
    return offs.map((o, str) => o == null ? null : { s: str, f: f + o, text: roleOf(rootPc, str, f + o), kind: roleOf(rootPc, str, f + o) === 'R' ? 'root' : 'right' }).filter(Boolean);
  }
  const ROOT_A = 45; // A on low E, fret 5
  const ghostPos = (p, k) => G.position(p, k).map((d) => ({ ...d, kind: 'ghost', text: '' }));
  // Animated routes (key of C): one step per click, with the finger to use
  const INDEX_FRET = { 4: 1, 5: 2, 1: 5, 2: 7, 3: 10 }; // where the index finger sits in each position
  const fingerFor = (p, f) => (p === 4 ? Math.min(f, 4) : Math.min(4, Math.max(1, f - INDEX_FRET[p] + 1)));
  const posRun = (p, dir) => {
    const up = G.position(p, C).slice().sort((a, b) => a.s - b.s || a.f - b.f).map((x) => ({ s: x.s, f: x.f, finger: fingerFor(p, x.f), grp: p, seg: `Position ${p} ${dir}` }));
    return dir === 'up' ? up : up.reverse();
  };
  const route = (...segs) => segs.flat().filter((x, i, a) => i === 0 || x.s !== a[i - 1].s || x.f !== a[i - 1].f);

  const PLAYS = {
    notes: {
      title: 'Note hunt',
      how: ['Start the metronome. A note appears, and the string to play it on lights up.', 'Find that note on the lit string (frets 0–12) and play it. Say the name out loud. If it\'s there twice (like open and fret 12), either one counts.', 'Halfway through, the answer appears on the fretboard as a check. Try to be there before it shows.', 'Don’t stop to fix mistakes. Move on with the next call.'],
      levels: [{ label: 'Level 1', detail: 'Natural notes (no sharps or flats) on low E and A', bpm: 60, every: 8 }, { label: 'Level 2', detail: 'All 12 notes on low E and A', bpm: 60, every: 8 }, { label: 'Level 3', detail: 'All 12 notes on all six strings', bpm: 70, every: 8 }],
      callout: (lvl, st) => fresh(st, (r) => r.big + r.where, () => {
        const s = lvl < 2 ? pick([0, 1]) : rnd(6);
        const pc = lvl === 0 ? pick(NATURALS) : rnd(12);
        const fr = fretsOn(pc, s);
        return { big: G.PC_LABEL[pc], where: SN(s), answer: fretWord(fr), board: lit(s, 0, 12), reveal: fr.map((f) => ({ s, f, kind: 'right', text: G.PC_SHORT[pc] })) };
      }),
      pass: 'Ten calls in a row where you’re on the right fret before the check appears.',
    },
    intervals: {
      title: 'Interval hop',
      how: ['Your root is the orange <b>A on the low E string, fret 5</b>. Keep coming back to it.', 'Each call names an interval and lights up the string to find it on. Play the root, then the interval note. On one string that\'s one note after the other; at Level 3 (two strings) let both ring together.', 'Say the interval name and listen to the sound. The check shows the exact spot.'],
      levels: [{ label: 'Level 1', detail: 'm3, M3, P4, P5 and octave, up the low E string', bpm: 60, every: 8 }, { label: 'Level 2', detail: 'All 12, up the low E string', bpm: 60, every: 8 }, { label: 'Level 3', detail: 'Across strings: m3, M3, P4, P5 on the A string; M6, m7, octave on the D string', bpm: 70, every: 6 }],
      callout: (lvl, st) => fresh(st, (r) => r.big + r.where, () => {
        const root = [{ s: 0, f: 5, kind: 'root', text: 'R' }];
        if (lvl < 2) {
          const n = lvl === 0 ? pick([3, 4, 5, 7, 12]) : 1 + rnd(12);
          return { big: G.INTERVALS[n], where: 'up the low E string', answer: `fret ${5 + n} (${G.PC_SHORT[G.mod(9 + n)]})`, board: lit(0, 0, 17, root), reveal: [{ s: 0, f: 5 + n, kind: 'right', text: G.INT_SHORT[n] }] };
        }
        const [n, s] = pick([[3, 1], [4, 1], [5, 1], [7, 1], [12, 2], [9, 2], [10, 2]]);
        const f = ROOT_A + n - G.OPEN_MIDI[s];
        return { big: G.INTERVALS[n], where: SN(s), answer: `${SN(s)}, fret ${f} (${G.PC_SHORT[G.mod(9 + n)]})`, board: lit(s, 0, 12, root), reveal: [{ s, f, kind: 'right', text: G.INT_SHORT[n] }] };
      }),
      pass: 'Ten calls in a row, played and named before the check appears.',
    },
    scale: {
      title: 'Scale on one string',
      how: ['A key appears and one string lights up.', 'Find the root on that string (it\'s always between fret 0 and 6). Play the major scale up the string with 2-2-1-2-2-2-1 to the root 12 frets higher (8 notes, one per click), then back down to where you started.', 'Say the numbers out loud: "one, two, three…". The check shows the whole scale on that string, numbered.'],
      levels: [{ label: 'Level 1', detail: 'Keys C, G, D, F on low E or A', bpm: 60, every: 16 }, { label: 'Level 2', detail: 'Any key on low E or A', bpm: 70, every: 16 }, { label: 'Level 3', detail: 'Any key, any string', bpm: 80, every: 16 }],
      callout: (lvl, st) => fresh(st, (r) => r.big + r.where, () => {
        const k = lvl === 0 ? pick([0, 7, 2, 5]) : pick(ALL_KEYS);
        const ok = (lvl < 2 ? [0, 1] : [0, 1, 2, 3, 4, 5]).filter((x) => fretsOn(k, x, 6).length);
        const s = pick(ok);
        const f = fretsOn(k, s, 6)[0];
        const hi = Math.max(15, f + 12);
        return { big: G.keyName(k) + ' major', where: 'up and back down the ' + SN(s), answer: `root ${G.keyName(k)} at fret ${f}`, keyPc: k, board: lit(s, 0, hi), reveal: G.stringScale(s, k, f, f + 12).map((d) => ({ ...d, kind: kindOf(d.deg), text: String(d.deg) })) };
      }),
      pass: 'Five keys in a row, clean, with the numbers said out loud.',
    },
    chords: {
      title: 'Chord caller',
      how: ['A key and a chord number appear: "C · 2" means key of C, chord 2 (Dm). The string for the root lights up.', 'Work out the chord name, find its root on the lit string and play the barre chord: E-shape when the root is on low E, A-shape when it’s on A. Chord 7 (Level 3) uses the m7♭5 shape from the Learn tab: 4 strings, mute the rest. Root on the open string? Barre at fret 12.', 'Strum on every click. The check shows the full shape on the fretboard.'],
      levels: [{ label: 'Level 1', detail: 'Keys C and G, chords 1–6', bpm: 60, every: 8 }, { label: 'Level 2', detail: 'Any key, chords 1–6', bpm: 60, every: 8 }, { label: 'Level 3', detail: 'Any key, chords 1–7, quicker changes', bpm: 80, every: 4 }],
      callout: (lvl, st) => fresh(st, (r) => r.big + r.where, () => {
        const k = lvl === 0 ? pick([0, 7]) : pick(ALL_KEYS);
        const d = 1 + rnd(lvl === 2 ? 7 : 6);
        const s = pick([0, 1]);
        const rpc = G.chordRootPc(d, k);
        const f = G.fretOf(rpc, s, 1);
        return { big: `${G.keyName(k)} · ${d}`, where: 'root on the ' + SN(s), answer: `${G.chordName(d, k)} at fret ${f}`, board: lit(s, 0, 15), reveal: barreDots(rpc, s, f, G.QUAL[d - 1]) };
      }),
      pass: 'Ten chords in a row, on the right fret before the check appears.',
    },
    rm1: {
      title: 'Roadmap 1 caller',
      how: ['Chord 1 of the key is marked on the fretboard (orange). The key stays the same for 8 calls, then changes (Levels 2 and 3).', 'Each call is a chord number. Play it from Roadmap 1, in its main spot. At Level 1 the other chord roots of the map are shown as faint grey dots.', 'Think in numbers, not names. The check shows the barre shape, with the chord number on its root.'],
      levels: [{ label: 'Level 1', detail: 'Key of G, chords 1–6, map shown', bpm: 60, every: 8 }, { label: 'Level 2', detail: 'Roadmap 1 keys, chords 1–7', bpm: 60, every: 8 }, { label: 'Level 3', detail: 'Roadmap 1 keys, faster', bpm: 80, every: 4 }],
      callout: (lvl, st) => {
        st.count = st.count || 0;
        if (st.key == null || (lvl > 0 && st.count % 8 === 0)) st.key = lvl === 0 ? 7 : pick(RM_KEYS[1].slice(0, 6));
        st.count++;
        return fresh(st, (r) => r.big + r.where, () => rmCall(1, st.key, 1 + rnd(lvl === 0 ? 6 : 7), lvl === 0, ` · Roadmap 1`));
      },
      pass: 'Sixteen chords in a row, on the right fret before the check appears.',
    },
    rm2: {
      title: 'Roadmap 2 caller',
      how: ['Chord 1 of the key is marked on the fretboard (orange). The key stays the same for 8 calls, then changes (Levels 2 and 3).', 'Each call is a chord number. Play it from Roadmap 2, in its main spot. At Level 1 the other chord roots of the map are shown as faint grey dots.', 'At Level 3 any key comes up: pick the roadmap that keeps you lowest. Chord 1 is marked on the one you should use.'],
      levels: [{ label: 'Level 1', detail: 'Key of C, chords 1–6, map shown', bpm: 60, every: 8 }, { label: 'Level 2', detail: 'Roadmap 2 keys, chords 1–7', bpm: 60, every: 8 }, { label: 'Level 3', detail: 'Any key, either roadmap', bpm: 80, every: 4 }],
      callout: (lvl, st) => {
        st.count = st.count || 0;
        if (st.key == null || (lvl > 0 && st.count % 8 === 0)) st.key = lvl === 0 ? 0 : lvl === 1 ? pick(RM_KEYS[2]) : pick(ALL_KEYS);
        st.count++;
        const n = lvl === 2 ? G.bestRoadmap(st.key) : 2;
        return fresh(st, (r) => r.big + r.where, () => rmCall(n, st.key, 1 + rnd(lvl === 0 ? 6 : 7), lvl === 0, lvl === 2 ? ` · Roadmap ${n}` : ' · Roadmap 2'));
      },
      pass: 'Sixteen chords in a row, on the right fret before the check appears.',
    },
    keystones: {
      title: 'Keystone spotter',
      how: ['A key appears and one string lights up.', 'Find the root on that string (if it\'s the open string, use fret 12). Black keystone = the fret below the root, then the root (7 → 1). White keystone = 4 and 5 frets above the root (3 → 4).', 'Play the white pair, then the black pair, saying the numbers. Any copy between frets 0 and 13 counts. The check shows one of each.'],
      levels: [{ label: 'Level 1', detail: 'Keys C, G, D, A, E on the high e string', bpm: 60, every: 8 }, { label: 'Level 2', detail: 'Any key on the high e string', bpm: 70, every: 8 }, { label: 'Level 3', detail: 'Any key on high e or low E', bpm: 80, every: 8 }],
      callout: (lvl, st) => fresh(st, (r) => r.big + r.where, () => {
        const k = lvl === 0 ? pick([0, 7, 2, 9, 4]) : pick(ALL_KEYS);
        const s = lvl === 2 ? pick([5, 0]) : 5;
        const ks = G.keystones(s, k, 12);
        const w = ks.find((x) => x.type === 'white'), b = ks.find((x) => x.type === 'black');
        return { big: G.keyName(k) + ' major', where: SN(s), answer: `white: frets ${w.f}–${w.f2} · black: frets ${b.f}–${b.f2}`, board: lit(s, 0, 13), reveal: [{ s, f: w.f, kind: 'white', text: '3' }, { s, f: w.f2, kind: 'white', text: '4' }, { s, f: b.f, kind: 'black', text: '7' }, { s, f: b.f2, kind: 'root', text: '1' }] };
      }),
      pass: 'Twelve keys in a row with both keystones found before the check appears.',
    },
    pos1: {
      title: 'Home base run',
      how: ['The shape is below. Start on the lowest note: <b>A, low E string, fret 5</b>.', 'Play every note of position 1 up to the highest note (<b>C, high e, fret 8</b>), then all the way back down. One note per click.', 'Say "one" out loud every time you land on a C (the orange dots).'],
      route: () => route(posRun(1, 'up'), posRun(1, 'down')),
      levels: [{ label: 'Level 1', detail: 'Up and down in A minor / C', bpm: 60, every: 0 }, { label: 'Level 2', detail: 'Up and down, faster', bpm: 90, every: 0 }, { label: 'Level 3', detail: 'Eyes closed in C. Then the same shape in G (start low E fret 12) and D (start low E fret 7). Change the key on the diagram to see them.', bpm: 110, every: 0 }],
      callout: null,
      pass: 'Three runs in a row with no stops and no wrong notes. Level 3: three runs eyes closed in C, then one clean run each in G and D.',
    },
    pos25: {
      title: 'Link the shapes',
      how: ['One note per click. <b>Up</b> = from the low E string to the high e string; <b>down</b> = back. Level 1: position 5 up and down (starts on G, low E fret 3), then position 2 up and down (starts on B, low E fret 7). Use the tabs on the diagram below.', 'Level 2, one non-stop snake: position 5 <b>up</b> (low E fret 3 → high e fret 5) → shift to high e fret 8 → position 1 <b>down</b> (to low E fret 5) → slide to low E fret 7 → position 2 <b>up</b> (to high e fret 10).', 'Level 3: the Level 2 snake, then back: position 2 <b>down</b> (to low E fret 7) → back to low E fret 5 → position 1 <b>up</b> (to high e fret 8) → shift back to high e fret 5 → position 5 <b>down</b> (to low E fret 3).'],
      route: (lvl) => lvl === 0 ? route(posRun(5, 'up'), posRun(5, 'down'), posRun(2, 'up'), posRun(2, 'down'))
        : lvl === 1 ? route(posRun(5, 'up'), posRun(1, 'down'), posRun(2, 'up'))
          : route(posRun(5, 'up'), posRun(1, 'down'), posRun(2, 'up'), posRun(2, 'down'), posRun(1, 'up'), posRun(5, 'down')),
      levels: [{ label: 'Level 1', detail: 'Positions 5 and 2 on their own', bpm: 60, every: 0 }, { label: 'Level 2', detail: 'Snake: 5 up → 1 down → 2 up', bpm: 70, every: 0 }, { label: 'Level 3', detail: 'Snake there and back', bpm: 90, every: 0 }],
      callout: null,
      pass: 'Three runs in a row with no stops and no wrong notes.',
    },
    pos34: {
      title: 'Whole-neck snake',
      how: ['One note per click. <b>Up</b> = low E string to high e; <b>down</b> = back. Level 1: position 4 up and down (open position, starts on the open low E), then position 3 up and down (starts on D, low E fret 10). Use the tabs on the diagram below.', 'Level 2, snake up the whole neck: 4 <b>up</b> (open low E → high e fret 3) → high e fret 5 → 5 <b>down</b> (to low E fret 3) → low E fret 5 → 1 <b>up</b> (to high e fret 8) → high e fret 10 → 2 <b>down</b> (to low E fret 7) → low E fret 10 → 3 <b>up</b> (to high e fret 13).', 'Level 3: the Level 2 snake, then all the way back: 3 <b>down</b> (to low E fret 10) → low E fret 7 → 2 <b>up</b> (to high e fret 10) → high e fret 8 → 1 <b>down</b> (to low E fret 5) → low E fret 3 → 5 <b>up</b> (to high e fret 5) → high e fret 3 → 4 <b>down</b> (to the open low E).'],
      route: (lvl) => lvl === 0 ? route(posRun(4, 'up'), posRun(4, 'down'), posRun(3, 'up'), posRun(3, 'down'))
        : lvl === 1 ? route(posRun(4, 'up'), posRun(5, 'down'), posRun(1, 'up'), posRun(2, 'down'), posRun(3, 'up'))
          : route(posRun(4, 'up'), posRun(5, 'down'), posRun(1, 'up'), posRun(2, 'down'), posRun(3, 'up'), posRun(3, 'down'), posRun(2, 'up'), posRun(1, 'down'), posRun(5, 'up'), posRun(4, 'down')),
      levels: [{ label: 'Level 1', detail: 'Positions 4 and 3 on their own', bpm: 60, every: 0 }, { label: 'Level 2', detail: 'Snake up through all five', bpm: 70, every: 0 }, { label: 'Level 3', detail: 'Snake up and back down', bpm: 90, every: 0 }],
      callout: null,
      pass: 'Three runs in a row with no stops and no wrong notes.',
    },
    cagedH: {
      title: 'One chord, five shapes',
      how: ['Level 1, C major up the neck: <b>C shape</b> (open C, frets 0–3) → <b>A shape</b> (barre at fret 3, frets 3–5) → <b>G shape</b> (root low E fret 8, reaching back to fret 5) → <b>E shape</b> (barre at fret 8, frets 8–10) → <b>D shape</b> (root D string fret 10, frets 10–13). Each one is on the diagram below.', 'Level 2, A minor up the neck: <b>Am shape</b> (open Am, frets 0–2) → <b>Gm shape</b> (root low E fret 5, reaching back to fret 2) → <b>Em shape</b> (barre at fret 5, frets 5–7) → <b>Dm shape</b> (root D string fret 7, frets 7–10) → <b>Cm shape</b> (root A string fret 12, reaching back to fret 9). Switch the diagram to the minor one.', '4 clicks per shape. Strum the easy ones; for awkward ones (G, D, Gm, Cm shapes) pick the chord tones one at a time. Say its name and position, e.g. "G shape, position 1". Level 3: a new key. Find its roots (A string for the C and A shapes, low E for G and E, D string for D), start with whichever shape is lowest on the neck, and go up in C-A-G-E-D order. The C shape sits below its A-string root; the A shape sits on it. If a shape would need frets below 0, use its copy 12 frets higher.'],
      levels: [{ label: 'Level 1', detail: 'C major, all five shapes', bpm: 60, every: 0 }, { label: 'Level 2', detail: 'A minor, all five shapes', bpm: 60, every: 0 }, { label: 'Level 3', detail: 'A new key every round', bpm: 70, every: 20 }],
      callout: (lvl, st) => lvl < 2 ? null : fresh(st, (r) => r.big, () => {
        const k = pick(COMMON_KEYS.filter((x) => x !== 0));
        const a = G.fretOf(k, 1, 0), e = G.fretOf(k, 0, 0), d = G.fretOf(k, 2, 0);
        const roots = [[1, a, 'CA'], [0, e, 'GE'], [2, d, 'D']].flatMap(([s, f, t]) => [f, f + 12].filter((x) => x <= 15).map((x) => ({ s, f: x, kind: 'right', text: t })));
        return { big: G.keyName(k) + ' major', where: 'all five shapes, lowest first, then C-A-G-E-D order', answer: `C & A shapes: root A string fret ${a} · G & E: low E fret ${e} · D: D string fret ${d}`, board: lit([0, 1, 2], 0, 15), reveal: roots };
      }),
      pass: 'All five shapes in order with no stops.',
    },
    cagedV: {
      title: 'Chords inside home base',
      how: ['Position 1 of C major is shown faintly on the fretboard (frets 4–8). Stay inside it.', 'A chord appears. Play its chord tones one note per click, from the low E string up: every root, 3rd and 5th inside the shape. As you play each one, say what it is: "root", "three" or "five".', 'The check lights up the chord tones and names the CAGED shape.'],
      levels: [{ label: 'Level 1', detail: 'Chords 1, 4, 5, 6 (C, F, G, Am)', bpm: 60, every: 16 }, { label: 'Level 2', detail: 'All 7 chords', bpm: 60, every: 16 }, { label: 'Level 3', detail: 'All 7, faster', bpm: 80, every: 16 }],
      callout: (lvl, st) => fresh(st, (r) => r.big, () => {
        const d = lvl === 0 ? pick([1, 4, 5, 6]) : 1 + rnd(7);
        const tones = G.chordTonesIn(G.position(1, C), d, C);
        return { big: triadName(d, C), where: `chord ${d} · position 1`, answer: G.shapeLabel(G.CAGED_VERTICAL[1][d - 1]), board: { lo: 3, hi: 9, dots: ghostPos(1, C) }, reveal: tones.map((x) => ({ ...x, kind: x.role === 'R' ? 'root' : 'right', text: x.role })) };
      }),
      pass: 'Twelve chords in a row with no wrong notes and no stops.',
    },
    connect: {
      title: 'Find home in any key',
      how: ['A key appears with its relative minor. The low E and A strings light up.', '1) Play the relative minor barre chord with its root on the <b>low E</b> string: that’s position 1. 2) Play it with the root on the <b>A</b> string: that’s position 4.', '3) Go back to the low E barre and run position 1 once, up and down, two notes per click. The check marks the relative-minor root on both strings.'],
      levels: [{ label: 'Level 1', detail: 'Keys C, G, D, A', bpm: 70, every: 32 }, { label: 'Level 2', detail: 'Any key', bpm: 70, every: 32 }, { label: 'Level 3', detail: 'Any key, faster', bpm: 80, every: 24 }],
      callout: (lvl, st) => fresh(st, (r) => r.big, () => {
        const k = lvl === 0 ? pick([0, 7, 2, 9]) : pick(ALL_KEYS);
        const m = G.mod(k + 9);
        const fe = G.fretOf(m, 0, 1), fa = G.fretOf(m, 1, 1);
        const nm = G.relMinorName(k).replace(/m$/, '');
        return { big: G.keyName(k) + ' major', where: `relative minor: ${G.relMinorName(k)}`, answer: `${G.relMinorName(k)}: low E fret ${fe} · A string fret ${fa}`, board: lit([0, 1], 0, 15), reveal: [{ s: 0, f: fe, kind: 'right', text: nm }, { s: 1, f: fa, kind: 'right', text: nm }] };
      }),
      pass: 'Eight keys in a row without stopping.',
    },
    jam: {
      title: 'Five-step jam',
      how: ['Put on the track for your level (search YouTube for the exact words shown). Metronome off: the track is your beat.', 'Do the 5 steps in order, about 2 minutes each: <b>1</b> work out the key from the chord names, <b>2</b> play the chords from the right roadmap, <b>3</b> find both keystones, <b>4</b> improvise in position 1, <b>5</b> spread out into the neighbouring positions.', 'Once you’ve named the key, set the map below to it. It shows everything for that key.'],
      levels: [{ label: 'Level 1', detail: 'Search "Am C F G backing track"', bpm: 80, every: 0 }, { label: 'Level 2', detail: 'Search "F#m D A E backing track"', bpm: 80, every: 0 }, { label: 'Level 3', detail: 'Search "Dm Bb F C backing track"', bpm: 80, every: 0 }],
      callout: null,
      pass: 'All 5 steps done in time with the track, without stopping it.',
    },
    triads: {
      title: 'Triad caller',
      how: ['A chord appears (key of C) and three strings light up.', 'Play that chord as a 3-note triad on the lit strings only (its notes are on the Learn tab). Mute the others.', 'Stay around frets 3–10 if you can. Any shape with the right three notes counts; the check shows one that works.'],
      levels: [{ label: 'Level 1', detail: 'C, F, G, Am on the G-B-e strings', bpm: 60, every: 8 }, { label: 'Level 2', detail: 'C, Dm, Em, F, G, Am on G-B-e or D-G-B', bpm: 60, every: 8 }, { label: 'Level 3', detail: 'C, Dm, Em, F, G, Am, faster changes', bpm: 80, every: 4 }],
      callout: (lvl, st) => fresh(st, (r) => r.big + r.where, () => {
        const d = lvl === 0 ? pick([1, 4, 5, 6]) : 1 + rnd(6);
        const set = lvl === 0 ? G.STRING_SETS[0] : pick(G.STRING_SETS.slice(0, 2));
        const vs = G.triadVoicings(G.chordRootPc(d, C), G.QUAL[d - 1] === 'm', set).sort((a, b) => Math.abs(Math.min(...a.frets) - 5) - Math.abs(Math.min(...b.frets) - 5));
        const v = vs[0];
        return { big: G.chordName(d, C), where: G.SET_NAME(set) + ' strings', answer: `frets ${v.frets.join('-')} (${v.inversion})`, board: lit(set, 0, 12), reveal: v.set.map((s, i) => ({ s, f: v.frets[i], kind: v.roles[i] === 'R' ? 'root' : 'right', text: v.roles[i] })) };
      }),
      pass: 'Twelve triads in a row, found before the check appears.',
    },
    lead: {
      title: 'Chord, fill, chord',
      how: ['Loop <b>C – Am – F – G</b> using Roadmap 2 barres: C at A string fret 3, Am at low E fret 5, F at A string fret 8, G at low E fret 3. The diagram below shows the scale under each one.', 'Hit the chord on beat 1. Fill beats 2–4 with notes from the scale position under your hand: C and G sit on position 5, Am on position 1, F on position 2.', 'Land the next chord exactly on beat 1. (Level 2: hit the chord on beat 1 of its first bar and fill both bars.)', 'Level 3: a new Roadmap 2 key appears with its chords. One bar per chord; each key plays the loop twice (32 clicks). Find the chords on the first pass, fill on the second. The scale positions sit under the same chords as in C.'],
      levels: [{ label: 'Level 1', detail: 'C – Am – F – G, one bar each', bpm: 60, every: 0 }, { label: 'Level 2', detail: 'C – Am – F – G, two bars each, longer fills', bpm: 80, every: 0 }, { label: 'Level 3', detail: '1 – 6 – 4 – 5 in a new key every 32 clicks', bpm: 80, every: 32 }],
      callout: (lvl, st) => lvl < 2 ? null : fresh(st, (r) => r.big, () => {
        const k = pick(ALL_KEYS.filter((x) => x !== 0 && G.bestRoadmap(x) === 2));
        const n = G.bestRoadmap(k), r = G.roadmap(n, k);
        const marks = [1, 6, 4, 5].map((d) => r.dots.find((x) => x.deg === d)).map((x) => ({ ...x, kind: x.deg === 1 ? 'root' : 'right', text: String(x.deg) }));
        return { big: G.keyName(k) + ' major', where: [1, 6, 4, 5].map((d) => G.chordName(d, k)).join(' – '), answer: `Roadmap ${n}: chord 1 on the ${SN(r.string)}, fret ${r.root}`, board: lit([0, 1], Math.max(0, r.root - 2), Math.min(17, r.root + 8)), reveal: marks };
      }),
      pass: 'Level 1–2: four loops in a row without dropping a chord. Level 3: four keys in a row.',
    },
  };
  function rmCall(n, k, d, showMap, tag) {
    const r = G.roadmap(n, k);
    const dot = r.dots.find((x) => x.deg === d);
    const rpc0 = G.chordRootPc(d, k);
    const rev0 = barreDots(rpc0, dot.s, dot.f, G.QUAL[d - 1]);
    const lo = Math.max(0, r.root - 2), hi = Math.max(Math.min(17, r.root + 8), ...rev0.map((x) => x.f + 1));
    const base = [...(showMap ? r.dots.filter((x) => x !== r.dots[0]).map((x) => ({ ...x, kind: 'ghost', text: '' })) : []), { ...r.dots[0], kind: 'root', text: '1' }];
    const rpc = G.chordRootPc(d, k);
    return { big: String(d), where: `Key of ${G.keyName(k)}${tag}`, answer: `${G.chordName(d, k)}: ${SN(dot.s)}, fret ${dot.f}`, board: { lo, hi, dots: base }, reveal: barreDots(rpc, dot.s, dot.f, G.QUAL[d - 1]).map((x) => (x.s === dot.s && x.f === dot.f ? { ...x, text: String(d) } : { ...x, text: '' })) };
  }
  S.forEach((s) => { if (PLAYS[s.id]) s.play = PLAYS[s.id]; });
  S.forEach((s, i) => { s.n = i + 1; });
  return S;
})(GC);
if (typeof module !== 'undefined') module.exports = STAGES;
