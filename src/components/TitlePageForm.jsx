export default function TitlePageForm({ titleInfo, onChange, onClose }) {
  const set = (field) => (e) => onChange({ ...titleInfo, [field]: e.target.value });

  return (
    <div className="title-form-overlay" onClick={onClose}>
      <div className="title-form" onClick={(e) => e.stopPropagation()}>
        <div className="title-form__header">
          <h2>Title Page</h2>
          <button className="title-form__close" onClick={onClose}>✕</button>
        </div>

        <label className="title-form__label">
          Title
          <input
            className="title-form__input"
            value={titleInfo.title}
            onChange={set('title')}
            placeholder="My Screenplay"
          />
        </label>

        <label className="title-form__label">
          Written by
          <input
            className="title-form__input"
            value={titleInfo.author}
            onChange={set('author')}
            placeholder="Author Name"
          />
        </label>

        <label className="title-form__label">
          Contact / Copyright (optional)
          <textarea
            className="title-form__input title-form__textarea"
            value={titleInfo.contact}
            onChange={set('contact')}
            placeholder="Your Name&#10;your@email.com"
            rows={3}
          />
        </label>

        <button className="title-form__done" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}
