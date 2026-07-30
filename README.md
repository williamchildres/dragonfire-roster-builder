# Dragonfire Lab

Dragonfire Lab is an unofficial community tool for Game of Thrones: Dragonfire. It is a curated dragon knowledge base and transparent tag-and-position formation recommender.

It is not a combat simulator.

Public site: https://dragonfirelab.com/overview

## Current Features

- A compact, filterable My Roster workspace with selectable owned-dragon rows, one dedicated editor, a focused phone list/editor flow, and an Add All Dragons convenience action.
- Full raw Command, Trait, and Habit wording for all 33 known dragons.
- Curated simple synergy profiles for all 33 known dragons.
- Complete detailed coverage for all 33 dragons and 231 abilities.
- Owned / Hatched roster tracking with Star Rank, Dragon Level, notes, and Habit Levels.
- Read-only Estimated Power v2 diagnostics for roster dragons and complete formations, using 59 provenance observations and support-aware rarity-specific Star-plus-Level curves.
- Optional production-configured Google OAuth, email/password, password recovery, and email magic-link account sign-in through Supabase; local-only use remains fully supported.
- Formation Builder with canonical semantic relationships, an explainable 80/20 local rating, six-permutation placement comparison, typed diagnostics, and one actionable recommendation.
- Flexible Power-Aware Roster Optimizer for 1–11 armies with Strongest Armies First and Balance All Armies modes over current My Roster progression.
- Formation share links and roster JSON import/export.
- Clean path-based routes for Overview, Roster, Formation Builder, Optimizer, About, and Updates, with a GitHub Pages deep-link fallback.
- A CHANGELOG-backed Recent Update panel and complete public release history.
- A methodology-focused About page covering reviewed data, Formation Rating, Estimated Power, exact optimization, validation, privacy, optional support, and feedback at support@dragonfirelab.com.
- Lightweight project-context export for handoffs.

## Data Model

Canonical abilities use a minimal descriptive shape: stable ID, dragon ID, kind, name, optional class, Star Rank unlock, Dragon Level unlock, hard position requirement, raw verified wording, verification metadata, evidence IDs, and descriptive tags.

The repository does not store execution-level schedules, rolls, attempts, target-selection groups, structured effects, ranked battle values, capability dependencies, traces, expected interactions, or unresolved-mechanics exports. Raw ability wording may still mention rounds, chances, targets, durations, and percentages because players need the source text.

Account synchronization stores one RLS-protected normalized roster row per authenticated user. It synchronizes ownership, Star Rank, `reignLevel` (shown as Dragon Level), Habit Levels, and dragon notes. Formations remain browser-local. See [`docs/setup/supabase-account-roster.md`](docs/setup/supabase-account-roster.md) for migration, environment, and security setup.

Estimated Power is computed at runtime and is never entered manually or persisted locally or in the cloud. It uses only rarity, Star Rank, and Dragon Level; dragon identity, notes, and Habit Levels are not model inputs. V2 preserves exact observations, uses piecewise-linear interpolation within connected empirical support, and marks disconnected bridges or extrapolation low confidence. See [`docs/ESTIMATED_POWER.md`](docs/ESTIMATED_POWER.md) for the curves, support graph, confidence contract, validation, and limitations.

The Roster workspace keeps search, rarity, breed, details filters, sorting, and row selection as ephemeral UI state. Individual additions and Add All Dragons use one ownership transition: new dragons begin at Star 1 and Dragon Level 1, while re-added dragons retain saved valid progression, notes, and Habit Levels. Add All Dragons uses the full canonical collection, ignores filters, and commits one roster snapshot through the existing browser/account synchronization path. See [`docs/roster-workspace.md`](docs/roster-workspace.md) for interaction and filter definitions.

## Formation Builder

The live Formation Builder uses curated simple profiles in `src/synergy`. Ordinary dragon additions should be data and profile-audit changes, not engine changes.

Formation Builder opens in `All Dragons — Star 10` mode for sandbox planning with every selectable dragon shown at Star Rank 10. Saved Dragon Level still applies where roster progression exists. `My Roster` mode restricts choices to owned roster dragons and uses saved roster progression.

Selected Formation Builder cards show current Damage Profile, Provides, and Synergy needs signal sections. Those chips are dragon-local diagnostics and never form an independent scoring source. Formation Rating v3 keeps exactly two categories: Active Synergy (80) and Placement Effectiveness (20), while weighting documented relationships by production reliability metadata. Reliability that cannot be quantified remains visible as unquantified potential and does not enter the numeric score.

The evaluator discovers active setup/payoff and amplifier/output results at current progression and recipient targeting. A canonical layer collapses evidence into one provider, semantic tag, and beneficiary relationship. Setup/payoff edges have base value 10; non-stat amplifier/output edges have base value 6; stat-tag edges have base value 5. Formation Rating v3 then applies the documented fixed, Habit-derived, override, round-specific, contextual, and shared-event reliability contract. Multiple abilities for the same edge aggregate as evidence, while redundant providers for the same beneficiary/tag/class contribute 100%, 50%, then 0% trace-only.

Active Synergy caps conditional payoff at 30, output amplification at 30, and stat support at 15, then adds +5 when all three dragons participate or +2 when exactly two participate. Placement Effectiveness evaluates all six Left Flank/Vanguard/Right Flank assignments for the same trio. A placement improvement is meaningful only when it reaches both +5 relationship value and a 10% relative gain; otherwise Placement Effectiveness remains 20. A meaningful loss scores `round(20 × current relationship value / best relationship value)`. Missing enablers, unsupported outputs, unused support, alternative Vanguard Traits, and future unlocks explain gaps without another hidden deduction.

The v3 tiers are calibrated independently from the complete 33-dragon distribution: Excellent ≥66, Strong ≥53, Solid ≥34, Developing ≥5, and Weak below 5. The exhaustive audit covers 32,736 ordered placements. Incomplete is reserved for invalid, duplicate, or partial selections and has no numeric score. The rating remains deterministic and explainable; unresolved joint chance behavior, battle-state conditions, or missing progression stay explicitly unquantified rather than being guessed.

Typed defensive and Recovery Received support may be presented through explicitly non-scoring simple-profile signals. Battlefield-only conditions, troop-gated effects without selected troop context, and conditional status-copy mechanics remain detailed-only. This keeps those mechanics visible without treating defense as offensive support.

## Roster Optimizer

Roster Optimizer uses the same current My Roster eligibility and progression resolution as Formation Builder. Three eligible owned dragons enable one army; the dynamic maximum is `min(11, floor(eligible / 3))`. Ten remains the initial selection when at least 30 dragons are eligible. Every unique trio is evaluated once, all six positions are compared, and no dragon may repeat.

Strongest Armies First selects the exact strongest remaining trio by integer Estimated Power, Formation Rating v3, fixed-point relationship value, active relationship count, and stable key. Each selected army claims its dragons before the next rank.

Balance All Armies solves the requested collection jointly. It lexicographically maximizes the sorted ascending integer power vector, then the sorted ascending rating vector, combined fixed-point relationship value, active relationship count, and stable key. It is not a spread, variance, average-power, or weighted-score approximation.

Both modes use Estimated Power v2 plus Formation Rating v3 with current Star Rank, Dragon Level, and active Habit Levels. Rarity and Power confidence are descriptive only. Unquantified relationship potential is explanatory and never enters objectives. Results do not simulate combat or guarantee a real-game outcome. The last completed result survives section navigation in the current app session, becomes stale after relevant roster, count, or mode changes, and is not persisted. See [`docs/ROSTER_OPTIMIZER.md`](docs/ROSTER_OPTIMIZER.md).

## Development

Use the project scripts:

```powershell
npm run lint
npm run test
npm run build
npm run audit:full-roster
npm run audit:optimizer
npm run audit:optimizer:power-aware -- --fixture mixed
npm run audit:optimizer:power-aware -- --fixture maxed
npm run audit:optimizer:power-aware -- --fixture all-one
npm run fit:power
npm run audit:power
npm run export:context
npm run validate:context
npm run package:context
```

The normal full-roster audit validates all 32,736 ordered placements in memory against the unchanged public hash and the committed Markdown summary. When a complete diagnostic trace is needed, `npm run audit:full-roster:write-json` writes an ignored file under `Scratch/`; release branches do not commit duplicate full JSON traces.

If `npm` is unavailable in the local shell, run the equivalent direct Node entry points through the installed dependencies.

Project-context packaging must start from a clean committed source tree:

```powershell
git status --short
git commit -m "<source changes>"
npm run package:context
```

`package:context` records the current branch and committed source SHA, regenerates and validates `project-context/`, creates a deterministic `project-context.zip`, compares ZIP entries to the generated tree, rejects retired filenames, and enforces the 2 MB context limit. `project-context.zip` is ignored and should not be committed. The generated `project-context/` directory may be committed afterward; that generated-context commit can follow the source commit recorded inside the context.

There is no `report:synergy` command. The old combat-analysis report and framework have been removed.

## Data Contribution Workflow

1. Add identity and evidence.
2. Add raw Command, Trait, and Habit wording.
3. Record unlock and hard position requirements.
4. Add or update the curated simple synergy profile.
5. Add one profile-audit disposition for each detailed ability.
6. Run lint, tests, build, context export, context validation, and context ZIP packaging.
7. Visually confirm My Roster, the Add Dragon flow, Formation Builder, and Roster Optimizer at desktop and phone widths.

Do not add capability outputs, modifier capabilities, traces, expected interactions, formation-specific regression passes, or combat-simulation machinery.

## Version Notes

Current release: `0.22.0`. Source data schema: `13`. Local and cloud roster schemas: `5`; optimizer contract: `5`; live rating contract: `formation-rating-v3`. Formation Rating v3 weights mapped relationships by documented activation reliability and leaves unresolved potential outside the numeric score. Estimated Power v2 remains runtime-only and unchanged. No persistence format, SQL migration, route, sharing payload, or account-synchronization behavior changed. The canonical database contains 33 dragons, 231 reviewed abilities, 33 curated profiles, and 239 curated scoring signals. Supabase migrations remain `0001` (`202607170001_create_user_rosters.sql`) and `0002` (`202607170002_restrict_user_roster_privileges.sql`).
