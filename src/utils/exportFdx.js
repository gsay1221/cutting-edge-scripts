import { TYPES } from './screenplay';

const TYPE_TO_FDX = {
  [TYPES.SCENE_HEADING]:  'Scene Heading',
  [TYPES.ACTION]:         'Action',
  [TYPES.CHARACTER]:      'Character',
  [TYPES.PARENTHETICAL]:  'Parenthetical',
  [TYPES.DIALOGUE]:       'Dialogue',
  [TYPES.TRANSITION]:     'Transition',
};

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Walk through text converting **bold** and *italic* markers into FDX <Text> runs.
function textToXml(raw) {
  if (!raw) return '<Text></Text>';

  const parts = [];
  let i = 0;
  let bold = false;
  let italic = false;
  let buf = '';

  while (i < raw.length) {
    if (raw[i] === '*' && raw[i + 1] === '*') {
      if (buf) { parts.push({ bold, italic, text: buf }); buf = ''; }
      bold = !bold;
      i += 2;
    } else if (raw[i] === '*') {
      if (buf) { parts.push({ bold, italic, text: buf }); buf = ''; }
      italic = !italic;
      i += 1;
    } else {
      buf += raw[i];
      i += 1;
    }
  }
  if (buf) parts.push({ bold, italic, text: buf });
  if (!parts.length) return `<Text>${esc(raw)}</Text>`;

  return parts.map(({ bold: b, italic: it, text }) => {
    const style = b && it ? 'BoldItalic' : b ? 'Bold' : it ? 'Italic' : '';
    return `<Text${style ? ` AdornmentStyle="${style}"` : ''}>${esc(text)}</Text>`;
  }).join('');
}

export function exportToFdx(blocks, titleInfo = {}) {
  const paras = blocks.map((b) => {
    const type = TYPE_TO_FDX[b.type] ?? 'Action';
    return `    <Paragraph Type="${type}">\n      ${textToXml(b.text ?? '')}\n    </Paragraph>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<FinalDraft DocumentType="Script" Template="No" Version="1">
  <Content>
${paras}
  </Content>
  <TitlePage>
    <Content>
      <Paragraph Type="Title">
        <Text>${esc(titleInfo.title || 'Untitled')}</Text>
      </Paragraph>
      <Paragraph Type="Author">
        <Text>${esc(titleInfo.author || '')}</Text>
      </Paragraph>
    </Content>
  </TitlePage>
</FinalDraft>`;
}

export function downloadFdx(content, filename) {
  const blob = new Blob([content], { type: 'application/xml;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
