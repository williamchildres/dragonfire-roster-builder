# Changelog

## 0.9.3 - 2026-07-18

- Refined the public Overview into a compact two-column landscape hero, a responsive three-action feature grid, and a concise dataset-breadth status strip derived from canonical dragon, ability, and curated-profile data.
- Removed the completed rarity progress dashboard from the Overview and tightened the release/privacy panel spacing across desktop and mobile while preserving feature navigation, focus behavior, and normal mobile page flow.
- Increased database/package version to `0.9.3`; source data schema remains `13`, and local/cloud roster schemas remain `5`. Formation evaluation and its deterministic result hash are unchanged. No database or Supabase migration was added.

## 0.9.2 - 2026-07-18

- Restored normal document scrolling on narrow screens: the application header now scrolls away with the page, and Roster list and editor content no longer own nested vertical scrolling. Desktop two-pane scrolling is unchanged.
- Increased database/package version to `0.9.2`; source data schema remains `13`, and local/cloud roster schemas remain `5`. No Supabase migration or roster-contract change was added.

## 0.9.1 - 2026-07-17

- Corrected Habit Level tracking to derive unlocks from each canonical habit's Star Rank and Dragon Level requirements. Locked habits have no stored or editable level; newly unlocked habits begin at Level 1; valid levels are 1 through 5.
- Added authoritative roster reconciliation so combined progression updates preserve still-unlocked levels, remove relocked and unknown habit keys, reject locked direct assignments, and restart a re-unlocked habit at Level 1. Removing ownership alone continues to retain progression, notes, and valid unlocked Habit Levels.
- Advanced local and cloud roster JSON schemas to `5`. Local/import schemas 1 through 4 and cloud schema 4 remain readable. Legacy null, zero, or missing values become Level 1 only for unlocked habits; locked legacy values are discarded. New exports and cloud writes contain only unlocked canonical IDs with values 1 through 5.
- Updated the roster editor, detail cards, rows, conflict summaries, and progression filters to describe unlocked habits instead of recorded/unknown levels. Formation inputs, rating components, and the deterministic hash are unchanged.
- Increased database/package version to `0.9.1`; source data schema remains `13`. This JSON-contract migration requires no Supabase SQL migration.

## 0.9.0 - 2026-07-17

- Replaced repeated owned-dragon card forms with a compact, filterable list and one dedicated selected-dragon editor.
- Added deterministic name, rarity, Star Rank, and Dragon Level sorting plus canonical rarity/breed, progression-completeness, and notes filters.
- Added desktop two-pane roster management and a narrow-screen list/editor flow with Back-to-roster focus restoration and predictable add/remove selection.
- Added focused coverage for selection, filters, null-last sorting, Star Rank, Dragon Level, Habit Levels, notes, removal, and account-sync regressions.
- Confirmed production Google OAuth, password, recovery, magic-link, and Resend SMTP configuration remains external; no credentials are included.
- Increased database/package version to `0.9.0`; source data schema remains `13`, local and cloud roster schemas remain `4`, and import/export/share-link/rating contracts are unchanged. No Supabase migration was added.

## 0.8.0 - 2026-07-17

- Added Google OAuth as the primary account sign-in option through Supabase, with no Google credential or client ID in the frontend.
- Added email/password sign-in, account creation, password reset, recovery callback handling, and signed-in password setup/change.
- Retained email magic links as a tertiary sign-in fallback and preserved existing account roster ownership and synchronization behavior.
- Increased database/package version to `0.8.0`; source data schema remains `13`, local and cloud roster schemas remain `4`, and import/export/share-link/rating contracts are unchanged.

## 0.7.1 - 2026-07-17

- Corrected account dialog containment on narrow mobile viewports with dynamic viewport and safe-area handling, wrapped titles, and a fixed upper-right close button.
- Restyled the roster conflict comparison into readable mobile cards while retaining a semantic compact three-column desktop table.
- Added a forward-only Supabase privilege migration that revokes default table grants and restores authenticated SELECT, INSERT, and UPDATE only; browser DELETE remains unavailable.
- Increased database/package version to `0.7.1`; source data schema remains `13`, local roster schema remains `4`, and import/export/share-link/rating contracts are unchanged.

## 0.7.0 - 2026-07-17

- Added optional Supabase email magic-link authentication and one-row-per-user roster synchronization without requiring an account for local use.
- Added explicit first-sign-in migration and conflict decisions, immediate browser persistence, debounced serialized cloud writes, offline/error recovery, and stale-session response protection.
- Added account, sign-in, roster sync, import confirmation, and local-clear safety UI while keeping formations browser-local.
- Added the first Supabase migration with RLS ownership policies for authenticated SELECT, INSERT, and UPDATE; no anonymous or DELETE roster access is granted.
- Added GitHub Pages public-variable wiring, placeholder environment documentation, deterministic fake-service tests, and setup/security guidance.
- Increased database/package version to `0.7.0`; source data schema remains `13`, local roster schema remains `4`, and import/export/share-link/rating contracts are unchanged.

## 0.6.10 - 2026-07-17

- Established a wider responsive application shell with documented surface, spacing, typography, control, focus, and motion tokens.
- Refined Overview, Roster, Formation Builder, About, and footer presentation without changing dragon data, ratings, relationships, or roster persistence.
- Renamed visible navigation to Roster and Formations; updated player-facing terminology to Maxed Dragons, My Roster, Dragon Level, and View full rating breakdown.
- Improved keyboard-visible navigation state, chip wrapping, mobile control layouts, and clear destructive-action treatment.
- Increased database/package version to `0.6.10`; source data schema remains `13`, local roster schema remains `4`, and import/export/share-link contracts are unchanged.

## 0.6.9 - 2026-07-16

- Corrected semantic relationship aggregation so active paths retain only active ability evidence while equivalent active paths still collapse to one relationship with unchanged scoring.
- Made Dragon Details At a glance progression-aware, added scoped long-label wrapping, and added current 31/31 coverage copy to About.
- Increased database/package version to `0.6.9`; source data schema remains `13`, local roster schema remains `4`, and import/export/share-link contracts are unchanged.
- Added screenshot-verified detailed records and curated simple-synergy profiles for Rare dragons Vesper, Nyrena, and Dawnseeker. Coverage is now complete at 31 known dragons, 31 detailed dragons, 31 simple profiles, and 0 metadata-only dragons, with Rare coverage at 12 / 12.
- Added reusable adjacent-group recipient selection, support-only benefit presentation, and non-scoring defensive/Recovery Received signals. Slow is no longer a Control alias; Confusion remains specifically visible while satisfying Control once, and First-Strike remains outside Control.
- Increased database/package version to `0.6.8`; source data schema remains `13`, local roster schema remains `4`, and import/export/share-link contracts are unchanged.
- Added screenshot-verified detailed records and curated simple-synergy profiles for Rare dragons Bevlorin, Shadowrend, and Thunderstrike. Coverage is now 31 known dragons, 28 detailed dragons, 28 simple profiles, and 3 metadata-only dragons, with Rare coverage at 9 / 12.
- Added one generic Damage Dealt support channel, self-eligible highest-stat targeting, explicit rounds 7–10 support wording, and conservative unresolved two-of-three Advantage recipients. New cross-batch relationships connect Shadowrend Panic to Jagadrix and Thunderstrike Bleed to Arrax without status or Command-augmentation duplication.
- Increased database/package version to `0.6.7`; source data schema remains `13`, local roster schema remains `4`, and import/export/share-link contracts are unchanged.
- Added screenshot-verified detailed records and curated simple-synergy profiles for Rare dragons Solstryker, Shimmer, and Jagadrix. Coverage is now 31 known dragons, 25 detailed dragons, 25 simple profiles, and 6 metadata-only dragons, with Rare coverage at 6 / 12.
- Added deterministic highest-stat and flank-priority recipient selectors, Star-aware Command augmentation summaries, named Resistance provider/payoff presentation, Steady Erosion and Nullify Recovery details, and scoped non-Basic Physical support without changing Formation Rating calibration.
- Re-audited verified named Resistance providers and exposed Syrax Strategic Revival, Seasmoke Loyal Bond, and Rhysarion Inspiring Melody. Existing verified Panic providers remain Kalspire, Daemoros, and Zivern; no provider was invented.
- Increased database/package version to `0.6.6`; source data schema remains `13`, local roster schema remains `4`, and import/export/share-link contracts are unchanged.
- Added screenshot-verified detailed records and curated simple-synergy profiles for the first Rare batch: Antares, Arrax, and Arulix. Coverage is now 31 known dragons, 22 detailed dragons, 22 simple profiles, and 9 metadata-only dragons, with Rare coverage at 3 / 12.
- Added specific Weakened and Bleed simple tags while preserving Overwhelm and Stagger as distinct Control aliases. Defensive support, troop-gated Adaptive Guard, battlefield-only target conditions, and conditional Mimicry effects remain detailed and non-scoring.
- Increased database/package version to `0.6.5`; source data schema remains `13` and local roster schema remains `4`.
- Polished the responsive Overview and About layouts, updated explainable Formation Rating and Kit Utilization messaging, normalized Dragonfire Lab branding, clarified coverage and optional support presentation, and fixed the malformed support-button icon.
- Polished Formation Builder signal group styling to feel lighter and denser, renamed selected-card and selector `Benefits from` labels to `Synergy needs`, added a subtle chip-state legend, and compacted the action stack with shorter movement labels.
- Replaced the Formation Builder `Include unowned dragons` checkbox with an `All 10 Star Dragons` / `Roster Dragons` toggle, defaulted planning to all mapped dragons at Star 10, and kept Roster Dragons mode restricted to owned roster dragons with saved progression.
- Added Kit Utilization to Formation Rating so scores now compare realized synergy against mapped kit potential, surface unused support or missing Benefits as opportunities, and require stronger utilization for Excellent ratings.
- Tightened Formation Rating Support Usefulness scoring so matched support is capped by realized payoff and satisfied Benefits, direct damage stays in Damage Profile instead of generic support scoring, Excellent requires meaningful payoff guardrails, duplicate weakness/opportunity wording is reduced, and optional inactive Vanguard wording is softened.
- Recalibrated Formation Rating to prioritize realized active synergy paths, reduce over-penalty from optional Vanguard trait conflicts, de-duplicate strengths and weaknesses, and collapse repeated detailed analysis output below the rating.
- Added an explainable Formation Rating panel that scores mapped synergy signals, current progression, placement, and conflicts while clearly avoiding combat simulation.
- Added a Formation Builder Damage Profile section, refined Provides and Benefits from chip states to distinguish used/satisfied, available, missing, and inactive signals, collapsed full Command and Vanguard Trait wording by default, removed redundant selected-card chips, and audited formation tag display before scoring work.
- Cleaned Formation Builder selected-dragon cards by removing repeated curated-profile blocks and command unlock-noise rows, while showing Vanguard Traits only for the Vanguard slot.
- Added compact Provides and Benefits from signal chips to Formation Builder cards with active/inactive formation-context state.
- Replaced Formation Builder dragon dropdowns with a searchable Add/Change Dragon selector with rarity, breed, verification, Provides, and Benefits from filters.
- Added View details actions to Formation Builder cards and selector rows using the shared Dragon Details modal.
- Aligned public site metadata and docs with https://dragonfirelab.com.
- Added the GitHub Pages CNAME for `dragonfirelab.com`.
- Reviewed the Vite deployment base path for the custom domain and kept the existing relative asset base for root-domain Pages builds.
- Removed the Compare Verified Dragons hero card, replaced the separate rarity coverage cards with one combined segmented coverage bar, and kept the overview compact.
- Removed the redundant Overview hero heading, made the feature cards actionable, added Rare coverage context, and aligned the public footer branding with Dragonfire Lab.
- Updated the visible public brand to Dragonfire Lab, simplified the Overview hero around the three feature cards, and replaced the roster/role breakdown blocks with rarity coverage.
- Polished Dragon Details ability cards by renaming "What it does" to "Abilities", moving unlock requirements into compact header badges, removing redundant placement/evidence rows from public ability cards, and fixing at-a-glance chip stretching.
- Corrected Dragon Details so Benefits from reflects mapped incoming synergy signals such as Burn when profile data includes them.
- Preserved specific status labels such as Stagger in Dragon Details ability summaries and at-a-glance chips while retaining broad family rollups such as Control.
- Add Dragon success banner now names the added dragon, auto-dismisses after a few seconds, and clears immediately when leaving My Roster.
- Consolidated the standalone Dragon Database surface into My Roster, making My Roster the central local dragon-management page.
- Added a My Roster Add Dragon modal with catalog search, rarity/breed/verification filters, already-added handling, add-to-roster actions, and details access.
- Removed the Dragon Database top-nav/page surface and routed stale Dragon Database hashes back to My Roster while keeping Formation Builder share links intact.
- Preserved local roster import/export/clear behavior, saved Star Rank/Reign Level/Habit Level/notes data, and About/footer Buy Me a Coffee support links.
- Removed the lingering Data Status nav/page after the support-link polish, while preserving the optional Buy Me a Coffee support links and the existing local-first/privacy, verification, and roster behavior.
- Simplified the public verification labels on roster/catalog cards so community-verified dragons read as `Verified`, metadata-only dragons read as `Metadata Only`, and metadata-only cards show `Ability details not verified` without changing the underlying roster or dragon data.
- Removed the public source-detail chip noise from cards while preserving the existing ownership toggles, details access, Star Rank, Reign Level, import/export behavior, and internal evidence wording.
- Polished the roster/catalog cards into lighter player-facing cards, reduced repeated ownership/status rows, and kept ownership toggles, details access, Star Rank, Reign Level, and import/export behavior intact.
- Simplified roster ownership to a single Owned / Hatched state, removed public shard and collection-state controls, and preserved backward compatibility for existing saved/exported roster data.
- Increased local roster schema to `4`; source data schema remains `13`.
- Corrected the Dragon Details at-a-glance summary so multi-tag support signals like Tessarion's Initiative support stay visible, and updated the empty Benefits from wording to "No mapped incoming synergy yet."
- Polished the Dragon Details modal into a wider, more readable player-facing layout with an at-a-glance summary, clearer ability cards, and collapsed raw verified wording plus technical sections.
- Polished the Overview page into a public-release landing/dashboard with new hero artwork, clearer feature cards, grouped coverage summary cards, and a local-first trust note.
- Added screenshot-verified detailed records and a curated simple-synergy profile for Tessarion, bringing coverage to 31 dragons, 19 detailed dragons, 19 simple profiles, and 12 metadata-only dragons.
- Modeled Tessarion's Cobalt Flame Fire/Physical output, Blazing Leader Fire support, Clever Maneuver Intelligence/Initiative support, and Champion's Brilliance Vanguard claim; defensive, Advantage, Troop Capacity, and Panic self-condition clauses remain descriptive rather than standalone synergy tags.
- Increased database/package version to `0.6.4`; source data schema remains `13` and local roster schema remains `3`.
- Prioritized placement requirements before progression locks in the simple Formation Builder, so relationships that are both mispositioned and under-leveled appear as Placement issues before they can become Future unlocks.
- Separated emitted synergy output tags from inbound scaling support tags so damage and Recovery outputs no longer act as providers for their scaling stats.
- Added screenshot-verified detailed records and curated simple-synergy profiles for Tashix, Velar, and Zivern, bringing coverage to 18 detailed dragons, 18 simple profiles, and 12 metadata-only dragons.
- Added the `status:vulnerable` simple setup/payoff relationship so Shadowsong's Scorched Earth can improve Zivern's Cloak of Terror.
- Added the Mirage glossary entry and new evidence/manual-review records for the final three Epic metadata-only dragons.
- Added deterministic `npm run package:context` ZIP packaging with stale-file cleanup verification, forbidden legacy filename scanning, exact entry comparison, and the existing 2 MB context limit.
- Corrected project-context source provenance and packaging-test isolation so generated context records a committed source SHA and tests restore `project-context/` and `project-context.zip`.
- Increased database/package version to `0.6.3`; source data schema remains `13` and local roster schema remains `3`.
- Removed the legacy combat-analysis framework, including capability derivation, trace generation, formation card projection, unmet-requirement routing, the synergy report script, and generated expected-interaction/unresolved-mechanic context files.
- Simplified canonical abilities to descriptive source data: stable IDs, names, unlock metadata, hard position requirements, verification, evidence, tags, and raw verified wording.
- Replaced the Data Status capability matrix with current dragon/profile coverage.
- Rebuilt project-context export around the simple product contract and added a 2 MB validation limit.
- Kept local roster schema `3` unchanged; source data schema increased to `13`.

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

- Corrected Star Rank to 1-10 and added the initial independent Habit Level fields (superseded by the schema-5 unlock contract in 0.9.1).
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
