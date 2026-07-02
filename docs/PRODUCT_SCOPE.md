# Product Scope

Dragonfire Roster Lab is a curated dragon knowledge base and transparent tag-and-position formation recommender.

It is not a combat simulator.

## Player Questions

The application should answer:

- Which dragons complement one another?
- Why do they complement one another?
- Does placement activate or block the relationship?
- Are dragons competing for an exclusive position?
- Which enablers are missing?
- Which relationships are unavailable because of saved progression?
- Eventually, which formations are strongest among the user's owned dragons?

## Non-Goals

Synergy calculation must not model:

- Exact combat rounds.
- Exact proc timing.
- Shared versus independent rolls.
- Exact target selection.
- Whether independently selected effects hit the same target.
- Per-target checks.
- Stack transitions.
- Stack duration or refresh behavior.
- Periodic tick timing.
- Damage formulas.
- Expected damage.
- Win probability.
- Full battle simulation.

Raw ability descriptions may preserve these details for reference, but those details must not drive the simple synergy matcher.

## Architecture Rules

- High-level synergy data is curated explicitly rather than inferred from detailed `AbilityEffect` execution records.
- Ordinary dragon additions should be data-only changes.
- Unresolved timing details must not block an otherwise clear high-level relationship.
- New shared concepts may be added only when they apply broadly and change a player-facing recommendation.
- One unusual dragon mechanic must not cause a new generic subsystem.
- The linear formation contract remains:
  - Left Flank is adjacent only to Vanguard.
  - Right Flank is adjacent only to Vanguard.
  - Vanguard is adjacent to both flanks.
  - The two flanks are not adjacent.
- No numerical synergy score is part of this PR.
- Future recommendation scores must represent relative formation fit, not predicted combat performance.
