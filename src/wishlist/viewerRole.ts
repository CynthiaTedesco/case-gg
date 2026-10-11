/** Who is looking at the list. There's no login, so the person says it themselves (see README). */
export type ViewerRole = 'owner' | 'giver';

/** What each role sees. Components get these flags, never the role itself. */
export function viewFor(role: ViewerRole) {
  return {
    /** Only the owner adds items. */
    canAdd: role === 'owner',
    /** The owner never sees what's reserved, so the surprise survives. */
    showReservations: role === 'giver',
  };
}
