/* ===== Music core: notes, keys, scales, positions, roadmaps ===== */
const GC = (function () {
  const OPEN_PC = [4, 9, 2, 7, 11, 4];          // string 0 = low E ... 5 = high e
  const OPEN_MIDI = [40, 45, 50, 55, 59, 64];
  const STRING_NAMES = ['low E', 'A', 'D', 'G', 'B', 'high e'];
  const STRING_SHORT = ['E', 'A', 'D', 'G', 'B', 'e'];
  const SHARP = '♯', FLAT = '♭';

  const mod = (n, m = 12) => ((n % m) + m) % m;
  const rnd = (n) => Math.floor(Math.random() * n);
  const pick = (arr) => arr[rnd(arr.length)];
  const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const weighted = (pairs) => { const tot = pairs.reduce((s, p) => s + p[0], 0); let r = Math.random() * tot; for (const [w, v] of pairs) { if ((r -= w) < 0) return v; } return pairs[pairs.length - 1][1]; };

  // Generic note labels (enharmonic pairs), used where no key is in play
  const PC_LABEL = ['C', 'C' + SHARP + '/D' + FLAT, 'D', 'D' + SHARP + '/E' + FLAT, 'E', 'F', 'F' + SHARP + '/G' + FLAT, 'G', 'G' + SHARP + '/A' + FLAT, 'A', 'A' + SHARP + '/B' + FLAT, 'B'];
  const PC_SHORT = ['C', 'C' + SHARP, 'D', 'E' + FLAT, 'E', 'F', 'F' + SHARP, 'G', 'A' + FLAT, 'A', 'B' + FLAT, 'B'];

  // The 12 major keys, spelled the usual way
  const KEYS = [
    { name: 'C', pc: 0 }, { name: 'G', pc: 7 }, { name: 'D', pc: 2 }, { name: 'A', pc: 9 },
    { name: 'E', pc: 4 }, { name: 'B', pc: 11 }, { name: 'F#', pc: 6 }, { name: 'Db', pc: 1 },
    { name: 'Ab', pc: 8 }, { name: 'Eb', pc: 3 }, { name: 'Bb', pc: 10 }, { name: 'F', pc: 5 },
  ];
  const keyByPc = (pc) => KEYS.find((k) => k.pc === mod(pc));
  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const NAT = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const pretty = (s) => s.replace(/##/g, '𝄪').replace(/#/g, SHARP).replace(/bb/g, '𝄫').replace(/(?<=[A-G])b/g, FLAT);

  const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
  // Spelled major scale for key pc -> ['C','D',...]
  function spelledScale(keyPc) {
    const k = keyByPc(keyPc);
    const tonicLetter = k.name[0];
    const li = LETTERS.indexOf(tonicLetter);
    return MAJOR_STEPS.map((st, i) => {
      const letter = LETTERS[(li + i) % 7];
      const target = mod(keyPc + st);
      let diff = mod(target - NAT[letter]);
      if (diff > 6) diff -= 12;
      const acc = diff === 0 ? '' : diff === 1 ? '#' : diff === 2 ? '##' : diff === -1 ? 'b' : 'bb';
      return pretty(letter + acc);
    });
  }
  const keyName = (keyPc) => pretty(keyByPc(keyPc).name);
  const scalePcs = (keyPc) => MAJOR_STEPS.map((s) => mod(keyPc + s));
  const degreeOf = (pc, keyPc) => { const i = scalePcs(keyPc).indexOf(mod(pc)); return i < 0 ? null : i + 1; };
  // Name a pitch class in the spelling of a key (diatonic) or a sensible fallback
  function nameIn(pc, keyPc) {
    const d = degreeOf(pc, keyPc);
    if (d) return spelledScale(keyPc)[d - 1];
    const flatKeys = [5, 10, 3, 8, 1]; // F Bb Eb Ab Db prefer flats
    if (flatKeys.includes(mod(keyPc))) return pretty(['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'][mod(pc)]);
    return pretty(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][mod(pc)]);
  }
  const relMinorName = (keyPc) => spelledScale(keyPc)[5] + 'm';
  const keyLabel = (keyPc) => keyName(keyPc) + ' major / ' + relMinorName(keyPc);

  const pcAt = (s, f) => mod(OPEN_PC[s] + f);
  const midiAt = (s, f) => OPEN_MIDI[s] + f;

  // Chords in a key
  const QUAL = ['M', 'm', 'm', 'M', 'M', 'm', 'dim'];
  const QUAL_WORD = { M: 'major', m: 'minor', dim: 'diminished' };
  function chordName(deg, keyPc) {
    const root = spelledScale(keyPc)[deg - 1];
    const q = QUAL[deg - 1];
    return root + (q === 'm' ? 'm' : q === 'dim' ? 'm7' + FLAT + '5' : '');
  }
  const chordRootPc = (deg, keyPc) => scalePcs(keyPc)[deg - 1];
  function chordPcs(deg, keyPc) {
    const r = chordRootPc(deg, keyPc), q = QUAL[deg - 1];
    const third = q === 'M' ? 4 : 3, fifth = q === 'dim' ? 6 : 7;
    return [r, mod(r + third), mod(r + fifth)];
  }

  // ---- Scale positions (templates in C major / A minor, absolute frets) ----
  const POS_TEMPLATES = {
    1: [[5, 7, 8], [5, 7, 8], [5, 7], [4, 5, 7], [5, 6, 8], [5, 7, 8]],
    2: [[7, 8, 10], [7, 8, 10], [7, 9, 10], [7, 9, 10], [8, 10], [7, 8, 10]],
    3: [[10, 12, 13], [10, 12], [9, 10, 12], [9, 10, 12], [10, 12, 13], [10, 12, 13]],
    4: [[0, 1, 3], [0, 2, 3], [0, 2, 3], [0, 2], [0, 1, 3], [0, 1, 3]],
    5: [[3, 5], [2, 3, 5], [2, 3, 5], [2, 4, 5], [3, 5, 6], [3, 5]],
  };
  // Shift a set of frets to a key and keep it on a 0-15 neck
  function fitShift(frets, shift, maxFret = 15) {
    let s = shift;
    const lo = Math.min(...frets), hi = Math.max(...frets);
    while (hi + s > maxFret && lo + s - 12 >= 0) s -= 12;
    while (lo + s < 0) s += 12;
    return s;
  }
  function position(p, keyPc, opts = {}) {
    const t = POS_TEMPLATES[p];
    const all = t.flat();
    let shift = fitShift(all, mod(keyPc), opts.maxFret || 15);
    if (opts.octaveUp && Math.max(...all) + shift + 12 <= (opts.maxFret || 17)) shift += 12;
    const dots = [];
    t.forEach((frets, s) => frets.forEach((f) => {
      const ff = f + shift;
      dots.push({ s, f: ff, deg: degreeOf(pcAt(s, ff), keyPc) });
    }));
    return dots;
  }
  // Same position, moved by octaves to sit closest to a given fret
  function positionNear(p, keyPc, center, maxFret = 17) {
    const base = position(p, keyPc);
    let best = base, bestD = Infinity;
    for (const o of [-12, 0, 12]) {
      const fr = base.map((d) => d.f + o);
      if (Math.min(...fr) < 0 || Math.max(...fr) > maxFret) continue;
      const mean = fr.reduce((a, b) => a + b, 0) / fr.length;
      if (Math.abs(mean - center) < bestD) { bestD = Math.abs(mean - center); best = base.map((d) => ({ ...d, f: d.f + o })); }
    }
    return best;
  }
  const posSpan = (dots) => [Math.min(...dots.map((d) => d.f)), Math.max(...dots.map((d) => d.f))];
  const isPent = (deg) => deg !== 4 && deg !== 7;

  // Lowest fret (>=1 where possible) of a pitch class on a string
  const fretOf = (pc, s, min = 1) => { let f = mod(pc - OPEN_PC[s]); while (f < min) f += 12; return f; };
  const relMinorFretE = (keyPc) => fretOf(mod(keyPc + 9), 0, 0) || 12; // position 1 anchor
  const pos1StartFret = (keyPc) => Math.min(...position(1, keyPc).map((d) => d.f));

  // ---- Chord roadmaps ----
  function roadmap(n, keyPc) {
    const out = [];
    if (n === 1) {
      let r = fretOf(keyPc, 0, 1);
      if (r + 6 > 17) r -= 12;
      [[0, 0, 1], [0, 2, 2], [0, 4, 3], [1, 0, 4], [1, 2, 5], [1, 4, 6], [1, 6, 7]].forEach(([s, df, deg]) => out.push({ s, f: r + df, deg }));
      return { root: r, string: 0, dots: out, alts: [{ s: 0, f: r - 1, deg: 7 }, { s: 1, f: r - 1, deg: 3 }, { s: 0, f: r + 5, deg: 4 }].filter((d) => d.f >= 1) };
    }
    const r = fretOf(keyPc, 1, 1);
    [[1, 0, 1], [1, 2, 2], [1, 4, 3], [1, 5, 4], [0, 0, 5], [0, 2, 6], [0, 4, 7], [0, 5, 1]].forEach(([s, df, deg]) => out.push({ s, f: r + df, deg }));
    return { root: r, string: 1, dots: out, alts: [{ s: 0, f: r - 2, deg: 4 }].filter((d) => d.f >= 1) };
  }
  // Which roadmap keeps the hand lowest (1 if root on low E is not higher than on A)
  function bestRoadmap(keyPc) {
    const rE = fretOf(keyPc, 0, 1), rA = fretOf(keyPc, 1, 1);
    return rE <= rA ? 1 : 2;
  }
  function shapeFor(n, deg) {
    const d = roadmap(n, 0).dots.find((x) => x.deg === deg);
    const q = QUAL[deg - 1];
    if (q === 'dim') return 'm7' + FLAT + '5 shape';
    return (d.s === 0 ? 'E' : 'A') + '-shape ' + (q === 'M' ? 'major' : 'minor');
  }

  // ---- Keystones along one string ----
  function keystones(s, keyPc, maxFret = 15) {
    const out = [];
    for (let f = 0; f < maxFret; f++) {
      const d1 = degreeOf(pcAt(s, f), keyPc), d2 = degreeOf(pcAt(s, f + 1), keyPc);
      if (d1 === 3 && d2 === 4) out.push({ type: 'white', s, f, f2: f + 1 });
      if (d1 === 7 && d2 === 1) out.push({ type: 'black', s, f, f2: f + 1 });
    }
    return out;
  }
  function stringScale(s, keyPc, lo = 0, hi = 15) {
    const dots = [];
    for (let f = lo; f <= hi; f++) { const d = degreeOf(pcAt(s, f), keyPc); if (d) dots.push({ s, f, deg: d }); }
    return dots;
  }

  // ---- CAGED ----
  const CAGED_MAJOR = { 4: 'C', 5: 'A', 1: 'G', 2: 'E', 3: 'D' };
  const CAGED_MINOR = { 4: 'Am', 5: 'Gm', 1: 'Em', 2: 'Dm', 3: 'Cm' };
  // Shape used for each chord (1..7) of the key inside each position (key-independent)
  const CAGED_VERTICAL = {
    1: ['G', 'Am', 'Cm', 'C', 'D', 'Em', 'Em*'],
    2: ['E', 'Gm', 'Am', 'A', 'C', 'Dm', 'Dm*'],
    3: ['D', 'Em', 'Gm', 'G', 'A', 'Cm', 'D*'],
    4: ['C', 'Dm', 'Em', 'E', 'G', 'Am', 'Am*'],
    5: ['A', 'Cm', 'Dm', 'D', 'E', 'Gm', 'Gm*'],
  };
  const shapeLabel = (code) => code.endsWith('*') ? 'm7' + FLAT + '5 (bent ' + code.slice(0, -1) + ' shape)' : code + ' shape';
  function chordTonesIn(dots, deg, keyPc) {
    const pcs = chordPcs(deg, keyPc);
    return dots.filter((d) => pcs.includes(pcAt(d.s, d.f))).map((d) => ({ ...d, role: ['R', '3', '5'][pcs.indexOf(pcAt(d.s, d.f))] }));
  }

  // ---- Triads on 3-string sets ----
  const STRING_SETS = [[3, 4, 5], [2, 3, 4], [1, 2, 3], [0, 1, 2]];
  const SET_NAME = (set) => set.map((s) => STRING_SHORT[s]).join('-');
  function triadVoicings(rootPc, minor, set, maxFret = 15) {
    const pcs = [rootPc, mod(rootPc + (minor ? 3 : 4)), mod(rootPc + 7)];
    const opts = set.map((s) => { const a = []; for (let f = 0; f <= maxFret; f++) if (pcs.includes(pcAt(s, f))) a.push(f); return a; });
    const res = [];
    for (const a of opts[0]) for (const b of opts[1]) for (const c of opts[2]) {
      const fr = [a, b, c];
      const roles = fr.map((f, i) => pcs.indexOf(pcAt(set[i], f)));
      if (new Set(roles).size !== 3) continue;
      if (Math.max(...fr) - Math.min(...fr) > 3) continue;
      const lowRole = roles[0];
      res.push({ set, frets: fr, roles: roles.map((r) => ['R', '3', '5'][r]), inversion: ['root position', '1st inversion', '2nd inversion'][lowRole] });
    }
    return res;
  }

  // ---- Diagonal pentatonic (pairs of strings, 2 + 3 notes, slide on the last step) ----
  function diagonal(keyPc) {
    // Template in C: low E G3 A5 | A C3 D5 E7(slide) | D G5 A7 | G C5 D7 E9(slide) | B G8 A10 | e C8 D10 E12(slide)
    const t = [[0, 3], [0, 5], [1, 3], [1, 5], [1, 7], [2, 5], [2, 7], [3, 5], [3, 7], [3, 9], [4, 8], [4, 10], [5, 8], [5, 10], [5, 12]];
    const shift = fitShift(t.map((x) => x[1]), mod(keyPc), 17);
    const dots = t.map(([s, f]) => ({ s, f: f + shift, deg: degreeOf(pcAt(s, f + shift), keyPc) }));
    const links = [[1, 5 + shift, 1, 7 + shift], [3, 7 + shift, 3, 9 + shift], [5, 10 + shift, 5, 12 + shift]];
    return { dots, links };
  }

  // ---- Intervals ----
  const INTERVALS = ['unison', 'minor 2nd', 'major 2nd', 'minor 3rd', 'major 3rd', 'perfect 4th', 'tritone', 'perfect 5th', 'minor 6th', 'major 6th', 'minor 7th', 'major 7th', 'octave'];
  const INT_SHORT = ['1', 'm2', 'M2', 'm3', 'M3', 'P4', 'TT', 'P5', 'm6', 'M6', 'm7', 'M7', '8va'];

  // ---- Octave shape helper: trace a note back to the E or A string ----
  function traceToEA(s, f) {
    const chain = [{ s, f }];
    let cs = s, cf = f;
    if (cs === 5) { chain.push({ s: 0, f: cf }); return chain; } // high e = low E
    while (cs > 1) {
      const back = (cs === 4 || cs === 5) ? 3 : 2;
      cs -= 2; cf -= back;
      if (cf < 0) cf += 12;
      chain.push({ s: cs, f: cf });
    }
    return chain;
  }
  const LANDMARKS = [3, 5, 7, 9, 12];

  return {
    OPEN_PC, OPEN_MIDI, STRING_NAMES, STRING_SHORT, SHARP, FLAT, KEYS, PC_LABEL, PC_SHORT,
    mod, rnd, pick, shuffle, weighted, pretty,
    keyByPc, spelledScale, keyName, scalePcs, degreeOf, nameIn, relMinorName, keyLabel,
    pcAt, midiAt, QUAL, QUAL_WORD, chordName, chordRootPc, chordPcs,
    POS_TEMPLATES, position, positionNear, posSpan, isPent, fretOf, relMinorFretE, pos1StartFret,
    roadmap, bestRoadmap, shapeFor, keystones, stringScale,
    CAGED_MAJOR, CAGED_MINOR, CAGED_VERTICAL, shapeLabel, chordTonesIn,
    STRING_SETS, SET_NAME, triadVoicings, diagonal, INTERVALS, INT_SHORT, traceToEA, LANDMARKS,
  };
})();
if (typeof module !== 'undefined') module.exports = GC;
