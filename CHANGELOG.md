# Changelog

## 0.4.0 - 2026-06-24

- Updated current screenshot evidence and observation records to game build `26.6.53509`.
- Added structured manual-review records for Malachite, Seasmoke, Sheepstealer, and Vermax.
- Confirmed the friendly formation adjacency graph: Left Flank and Right Flank are each adjacent to Vanguard, but not to each other.
- Normalized exact "3 Allies" friendly targeting as all three friendly dragons including the caster, supported by Malachite Warden's Rally combat-log observation.
- Added structured synergy traces for active, inactive, potential, blocked, unknown, and not-applicable interactions.
- Added a production Formation Builder debug view with trace details, manual-review state, raw wording, evidence IDs, assumptions, and unresolved questions.
- Added a debug-only 24-formation audit matrix for Malachite, Seasmoke, Sheepstealer, and Vermax with copy/download JSON export.
- Documented conservative threshold behavior, combat-log validation, and synergy-audit export usage.
- Kept local roster schema at `3`; no user data migration is required for this phase.

## 0.3.0 - 2026-06-23

- Added screenshot-verified combat datasets for Seasmoke, Sheepstealer, and Vermax.
- Added Sheepstealer and Vermax as in-game verified dragons pending official public roster pages.
- Increased the seeded roster to 30 known in-game dragons while keeping official-site counts separate.
- Added local roster schema 3 with collection state and shard progress migration.
- Expanded ability modeling with repeated attempts, repeat-per-match rules, command augmentations, stack configuration, condition history, target priority, conditional multipliers, status glossary records, and effect source scopes.
- Updated formation analysis with factual position requirements and conditional interactions for Malachite, Seasmoke, Sheepstealer, and Vermax without producing unsupported numerical scores.
- Updated the official roster checker to ignore pending in-game dragons during official-site comparisons and report counts separately.
- Added tests for the new combat data, pending roster-source status, observations, collection migration, formation interactions, and roster checker behavior.

## 0.2.0 - 2026-06-23

- Corrected Star Rank to 1-10 and added independent Habit Levels 0-5.
- Added localStorage schema 2 migration that preserves existing roster fields and legacy team selections.
- Replaced the three-slot Team Builder with a Left Flank, Vanguard, Right Flank Formation Builder.
- Added multi-schedule ability modeling for Commands, Traits, and Habits.
- Added partially screenshot-verified Malachite data, including Warden's Rally, Sentinel's Presence, five Habits, troop affinities, and unresolved mechanics.
- Added canonical stat definitions, an account-specific Malachite observation snapshot, and separate troop matchup rules.
- Expanded tests for migration, formation sharing, Malachite schedules, Habit progressions, observations, and matchup separation.

## 0.1.0 - 2026-06-23

- Created the first production-quality static React application.
- Added 28 official-metadata-only dragon records.
- Added roster tracking, import/export, team sharing, data-status views, and synergy engine tests.
- Added GitHub Actions CI and GitHub Pages deployment workflows.
