/* ===== Learn tab lessons: plain explanation, worked example, diagram in place ===== */
// Each section: { h: heading, p: [paragraphs (html)], ex: example (html), table: [[...row], ...], fig: index of the stage figure to show after it }
const LESSONS = {
  notes: [
    { h: 'There are only 12 notes', p: [
      'All Western music uses just 12 notes. They repeat over and over, higher and lower, all the way up the neck.',
      'Seven of them have plain letter names: <b>A B C D E F G</b>. After G you go back to A. The other five sit in the gaps between those letters. They borrow a neighbour’s name with a <b>sharp</b> (♯, one fret higher) or a <b>flat</b> (♭, one fret lower). So the note between C and D is called C♯ <i>or</i> D♭. Same fret, two names.',
      'On the guitar, every fret moves you one step through that list.' ],
      ex: 'The full cycle, one fret at a time:<br><b>A · A♯/B♭ · B · C · C♯/D♭ · D · D♯/E♭ · E · F · F♯/G♭ · G · G♯/A♭ · A</b>' },
    { h: 'The one rule: B–C and E–F', p: [
      'Two pairs of letters have <b>no note between them</b>: B to C, and E to F. They’re only one fret apart. Every other pair of letters is two frets apart.',
      'That’s the only rule you need. Everything else is counting frets.' ],
      ex: 'On the low E string: open = <b>E</b>, fret 1 = <b>F</b> (nothing between E and F), fret 2 = <b>F♯</b>, fret 3 = <b>G</b>.' },
    { h: 'Landmarks: learn 5 frets per string, count the rest', p: [
      'The low E and A strings matter most, because later every chord and scale gets placed from a root note on one of them.',
      'Don’t memorise all 12 frets. Learn the notes at the <b>dot frets</b> (3, 5, 7, 9, 12) and count up or down from the nearest one. Fret 12 is the open string again, one octave higher.' ],
      table: [['', 'Fret 3', 'Fret 5', 'Fret 7', 'Fret 9', 'Fret 12'], ['Low E', 'G', 'A', 'B', 'C♯', 'E'], ['A', 'C', 'D', 'E', 'F♯', 'A']],
      ex: 'Need D♯ on the low E string? Fret 12 is E, so go one fret down: <b>fret 11</b>.', fig: 0 },
    { h: 'The octave shape', p: [
      'An <b>octave</b> is the same note, just higher. There’s a shape that finds it instantly: from any note, go <b>up two strings and two frets to the right</b>.',
      'There’s one twist. If you land on the <b>B or high e</b> string, go <b>three</b> frets right instead. The B string is tuned one fret lower than the pattern, so everything past it shifts by one.' ],
      ex: 'G on low E fret 3 → two strings up, two frets right → <b>D string fret 5 is also G</b>.<br>G on D string fret 5 → up two strings to B, three frets right → <b>B string fret 8 is G</b>.', fig: 1 },
    { h: 'Naming notes on D, G, B and high e', p: [
      'Run the octave shape <b>backwards</b>: go down two strings and two frets left (three frets if you’re starting on B or high e). Repeat until you land on low E or A, where you know the landmarks.',
      'High e is the easy one: it has exactly the same notes as low E, fret for fret.' ],
      ex: 'What’s on the B string, fret 6? Back three frets, down two strings: <b>D string fret 3</b>. Back two more, down two: <b>low E fret 1 = F</b>. So it’s F.' },
    { h: 'Why this matters', p: [
      'Every system in this course starts with "find the root on low E or A". If finding notes is slow, everything after it is slow. Speed isn’t the goal yet. A reliable method you never have to guess at is.' ] },
  ],

  intervals: [
    { h: 'What an interval is', p: [
      'An interval is the <b>distance between two notes</b>, counted in frets. One fret is a <b>semitone</b> (also called a half step). Two frets is a <b>tone</b> (a whole step).',
      'Each distance has a name. The names sound technical, but they just describe how far apart two notes are, and each one has its own sound.' ] },
    { h: 'All 12, from the root', p: ['You don’t need to memorise this table. Just recognise the names when you see them.'],
      table: [['Frets', 'Name', 'Short'], ['1', 'minor 2nd', 'm2'], ['2', 'major 2nd', 'M2'], ['3', 'minor 3rd', 'm3'], ['4', 'major 3rd', 'M3'], ['5', 'perfect 4th', 'P4'], ['6', 'tritone', 'TT'], ['7', 'perfect 5th', 'P5'], ['8', 'minor 6th', 'm6'], ['9', 'major 6th', 'M6'], ['10', 'minor 7th', 'm7'], ['11', 'major 7th', 'M7'], ['12', 'octave', '8va']] },
    { h: 'The four that really matter', p: [
      '<b>Minor 3rd (3 frets)</b>: the "sad" sound. It’s what makes a chord minor.',
      '<b>Major 3rd (4 frets)</b>: the "happy" sound. It’s what makes a chord major.',
      '<b>Perfect 5th (7 frets)</b>: strong and neutral. Root + 5th is a power chord.',
      '<b>Octave (12 frets)</b>: the same note, higher.' ],
      ex: 'Put a finger on A (low E, fret 5). Play it, then fret 8 (C): that’s a <b>minor 3rd</b>. Now A, then fret 9 (C♯): a <b>major 3rd</b>. That one fret is the whole difference between minor and major.', fig: 0 },
    { h: 'Across strings: small shapes instead of big stretches', p: [
      'Along one string, intervals mean big stretches. Across two strings they become tiny shapes. From a root on low E or A, on the next string up:',
      'Same fret = <b>perfect 4th</b>. Two frets higher = <b>perfect 5th</b> (the power chord shape). One fret lower = <b>major 3rd</b>. Two frets lower = <b>minor 3rd</b>. Two strings up and two frets higher = <b>octave</b>.',
      'Same rule as the octave shape: when the shape crosses from G to B, add one fret.' ],
      ex: 'From A (low E fret 5): A string fret 5 = D (4th), fret 7 = E (5th), fret 4 = C♯ (major 3rd), fret 3 = C (minor 3rd).' },
    { h: 'Why this matters', p: [
      'Chords are built from intervals (you’ll see this in stage 15), and words like "the 3rd" and "the 5th" come up all through the course. For now: know the names, and know those four sounds.' ] },
  ],

  scale: [
    { h: 'A scale picks 7 notes out of 12', p: [
      'Play all 12 notes in a row and it sounds aimless. A <b>scale</b> picks 7 of them that sound good together. The <b>major scale</b> is the one you already know as "do re mi fa so la ti do".' ] },
    { h: 'The formula: 2-2-1-2-2-2-1', p: [
      'Start on any note, then move up by these numbers of frets: <b>2, 2, 1, 2, 2, 2, 1</b>. Remember it like a phone number: <b>221-2221</b>. Do that from any note and you get the major scale of that note.' ],
      ex: '<b>C major</b>: C (+2) D (+2) E (+1) F (+2) G (+2) A (+2) B (+1) C. All plain letters.<br><b>G major</b>: G A B C D E <b>F♯</b> G. The formula forces the F♯: E to F is only one fret, so you need one more.' },
    { h: 'Give the notes numbers', p: [
      'Number the notes 1 to 7. In C: C = 1, D = 2, E = 3 … B = 7. In G: G = 1, A = 2 … F♯ = 7.',
      'The number tells you the <b>job</b> a note does in the key, not its name. That’s why the same tune can be played in any key: the numbers stay the same, only the names change.' ],
      ex: 'Happy Birthday starts on the numbers <b>5 5 6 5 1 7</b>. In C that’s G G A G C B. In G it’s D D E D G F♯. Same tune, different key.' },
    { h: 'See it on one string', p: [
      'Play a major scale along a single string and the formula becomes visible: mostly 2-fret gaps, with two 1-fret gaps. Those two always fall between <b>3 → 4</b> and <b>7 → 1</b>. Remember that: in stage 7 they become your landmarks (the keystones).' ], fig: 0 },
    { h: 'Why this matters', p: [
      'Everything from here uses these numbers. Guitarists say "play the 4 chord" or "land on the 3" instead of note names, because numbers work in every key.' ] },
  ],

  chords: [
    { h: 'Every key has 7 chords', p: [
      'Build a chord on each note of the major scale, using only notes from that scale, and you get the 7 chords of the key. Because they share the same notes, they all sound like they belong together. That’s why songs mostly use them.' ] },
    { h: 'The pattern never changes', p: [
      'In every major key the chord types follow the same pattern: <b>1, 4 and 5 are major. 2, 3 and 6 are minor. 7 is diminished.</b>' ],
      table: [['Number', '1', '2', '3', '4', '5', '6', '7'], ['Type', 'major', 'minor', 'minor', 'major', 'major', 'minor', 'dim'], ['Key of C', 'C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bm7♭5'], ['Key of G', 'G', 'Am', 'Bm', 'C', 'D', 'Em', 'F♯m7♭5']] },
    { h: 'The odd one: chord 7', p: [
      'Chord 7 is tense and unstable. We play it as a <b>m7♭5</b> chord (also called half-diminished). It’s rarely used, and when it is, it usually leads straight back to chord 1.' ] },
    { h: 'Four shapes play almost everything', p: [
      'Barre chords are movable, so one shape plays any chord. Which shape you use depends on which string the root is on:',
      '<b>Root on low E → E-shape</b> (the open E chord, moved up with a barre). <b>Root on A → A-shape</b> (the open A chord, moved up). Each has a major and a minor version. The minor version changes just one finger.' ],
      ex: '<b>D minor</b>: D is on the A string at fret 5, so play an <b>A-shape minor</b> barre at fret 5.<br><b>G major</b>: G is on low E at fret 3, so play an <b>E-shape major</b> barre at fret 3.', fig: 0 },
    { h: 'The relative minor', p: [
      'Chord 6 is special. It’s the <b>relative minor</b> of the key (Am in C, Em in G). It uses exactly the same notes. A song using these chords feels major if it keeps coming home to chord 1, and minor if it keeps coming home to chord 6.' ] },
    { h: 'Why this matters', p: [
      'Know the pattern and you can write a progression in any key, and quickly work out what key a song is in from its chords.' ] },
  ],

  rm1: [
    { h: 'The problem roadmaps solve', p: [
      'Played as open chords, the 7 chords of a key are scattered all over the neck, and some keys are awkward. A <b>chord roadmap</b> is a fixed layout that puts all 7 chords within a few frets, using barre chords. Learn it once and it works in every key.' ] },
    { h: 'The layout', p: [
      'Put <b>chord 1 on the low E string</b>, at the key’s root.',
      '<b>Chords 2 and 3</b> are the next two notes along the low E string (2 frets apart each).',
      '<b>Chords 4, 5 and 6</b> sit directly <b>above</b> 1, 2 and 3, on the A string.',
      '<b>Chord 7</b> is on the A string, two frets past chord 6.' ],
      ex: 'Key of G: G at low E fret 3, Am at fret 5, Bm at fret 7. Right above them on the A string: C at fret 3, D at fret 5, Em at fret 7. Then F♯m7♭5 at A string fret 9.', fig: 0 },
    { h: 'The shape follows the string', p: [
      'Roots on low E use <b>E-shape</b> barre chords. Roots on the A string use <b>A-shape</b>. Major or minor comes from the number: 1, 4, 5 major; 2, 3, 6 minor; 7 m7♭5. Faded dots on the diagram are shortcuts (see below).' ] },
    { h: 'Moving it to another key', p: [
      'Slide the whole map so chord 1 sits on the new key’s root on low E. Nothing else changes.',
      'Roadmap 1 is best for keys whose root is low on the E string: <b>F, F♯, G, A♭, A, B♭</b>. Other keys push it high up the neck. That’s what Roadmap 2 is for.' ],
      ex: 'Key of A: chord 1 goes to low E fret 5. So Bm is at fret 7, C♯m at fret 9, D at A string fret 5, and so on.' },
    { h: 'Shortcuts', p: [
      'Some chords also have a closer spot. Chord <b>7</b> sits one fret behind chord 1 on low E. Chord <b>3</b> sits one fret behind chord 4 on the A string. Chord <b>4</b> also sits on low E, five frets above chord 1. Use whichever is closest to where your hand already is.' ] },
    { h: 'Why this matters', p: [
      'A progression written in numbers ("1 – 5 – 6 – 4") becomes instantly playable in any key, and changing key is just sliding your hand.' ] },
  ],

  rm2: [
    { h: 'Why a second roadmap', p: [
      'In some keys Roadmap 1 sits high on the neck. In C, chord 1 would be at low E fret 8. <b>Roadmap 2</b> puts chord 1 on the <b>A string</b> instead, so those keys sit low and comfortable.' ] },
    { h: 'The layout', p: [
      'Put <b>chord 1 on the A string</b>, at the key’s root.',
      '<b>Chords 2, 3 and 4</b> go along the A string: up 2 frets, 2 frets, then 1 fret.',
      '<b>Chords 5, 6 and 7</b> sit directly <b>below</b> 1, 2 and 3, on the low E string. Chord 1 appears again on low E, below chord 4.' ],
      ex: 'Key of C: C at A string fret 3, Dm at 5, Em at 7, F at 8. Below them on low E: G at fret 3, Am at 5, Bm7♭5 at 7, and C again at 8.', fig: 0 },
    { h: 'Which roadmap for which key?', p: [
      'Find the key’s root on the low E string and on the A string. <b>Use the roadmap whose root is lower on the neck.</b>' ],
      ex: 'C: low E fret 8 vs A string fret 3 → <b>Roadmap 2</b>.<br>G: low E fret 3 vs A string fret 10 → <b>Roadmap 1</b>.<br>E: low E fret 12 (or open) vs A string fret 7 → <b>Roadmap 2</b>.' },
    { h: 'Think in numbers', p: [
      'Once both roadmaps are in your hands, you don’t need chord names. "6 – 4 – 1 – 5 in E♭" is just a pattern: find E♭, pick the roadmap, play the numbers.' ] },
    { h: 'Why this matters', p: ['Between the two roadmaps, every key has a comfortable spot for all 7 chords. That’s your rhythm-guitar foundation for the rest of the course.'] },
  ],

  keystones: [
    { h: 'Back to the scale on one string', p: [
      'Play a major scale along one string and you get mostly 2-fret steps. Only two steps are 1 fret: between notes <b>3 → 4</b> and <b>7 → 1</b>.' ] },
    { h: 'Give them names', p: [
      'Call them the <b>white keystone</b> (3 → 4) and the <b>black keystone</b> (7 → 1). The colours are just labels. In this app, white dots are 3 and 4, the black dot is 7, and the orange dot is 1.' ] },
    { h: 'Why they help', p: [
      'In a long row of evenly spaced notes it’s easy to lose track of where you are. The two 1-fret pairs stand out. Spot one and you know exactly which numbers you’re on, so everything around it falls into place. Think of them as lighthouses.' ],
      ex: 'G major on the high e string: the black keystone is at frets 2–3 (F♯ → G). The white keystone is at frets 7–8 (B → C).', fig: 0 },
    { h: 'Coming up: shapes sit on keystones', p: [
      'The scale shapes in the next stages are anchored to these. <b>Position 1 sits on the black keystone. Position 4 sits on the white keystone.</b> Find a keystone and you’ve found a shape.' ] },
    { h: 'The pentatonic connection', p: [
      'The pentatonic scale is the major scale with notes <b>4 and 7</b> removed: one note from each keystone. That’s why the pentatonic has no 1-fret steps. It’s easy to play, but it hides your landmarks. That’s why this course has you learn the full 7-note shapes.' ] },
  ],

  pos1: [
    { h: 'What a "position" is', p: [
      'A <b>position</b> is a scale shape you play with your hand in one spot, covering about 4 or 5 frets across all six strings. There are five positions, and together they cover the whole neck. You’ll learn them one at a time, starting with the most important one.' ] },
    { h: 'Position 1', p: [
      'You might know the minor pentatonic "box". Position 1 is that box <b>plus the two missing notes (4 and 7)</b>, which makes it the full 7-note scale.',
      'In C major / A minor it covers <b>frets 4 to 8</b>. It starts on <b>A at low E fret 5</b> and ends on <b>C at high e fret 8</b>. Use the toggle on the diagram to compare the pentatonic with the full scale.' ], fig: 0 },
    { h: 'One shape, major and minor', p: [
      'C major and A minor use exactly the same notes (A minor is C’s relative minor), so they share this shape. Whether it sounds major or minor depends on which note feels like home (C or A) and the chords playing underneath.' ] },
    { h: 'Placing it in any key', p: [
      'The first note on the low E string is always the <b>relative minor root</b>. Find that and the shape drops into place.' ],
      ex: 'C major / A minor: A at low E <b>fret 5</b>.<br>G major / E minor: E at low E <b>fret 12</b> (or open).<br>D major / B minor: B at low E <b>fret 7</b>.<br>For now, stay in C.' },
    { h: 'Home base: go deep, not wide', p: [
      'Instead of learning all five shapes at once, master this one until you don’t have to think. Then, when you get lost mid-song, you always have a safe place to come back to. Everything else in the course plugs into it.' ] },
  ],

  pos25: [
    { h: 'Positions share walls', p: [
      'Each position starts where the previous one ends. Neighbouring shapes overlap by a column of notes, so they lock together like puzzle pieces.' ] },
    { h: 'Position 2 above, position 5 below', p: [
      'In C major / A minor: <b>position 5</b> sits just below position 1 (frets 2–6) and starts on <b>G at low E fret 3</b>. <b>Position 2</b> sits just above (frets 7–10) and starts on <b>B at low E fret 7</b>.',
      'They hold exactly the same notes as position 1, just in a different spot. Flip between them on the diagram to see the overlap.' ], fig: 0 },
    { h: 'Moving between them', p: [
      'You don’t jump between shapes. You <b>slide</b>. Slide one note up or down two frets and your hand lands in the next shape.' ],
      ex: 'In position 1, play the G string at fret 7 (D), then slide up to fret 9 (E). Your hand is now sitting in position 2.' },
    { h: 'Why this matters', p: [
      'Three connected shapes give you about 8 frets of room. Your phrases no longer have to stop where the box ends.' ] },
  ],

  pos34: [
    { h: 'The last two shapes', p: [
      'In C major / A minor, <b>position 4</b> sits below position 5. In C it’s the open-string shape (frets 0–3), starting on the open low E. <b>Position 3</b> sits above position 2 (frets 9–13), starting on <b>D at low E fret 10</b>.' ], fig: 0 },
    { h: 'The loop around the neck', p: [
      'Going up the neck in C: <b>4 (frets 0–3) → 5 (2–6) → 1 (4–8) → 2 (7–10) → 3 (9–13) → 4 again (12–15)</b>. After 3 comes 4 again, 12 frets higher. The neck is a circle: run out of room at the top and the same shapes continue at the bottom.' ] },
    { h: 'The white keystone lives in position 4', p: [
      'Just as position 1 holds the black keystone, position 4 holds the <b>white keystone (3 → 4)</b> on both E strings: E → F at frets 0–1 (and 12–13).' ] },
    { h: 'The big picture', p: [
      'All five positions are the <b>same 7 notes</b>. Put them together and the whole neck is one big scale. The positions are just five handy ways to grab it.' ], fig: 1 },
    { h: 'Priorities', p: ['Position 1 is home. Positions 2 and 5 come next. Positions 3 and 4 are worth knowing but get the least time.'] },
  ],

  cagedH: [
    { h: 'The five shapes you already know', p: [
      '<b>C, A, G, E and D</b> are the five open chord shapes most players learn first. Every major chord can be played with any of these five shapes, just moved up the neck.' ] },
    { h: 'Barre chords are CAGED too', p: [
      'An E-shape barre chord is the open E chord moved up, with your finger acting as the nut. An A-shape barre is the open A chord moved up. You’ve been using CAGED all along.' ] },
    { h: 'One chord, five shapes, always in the same order', p: [
      'Play one chord up the neck and the shapes always come in the order <b>C → A → G → E → D</b>, then repeat.' ],
      ex: 'C major: <b>C shape</b> (open C) → <b>A shape</b> (barre at fret 3) → <b>G shape</b> (root on low E fret 8) → <b>E shape</b> (barre at fret 8) → <b>D shape</b> (root on D string fret 10) → C shape again at fret 12.', fig: 0 },
    { h: 'Each shape lives inside a position', p: [
      'This is the useful part. Each shape sits inside one scale position: <b>C shape = position 4, A = 5, G = 1, E = 2, D = 3</b>. Every position now has a familiar chord picture inside it, a landmark to recognise it by.' ] },
    { h: 'Minor works the same way', p: [
      'The relative minor chord (Am in C) also has five shapes in every position: <b>Am shape = position 4, Gm = 5, Em = 1, Dm = 2, Cm = 3</b>. Some are awkward to play in full. You only need to see them.' ], fig: 1 },
    { h: 'Why this matters', p: [
      'When soloing over the key’s main chord, the chord’s notes (root, 3rd, 5th) are the safest, strongest notes to land on, and now you can see them inside whatever position you’re in.' ] },
  ],

  cagedV: [
    { h: 'The opposite of stage 11', p: [
      'Stage 11 played one chord in every position. This stage stays in <b>one position</b> and finds <b>all 7 chords</b> of the key inside it.' ] },
    { h: 'Inside position 1 of C major', p: ['Each chord of the key is hiding in the shape as a CAGED shape. Tap through the chords on the diagram.'],
      table: [['Chord', 'C (1)', 'Dm (2)', 'Em (3)', 'F (4)', 'G (5)', 'Am (6)', 'Bm7♭5 (7)'], ['Shape', 'G', 'Am', 'Cm', 'C', 'D', 'Em', 'bent Em']], fig: 0 },
    { h: 'Chord tones', p: [
      'Each chord’s three notes (root, 3rd, 5th) are its <b>chord tones</b>. When the chord changes in a song, landing on one of the new chord’s tones makes your solo sound connected to the music instead of just running a scale.' ] },
    { h: 'Light touch', p: ['You don’t need to strum these as chords. Some are awkward. The goal is to <b>see</b> them, so start with position 1 only.'] },
  ],

  connect: [
    { h: 'Four systems, one neck', p: [
      'You now have four tools: <b>roadmaps</b> for chords, <b>keystones</b> as landmarks, <b>positions</b> for scales and <b>CAGED</b> for chord shapes inside the positions. They all describe the same neck, so they fit together perfectly.' ], fig: 0 },
    { h: 'Roadmap 2 sits on top of position 1', p: [
      'In C, the Roadmap 2 barre chords put your hand right over the scale positions: chords at fret 3 sit on position 5, chords at fret 5 on position 1, and chords at frets 7–8 on position 2. So chords and scales are never far apart.' ] },
    { h: 'The fastest way into a new key', p: [
      'Play the key’s <b>relative minor</b> as a barre chord with the root on <b>low E</b>: you’re now on position 1 and the black keystone. Play the same chord with the root on the <b>A string</b>: you’re on position 4 and the white keystone. Two chords and you’ve found everything.' ],
      ex: 'Key of E major: the relative minor is C♯m. C♯m at low E fret 9 → position 1. C♯m at A string fret 4 → position 4.' },
    { h: 'The neck is a circle', p: ['If a shape runs off the top of the neck, it carries on 12 frets lower with exactly the same pattern. Use whichever copy is more comfortable.'] },
    { h: 'Two ways to travel', p: [
      'The <b>diagonal pentatonic</b>: two notes on one string, three on the next with a slide, repeated up each pair of strings. It carries you from position 5 through 1 and 2 without getting stuck in a box.',
      '<b>One-string scales</b>: every single string is the scale laid out horizontally. Improvising on one string forces you to move along the neck.' ] },
    { h: 'From here: any key', p: ['Up to now you stayed in C / A minor. From this stage on, every drill uses all 12 keys. Everything just slides.'] },
  ],

  jam: [
    { h: 'The 5-step routine', p: ['Use this every time you play over a track or song:'],
      table: [['Step', 'Do this'], ['1', 'Work out the key (or look it up)'], ['2', 'Play the chords from the right roadmap'], ['3', 'Find both keystones'], ['4', 'Improvise in position 1'], ['5', 'Spread into the neighbouring positions and aim for chord tones']], fig: 0 },
    { h: 'Chords change, your map doesn’t', p: [
      'As long as the song stays in one key, your keystones, positions and roadmap stay put, even when the chords change or the song moves from verse to chorus. You’re locked to the key, not to each chord.' ] },
    { h: 'Finding the key from the chords', p: [
      'List the song’s chords and find the one key whose 7 chords include all of them. Most songs live on chords 1, 4, 5 and 6, so those give it away fast.' ],
      ex: 'Am – C – F – G: all four are in <b>C major</b> (chords 6, 1, 4, 5).' },
    { h: 'Mistakes are the point', p: [
      'Hit a note that sounds wrong? Work out <b>why</b>: it wasn’t in the key. Then find where the right note was. That’s how the map gets wired into your hands.',
      'Some songs use a chord slightly outside the key (like an A7 in D minor). Ignore it and stay in the key. Your map still works.' ] },
    { h: 'Go deep on one track', p: ['Stay with one track for several sessions. Playing a bit over lots of tracks feels productive, but you learn more by getting really comfortable over one.'] },
  ],

  triads: [
    { h: 'What a triad is', p: [
      'A <b>triad</b> is a chord made of just three notes: the <b>root</b>, the <b>3rd</b> and the <b>5th</b>. If the 3rd is 4 frets above the root, it’s major. If it’s 3 frets above, it’s minor. That’s the only difference.' ] },
    { h: 'Hiding inside your barre chords', p: [
      'A full barre chord is just a triad with notes doubled up. Drop the barre, play only three neighbouring strings, and you’re playing a triad.' ] },
    { h: 'Inversions', p: [
      'Same three notes, different order. Name it by the <b>lowest</b> note: root at the bottom = <b>root position</b>, 3rd at the bottom = <b>1st inversion</b>, 5th at the bottom = <b>2nd inversion</b>.' ],
      ex: 'C major on the G-B-e strings:<br>frets <b>5-5-3</b> = C E G (root position)<br>frets <b>9-8-8</b> = E G C (1st inversion)<br>frets <b>12-13-12</b> = G C E (2nd inversion)', fig: 0 },
    { h: 'Why players love them', p: [
      'Triads sound clean and leave room for the bass, keys and vocals, which is ideal when playing with others. They’re also the quickest way to grab a chord’s tones in the middle of a solo.' ] },
    { h: 'Where to start', p: ['Begin with the top three strings (G-B-e), then add D-G-B. You don’t need every triad everywhere. Find the ones closest to where your hand already is.'] },
  ],

  lead: [
    { h: 'Rhythm and lead are one thing', p: [
      'Great players don’t flip between "chord mode" and "solo mode". They mix them. The simple method: hit the chord <b>on</b> the change, fill the space until the next change with a few notes, then land the next chord right on time.' ] },
    { h: 'Your hand is already in the right spot', p: [
      'Every barre chord puts your hand over a scale position. With Roadmap 2 in C: <b>C and G</b> (fret 3) sit on position 5, <b>Am and Dm</b> (fret 5) on position 1, and <b>Em, F and Bm7♭5</b> (frets 7–8) on position 2. Grab fill notes from right under your fingers.' ], fig: 0 },
    { h: 'Learning songs and riffs', p: [
      'When you learn something new, first learn it as it is. Then find its key and work out where it sits on your map. Once you know that, you can move it to any key and change it to make it your own.' ] },
    { h: 'Writing your own', p: [
      'Pick chords from the roadmap. Chords <b>1, 4, 5 and 6</b> do most of the work in popular music. 2 and 3 add colour. 7 pulls back to 1.',
      'A common song layout: intro → verse → chorus → verse → chorus → bridge → chorus. The verse and chorus can use different progressions in the same key.' ],
      ex: 'Try <b>1 – 5 – 6 – 4</b> in C: C – G – Am – F. Loop it, record it on your phone, then improvise over it in position 1.' },
  ],
};
