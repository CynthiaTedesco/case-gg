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
to reserve things. Reserve something and see it flip instantly. Wait 10–20 s and other people (Mette, Jonas, Farmor) will
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
  format.ts                    price and name formatting
  WishlistScreen.tsx           the screen
src/components/                ItemRow, Toolbar, AddItemModal, RolePicker, Toast,
                               loading/error/empty states
```

State is one `useReducer`. The reducer is a pure function, so the tricky parts (rollback, conflicts,
a stale poll arriving late) are unit-tested without rendering anything.

## Where the API docs and `api.ts` disagree

`api.ts` is left unchanged, so where it differs from the API docs, one rule decides: **the docs
win for what the app sends, and `api.ts` wins for what the app reads.** The docs are the contract
a real backend would enforce. `api.ts` is what actually runs, so the app has to cope with
whatever it returns.

| Where            | API docs                                  | `api.ts`                                                             | Who wins and what the app does                                                                                                          |
| ---------------- | ----------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `url`            | Required on `AddItemInput` and `WishItem` | Optional (`url?`). Seed items 2–6 have none                          | **Docs** for adding: the form requires a link. **`api.ts`** for showing: a row without a link just hides "View item ↗".                 |
| `imageUrl`       | Not a field                               | Optional field, never set                                            | **Docs**: the app never sends it. A row would show the image if one ever came back, which costs nothing.                                |
| `getItems`       | Not documented                            | Loads the list, fails ~10% of calls                                  | **`api.ts`**: it's the only way to load the list. Its failures are treated like the documented `Error("Network error")`: safe to retry. |
| `id`             | UUID v4                                   | Seed items use `'1'`–`'6'`, new items get UUIDs                      | **`api.ts`**: ids are treated as opaque strings, never parsed or checked.                                                               |
| `id`, `currency` | Set by the service                        | `addItem` spreads the input last, so extra keys could overwrite them | **Docs**: validation builds a fresh `{ title, priceMinor, url }`, so nothing else is ever sent.                                         |
| `priceMinor`     | Øre                                       | Commented as "cent"                                                  | **Docs**: only the comment is wrong. Prices are øre everywhere.                                                                         |

## Decisions where the brief was ambiguous

**Who is this for? The person says so, and gets an owner or a gift-giver view.**
The brief contradicts itself a little. It says the _owner_ adds items and _friends and family_
reserve them, asks for an app that lets a _gift-giver_ use the list, and then requires adding
items. With authentication and routing out of scope, the app can't tell who is looking, so the
first screen asks: "Is this your wishlist?".

- **Owner:** sees **+ Add**, and nothing about reservations: no Reserve buttons, no "Reserved"
  labels or dimmed rows, no "Only unreserved" filter, and "6 items on your list" instead of
  "3 of 6 still available". The surprise survives.
- **Gift-giver:** sees and makes reservations, and has no **+ Add**.
- What each role sees is one pure function (`viewFor`), and components get its flags
  (`canAdd`, `showReservations`), never the role, so they don't need to know roles exist.

This is a convenience, not security (see _What I'm not happy with_).

**Reservations never say who made them.**
This keeps the surprise for everyone. Other people's reservations show as just "Reserved": a
gift-giver knows the gift is taken, but not who took it. Your own reservations still say
"Reserved by you", since the API marks them with the current user. No identity is needed for
this, because every viewer is treated the same. The cost is some coordination between givers
("is Mette getting the lamp?"), which I think is the right trade for a gift list.

**Reserving is optimistic; adding isn't.**
Reserve flips the row to "Reserved by you" the moment you tap it. A small spinner on the button
says it's still saving, and double taps are ignored. Adding waits for the server instead. The
server assigns the id, adding is rare, and a fake item that then disappears is more confusing
than a one-second "Saving…". If saving fails, the form keeps everything you typed.

**"Someone else got there first" is not treated as an error.**
`ConflictError` carries the item's current state, so the row immediately shows "Reserved" and
a toast explains that someone got there just before you. There's no rollback to "available" and no retry button, because
retrying can't succeed and the gift is covered. A network-type failure, by contrast, rolls back
and offers **Try again**. `NotFoundError` removes the row with a note.

**You can undo your own reservation.**
The API has `unreserveItem`, and mis-taps happen. The undo is optimistic too.

**The list keeps itself fresh.**
The mock API simulates other users changing the list every 8–15 s, so a list loaded once goes
stale fast. The app re-fetches every 15 s while it's in the foreground, and again when you come
back to the app or tab. To stop a fetch from undoing your own changes, the merge keeps the
local copy of any item that is still saving, or that was confirmed _after_ that fetch started.
A small logical clock (a counter) orders those events. The tests cover the race cases.

**Failures are loud only when you're waiting.**

- First load fails: a full error state with **Try again**.
- A refresh you asked for fails (button or pull-down): the list stays and a toast offers a retry.
- A background poll fails: silent. With a 10 % failure rate, a toast every couple of minutes
  would be noise, and the next poll is 15 s away.

**"Only unreserved" doesn't make your row vanish.**
If the filter is on and you reserve something, a strictly applied filter would remove the row
under your finger, so you'd never see that it worked. Items you reserve stay visible until you
next change the filter. Items reserved by _other people_ still disappear (see below).

**Sorting:** Default (the list's own order, new items last), Price ↑ and Price ↓. Equal prices
keep the default order, so rows don't jump around.

**Add-item validation**

- **Title:** required, trimmed, repeated spaces collapsed, max 100 characters.
- **Price:** required, because the API docs mark `priceMinor` as required. Typed in kroner with
  `,` or `.` before the øre ("449", "449,95", "449.95 kr"), up to 2 decimals, converted to øre
  with integer maths. Must be more than 0 and at most 100000 kr. (catches typos).
  - **The number keyboard is only a hint.** On a phone the field opens a number pad with a
    single separator key (a comma in Danish, a dot in English), but pasting, web and physical
    keyboards can send anything. So validation handles any text, and the messages cover cases
    a number pad can't produce, like letters or a minus sign.
  - **Obvious input is accepted, not argued with:** "449," is 449 kr. and ",95" is 0,95 kr. A
    stray comma is easy to tap on a number pad.
  - **Mixed or repeated separators are rejected, not guessed.** A price pasted from a Danish shop
    ("1.299,95") and an English one ("1,299.95") use opposite separators for the same amount,
    and a wrong guess is off by 100× or more. A single separator followed by exactly 3 digits
    ("1.299") is treated as a thousands separator, so the message suggests 1299, not 1.29.
  - **The error names the actual problem**, in the separator the person typed: someone on a
    comma-only number pad is never told to type a dot. With both a format and a size problem,
    the message names both, so nobody fixes one only to hit the other.
- **URL:** required. The brief calls it optional, but the API docs make `url` required on both
  `AddItemInput` and `WishItem`, so the form follows the API (see "Where the API docs and
  `api.ts` disagree"). A missing scheme gets `https://` ("shop.dk/lamp" works). Only http(s) is
  accepted, which also keeps `javascript:` links off the page. The host must be well-formed:
  parts made of letters, digits and hyphens, and a top-level domain of 2+ letters. Accented
  Latin letters are allowed, so Danish domains like `blåbær.dk` work. This checks the _shape_
  only: `l.com.ard` passes because rejecting it would need the list of real top-level domains,
  and even a real domain might not exist. Non-Latin domains (e.g. Cyrillic) must be typed in
  their `xn--` form.
- Errors appear when you leave a field or press Save, not on every keystroke.
- **Closing the form: Cancel clears it, tapping outside doesn't.** **Cancel** is a deliberate
  "never mind", so the form is cleared and the next add starts fresh. Tapping outside the form,
  pressing Escape on web or the Android back button only hides it: those are often accidental
  (a stray tap next to the card), and losing a half-typed item to one is annoying. The draft is
  still there when you reopen the form. If saving fails, the form stays open with everything
  you typed.

**Prices** are shown in Danish format: `449 kr.`, `1.299 kr.`, `449,50 kr.`

**Filter and sort reset on reload.** That's deliberate: the mock API keeps its data in memory,
so a reload resets the list itself too. Saving the view settings while the data resets would be
odd.

**Platform notes**

- `api.ts` calls `crypto.randomUUID()`, which Hermes (iOS/Android) doesn't provide, and which
  browsers only provide on secure origins. `src/polyfills.ts` fills it in from `expo-crypto`
  without touching `api.ts`.
- Errors are matched by `instanceof` with a fallback on `error.name`. Babel-compiled subclasses of
  `Error` can fail `instanceof`, and the name is compared as a literal because minifiers rename
  classes.
- No Expo Router. The brief asks for a single page with no routing.

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
  reaches the device, and anyone can answer the first question either way. A gift-giver can
  say the list is theirs and add items too. Both come down to the app not knowing who is
  looking, which needs login or per-role links, and both were out of scope for this exercise.
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
