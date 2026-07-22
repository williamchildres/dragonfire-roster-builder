# Roster Optimizer strategies deterministic audit

Formation Rating v2 hash: `12ee9dc58012cd4edd14ea3d095da32e2db6bf5cca6a1f8d77c24be8506eded9`

Strict HiGHS gaps: `mip_rel_gap=0`, `mip_abs_gap=0`, accepted through `Highs_setDoubleOptionValue` status 0. Zero-gap refinement independently confirmed the existing allocations and hashes.

## all-31-maxed · best-ten-overall

- Eligible dragons: 31
- Trio candidates: 4495
- Used: antares, arrax, bevlorin, caraxes, crimson, daemoros, dawnseeker, feskar, jagadrix, kalspire, malachite, nyrena, rhysarion, seasmoke, shadowrend, shadowsong, sheepstealer, shimmer, solstryker, syrax, tashix, tessarion, thunderstrike, vaeldra, velar, venator, vermax, vesper, vhagar, zivern
- Unused: arulix
- Runtime (candidate / solver / total): 2140.9 / 4061.1 / 6203.8 ms
- Solver passes / nodes: 15 / 13
- Exact optimality: PASS
- Solution hash: `fnv1a64:49b0498718c54d6a`
- Result hash: `fnv1a64:333c8e8ab8039578`

- Total / average / minimum rating: 764 / 76.4 / 62

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

## all-31-maxed · primary-five-backup-five

- Eligible dragons: 31
- Trio candidates: 4495
- Used: antares, arrax, bevlorin, caraxes, crimson, daemoros, dawnseeker, feskar, jagadrix, kalspire, malachite, nyrena, rhysarion, seasmoke, shadowrend, shadowsong, sheepstealer, shimmer, solstryker, syrax, tashix, tessarion, thunderstrike, vaeldra, velar, venator, vermax, vesper, vhagar, zivern
- Unused: arulix
- Runtime (candidate / solver / total): 1804.5 / 36654.4 / 38460.0 ms
- Solver passes / nodes: 32 / 23
- Exact optimality: PASS
- Solution hash: `fnv1a64:01c8a6531720fc7e`
- Result hash: `fnv1a64:94b3515fdbf6dc40`

### Primary · 398 / 79.6 / 61

Rarity: {"Legendary":9,"Epic":6,"Rare":0}

| # | Left Flank | Vanguard | Right Flank | Rating | Tier |
| -: | --- | --- | --- | -: | --- |
| 1 | zivern | shadowsong | seasmoke | 100 | Excellent |
| 2 | feskar | caraxes | syrax | 88 | Excellent |
| 3 | crimson | rhysarion | vhagar | 75 | Strong |
| 4 | velar | sheepstealer | tessarion | 74 | Strong |
| 5 | kalspire | venator | malachite | 61 | Solid |

### Backup · 327 / 65.4 / 52

Rarity: {"Legendary":0,"Epic":4,"Rare":11}

| # | Left Flank | Vanguard | Right Flank | Rating | Tier |
| -: | --- | --- | --- | -: | --- |
| 1 | shadowrend | thunderstrike | arrax | 77 | Strong |
| 2 | dawnseeker | tashix | bevlorin | 70 | Strong |
| 3 | vermax | shimmer | vesper | 66 | Solid |
| 4 | nyrena | antares | solstryker | 62 | Solid |
| 5 | daemoros | jagadrix | vaeldra | 52 | Solid |

Combined total / average: 725 / 72.5

## mixed-progression · best-ten-overall

- Eligible dragons: 31
- Trio candidates: 4495
- Used: antares, arrax, bevlorin, caraxes, crimson, daemoros, dawnseeker, feskar, jagadrix, kalspire, malachite, nyrena, rhysarion, seasmoke, shadowrend, shadowsong, sheepstealer, shimmer, solstryker, syrax, tashix, tessarion, thunderstrike, vaeldra, velar, venator, vermax, vesper, vhagar, zivern
- Unused: arulix
- Runtime (candidate / solver / total): 1735.6 / 3858.8 / 5594.9 ms
- Solver passes / nodes: 13 / 8
- Exact optimality: PASS
- Solution hash: `fnv1a64:fc0005be3f0af3ed`
- Result hash: `fnv1a64:c048c5b097ac047c`

- Total / average / minimum rating: 553 / 55.3 / 40

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

## mixed-progression · primary-five-backup-five

- Eligible dragons: 31
- Trio candidates: 4495
- Used: antares, arrax, arulix, bevlorin, caraxes, crimson, daemoros, dawnseeker, feskar, kalspire, malachite, nyrena, rhysarion, seasmoke, shadowrend, shadowsong, sheepstealer, shimmer, solstryker, syrax, tashix, tessarion, thunderstrike, vaeldra, velar, venator, vermax, vesper, vhagar, zivern
- Unused: jagadrix
- Runtime (candidate / solver / total): 1599.7 / 47468.8 / 49068.8 ms
- Solver passes / nodes: 28 / 28
- Exact optimality: PASS
- Solution hash: `fnv1a64:03625b38711584a7`
- Result hash: `fnv1a64:dc2e1fb1e78c6a18`

### Primary · 283 / 56.6 / 43

Rarity: {"Legendary":9,"Epic":6,"Rare":0}

| # | Left Flank | Vanguard | Right Flank | Rating | Tier |
| -: | --- | --- | --- | -: | --- |
| 1 | kalspire | shadowsong | zivern | 67 | Strong |
| 2 | sheepstealer | seasmoke | tashix | 67 | Strong |
| 3 | caraxes | syrax | velar | 55 | Solid |
| 4 | crimson | daemoros | vhagar | 51 | Solid |
| 5 | malachite | venator | vermax | 43 | Developing |

### Backup · 242 / 48.4 / 40

Rarity: {"Legendary":0,"Epic":4,"Rare":11}

| # | Left Flank | Vanguard | Right Flank | Rating | Tier |
| -: | --- | --- | --- | -: | --- |
| 1 | shimmer | dawnseeker | nyrena | 58 | Solid |
| 2 | antares | bevlorin | tessarion | 52 | Solid |
| 3 | rhysarion | arulix | vesper | 51 | Solid |
| 4 | feskar | arrax | thunderstrike | 41 | Developing |
| 5 | shadowrend | solstryker | vaeldra | 40 | Developing |

Combined total / average: 525 / 52.5

## Exactness checks

- Greedy counterexample: 101 greedy vs 120 exact — PASS
- Small fixtures match independent brute-force enumeration — PASS
- Reversed input ordering is stable — PASS
- Used and unused dragons partition each eligible roster — PASS
