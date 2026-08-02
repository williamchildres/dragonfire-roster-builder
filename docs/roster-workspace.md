# Roster workspace

Dragonfire Lab 0.23.1 presents My Dragons and Saved Formations as accessible tabs inside My Roster. The authoritative roster and separate Saved Formation Library remain owned by `App.tsx`; workspace components receive current documents and explicit callbacks rather than creating cloud clients.

Roster Optimizer and Formation Builder My Roster mode share the same authoritative owned/hatched eligibility helper. Optimizer roster snapshots use stable dragon ID, rarity, Star Rank, and Dragon Level; notes, Habit Levels, filters, sorting, responsive mode, and selection never affect ranking. The separate request fingerprint also includes strategy, optimizer contract version, and Formation Rating contract. Power-Aware fingerprints additionally include Estimated Power version, model hash, and observation hash.

## Interaction model

- Desktop and comfortable landscape widths show a scrollable owned-dragon list beside a bounded sticky editor.
- Narrow widths start in list mode. Selecting or adding a dragon opens the same editor implementation; Back to roster returns focus to and scrolls the selected row into view.
- Selection is ephemeral. Sorting preserves it, filters preserve it while the row remains visible, and a hidden selection moves to the first visible result.
- Add Dragon sends a one-time, in-memory selection request. The workspace consumes each request once, selects the new dragon, opens its editor on narrow screens, focuses it safely, and acknowledges that exact request. Returning to Roster later starts in list mode rather than reopening a consumed selection. New entries default to Star Rank 1 and Dragon Level 1 (`reignLevel`).
- Add All Dragons derives missing IDs from the complete canonical collection, never from the current filters, sorting, visible rows, or optimizer candidates. It confirms the current missing count before committing one immutable roster snapshot. `All Dragons Added` is disabled when no canonical dragon is missing.
- Removing selects the next visible row, then the previous row, then the empty state.
- Star Rank, Dragon Level (`reignLevel` in stored JSON), named Habit Levels, and notes save immediately through the existing local snapshot and optional account-sync path.
- Estimated Power is derived read-only from rarity, Star Rank, and Dragon Level. It has no editor control or persistence field and does not participate in roster synchronization. Both Power-Aware allocation modes use it without adding any roster field.
- Habit controls appear only when every canonical `unlockStarRank` and `minimumDragonLevel` requirement is satisfied. An unlocked habit begins at Level 1 and can be set only to 1 through 5. A relocked habit disappears and its saved key is deleted; re-unlocking starts again at Level 1.
- Removing ownership does not change progression, notes, or valid unlocked Habit Levels. Re-adding the dragon restores those retained values unless progression itself crossed below an unlock threshold.
- The shared ownership transition preserves valid Star Rank, Dragon Level, notes, and Habit Levels on re-add; only absent or invalid Star Rank and Dragon Level receive the 1/1 defaults. Existing browser persistence and the single debounced account save path remain authoritative; a failed cloud save leaves the complete local snapshot available for the existing retry flow.

## Filters and sorting

Search trims surrounding whitespace and matches dragon names case-insensitively. Rarity options follow Legendary, Epic, and Rare. Breed options are derived from canonical dragon data.

`All progression recorded` means Star Rank and Dragon Level are non-null. Habit Levels do not participate because unlocked habits always have a deterministic value and locked habits have no level. `Missing progression` means Star Rank or Dragon Level is null. `Has notes` and `No notes` use trimmed notes content.

Sort options are Name A–Z, rarity (Legendary, Epic, Rare), Star Rank descending, and Dragon Level descending. Progression nulls sort last and ties resolve by dragon name. Filters, sorting, responsive mode, and selection are never written to local roster JSON, account data, exports, formations, or share links.

Adding a dragon preserves the current sort and every filter that already matches it. Only filters that would hide the new dragon are reset: a nonmatching search, rarity, breed, or details filter returns to its unfiltered value. Unrelated filter choices remain intact.

The editor always describes browser autosave. It mentions active account synchronization only for signed-in `syncing` or `synced` states. Signed-out visitors see browser-only wording; paused, offline, conflict, migration, loading, and error states defer to the synchronization status panel above.

## Preserved contracts

- source schema 13
- local and cloud roster schema 5, with schemas 1 through 4 readable locally/imported and schema 4 readable from cloud rows
- immediate browser persistence
- 750 ms serialized account-save debounce
- conflict, migration, offline, retry, sign-out retention, import, and clear-local behavior
- Saved Formation Library schema 2 remains separate from roster schema 5 and `user_rosters`; schema 1 remains readable and normalizes unreserved
- signed-out formations remain browser-local; signed-in sync uses the independent `user_saved_formations` document
- formation conflicts, writes, reservation fingerprints, imports, and reordering never affect roster synchronization
- no direct Supabase calls from roster UI components
- Estimated Power is runtime-only; local/cloud roster schema 5 remains unchanged, while Saved Formations add only their separate migration
