import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Toolbar from './components/Toolbar';
import Sidebar from './components/Sidebar';
import ScreenplayEditor from './components/ScreenplayEditor';
import TitlePageForm from './components/TitlePageForm';
import ScriptLibrary from './components/ScriptLibrary';
import CollaborateModal from './components/CollaborateModal';
import AuthScreen from './components/AuthScreen';
import { supabase } from './utils/supabase';
import * as cloud from './utils/cloudStorage';
import { DEMO_BLOCKS } from './utils/screenplay';
import { exportToFdx, downloadFdx } from './utils/exportFdx';
import { parseFdx } from './utils/importFdx';
import './App.css';

const AUTOSAVE_DELAY = 1500;
const DEFAULT_TITLE_INFO = { title: '', author: '', contact: '' };

// ── Revision helpers ──────────────────────────────────────────────────────────
// "The Pen 2" → { base: "The Pen", version: 2 }
// "The Pen"   → { base: "The Pen", version: 1 }
// "The Pen Final" → { base: "The Pen Final", version: 1 }  (different family)
function parseRevision(title) {
  const m = String(title ?? '').trim().match(/^(.+?)\s+(\d+)$/);
  return m ? { base: m[1], version: parseInt(m[2], 10) } : { base: String(title ?? '').trim(), version: 1 };
}

function nextRevisionTitle(currentTitle, allScripts) {
  const { base } = parseRevision(currentTitle);
  const versions = allScripts
    .map((s) => parseRevision(s.title ?? ''))
    .filter((r) => r.base === base)
    .map((r) => r.version);
  const max = versions.length ? Math.max(...versions) : 1;
  return `${base} ${max + 1}`;
}

// ── Auth wrapper ──────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (authLoading) return <AppSpinner />;
  if (!session)   return <AuthScreen />;
  // key forces full remount if the user account changes
  return <MainApp key={session.user.id} session={session} />;
}

// ── Loading spinner ───────────────────────────────────────────────────────────
function AppSpinner({ label = 'Loading…' }) {
  return (
    <div className="app-spinner-screen">
      <div className="app-spinner" />
      <p className="app-spinner__label">{label}</p>
    </div>
  );
}

// ── Main application (mounted only when authenticated) ────────────────────────
function MainApp({ session }) {
  const { user } = session;

  // ── Data-loading state ─────────────────────────────────────────────────────
  const [dataLoading, setDataLoading] = useState(true);
  const [initBlocks, setInitBlocks] = useState(null); // blocks for first ScreenplayEditor mount

  // ── Script state ───────────────────────────────────────────────────────────
  const [scripts, setScripts] = useState([]);
  const [sharedScripts, setSharedScripts] = useState([]);
  const [currentScriptId, setCurrentScriptId] = useState(null);
  const [currentScriptOwnerId, setCurrentScriptOwnerId] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved');

  // ── Writing state ──────────────────────────────────────────────────────────
  const [titleInfo, setTitleInfo] = useState(DEFAULT_TITLE_INFO);
  const [scenes, setScenes] = useState([]);
  const [activeSceneId, setActiveSceneId] = useState(null);
  const [activeBlockType, setActiveBlockType] = useState(null);
  const [activeBold, setActiveBold] = useState(false);
  const [activeItalic, setActiveItalic] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [importStatus, setImportStatus] = useState(null); // null | 'loading' | { error: string }
  const [savingRevision, setSavingRevision] = useState(false);

  const pdfInputRef = useRef(null);
  const fdxInputRef = useRef(null);

  // All scripts in the same revision family as the current script, sorted by version
  const revisionFamily = useMemo(() => {
    const savedTitle = scripts.find((s) => s.id === currentScriptId)?.title ?? titleInfo.title ?? 'Untitled';
    const { base } = parseRevision(savedTitle);
    return [...scripts]
      .filter((s) => parseRevision(s.title ?? '').base === base)
      .sort((a, b) => parseRevision(a.title ?? '').version - parseRevision(b.title ?? '').version);
  }, [scripts, currentScriptId, titleInfo.title]);

  const handleActiveFormattingChange = useCallback(({ bold, italic }) => {
    setActiveBold(bold);
    setActiveItalic(italic);
  }, []);

  // Auto-dismiss import errors after 4 s
  useEffect(() => {
    if (!importStatus?.error) return;
    const t = setTimeout(() => setImportStatus(null), 4000);
    return () => clearTimeout(t);
  }, [importStatus]);

  // ── Collaboration state ────────────────────────────────────────────────────
  const [showCollaborate, setShowCollaborate] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [showTitleForm, setShowTitleForm] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const editorWrapperRef = useRef(null);
  const currentScriptMetaRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  const isLocalSaveRef = useRef(false);
  const realtimeChannelRef = useRef(null);
  const presenceChannelRef = useRef(null);

  // ── Bootstrap: load user scripts on mount ─────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        // Load own scripts first — this is the critical path.
        const list = await cloud.listScripts(user.id);

        // Shared scripts are non-critical: fetch in parallel but don't block.
        cloud.listSharedScripts(user.email).then(setSharedScripts).catch(() => {});

        let active;
        if (list.length === 0) {
          active = await cloud.createScript(user.id, DEMO_BLOCKS, DEFAULT_TITLE_INFO);
          setScripts([active]);
        } else {
          setScripts(list);
          active = await cloud.loadScript(list[0].id);
        }

        currentScriptMetaRef.current = active;
        setCurrentScriptId(active.id);
        setCurrentScriptOwnerId(active.userId ?? user.id);
        setTitleInfo(active.titleInfo ?? DEFAULT_TITLE_INFO);
        setInitBlocks(active.blocks ?? []);
      } catch (err) {
        console.error('Failed to load scripts:', err);
        setInitBlocks([]);
      } finally {
        setDataLoading(false);
      }
    }
    init();
  }, [user.id, user.email]);

  // ── Realtime: sync edits from other collaborators ──────────────────────────
  useEffect(() => {
    if (!currentScriptId) return;

    const channel = supabase
      .channel(`script-updates-${currentScriptId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'scripts', filter: `id=eq.${currentScriptId}` },
        (payload) => {
          if (isLocalSaveRef.current) {
            isLocalSaveRef.current = false;
            return;
          }
          const row = payload.new;
          if (!row) return;
          const updated = {
            id:        row.id,
            userId:    row.user_id,
            title:     row.title,
            titleInfo: row.title_info ?? DEFAULT_TITLE_INFO,
            blocks:    row.blocks ?? [],
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          };
          currentScriptMetaRef.current = updated;
          setTitleInfo(updated.titleInfo);
          editorWrapperRef.current?._loadBlocks(updated.blocks);
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [currentScriptId]);

  // ── Presence: track who is viewing the current script ─────────────────────
  useEffect(() => {
    if (!currentScriptId) return;

    const channel = supabase.channel(`script-presence-${currentScriptId}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const others = Object.keys(state).filter((k) => k !== user.id).length;
        setViewerCount(others);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: user.id, email: user.email });
        }
      });

    presenceChannelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [currentScriptId, user.id, user.email]);

  // ── Save helpers ───────────────────────────────────────────────────────────
  const refreshIndex = useCallback(async () => {
    const [list, shared] = await Promise.all([
      cloud.listScripts(user.id),
      cloud.listSharedScripts(user.email),
    ]);
    setScripts(list);
    setSharedScripts(shared);
  }, [user.id, user.email]);

  const saveNow = useCallback(async () => {
    clearTimeout(autoSaveTimerRef.current);
    const meta = currentScriptMetaRef.current;
    if (!meta) return;
    const blocks = editorWrapperRef.current?._getBlocks() ?? [];
    const payload = {
      ...meta,
      title: titleInfo.title || 'Untitled',
      titleInfo,
      blocks,
    };
    try {
      isLocalSaveRef.current = true;
      const saved = await cloud.saveScript(payload, user.id);
      currentScriptMetaRef.current = saved;
      await refreshIndex();
      setSaveStatus('saved');
    } catch (err) {
      console.error('Save failed:', err);
      isLocalSaveRef.current = false;
      setSaveStatus('error');
    }
  }, [titleInfo, user.id, refreshIndex]);

  const scheduleSave = useCallback(() => {
    setSaveStatus('unsaved');
    clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      setSaveStatus('saving');
      saveNow();
    }, AUTOSAVE_DELAY);
  }, [saveNow]);

  const handleBlocksChange = useCallback(() => scheduleSave(), [scheduleSave]);

  const handleTitleInfoChange = useCallback((next) => {
    setTitleInfo(next);
    scheduleSave();
  }, [scheduleSave]);

  // ── Load a script into the editor ──────────────────────────────────────────
  const loadScriptIntoEditor = useCallback((script) => {
    currentScriptMetaRef.current = script;
    setCurrentScriptId(script.id);
    setCurrentScriptOwnerId(script.userId ?? null);
    setTitleInfo(script.titleInfo ?? DEFAULT_TITLE_INFO);
    editorWrapperRef.current?._loadBlocks(script.blocks ?? []);
    setSaveStatus('saved');
  }, []);

  // ── Library actions ─────────────────────────────────────────────────────────
  const handleNewScript = useCallback(async () => {
    try {
      await saveNow();
      const script = await cloud.createScript(user.id, [], DEFAULT_TITLE_INFO);
      await refreshIndex();
      loadScriptIntoEditor(script);
      setShowLibrary(false);
    } catch (err) {
      console.error('New script failed:', err);
    }
  }, [saveNow, user.id, refreshIndex, loadScriptIntoEditor]);

  const handleOpenScript = useCallback(async (id) => {
    if (id === currentScriptId) { setShowLibrary(false); return; }
    await saveNow();
    const script = await cloud.loadScript(id);
    if (script) loadScriptIntoEditor(script);
    setShowLibrary(false);
  }, [currentScriptId, saveNow, loadScriptIntoEditor]);

  const handleDeleteScript = useCallback(async (id) => {
    await cloud.deleteScript(id);
    const remaining = await cloud.listScripts(user.id);
    setScripts(remaining);
    if (id !== currentScriptId) return;

    if (remaining.length > 0) {
      const full = await cloud.loadScript(remaining[0].id);
      if (full) loadScriptIntoEditor(full);
    } else {
      const fresh = await cloud.createScript(user.id, [], DEFAULT_TITLE_INFO);
      setScripts([fresh]);
      loadScriptIntoEditor(fresh);
    }
  }, [currentScriptId, user.id, loadScriptIntoEditor]);

  // ── Import / Export ────────────────────────────────────────────────────────
  const runImport = useCallback(async (blocks, titleInfo, fallbackTitle) => {
    if (!titleInfo.title) titleInfo.title = fallbackTitle;
    await saveNow();
    const script = await cloud.createScript(user.id, blocks, { ...DEFAULT_TITLE_INFO, ...titleInfo });
    await refreshIndex();
    loadScriptIntoEditor(script);
    setImportStatus(null);
  }, [saveNow, user.id, refreshIndex, loadScriptIntoEditor]);

  const handleImportFdx = useCallback(async (file) => {
    setImportStatus('loading');
    try {
      const text          = await file.text();
      const { blocks, titleInfo } = parseFdx(text);
      await runImport(blocks, titleInfo, file.name.replace(/\.fdx$/i, ''));
    } catch (err) {
      console.error('FDX import failed:', err);
      setImportStatus({ error: err.message || 'Failed to import FDX' });
    }
  }, [runImport]);

  const handleImportPdf = useCallback(async (file) => {
    setImportStatus('loading');
    try {
      const { parsePdf } = await import('./utils/importPdf');
      const buffer        = await file.arrayBuffer();
      const { blocks, titleInfo } = await parsePdf(buffer);
      await runImport(blocks, titleInfo, file.name.replace(/\.pdf$/i, ''));
    } catch (err) {
      console.error('PDF import failed:', err);
      setImportStatus({ error: err.message || 'Failed to import PDF' });
    }
  }, [runImport]);

  const handleExportFdx = useCallback(() => {
    const blocks  = editorWrapperRef.current?._getBlocks() ?? [];
    const content = exportToFdx(blocks, titleInfo);
    const safe    = (titleInfo.title || 'Untitled').replace(/[^\w\s-]/g, '').trim();
    downloadFdx(content, `${safe}.fdx`);
  }, [titleInfo]);

  // ── Revision management ────────────────────────────────────────────────────
  const handleSaveRevision = useCallback(async () => {
    setSavingRevision(true);
    try {
      await saveNow(); // persist current state first
      // Re-fetch scripts fresh from DB so version numbers are accurate
      const freshScripts = await cloud.listScripts(user.id);
      const savedTitle   = freshScripts.find((s) => s.id === currentScriptId)?.title
                        ?? titleInfo.title ?? 'Untitled';
      const newTitle     = nextRevisionTitle(savedTitle, freshScripts);
      const blocks       = editorWrapperRef.current?._getBlocks() ?? [];
      const newTitleInfo = { ...titleInfo, title: newTitle };
      const newScript    = await cloud.createScript(user.id, blocks, newTitleInfo);
      await refreshIndex(); // update sidebar list
      loadScriptIntoEditor(newScript);
    } catch (err) {
      console.error('Save revision failed:', err);
    } finally {
      setSavingRevision(false);
    }
  }, [saveNow, titleInfo, currentScriptId, user.id, refreshIndex, loadScriptIntoEditor]);

  // ── Auth ────────────────────────────────────────────────────────────────────
  const handleLogout = useCallback(async () => {
    clearTimeout(autoSaveTimerRef.current);
    await saveNow();
    await supabase.auth.signOut();
    // App's onAuthStateChange fires → session = null → AuthScreen renders
  }, [saveNow]);

  // ── Scene navigation ────────────────────────────────────────────────────────
  const handleSceneClick = useCallback((id) => {
    setActiveSceneId(id);
    editorWrapperRef.current?._scrollToBlock(id);
  }, []);

  // ── Show data loading spinner until first script is ready ──────────────────
  if (dataLoading || initBlocks === null) {
    return <AppSpinner label="Loading your scripts…" />;
  }

  return (
    <div className="app">
      {/* Hidden file inputs triggered by toolbar buttons */}
      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf,application/pdf"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImportPdf(file);
          e.target.value = '';
        }}
      />
      <input
        ref={fdxInputRef}
        type="file"
        accept=".fdx"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImportFdx(file);
          e.target.value = '';
        }}
      />

      <Toolbar
        title={titleInfo.title}
        onTitleChange={(t) => handleTitleInfoChange({ ...titleInfo, title: t })}
        activeBlockType={activeBlockType}
        onTypeChange={(type) => editorWrapperRef.current?._changeType(type)}
        activeBold={activeBold}
        activeItalic={activeItalic}
        onBold={() => editorWrapperRef.current?._bold()}
        onItalic={() => editorWrapperRef.current?._italic()}
        onExport={() => window.print()}
        onExportFdx={handleExportFdx}
        onImportPdf={() => pdfInputRef.current?.click()}
        onImportFdx={() => fdxInputRef.current?.click()}
        importStatus={importStatus}
        revisionFamily={revisionFamily}
        currentScriptId={currentScriptId}
        onSwitchRevision={handleOpenScript}
        onSaveRevision={handleSaveRevision}
        savingRevision={savingRevision}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        saveStatus={saveStatus}
        onOpenLibrary={() => setShowLibrary(true)}
        onCollaborate={() => setShowCollaborate(true)}
        viewerCount={viewerCount}
        userEmail={user.email}
        onLogout={handleLogout}
      />

      <div className="layout">
        {sidebarOpen && (
          <Sidebar
            scenes={scenes}
            activeSceneId={activeSceneId}
            onSceneClick={handleSceneClick}
            titleInfo={titleInfo}
            onTitlePageClick={() =>
              document.querySelector('.title-page')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
            onEditTitle={() => setShowTitleForm(true)}
          />
        )}

        <main className="editor-area" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          <ScreenplayEditor
            editorRef={editorWrapperRef}
            initialBlocks={initBlocks}
            onScenesChange={setScenes}
            onActiveTypeChange={setActiveBlockType}
            onActiveFormattingChange={handleActiveFormattingChange}
            onBlocksChange={handleBlocksChange}
            titleInfo={titleInfo}
          />
        </main>
      </div>

      {showTitleForm && (
        <TitlePageForm
          titleInfo={titleInfo}
          onChange={handleTitleInfoChange}
          onClose={() => setShowTitleForm(false)}
        />
      )}

      {showLibrary && (
        <ScriptLibrary
          scripts={scripts}
          sharedScripts={sharedScripts}
          currentScriptId={currentScriptId}
          onNew={handleNewScript}
          onOpen={handleOpenScript}
          onDelete={handleDeleteScript}
          onClose={() => setShowLibrary(false)}
        />
      )}

      {showCollaborate && currentScriptId && (
        <CollaborateModal
          scriptId={currentScriptId}
          ownerId={currentScriptOwnerId}
          currentUserId={user.id}
          onClose={() => setShowCollaborate(false)}
        />
      )}
    </div>
  );
}
