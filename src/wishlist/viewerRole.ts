/** Who is looking at the list. There's no login, so the person says it themselves (see README). */
export type ViewerRole = 'owner' | 'giver';

export const ROLE_STORAGE_KEY = 'wishlist.viewerRole';

/** Anything but a known role (nothing saved, an old or corrupted value) means "ask again". */
export function parseRole(stored: string | null): ViewerRole | null {
  return stored === 'owner' || stored === 'giver' ? stored : null;
}

/** What each role sees. Components get these flags, never the role itself. */
export function viewFor(role: ViewerRole) {
  return {
    /** Only the owner adds items. */
    canAdd: role === 'owner',
    /** The owner never sees what's reserved, so the surprise survives. */
    showReservations: role === 'giver',
  };
}
