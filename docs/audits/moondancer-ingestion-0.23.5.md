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

Crescent Blade grants its effect to one other Sentinel. A single eligible Sentinel resolves; multiple eligible Sentinels retain all candidates and remain unresolved; none produces an explicit no-candidate result. Tactical Damage and Recovery share the same Crescent Blade selection group. A qualifying event can create a 50% Rising Tide check, never a guaranteed stack. The verified once-per-round wording caps successful Crescent Blade Rising Tide triggers at one; it does not establish whether a failed qualifying event can be followed by another check in the same round, so no retry probability is modeled. Rising Tide has a maximum of eight and records deterministic −2% Damage Received per existing stack without assumed stack uptime. The even-round Command is one two-adjacent-target Physical attack at 75% for Stars 1–5.

Warrior's Zeal activates only at Star 1, Level 16+, and Vanguard: +16% self Physical Damage Dealt and +20 Instinct/+20 Initiative to the Left Flank ally.

New Moon records Rounds 1/3/5 Rising Tide probabilities 25/30/35/42.5/50%, doubled by any Ally's Advantage to 50/60/70/85/100%. Its odd-round one-other-Sentinel support records Instinct 9/10.8/12.6/15.3/18% and Tactical Damage 6/7.2/8.4/10.2/12%, with a generic 1.5x magnitude modifier at 4+ Rising Tide. The verified enhancement is Initiative, not Instinct, and creates Moondancer's Initiative payoff from the 2-Star unlock. New Moon selection is independent from Crescent Blade selection.

Reactive Instincts uses grouped deterministic highest-Instinct selection for both effects. A unique leader resolves; missing stats and ties remain explicit and never use formation order, ID, power, or position as a tie-break.

Full Moon records Rounds 6/8/10 Rising Tide probabilities 25/30/35/42.5/50%, with the same Advantage-doubled branches. Full Moon owns separate screenshot provenance and is linked as progression-aware evidence only from its 6-Star unlock; it is not duplicated inside New Moon's 2-Star component and does not create a second Advantage relationship. Its least-troops stack is a separate conditional-deterministic source with no invented condition probability. Its Habit-level Command rates are 85/92/99/109.5/120%, doubled to 170/184/198/219/240% at 4+ Rising Tide, as an augmentation of the existing Command rather than a second attack.

Blood Moon records the 4+ stack Physical Damage Dealt progression 12.5/15/17.5/21.25/25%, and odd-round two-adjacent-target Bleed probabilities 25/30/35/42.5/50%, doubled at 6+ stacks. Duration is two rounds. Shared-versus-per-target roll scope remains unresolved.

Eclipsing Strike records one shared activation at 20/26/32/40/50%, doubled at 6+ stacks. A successful activation reduces Damage Dealt of the most-troops enemy by fixed 18% for two rounds; under the enhanced condition the same activation and target also receive fixed 25% Initiative reduction. Initiative explicitly enhances that Initiative reduction and contributes additional evidence to the already-unlocked Initiative payoff at 10 Stars without creating duplicate numeric credit. Highest-troop ties remain unresolved.

## Generic conditional evidence

`FixedOrHabitLevelEvidenceValue` permits fixed or complete Habit-level evidence in `probability-uplift`. Each uplift retains baseline, conditioned, absolute delta, relative multiplier, affected component, and condition label. Advantage deterministically selects Moondancer's doubled branch; it is not multiplied as an independent chance event. The downstream Rising Tide, Bleed, or Eclipsing roll remains probabilistic. Vhagar's fixed Fiery Bonds 25% → 50% representation and numeric behavior remain unchanged.

Generic `magnitude-uplift`, `stackFacts`, and `targetSelectorEvidence` preserve exact modifiers, thresholds, caps, and unresolved scope for technical analysis. They do not modify Formation Rating base values or optimizer weights.

## Production profile and reliability

Moondancer has 17 profile signals—13 scoring and four explicitly non-scoring—plus one position claim. Scored directions cover Physical and Bleed output; Left Flank, one-other-Sentinel, and highest-Instinct support; Advantage; selected-Sentinel Tactical-or-Recovery opportunity; Strength; Initiative; and Physical support. New Moon provides the Initiative dependency from 2 Stars and Eclipsing Strike adds evidence at 10 Stars, while candidate deduplication preserves one provider-to-Moondancer Initiative relationship. The one Strength payoff now explains both Crescent Blade scaling and Reactive Instincts enhancement without duplicate credit. Rising Tide self defense and Eclipsing enemy debuffs remain explicit non-scoring evidence.

The Moondancer registry contains 18 components and 13 scoring bindings. The full registry contains 240 components and 247 bindings across 34 dragons, with zero missing, stale, duplicate, unreferenced, unresolved-mixed, or research-parity issues.

## Formation Rating isolation

- Historical 0.23.4 placement snapshot: 32,736 rows, `sha256:3e7c70f4a8d8133171465b5f24c490a60431fe1c7d9665ab936d665c55f79984`
- Original PR-head 0.23.5 placement snapshot: 35,904 rows, `sha256:4c733103a31ef5c3747fdfecaaa3c223ea1cbb8003634ad3d3628ddd2c69764d`
- Corrected 0.23.5 placement snapshot: 35,904 rows, `sha256:4e695d5c106bec70174afbe673d562da51c52c31844aabb07fb97b53c4cb7a4d`
- Existing 33-dragon placements compared: 32,736
- Existing placements changed: 0
- New Moondancer placements: 3,168
- Moondancer placements changed by this correction: 2,001
- Correction-delta manifest: `sha256:60426a3a31cd26e18a85784f32c2ff8e3100e2a45923ed1ede0a26f43fb7a7bd`
- Catalog-delta manifest: `sha256:b29619884625ae48f120c7108d9f97e2ff7c1132c23a2090b65eae8605ed9722`
- New-row numeric identity: `sha256:030178f462b9c7b05a9c4e245b5c338d2e3c6fce705d62852f6d373055c7926d`

Current identities:

- Formation Rating v3 contract: `b22afa9e530c0c7319d5cc4a26f1b253afcaece30277681961708c9de33041ab` (original PR head: `1e6e021e2bdfb79e83a041866754fef931484c0726d9e5051a62b314c749238f`)
- Formation Rating v3 numeric: `632ff1710d9f0a4634127f09fd3bb4b58d545bb6705b23d84316b3519846e862` (original PR head: `c04d9541a4c4b0c5b202ebc2be703f5832db3b8a5d0b4b77087ac647d5cf0976`)
- Formation Rating v3 audit: `a04501adc7ed9d7f31a3e149fce23223500dfd741afa4459b086f78c4db4cc21` (original PR head: `9a33851670be326ac05be85b2096ad165b3c0c1c83c4019a5178d9045484292f`)
- Reliability research: `d2b662b302414611ab4bb03a0997f592fdb4482a79d6a191d6f26bd89977af21` (original PR head: `e01d0e4e99afcc1771dabcaf6289ebd616877ff4ed53cd3e32f4e78ee1fbfcde`)
- Reliability registry: `3c995038f50606d9dc6470976021e1c717c1963ebb21c782455c78cf9652fab0` (original PR head: `c77c5dbe00eeecfc3d8506f47f4c327bccbb52327b413ff5119d91bec9b2334b`)
- Historical v2 remains `5678952ad31630f7702fc2c56c6c9c5378b2445292696e39accb58f078ba9baf`.

Formation Rating remains v3 because the scoring/API contract did not change. Estimated Power remains v2 because its formula and protected observation/model/grid identities did not change.

## Optimizer and compatibility

- Optimizer contract: 6; Best Overall weights remain 60% Estimated Power / 40% Formation Rating.
- Complete audit: 198 independent solves, six independent candidate-pool builds, exact reconstruction, forward/reverse equality, no duplicate dragons, zero failed checks.
- Optimizer audit identity: `fnv1a64:38b92faea349b548` (original PR head: `fnv1a64:4919638a23435778`)
- 0.23.4 → 0.23.5 release delta: 198 execution records, `sha256:d233f49e09484e10cc724d2601ae74597ee98c2a9ea409996f7728f171c9f14c`
- Cumulative current-v5 delta: 96 selection changes, `sha256:0e3a22029d39195b28b662222aa4f32a9dea807ecd2fabdd166dc32e87dbfc91`
- Historical optimizer v5 remains `fnv1a64:e5ac2432442f5cb0`.
- The minimal private 33-dragon real-world fixture remains unchanged at `fnv1a64:78cb69e50503adcf`; Moondancer is absent/unowned and was not reconstructed.
- Legacy 33-dragon rosters normalize Moondancer as unowned. Optimizer candidate generation includes her only when owned and progression-valid.

The Troop Affinity Recommendation contract remains v1. The current catalog-bound audit identity is `fnv1a64:95d0084196651307`; the immutable 0.23.2 identity remains in its historical artifact.

## Genuinely unresolved mechanics

- Crescent Blade/New Moon choice among multiple eligible Sentinels.
- Probability that the selected Crescent Blade recipient performs a qualifying event.
- Whether a failed qualifying Crescent Blade event can be followed by another 50% check in the same round.
- Blood Moon shared-versus-per-target Bleed roll scope.
- Battle-state probability and uptime for least troops, 4+ Rising Tide, and 6+ Rising Tide.
- Highest-stat and highest-troop tie rules.
- Official public-roster publication timing for Moondancer.
