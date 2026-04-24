export const TYPES = {
  SCENE_HEADING:  'scene-heading',
  ACTION:         'action',
  CHARACTER:      'character',
  PARENTHETICAL:  'parenthetical',
  DIALOGUE:       'dialogue',
  TRANSITION:     'transition',
  DUAL_DIALOGUE:  'dual-dialogue',
};

export const TYPE_LABELS = {
  [TYPES.SCENE_HEADING]:  'Scene Heading',
  [TYPES.ACTION]:         'Action',
  [TYPES.CHARACTER]:      'Character',
  [TYPES.PARENTHETICAL]:  'Parenthetical',
  [TYPES.DIALOGUE]:       'Dialogue',
  [TYPES.TRANSITION]:     'Transition',
  [TYPES.DUAL_DIALOGUE]:  'Dual Dialogue',
};

export const TAB_NEXT = {
  [TYPES.SCENE_HEADING]:  TYPES.ACTION,
  [TYPES.ACTION]:         TYPES.CHARACTER,
  [TYPES.CHARACTER]:      TYPES.PARENTHETICAL,
  [TYPES.PARENTHETICAL]:  TYPES.DIALOGUE,
  [TYPES.DIALOGUE]:       TYPES.ACTION,
  [TYPES.TRANSITION]:     TYPES.SCENE_HEADING,
};

export const TAB_PREV = {
  [TYPES.SCENE_HEADING]:  TYPES.TRANSITION,
  [TYPES.ACTION]:         TYPES.SCENE_HEADING,
  [TYPES.CHARACTER]:      TYPES.ACTION,
  [TYPES.PARENTHETICAL]:  TYPES.CHARACTER,
  [TYPES.DIALOGUE]:       TYPES.PARENTHETICAL,
  [TYPES.TRANSITION]:     TYPES.DIALOGUE,
};

export const ENTER_NEXT = {
  [TYPES.SCENE_HEADING]:  TYPES.ACTION,
  [TYPES.ACTION]:         TYPES.ACTION,
  [TYPES.CHARACTER]:      TYPES.DIALOGUE,
  [TYPES.PARENTHETICAL]:  TYPES.DIALOGUE,
  [TYPES.DIALOGUE]:       TYPES.CHARACTER,
  [TYPES.TRANSITION]:     TYPES.SCENE_HEADING,
};

export const ENTER_EMPTY = {
  [TYPES.SCENE_HEADING]:  TYPES.ACTION,
  [TYPES.ACTION]:         TYPES.CHARACTER,
  [TYPES.CHARACTER]:      TYPES.ACTION,
  [TYPES.PARENTHETICAL]:  TYPES.DIALOGUE,
  [TYPES.DIALOGUE]:       TYPES.ACTION,
  [TYPES.TRANSITION]:     TYPES.ACTION,
};

const UPPERCASE_TYPES = new Set([TYPES.SCENE_HEADING, TYPES.CHARACTER, TYPES.TRANSITION]);
export function shouldUppercase(type) { return UPPERCASE_TYPES.has(type); }

export function autoDetectType(text, currentType) {
  const t = text.trimStart();
  if (/^(INT\.|EXT\.|INT\.\/EXT\.|I\/E\.?\s)/i.test(t)) return TYPES.SCENE_HEADING;
  if (/^(FADE\s(IN|OUT)|CUT\sTO:|DISSOLVE\sTO:|SMASH\sCUT|MATCH\sCUT|IRIS\s(IN|OUT)|BLACK\.|THE\sEND)/i.test(t)) return TYPES.TRANSITION;
  if (t.startsWith('(') && currentType === TYPES.CHARACTER) return TYPES.PARENTHETICAL;
  return currentType;
}

let _nextId = 1;
export function createBlock(type = TYPES.ACTION, text = '') {
  return { id: _nextId++, type, text };
}

// Call this after loading blocks from external storage so that _nextId
// is always greater than any id already in the array.
export function bumpNextId(blocks) {
  const maxId = blocks.reduce(
    (m, b) => Math.max(m, typeof b.id === 'number' ? b.id : 0),
    0
  );
  if (maxId >= _nextId) _nextId = maxId + 1;
}

export const DEMO_BLOCKS = [
  { id: _nextId++, type: TYPES.SCENE_HEADING,  text: 'INT. COFFEE SHOP - DAY' },
  { id: _nextId++, type: TYPES.ACTION,         text: 'A bustling coffee shop on a grey Tuesday afternoon. Steam rises from a dozen cups. ALEX MORGAN, 32, sits alone at a corner table, staring at a blank laptop screen as if it owes him something.' },
  { id: _nextId++, type: TYPES.CHARACTER,      text: 'ALEX' },
  { id: _nextId++, type: TYPES.PARENTHETICAL,  text: '(muttering)' },
  { id: _nextId++, type: TYPES.DIALOGUE,       text: 'Come on. You had something to say yesterday. Say it now.' },
  { id: _nextId++, type: TYPES.ACTION,         text: 'His phone buzzes on the table. He glances at the screen -- then turns it face-down.' },
  { id: _nextId++, type: TYPES.CHARACTER,      text: 'BARISTA (O.S.)' },
  { id: _nextId++, type: TYPES.DIALOGUE,       text: 'Refill?' },
  { id: _nextId++, type: TYPES.CHARACTER,      text: 'ALEX' },
  { id: _nextId++, type: TYPES.DIALOGUE,       text: 'Please. And keep them coming.' },
  { id: _nextId++, type: TYPES.ACTION,         text: 'The Barista tops off his cup and moves on. Alex stares back at the screen. He begins to type.' },
  { id: _nextId++, type: TYPES.TRANSITION,     text: 'CUT TO:' },
  { id: _nextId++, type: TYPES.SCENE_HEADING,  text: "INT. ALEX'S APARTMENT - NIGHT" },
  { id: _nextId++, type: TYPES.ACTION,         text: 'The apartment is small and lived-in. Takeout containers on the counter. A single lamp burns in the corner. Alex sits at a proper desk now, typing furiously, five empty coffee cups forming a little skyline beside him.' },
];
