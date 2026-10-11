import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { parseRole, ROLE_STORAGE_KEY, type ViewerRole } from './viewerRole';

/**
 * The role picked on the start screen, remembered across launches. Storage failures are never
 * shown: a failed read just asks again, and a failed write still applies for this session.
 */
export function useViewerRole() {
  const [role, setRoleState] = useState<ViewerRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(ROLE_STORAGE_KEY)
      .catch(() => null)
      .then((stored) => {
        if (cancelled) return;
        // A role picked while storage was still being read wins over the stored one.
        setRoleState((current) => current ?? parseRole(stored));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setRole = useCallback((next: ViewerRole) => {
    setRoleState(next);
    AsyncStorage.setItem(ROLE_STORAGE_KEY, next).catch(() => {});
  }, []);

  return { role, loading, setRole };
}
