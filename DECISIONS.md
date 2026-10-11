# Decisions where the brief was ambiguous

The brief, the API docs and the mock API (`src/api.ts`) leave some things open or contradict
each other. This is what I decided in each case, and why. The [README](README.md) has a
one-line summary of each.

## Who is this for? The person says so, and gets an owner or a gift-giver view

The brief contradicts itself a little. It says the _owner_ adds items and _friends and family_
reserve them, asks for an app that lets a _gift-giver_ use the list, and then requires adding
items. With authentication and routing out of scope, the app can't tell who is looking, so the
first screen asks: "Is this your wishlist?". The answer is remembered (AsyncStorage, so it works
on iOS, Android and web, and in Expo Go).

- **Owner:** sees **+ Add**, and nothing about reservations: no Reserve buttons, no "Reserved"
  labels or dimmed rows, no "Only unreserved" filter, and "6 items on your list" instead of
  "3 of 6 still available". The surprise survives.
- **Gift-giver:** sees and makes reservations, and has no **+ Add**.
- **Switch view**, under the title, changes role. Going from owner to gift-giver asks first,
  since it reveals what's reserved. The other way switches straight away. React Native's
  `Alert` does nothing on web, so the question uses the browser's own dialog there.
- What each role sees is one pure function (`viewFor`), and components get its flags
  (`canAdd`, `showReservations`), never the role, so they don't need to know roles exist.

This is a convenience, not security: anyone can tap **Switch view** (see _What I'm not happy
with_ in the [README](README.md#what-im-not-happy-with)).

## Reservations never say who made them

This keeps the surprise for everyone. Other people's reservations show as just "Reserved": a
gift-giver knows the gift is taken, but not who took it. Your own reservations still say
"Reserved by you", since the API marks them with the current user. No identity is needed for
this, because every viewer is treated the same. The cost is some coordination between givers
("is Mette getting the lamp?"), which I think is the right trade for a gift list.

## Reserving is optimistic; adding isn't

Reserve flips the row to "Reserved by you" the moment you tap it. A small spinner on the button
says it's still saving, and double taps are ignored. Adding waits for the server instead. The
server assigns the id, adding is rare, and a fake item that then disappears is more confusing
than a one-second "Saving…". If saving fails, the form keeps everything you typed.

## "Someone else got there first" is not treated as an error

`ConflictError` carries the item's current state, so the row immediately shows "Reserved" and
a toast explains that someone got there just before you. There's no rollback to "available" and no retry button, because
retrying can't succeed and the gift is covered. A network-type failure, by contrast, rolls back
and offers **Try again**. `NotFoundError` removes the row with a note.

## You can undo your own reservation

The API has `unreserveItem`, and mis-taps happen. The undo is optimistic too.

## The list keeps itself fresh

The mock API simulates other users changing the list every 8–15 s, so a list loaded once goes
stale fast. The app re-fetches every 15 s while it's in the foreground, and again when you come
back to the app or tab. To stop a fetch from undoing your own changes, the merge keeps the
local copy of any item that is still saving, or that was confirmed _after_ that fetch started.
A small logical clock (a counter) orders those events. The tests cover the race cases.

## Failures are loud only when you're waiting

- First load fails: a full error state with **Try again**.
- A refresh you asked for fails (button or pull-down): the list stays and a toast offers a retry.
- A background poll fails: silent. With a 10 % failure rate, a toast every couple of minutes
  would be noise, and the next poll is 15 s away.

## "Only unreserved" doesn't make your row vanish

If the filter is on and you reserve something, a strictly applied filter would remove the row
under your finger, so you'd never see that it worked. Items you reserve stay visible until you
next change the filter. Items reserved by _other people_ still disappear (see _What I'm not
happy with_ in the [README](README.md#what-im-not-happy-with)).

## Sorting: Default, Price ↑ and Price ↓

Default is the list's own order, with new items last. Equal prices keep the default order, so
rows don't jump around.

## Where the API docs and `api.ts` disagree

The brief comes with API docs and a mock API (`src/api.ts`), and the two don't always match.
`api.ts` is left unchanged, so where it differs from the docs, one rule decides: **the docs win
for what the app sends, and `api.ts` wins for what the app reads.** The docs are the contract a
real backend would enforce. `api.ts` is what actually runs, so the app has to cope with whatever
it returns.

| Where            | API docs                                  | `api.ts`                                                             | Who wins and what the app does                                                                                                          |
| ---------------- | ----------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `url`            | Required on `AddItemInput` and `WishItem` | Optional (`url?`). Seed items 2–6 have none                          | **Docs** for adding: the form requires a link. **`api.ts`** for showing: a row without a link just hides "View item ↗".                 |
| `imageUrl`       | Not a field                               | Optional field, never set                                            | **Docs**: the app never sends it. A row would show the image if one ever came back, which costs nothing.                                |
| `getItems`       | Not documented                            | Loads the list, fails ~10% of calls                                  | **`api.ts`**: it's the only way to load the list. Its failures are treated like the documented `Error("Network error")`: safe to retry. |
| `id`             | UUID v4                                   | Seed items use `'1'`–`'6'`, new items get UUIDs                      | **`api.ts`**: ids are treated as opaque strings, never parsed or checked.                                                               |
| `id`, `currency` | Set by the service                        | `addItem` spreads the input last, so extra keys could overwrite them | **Docs**: validation builds a fresh `{ title, priceMinor, url }`, so nothing else is ever sent.                                         |
| `priceMinor`     | Øre                                       | Commented as "cent"                                                  | **Docs**: only the comment is wrong. Prices are øre everywhere.                                                                         |

**Where the brief and the API docs disagree.** The brief calls an item's link optional, but
the API docs make `url` required on both `AddItemInput` and `WishItem`. The add form follows the
API docs and requires a link, since the API is what a real backend would enforce. Items that come back without one (seed items 2–6 in
`api.ts`) are still shown, just without "View item ↗".

## Add-item validation

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
  `AddItemInput` and `WishItem`, so the form follows the API (see _Where the API docs and `api.ts`
  disagree_). A missing scheme gets `https://` ("shop.dk/lamp" works). Only
  http(s) is accepted, which also keeps `javascript:` links off the page. The host must be
  well-formed: parts made of letters, digits and hyphens, and a top-level domain of 2+ letters. Accented
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

## Prices are shown in Danish format

For example `449 kr.`, `1.299 kr.`, `449,50 kr.`

## Filter and sort reset on reload; the role doesn't

The mock API keeps its data in memory, so a reload resets the list itself too, and saving
filter and sort while the data resets would be odd. The role is different: being asked "Is this your wishlist?" after every reload would be
annoying, and the answer doesn't depend on the data. If storage fails, the app just asks again.

## Technical notes

These weren't ambiguities in the brief, but a reviewer might wonder about them.

- `api.ts` calls `crypto.randomUUID()`, which Hermes (iOS/Android) doesn't provide, and which
  browsers only provide on secure origins. `src/polyfills.ts` fills it in from `expo-crypto`
  without touching `api.ts`.
- Errors are matched by `instanceof` with a fallback on `error.name`. Babel-compiled subclasses of
  `Error` can fail `instanceof`, and the name is compared as a literal because minifiers rename
  classes.
- No Expo Router. The brief asks for a single page with no routing.
