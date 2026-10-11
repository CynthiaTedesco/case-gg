import { viewFor } from '../viewerRole';

describe('viewFor', () => {
  it('lets the owner add, and hides every reservation from them', () => {
    expect(viewFor('owner')).toEqual({ canAdd: true, showReservations: false });
  });

  it('lets a gift-giver see and make reservations, but not add', () => {
    expect(viewFor('giver')).toEqual({ canAdd: false, showReservations: true });
  });
});
