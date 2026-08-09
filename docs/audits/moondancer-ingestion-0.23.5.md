# Moondancer production ingestion audit — 0.23.5

## Scope and source

- Starting `origin/main`: `810cedf19b86767d3aaafe00e2454d6f12730745`
- Release: `0.23.5`
- Identity: `moondancer` / Legendary / Warrior
- Roster source: `in-game-verified-pending-official-site`
- Screenshot capture and manual review date: 2026-08-09
- Verified affinities: Cavalry neutral; Shieldbearers positive; Archers positive; Spearmen neutral; Siege negative
- Personal screenshot progression, stats, and power are not canonical defaults.

The canonical official-roster check now reads the database rather than a duplicated hardcoded list. Its 2026-08-09 check did not find Moondancer on the public roster page, so no official URL was invented.

## Evidence IDs

- `moondancer-main-screen-2026-08-09`
- `moondancer-crescent-blade-1-2026-08-09`
- `moondancer-crescent-blade-2-2026-08-09`
- `moondancer-crescent-blade-3-2026-08-09`
- `moondancer-crescent-blade-4-2026-08-09`
- `moondancer-warriors-zeal-2026-08-09`
- `moondancer-new-moon-2026-08-09`
- `moondancer-reactive-instincts-2026-08-09`
- `moondancer-full-moon-2026-08-09`
- `moondancer-blood-moon-2026-08-09`
- `moondancer-eclipsing-strike-2026-08-09`

## Mechanic decisions

Crescent Blade grants its effect to one other Sentinel. A single eligible Sentinel resolves; multiple eligible Sentinels retain all candidates and remain unresolved; none produces an explicit no-candidate result. Tactical Damage and Recovery share the same Crescent Blade selection group. A qualifying event creates an opportunity for one 50% Rising Tide roll, never a guaranteed stack and never more than once per round. Rising Tide has a maximum of eight and records deterministic −2% Damage Received per existing stack without assumed stack uptime. The even-round Command is one two-adjacent-target Physical attack at 75% for Stars 1–5.

Warrior's Zeal activates only at Star 1, Level 16+, and Vanguard: +16% self Physical Damage Dealt and +20 Instinct/+20 Initiative to the Left Flank ally.

New Moon records Rounds 1/3/5 Rising Tide probabilities 25/30/35/42.5/50%, doubled by any Ally's Advantage to 50/60/70/85/100%. Its odd-round one-other-Sentinel support records Instinct 9/10.8/12.6/15.3/18% and Tactical Damage 6/7.2/8.4/10.2/12%, with a generic 1.5x magnitude modifier at 4+ Rising Tide. New Moon selection is independent from Crescent Blade selection.

Reactive Instincts uses grouped deterministic highest-Instinct selection for both effects. A unique leader resolves; missing stats and ties remain explicit and never use formation order, ID, power, or position as a tie-break.

Full Moon records Rounds 6/8/10 Rising Tide probabilities 25/30/35/42.5/50%, with the same Advantage-doubled branches. Its least-troops stack is a separate conditional-deterministic source with no invented condition probability. Its Habit-level Command rates are 85/92/99/109.5/120%, doubled to 170/184/198/219/240% at 4+ Rising Tide, as an augmentation of the existing Command rather than a second attack.

Blood Moon records the 4+ stack Physical Damage Dealt progression 12.5/15/17.5/21.25/25%, and odd-round two-adjacent-target Bleed probabilities 25/30/35/42.5/50%, doubled at 6+ stacks. Duration is two rounds. Shared-versus-per-target roll scope remains unresolved.

Eclipsing Strike records one shared activation at 20/26/32/40/50%, doubled at 6+ stacks. A successful activation reduces Damage Dealt of the most-troops enemy by fixed 18% for two rounds; under the enhanced condition the same activation and target also receive fixed 25% Initiative reduction. Highest-troop ties remain unresolved.

## Generic conditional evidence

`FixedOrHabitLevelEvidenceValue` permits fixed or complete Habit-level evidence in `probability-uplift`. Each uplift retains baseline, conditioned, absolute delta, relative multiplier, affected component, and condition label. Advantage deterministically selects Moondancer's doubled branch; it is not multiplied as an independent chance event. The downstream Rising Tide, Bleed, or Eclipsing roll remains probabilistic. Vhagar's fixed Fiery Bonds 25% → 50% representation and numeric behavior remain unchanged.

Generic `magnitude-uplift`, `stackFacts`, and `targetSelectorEvidence` preserve exact modifiers, thresholds, caps, and unresolved scope for technical analysis. They do not modify Formation Rating base values or optimizer weights.

## Production profile and reliability

Moondancer has 15 profile signals—11 scoring and four explicitly non-scoring—plus one position claim. Scored directions cover Physical and Bleed output; Left Flank, one-other-Sentinel, and highest-Instinct support; Advantage; selected-Sentinel Tactical-or-Recovery opportunity; Strength; and Physical support. Rising Tide self defense and Eclipsing enemy debuffs remain explicit non-scoring evidence.

The Moondancer registry contains 18 components and 11 scoring bindings. The full registry contains 240 components and 245 bindings across 34 dragons, with zero missing, stale, duplicate, unreferenced, unresolved-mixed, or research-parity issues.

## Formation Rating isolation

- Historical 0.23.4 placement snapshot: 32,736 rows, `sha256:3e7c70f4a8d8133171465b5f24c490a60431fe1c7d9665ab936d665c55f79984`
- Current 0.23.5 placement snapshot: 35,904 rows, `sha256:4c733103a31ef5c3747fdfecaaa3c223ea1cbb8003634ad3d3628ddd2c69764d`
- Existing 33-dragon placements compared: 32,736
- Existing placements changed: 0
- New Moondancer placements: 3,168
- Catalog-delta manifest: `sha256:e970ee4d7794e9dc69371dcac629bc3c1d7b58efa65365b4bc358dc1ce656c8f`
- New-row numeric identity: `sha256:f9d91299cd6001f5838640bf6e9beed07718fa495d71d8e24ed7f57bb8cb67ab`

Current identities:

- Formation Rating v3 contract: `1e6e021e2bdfb79e83a041866754fef931484c0726d9e5051a62b314c749238f`
- Formation Rating v3 numeric: `c04d9541a4c4b0c5b202ebc2be703f5832db3b8a5d0b4b77087ac647d5cf0976`
- Formation Rating v3 audit: `9a33851670be326ac05be85b2096ad165b3c0c1c83c4019a5178d9045484292f`
- Reliability research: `e01d0e4e99afcc1771dabcaf6289ebd616877ff4ed53cd3e32f4e78ee1fbfcde`
- Reliability registry: `c77c5dbe00eeecfc3d8506f47f4c327bccbb52327b413ff5119d91bec9b2334b`
- Historical v2 remains `5678952ad31630f7702fc2c56c6c9c5378b2445292696e39accb58f078ba9baf`.

Formation Rating remains v3 because the scoring/API contract did not change. Estimated Power remains v2 because its formula and protected observation/model/grid identities did not change.

## Optimizer and compatibility

- Optimizer contract: 6; Best Overall weights remain 60% Estimated Power / 40% Formation Rating.
- Complete audit: 198 independent solves, six independent candidate-pool builds, exact reconstruction, forward/reverse equality, no duplicate dragons, zero failed checks.
- Optimizer audit identity: `fnv1a64:4919638a23435778`
- 0.23.4 → 0.23.5 release delta: 198 execution records, `sha256:0a0a1ac9d1429cdf1f7b9c2f82e5d2ee81780e01080f1156ff1daff12c109f5b`
- Cumulative current-v5 delta: 96 selection changes, `sha256:b09524e954e3cefad9787f2cb4d97f918139d339a6dea504c47929696865399c`
- Historical optimizer v5 remains `fnv1a64:e5ac2432442f5cb0`.
- The minimal private 33-dragon real-world fixture remains unchanged at `fnv1a64:78cb69e50503adcf`; Moondancer is absent/unowned and was not reconstructed.
- Legacy 33-dragon rosters normalize Moondancer as unowned. Optimizer candidate generation includes her only when owned and progression-valid.

The Troop Affinity Recommendation contract remains v1. The current catalog-bound audit identity is `fnv1a64:95d0084196651307`; the immutable 0.23.2 identity remains in its historical artifact.

## Genuinely unresolved mechanics

- Crescent Blade/New Moon choice among multiple eligible Sentinels.
- Probability that the selected Crescent Blade recipient performs a qualifying event.
- Blood Moon shared-versus-per-target Bleed roll scope.
- Battle-state probability and uptime for least troops, 4+ Rising Tide, and 6+ Rising Tide.
- Highest-stat and highest-troop tie rules.
- Official public-roster publication timing for Moondancer.
