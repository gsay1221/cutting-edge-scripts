export default function Sidebar({ scenes, activeSceneId, onSceneClick, titleInfo, onTitlePageClick, onEditTitle }) {
  const hasTitlePage = titleInfo?.title || titleInfo?.author;

  return (
    <aside className="sidebar">
      <div className="sidebar__section-label">Navigator</div>

      <button className="sidebar__title-btn" onClick={onEditTitle}>
        <span className="sidebar__scene-icon">◆</span>
        {hasTitlePage ? 'Title Page' : '+ Add Title Page'}
      </button>

      {hasTitlePage && (
        <button className="sidebar__scene sidebar__scene--indent" onClick={onTitlePageClick} title="Scroll to title page">
          <span className="sidebar__scene-num">—</span>
          <span className="sidebar__scene-text">{titleInfo.title || 'Untitled'}</span>
        </button>
      )}

      {scenes.length > 0 && (
        <div className="sidebar__section-label" style={{ marginTop: 8 }}>Scenes</div>
      )}

      {scenes.length === 0 && (
        <p className="sidebar__empty">No scenes yet.<br />Type INT. or EXT. to add one.</p>
      )}

      {scenes.map((scene) => (
        <button
          key={scene.id}
          className={`sidebar__scene${activeSceneId === scene.id ? ' sidebar__scene--active' : ''}`}
          onClick={() => onSceneClick(scene.id)}
          title={scene.text}
        >
          <span className="sidebar__scene-num">{scene.number}</span>
          <span className="sidebar__scene-text">{scene.text}</span>
        </button>
      ))}
    </aside>
  );
}
