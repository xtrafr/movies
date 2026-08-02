import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { loadCloudLibrary, mergeLibraries, syncCloudLibrary } from '../lib/cloudLibrary';
import { loadLibrary, persistLibrary } from '../lib/library';

const EMPTY_LIBRARY = { watchlist: [], history: [] };

export default function useLibrary() {
  const { user } = useAuth();
  const anonymousLibraryRef = useRef(loadLibrary());
  const syncQueueRef = useRef(Promise.resolve());
  const cloudReadyRef = useRef(false);
  const pendingLibraryRef = useRef(null);
  const [library, setLibrary] = useState(loadLibrary);
  const [syncStatus, setSyncStatus] = useState('local');

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      cloudReadyRef.current = false;
      pendingLibraryRef.current = null;
      setLibrary(anonymousLibraryRef.current);
      setSyncStatus('local');
      return undefined;
    }

    cloudReadyRef.current = false;
    pendingLibraryRef.current = null;
    setSyncStatus('syncing');
    loadCloudLibrary(user.id)
      .then(async (cloudLibrary) => {
        let merged = mergeLibraries(anonymousLibraryRef.current, cloudLibrary);
        if (pendingLibraryRef.current) merged = mergeLibraries(pendingLibraryRef.current, merged);
        await syncCloudLibrary(user.id, merged);
        if (cancelled) return;
        anonymousLibraryRef.current = EMPTY_LIBRARY;
        pendingLibraryRef.current = null;
        cloudReadyRef.current = true;
        persistLibrary(EMPTY_LIBRARY);
        setLibrary(merged);
        setSyncStatus('synced');
      })
      .catch(() => {
        if (!cancelled) setSyncStatus('error');
      });

    return () => { cancelled = true; };
  }, [user]);

  const queueCloudSync = useCallback((nextLibrary) => {
    if (!user) return;
    setSyncStatus('syncing');
    syncQueueRef.current = syncQueueRef.current
      .catch(() => {})
      .then(() => syncCloudLibrary(user.id, nextLibrary))
      .then(() => setSyncStatus('synced'))
      .catch(() => setSyncStatus('error'));
  }, [user]);

  const mutateLibrary = useCallback((updater) => {
    setLibrary((current) => {
      const next = updater(current);
      if (user) {
        if (cloudReadyRef.current) queueCloudSync(next);
        else pendingLibraryRef.current = next;
      } else {
        anonymousLibraryRef.current = next;
        persistLibrary(next);
      }
      return next;
    });
  }, [queueCloudSync, user]);

  return { library, mutateLibrary, syncStatus };
}
