# Power-Aware optimizer audit · all-one

- Audit version: 0.17.0
- Formation Rating v2 hash: `12ee9dc58012cd4edd14ea3d095da32e2db6bf5cca6a1f8d77c24be8506eded9`
- Command runtime: 65169.3 ms
- Solver passes: 198
- Phase timings: `{"modelConstructionMs":718.7205000000049,"primaryPowerMs":0,"primaryRarityMs":0,"primaryQualityMs":6594.124400000001,"backupPowerMs":236.91600000000108,"backupRarityMs":0,"backupQualityMs":2804.7252999999964,"stableKeyMs":45993.21560000007}`
- Unused dragon: vesper
- Solution hash: `fnv1a64:ac1d8d6d903c412b`
- Result hash: `fnv1a64:b691b4886b8a41ba`
- Optimal solver status: PASS

## Before v2 comparison

- Primary added / removed: none / none
- Backup added / removed: none / none
- Unused dragon: vesper -> vesper
- Primary Power: 7770 -> 7830 (+60)
- Backup Power: 3080 -> 4880 (+1800)
- Solution hash: `fnv1a64:3bfb35af17d6a77a` -> `fnv1a64:ac1d8d6d903c412b`
- Result hash: `fnv1a64:b1df01505769e0c5` -> `fnv1a64:b691b4886b8a41ba`

## Per-dragon Estimated Power

| Dragon | Progression | v1 | v2 | Delta | Confidence |
| --- | --- | ---: | ---: | ---: | --- |
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

- Dragons: caraxes, crimson, daemoros, kalspire, malachite, rhysarion, seasmoke, sheepstealer, syrax, tessarion, velar, venator, vermax, vhagar, zivern
- Total Estimated Power: 7830
- Formation ratings: 49, 47, 37, 32, 32
- Power confidence: {"observed":0,"modeled":0,"low":15}

## Backup

- Dragons: antares, arrax, arulix, bevlorin, dawnseeker, feskar, jagadrix, nyrena, shadowrend, shadowsong, shimmer, solstryker, tashix, thunderstrike, vaeldra
- Total Estimated Power: 4880
- Formation ratings: 32, 32, 20, 20, 20
- Power confidence: {"observed":0,"modeled":0,"low":15}
