import * as pdfjsLib from 'pdfjs-dist';
import { TYPES, createBlock } from './screenplay';

// Load the worker from CDN matching the installed library version — avoids
// Vite needing to bundle the large worker file.
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// ── Heuristic thresholds (fraction of page width) ─────────────────────────────
// Calibrated for US-letter (8.5"×11") Courier 12pt — the standard screenplay format.
// Left margin is 1.5" on a 612pt-wide page → left_margin / page_width ≈ 0.245.
const X_ACTION_LIMIT  = 0.30; // scene headings & action live near the left margin
const X_DIALOGUE_MIN  = 0.30; // dialogue indented ~2.5" from left edge
const X_CHAR_MIN      = 0.40; // character names indented ~3.7"

function isAllCaps(s) {
  return /[A-Z]/.test(s) && s.trim() === s.trim().toUpperCase();
}
function looksLikeSceneHeading(s) {
  return /^\s*(INT\.|EXT\.|INT\.\/EXT\.|I\/E\.)/i.test(s);
}
function looksLikeTransition(s) {
  return /^\s*(FADE\s+(IN|OUT)|CUT\s+TO:|DISSOLVE\s+TO:|SMASH\s+CUT|MATCH\s+CUT|THE\s+END|BLACK\.)\s*$/i.test(s);
}
function looksLikeParenthetical(s) {
  const t = s.trim();
  return t.startsWith('(') && t.endsWith(')');
}
function looksLikePageNumber(s) {
  // bare numbers like "12" or "12." common at page tops/bottoms
  return /^\d{1,3}\.?$/.test(s.trim());
}

function detectType(text, xRatio, _prevType) {
  if (looksLikeSceneHeading(text))  return TYPES.SCENE_HEADING;
  if (looksLikeTransition(text))    return TYPES.TRANSITION;
  if (looksLikeParenthetical(text)) return TYPES.PARENTHETICAL;

  if (xRatio >= X_CHAR_MIN) {
    return isAllCaps(text) ? TYPES.CHARACTER : TYPES.DIALOGUE;
  }
  if (xRatio >= X_DIALOGUE_MIN) return TYPES.DIALOGUE;

  // Left-margin text: action or scene heading
  return TYPES.ACTION;
}

export async function parsePdf(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const rawLines = []; // { text, xRatio }

  for (let p = 1; p <= pdf.numPages; p++) {
    const page   = await pdf.getPage(p);
    const { width } = page.getViewport({ scale: 1 });
    const { items } = await page.getTextContent();

    // Group text items by y-coordinate (3pt buckets) to reconstruct lines.
    const byY = new Map();
    for (const item of items) {
      if (!item.str?.trim()) continue; // skip empty & non-text (TextMarkedContent)
      const x = item.transform[4];
      const y = Math.round(item.transform[5] / 3) * 3;
      if (!byY.has(y)) byY.set(y, { minX: x, parts: [] });
      const row = byY.get(y);
      if (x < row.minX) row.minX = x;
      row.parts.push({ x, str: item.str });
    }

    // Sort lines top → bottom (PDF y increases upward, so high y = top of page)
    const lines = Array.from(byY.entries())
      .sort(([ya], [yb]) => yb - ya)
      .map(([, row]) => {
        row.parts.sort((a, b) => a.x - b.x);
        return { text: row.parts.map((p) => p.str).join('').trim(), xRatio: row.minX / width };
      })
      .filter((l) => l.text.length > 0 && !looksLikePageNumber(l.text));

    rawLines.push(...lines);
  }

  const blocks = [];
  let prevType = TYPES.ACTION;

  for (const { text, xRatio } of rawLines) {
    const type = detectType(text, xRatio, prevType);
    blocks.push(createBlock(type, text));
    prevType = type;
  }

  return { blocks, titleInfo: { title: '', author: '', contact: '' } };
}
