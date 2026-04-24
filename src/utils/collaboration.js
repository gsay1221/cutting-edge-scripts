import { supabase } from './supabase';

export async function listCollaborators(scriptId) {
  const { data, error } = await supabase
    .from('script_collaborators')
    .select('id, collaborator_email, created_at')
    .eq('script_id', scriptId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addCollaborator(scriptId, ownerId, email) {
  const { error } = await supabase
    .from('script_collaborators')
    .insert({
      script_id:          scriptId,
      owner_id:           ownerId,
      collaborator_email: email.toLowerCase().trim(),
    });
  if (error) throw error;
}

export async function removeCollaborator(id) {
  const { error } = await supabase
    .from('script_collaborators')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
