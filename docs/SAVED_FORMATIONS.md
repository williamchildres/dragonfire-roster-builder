# Saved Formation Library

Dragonfire Lab 0.23.1 saves complete, duplicate-free three-dragon arrangements from Formation Builder and from each Roster Optimizer allocation mode. Current-roster records can reserve all three dragon identities for later use. The Saved Formations tab lives inside My Roster, and its array order is user-controlled semantic state.

## Versioned document

The library uses format `dragonfire-lab-saved-formations`, schema version `2`, and browser key `dragonfire-roster-lab:saved-formations`. It allows 50 records and names of 1–80 trimmed characters. Each record contains a UUID, name, exact Left Flank/Vanguard/Right Flank arrangement, evaluation mode, source, `reserved` boolean, save-time normalized progression for those three dragons, and creation/update timestamps.

Schema 1 remains readable locally, in imports, and in account rows. It normalizes deterministically to schema 2 with `reserved: false`; IDs, names, order, arrangements, progression snapshots, and timestamps are not rewritten. Migration alone does not create a semantic browser/account conflict because schema-1 and equivalent unreserved schema-2 records share the same normalized formation fingerprint. The next real write persists schema 2. Unsupported future versions remain rejected.

Names are not identifiers and need not be unique. Exact duplicates have the same evaluation mode and dragon in each exact position. Reordering the same trio is a different formation. A normal save surfaces an existing exact duplicate and offers Update Existing, Save Explicit Copy, or Cancel. The explicit Duplicate action always creates a new UUID and appends `— Copy` to a bounded name.

The library never stores Formation Rating, tier, Synergy, Placement, Estimated Power, Overall Score, relationship values, strengths, gaps, reliability summaries, optimizer rank, or optimizer hashes as authoritative data. Cards recalculate Formation Rating v3, current tier, reliability coverage, and Estimated Formation Power from current app mechanics whenever displayed.

## Evaluation and progression changes

`current-roster` mode uses current ownership, Star Rank, Dragon Level, active Habit Levels, reliability rules, Formation Rating v3, and Estimated Power v2. If a selected dragon becomes unowned or required progression is missing, the record remains intact, identifies the missing data, can still be opened, and does not fabricate Estimated Power.

`planning` mode reuses Formation Builder exactly: Star Rank 10, unlocked Habits at Level 5, and the Builder's existing Dragon Level convention. It never converts to current-roster mode merely because the dragons are owned.

The saved snapshot is comparison-only. Changes list the dragon, field, and before/after value. App-version or scoring changes do not create a progression badge. Mechanics can change the recalculated card while the progression status remains unchanged.

## CRUD, Builder, and optimizer behavior

Opening a saved record preserves all three positions, selects its evaluation mode, and establishes editing context. Update preserves UUID, `createdAt`, collection position, and reservation unless the confirmed update changes a reserved record to planning mode. Save as New and Duplicate always create unreserved records. Rename and reorder preserve reservation state. Delete releases all three identities because reservation belongs only to the record. Reservation controls remain available at the 50-record limit.

Optimizer Save Formation uses the exact displayed arrangement and current-roster progression without rerunning or mutating the result. The new record is always unreserved. Stale optimizer results cannot be saved. Saved-formation names, order, and UI state never enter candidates, solver/result hashes, scoring, Formation Rating, Estimated Power, or relationships.

## Reservation invariants

- Only `current-roster` records may be reserved; planning records explain why the control is unavailable.
- One reserved record reserves all three IDs in its exact arrangement, even if ownership or progression later becomes unavailable.
- A dragon can belong to at most one reserved formation. Enabling or editing a reservation checks every dragon against every other reserved record and fails without mutation, naming each dragon and the existing formation.
- Converting a reserved record to planning mode requires explicit confirmation and commits `reserved: false`.
- Unreserved formations may overlap freely. Reservation summaries distinguish unique reserved IDs, currently owned reserved dragons, and unavailable reserved dragons.

## Import, export, and synchronization

Export is separate from roster export and contains no user ID or email. Schema-1 exports import unreserved; schema-2 exports retain reservation state. Merge gives existing reservations precedence and requires an explicit Import unreserved, Skip, or Cancel decision for every imported reservation conflict. Replace presents internal conflicts in imported display order and requires conflicting later records to be converted to unreserved (or skipped) before commit. ID-remapped copies retain reservation only when conflict-free. Neither operation can commit overlapping reservations or exceed 50 records.

Signed-out libraries stay in that browser. Signed-in synchronization uses the existing `user_saved_formations` account document and a separate 750 ms serialized debounce. Schema-1 account rows load as unreserved schema 2 and upgrade on the next actual write. Malformed schema-2 reservation state or overlapping account reservations reject the account document without touching browser data. Browser-only, account-only, equal, migration, conflict, paused, offline, retry, in-flight write, sign-out, and account-switch paths do not alter roster synchronization. No new table, migration, RLS policy, ownership rule, or client credential is required.
