# Flexible Power-Aware Roster Optimizer

Dragonfire Lab v0.22.1 uses live optimizer contract 6 and exposes three allocation modes over a selectable 1–11 armies. Best Overall First is the default for a fresh session. Historical v0.21 and optimizer-v5 artifacts remain committed evidence, not live contracts.

## Eligibility and count

Only owned, optimizer-eligible dragons count. The maximum is:

```ts
Math.min(11, Math.floor(eligibleDragonCount / 3))
```

Ten is the initial selection when at least 30 dragons are eligible; otherwise the maximum is selected. Roster changes recompute and clamp the count. Count, mode, eligible progression, scoring profile, model identity, or rating-contract changes invalidate the prior request. No optimizer selection is persisted to roster or account schemas.

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

The selected trio is locked and the power reference is recalculated for the next step. Every formation records its maximum remaining power, raw power, normalized indices, weighted contributions, and final score units. This evidence is part of the semantic solution identity. Overall Score is an explainable planning index, not combat power, predicted damage, win probability, or simulation.

## Highest Raw Power First

This is the unchanged `strongest-first` v0.22 solver under a more precise public label. At each rank it selects the highest remaining integer Estimated Power, then Formation Rating v3, fixed-point relationship value, active relationship count, and stable key. It never weakens an earlier army to improve a later one.

## Balance Raw Power Across Armies

This is the unchanged `balanced` v0.22 joint solver under a more precise public label. With binary candidate selection, exactly N formations, and each dragon used at most once, it:

1. lexicographically maximizes selected integer raw-power values sorted ascending;
2. fixes that complete vector and lexicographically maximizes ratings sorted ascending;
3. maximizes relationship-value units;
4. maximizes active relationships;
5. selects the stable optimal-face identity.

Numeric MILP phases require zero MIP gap and exact integer reconstruction. The final optimal face is enumerated exactly in stable-key order. There is no heuristic fallback, timeout result, weighted approximation, variance, spread, or average-power objective. Display order is strongest-to-weakest; canonical allocation identity is display-order independent.

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
