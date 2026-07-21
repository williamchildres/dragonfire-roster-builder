# Full-roster Formation Rating v2 audit — 0.14.0

> Formation Rating v2 intentionally replaces the prior public contract. Canonical semantic relationships score active synergy once; placement compares all six feasible arrangements; kit gaps and ordinary Vanguard alternatives are diagnostic only.

## Executive summary

- Baseline: 0.10.5 at `80c3c13261c48f7e18b6044d09dd9b74371451c4`; old hash `ca8d09e060d7b28faa44115f65d2cfe52b1cce2ecc1a9a5fc9439714e22afc48`.
- Current: 0.14.0; new hash `12ee9dc58012cd4edd14ea3d095da32e2db6bf5cca6a1f8d77c24be8506eded9`.
- Coverage unchanged: 31 dragons, 217 abilities, 224 curated signals, 26970 ordered formations, 4023 provider/payoff pairs.
- Validation: 32 PASS checks, 0 failed checks, 2 informational/unresolved findings.
- Runtime: 13647 ms; prior audit 12838 ms; delta +809 ms.

## Public contract

- Active Synergy: 80 points. Conditional payoff base 10 (cap 30), output amplification base 6 (cap 30), stat support base 5 (cap 15), plus participation +5 for three dragons or +2 for two.
- Provider redundancy by beneficiary + tag + class: 100%, 50%, then 0% trace-only.
- Placement Effectiveness: 20 points. A placement improvement is meaningful only when it reaches both +5 relationship value and a 10% relative gain; otherwise Placement Effectiveness remains 20. A meaningful loss scores `round(20 × current / best)`.
- Analysis Confidence gates score availability. Kit Coverage, inactive alternative Vanguard Traits, missing enablers, unused support, unsupported outputs, and future unlocks are diagnostics, not separate deductions.

## Empirical calibration

Scores range 0–100; mean 47.8489; median 49; P10 28; P25 38; P75 58; P90 67; P95 70; P99 80.

| Tier | Threshold | Count |
|---|---:|---:|
| Excellent | 80 | 281 |
| Strong | 67 | 2558 |
| Solid | 49 | 10825 |
| Developing | 25 | 11581 |
| Weak | 0 | 1725 |
| Incomplete | validation gate | 0 |

- Excellent begins at the empirical P99 score of 80.
- Strong begins at the empirical P90 score of 67.
- Solid begins at the empirical median score of 49.
- Developing begins at 25, separating little active value from meaningful but incomplete synergy.
- Incomplete is reserved for the validation gate and is not a numeric score band.

## Placement and relationship statistics

- Exact best or tied best: 32.4397%.
- Meaningful swap recommendations: 13923.
- Recommendation outcomes: action:swap 13923, below-meaningful-threshold 4298, current-best 2286, tied-best 6463.
- Relationship classes: conditional-payoff 9280, output-amplification 78242, stat-support 48111.
- Redundancy ranks: 1 117532, 2 18101.
- Placement scores: 0 408, 3 18, 4 14, 5 47, 6 103, 7 138, 8 170, 9 243, 10 587, 11 572, 12 304, 13 1399, 14 1489, 15 2001, 16 2854, 17 2577, 18 999, 20 13047.

## Tier migration

| Migration | Formations |
|---|---:|
| Developing -> Developing | 7867 |
| Developing -> Solid | 5365 |
| Developing -> Strong | 460 |
| Developing -> Weak | 96 |
| Excellent -> Excellent | 14 |
| Excellent -> Strong | 2 |
| Solid -> Developing | 750 |
| Solid -> Excellent | 90 |
| Solid -> Solid | 5082 |
| Solid -> Strong | 1479 |
| Strong -> Developing | 1 |
| Strong -> Excellent | 177 |
| Strong -> Solid | 376 |
| Strong -> Strong | 617 |
| Weak -> Developing | 2963 |
| Weak -> Solid | 2 |
| Weak -> Weak | 1629 |

## New top 50

| Left / Vanguard / Right | Score | Tier | Active | Placement | Current / Best value | Relationships | Recommendation |
|---|---:|---|---:|---:|---:|---:|---|
| zivern / shadowsong / seasmoke | 100 | Excellent | 80 | 20 | 78 / 78 | 12 | current-best |
| seasmoke / shadowsong / zivern | 95 | Excellent | 75 | 20 | 73 / 78 | 11 | below-meaningful-threshold |
| shadowrend / zivern / shadowsong | 95 | Excellent | 75 | 20 | 79 / 79 | 14 | tied-best |
| shadowsong / seasmoke / zivern | 95 | Excellent | 75 | 20 | 73 / 78 | 11 | below-meaningful-threshold |
| zivern / seasmoke / shadowsong | 95 | Excellent | 75 | 20 | 73 / 78 | 11 | below-meaningful-threshold |
| zivern / shadowsong / shadowrend | 95 | Excellent | 75 | 20 | 79 / 79 | 14 | tied-best |
| caraxes / syrax / velar | 91 | Excellent | 71 | 20 | 71 / 76 | 12 | below-meaningful-threshold |
| caraxes / velar / syrax | 91 | Excellent | 71 | 20 | 71 / 76 | 12 | below-meaningful-threshold |
| syrax / caraxes / velar | 91 | Excellent | 71 | 20 | 73.5 / 76 | 13 | below-meaningful-threshold |
| syrax / velar / caraxes | 91 | Excellent | 71 | 20 | 76 / 76 | 13 | tied-best |
| velar / caraxes / syrax | 91 | Excellent | 71 | 20 | 76 / 76 | 13 | tied-best |
| velar / syrax / caraxes | 91 | Excellent | 71 | 20 | 71 / 76 | 12 | below-meaningful-threshold |
| feskar / shadowsong / shadowrend | 90 | Excellent | 70 | 20 | 70 / 70 | 11 | current-best |
| nyrena / shadowsong / zivern | 90 | Excellent | 70 | 20 | 65 / 70 | 10 | below-meaningful-threshold |
| seasmoke / shadowsong / shadowrend | 90 | Excellent | 70 | 20 | 81.5 / 81.5 | 14 | current-best |
| shadowrend / seasmoke / shadowsong | 90 | Excellent | 70 | 20 | 74 / 81.5 | 12 | below-meaningful-threshold |
| shadowrend / shadowsong / seasmoke | 90 | Excellent | 70 | 20 | 76.5 / 81.5 | 13 | below-meaningful-threshold |
| shadowsong / seasmoke / shadowrend | 90 | Excellent | 70 | 20 | 74 / 81.5 | 12 | below-meaningful-threshold |
| solstryker / shadowsong / shadowrend | 90 | Excellent | 70 | 20 | 73 / 73 | 12 | current-best |
| syrax / zivern / shadowsong | 90 | Excellent | 70 | 20 | 78 / 78 | 13 | current-best |
| velar / zivern / shadowsong | 90 | Excellent | 70 | 20 | 71 / 71 | 12 | current-best |
| vhagar / shadowsong / shadowrend | 90 | Excellent | 70 | 20 | 74 / 74 | 13 | current-best |
| zivern / dawnseeker / shadowsong | 90 | Excellent | 70 | 20 | 65 / 69 | 10 | below-meaningful-threshold |
| zivern / shadowsong / nyrena | 90 | Excellent | 70 | 20 | 70 / 70 | 11 | current-best |
| zivern / shadowsong / syrax | 90 | Excellent | 70 | 20 | 73 / 78 | 12 | below-meaningful-threshold |
| zivern / shadowsong / tessarion | 90 | Excellent | 70 | 20 | 68 / 68 | 11 | current-best |
| zivern / shadowsong / vhagar | 90 | Excellent | 70 | 20 | 65 / 66 | 10 | below-meaningful-threshold |
| feskar / zivern / shadowsong | 89 | Excellent | 69 | 20 | 64 / 64 | 9 | current-best |
| seasmoke / zivern / shadowsong | 89 | Excellent | 72 | 17 | 67 / 78 | 10 | swap |
| shadowsong / zivern / seasmoke | 89 | Excellent | 72 | 17 | 67 / 78 | 10 | swap |
| caraxes / feskar / syrax | 88 | Excellent | 68 | 20 | 68 / 73 | 10 | below-meaningful-threshold |
| caraxes / syrax / feskar | 88 | Excellent | 68 | 20 | 68 / 73 | 10 | below-meaningful-threshold |
| feskar / caraxes / syrax | 88 | Excellent | 68 | 20 | 73 / 73 | 11 | current-best |
| feskar / syrax / caraxes | 88 | Excellent | 68 | 20 | 68 / 73 | 10 | below-meaningful-threshold |
| shimmer / caraxes / syrax | 88 | Excellent | 68 | 20 | 63 / 63 | 9 | current-best |
| syrax / caraxes / feskar | 88 | Excellent | 68 | 20 | 68 / 73 | 10 | below-meaningful-threshold |
| syrax / feskar / caraxes | 88 | Excellent | 68 | 20 | 68 / 73 | 10 | below-meaningful-threshold |
| seasmoke / shadowrend / shadowsong | 87 | Excellent | 70 | 17 | 68 / 81.5 | 11 | swap |
| shadowsong / shadowrend / seasmoke | 87 | Excellent | 70 | 17 | 68 / 81.5 | 11 | swap |
| shadowsong / syrax / zivern | 87 | Excellent | 70 | 17 | 68 / 78 | 11 | swap |
| shadowsong / zivern / syrax | 87 | Excellent | 70 | 17 | 68 / 78 | 11 | swap |
| solstryker / zivern / shadowsong | 87 | Excellent | 67 | 20 | 62 / 62 | 9 | tied-best |
| syrax / shadowsong / zivern | 87 | Excellent | 70 | 17 | 68 / 78 | 11 | swap |
| zivern / shadowsong / rhysarion | 87 | Excellent | 67 | 20 | 62 / 66 | 9 | below-meaningful-threshold |
| zivern / shadowsong / solstryker | 87 | Excellent | 67 | 20 | 62 / 62 | 9 | tied-best |
| zivern / syrax / shadowsong | 87 | Excellent | 70 | 17 | 68 / 78 | 11 | swap |
| caraxes / shimmer / syrax | 86 | Excellent | 66 | 20 | 61 / 63 | 9 | below-meaningful-threshold |
| malachite / caraxes / syrax | 86 | Excellent | 66 | 20 | 61 / 61 | 10 | current-best |
| shadowrend / shadowsong / solstryker | 86 | Excellent | 68 | 18 | 65.5 / 73 | 11 | swap |
| syrax / dawnseeker / caraxes | 86 | Excellent | 66 | 20 | 73.5 / 73.5 | 13 | current-best |

## Largest increases

| Left / Vanguard / Right | Old | New | Delta | Tier migration |
|---|---:|---:|---:|---|
| kalspire / zivern / shadowrend | 44 | 68 | +24 | Developing → Strong |
| antares / shadowsong / seasmoke | 47 | 70 | +23 | Developing → Strong |
| feskar / zivern / velar | 44 | 67 | +23 | Developing → Strong |
| kalspire / shadowrend / zivern | 44 | 67 | +23 | Developing → Strong |
| kalspire / vaeldra / shadowrend | 47 | 70 | +23 | Developing → Strong |
| kalspire / vhagar / shadowrend | 47 | 70 | +23 | Developing → Strong |
| rhysarion / shadowsong / seasmoke | 47 | 70 | +23 | Developing → Strong |
| seasmoke / rhysarion / malachite | 47 | 70 | +23 | Developing → Strong |
| seasmoke / shadowsong / rhysarion | 47 | 70 | +23 | Developing → Strong |
| shadowrend / kalspire / zivern | 44 | 67 | +23 | Developing → Strong |
| shadowsong / antares / seasmoke | 47 | 70 | +23 | Developing → Strong |
| shadowsong / rhysarion / syrax | 47 | 70 | +23 | Developing → Strong |
| shadowsong / seasmoke / syrax | 47 | 70 | +23 | Developing → Strong |
| syrax / rhysarion / shadowsong | 47 | 70 | +23 | Developing → Strong |
| syrax / seasmoke / shadowsong | 47 | 70 | +23 | Developing → Strong |
| zivern / kalspire / shadowrend | 44 | 67 | +23 | Developing → Strong |
| zivern / shadowrend / kalspire | 44 | 67 | +23 | Developing → Strong |
| kalspire / zivern / velar | 45 | 67 | +22 | Developing → Strong |
| rhysarion / shadowsong / tessarion | 48 | 70 | +22 | Developing → Strong |
| shadowrend / vaeldra / kalspire | 48 | 70 | +22 | Developing → Strong |

## Largest decreases

| Left / Vanguard / Right | Old | New | Delta | Tier migration |
|---|---:|---:|---:|---|
| dawnseeker / vesper / shimmer | 67 | 30 | -37 | Solid → Developing |
| nyrena / vesper / shimmer | 64 | 30 | -34 | Solid → Developing |
| dawnseeker / vesper / kalspire | 68 | 35 | -33 | Solid → Developing |
| dawnseeker / vesper / arulix | 68 | 35 | -33 | Solid → Developing |
| nyrena / vesper / feskar | 68 | 36 | -32 | Solid → Developing |
| solstryker / vesper / shimmer | 52 | 21 | -31 | Developing → Weak |
| sheepstealer / nyrena / dawnseeker | 62 | 31 | -31 | Solid → Developing |
| rhysarion / nyrena / dawnseeker | 62 | 31 | -31 | Solid → Developing |
| rhysarion / feskar / arulix | 69 | 38 | -31 | Solid → Developing |
| rhysarion / arulix / feskar | 69 | 38 | -31 | Solid → Developing |
| nyrena / vesper / seasmoke | 66 | 35 | -31 | Solid → Developing |
| feskar / arulix / rhysarion | 69 | 38 | -31 | Solid → Developing |
| dawnseeker / vesper / solstryker | 66 | 35 | -31 | Solid → Developing |
| dawnseeker / nyrena / kalspire | 65 | 34 | -31 | Solid → Developing |
| dawnseeker / nyrena / arulix | 65 | 34 | -31 | Solid → Developing |
| arulix / feskar / rhysarion | 69 | 38 | -31 | Solid → Developing |
| tashix / vesper / dawnseeker | 62 | 32 | -30 | Solid → Developing |
| dawnseeker / nyrena / solstryker | 64 | 34 | -30 | Solid → Developing |
| bevlorin / nyrena / dawnseeker | 62 | 32 | -30 | Solid → Developing |
| tessarion / nyrena / kalspire | 71 | 42 | -29 | Solid → Developing |

## Findings

- FRR-F001 (informational, unsupported by current simple evaluator): 1 curated signal(s) use an unresolved group selector and intentionally create no guessed scored relationship.
- FRR-F002 (informational, unresolved by design): Canonical combat-stat values are incomplete, so highest-stat recipients remain unresolved and receive neither relationship credit nor Kit Utilization penalties.

## Compatibility and release

- Source schema remains 13; local and cloud roster schemas remain 5; no Supabase migration was added.
- Dragon source data, curated profiles, and all 224 curated signals are unchanged.
- The old hash is not preserved; the new hash is a reviewed baseline for the replacement public contract.
- The complete old/new comparison is validated in memory. An ignored full diagnostic JSON can be generated explicitly with `npm run audit:full-roster:write-json`.

## Rerun

```powershell
pnpm run audit:full-roster
```
