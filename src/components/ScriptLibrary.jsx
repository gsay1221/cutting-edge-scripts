import { useState } from 'react';
import { timeAgo } from '../utils/cloudStorage';

export default function ScriptLibrary({
  scripts,
  sharedScripts,
  currentScriptId,
  onNew,
  onOpen,
  onDelete,
  onClose,
}) {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const sorted = [...scripts].sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
  );

  const sortedShared = [...(sharedScripts ?? [])].sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
  );

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (confirmDeleteId === id) {
      onDelete(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
    }
  };

  const handleOpen = (id) => {
    if (id !== currentScriptId) onOpen(id);
  };

  return (
    <div className="library-overlay" onClick={onClose}>
      <div className="library" onClick={(e) => e.stopPropagation()}>
        <div className="library__header">
          <h2 className="library__title">Scripts</h2>
          <button className="library__close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <button className="library__new-btn" onClick={onNew}>
          + New Script
        </button>

        <div className="library__list">
          {sorted.length === 0 && sortedShared.length === 0 && (
            <p className="library__empty">No saved scripts yet.</p>
          )}

          {sorted.map((script) => {
            const isCurrent = script.id === currentScriptId;
            const isConfirming = confirmDeleteId === script.id;

            return (
              <div
                key={script.id}
                className={`library__row${isCurrent ? ' library__row--current' : ''}`}
                onClick={() => handleOpen(script.id)}
              >
                <div className="library__row-main">
                  {isCurrent && <span className="library__current-dot" title="Currently open" />}
                  <span className="library__row-title">
                    {script.title || 'Untitled'}
                  </span>
                </div>

                <div className="library__row-meta">
                  <span className="library__row-time">{timeAgo(script.updatedAt)}</span>

                  <div className="library__row-actions" onClick={(e) => e.stopPropagation()}>
                    {!isCurrent && (
                      <button
                        className="library__open-btn"
                        onClick={() => handleOpen(script.id)}
                      >
                        Open
                      </button>
                    )}

                    {isConfirming ? (
                      <>
                        <button
                          className="library__confirm-btn"
                          onClick={(e) => handleDelete(e, script.id)}
                        >
                          Delete?
                        </button>
                        <button
                          className="library__cancel-btn"
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        className="library__delete-btn"
                        onClick={(e) => handleDelete(e, script.id)}
                        aria-label="Delete script"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {sortedShared.length > 0 && (
            <>
              <p className="library__section-label">Shared with me</p>

              {sortedShared.map((script) => {
                const isCurrent = script.id === currentScriptId;

                return (
                  <div
                    key={script.id}
                    className={`library__row library__row--shared${isCurrent ? ' library__row--current' : ''}`}
                    onClick={() => handleOpen(script.id)}
                  >
                    <div className="library__row-main">
                      {isCurrent && <span className="library__current-dot" title="Currently open" />}
                      <span className="library__shared-badge">shared</span>
                      <span className="library__row-title">
                        {script.title || 'Untitled'}
                      </span>
                    </div>

                    <div className="library__row-meta">
                      <span className="library__row-time">{timeAgo(script.updatedAt)}</span>
                      {!isCurrent && (
                        <div className="library__row-actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="library__open-btn"
                            onClick={() => handleOpen(script.id)}
                          >
                            Open
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
