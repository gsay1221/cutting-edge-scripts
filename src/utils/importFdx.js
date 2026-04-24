import { TYPES, createBlock } from './screenplay';

const FDX_TO_TYPE = {
  'Scene Heading': TYPES.SCENE_HEADING,
  'Action':        TYPES.ACTION,
  'Character':     TYPES.CHARACTER,
  'Parenthetical': TYPES.PARENTHETICAL,
  'Dialogue':      TYPES.DIALOGUE,
  'Transition':    TYPES.TRANSITION,
  'General':       TYPES.ACTION, // alternate name used by some exporters
  'Shot':          TYPES.SCENE_HEADING,
};

// Convert FDX styled <Text> runs into our markdown notation (**bold**, *italic*)
function runsToMarkdown(paraEl) {
  const textEls = paraEl.querySelectorAll('Text');
  if (!textEls.length) return paraEl.textContent.trim();

  return Array.from(textEls).map((el) => {
    const txt   = el.textContent;
    const style = el.getAttribute('AdornmentStyle') || '';
    if (style === 'BoldItalic') return `***${txt}***`;
    if (style === 'Bold')       return `**${txt}**`;
    if (style === 'Italic')     return `*${txt}*`;
    return txt;
  }).join('');
}

export function parseFdx(xmlString) {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(xmlString, 'application/xml');

  if (doc.querySelector('parsererror')) {
    throw new Error('Invalid or malformed FDX file — please check the file and try again.');
  }

  const blocks = [];
  doc.querySelectorAll('Content > Paragraph').forEach((para) => {
    const fdxType   = para.getAttribute('Type') ?? 'Action';
    const blockType = FDX_TO_TYPE[fdxType] ?? TYPES.ACTION;
    const text      = runsToMarkdown(para).trim();
    if (text) blocks.push(createBlock(blockType, text));
  });

  const titleText  = doc.querySelector('TitlePage Paragraph[Type="Title"] Text')?.textContent.trim() ?? '';
  const authorText = doc.querySelector('TitlePage Paragraph[Type="Author"] Text')?.textContent.trim() ?? '';

  return {
    blocks,
    titleInfo: { title: titleText, author: authorText, contact: '' },
  };
}
