# Power-Aware optimizer audit · all-one

- Audit version: 0.20.0
- Roster insertion order: forward
- Formation Rating v2 hash: `5678952ad31630f7702fc2c56c6c9c5378b2445292696e39accb58f078ba9baf`
- Command runtime: 81892.1 ms
- Solver passes: 233
- Phase timings: `{"modelConstructionMs":1020.4948999999979,"primaryPowerMs":0,"primaryRarityMs":0,"primaryQualityMs":8530.597200000004,"backupPowerMs":244.90239999999903,"backupRarityMs":0,"backupQualityMs":2167.5212999999967,"stableKeyMs":58916.182100000005}`
- Unused dragons: shimmer, thunderstrike, vesper
- Solution hash: `fnv1a64:96840bafecd63d34`
- Result hash: `fnv1a64:f2036affa8db5679`
- Optimal solver status: PASS
- Integrality tolerance: 1e-7
- Maximum integrality residual: 6.661338147750939e-16
- Maximum constraint residual: 1.1368683772161603e-13
- All fixed phases exactly revalidated: PASS

## Before v2 comparison

- Primary added / removed: sunfyre, tairax / daemoros, tessarion
- Backup added / removed: daemoros, tessarion / shimmer, thunderstrike
- Unused dragons: vesper -> shimmer, thunderstrike, vesper
- Primary Power: 7830 -> 7950 (+120)
- Backup Power: 4880 -> 5220 (+340)
- Solution hash: `fnv1a64:ac1d8d6d903c412b` -> `fnv1a64:96840bafecd63d34`
- Result hash: `fnv1a64:b691b4886b8a41ba` -> `fnv1a64:f2036affa8db5679`

## Per-dragon Estimated Power

| Dragon | Progression | v1 | v2 | Delta | Confidence |
| --- | --- | ---: | ---: | ---: | --- |
| sunfyre | Legendary 1/1 | 570 | 570 | 0 | low -> low |
| tairax | Epic 1/1 | 440 | 450 | +10 | low -> low |
| syrax | Legendary 1/1 | 570 | 570 | 0 | low -> low |
| vhagar | Legendary 1/1 | 570 | 570 | 0 | low -> low |
| caraxes | Legendary 1/1 | 570 | 570 | 0 | low -> low |
| seasmoke | Legendary 1/1 | 570 | 570 | 0 | low -> low |
| solstryker | Rare 1/1 | 120 | 280 | +160 | low -> low |
| crimson | Legendary 1/1 | 570 | 570 | 0 | low -> low |
| kalspire | Legendary 1/1 | 570 | 570 | 0 | low -> low |
| malachite | Legendary 1/1 | 570 | 570 | 0 | low -> low |
| venator | Legendary 1/1 | 570 | 570 | 0 | low -> low |
| daemoros | Epic 1/1 | 440 | 450 | +10 | low -> low |
| feskar | Epic 1/1 | 440 | 450 | +10 | low -> low |
| rhysarion | Epic 1/1 | 440 | 450 | +10 | low -> low |
| shadowsong | Epic 1/1 | 440 | 450 | +10 | low -> low |
| tashix | Epic 1/1 | 440 | 450 | +10 | low -> low |
| vaeldra | Epic 1/1 | 440 | 450 | +10 | low -> low |
| velar | Epic 1/1 | 440 | 450 | +10 | low -> low |
| zivern | Epic 1/1 | 440 | 450 | +10 | low -> low |
| antares | Rare 1/1 | 120 | 280 | +160 | low -> low |
| shimmer | Rare 1/1 | 120 | 280 | +160 | low -> low |
| jagadrix | Rare 1/1 | 120 | 280 | +160 | low -> low |
| bevlorin | Rare 1/1 | 120 | 280 | +160 | low -> low |
| shadowrend | Rare 1/1 | 120 | 280 | +160 | low -> low |
| thunderstrike | Rare 1/1 | 120 | 280 | +160 | low -> low |
| vesper | Rare 1/1 | 120 | 280 | +160 | low -> low |
| arulix | Rare 1/1 | 120 | 280 | +160 | low -> low |
| nyrena | Rare 1/1 | 120 | 280 | +160 | low -> low |
| dawnseeker | Rare 1/1 | 120 | 280 | +160 | low -> low |
| arrax | Rare 1/1 | 120 | 280 | +160 | low -> low |
| tessarion | Epic 1/1 | 440 | 450 | +10 | low -> low |
| sheepstealer | Legendary 1/1 | 570 | 570 | 0 | low -> low |
| vermax | Epic 1/1 | 440 | 450 | +10 | low -> low |

## Primary

- Dragons: caraxes, crimson, kalspire, malachite, rhysarion, seasmoke, sheepstealer, sunfyre, syrax, tairax, velar, venator, vermax, vhagar, zivern
- Total Estimated Power: 7950
- Formation ratings: 47, 41, 40, 37, 37
- Power confidence: {"observed":0,"modeled":0,"low":15}

## Backup

- Dragons: antares, arrax, arulix, bevlorin, daemoros, dawnseeker, feskar, jagadrix, nyrena, shadowrend, shadowsong, solstryker, tashix, tessarion, vaeldra
- Total Estimated Power: 5220
- Formation ratings: 32, 32, 20, 20, 20
- Power confidence: {"observed":0,"modeled":0,"low":15}
