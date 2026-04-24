import { useRef, useEffect, useLayoutEffect, useImperativeHandle, forwardRef } from 'react';
import { TYPE_LABELS, TYPES, shouldUppercase } from '../utils/screenplay';

const PLACEHOLDERS = {
  [TYPES.SCENE_HEADING]:  'INT./EXT. LOCATION — DAY/NIGHT',
  [TYPES.ACTION]:         'Action description...',
  [TYPES.CHARACTER]:      'CHARACTER NAME',
  [TYPES.PARENTHETICAL]:  '(beat)',
  [TYPES.DIALOGUE]:       'Dialogue...',
  [TYPES.TRANSITION]:     'FADE OUT.',
};

// Escape HTML then render **bold** and *italic* markers as markup.
function renderMarkdown(text) {
  if (!text) return '';
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return escaped
    .replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/gs,     '<em>$1</em>');
}

// Is the cursor currently inside a **bold** or *italic* span?
function getFormattingAt(text, pos) {
  if (!text) return { bold: false, italic: false };
  const before = text.slice(0, pos);
  // Odd number of ** markers before cursor → inside bold
  const bold = ((before.match(/\*\*/g) || []).length % 2) === 1;
  // Odd number of lone * markers before cursor → inside italic
  const italic = ((before.replace(/\*\*/g, '').match(/\*/g) || []).length % 2) === 1;
  return { bold, italic };
}

const Block = forwardRef(function Block(
  { block, isActive, onChange, onKeyDown, onFocus, onFormattingChange },
  ref
) {
  const taRef = useRef(null);
  const pendingCursor = useRef(null); // { start, end } to restore after formatting

  // Restore selection after formatting is applied — fires before paint so no flicker
  useLayoutEffect(() => {
    if (!pendingCursor.current) return;
    const { start, end } = pendingCursor.current;
    pendingCursor.current = null;
    try { taRef.current?.setSelectionRange(start, end); } catch { /* ignore */ }
  });

  const doApplyFormatting = (marker) => {
    const el = taRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const len = marker.length;
    let newText, ns, ne;
    if (s === e) {
      // No selection: insert paired markers and place cursor between them
      newText = value.slice(0, s) + marker + marker + value.slice(s);
      ns = ne = s + len;
    } else {
      // Wrap the selection
      newText = value.slice(0, s) + marker + value.slice(s, e) + marker + value.slice(e);
      ns = s + len;
      ne = e + len;
    }
    pendingCursor.current = { start: ns, end: ne };
    onChange(block.id, newText);
  };

  useImperativeHandle(ref, () => ({
    focus(pos) {
      const el = taRef.current;
      if (!el) return;
      el.focus();
      const p = pos === 'end' ? el.value.length : (pos ?? el.value.length);
      try { el.setSelectionRange(p, p); } catch { /* ignore */ }
    },
    getCursorPos() {
      return taRef.current?.selectionStart ?? 0;
    },
    isAtStart() {
      return (taRef.current?.selectionStart ?? 0) === 0;
    },
    isAtEnd() {
      const el = taRef.current;
      if (!el) return true;
      return el.selectionStart === el.value.length;
    },
    splitAtCaret() {
      const el = taRef.current;
      const pos = el?.selectionStart ?? (block.text?.length ?? 0);
      const text = block.text ?? '';
      return { beforeText: text.slice(0, pos), afterText: text.slice(pos) };
    },
    applyBold:   () => doApplyFormatting('**'),
    applyItalic: () => doApplyFormatting('*'),
  }));

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    if (!block.text) {
      el.style.height = '';
      return;
    }
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, [block.text, block.type]);

  const reportFormatting = () => {
    if (!onFormattingChange) return;
    const el = taRef.current;
    if (!el) return;
    const { bold, italic } = getFormattingAt(block.text ?? '', el.selectionStart);
    onFormattingChange(bold, italic);
  };

  const handleChange = (e) => {
    let val = e.target.value;
    if (val.includes('\n')) val = val.replace(/\n/g, '');
    if (shouldUppercase(block.type)) val = val.toUpperCase();
    onChange(block.id, val);
    if (onFormattingChange) {
      const { bold, italic } = getFormattingAt(val, e.target.selectionStart);
      onFormattingChange(bold, italic);
    }
  };

  return (
    <div
      className={`block block--${block.type}${isActive ? ' block--active' : ''}`}
      data-block-id={block.id}
      onClick={() => taRef.current?.focus()}
    >
      {isActive && (
        <span className="block__type-label">{TYPE_LABELS[block.type]}</span>
      )}

      {/* Textarea is always in the DOM so focus/ref always work.
          When not active it is positioned out of flow so the preview div
          controls the block's rendered height. */}
      <textarea
        ref={taRef}
        className="block__editor"
        style={isActive ? undefined : {
          position: 'absolute', opacity: 0,
          pointerEvents: 'none', height: 0, overflow: 'hidden',
        }}
        value={block.text ?? ''}
        placeholder={PLACEHOLDERS[block.type]}
        onChange={handleChange}
        onKeyDown={(e) => {
          if (e.key === 'Backspace' && e.target.value === '') e.preventDefault();
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
            e.preventDefault();
            doApplyFormatting('**');
            return;
          }
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
            e.preventDefault();
            doApplyFormatting('*');
            return;
          }
          onKeyDown(e, block.id);
        }}
        onFocus={() => {
          onFocus(block.id);
          reportFormatting();
        }}
        onSelect={reportFormatting}
        onKeyUp={reportFormatting}
        rows={1}
        spellCheck={
          block.type === TYPES.ACTION ||
          block.type === TYPES.DIALOGUE ||
          block.type === TYPES.PARENTHETICAL
        }
        autoCorrect="off"
        autoCapitalize={shouldUppercase(block.type) ? 'characters' : 'sentences'}
      />

      {/* Rendered preview shown when this block is not being edited */}
      {!isActive && (
        <div
          className="block__preview"
          data-placeholder={PLACEHOLDERS[block.type]}
          onClick={() => {
            const el = taRef.current;
            if (!el) return;
            el.focus();
            el.setSelectionRange(el.value.length, el.value.length);
          }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(block.text ?? '') }}
        />
      )}
    </div>
  );
});

export default Block;
