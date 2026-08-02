# Saved Formation Library

Dragonfire Lab 0.23.0 saves complete, duplicate-free three-dragon arrangements from Formation Builder and from each Roster Optimizer allocation mode. The Saved Formations tab lives inside My Roster. Its array order is user-controlled semantic state.

## Versioned document

The library uses format `dragonfire-lab-saved-formations`, schema version `1`, and browser key `dragonfire-roster-lab:saved-formations`. It allows 50 records and names of 1–80 trimmed characters. Each record contains a UUID, name, exact Left Flank/Vanguard/Right Flank arrangement, evaluation mode, source, save-time normalized progression for those three dragons, and creation/update timestamps.

Names are not identifiers and need not be unique. Exact duplicates have the same evaluation mode and dragon in each exact position. Reordering the same trio is a different formation. A normal save surfaces an existing exact duplicate and offers Update Existing, Save Explicit Copy, or Cancel. The explicit Duplicate action always creates a new UUID and appends `— Copy` to a bounded name.

The library never stores Formation Rating, tier, Synergy, Placement, Estimated Power, Overall Score, relationship values, strengths, gaps, reliability summaries, optimizer rank, or optimizer hashes as authoritative data. Cards recalculate Formation Rating v3, current tier, reliability coverage, and Estimated Formation Power from current app mechanics whenever displayed.

## Evaluation and progression changes

`current-roster` mode uses current ownership, Star Rank, Dragon Level, active Habit Levels, reliability rules, Formation Rating v3, and Estimated Power v2. If a selected dragon becomes unowned or required progression is missing, the record remains intact, identifies the missing data, can still be opened, and does not fabricate Estimated Power.

`planning` mode reuses Formation Builder exactly: Star Rank 10, unlocked Habits at Level 5, and the Builder's existing Dragon Level convention. It never converts to current-roster mode merely because the dragons are owned.

The saved snapshot is comparison-only. Changes list the dragon, field, and before/after value. App-version or scoring changes do not create a progression badge. Mechanics can change the recalculated card while the progression status remains unchanged.

## CRUD, Builder, and optimizer behavior

Opening a saved record preserves all three positions, selects its evaluation mode, and establishes editing context. Update preserves UUID, `createdAt`, and collection position while refreshing arrangement, name, progression snapshot, and `updatedAt`. Save as New creates a new UUID immediately after its source. Rename changes only name and `updatedAt`. Move Up/Down is the accessible authoritative reorder control. Delete confirmation names the record and affects no roster, Builder, optimizer, or same-trio record.

Optimizer Save Formation uses the exact displayed arrangement and current-roster progression without rerunning or mutating the result. Stale optimizer results cannot be saved. Saved data never enters an optimizer request, result, fingerprint, solution hash, or selection.

## Import, export, and synchronization

Export is separate from roster export and contains no user ID or email. Import validates the full contract and shows a summary before Merge or Replace. Merge retains existing order, appends additions, keeps identical ID/content once, gives differing ID collisions a new UUID, and requires a visible choice for exact arrangement duplicates. Replace offers a current-library backup first. Neither operation can exceed 50 records.

Signed-out libraries stay in that browser. Signed-in synchronization uses the separate `user_saved_formations` account document and a separate 750 ms serialized debounce. Browser-only, account-only, equal, migration, conflict, paused, offline, retry, in-flight write, sign-out, and account-switch paths do not alter roster synchronization. Differing documents are never merged or overwritten silently.

Saved formations do not yet reserve dragons and do not affect optimizer recommendations. Reservation and optimizer exclusion are planned separately.
