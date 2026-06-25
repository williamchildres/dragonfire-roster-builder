# Changelog

## 0.5.6 - 2026-06-24

- Polished Formation Builder card layout so desktop position cards use equal-width, equal-height columns without stretching blank space through the selector and movement-control area.
- Normalized card spacing, movement controls, Trait panels, affinity rows, empty sections, and the Formation Affinity Coverage strip for a more compact planner-column layout.
- Bounded expanded Receives and Provides content in scrollable section bodies while preserving `View N more`, `Show fewer`, overflow counts, relationship highlighting, and keyboard access.
- Replaced oversized interaction status bubbles with inline badges, added purpose-built compact summaries, per-item Details disclosure, same-ability presentation aggregation, and redundant blocked-Trait suppression while preserving full trace detail and Show analysis details.
- Added compact Command panels for selected dragons so each card describes the dragon's own Command without counting it as a formation synergy.
- Refined cross-dragon cards so Receives and Provides identify the source dragon, affected Command, and recipient-owned modifiers separately; Sentinel's Presence names Cleansing Wrath Fire Damage, Warden's Rally Recovery remains separate from Sheepstealer's Hunter's Cunning Recovery Received amplification, and Hunter's Cunning no longer appears as a Malachite-provided benefit.
- Updated Formation Builder presentation to use current roster Reign Level and progression data, preserve separate active/conditional/blocked/progression-unknown state evaluation, correct `View more`/`Show fewer` expanded behavior, and keep Warden's Rally, Cleansing Wrath, and Wild Hunt Command schedules and targets distinct.
- Increased database version to `0.5.6`; data schema remains `9`, local roster schema remains `3`, and context export version remains `1`.

## 0.5.5 - 2026-06-24

- Redesigned Formation Builder position cards to show dragon-specific Trait status, affinities, Receives, Provides, target-candidate state, preview state, and overflow controls.
- Added a pure card-presentation mapper over existing normal Formation Analysis traces without changing trace mechanics or game rules.
- Reworked the normal Formation Summary to remove raw effect tags and moved raw tags/coverage into technical analysis details.
- Added a compact team affinity strip, team-level interaction summary, relationship hover/focus highlighting, and focused presentation/report tests.
- Increased database version to `0.5.5`; data schema remains `9`, local roster schema remains `3`, and context export version remains `1`.

## 0.5.4 - 2026-06-24

- Replaced raw trace progression collection with a pure normal unmet-requirement summary for the current formation and preview mode.
- Enforced selected-dragon boundaries, preview isolation, formation isolation, semantic deduplication, visible-card blocker ownership, and hard-failure precedence for normal Unmet requirements.
- Grouped Trial by Flame normal presentation across selected recipients and threshold tiers without claiming cumulative stacking.
- Preserved different sibling stat values in grouped cards, including Reactive Instincts Instinct +36% and Initiative +18%.
- Kept full raw requirements in debug/export while suppressing normal UI duplicates.
- Increased database version to `0.5.4`; data schema remains `9`, local roster schema remains `3`, and context export version remains `1`.

## 0.5.3 - 2026-06-24

- Aggregated sibling direct stat effects in normal Formation Analysis cards while preserving child modifier capability IDs in debug output.
- Added defensive `damageScope` normalization for all, tactical, and fire Damage Received support.
- Corrected Trial by Flame troop-capacity thresholds to strict below conditions instead of target counts, with Level 5 ranked values available in max-rank preview.
- Normalized highest-stat and one-adjacent target selection for Reactive Instincts and Lightning Strike so one-target effects do not appear to buff multiple recipients simultaneously.
- Kept Champion's Brilliance inactive for observed Level 1 Seasmoke and surfaced the Level 16 requirement failure in Unmet requirements; max-rank Habit preview does not change Dragon Level.
- Added source-ability-specific normal text for Spreading Blaze and Rallying Flame.
- Attributed provider and recipient-output progression blockers with dragon and ability ownership.
- Classified interaction scope and excluded internal same-dragon interactions from cross-dragon normal sections while preserving them in debug/export.
- Increased database version to `0.5.3` and data schema to `9`; local roster schema remains `3` and context export version remains `1`.

## 0.5.2 - 2026-06-24

- Repaired Formation Analysis so trace generation starts inside the three selected formation dragons and rejects unselected friendly sources, recipients, matched outputs, status providers, stat providers, and recipient-side amplifiers.
- Added hard-requirement precedence so failed provider position, recipient position, adjacency, source-scope, targeting, and selected-formation requirements cannot become active or potential because progression is unknown or previewed.
- Added `damage-received` defensive ally support and `defensive-ally-support` traces, including Seasmoke Champion's Brilliance Right Flank Damage Received support.
- Deduplicated normal parent traces and displayed requirements, aggregated repeated ability outputs with effect context, grouped single-target recipient competition, and kept periodic damage as debug metadata instead of a second normal buff.
- Removed PvE-only Stolen Flock warnings from normal PvP formation summaries and changed empty debug sections to "None identified".
- Corrected Resistance glossary/source wording to verified Damage Received reduction while retaining narrower stacking, refresh, and final formula questions.
- Expanded generated formation review cases to twelve cases and regenerated project-context schema support for the defensive channel and trace kind.
- Increased database version to `0.5.2` and data schema to `8`; local roster schema remains `3`.

## 0.5.1 - 2026-06-24

- Reconciled Formation Builder normal analysis, debug traces, audit exports, and framework report data around the shared formation trace generator.
- Surfaced Syrax First-Strike support to Caraxes Infernal Burst and Caraxes Slow support to Syrax Strategic Revival with conditional/potential status.
- Added direct flank stat-support traces for Syrax Sentinel's Wit and Caraxes Hunter's Wrath, with separate stat-scaling child traces when verified output dependencies match.
- Moved Warden's Rally self-inclusion out of normal active synergies; it remains a confirmed debug targeting fact and evidence detail.
- Replaced the broad unavailable banner with a partial-analysis notice when structured traces exist but data is locked, chance-based, selection-dependent, or formula-limited.
- Deduplicated normal unresolved assumptions while preserving per-trace debug links.
- Increased database version to `0.5.1`; data schema remains `7` and local roster schema remains `3`.

## 0.5.0 - 2026-06-24

- Added screenshot-verified combat datasets for existing seeded dragons Syrax and Caraxes without changing the 30-dragon roster count.
- Added Syrax Blazing Fury, Sentinel's Wit, Mindful Synergy, Flight Mastery, Strategic Revival, Tactical Inferno, and Mother's Mercy.
- Added Caraxes Infernal Burst, Hunter's Wrath, Battle Dread, Dragon's Flair, Crippling Inferno, Mass Enfeeble, and Blood Wyrm.
- Recorded Syrax and Caraxes not-discovered account observations as noncanonical snapshots.
- Added status output capabilities, output dependencies, and periodic damage definitions for First-Strike, Slow, Burn, Resistance, and related mechanics.
- Added generic trace kinds for status-condition enablement, stat-scaling support, enemy mitigation reduction, and periodic damage amplification.
- Updated the synergy framework report to include Syrax/Caraxes review formations and unresolved assumptions.
- Increased database version to `0.5.0` and data schema to `7`; local roster schema remains `3`.

## 0.4.3 - 2026-06-24

- Added explicit `ModifierRole` classification for self amplification, ally support, recipient-side amplification, and enemy debuffs.
- Restricted outgoing cross-dragon amplification to `ally-support` modifiers only.
- Kept self modifiers such as Stolen Flock, Warrior's Zeal, Rallying Flame, and Wise Vigor visible in capability review while excluding them from teammate support traces.
- Added canonical, observed-account, and user-roster availability context to capabilities and report terminology.
- Revised the capability matrix to separate outputs, ally support, self amplification, and recipient-side amplification.
- Added integrity checks for capability references, evidence IDs, duplicate IDs, role/target compatibility, and tag-only derivation.
- Updated Dragon Details and debug traces with modifier role, target selector, self-only status, and availability context.
- Increased database version to `0.4.3` and data schema to `6`; local roster schema remains `3`.

## 0.4.2 - 2026-06-24

- Added a generic effect-capability framework for Physical Damage, Tactical Damage, Fire Damage, and Recovery.
- Added structured output capabilities, modifier capabilities, source-scope compatibility, and effect profiles for Malachite, Seasmoke, Sheepstealer, and Vermax.
- Migrated outgoing damage support and incoming Recovery amplification to reusable capability matching instead of dragon-specific pair logic.
- Added generic traces for Sheepstealer Physical support to Vermax, Malachite Fire support, Vermax Spreading Blaze Tactical support, and Malachite Recovery to Sheepstealer Recovery Received.
- Added a reviewable capability matrix in the app and a read-only `npm run report:synergy` framework report.
- Added Dragon Details effect-profile sections for Deals and Buffs capability badges.
- Documented source-scope matching, active versus future capabilities, trace aggregation, and remaining framework assumptions.
- Increased database version to `0.4.2` and data schema to `5`; local roster schema remains `3`.

## 0.4.1 - 2026-06-24

- Confirmed from combat logs that Vermax Warrior's Zeal increases Vermax Basic Attack Physical Damage.
- Normalized unqualified Damage Dealt modifiers to all qualifying sources unless wording explicitly restricts or excludes a source.
- Kept explicit exclusions such as Malachite Forest's Instinct excluding Basic Attacks.
- Confirmed Sheepstealer Wild Hunt prioritizes an eligible enemy that received Recovery during the previous round when selecting a new Prey.
- Added reusable Ally versus Other Ally caster-eligibility normalization while preserving spatial targeting constraints.
- Added recipient-amplification synergy traces for Recovery providers and Recovery Received modifiers.
- Added the confirmed Malachite Warden's Rally to Sheepstealer Hunter's Cunning Recovery interaction.
- Expanded the debug view with provider-effect, recipient-amplifier, and combat-log confirmation filters.
- Kept database schema `4` and local roster schema `3`.

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
