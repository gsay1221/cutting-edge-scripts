import { useState, useEffect, useCallback } from 'react';
import { listCollaborators, addCollaborator, removeCollaborator } from '../utils/collaboration';

export default function CollaborateModal({ scriptId, ownerId, currentUserId, onClose }) {
  const isOwner = currentUserId === ownerId;
  const [collaborators, setCollaborators] = useState([]);
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCollaborators(await listCollaborators(scriptId));
    } catch {
      setError('Failed to load collaborators.');
    } finally {
      setLoading(false);
    }
  }, [scriptId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  async function handleAdd(e) {
    e.preventDefault();
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    setAdding(true);
    setError(null);
    try {
      await addCollaborator(scriptId, ownerId, email);
      setEmailInput('');
      await load();
    } catch (err) {
      setError(err.message || 'Failed to add collaborator.');
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(id) {
    setError(null);
    try {
      await removeCollaborator(id);
      setCollaborators((prev) => prev.filter((c) => c.id !== id));
    } catch {
      setError('Failed to remove collaborator.');
    }
  }

  return (
    <div className="collab-overlay" onClick={onClose}>
      <div className="collab-modal" onClick={(e) => e.stopPropagation()}>
        <div className="collab-modal__header">
          <h2 className="collab-modal__title">Collaborators</h2>
          <button className="collab-modal__close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {isOwner && (
          <form className="collab-modal__add-form" onSubmit={handleAdd}>
            <input
              className="collab-modal__email-input"
              type="email"
              placeholder="Add collaborator by email…"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              disabled={adding}
              autoFocus
            />
            <button
              className="collab-modal__add-btn"
              type="submit"
              disabled={adding || !emailInput.trim()}
            >
              {adding ? 'Adding…' : 'Add'}
            </button>
          </form>
        )}

        {error && <p className="collab-modal__error">{error}</p>}

        <div className="collab-modal__list">
          {loading ? (
            <p className="collab-modal__empty">Loading…</p>
          ) : collaborators.length === 0 ? (
            <p className="collab-modal__empty">
              {isOwner ? 'No collaborators yet. Add someone above.' : 'No collaborators on this script.'}
            </p>
          ) : (
            collaborators.map((c) => (
              <div key={c.id} className="collab-modal__row">
                <span className="collab-modal__email">{c.collaborator_email}</span>
                {isOwner && (
                  <button className="collab-modal__remove-btn" onClick={() => handleRemove(c.id)}>
                    Remove
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {!isOwner && (
          <p className="collab-modal__note">You have read/write access to this script.</p>
        )}
      </div>
    </div>
  );
}
