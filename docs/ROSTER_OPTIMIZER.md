# Flexible Power-Aware Roster Optimizer

Dragonfire Lab v0.23.1 uses live optimizer contract 6 and exposes three allocation modes over a selectable 1–11 armies. Best Overall First is the default for a fresh session. Historical v0.21 and optimizer-v5 artifacts remain committed evidence, not live contracts.

## Eligibility and count

Only owned, optimizer-eligible dragons count. The maximum is:

```ts
Math.min(11, Math.floor(eligibleDragonCount / 3))
```

Ten is the initial selection when at least 30 dragons are eligible; otherwise the maximum is selected. Roster or reservation-exclusion changes recompute and clamp the count. Count, mode, effective eligible progression, scoring profile, model identity, or rating-contract changes invalidate the prior request. No optimizer selection is persisted to roster or account schemas.

## Reserved-dragon eligibility projection

When at least one current-roster Saved Formation is reserved, **Exclude reserved dragons** defaults on. The preference follows the existing optimizer workspace convention: it remains in memory across app navigation, is not written to browser storage, and is not synchronized as Saved Formation data. Turning it off temporarily includes reserved dragons without changing reservations.

Before the unchanged optimizer-v6 request is built, a deterministic immutable projection intersects sorted reserved IDs with the currently owned optimizer-eligible roster. Only that intersection is marked ineligible. Unowned reserved dragons remain visible as unavailable reservations and are never described as actively excluded. The source roster is not mutated. The live maximum is `min(11, floor(eligibleAfterExclusions / 3))`; an excessive selected count is clamped with an accessible notice, and fewer than three eligible dragons disables optimization with actions to include reserved dragons or review reservations.

The client identity `optimizer-reservation-context-v1` includes exclusion enabled/disabled, sorted actually excluded IDs, the effective eligible-roster fingerprint, allocation mode, formation count, and the existing optimizer-v6 request identity. It excludes names, display order, unrelated unreserved records, card state, and sync status. Therefore rename/reorder alone does not stale a result, while reservation, arrangement, ownership, or exclusion changes do when they alter effective inputs. Core optimizer-v6 solution and result hashes remain untouched.

Run results report reserved formation/dragon counts, actually excluded and unavailable reserved counts, eligible dragons used for the solve, requested/generated armies, and a collapsible formation-attributed dragon list. Actually excluded dragons are not listed as ordinary unused eligible dragons. When exclusion is off, the result states that reserved dragons were included.

## One shared candidate pool

Each unordered eligible trio is generated once per request. Candidate generation evaluates all six placements with Formation Rating v3, retains the deterministic best arrangement and all tied best arrangements, retains the complete reliability trace, and attaches cached Estimated Power v2 integer units. Current Star Rank, Dragon Level, and active Habit Levels are included. All three modes consume this same pool.

## Best Overall First

Best Overall First is exact sequential allocation. At Army K, overlapping candidates are removed and the strongest remaining raw-power value becomes that step’s normalization reference.

```ts
powerIndexBasisPoints =
  roundHalfUp(candidatePowerUnits * 10_000 / maxRemainingPowerUnits);
ratingIndexBasisPoints = formationRating * 100;
overallScoreUnits =
  powerIndexBasisPoints * 60 +
  ratingIndexBasisPoints * 40;
```

Round-half-up uses positive integer/BigInt arithmetic, so no floating-point value affects the semantic rank. The exact candidate order is:

1. higher Overall Score units;
2. higher raw Estimated Power units;
3. higher Formation Rating v3;
4. higher fixed-point adjusted relationship value units;
5. higher active relationship count;
6. lexicographically preferred stable candidate key.

The selected trio is locked and the power reference is recalculated for the next step. Every formation records its maximum remaining power, raw power, normalized indices, weighted contributions, and final score units. This evidence is part of the semantic solution identity. Because every army uses the strongest trio remaining at its own selection step as the reference, Overall Scores from different army numbers are not directly comparable. A later army can have a higher score than Army 1 without being a stronger formation.

The result is labeled **Exact sequential result**: each army is the exact Best Overall winner at its selection step, but the complete multi-army collection is not jointly optimized. Overall Score is an explainable planning index, not combat power, predicted damage, win probability, or simulation.

## Highest Raw Power First

This is the unchanged `strongest-first` v0.22 solver under a more precise public label. At each rank it selects the highest remaining integer Estimated Power, then Formation Rating v3, fixed-point relationship value, active relationship count, and stable key. It never weakens an earlier army to improve a later one. The result is labeled **Exact sequential result** because each army is proven against the candidates remaining at its selection step.

## Balance Raw Power Across Armies

This is the unchanged `balanced` v0.22 joint solver under a more precise public label. With binary candidate selection, exactly N formations, and each dragon used at most once, it:

1. lexicographically maximizes selected integer raw-power values sorted ascending;
2. fixes that complete vector and lexicographically maximizes ratings sorted ascending;
3. maximizes relationship-value units;
4. maximizes active relationships;
5. selects the stable optimal-face identity.

Numeric MILP phases require zero MIP gap and exact integer reconstruction. The final optimal face is enumerated exactly in stable-key order. There is no heuristic fallback, timeout result, weighted approximation, variance, spread, or average-power objective. The result retains the **Exact optimal result** label because all selected armies are solved jointly. Display order is strongest-to-weakest; canonical allocation identity is display-order independent.

## Contract v6

The Worker request includes:

```ts
interface RosterOptimizerRequestV6 {
  type: 'optimize';
  contractVersion: 6;
  ratingContract: 'formation-rating-v3';
  allocationMode:
    | 'best-overall-first'
    | 'strongest-first'
    | 'balanced';
  formationCount: number;
  rosterSnapshot: OptimizerRosterDragon[];
  roster: Record<string, OwnedDragon>;
  estimatedPowerModelVersion: 'estimated-power-v2';
  estimatedPowerModelHash: string;
  estimatedPowerObservationHash: string;
  bestOverallScoringVersion: 'best-overall-v1';
  bestOverallPowerWeight: 60;
  bestOverallFormationRatingWeight: 40;
  bestOverallNormalizationScale: 10_000;
}
```

The unified result includes those contract/model/profile identities, flat formations, used and unused dragon IDs, collection summaries, exact objective vectors, telemetry, and deterministic solution/result hashes. Only Best Overall formations carry `BestOverallScoreBreakdown`; the raw-power modes never fabricate an Overall Score.

Contract-v5 and older Worker requests/responses are rejected. Historical strategy names are never interpreted as live modes. Operational timing and solver telemetry remain excluded from semantic hashes.

## Audit and limits

The optimizer-v6 audit independently solves 3 fixtures × 3 modes × 11 counts × 2 input orders: 198 records, 198 solver executions, and six independent candidate-pool builds. Existing raw and balanced candidate identities and objective vectors are checked against the immutable optimizer-v5 artifact.

Formation cards retain exact positions, Estimated Power and confidence, Formation Rating v3 and tier, reliability, canonical relationship labels, strengths, gaps, raw IDs inside Technical Trace, and Formation Builder handoff.

Estimated Power is unofficial progression guidance. Formation Rating measures documented compatibility and reliability. Neither simulates combat nor guarantees the best real-game outcome. Rarity remains descriptive and is never an objective priority.
