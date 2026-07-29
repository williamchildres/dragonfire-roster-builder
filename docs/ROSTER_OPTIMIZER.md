# Flexible Power-Aware Roster Optimizer

Dragonfire Lab v0.22 uses optimizer contract 5 and exposes two allocation modes over a selectable 1–11 armies. Historical v0.21 strategy artifacts remain committed as historical evidence; they are not public v0.22 choices.

## Eligibility and count

Only owned, optimizer-eligible dragons count. The maximum is:

```ts
Math.min(11, Math.floor(eligibleDragonCount / 3))
```

Three eligible dragons enable one army. Ten is the initial selection when at least 30 are eligible; otherwise the initial selection is the maximum. Roster changes recompute and clamp the selected count. Count, mode, eligible collection, progression, model, or rating-contract changes invalidate the previous request fingerprint. The count is session UI state and is not added to roster or account schemas.

## Shared candidate source

Each unordered eligible trio is generated once per request. Candidate generation:

1. evaluates all six exact positions through Formation Rating v3 placement comparison;
2. retains the same deterministic best arrangement and all tied best arrangements;
3. retains the complete v3 reliability and relationship trace;
4. uses each dragon’s current Star Rank, Dragon Level, and active Habit Levels;
5. attaches the sum of the three cached Estimated Power v2 values in integer units of ten Power;
6. attaches Formation Rating, fixed-point adjusted relationship units at scale 1,000,000, active relationship count, and stable candidate key.

Both modes consume this one pool. Candidate generation remains cancellable; Worker termination provides responsive cancellation while HiGHS is active.

## Strongest Armies First

Strongest Armies First is exact sequential allocation. For each Army K, it selects the highest-ranked candidate that does not overlap Armies 1 through K−1:

1. maximum integer Estimated Power units;
2. maximum Formation Rating v3;
3. maximum fixed-point adjusted relationship value units;
4. maximum active relationship count;
5. lexicographically preferred stable candidate key.

The implementation sorts the complete shared pool by this tuple once and takes the first disjoint candidate at every rank. Because each sequential phase selects exactly one remaining candidate, this is mathematically identical to exhaustive one-candidate optimization at that phase. Bounded exhaustive tests prove agreement. It intentionally never weakens an earlier army to improve a later one.

## Balance All Armies

Balance All Armies selects all requested candidates jointly with binary candidate variables, exactly N selections, and at most one selected formation containing each dragon.

Its objective is:

1. lexicographically maximize selected integer Estimated Power values sorted ascending;
2. with the complete power vector fixed, lexicographically maximize Formation Rating v3 values sorted ascending;
3. maximize combined fixed-point adjusted relationship value units;
4. maximize combined active relationship count;
5. choose the lexicographically preferred sorted stable-candidate-key sequence.

For a fixed selection count, one sorted ascending vector beats another exactly when its histogram has fewer selections at the first lowest value where their histograms differ. The solver therefore visits discrete values from low to high and minimizes their selected counts. Safe-integer radix chunks combine adjacent histogram digits without changing lexicographic meaning. Every numeric phase uses `mip_rel_gap = 0` and `mip_abs_gap = 0`, must return `optimal`, reconstructs its integer objective from validated binary assignments, and fixes that exact value.

The final numeric face is enumerated in stable-key order. The first allocation that exactly reconstructs the fixed power histogram, rating histogram, relationship units, relationship count, formation count, and no-overlap constraints is the exact stable-key optimum. This avoids exposing the stable identity to contaminated large floating-point objectives. No heuristic fallback, timeout result, weighted approximation, variance, spread, or average-power objective is used.

Balanced formations are displayed strongest to weakest for readability. Hash identity uses canonical stable-key order, so display order does not change allocation identity.

## Contract v5

The Worker request includes:

```ts
interface RosterOptimizerRequestV5 {
  type: 'optimize';
  contractVersion: 5;
  ratingContract: 'formation-rating-v3';
  allocationMode: 'strongest-first' | 'balanced';
  formationCount: number;
  rosterSnapshot: OptimizerRosterDragon[];
  roster: Record<string, OwnedDragon>;
  estimatedPowerModelVersion: 'estimated-power-v2';
  estimatedPowerModelHash: string;
  estimatedPowerObservationHash: string;
}
```

The unified successful result includes contract and model identities, mode, requested/generated count, flat formations, used/unused dragon IDs, collection Power/Rating/relationship/reliability/rarity summaries, the complete objective vectors, exact-search telemetry, and semantic solution/result hashes. Operational timing and solver telemetry do not enter semantic hashes.

Contract-v4 Worker requests and responses are rejected. Legacy strategy names are never interpreted as v5 modes.

## Presentation and limits

Formation cards retain exact position, Estimated Power and confidence, Formation Rating v3 and tier, reliability coverage, canonical relationship labels, strengths, gaps, retained alternatives, raw IDs inside Technical Trace, and exact Formation Builder handoff.

Estimated Power is an unofficial progression estimate. Formation Rating measures documented compatibility and reliability. Neither simulates combat or guarantees the best real-game outcome. Rarity remains descriptive and is not an objective priority.
