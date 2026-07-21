# Roster Optimizer v1

Roster Optimizer builds one exact complete allocation from the player's current My Roster data. A successful result always contains exactly 10 formations, exactly 30 unique dragons, and one Left Flank, Vanguard, and Right Flank assignment per formation. It never returns a partial allocation.

## Eligibility and progression

The optimizer and Formation Builder My Roster mode share `rosterEligibility.ts`. An eligible dragon is an owned/hatched roster entry. Star Rank maps directly to current Star Rank and stored `reignLevel` maps to Dragon Level. Fewer than 30 eligible dragons returns a typed unavailable result with the exact shortfall.

Habit Levels and notes are preserved in roster storage and in the Formation Builder handoff. They do not affect candidate ranking, rarity priority, selected formations, or the roster fingerprint. The fingerprint contains only eligible stable IDs, rarity, Star Rank, Dragon Level, and the Formation Rating v2 contract identifier.

## Candidate generation

Every unique unordered trio is generated once. With 31 eligible dragons this is `C(31,3) = 4,495` candidates. The existing placement comparison evaluates all six position assignments, retains every tied-best assignment, and chooses the existing stable first arrangement for display.

The retained arrangement is evaluated through the existing semantic relationship engine, Formation Rating v2, recommendation, signal, and finding services. No optimizer-specific relationship or rating formula exists. A retained best arrangement must calculate 20/20 Placement Effectiveness; candidate generation throws if that invariant fails.

## Exact objective

Solutions are compared lexicographically:

1. included Legendary count;
2. included Epic count;
3. total Formation Rating;
4. lowest individual Formation Rating;
5. the complete ascending rating vector;
6. total uncapped active relationship value;
7. total active semantic relationship count;
8. the lexicographically smallest stable canonical solution key.

Rarity is not converted to additive weights. Rare fills only the slots remaining after Legendary and Epic inclusion is maximized.

## Solver and optimality proof

The production worker formulates binary set packing for HiGHS WebAssembly:

- one binary variable per trio candidate;
- exactly 10 selected candidates;
- at most one selected candidate containing each eligible dragon;
- exact Legendary and Epic counts required by strict rarity priority.

The solver then fixes each lexicographic phase at its proven optimum before starting the next. Total rating is optimized first. The complete sorted rating vector is represented exactly by base-11 histogram chunks, whose digits are counts from 0 through 10. Relationship value is scaled by two so half-point marginal values remain integral. If the preceding objective does not uniquely identify a solution, stable candidate-key chunks finish the canonical tie-break.

Every HiGHS session explicitly sets `mip_rel_gap = 0` and `mip_abs_gap = 0`. `@bubblyworld/highs-ts` 1.2.0 does not expose option readback and its public `setParam` discards the native status. The optimizer therefore uses a narrow adapter over the packaged WASM instance's `Highs_setDoubleOptionValue` C API. Both option calls must return HiGHS status 0 before any model is parsed; an unknown option is rejected in regression coverage. This avoids relative-gap termination when base-11 or binary chunk coefficients make one exact integral unit numerically small relative to the phase objective.

Every phase must return `optimal`. Infeasible, time-limit, iteration-limit, solution-limit, objective-bound, error, or unknown states are rejected. There is no heuristic fallback and no timeout incumbent can become a public result. The independent TypeScript branch-and-bound solver and brute-force enumeration remain test oracles for small fixtures, including a case where greedy allocation scores 101 and the exact allocation scores 120.

## Worker, cancellation, and staleness

Candidate generation and all exact solver phases run in a module Web Worker. Each run gets a monotonically increasing request ID and a roster snapshot captured at start. Cancel and disposal terminate the worker, which guarantees prompt cancellation even while WebAssembly is solving. Results from an older request ID or an obsolete worker cannot replace a newer run.

The UI compares each result fingerprint with current ranking-relevant roster state. Ownership, rarity, Star Rank, Dragon Level, or rating-contract changes make the result stale. Notes, Habit Levels, and UI filters do not. A stale allocation remains visible for reference but its Formation Builder actions are disabled until rerun.

## Privacy and scope

Optimization is entirely local and makes no server or network call. It does not synchronize result sets and does not change roster data. It performs no combat simulation, damage estimate, troop-capacity model, battle prediction, or Habit Level valuation. No database migration is required.
