# Dragonfire Lab

Dragonfire Lab is an unofficial community tool for Game of Thrones: Dragonfire. It is a curated dragon knowledge base and transparent tag-and-position formation recommender.

It is not a combat simulator.

Public site: https://dragonfirelab.com

## Current Features

- A compact, filterable My Roster workspace with selectable owned-dragon rows, one dedicated editor, and a focused phone list/editor flow.
- Full raw Command, Trait, and Habit wording for all 31 known dragons.
- Curated simple synergy profiles for all 31 known dragons.
- Complete Legendary (9 / 9), Epic (10 / 10), and Rare (12 / 12) coverage.
- Owned / Hatched roster tracking with Star Rank, Dragon Level, notes, and Habit Levels.
- Optional production-configured Google OAuth, email/password, password recovery, and email magic-link account sign-in through Supabase; local-only use remains fully supported.
- Formation Builder with canonical semantic relationships, an explainable 80/20 local rating, six-permutation placement comparison, typed diagnostics, and one actionable recommendation.
- Formation share links and roster JSON import/export.
- Lightweight project-context export for handoffs.

## Data Model

Canonical abilities use a minimal descriptive shape: stable ID, dragon ID, kind, name, optional class, Star Rank unlock, Dragon Level unlock, hard position requirement, raw verified wording, verification metadata, evidence IDs, and descriptive tags.

The repository does not store execution-level schedules, rolls, attempts, target-selection groups, structured effects, ranked battle values, capability dependencies, traces, expected interactions, or unresolved-mechanics exports. Raw ability wording may still mention rounds, chances, targets, durations, and percentages because players need the source text.

Account synchronization stores one RLS-protected normalized roster row per authenticated user. It synchronizes ownership, Star Rank, `reignLevel` (shown as Dragon Level), Habit Levels, and dragon notes. Formations remain browser-local. See [`docs/setup/supabase-account-roster.md`](docs/setup/supabase-account-roster.md) for migration, environment, and security setup.

The Roster workspace keeps search, rarity, breed, details filters, sorting, and row selection as ephemeral UI state. Each progression or notes edit updates the authoritative roster immediately and follows the existing browser/account synchronization path. See [`docs/roster-workspace.md`](docs/roster-workspace.md) for interaction and filter definitions.

## Formation Builder

The live Formation Builder uses curated simple profiles in `src/synergy`. Ordinary dragon additions should be data and profile-audit changes, not engine changes.

Formation Builder opens in `All Dragons — Star 10` mode for sandbox planning with every selectable dragon shown at Star Rank 10. Saved Dragon Level still applies where roster progression exists. `My Roster` mode restricts choices to owned roster dragons and uses saved roster progression.

Selected Formation Builder cards show current Damage Profile, Provides, and Synergy needs signal sections. Those chips are dragon-local diagnostics and never form an independent scoring source. The public Formation Rating has exactly two categories: Active Synergy (80) and Placement Effectiveness (20). Analysis Confidence gates score availability, and Kit Coverage is diagnostic-only.

The evaluator discovers active setup/payoff and amplifier/output results at current progression and recipient targeting. A canonical layer then collapses evidence into one provider → semantic tag → beneficiary edge. Setup/payoff edges are conditional payoffs worth 10; non-stat amplifier/output edges are output amplification worth 6; stat-tag edges are stat support worth 5. Multiple abilities for the same edge aggregate as evidence, while redundant providers for the same beneficiary/tag/class contribute 100%, 50%, then 0% trace-only. Control aliases canonicalize to `status:control`; specific damage tags remain distinct; generic `damage:any` remains one generic edge.

Active Synergy caps conditional payoff at 30, output amplification at 30, and stat support at 15, then adds +5 when all three dragons participate or +2 when exactly two participate. Placement Effectiveness evaluates all six Left Flank/Vanguard/Right Flank assignments for the same trio. A placement improvement is meaningful only when it reaches both +5 relationship value and a 10% relative gain; otherwise Placement Effectiveness remains 20. A meaningful loss scores `round(20 × current relationship value / best relationship value)`. Missing enablers, unsupported outputs, unused support, alternative Vanguard Traits, and future unlocks explain gaps without another hidden deduction.

The 0.11.0 tiers were calibrated from all 26,970 ordered formations: Excellent ≥80 (the empirical P99 band), Strong ≥67 (P90), Solid ≥49 (median), Developing ≥25, and Weak below 25. Incomplete is reserved for invalid, duplicate, partial, or insufficient-confidence selections and has no numeric score. The rating remains deterministic and explainable; it does not model exact timing, rolls, target overlap, stacks, damage formulas, or battle outcomes.

Typed defensive and Recovery Received support may be presented through explicitly non-scoring simple-profile signals. Battlefield-only conditions, troop-gated effects without selected troop context, and conditional status-copy mechanics remain detailed-only. This keeps those mechanics visible without treating defense as offensive support.

## Development

Use the project scripts:

```powershell
npm run lint
npm run test
npm run build
npm run export:context
npm run validate:context
npm run package:context
```

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
7. Visually confirm My Roster, the Add Dragon flow, and Formation Builder.

Do not add capability outputs, modifier capabilities, traces, expected interactions, formation-specific regression passes, or combat-simulation machinery.

## Version Notes

Current release: `0.10.0`. Source data schema: `13`. Local and cloud roster schemas: `5`. Schema 5 stores Habit Levels sparsely: locked habits have no key, unlocked habits always have a value from 1 through 5, and lowering progression below an unlock threshold deletes the saved level. Legacy unlocked null/zero values migrate to Level 1; locked and unknown legacy values are discarded. Supabase migrations remain `0001` (`202607170001_create_user_rosters.sql`) and `0002` (`202607170002_restrict_user_roster_privileges.sql`); roster schema 5 is a JSON-contract change and requires no SQL migration. Google OAuth, email/password, password recovery, magic links, and custom SMTP are production configured externally. Production authentication email is sent through Resend using `auth.dragonfirelab.com`; no SMTP credential, OAuth secret, API key, or Supabase secret is stored in this repository. Other environments must supply their own provider and SMTP configuration. Same-email Google acceptance testing must confirm the existing Supabase user UUID and cloud roster are preserved.
