# Power-Aware optimizer audit · mixed

- Audit version: 0.20.0
- Roster insertion order: forward
- Formation Rating v2 hash: `5678952ad31630f7702fc2c56c6c9c5378b2445292696e39accb58f078ba9baf`
- Command runtime: 25845.4 ms
- Solver passes: 25
- Phase timings: `{"modelConstructionMs":1057.8744000000006,"primaryPowerMs":0,"primaryRarityMs":0,"primaryQualityMs":11860.54339999999,"backupPowerMs":365.2662999999993,"backupRarityMs":0,"backupQualityMs":2566.451200000003,"stableKeyMs":1020.6278000000057}`
- Unused dragons: antares, arulix, syrax
- Solution hash: `fnv1a64:217a95d5fb8e8cf3`
- Result hash: `fnv1a64:76eee29347b413b4`
- Optimal solver status: PASS
- Integrality tolerance: 1e-7
- Maximum integrality residual: 1.1723955140041653e-12
- Maximum constraint residual: 1.127773430198431e-10
- All fixed phases exactly revalidated: PASS

## Before v2 comparison

- Primary added / removed: sunfyre, tairax / feskar, venator
- Backup added / removed: feskar, venator / arulix, syrax
- Unused dragons: antares -> antares, arulix, syrax
- Primary Power: 195030 -> 212270 (+17240)
- Backup Power: 46590 -> 59530 (+12940)
- Solution hash: `fnv1a64:d4825beceda28c08` -> `fnv1a64:217a95d5fb8e8cf3`
- Result hash: `fnv1a64:e21b2e94174014f0` -> `fnv1a64:76eee29347b413b4`

## Per-dragon Estimated Power

| Dragon | Progression | v1 | v2 | Delta | Confidence |
| --- | --- | ---: | ---: | ---: | --- |
| sunfyre | Legendary 2/25 | 17340 | 17620 | +280 | modeled -> observed |
| tairax | Epic 2/25 | 13640 | 13540 | -100 | modeled -> observed |
| syrax | Legendary 1/0 | 570 | 570 | 0 | low -> low |
| vhagar | Legendary 4/5 | 4660 | 5010 | +350 | low -> low |
| caraxes | Legendary 7/10 | 12970 | 13350 | +380 | low -> low |
| seasmoke | Legendary 10/15 | 24940 | 25020 | +80 | low -> low |
| solstryker | Rare 3/3 | 1080 | 1240 | +160 | low -> low |
| crimson | Legendary 6/8 | 9410 | 9790 | +380 | low -> low |
| kalspire | Legendary 9/13 | 20030 | 20240 | +210 | low -> low |
| malachite | Legendary 2/1 | 690 | 680 | -10 | low -> low |
| venator | Legendary 5/6 | 6320 | 6680 | +360 | low -> low |
| daemoros | Epic 8/11 | 14180 | 13820 | -360 | low -> low |
| feskar | Epic 1/16 | 7000 | 7240 | +240 | low -> low |
| rhysarion | Epic 4/4 | 3210 | 2940 | -270 | low -> low |
| shadowsong | Epic 7/9 | 10510 | 10590 | +80 | low -> low |
| tashix | Epic 10/14 | 21460 | 19830 | -1630 | low -> low |
| vaeldra | Epic 3/2 | 1360 | 1230 | -130 | low -> low |
| velar | Epic 6/7 | 7320 | 7680 | +360 | low -> low |
| zivern | Epic 9/12 | 16930 | 16040 | -890 | low -> low |
| antares | Rare 2/0 | 240 | 350 | +110 | low -> low |
| shimmer | Rare 5/5 | 3010 | 2920 | -90 | low -> low |
| jagadrix | Rare 8/10 | 9680 | 8600 | -1080 | low -> low |
| bevlorin | Rare 1/15 | 1740 | 4160 | +2420 | low -> low |
| shadowrend | Rare 4/3 | 1440 | 1440 | 0 | low -> low |
| thunderstrike | Rare 7/8 | 6770 | 6340 | -430 | low -> low |
| vesper | Rare 10/13 | 15750 | 12940 | -2810 | low -> low |
| arulix | Rare 3/1 | 360 | 410 | +50 | low -> low |
| nyrena | Rare 6/6 | 4350 | 4130 | -220 | low -> low |
| dawnseeker | Rare 9/11 | 11990 | 10200 | -1790 | low -> low |
| arrax | Rare 2/16 | 3800 | 5520 | +1720 | low -> low |
| tessarion | Epic 5/4 | 3700 | 3660 | -40 | low -> low |
| sheepstealer | Legendary 8/9 | 12770 | 13010 | +240 | low -> low |
| vermax | Epic 1/14 | 6120 | 6340 | +220 | low -> low |

## Primary

- Dragons: caraxes, crimson, daemoros, dawnseeker, jagadrix, kalspire, seasmoke, shadowsong, sheepstealer, sunfyre, tairax, tashix, velar, vesper, zivern
- Total Estimated Power: 212270
- Formation ratings: 67, 59, 58, 52, 36
- Power confidence: {"observed":2,"modeled":0,"low":13}

## Backup

- Dragons: arrax, bevlorin, feskar, malachite, nyrena, rhysarion, shadowrend, shimmer, solstryker, tessarion, thunderstrike, vaeldra, venator, vermax, vhagar
- Total Estimated Power: 59530
- Formation ratings: 53, 53, 52, 37, 37
- Power confidence: {"observed":0,"modeled":0,"low":15}
