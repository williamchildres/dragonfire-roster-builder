# Changelog

## 0.23.3 - 2026-08-02

- Corrected Syrax's Blazing Fury so its shared effects target only one eligible ally and unresolved Fire-priority ties no longer grant duplicate synergy credit.
- Added the `capability-priority-one` recipient selector, shared selection-group identity, current-progression Fire-output qualification, fallback resolution, and structured resolved/unresolved targeting evidence.
- Preserved the verified shared 20% activation without inventing target probabilities, position priority, stat priority, or forced Caraxes/Syrax pairing preferences.
- Re-ran Formation Rating v3 and optimizer-v6 artifacts plus William's private current-roster Optimizer Sensitivity Pass v1. No optimizer weight, objective, comparator, power model, reservation rule, Saved Formation schema, or troop-affinity contract changed.
- Existing saved formations remain valid; displayed ratings may recalculate from the corrected relationship mapping. Historical Formation Rating v2 now loads an immutable 33-profile/239-signal snapshot captured from `2832d64c75621ce2fcf57385d716df2f2de52aab` (`sha256:68343cd6bfa67e10f616cf8c3ee109f0d19026058cbf6ffb53776aa6cb758719`) rather than deriving a compatibility view from current profiles.
- Locked optimizer-v6 comparison drift to an exact 50-entry approved-delta manifest for the Blazing Fury correction (`sha256:7630e354700b908f4e3c86379552a2c13b9e6d1034a0fdaa011772cd4eaff69a`). Missing, unexpected, duplicated, or differently changed historical executions now fail the audit.

## 0.23.2 - 2026-08-01

- Added My Roster sorting by current Estimated Power from highest to lowest. Each owned-dragon row now shows its formatted estimate and support-aware confidence; incomplete Star Rank or Dragon Level remains visibly unavailable and sorts after every calculable dragon.
- Added deterministic, explainable troop-affinity recommendations for complete three-dragon formations. Guidance identifies every tied troop type plus each positive, neutral, negative, and unknown dragon; the displayed +20% applies per positively aligned dragon and is never aggregated into formation power.
- Added current derived affinity guidance to Formation Builder, Saved Formations, every optimizer result, and individual dragon details. Enemy troop advantage remains a separate battle choice, and recommended Siege is labeled as objective-specific for Durability and siege damage rather than a general-combat default.
- Added the independent `troop-affinity-recommendation-v1` audit contract and readable report. Recommendations use current canonical dragon affinity data and are never persisted, scored, or included in Saved Formation or optimizer hashes.
- Preserved Formation Rating v3, Estimated Power v2, reliability, historical optimizer-v5, optimizer-v6, Saved Formation schemas 1 and 2, reservations, synchronization, the 60/40 Best Overall formula, and every protected identity. No Supabase migration was added.

## 0.23.1 - 2026-08-01

- Added whole-formation reservations for current-roster Saved Formations. A reserved record owns all three exact dragon identities, overlapping reservations are blocked with formation-specific conflict actions, and planning formations cannot reserve roster dragons.
- Advanced the Saved Formation Library to schema 2 with deterministic `reserved` state across browser storage, JSON import/export, semantic fingerprints, conflict detection, and account synchronization. Schema-1 browser and account documents normalize in memory to unreserved schema 2 without changing IDs, order, snapshots, or timestamps; the historical schema-1 audit remains unchanged.
- Added an Exclude reserved dragons optimizer preference that defaults on when reservations exist, remains in memory for the app session, and can be temporarily disabled without changing the Saved Formation Library. A deterministic immutable eligibility projection removes only currently owned reserved dragons before the unchanged optimizer-v6 request is built.
- Added live reserved/eligible/maximum-army summaries, deterministic formation-count clamping, fewer-than-three recovery actions, stale-result context identity, and per-run reserved/excluded detail. Excluded dragons never appear as ordinary unused eligible dragons.
- Preserved optimizer-v6 scoring, candidate evaluation, allocation comparators, solution/result hashes for no-exclusion runs, Formation Rating v3, reliability, and Estimated Power. No Supabase table, migration, policy, ownership, or authentication behavior changed.

## 0.23.0 - 2026-08-01

- Added the Saved Formation Library: save exact three-position arrangements from Formation Builder or any current Roster Optimizer mode, then reopen, rename, update, copy, duplicate, reorder, delete, export, or import them from My Roster.
- Saved records persist only durable definitions and save-time progression snapshots. Formation Rating v3, tier, reliability, and Estimated Power are recalculated from current mechanics and progression; exact progression changes or unavailable current-roster data remain visible without rewriting the saved arrangement.
- Added a separate schema-1 browser document at `dragonfire-roster-lab:saved-formations`, strict record-isolating validation, a 50-record and 80-character-name limit, deterministic serialization, UUID IDs with a safe fallback, and explicit duplicate/import decisions.
- Added independent account synchronization and the RLS-protected `user_saved_formations` Supabase migration. Browser/account conflicts never merge or overwrite silently and remain independent from roster synchronization; production migration application and authenticated acceptance are release blockers until separately verified.
- Preserved Formation Rating v3, reliability, Estimated Power, historical optimizer-v5, and optimizer-v6 semantic identities. Saved formations do not reserve dragons or affect optimizer requests, results, selections, fingerprints, or hashes.

## 0.22.1 - 2026-07-29

- Added Best Overall First as the default optimizer mode, using an exact step-relative planning index with 60% progression-aware Estimated Power and 40% Formation Rating v3.
- Renamed the preserved modes to Highest Raw Power First and Balance Raw Power Across Armies so their standalone-power objectives are explicit.
- Advanced the live Worker contract to v6, added exact per-army score evidence, and added a 198-execution independent optimizer-v6 audit plus a privacy-minimized 33-dragon comparison fixture.
- Clarified that Best Overall scores are relative to each army’s remaining candidate pool, labeled the two greedy modes as exact sequential results, and reserved exact optimal result for the jointly solved Balanced mode.

## 0.22.0 - 2026-07-29

- Replaced the three public fixed ten-formation strategies with one progression-aware Power-Aware optimizer and two allocation modes: Strongest Armies First and Balance All Armies.
- Added a dynamic 1–11 army control limited by the owned eligible roster, including exact insufficient-roster messaging, roster-change clamping, stale-result invalidation, and unchanged roster persistence schemas.
- Advanced the Worker request/result contract to v5 with explicit allocation mode and formation count. Every request uses Estimated Power v2, Formation Rating v3, current Star Rank, Dragon Level, active Habit Levels, fixed-point relationship values, and deterministic exact arrangements.
- Added exact sequential strongest-first selection and exact lexicographic max-min balanced power and rating vectors with zero-gap HiGHS phases and deterministic optimal-face reconstruction.
- Preserved the historical v0.21 audit artifacts and protected Formation Rating, reliability, research, historical v2, and Estimated Power identities. This optimizer does not simulate combat or guarantee a real-game outcome.

## 0.21.0 - 2026-07-28

- Adopted Formation Rating v3 across the live Formation Builder and all three exact Roster Optimizer strategies. Documented activation reliability now weights supported relationships; unresolved potential remains visible without entering the numeric score.
- Added separate calibrated v3 tiers, reliability-aware relationship and placement detail, actual saved Habit progression in production analysis, and explicit Level 5 Habit assumptions in all-dragons planning mode.
- Bumped the optimizer contract to 4 with `formation-rating-v3`, exact audited fixed-point relationship objectives, Habit-sensitive request identity, and an 18-execution forward/reverse adoption audit.
- Preserved Formation Rating v2 as a historical regression baseline, Estimated Power v2, source schema 13, roster schemas 5, persistence, synchronization, routes, sharing, and Supabase migrations.

## 0.20.3 - 2026-07-23

- Added a visible Formation Builder notice explaining that Formation Rating currently measures ability compatibility and placement without weighting relationships by activation chance, number of rolls, duration, target count, or exact effect magnitude.
- Preserved all Formation Rating, Estimated Power, optimizer, roster, persistence, account synchronization, route, and schema behavior.

## 0.20.2 - 2026-07-22

- Changed the footer Support options action to open a focused support dialog with Buy Me a Coffee and PayPal choices instead of navigating users to the top of the About page.
- Preserved the About support section, feedback email link, routes, roster, formations, optimizer, scoring, account synchronization, and schemas.

## 0.20.1 - 2026-07-22

- Added PayPal as a second optional support method alongside Buy Me a Coffee, using PayPal's hosted Dragonfire Lab payment page without embedding payment processing or credentials in the application.
- Added support@dragonfirelab.com feedback and support links to About and the site footer, while keeping support optional, non-charitable, and separate from the app's local roster and account-sync behavior.
- Preserved all routing, roster, formation, optimizer, Estimated Power, Formation Rating, schema, persistence, and Supabase behavior.

## 0.20.0 - 2026-07-22

- Simplified Overview into a compact copy-first introduction, exactly three linked workflow cards, the existing dynamic dataset breadth strip, and a Recent Update panel backed directly by this CHANGELOG. Removed the hero artwork and deferred any replacement background or artwork to a future release.
- Added the complete public Updates history and expanded About into the methodology and trust page for reviewed data, Formation Rating v2, Estimated Power v2, the exact optimizer, reproducibility, privacy, community contributions, and support. Reduced interior page-heading scale without changing result layouts.
- Added clean canonical History API routes, real navigation links, route metadata, Back/Forward support, legacy hash migrations, canonical `/formations#formation=...` sharing, and a Vite-built GitHub Pages `404.html` SPA fallback with root-relative assets.
- Preserved Formation Rating, Estimated Power, optimizer objectives and certification, source schema 13, local/cloud roster schemas 5, optimizer contract 3, Supabase migrations, roster/account persistence, Habit Levels, and every audited semantic hash.

## 0.19.1 - 2026-07-22

- Fixed a release-blocking Power-Aware optimizer failure exposed by a real 33-dragon progression roster during exact stable-key refinement. HiGHS returned an optimal integral assignment but a contaminated fractional aggregate objective.
- Fixed every scalar, rating-histogram, and stable-key phase from exact safe-integer reconstruction of strictly validated Boolean and integer variable values. Materially fractional assignments remain errors; the integrality tolerance is a strict `1e-7` and was not widened.
- Certified materially contaminated reconstructed phase values with a fresh zero-objective feasibility probe that replays every prior exact phase and attempts a one-integer improvement. The live Backup stable chunk value `0` is fixed only after the `>= 1` probe proves infeasible.
- Added a sanitized progression-only regression fixture, forward/reversed deterministic audits, exact fixed-phase revalidation, and focused contaminated-objective/fractional-assignment coverage. Zero-gap solving, stable-key ordering, objective hierarchy, scoring, Estimated Power, dragon data, persistence, and schemas are unchanged.

## 0.19.0 - 2026-07-22

- Added Sunfyre and Tairax as fully curated, screenshot-verified canonical dragons with complete identity, affinity, Command, Trait, five-Habit, unlock, progression, evidence, and manual-review records.
- Expanded the canonical roster to 33 dragons, 231 abilities, 33 simple-synergy profiles, 239 scoring signals, and 231 explicit ability dispositions. Sunfyre contributes conditional Tactical/Fire/Burn output and Left Flank support; Tairax contributes Fire/Burn/Control paths, Control and Burn payoffs, and Right Flank support.
- Expanded full-roster validation to 32,736 ordered placements and optimizer candidate generation to 5,456 unordered trios. Added current 33-dragon legacy and PowerAware audits while preserving archived 31-dragon allocation and semantic solution hashes.
- Kept source schema 13, local/cloud roster schemas 5, optimizer contract 3, Formation Rating v2 logic, Estimated Power v2 identities, persistence, Habit Level behavior, and Supabase migrations unchanged.

## 0.18.0 - 2026-07-22

- Made `Power-Aware 5 + Backup 5` the new Optimizer default. Rarity-Priority 5 + Backup 5 and Best 10 Overall remain available without changes to their strategies or algorithms.
- Retained the last successfully completed optimal Optimizer result and selected strategy while navigating between application sections. Progression, ownership, and strategy changes retain the result with the existing stale-result warning; a successful rerun replaces it.
- Navigation or cancellation during an active run now invalidates that run and disposes its worker lifecycle without retaining partial or late responses. Failed and unavailable runs preserve the prior completed result.
- Optimizer workspace state is in-memory for the mounted app session only: no browser storage, cloud storage, export, roster schema, or database contract was added. Optimizer contract 3, Formation Rating v2, Estimated Power v2, source schema 13, and local/cloud roster schemas 5 are unchanged.

## 0.17.0 - 2026-07-22

- Expanded Estimated Power from 31 to 59 provenance observations and from 25 to 42 unique progression tuples, preserving duplicate provenance/sample counts, normalizing Sunfyre, and recording Dawnseeker at Star 4 Level 29 Power 13000.
- Replaced v1's linear fit with frozen rarity-specific additive Star and Level curves. The support-graph audit proves exact additive consistency, preserves observed plateaus and nonuniform increments, and explicitly documents the disconnected Epic Star 1 component and inferred +1600 bridge.
- Added support-aware confidence, piecewise-linear interpolation, conservative positive-slope extrapolation, full Level 0-1000 monotonicity/rarity-order validation, historical v1 holdouts, v2 cross-validation, transition-delta metrics, new observation/model/grid identities, and preserved v1 audit artifacts.
- Updated Power-Aware fingerprints and forward-only mixed, maxed, and all-one comparisons. Optimizer objectives, cutoff and Backup phases, MILP constraints, stable keys, zero-gap behavior, strategy/default values, contract 3, Formation Rating v2, canonical data, schemas, persistence, Supabase migrations, and Habit Level behavior are unchanged.

## 0.16.0 - 2026-07-22

- Added the experimental Power-Aware 5 + Backup 5 strategy. Estimated Power chooses the maximum-power 15-dragon Primary pool, then unchanged Formation Rating v2 organizes that pool; rarity and confidence remain diagnostics only.
- Fixed Primary Power exactly with individual-dragon 15th-place cutoff constraints, including all above-cutoff dragons, no below-cutoff dragons, and the exact required number tied at the cutoff. Backup Estimated Power is then maximized in integer units only after all Primary numeric quality objectives are fixed.
- Added one-estimate-per-eligible-dragon request caching, Power-Aware result summaries/fingerprints, per-formation and per-dragon Power diagnostics, low-confidence warnings, reduced HiGHS/oracle parity fixtures, and three separate forward-only full-size audit artifacts.
- Bumped the optimizer contract to 3 while preserving the two legacy allocations and semantic solution hashes. Stable-key functions, Formation Rating v2, Estimated Power v1 formula/observations, canonical data, source schema 13, local/cloud roster schemas 5, Supabase migrations, and Habit Level behavior are unchanged.

## 0.15.0 - 2026-07-21

- Added Estimated Dragon Power v1 as a deterministic, positive, monotone runtime diagnostic fitted from 31 empirical samples covering 25 unique rarity/Star Rank/Dragon Level combinations. Exact observed combinations retain their displayed values; modeled values are rounded to the nearest 10.
- Added model and observation identities, observed/modeled/low confidence classification, bounded leave-one-combination-out validation, supported-grid monotonicity and rarity-order checks, and committed Markdown/JSON audit artifacts.
- Added read-only Estimated Power to My Roster and Estimated Formation Power to Formation Builder. The diagnostic is explicitly empirical and unofficial, uses only rarity, Star Rank, and Dragon Level, and is not persisted or manually editable.
- Preserved both optimizer strategies byte-for-byte from 0.14.0, including optimizer contract 2, exact MILP phase order, stable keys, semantic hashes, worker contracts, and the existing two-strategy audit. Formation Rating v2, source schema 13, local/cloud roster schemas 5, canonical dragon count 31, and Supabase migrations are unchanged.

## 0.14.0 - 2026-07-21

- Added the My Roster **Add All Dragons** action. It derives missing dragons from the complete canonical collection, so filters, sort order, visible cards, and future dragon additions never limit the bulk result.
- Added one shared ownership-transition helper for individual and bulk additions. New entries begin owned at Star Rank 1 and Dragon Level 1 (`reignLevel`); valid retained progression, notes, and normalized Habit Levels are preserved when a removed dragon is re-added.
- Added an accessible confirmation dialog with the live canonical missing count, singular/plural copy, Cancel, focus return, Escape, and completed `All Dragons Added` state. Bulk addition performs one immutable roster snapshot update, one browser persistence pass, and one debounced account upsert when cloud sync is active.
- Source schema remains `13`; local and cloud roster schemas remain `5`; dragon data, Formation Rating v2, optimizer contracts, and Supabase migrations are unchanged.

## 0.13.0 - 2026-07-21

- Added a default Strongest 5 + Backup 5 strategy that reflects the five-formation activation limit, explicitly separates five Primary and five Backup formations, and never repeats a dragon across waves.
- Added an exact joint two-wave HiGHS MILP. Primary Legendary and Epic inclusion and every Primary quality objective outrank Backup; tied Primary allocations use the strongest achievable Backup before deterministic stable keys.
- Preserved Best 10 Overall as an explicit strategy with the v0.12.0 candidate generation, objective order, selected maxed/mixed allocations, totals, unused Arulix result, and semantic solution hashes unchanged.
- Bumped the optimizer result contract to 2, added strategy-aware worker requests and fingerprints, retained cancellation/stale-response guarantees, and separated stable solution hashes from v2 result hashes.
- Added an accessible strategy selector, wave summaries and badges, responsive Primary/Backup cards, combined diagnostics, strategy-specific methodology, and exact Formation Builder handoff from either wave.
- Added production-MILP, independent exact oracle, and brute-force coverage for rarity hierarchy, Primary-before-Backup priority, complete wave comparators, reversed ordering, cancellation, the 400/350 versus 399/500 regression, and the mandatory tied-Primary/better-Backup counterexample.
- Formation Rating v2 remains `12ee9dc58012cd4edd14ea3d095da32e2db6bf5cca6a1f8d77c24be8506eded9`. Source schema remains `13`, local/cloud roster schemas remain `5`, all 31 dragons and 224 curated signals are unchanged, Habit Level storage is unchanged, and no Supabase migration was added.

## 0.12.0 - 2026-07-21

- Added Roster Optimizer v1, which selects exactly 10 pairwise-disjoint three-dragon formations from the current eligible My Roster pool and clearly identifies unused eligible dragons.
- Added strict lexicographic rarity inclusion (Legendary, then Epic, then Rare), followed by total rating, weakest-formation, full rating-vector, relationship-value, relationship-count, and stable canonical tie-breaks.
- Added unique-trio candidate generation that evaluates all six placements through the existing semantic relationship, Formation Rating v2, recommendation, and finding services; retained best placements always calculate 20/20 Placement Effectiveness.
- Added an exact browser-worker MILP pipeline backed by HiGHS WebAssembly. Every lexicographic phase must return proven optimal status; cancellation terminates the worker and no timeout or heuristic incumbent is labeled optimal.
- Added ranking fingerprints, stale-result handling, accessible running/cancellation/failure states, ten responsive result cards, technical diagnostics, neutral unused-dragon presentation, and exact My Roster Formation Builder handoff.
- Added independent branch-and-bound/brute-force exactness tests, the mandatory greedy counterexample (101 greedy vs 120 exact), deterministic maxed and mixed-progression audits, and optimizer result hashes.
- Configured every production MILP phase with zero relative and absolute MIP gaps through a checked HiGHS WASM option adapter, with adversarial histogram, stable-key, relationship, reversed-order, and randomized oracle-parity tests.
- Kept the 0.12.0 full-roster audit summary while moving the duplicate complete JSON trace to an explicit ignored diagnostic workflow.
- Formation Rating v2 remains unchanged at `12ee9dc58012cd4edd14ea3d095da32e2db6bf5cca6a1f8d77c24be8506eded9`. Source schema remains `13`, local/cloud roster schemas remain `5`, all 31 dragons and 224 curated signals are unchanged, and no Supabase migration was added.

## 0.11.0 - 2026-07-18

- Replaced the public Formation Rating contract with Active Synergy (80) and Placement Effectiveness (20). Active relationships now score once through canonical provider → semantic tag → beneficiary edges, with fixed class values, class caps, participation bonuses, and deterministic provider redundancy.
- Added an exact six-permutation comparison for every complete selected trio. A placement improvement is meaningful only when it reaches both +5 relationship value and a 10% relative gain; otherwise Placement Effectiveness remains 20. Meaningful placement losses use the current/best relationship-value ratio, and recommendations describe gained and lost edges while ties and trivial gains are suppressed.
- Removed ordinary Vanguard competition, inactive alternative Traits, future unlocks, and blocked alternatives from scoring penalties. Kit gaps remain typed, prioritized diagnostics rather than duplicate deductions.
- Consolidated Formation Analysis into one accessible card with one rating, one verdict, one best-next-move statement, key strengths/gaps, the two-category breakdown, canonical relationship trace, and neutral/future details.
- Recalibrated tiers from the complete 26,970-formation distribution: Excellent 80, Strong 67, Solid 49, Developing 25, and Weak below 25; Incomplete is a validation gate. The deterministic public hash intentionally changed.
- Database/package version is `0.11.0`; source data schema remains `13`, local/cloud roster schemas remain `5`, dragon data and all 224 curated signals are unchanged, and no Supabase migration was added.

## 0.10.5 - 2026-07-18

- Completed the current controller-reviewed screenshot-source fidelity pass for all 31 dragons by updating Daemoros, Feskar, Rhysarion, Shadowsong, Vaeldra, and Vermax canonical ability descriptions with source values, Habit Level 1-5 progressions, targeting, durations, scaling, mitigation, and explicit uncertainty.
- Applied only the source-backed canonical tag corrections for Feskar Calculated Assault, Rhysarion Ebbing Fury, Shadowsong Blazing Onslaught, Vaeldra Tempting Distraction, Vermax Trial by Flame, and Vermax Spreading Blaze.
- Curated profiles, the 224 curated signals, evaluator behavior, and Formation Rating output are unchanged. Database/package version is `0.10.5`; source data schema remains `13`, local/cloud roster schemas remain `5`, and no Supabase migration was added.

## 0.10.4 - 2026-07-18

- Completed controller-reviewed screenshot-source fidelity for all 21 Malachite, Venator, and Sheepstealer canonical ability descriptions, including Habit Level 1–5 values, targeting, durations, status definitions, scaling, mitigation, and stated source uncertainty.
- Applied five source-backed ability-tag corrections only: Malachite Thunderous Roar `ADVANTAGE`; Venator Feral Precision `DOUBLE_STRIKE`; Venator Armor Break `PHYSICAL_DAMAGE_RECEIVED_UP`; Sheepstealer Hunter's Cunning removal of unsupported `FIRE_DAMAGE_UP`; and Sheepstealer Baited Kill `CLEANSE_NEGATIVE`.
- Curated profiles, curated signal count, evaluator behavior, and Formation Rating output are unchanged. Database/package version is `0.10.4`; source data schema remains `13`, local/cloud roster schemas remain `5`, and no Supabase migration was added.

## 0.10.3 - 2026-07-18

- Completed controller-reviewed screenshot-source fidelity for all 21 Seasmoke, Crimson, and Kalspire canonical ability descriptions, including meaningful values, Habit Level 1–5 progressions, targeting, durations, status definitions, scaling, mitigation, and explicit visible source discrepancies.
- Corrected Strength scaling on the existing `seasmoke-infectious-wrath-physical` and `kalspire-tactical-strike-bleed` signals without adding signals or changing Crimson's curated profile. Seasmoke's correction changes 564 of 26,970 numerical Formation Ratings and 59 tiers (score deltas -6 to +8), while Kalspire's correction enriches existing deduplicated Strength-relationship evidence without changing numerical ratings.
- Advanced the deterministic full-roster hash from `b8e09b1ea60476aa9ea368636a936cc09534b67ea0f294ed3589cf583e845c41` to `ca8d09e060d7b28faa44115f65d2cfe52b1cce2ecc1a9a5fc9439714e22afc48`; the top 50 changes, no relationship is lost, and the rating formula and calibration remain unchanged.
- Increased database/package version to `0.10.3`; source data schema remains `13`, local/cloud roster schemas remain `5`, and no Supabase migration was added.

## 0.10.2 - 2026-07-18

- Completed controller-reviewed screenshot-source fidelity for all Syrax, Vhagar, and Caraxes canonical ability descriptions, including meaningful values, Habit Level 1–5 progressions, status definitions, scaling, mitigation, and explicit prose/table discrepancies.
- Corrected Syrax Strategic Revival Recovery from Intelligence-enhanced to Initiative-enhanced in both canonical source text and its existing curated signal. This intentionally changes only relationships traceable to that corrected scaling tag and may change deterministic Formation Ratings.
- Increased database/package version to `0.10.2`; source data schema remains `13`, local/cloud roster schemas remain `5`, and no Supabase migration was added.

## 0.10.1 - 2026-07-18

- Completed all canonical dragon affinity maps from the controller-confirmed main-screen screenshots. Visible favorable and unfavorable icons are recorded as positive and negative; unlisted troop types are neutral.
- Corrected Dawnseeker, Nyrena, and Vesper Trait unlocks to Star Rank 1, removed Venator Armor Break's unsupported same-lane interpretation, and corrected Vermax Unyielding Resolve's Weakened transcription.
- Increased database/package version to `0.10.1`; source data schema remains `13`, local/cloud roster schemas remain `5`, and no Supabase migration was added. Formation evaluation and rating calibration are unchanged.

## 0.10.0 - 2026-07-18

- Completed the 12 formerly all-unknown Rare-dragon affinity records from controller-provided in-game transcription. Unlisted troop types are recorded as neutral.
- Increased database/package version to `0.10.0`; source data schema remains `13`, local/cloud roster schemas remain `5`, and no Supabase migration was added. Formation evaluation, profiles, and rating calibration are unchanged.

## 0.9.9 - 2026-07-18

- Removed the redundant visible Selected marker from roster rows while preserving selected-row highlighting, accessible semantics, keyboard focus, filtering, sorting, and mobile navigation.
- Increased database/package version to `0.9.9`; source data schema remains `13`, and local/cloud roster schemas remain `5`. Roster data, synchronization, formation evaluation, canonical data, and Supabase migrations are unchanged.

## 0.9.8 - 2026-07-18

- Moved ordinary roster synchronization feedback into the persistent account action. Header account names now show only a capped email local part, while full email and status remain available in the accessible label and Account dialog.
- Removed healthy roster-page synchronization rows while retaining prominent migration, conflict, paused, offline, and error panels with their existing Resolve and Retry actions.
- Increased database/package version to `0.9.8`; source data schema remains `13`, and local/cloud roster schemas remain `5`. Authentication, cloud synchronization, roster serialization, formation evaluation, canonical data, and Supabase migrations are unchanged.

## 0.9.7 - 2026-07-18

- Compacted the My Roster introduction, healthy synchronization states, count/actions, and filtering controls so the owned-dragon list begins higher while attention-required sync states remain prominent.
- Standardized full-width roster rows with compact progression summaries, moved Dragon details into the editor header, and now shows every canonical Habit with accurate locked requirements while preserving the existing Habit Level reconciliation contract.
- Increased database/package version to `0.9.7`; source data schema remains `13`, and local/cloud roster schemas remain `5`. Canonical data, formation evaluation, roster serialization, cloud synchronization, and Supabase migrations are unchanged.

## 0.9.6 - 2026-07-18

- Kept selected-dragon Star Rank beside each dragon name, clarified card actions with text-supported icons, and hid only current-progression-locked Provides and Synergy Needs signals from compact cards and selector previews.
- Formation scoring, category components, future-unlock analysis, evaluator output, canonical dragon data, affinity values, and progression requirements are unchanged; the filtering is presentation-only.
- Increased database/package version to `0.9.6`; source data schema remains `13`, and local/cloud roster schemas remain `5`. No database or Supabase migration was added.

## 0.9.5 - 2026-07-18

- Tightened the Formation Builder workspace introduction, standardized selected-dragon metadata into identity and progression rows, and refined the compact affinity presentation with a single-spear Spearmen symbol.
- Partially verified affinity sets now show only verified icons; fully unknown sets continue to state that affinities are not verified. No affinity values or verification records changed.
- Increased database/package version to `0.9.5`; source data schema remains `13`, and local/cloud roster schemas remain `5`. Formation evaluation, ratings, canonical dragon data, storage behavior, and the deterministic result hash are unchanged. No database or Supabase migration was added.

## 0.9.4 - 2026-07-18

- Moved a compact Formation Rating summary above the three-card board while retaining the complete numerical breakdown, strengths, opportunities, notes, and mapped-synergy trace in Formation Analysis.
- Reworked selected-dragon cards into independent collapsed/expanded states, replaced the full-width Affinities section with accessible troop symbols and restrained unverified states, clarified signal and movement controls, and renamed the all-dragon planning mode to `All Dragons — Star 10` without changing its mechanics.
- Corrected selector previews to evaluate each candidate in the actual target position alongside the current tentative formation and progression, without mutating the saved formation before selection.
- Increased database/package version to `0.9.4`; source data schema remains `13`, and local/cloud roster schemas remain `5`. Formation evaluation, rating formulas, canonical dragon data, affinity values, storage behavior, and the deterministic result hash are unchanged. No database or Supabase migration was added.

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
