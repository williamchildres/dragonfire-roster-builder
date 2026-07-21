# Roster Optimizer strategies

Roster Optimizer builds an exact allocation from current My Roster data. Both strategies require at least 30 eligible dragons and return exactly 10 three-dragon formations using 30 unique dragons. No partial allocation is returned.

## Strategies

`Strongest 5 + Backup 5` is the default because players can activate only five formations at once. It returns two explicit waves:

- Primary: five formations using 15 unique dragons;
- Backup: five formations using 15 different dragons.

Primary dragon inclusion maximizes Legendary count, then Epic count, before formation quality. Primary quality then compares total Formation Rating, minimum rating, the complete ascending five-rating vector, uncapped relationship value, and active relationship count. Only after every Primary numeric objective is fixed at its proven optimum does the solver optimize Backup rarity and the same Backup quality sequence. Among exactly tied Primary solutions, the one permitting the strongest Backup wins. Primary, Backup, and combined stable keys finish the deterministic tie-break.

`Best 10 Overall` preserves the v0.12.0 behavior unchanged. All ten formations are optimized as one equally weighted collection using the existing Legendary, Epic, total rating, minimum rating, complete rating vector, relationship value, relationship count, and stable-key objective.

## Eligibility, progression, and fingerprints

The optimizer and Formation Builder My Roster mode share `rosterEligibility.ts`. An eligible dragon is owned/hatched. Star Rank and stored `reignLevel` (Dragon Level) affect unlocks and Formation Rating. Notes and Habit Levels remain stored and are preserved on Formation Builder handoff, but they do not affect ranking.

The roster fingerprint contains ranking-relevant roster state. The request fingerprint additionally contains the selected strategy, optimizer contract version 2, and Formation Rating v2 identifier. Ownership, Star Rank, Dragon Level, or strategy changes stale a result; notes, Habit Levels, filters, and presentation state do not.

## Candidate generation

Every unique unordered trio is generated once. With 31 eligible dragons this is `C(31,3) = 4,495` candidates. Existing placement comparison evaluates all six position assignments, retains tied-best assignments, and chooses the stable first arrangement for display. Candidate ratings, semantic relationships, recommendations, and findings all reuse Formation Builder services unchanged. Every retained placement must score 20/20 Placement Effectiveness.

## Exact two-wave MILP

For every trio candidate `i`, Primary + Backup creates binary variables `primary_i` and `backup_i`. Constraints require five variables in each wave, prevent one candidate from entering both waves, and limit every dragon to one selected variable across both waves. This guarantees 5 + 5 formations, 15 + 15 dragons, and zero cross-wave reuse.

The exact phase order is:

1. Primary Legendary and Epic counts;
2. Primary total, minimum, ascending rating vector, relationship value, and relationship count;
3. Backup Legendary and Epic counts;
4. Backup total, minimum, ascending rating vector, relationship value, and relationship count;
5. Primary, Backup, and combined stable-key refinement.

The five-rating vectors use exact base-6 histogram chunks. Half-point relationship values are doubled to remain integral. Coefficients stay within safe integer precision.

Every HiGHS session sets `mip_rel_gap = 0` and `mip_abs_gap = 0` through the checked WASM C API adapter. Every phase must return `optimal`, and its exact value is fixed before the next phase. There is no arbitrary timeout, heuristic or greedy fallback, or non-optimal incumbent returned as success. The independent TypeScript exhaustive solver and separate brute-force fixtures validate the complete comparator on small cases, including the mandatory tied-Primary/better-Backup counterexample.

## Worker and cancellation

Candidate generation and solving run in the existing module Web Worker. Each request includes a monotonic ID, selected strategy, and cloned roster. Cancellation terminates the active worker immediately. Stale worker responses are rejected and no partial Primary or Backup result can be labeled optimal.

## Privacy and scope

Optimization is local-only and makes no network call. Formation Rating v2, tier thresholds, dragon data, all 224 curated profile signals, source schema 13, and local/cloud roster schemas 5 are unchanged. No combat simulation, Habit Level weighting, cloud result storage, or database migration is introduced.
