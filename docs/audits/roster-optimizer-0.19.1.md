# Roster Optimizer strategies deterministic audit

Formation Rating v2 hash: `5678952ad31630f7702fc2c56c6c9c5378b2445292696e39accb58f078ba9baf`

Strict HiGHS gaps: `mip_rel_gap=0`, `mip_abs_gap=0`, accepted through `Highs_setDoubleOptionValue` status 0. Zero-gap refinement independently confirmed the existing allocations and hashes.

## all-31-maxed · best-ten-overall

- Eligible dragons: 31
- Trio candidates: 4495
- Used: antares, arrax, bevlorin, caraxes, crimson, daemoros, dawnseeker, feskar, jagadrix, kalspire, malachite, nyrena, rhysarion, seasmoke, shadowrend, shadowsong, sheepstealer, shimmer, solstryker, syrax, tashix, tessarion, thunderstrike, vaeldra, velar, venator, vermax, vesper, vhagar, zivern
- Unused: arulix
- Runtime (candidate / solver / total): 2374.2 / 3904.1 / 6280.5 ms
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
- Runtime (candidate / solver / total): 2092.1 / 38405.3 / 40498.6 ms
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
- Runtime (candidate / solver / total): 1953.1 / 4155.8 / 6109.5 ms
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
- Runtime (candidate / solver / total): 2078.8 / 52024.3 / 54103.5 ms
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

## archived-mixed · power-aware-primary-five-backup-five

- Eligible dragons: 31
- Trio candidates: 4495
- Used: arrax, arulix, bevlorin, caraxes, crimson, daemoros, dawnseeker, feskar, jagadrix, kalspire, malachite, nyrena, rhysarion, seasmoke, shadowrend, shadowsong, sheepstealer, shimmer, solstryker, syrax, tashix, tessarion, thunderstrike, vaeldra, velar, venator, vermax, vesper, vhagar, zivern
- Unused: antares
- Runtime (candidate / solver / total): 1786.9 / 28810.3 / 30599.8 ms
- Solver passes / nodes: 104 / 21
- Exact optimality: PASS
- Solution hash: `fnv1a64:d4825beceda28c08`
- Result hash: `fnv1a64:e21b2e94174014f0`

### Primary · 262 / 52.4 / 42

Rarity: {"Legendary":6,"Epic":6,"Rare":3}

| # | Left Flank | Vanguard | Right Flank | Rating | Tier |
| -: | --- | --- | --- | -: | --- |
| 1 | sheepstealer | seasmoke | tashix | 67 | Strong |
| 2 | kalspire | zivern | vesper | 59 | Solid |
| 3 | caraxes | crimson | velar | 47 | Developing |
| 4 | daemoros | shadowsong | venator | 47 | Developing |
| 5 | feskar | dawnseeker | jagadrix | 42 | Developing |

### Backup · 237 / 47.4 / 37

Rarity: {"Legendary":3,"Epic":4,"Rare":8}

| # | Left Flank | Vanguard | Right Flank | Rating | Tier |
| -: | --- | --- | --- | -: | --- |
| 1 | malachite | arrax | thunderstrike | 53 | Solid |
| 2 | bevlorin | tessarion | nyrena | 53 | Solid |
| 3 | shadowrend | shimmer | vermax | 53 | Solid |
| 4 | arulix | rhysarion | syrax | 41 | Developing |
| 5 | solstryker | vaeldra | vhagar | 37 | Developing |

Combined total / average: 499 / 49.9

## archived-maxed · power-aware-primary-five-backup-five

- Eligible dragons: 31
- Trio candidates: 4495
- Used: antares, arrax, bevlorin, caraxes, crimson, daemoros, dawnseeker, feskar, jagadrix, kalspire, malachite, nyrena, rhysarion, seasmoke, shadowrend, shadowsong, sheepstealer, shimmer, solstryker, syrax, tashix, tessarion, thunderstrike, vaeldra, velar, venator, vermax, vesper, vhagar, zivern
- Unused: arulix
- Runtime (candidate / solver / total): 2118.8 / 14895.7 / 17017.0 ms
- Solver passes / nodes: 29 / 19
- Exact optimality: PASS
- Solution hash: `fnv1a64:dac72be1907be1fa`
- Result hash: `fnv1a64:5e7a104f93d9ee11`

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

## archived-all-one · power-aware-primary-five-backup-five

- Eligible dragons: 31
- Trio candidates: 4495
- Used: antares, arrax, arulix, bevlorin, caraxes, crimson, daemoros, dawnseeker, feskar, jagadrix, kalspire, malachite, nyrena, rhysarion, seasmoke, shadowrend, shadowsong, sheepstealer, shimmer, solstryker, syrax, tashix, tessarion, thunderstrike, vaeldra, velar, venator, vermax, vhagar, zivern
- Unused: vesper
- Runtime (candidate / solver / total): 1801.2 / 57898.5 / 59701.3 ms
- Solver passes / nodes: 198 / 188
- Exact optimality: PASS
- Solution hash: `fnv1a64:ac1d8d6d903c412b`
- Result hash: `fnv1a64:b691b4886b8a41ba`

### Primary · 197 / 39.4 / 32

Rarity: {"Legendary":9,"Epic":6,"Rare":0}

| # | Left Flank | Vanguard | Right Flank | Rating | Tier |
| -: | --- | --- | --- | -: | --- |
| 1 | tessarion | velar | zivern | 49 | Solid |
| 2 | caraxes | seasmoke | syrax | 47 | Developing |
| 3 | kalspire | malachite | vermax | 37 | Developing |
| 4 | crimson | rhysarion | sheepstealer | 32 | Developing |
| 5 | daemoros | venator | vhagar | 32 | Developing |

### Backup · 124 / 24.8 / 20

Rarity: {"Legendary":0,"Epic":4,"Rare":11}

| # | Left Flank | Vanguard | Right Flank | Rating | Tier |
| -: | --- | --- | --- | -: | --- |
| 1 | antares | arrax | solstryker | 32 | Developing |
| 2 | shadowrend | shadowsong | shimmer | 32 | Developing |
| 3 | arulix | bevlorin | dawnseeker | 20 | Weak |
| 4 | feskar | jagadrix | nyrena | 20 | Weak |
| 5 | tashix | thunderstrike | vaeldra | 20 | Weak |

Combined total / average: 321 / 32.1

## all-33-maxed · best-ten-overall

- Eligible dragons: 33
- Trio candidates: 5456
- Used: antares, arrax, bevlorin, caraxes, crimson, daemoros, dawnseeker, feskar, kalspire, malachite, nyrena, rhysarion, seasmoke, shadowrend, shadowsong, sheepstealer, shimmer, solstryker, sunfyre, syrax, tairax, tashix, tessarion, vaeldra, velar, venator, vermax, vesper, vhagar, zivern
- Unused: arulix, jagadrix, thunderstrike
- Runtime (candidate / solver / total): 2706.1 / 3185.4 / 5891.8 ms
- Solver passes / nodes: 15 / 15
- Exact optimality: PASS
- Solution hash: `fnv1a64:113ff28410a75d4d`
- Result hash: `fnv1a64:ae9027fbe4547eb6`

- Total / average / minimum rating: 788 / 78.8 / 66

| # | Left Flank | Vanguard | Right Flank | Rating | Tier |
| -: | --- | --- | --- | -: | --- |
| 1 | zivern | shadowsong | seasmoke | 100 | Excellent |
| 2 | vesper | shimmer | syrax | 86 | Excellent |
| 3 | shadowrend | arrax | kalspire | 80 | Excellent |
| 4 | bevlorin | tashix | tessarion | 80 | Excellent |
| 5 | feskar | dawnseeker | caraxes | 78 | Strong |
| 6 | solstryker | antares | velar | 78 | Strong |
| 7 | vaeldra | rhysarion | nyrena | 75 | Strong |
| 8 | daemoros | tairax | venator | 73 | Strong |
| 9 | sunfyre | vhagar | crimson | 72 | Strong |
| 10 | malachite | sheepstealer | vermax | 66 | Solid |

## all-33-maxed · primary-five-backup-five

- Eligible dragons: 33
- Trio candidates: 5456
- Used: antares, arrax, bevlorin, caraxes, crimson, daemoros, dawnseeker, feskar, kalspire, malachite, nyrena, rhysarion, seasmoke, shadowrend, shadowsong, sheepstealer, shimmer, sunfyre, syrax, tairax, tashix, tessarion, thunderstrike, vaeldra, velar, venator, vermax, vesper, vhagar, zivern
- Unused: arulix, jagadrix, solstryker
- Runtime (candidate / solver / total): 2580.1 / 47425.1 / 50005.4 ms
- Solver passes / nodes: 32 / 31
- Exact optimality: PASS
- Solution hash: `fnv1a64:b130b15bc02de861`
- Result hash: `fnv1a64:da000c6752e41fbb`

### Primary · 406 / 81.2 / 66

Rarity: {"Legendary":10,"Epic":5,"Rare":0}

| # | Left Flank | Vanguard | Right Flank | Rating | Tier |
| -: | --- | --- | --- | -: | --- |
| 1 | zivern | shadowsong | seasmoke | 100 | Excellent |
| 2 | crimson | tairax | vhagar | 90 | Excellent |
| 3 | syrax | sunfyre | caraxes | 78 | Strong |
| 4 | venator | rhysarion | malachite | 72 | Strong |
| 5 | velar | sheepstealer | kalspire | 66 | Solid |

### Backup · 339 / 67.8 / 53

Rarity: {"Legendary":0,"Epic":6,"Rare":9}

| # | Left Flank | Vanguard | Right Flank | Rating | Tier |
| -: | --- | --- | --- | -: | --- |
| 1 | bevlorin | tashix | tessarion | 80 | Excellent |
| 2 | shadowrend | thunderstrike | arrax | 77 | Strong |
| 3 | antares | shimmer | vesper | 68 | Strong |
| 4 | nyrena | dawnseeker | vermax | 61 | Solid |
| 5 | feskar | vaeldra | daemoros | 53 | Solid |

Combined total / average: 745 / 74.5

## Exactness checks

- Greedy counterexample: 101 greedy vs 120 exact — PASS
- Small fixtures match independent brute-force enumeration — PASS
- Reversed input ordering is stable — PASS
- Used and unused dragons partition each eligible roster — PASS
