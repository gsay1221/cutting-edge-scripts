const INDEX_KEY = 'cescripts_index';
const scriptKey = (id) => `cescript_${id}`;

export function listScripts() {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function loadScript(id) {
  try {
    return JSON.parse(localStorage.getItem(scriptKey(id)));
  } catch {
    return null;
  }
}

export function saveScript(script) {
  const { id, title, updatedAt, createdAt } = script;
  const index = listScripts().filter((s) => s.id !== id);
  index.push({ id, title, updatedAt, createdAt });
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  localStorage.setItem(scriptKey(id), JSON.stringify(script));
}

export function deleteScript(id) {
  const index = listScripts().filter((s) => s.id !== id);
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  localStorage.removeItem(scriptKey(id));
}

export function newScriptData(blocks = [], titleInfo = { title: '', author: '', contact: '' }) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: titleInfo.title || 'Untitled',
    titleInfo,
    blocks,
    createdAt: now,
    updatedAt: now,
  };
}

export function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
