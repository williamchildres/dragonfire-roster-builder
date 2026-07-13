# Dragonfire Lab

Dragonfire Lab is an unofficial community tool for Game of Thrones: Dragonfire. It is a curated dragon knowledge base and transparent tag-and-position formation recommender.

It is not a combat simulator.

Public site: https://dragonfirelab.com

## Current Features

- My Roster as the central local dragon-management page, with Add Dragon search/filter flow for 31 known dragons.
- Full raw Command, Trait, and Habit wording for 19 detailed dragons.
- Curated simple synergy profiles for all 19 detailed dragons.
- Metadata-only handling for the remaining 12 unmapped dragons.
- Owned / Hatched roster tracking with Star Rank, Dragon Level, notes, and Habit Levels.
- Formation Builder with explainable local rating, placement, progression locks, missing-enabler, position conflict, and future-unlock explanations.
- Formation share links and roster JSON import/export.
- Lightweight project-context export for handoffs.

## Data Model

Canonical abilities use a minimal descriptive shape: stable ID, dragon ID, kind, name, optional class, Star Rank unlock, Dragon Level unlock, hard position requirement, raw verified wording, verification metadata, evidence IDs, and descriptive tags.

The repository does not store execution-level schedules, rolls, attempts, target-selection groups, structured effects, ranked battle values, capability dependencies, traces, expected interactions, or unresolved-mechanics exports. Raw ability wording may still mention rounds, chances, targets, durations, and percentages because players need the source text.

## Formation Builder

The live Formation Builder uses curated simple profiles in `src/synergy`. Ordinary dragon additions should be data and profile-audit changes, not engine changes.

Selected Formation Builder cards show current Damage Profile, Provides, and Benefits from signal sections. Chip states distinguish supported or used relationships from available-but-unused, missing, and inactive signals, and the Formation Rating compares the current selected formation using realized mapped signals without simulating combat. Support Usefulness is gated by active payoff and satisfied Benefits so raw damage outputs remain Damage Profile signals instead of generic support score drivers. Kit Utilization compares realized Benefits, used Provides, and supported Damage Profile outputs against mapped opportunities so unused support and missing Benefits can lower near-perfect scores without overwhelming meaningful active paths.

The simple evaluator models high-level setup/payoff and support relationships, progression locks, adjacency, hard recipient positions, grouped Vanguard conflicts, missing enablers, and duplicate relationship aggregation. The rating is a deterministic UI summary of those mapped signals with Excellent guardrails for payoff, kit utilization, missing Benefits, and placement collapse, while detailed evaluator output stays collapsed behind a secondary control; it does not model exact timing, rolls, target overlap, stacks, damage formulas, or battle outcomes.

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

Current source data schema: `13`. Local roster schema is `4`; saved/exported ownership, collection-state, and shard data from earlier versions migrate to the simplified Owned / Hatched roster state while preserving Star Rank, Dragon Level, Habit Levels, notes, and formations.
