# Dragonfire Roster Lab

Dragonfire Roster Lab is an unofficial community tool for Game of Thrones: Dragonfire. It is a curated dragon knowledge base and transparent tag-and-position formation recommender.

It is not a combat simulator.

## Current Features

- Dragon Database for 30 known dragons.
- Full raw Command, Trait, and Habit wording for 18 detailed dragons.
- Curated simple synergy profiles for all 18 detailed dragons.
- Metadata-only handling for the remaining 12 unmapped dragons.
- Roster ownership, collection state, Star Rank, Dragon Level, notes, and Habit Level tracking.
- Formation Builder with placement, progression locks, missing-enabler, position conflict, and future-unlock explanations.
- Formation share links and roster JSON import/export.
- Lightweight project-context export for handoffs.

## Data Model

Canonical abilities use a minimal descriptive shape: stable ID, dragon ID, kind, name, optional class, Star Rank unlock, Dragon Level unlock, hard position requirement, raw verified wording, verification metadata, evidence IDs, and descriptive tags.

The repository does not store execution-level schedules, rolls, attempts, target-selection groups, structured effects, ranked battle values, capability dependencies, traces, expected interactions, or unresolved-mechanics exports. Raw ability wording may still mention rounds, chances, targets, durations, and percentages because players need the source text.

## Formation Builder

The live Formation Builder uses curated simple profiles in `src/synergy`. Ordinary dragon additions should be data and profile-audit changes, not engine changes.

The simple evaluator models high-level setup/payoff and support relationships, progression locks, adjacency, hard recipient positions, grouped Vanguard conflicts, missing enablers, and duplicate relationship aggregation. It does not model exact timing, rolls, target overlap, stacks, damage formulas, or scores.

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

There is no `report:synergy` command. The old combat-analysis report and framework have been removed.

## Data Contribution Workflow

1. Add identity and evidence.
2. Add raw Command, Trait, and Habit wording.
3. Record unlock and hard position requirements.
4. Add or update the curated simple synergy profile.
5. Add one profile-audit disposition for each detailed ability.
6. Run lint, tests, build, context export, context validation, and context ZIP packaging.
7. Visually confirm the Dragon Database and Formation Builder.

Do not add capability outputs, modifier capabilities, traces, expected interactions, formation-specific regression passes, or combat-simulation machinery.

## Version Notes

Current source data schema: `13`. Local roster schema remains `3`; saved ownership, collection state, Star Rank, Dragon Level, Habit Levels, notes, and formations remain compatible.
