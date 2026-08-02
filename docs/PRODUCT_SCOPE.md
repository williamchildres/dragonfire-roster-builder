# Product Scope

Dragonfire Lab is a curated roster planner and transparent tag-and-position formation recommender.

It is not a combat simulator.

## Player Questions

The application should answer:

- Which dragons complement one another?
- Why do they complement one another?
- Does placement activate or block the relationship?
- Are dragons competing for an exclusive position?
- Which enablers are missing?
- Which relationships are unavailable because of saved progression?
- Which exact non-overlapping formation plan best satisfies the selected optimizer strategy?
- Which exact formations did I save, and how do they evaluate with current progression?
- Which troop types have the strongest shared affinity coverage for these three dragons, and which dragons are positive, neutral, negative, or still unknown?

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
- Enemy troop selection or Troop Type Advantage simulation.
- Automatic troop assignment, troop inventory, research, upgrades, Siege Precision, or Durability simulation.
- Affinity-adjusted Estimated Power, Formation Rating, combat power, optimizer scoring, or formation order.
- A guessed negative-affinity percentage or combined positive-affinity percentage.

Raw ability descriptions may preserve these details for reference, but those details must not drive the simple synergy matcher.

## Architecture Rules

- High-level synergy data is curated explicitly rather than inferred from detailed combat execution records.
- Ordinary dragon additions should be data-only changes.
- Unresolved timing details must not block an otherwise clear high-level relationship.
- New shared concepts may be added only when they apply broadly and change a player-facing recommendation.
- One unusual dragon mechanic must not cause a new generic subsystem.
- Hard recipient-position targeting is allowed only when verified ability text requires a specific friendly position.
- Status aliases may roll up to a high-level requirement only when the receiving ability explicitly names the broader requirement. Stun, Stagger, Overwhelm, and Confusion satisfy the current high-level Control requirement.
- The linear formation contract remains:
  - Left Flank is adjacent only to Vanguard.
  - Right Flank is adjacent only to Vanguard.
  - Vanguard is adjacent to both flanks.
  - The two flanks are not adjacent.
- Formation Rating represents relative formation fit, not predicted combat performance.
- Exact optimizer results must satisfy the documented objective hierarchy and zero-gap proof contract.
- Saved formations are a separate versioned library, never roster fields. Derived analysis is recalculated rather than frozen.
- A current-roster saved record may reserve all three identities. Only the sorted intersection with currently eligible owned dragons enters the pre-solver eligibility projection when exclusions are enabled; reservation metadata never enters scoring, candidates, comparators, Formation Rating, Estimated Power, relationships, or core optimizer hashes.
- Troop-affinity guidance is a deterministic derived presentation over three canonical affinity records. It retains exact ties, treats unknown separately from neutral, is invariant to position, and never enters Formation Rating, Estimated Power, optimizer objectives, optimizer hashes, Saved Formation records, or account data.
- Siege remains a canonical candidate but is objective-specific for Durability and siege damage. Enemy Troop Type Advantage remains a separate battle input, so affinity guidance is never labeled universally optimal.

## Ability Data

Canonical ability records preserve stable IDs, names, unlocks, hard position requirements, verification, evidence, descriptive tags, and raw verified wording. They do not store execution schedules, rolls, target-selection groups, stacks, structured effects, capability dependencies, traces, expected interactions, or unresolved mechanic reports.
