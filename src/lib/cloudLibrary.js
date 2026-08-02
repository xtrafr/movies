import { compactMedia, mediaKey } from './library';
import { supabase } from './supabase';

const emptyLibrary = () => ({ watchlist: [], history: [] });

function libraryMap(library) {
  const items = new Map();

  for (const item of library.watchlist || []) {
    items.set(mediaKey(item), {
      item: compactMedia(item),
      saved: true,
      savedAt: item.savedAt || Date.now(),
    });
  }

  for (const item of library.history || []) {
    const key = mediaKey(item);
    const previous = items.get(key) || { item: compactMedia(item), saved: false };
    items.set(key, {
      ...previous,
      item: { ...previous.item, ...compactMedia(item) },
      history: item,
    });
  }

  return items;
}

function rowsToLibrary(rows = []) {
  const library = emptyLibrary();

  for (const row of rows) {
    const base = {
      ...(row.metadata || {}),
      id: Number(row.media_id),
      media_type: row.media_type,
    };

    if (row.saved) {
      library.watchlist.push({
        ...base,
        savedAt: row.saved_at ? Date.parse(row.saved_at) : Date.now(),
      });
    }

    if (row.last_watched_at) {
      library.history.push({
        ...base,
        progress: Number(row.progress || 0),
        season: row.season || undefined,
        episode: row.episode || undefined,
        watchedSeconds: Number(row.watched_seconds || 0),
        durationSeconds: Number(row.duration_seconds || 0),
        lastWatchedAt: Date.parse(row.last_watched_at),
      });
    }
  }

  library.watchlist.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  library.history.sort((a, b) => (b.lastWatchedAt || 0) - (a.lastWatchedAt || 0));
  return library;
}

function libraryToRows(userId, library) {
  return [...libraryMap(library).values()].map(({ item, saved, savedAt, history }) => ({
    user_id: userId,
    media_type: item.media_type,
    media_id: item.id,
    metadata: compactMedia(item),
    saved: Boolean(saved),
    progress: Number(history?.progress || 0),
    season: history?.season || null,
    episode: history?.episode || null,
    watched_seconds: Math.max(0, Math.round(history?.watchedSeconds || 0)),
    duration_seconds: Math.max(0, Math.round(history?.durationSeconds || 0)),
    saved_at: saved ? new Date(savedAt || Date.now()).toISOString() : null,
    last_watched_at: history ? new Date(history.lastWatchedAt || Date.now()).toISOString() : null,
    updated_at: new Date().toISOString(),
  }));
}

export function mergeLibraries(localLibrary, cloudLibrary) {
  const local = libraryMap(localLibrary || emptyLibrary());
  const cloud = libraryMap(cloudLibrary || emptyLibrary());
  const merged = new Map(cloud);

  for (const [key, localEntry] of local) {
    const cloudEntry = merged.get(key);
    if (!cloudEntry) {
      merged.set(key, localEntry);
      continue;
    }

    const localHistoryTime = localEntry.history?.lastWatchedAt || 0;
    const cloudHistoryTime = cloudEntry.history?.lastWatchedAt || 0;
    merged.set(key, {
      item: { ...cloudEntry.item, ...localEntry.item },
      saved: localEntry.saved || cloudEntry.saved,
      savedAt: Math.max(localEntry.savedAt || 0, cloudEntry.savedAt || 0) || undefined,
      history: localHistoryTime > cloudHistoryTime ? localEntry.history : cloudEntry.history,
    });
  }

  const result = emptyLibrary();
  for (const entry of merged.values()) {
    if (entry.saved) result.watchlist.push({ ...entry.item, savedAt: entry.savedAt || Date.now() });
    if (entry.history) result.history.push({ ...entry.item, ...entry.history });
  }
  result.watchlist.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  result.history.sort((a, b) => (b.lastWatchedAt || 0) - (a.lastWatchedAt || 0));
  return result;
}

export async function loadCloudLibrary(userId) {
  const { data, error } = await supabase
    .from('user_library')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return rowsToLibrary(data);
}

export async function syncCloudLibrary(userId, library) {
  const rows = libraryToRows(userId, library);
  const { data: existing, error: existingError } = await supabase
    .from('user_library')
    .select('media_type, media_id')
    .eq('user_id', userId);
  if (existingError) throw existingError;

  if (rows.length) {
    const { error } = await supabase
      .from('user_library')
      .upsert(rows, { onConflict: 'user_id,media_type,media_id' });
    if (error) throw error;
  }

  const currentKeys = new Set(rows.map((row) => `${row.media_type}:${row.media_id}`));
  const staleRows = (existing || []).filter((row) => !currentKeys.has(`${row.media_type}:${row.media_id}`));
  for (const stale of staleRows) {
    const { error } = await supabase
      .from('user_library')
      .delete()
      .eq('user_id', userId)
      .eq('media_type', stale.media_type)
      .eq('media_id', stale.media_id);
    if (error) throw error;
  }
}
