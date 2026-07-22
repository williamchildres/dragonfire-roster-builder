# Power-Aware optimizer audit · maxed

- Audit version: 0.19.0
- Formation Rating v2 hash: `5678952ad31630f7702fc2c56c6c9c5378b2445292696e39accb58f078ba9baf`
- Command runtime: 29865.4 ms
- Solver passes: 29
- Phase timings: `{"modelConstructionMs":1058.1306999999997,"primaryPowerMs":0,"primaryRarityMs":0,"primaryQualityMs":15256.44,"backupPowerMs":300.1137000000017,"backupRarityMs":0,"backupQualityMs":3005.131499999996,"stableKeyMs":957.9573000000055}`
- Unused dragons: arulix, jagadrix, solstryker
- Solution hash: `fnv1a64:20f6c2b5d317da21`
- Result hash: `fnv1a64:88dbf25793bc93e4`
- Optimal solver status: PASS

## Before v2 comparison

- Primary added / removed: sunfyre, tairax / feskar, tessarion
- Backup added / removed: feskar, tessarion / jagadrix, solstryker
- Unused dragons: arulix -> arulix, jagadrix, solstryker
- Primary Power: 376170 -> 380200 (+4030)
- Backup Power: 265760 -> 279240 (+13480)
- Solution hash: `fnv1a64:dac72be1907be1fa` -> `fnv1a64:20f6c2b5d317da21`
- Result hash: `fnv1a64:5e7a104f93d9ee11` -> `fnv1a64:88dbf25793bc93e4`

## Per-dragon Estimated Power

| Dragon | Progression | v1 | v2 | Delta | Confidence |
| --- | --- | ---: | ---: | ---: | --- |
| sunfyre | Legendary 10/16 | 26600 | 26690 | +90 | low -> low |
| tairax | Epic 10/16 | 24530 | 22660 | -1870 | low -> low |
| syrax | Legendary 10/16 | 26600 | 26690 | +90 | low -> low |
| vhagar | Legendary 10/16 | 26600 | 26690 | +90 | low -> low |
| caraxes | Legendary 10/16 | 26600 | 26690 | +90 | low -> low |
| seasmoke | Legendary 10/16 | 26600 | 26690 | +90 | low -> low |
| solstryker | Rare 10/16 | 19380 | 15920 | -3460 | low -> low |
| crimson | Legendary 10/16 | 26600 | 26690 | +90 | low -> low |
| kalspire | Legendary 10/16 | 26600 | 26690 | +90 | low -> low |
| malachite | Legendary 10/16 | 26600 | 26690 | +90 | low -> low |
| venator | Legendary 10/16 | 26600 | 26690 | +90 | low -> low |
| daemoros | Epic 10/16 | 24530 | 22660 | -1870 | low -> low |
| feskar | Epic 10/16 | 24530 | 22660 | -1870 | low -> low |
| rhysarion | Epic 10/16 | 24530 | 22660 | -1870 | low -> low |
| shadowsong | Epic 10/16 | 24530 | 22660 | -1870 | low -> low |
| tashix | Epic 10/16 | 24530 | 22660 | -1870 | low -> low |
| vaeldra | Epic 10/16 | 24530 | 22660 | -1870 | low -> low |
| velar | Epic 10/16 | 24530 | 22660 | -1870 | low -> low |
| zivern | Epic 10/16 | 24530 | 22660 | -1870 | low -> low |
| antares | Rare 10/16 | 19380 | 15920 | -3460 | low -> low |
| shimmer | Rare 10/16 | 19380 | 15920 | -3460 | low -> low |
| jagadrix | Rare 10/16 | 19380 | 15920 | -3460 | low -> low |
| bevlorin | Rare 10/16 | 19380 | 15920 | -3460 | low -> low |
| shadowrend | Rare 10/16 | 19380 | 15920 | -3460 | low -> low |
| thunderstrike | Rare 10/16 | 19380 | 15920 | -3460 | low -> low |
| vesper | Rare 10/16 | 19380 | 15920 | -3460 | low -> low |
| arulix | Rare 10/16 | 19380 | 15920 | -3460 | low -> low |
| nyrena | Rare 10/16 | 19380 | 15920 | -3460 | low -> low |
| dawnseeker | Rare 10/16 | 19380 | 15920 | -3460 | low -> low |
| arrax | Rare 10/16 | 19380 | 15920 | -3460 | low -> low |
| tessarion | Epic 10/16 | 24530 | 22660 | -1870 | low -> low |
| sheepstealer | Legendary 10/16 | 26600 | 26690 | +90 | low -> low |
| vermax | Epic 10/16 | 24530 | 22660 | -1870 | low -> low |

## Primary

- Dragons: caraxes, crimson, kalspire, malachite, rhysarion, seasmoke, shadowsong, sheepstealer, sunfyre, syrax, tairax, velar, venator, vhagar, zivern
- Total Estimated Power: 380200
- Formation ratings: 100, 90, 78, 72, 66
- Power confidence: {"observed":0,"modeled":0,"low":15}

## Backup

- Dragons: antares, arrax, bevlorin, daemoros, dawnseeker, feskar, nyrena, shadowrend, shimmer, tashix, tessarion, thunderstrike, vaeldra, vermax, vesper
- Total Estimated Power: 279240
- Formation ratings: 80, 77, 68, 61, 53
- Power confidence: {"observed":0,"modeled":0,"low":15}
