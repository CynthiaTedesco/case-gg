# Shared wishlist

A single-screen Expo / React Native app for a shared wishlist. The wishlist owner adds the items
they want; friends and family browse the list and reserve a gift so nobody doubles up. It runs
on web, iOS and Android from the same code.

## How to run it

Requires a current Node LTS and npm.

```bash
npm install
npm run web        # opens in the browser (the quickest way to review)
npm run ios        # iOS simulator, or scan the QR code with Expo Go
npm run android    # Android emulator, or scan the QR code with Expo Go
```

Every native module used is bundled in Expo Go, so no development build is needed.

```bash
npm test           # unit tests: validation, filter/sort, and the state reducer
npm run lint
npm run typecheck
```

**Things to try:** the first screen asks whether the list is yours. Pick "No, I'm giving a gift"
to reserve things, and use **Switch view** under the title to see the owner's side. Reserve
something and see it flip instantly. Wait 10–20 s and other people (Mette, Jonas, Farmor) will
start reserving and releasing items. Reload a few times to hit the API's 10 % load failure.

## How it's built

```
src/api.ts                     the provided mock API (unchanged)
src/polyfills.ts               crypto.randomUUID for native (see below)
src/wishlist/
  wishlistReducer.ts           all state transitions: load, optimistic reserve, rollback, merge
  useWishlist.ts               calls the API, dispatches to the reducer, polls
  selectors.ts                 filter + sort as pure functions of the list
  validation.ts                add-item form rules
  viewerRole.ts                owner / gift-giver: what each one sees, as a pure function
  useViewerRole.ts             the picked role, remembered with AsyncStorage
  format.ts                    price and name formatting
  WishlistScreen.tsx           the screen
src/components/                ItemRow, Toolbar, AddItemModal, RolePicker, Toast, confirm,
                               loading/error/empty states
```

State is one `useReducer`. The reducer is a pure function, so the tricky parts (rollback, conflicts,
a stale poll arriving late) are unit-tested without rendering anything.

## Decisions where the brief was ambiguous

The full reasoning for each is in [DECISIONS.md](DECISIONS.md).

- **Who is this for:** the first screen asks "Is this your wishlist?". The owner gets **+ Add**
  and never sees reservations; gift-givers reserve. **Switch view** changes role.
- **Reservations never say who made them**, so the surprise holds for everyone. Your own say
  "Reserved by you".
- **Reserving is optimistic; adding isn't.** Adding waits for the server, which assigns the id.
- **"Someone else got there first" is not an error.** The row shows "Reserved" and a toast
  explains, with no rollback and no retry.
- **You can undo your own reservation**, optimistically.
- **The list keeps itself fresh:** a poll every 15 s and on return to the app, merged so it never
  undoes your own changes.
- **Failures are loud only when you're waiting.** Background poll failures are silent.
- **"Only unreserved" doesn't hide a row you just reserved.**
- **Sorting:** Default, Price ↑ and Price ↓. Equal prices keep the default order.
- **Where the API docs and `api.ts` disagree,** the docs win for what the app sends and `api.ts`
  for what it reads. The link is required, following the API docs rather than the brief.
- **Add-item validation:** lenient about obvious price input, strict about ambiguous separators,
  and errors that name the actual problem.
- **Prices** are shown in Danish format: `449 kr.`, `1.299 kr.`, `449,50 kr.`
- **Filter and sort reset on reload; the role doesn't.**
- **Platform notes:** a `crypto.randomUUID` polyfill for native, and no Expo Router.

## What I'd do with more time

- **Enforce the roles on the server.** With real identity (separate owner and giver share
  links, or login), the role would come from the link instead of a question, and the server
  would make sure only the owner adds items and never sends the owner reservations.
- **TanStack Query** for the data layer. It provides caching, retries, focus refetching and
  optimistic updates. I wrote it by hand here so the mechanics are visible and testable. In a
  production app I'd use the library rather than maintain my own.
- **Real-time updates** (WebSocket / SSE) instead of polling, if the backend supported it.
- **Component and integration tests** with React Native Testing Library: the hook's polling
  and AppState handling, and the form's error timing.
- **Show freshness**: a quiet "Updated 2 min ago" when background polls keep failing.
- **Save the view settings** in the URL on web and in AsyncStorage on native, once the data
  outlives a reload.
- Scroll to, or briefly highlight, a newly added item.
- Accessibility pass with VoiceOver and TalkBack, and a check of the modal's focus handling on web.

## What I'm not happy with

- **The roles are on the honour system.** The owner view hides reservations, but the data still
  reaches the device, and **Switch view** is one tap (plus a warning) away. A gift-giver can
  switch to the owner view and add items too. Both come down to the app not knowing who is
  looking, which needs login or per-role links, and both were out of scope for this exercise.
- **Items can't be edited or removed.** A typo in a title, a changed price or a gift the owner no
  longer wants stays on the list for good. The mock API only has `getItems`, `addItem`,
  `reserveItem` and `unreserveItem`, so this needs `updateItem` and `deleteItem` endpoints first.
  It also needs a decision about reserved items. The owner view hides reservations, so the owner
  could remove or change a gift someone has already bought without knowing it, and the giver
  would need to be told.
- **Rows reserved by others still vanish under the filter.** Mine stay put, but if someone else
  reserves something while you're looking at "Only unreserved", it disappears without explanation. A brief
  "just reserved" state before removal would be kinder.
- **Silent background failures** mean the list can be stale for a while without saying so.
- **One toast at a time.** Two quick events (a conflict, then a failed refresh) and the first
  message is replaced before you can read it.
- **The keep-visible logic lives in the screen, not the reducer**, so it isn't covered by the
  reducer tests.
- **The merge is conservative.** After you change an item, the next poll may keep your copy
  for one extra cycle (~15 s) even when the server's copy is just as fresh. That's the safe
  direction, but it isn't exact.
- **The skeleton is static.** A shimmer would read as loading more clearly.
