import { parseRole, viewFor } from '../viewerRole';

describe('parseRole', () => {
  it.each(['owner', 'giver'] as const)('reads a saved %p', (role) => {
    expect(parseRole(role)).toBe(role);
  });

  it.each([null, '', 'Owner', 'admin', '"owner"'])('asks again for %p', (stored) => {
    expect(parseRole(stored)).toBeNull();
  });
});

describe('viewFor', () => {
  it('lets the owner add, and hides every reservation from them', () => {
    expect(viewFor('owner')).toEqual({ canAdd: true, showReservations: false });
  });

  it('lets a gift-giver see and make reservations, but not add', () => {
    expect(viewFor('giver')).toEqual({ canAdd: false, showReservations: true });
  });
});
