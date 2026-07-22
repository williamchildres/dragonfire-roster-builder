# Power-Aware optimizer audit · live-regression

- Audit version: 0.19.1
- Roster insertion order: forward
- Formation Rating v2 hash: `5678952ad31630f7702fc2c56c6c9c5378b2445292696e39accb58f078ba9baf`
- Command runtime: 52161.6 ms
- Solver passes: 135
- Phase timings: `{"modelConstructionMs":1373.9761000000035,"primaryPowerMs":0,"primaryRarityMs":0,"primaryQualityMs":9540.9519,"backupPowerMs":310.14080000000104,"backupRarityMs":0,"backupQualityMs":2214.9166000000005,"stableKeyMs":27532.111899999993}`
- Unused dragons: arrax, shadowrend, solstryker
- Solution hash: `fnv1a64:9bdfa210548f107d`
- Result hash: `fnv1a64:e4477552a15d4696`
- Optimal solver status: PASS
- Integrality tolerance: 1e-7
- Maximum integrality residual: 1.1169512427218937e-11
- Maximum constraint residual: 2.9831426218152046e-9
- All fixed phases exactly revalidated: PASS

## Numerical-exactness diagnosis

- Confirmed case: Case A — integral feasible assignment with a contaminated reported objective.
- Phase: backup stable solution key; stable chunk 0–48; solver pass 23.
- Raw / reconstructed objective: 0.8403320312499968 / 0; absolute delta 0.8403320312499968.
- Solver status / MIP gap: optimal / 0.
- Integrality / constraint residual: 2.042810365310288e-14 / 4.3655745685100555e-11.
- Exact-optimum certification: PASS; maximize bound 1; status infeasible; solver pass 24.
- Fix: reconstruct exact safe-integer phase values from strictly validated Boolean/integer variables, then certify materially contaminated values with a fresh one-integer improvement feasibility probe before fixation. Zero-gap solving and lexicographic stable-key semantics are unchanged.

## Per-dragon Estimated Power

| Dragon | Progression | v1 | v2 | Delta | Confidence |
| --- | --- | ---: | ---: | ---: | --- |
| sunfyre | Legendary 2/26 | 18050 | 18320 | +270 | modeled -> modeled |
| tairax | Epic 2/26 | 14130 | 13940 | -190 | modeled -> modeled |
| syrax | Legendary 1/37 | 23460 | 23400 | -60 | low -> observed |
| vhagar | Legendary 4/38 | 31470 | 33040 | +1570 | low -> observed |
| caraxes | Legendary 2/37 | 25890 | 25620 | -270 | low -> observed |
| seasmoke | Legendary 1/37 | 23460 | 23400 | -60 | low -> observed |
| solstryker | Rare 4/25 | 11600 | 11400 | -200 | modeled -> observed |
| crimson | Legendary 2/38 | 26600 | 26620 | +20 | low -> observed |
| kalspire | Legendary 3/37 | 28320 | 28020 | -300 | low -> observed |
| malachite | Legendary 1/37 | 23460 | 23400 | -60 | low -> observed |
| venator | Legendary 1/37 | 23460 | 23400 | -60 | low -> observed |
| daemoros | Epic 2/38 | 20020 | 20540 | +520 | low -> observed |
| feskar | Epic 2/32 | 17080 | 16540 | -540 | modeled -> observed |
| rhysarion | Epic 4/37 | 24400 | 23580 | -820 | low -> observed |
| shadowsong | Epic 3/37 | 21970 | 21140 | -830 | low -> observed |
| tashix | Epic 4/37 | 24400 | 23580 | -820 | low -> observed |
| vaeldra | Epic 3/32 | 19510 | 18140 | -1370 | modeled -> observed |
| velar | Epic 4/37 | 24400 | 23580 | -820 | low -> observed |
| zivern | Epic 2/31 | 16540 | 16540 | 0 | observed -> observed |
| antares | Rare 4/30 | 13400 | 13400 | 0 | observed -> observed |
| shimmer | Rare 4/30 | 13400 | 13400 | 0 | observed -> observed |
| jagadrix | Rare 7/31 | 21280 | 19850 | -1430 | low -> observed |
| bevlorin | Rare 4/31 | 13970 | 13600 | -370 | low -> observed |
| shadowrend | Rare 3/31 | 12050 | 12250 | +200 | low -> observed |
| thunderstrike | Rare 4/31 | 13970 | 13600 | -370 | low -> observed |
| vesper | Rare 4/30 | 13400 | 13400 | 0 | observed -> observed |
| arulix | Rare 4/30 | 13400 | 13400 | 0 | observed -> observed |
| nyrena | Rare 4/30 | 13400 | 13400 | 0 | observed -> observed |
| dawnseeker | Rare 4/29 | 13000 | 13000 | 0 | observed -> observed |
| arrax | Rare 3/31 | 12050 | 12250 | +200 | low -> observed |
| tessarion | Epic 6/37 | 30820 | 30820 | 0 | low -> observed |
| sheepstealer | Legendary 2/37 | 25890 | 25620 | -270 | low -> observed |
| vermax | Epic 2/32 | 17080 | 16540 | -540 | modeled -> observed |

## Primary

- Dragons: caraxes, crimson, daemoros, kalspire, malachite, rhysarion, seasmoke, shadowsong, sheepstealer, syrax, tashix, tessarion, velar, venator, vhagar
- Total Estimated Power: 375760
- Formation ratings: 59, 56, 52, 42, 41
- Power confidence: {"observed":15,"modeled":0,"low":0}

## Backup

- Dragons: antares, arulix, bevlorin, dawnseeker, feskar, jagadrix, nyrena, shimmer, sunfyre, tairax, thunderstrike, vaeldra, vermax, vesper, zivern
- Total Estimated Power: 227070
- Formation ratings: 58, 49, 43, 43, 42
- Power confidence: {"observed":13,"modeled":2,"low":0}
