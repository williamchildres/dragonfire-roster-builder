# Roster Optimizer strategies

Roster Optimizer builds an exact allocation from current My Roster data. All three strategies require at least 30 eligible dragons and return exactly 10 three-dragon formations using 30 unique dragons. No partial allocation is returned.

## Strategies

`Power-Aware 5 + Backup 5` remains the default in 0.19.1. Estimated Power selects which 15 dragons belong in Primary, then Formation Rating organizes that pool into five formations. Rarity-Priority 5 + Backup 5 and Best 10 Overall remain selectable with their unchanged behavior.

`Power-Aware 5 + Backup 5` is Estimated / Experimental. Estimated Power selects which 15 dragons belong in Primary. Formation Rating then organizes that equally powerful pool into five formations. The exact hierarchy is:

1. Primary total Estimated Power;
2. Primary total Formation Rating;
3. Primary minimum Formation Rating;
4. Primary complete ascending five-rating vector;
5. Primary uncapped relationship value;
6. Primary active semantic relationship count;
7. Backup total Estimated Power;
8. Backup total Formation Rating;
9. Backup minimum Formation Rating;
10. Backup complete ascending five-rating vector;
11. Backup uncapped relationship value;
12. Backup active semantic relationship count;
13. Primary stable solution key;
14. Backup stable solution key;
15. Combined stable solution key.

Power and the 0–100 Formation Rating are never blended. Rarity and Power confidence are diagnostics only in Power-Aware mode. Estimated Power is empirical and unofficial; it is not combat simulation or an official game formula.

`Best 10 Overall` preserves the v0.12.0 behavior unchanged. All ten formations are optimized as one equally weighted collection using the existing Legendary, Epic, total rating, minimum rating, complete rating vector, relationship value, relationship count, and stable-key objective.

## Exact Primary Power cutoff

Estimated Power is calculated once for each eligible dragon and converted to integer `powerUnits = estimatedPower / 10`. All supported Estimated Power values are rounded to the nearest 10.

The production solver does not begin with a large-coefficient Power MILP objective. Every 15-dragon group can be partitioned into five trios, so maximum Primary total Power is fixed equivalently at the 15th-highest individual cutoff:

- every dragon above the cutoff must appear in Primary;
- every dragon below the cutoff cannot appear in Primary;
- exactly the required number of cutoff-tied dragons must appear in Primary.

Dragon inclusion is expressed through the existing Primary formation variables. Tied cutoff dragons are not selected arbitrarily: unchanged Primary Formation Rating objectives choose the best pool and arrangement. Reduced exhaustive tests enumerate every same-size pool and prove that the cutoff-feasible pools are exactly the maximum-Power pools.

After every Primary numeric quality objective is fixed, Backup total Estimated Power is maximized in integer units and its exact optimum is constrained before Backup Formation Rating phases begin. The existing joint no-overlap constraints remain active, so Primary-quality ties can be resolved by the strongest feasible Backup group at the correct hierarchy point.

## Eligibility, caching, and fingerprints

The optimizer and Formation Builder My Roster mode share `rosterEligibility.ts`. An eligible dragon is owned/hatched. Star Rank and stored `reignLevel` (Dragon Level) affect unlocks, Formation Rating, and Estimated Power. Notes and Habit Levels remain stored and are preserved on Formation Builder handoff, but they do not affect ranking.

Power-Aware requests estimate each eligible dragon exactly once into an ID-keyed cache. Cutoff constraints, candidate formation sums, the Backup expression, result summaries, formation cards, diagnostics, and hashes reuse that cache. Formation Power is only the sum of its three cached dragon estimates; position, synergy, and relationship bonuses are excluded.

The roster fingerprint contains ownership through roster membership plus dragon ID, rarity, Star Rank, and Dragon Level. The request fingerprint contains optimizer contract version 3, strategy, roster fingerprint, and Formation Rating v2. Power-Aware fingerprints additionally contain Estimated Power version, model hash, and observation hash. Ownership, Star Rank, Dragon Level, strategy, or Power contract changes stale a Power-Aware result. Notes, Habit Levels, filters, selection, and presentation state do not.

Estimated Power metadata is not added to either legacy strategy's semantic solution identity. Their contract-v3 transport hashes change, while their selected allocations and published semantic solution hashes remain unchanged.

## Candidate generation and exact joint MILP

Every unique unordered trio is generated once. With the complete 33-dragon roster this is `C(33,3) = 5,456` candidates. Existing placement comparison evaluates all six position assignments, retains tied-best assignments, and chooses the stable first arrangement for display. Candidate ratings, semantic relationships, recommendations, and findings all reuse Formation Builder services unchanged. Every retained placement must score 20/20 Placement Effectiveness.

For every trio candidate `i`, Primary + Backup creates binary variables `primary_i` and `backup_i`. Constraints require five variables in each wave, prevent one candidate from entering both waves, and limit every dragon to one selected variable across both waves. This guarantees 5 + 5 formations, 15 + 15 dragons, and zero cross-wave reuse.

The five-rating vectors use exact base-6 histogram chunks. Half-point relationship values are doubled to remain integral. Every HiGHS session sets `mip_rel_gap = 0` and `mip_abs_gap = 0` through the checked WASM C API adapter. Every actual phase must return `optimal`, and its exact integer value is fixed before the next phase. There is no timeout result, heuristic or greedy fallback, approximate incumbent, or sequential unrelated Backup solve.

HiGHS reports objectives as floating-point numbers even for integer models. In 0.19.1, an integral real-world 33-dragon solve exposed a contaminated `0.8403320312499968` objective during Backup stable chunk 0–48. Each scalar, histogram, and stable phase validates every Boolean/integer variable against the strict `1e-7` integrality tolerance, rounds only those validated individual variables, and reconstructs the phase value with safe-integer arithmetic from the known integer coefficients.

A reconstructed assignment value alone does not prove exact integer optimality when the raw objective is materially contaminated. Before fixing any phase whose raw-versus-reconstructed delta exceeds the unchanged historical `1e-3` boundary, the optimizer builds a fresh model, replays every prior fixed phase, adds the one-integer improvement bound (`>= V + 1` for maximization or `<= V - 1` for minimization), sets a zero objective, and solves with the existing zero-gap configuration. Only an infeasible probe certifies `V`; a feasible integral improvement, fractional probe assignment, or other status is a hard error. For the live failure, the Backup stable chunk value `0` is certified because the fresh `>= 1` probe is infeasible. Post-solve validation still recomputes every fixed phase from the final assignment.

Stable chunk size 49, alternate-selection probes, stable wave refinement, stable candidate ordering, powers-of-two coefficients through `2^48`, final stable phase order, HiGHS parse path, and zero-gap options remain unchanged. The numerical fix does not alter the canonical lexicographic meaning. Reduced fixtures continue to validate the complete Power-Aware comparator and production HiGHS against an independent exhaustive oracle.

## Worker and cancellation

Candidate generation and solving run in the existing module Web Worker. Each request includes a monotonic ID, selected strategy, and cloned roster. Cancellation terminates the active worker immediately. Stale worker responses are rejected and no partial Primary or Backup result can be labeled optimal.

## Audits, privacy, and scope

`npm run audit:optimizer` remains the legacy-only deterministic audit. Power-Aware full-size scenarios are intentionally separate and forward-only:

```powershell
npm run audit:optimizer:power-aware -- --fixture mixed
npm run audit:optimizer:power-aware -- --fixture maxed
npm run audit:optimizer:power-aware -- --fixture all-one
npm run audit:optimizer:power-aware -- --fixture live-regression
npm run audit:optimizer:power-aware -- --fixture live-regression --reverse
```

Optimization is local-only and makes no network call. In 0.19.1, the selected strategy and last successfully completed optimal result remain in the mounted app session while navigating between sections. A relevant roster or strategy change leaves that result visible with the existing stale warning; successful reruns replace it, while failed, unavailable, cancelled, and obsolete runs do not. The workspace result is not written to browser storage, cloud storage, roster exports, or schemas, so it clears on browser reload. The full 33-dragon roster still returns ten formations using 30 unique dragons and reports exactly three unused dragons. Optimizer objective hierarchy, Primary cutoff math, Backup phase placement, integer Power units, stable ordering, zero-gap settings, confidence-as-diagnostic behavior, Formation Rating v2, Estimated Power v2, tier thresholds, source schema 13, local/cloud roster schemas 5, Habit Level behavior, dragon data, persistence, and Supabase migrations are unchanged. The canonical data contains 33 dragons and 239 curated scoring signals. No manual Power, weighted Power/Rating formula, formation-power balancing, combat simulation, locks, exclusions, alternate solutions, or auto-run is introduced.
