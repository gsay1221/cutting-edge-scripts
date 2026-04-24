import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import Block from './Block';
import {
  TYPES, TAB_NEXT, TAB_PREV, ENTER_NEXT, ENTER_EMPTY,
  createBlock, bumpNextId, autoDetectType, DEMO_BLOCKS,
} from '../utils/screenplay';

// 11in page, 1in top + 1in bottom padding, at 96px per CSS inch
const USABLE_PAGE_HEIGHT = (11 - 1 - 1) * 96; // 864px

export default function ScreenplayEditor({
  editorRef,
  initialBlocks,
  onScenesChange,
  onActiveTypeChange,
  onBlocksChange,
  onActiveFormattingChange,
  titleInfo,
}) {
  const [blocks, setBlocks] = useState(() => {
    const initial = initialBlocks?.length ? initialBlocks : DEMO_BLOCKS;
    bumpNextId(initial);
    return initial;
  });
  const [activeId, setActiveId] = useState(null);
  const [pageBreaks, setPageBreaks] = useState([0]);

  const refs = useRef({});
  const blocksRef = useRef(blocks);
  const pendingFocus = useRef(null);
  const suppressNotify = useRef(false);

  useEffect(() => { blocksRef.current = blocks; }, [blocks]);

  useEffect(() => {
    if (suppressNotify.current) { suppressNotify.current = false; return; }
    onBlocksChange?.(blocks);
  }, [blocks, onBlocksChange]);

  useEffect(() => {
    const active = blocks.find((b) => b.id === activeId);
    onActiveTypeChange?.(active?.type ?? null);
  }, [activeId, blocks, onActiveTypeChange]);

  useEffect(() => {
    const scenes = blocks
      .filter((b) => b.type === TYPES.SCENE_HEADING && b.text?.trim())
      .map((b, i) => ({ id: b.id, number: i + 1, text: b.text?.toUpperCase?.() ?? b.text }));
    onScenesChange(scenes);
  }, [blocks, onScenesChange]);

  // Restore pending focus after every render
  useEffect(() => {
    if (!pendingFocus.current) return;
    const { id, pos } = pendingFocus.current;
    pendingFocus.current = null;
    refs.current[id]?.focus(pos);
  });

  const registerRef = useCallback((id, el) => {
    if (el) refs.current[id] = el;
    else delete refs.current[id];
  }, []);

  const handleChange = useCallback((id, text) => {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        return { ...b, text, type: autoDetectType(text, b.type) };
      })
    );
  }, []);

  const handleFocus = useCallback((id) => setActiveId(id), []);

  const handleFormattingChange = useCallback((bold, italic) => {
    onActiveFormattingChange?.({ bold, italic });
  }, [onActiveFormattingChange]);

  const handleKeyDown = useCallback((e, id) => {
    const allBlocks = blocksRef.current;
    const idx = allBlocks.findIndex((b) => b.id === id);
    if (idx === -1) return;

    const block = allBlocks[idx];
    const handle = refs.current[id];

    if (e.key === 'Tab') {
      e.preventDefault();
      const newType = e.shiftKey ? TAB_PREV[block.type] : TAB_NEXT[block.type];
      if (!newType) return;
      const pos = handle?.getCursorPos() ?? 0;
      pendingFocus.current = { id, pos };
      setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, type: newType } : b)));
      return;
    }

    if (e.key === 'Backspace' && e.target.value === '') {
      if (allBlocks.length === 1) return; // never delete the last block
      e.preventDefault();
      if (idx > 0) {
        const prev = allBlocks[idx - 1];
        pendingFocus.current = { id: prev.id, pos: 'end' };
        setActiveId(prev.id);
      } else {
        const next = allBlocks[1];
        pendingFocus.current = { id: next.id, pos: 0 };
        setActiveId(next.id);
      }
      setBlocks((bs) => bs.filter((b) => b.id !== id));
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (!block.text?.trim()) {
        const newType = ENTER_EMPTY[block.type];
        pendingFocus.current = { id, pos: 0 };
        setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, type: newType } : b)));
        return;
      }
      const { beforeText = block.text, afterText = '' } = handle?.splitAtCaret() ?? {};
      const newBlock = createBlock(ENTER_NEXT[block.type], afterText);
      pendingFocus.current = { id: newBlock.id, pos: 0 };
      setActiveId(newBlock.id);
      setBlocks((prev) => {
        const updated = prev.map((b) => (b.id === id ? { ...b, text: beforeText } : b));
        const copy = [...updated];
        copy.splice(idx + 1, 0, newBlock);
        return copy;
      });
    }
  }, []);

  const changeActiveType = useCallback((newType) => {
    if (!activeId) return;
    setBlocks((prev) =>
      prev.map((b) => (b.id === activeId ? { ...b, type: newType } : b))
    );
    pendingFocus.current = { id: activeId, pos: 'end' };
  }, [activeId]);

  const scrollToBlock = useCallback((id) => {
    document.querySelector(`[data-block-id="${id}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    pendingFocus.current = { id, pos: 'end' };
    setActiveId(id);
  }, []);

  const internalRef = useRef(null);
  const resolvedRef = editorRef ?? internalRef;

  // Clear formatting indicator when no block is focused
  useEffect(() => {
    if (activeId === null) onActiveFormattingChange?.({ bold: false, italic: false });
  }, [activeId, onActiveFormattingChange]);

  useEffect(() => {
    if (!resolvedRef.current) return;
    resolvedRef.current._changeType    = changeActiveType;
    resolvedRef.current._scrollToBlock = scrollToBlock;
    resolvedRef.current._getBlocks     = () => blocksRef.current;
    resolvedRef.current._bold          = () => refs.current[activeId]?.applyBold();
    resolvedRef.current._italic        = () => refs.current[activeId]?.applyItalic();
    resolvedRef.current._loadBlocks    = (newBlocks) => {
      bumpNextId(newBlocks);
      const raw = newBlocks.length ? newBlocks : [createBlock(TYPES.SCENE_HEADING, '')];
      suppressNotify.current = true;
      blocksRef.current = raw;
      setBlocks(raw);
      setPageBreaks([0]);
      setActiveId(raw[0].id);
      pendingFocus.current = { id: raw[0].id, pos: 0 };
    };
  });

  // Measure block heights and recompute page breaks before the browser paints
  useLayoutEffect(() => {
    const wrapperEl = resolvedRef.current;
    if (!wrapperEl) return;

    const newBreaks = [0];
    let used = 0;

    for (let i = 0; i < blocks.length; i++) {
      const el = wrapperEl.querySelector(`[data-block-id="${blocks[i].id}"]`);
      if (!el) continue;
      const style = getComputedStyle(el);
      const h = el.offsetHeight
        + parseFloat(style.marginTop || '0')
        + parseFloat(style.marginBottom || '0');
      if (used > 0 && used + h > USABLE_PAGE_HEIGHT) {
        newBreaks.push(i);
        used = h;
      } else {
        used += h;
      }
    }

    if (JSON.stringify(newBreaks) !== JSON.stringify(pageBreaks)) {
      // When blocks shift pages, preserve caret position
      if (activeId && !pendingFocus.current) {
        pendingFocus.current = {
          id: activeId,
          pos: refs.current[activeId]?.getCursorPos() ?? 0,
        };
      }
      setPageBreaks(newBreaks);
    }
  });

  // Group blocks into pages; guard against stale breaks pointing past end of blocks
  const rawPages = pageBreaks.map((startIdx, pi) =>
    blocks.slice(startIdx, pageBreaks[pi + 1] ?? blocks.length)
  ).filter((p) => p.length > 0);
  const pages = rawPages.length > 0 ? rawPages : [[]];

  return (
    <div className="editor-column">
      <div className="screenplay-wrapper" ref={resolvedRef}>
        {titleInfo && (titleInfo.title || titleInfo.author) && (
          <div className="screenplay-page title-page">
            <div className="title-page__content">
              <h1 className="title-page__title">{titleInfo.title || 'Untitled'}</h1>
              {titleInfo.author && <p className="title-page__by">Written by</p>}
              {titleInfo.author && <p className="title-page__author">{titleInfo.author}</p>}
            </div>
            {titleInfo.contact && <p className="title-page__contact">{titleInfo.contact}</p>}
          </div>
        )}

        {pages.map((pageBlocks, pageIdx) => (
          <div
            key={pageIdx}
            className="screenplay-page"
            onClick={(e) => {
              if (e.target !== e.currentTarget) return;
              const endIdx = (pageBreaks[pageIdx + 1] ?? blocks.length) - 1;
              const target = blocks[Math.max(0, endIdx)];
              if (!target) return;
              setActiveId(target.id);
              pendingFocus.current = { id: target.id, pos: 'end' };
            }}
          >
            {pageBlocks.map((block) => (
              <Block
                key={block.id}
                ref={(el) => registerRef(block.id, el)}
                block={block}
                isActive={block.id === activeId}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                onFormattingChange={handleFormattingChange}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
