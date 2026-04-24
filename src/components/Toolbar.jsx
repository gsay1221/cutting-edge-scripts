import { useState, useRef, useEffect } from 'react';
import { TYPES, TYPE_LABELS } from '../utils/screenplay';

const ELEMENT_ORDER = [
  TYPES.SCENE_HEADING,
  TYPES.ACTION,
  TYPES.CHARACTER,
  TYPES.PARENTHETICAL,
  TYPES.DIALOGUE,
  TYPES.TRANSITION,
];

const STATUS_LABEL = {
  saved:   { text: 'Saved',     className: 'toolbar__save-status--saved' },
  saving:  { text: 'Saving…',   className: 'toolbar__save-status--saving' },
  unsaved: { text: '● Unsaved', className: 'toolbar__save-status--unsaved' },
  error:   { text: '⚠ Error',   className: 'toolbar__save-status--error' },
};

// Shared hook: close a dropdown when a click lands outside the ref element
function useClickOutside(ref, enabled, onClose) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e) => { if (!ref.current?.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, enabled, onClose]);
}

// ── Import dropdown ────────────────────────────────────────────────────────────
function ImportDropdown({ onImportPdf, onImportFdx, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, open, () => setOpen(false));

  const pick = (fn) => { fn(); setOpen(false); };

  return (
    <div ref={ref} className="toolbar__import-wrap">
      <button
        className="toolbar__icon-btn toolbar__import-btn"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        title="Import a screenplay"
        aria-expanded={open}
      >
        Import {open ? '▴' : '▾'}
      </button>

      {open && (
        <div className="toolbar__dropdown" role="menu">
          <button className="toolbar__dropdown-item" role="menuitem"
            onMouseDown={(e) => { e.preventDefault(); pick(onImportPdf); }}>
            From PDF
          </button>
          <button className="toolbar__dropdown-item" role="menuitem"
            onMouseDown={(e) => { e.preventDefault(); pick(onImportFdx); }}>
            From FDX
          </button>
        </div>
      )}
    </div>
  );
}

// ── Revision dropdown ─────────────────────────────────────────────────────────
// Shows the current script name. When 2+ revisions exist in the family it
// becomes a dropdown that lets the user switch between them.
function RevisionDropdown({ revisionFamily, currentScriptId, onSwitch, currentTitle }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, open, () => setOpen(false));

  const hasFamily = revisionFamily.length >= 2;
  const label = currentTitle || 'Untitled';

  if (!hasFamily) {
    return (
      <span className="toolbar__rev-name" title={label}>
        {label}
      </span>
    );
  }

  return (
    <div ref={ref} className="toolbar__rev-wrap">
      <button
        className="toolbar__rev-btn"
        onClick={() => setOpen((v) => !v)}
        title={`${revisionFamily.length} revisions — click to switch`}
        aria-expanded={open}
      >
        {label}&nbsp;{open ? '▴' : '▾'}
      </button>

      {open && (
        <div className="toolbar__dropdown" role="menu">
          {revisionFamily.map((script) => {
            const isCurrent = script.id === currentScriptId;
            return (
              <button
                key={script.id}
                className={`toolbar__dropdown-item${isCurrent ? ' toolbar__dropdown-item--active' : ''}`}
                role="menuitem"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setOpen(false);
                  if (!isCurrent) onSwitch(script.id);
                }}
              >
                {script.title}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Toolbar ───────────────────────────────────────────────────────────────
export default function Toolbar({
  title,
  onTitleChange,
  activeBlockType,
  onTypeChange,
  activeBold,
  activeItalic,
  onBold,
  onItalic,
  onExport,
  onExportFdx,
  onImportPdf,
  onImportFdx,
  importStatus,
  revisionFamily,
  currentScriptId,
  onSwitchRevision,
  onSaveRevision,
  savingRevision,
  sidebarOpen,
  onToggleSidebar,
  saveStatus,
  onOpenLibrary,
  onCollaborate,
  viewerCount,
  userEmail,
  onLogout,
}) {
  const status    = STATUS_LABEL[saveStatus] ?? STATUS_LABEL.saved;
  const importing = importStatus === 'loading';

  return (
    <header className="toolbar">
      {/* Sidebar toggle */}
      <button
        className={`toolbar__icon-btn${sidebarOpen ? ' toolbar__icon-btn--active' : ''}`}
        onClick={onToggleSidebar}
        title="Toggle scene panel"
        aria-label="Toggle scene panel"
      >
        ☰
      </button>

      {/* Script library */}
      <button
        className="toolbar__icon-btn toolbar__scripts-btn"
        onClick={onOpenLibrary}
        title="Script library"
        aria-label="Open script library"
      >
        ⎗ Scripts
      </button>

      {/* Import */}
      <ImportDropdown
        onImportPdf={onImportPdf}
        onImportFdx={onImportFdx}
        disabled={importing}
      />
      {importing && <span className="toolbar__import-status">Importing…</span>}
      {importStatus?.error && (
        <span className="toolbar__import-status toolbar__import-status--error">
          {importStatus.error}
        </span>
      )}

      <div className="toolbar__divider" />

      {/* Revision controls */}
      <RevisionDropdown
        revisionFamily={revisionFamily ?? []}
        currentScriptId={currentScriptId}
        onSwitch={onSwitchRevision}
        currentTitle={title}
      />

      <button
        className="toolbar__save-rev-btn"
        onClick={onSaveRevision}
        disabled={savingRevision}
        title="Copy this script as the next revision and switch to it"
      >
        {savingRevision ? 'Saving…' : 'Save Revision'}
      </button>

      <div className="toolbar__divider" />

      {/* Title */}
      <input
        className="toolbar__title"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Untitled Screenplay"
        spellCheck={false}
      />
      <span className={`toolbar__save-status ${status.className}`}>{status.text}</span>

      <div className="toolbar__divider" />

      {/* Element type buttons */}
      <div className="toolbar__elements">
        {ELEMENT_ORDER.map((type) => (
          <button
            key={type}
            className={`toolbar__el-btn${activeBlockType === type ? ' toolbar__el-btn--active' : ''}`}
            onClick={() => onTypeChange(type)}
            title={TYPE_LABELS[type]}
          >
            {TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      <div className="toolbar__divider" />

      {/* Bold / Italic */}
      <div className="toolbar__format">
        <button
          className={`toolbar__fmt-btn${activeBold ? ' toolbar__fmt-btn--active' : ''}`}
          onMouseDown={(e) => { e.preventDefault(); onBold?.(); }}
          title="Bold (⌘B)"
          aria-label="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          className={`toolbar__fmt-btn${activeItalic ? ' toolbar__fmt-btn--active' : ''}`}
          onMouseDown={(e) => { e.preventDefault(); onItalic?.(); }}
          title="Italic (⌘I)"
          aria-label="Italic"
        >
          <em>I</em>
        </button>
      </div>

      <div className="toolbar__spacer" />

      {/* Export */}
      <button className="toolbar__export-btn" onClick={onExportFdx} title="Download as Final Draft FDX">
        Export FDX
      </button>
      <button className="toolbar__export-btn" onClick={onExport}>
        Export PDF
      </button>

      <div className="toolbar__divider" />

      {/* Collaborate */}
      <button className="toolbar__collab-btn" onClick={onCollaborate} title="Manage collaborators">
        Collaborate
      </button>
      {viewerCount > 0 && (
        <span className="toolbar__viewers" title={`${viewerCount} other${viewerCount === 1 ? '' : 's'} viewing`}>
          {viewerCount} viewing
        </span>
      )}

      <div className="toolbar__divider" />

      {/* User */}
      <div className="toolbar__user">
        {userEmail && (
          <span className="toolbar__user-email" title={userEmail}>
            {userEmail.split('@')[0]}
          </span>
        )}
        <button className="toolbar__logout-btn" onClick={onLogout} title="Sign out">
          Sign out
        </button>
      </div>
    </header>
  );
}
