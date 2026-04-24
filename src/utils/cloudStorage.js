/**
 * Cloud storage — all scripts persisted to Supabase.
 *
 * Required SQL (run once in the Supabase SQL editor):
 *
 *   CREATE TABLE IF NOT EXISTS scripts (
 *     id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
 *     user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 *     title       TEXT        NOT NULL DEFAULT 'Untitled',
 *     title_info  JSONB       NOT NULL DEFAULT '{}',
 *     blocks      JSONB       NOT NULL DEFAULT '[]',
 *     created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
 *     updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
 *   );
 *
 *   ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;
 *
 *   CREATE POLICY "users_own_scripts" ON scripts
 *     FOR ALL
 *     USING  (auth.uid() = user_id)
 *     WITH CHECK (auth.uid() = user_id);
 */

import { supabase } from './supabase';

// ── Shape normalizer (DB snake_case → app camelCase) ──────────────────────
function normalize(row) {
  return {
    id:        row.id,
    userId:    row.user_id,
    title:     row.title,
    titleInfo: row.title_info ?? { title: '', author: '', contact: '' },
    blocks:    row.blocks    ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── List own scripts (index only — no blocks payload) ─────────────────────
export async function listScripts(userId) {
  const { data, error } = await supabase
    .from('scripts')
    .select('id, user_id, title, title_info, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(normalize);
}

// ── List scripts shared with the current user ─────────────────────────────
// Returns [] gracefully if the script_collaborators table doesn't exist yet.
export async function listSharedScripts(userEmail) {
  const { data: collabs, error: collabError } = await supabase
    .from('script_collaborators')
    .select('script_id')
    .eq('collaborator_email', userEmail);
  if (collabError) return [];  // table may not exist yet — treat as empty
  if (!collabs?.length) return [];

  const ids = collabs.map((c) => c.script_id);
  const { data, error } = await supabase
    .from('scripts')
    .select('id, user_id, title, title_info, created_at, updated_at')
    .in('id', ids)
    .order('updated_at', { ascending: false });
  if (error) return [];
  return (data ?? []).map(normalize);
}

// ── Load full script by id ─────────────────────────────────────────────────
export async function loadScript(id) {
  const { data, error } = await supabase
    .from('scripts')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return normalize(data);
}

// ── Create a brand-new script row ─────────────────────────────────────────
export async function createScript(userId, blocks = [], titleInfo = { title: '', author: '', contact: '' }) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('scripts')
    .insert({
      user_id:    userId,
      title:      titleInfo.title || 'Untitled',
      title_info: titleInfo,
      blocks,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();
  if (error) throw error;
  return normalize(data);
}

// ── Upsert (save current script) ──────────────────────────────────────────
export async function saveScript(script, fallbackUserId) {
  const { data, error } = await supabase
    .from('scripts')
    .upsert(
      {
        id:         script.id,
        user_id:    script.userId ?? fallbackUserId,
        title:      script.title || 'Untitled',
        title_info: script.titleInfo,
        blocks:     script.blocks,
        created_at: script.createdAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    .select()
    .single();
  if (error) throw error;
  return normalize(data);
}

// ── Delete ────────────────────────────────────────────────────────────────
export async function deleteScript(id) {
  const { error } = await supabase.from('scripts').delete().eq('id', id);
  if (error) throw error;
}

export function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7)  return `${days} days ago`;
  return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
