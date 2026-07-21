# Roster Optimizer v1 deterministic audit

Formation Rating v2 hash: `12ee9dc58012cd4edd14ea3d095da32e2db6bf5cca6a1f8d77c24be8506eded9`

Strict HiGHS gaps: `mip_rel_gap=0`, `mip_abs_gap=0`, accepted through `Highs_setDoubleOptionValue` status 0. Zero-gap refinement independently confirmed the existing allocations and hashes.

## all-31-maxed

- Eligible dragons: 31
- Trio candidates: 4495
- Total / average / minimum rating: 764 / 76.4 / 62
- Used: antares, arrax, bevlorin, caraxes, crimson, daemoros, dawnseeker, feskar, jagadrix, kalspire, malachite, nyrena, rhysarion, seasmoke, shadowrend, shadowsong, sheepstealer, shimmer, solstryker, syrax, tashix, tessarion, thunderstrike, vaeldra, velar, venator, vermax, vesper, vhagar, zivern
- Unused: arulix
- Runtime (candidate / solver / total): 2380.5 / 3919.8 / 6302.0 ms
- Solver passes / nodes: 15 / 13
- Exact optimality: PASS
- Result hash: `fnv1a64:49b0498718c54d6a`

| # | Left Flank | Vanguard | Right Flank | Rating | Tier |
| -: | --- | --- | --- | -: | --- |
| 1 | zivern | shadowsong | seasmoke | 100 | Excellent |
| 2 | vesper | shimmer | syrax | 86 | Excellent |
| 3 | bevlorin | tashix | tessarion | 80 | Excellent |
| 4 | crimson | rhysarion | vaeldra | 80 | Excellent |
| 5 | feskar | dawnseeker | caraxes | 78 | Strong |
| 6 | solstryker | antares | velar | 78 | Strong |
| 7 | shadowrend | venator | vermax | 67 | Strong |
| 8 | kalspire | arrax | thunderstrike | 67 | Strong |
| 9 | malachite | sheepstealer | nyrena | 66 | Solid |
| 10 | daemoros | jagadrix | vhagar | 62 | Solid |

## mixed-progression

- Eligible dragons: 31
- Trio candidates: 4495
- Total / average / minimum rating: 553 / 55.3 / 40
- Used: antares, arrax, bevlorin, caraxes, crimson, daemoros, dawnseeker, feskar, jagadrix, kalspire, malachite, nyrena, rhysarion, seasmoke, shadowrend, shadowsong, sheepstealer, shimmer, solstryker, syrax, tashix, tessarion, thunderstrike, vaeldra, velar, venator, vermax, vesper, vhagar, zivern
- Unused: arulix
- Runtime (candidate / solver / total): 1788.3 / 4274.1 / 6062.6 ms
- Solver passes / nodes: 13 / 8
- Exact optimality: PASS
- Result hash: `fnv1a64:fc0005be3f0af3ed`

| # | Left Flank | Vanguard | Right Flank | Rating | Tier |
| -: | --- | --- | --- | -: | --- |
| 1 | shadowsong | solstryker | zivern | 72 | Strong |
| 2 | sheepstealer | seasmoke | tashix | 67 | Strong |
| 3 | kalspire | shadowrend | velar | 64 | Solid |
| 4 | nyrena | caraxes | syrax | 60 | Solid |
| 5 | malachite | arrax | thunderstrike | 53 | Solid |
| 6 | vesper | dawnseeker | jagadrix | 53 | Solid |
| 7 | antares | bevlorin | tessarion | 52 | Solid |
| 8 | daemoros | venator | vhagar | 47 | Developing |
| 9 | crimson | rhysarion | vaeldra | 45 | Developing |
| 10 | shimmer | vermax | feskar | 40 | Developing |

## Exactness checks

- Greedy counterexample: 101 greedy vs 120 exact — PASS
- Small fixtures match independent brute-force enumeration — PASS
- Reversed input ordering is stable — PASS
- Used and unused dragons partition each eligible roster — PASS
