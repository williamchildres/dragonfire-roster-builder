# Power-Aware optimizer audit · mixed

- Audit version: 0.17.0
- Formation Rating v2 hash: `12ee9dc58012cd4edd14ea3d095da32e2db6bf5cca6a1f8d77c24be8506eded9`
- Command runtime: 38098.3 ms
- Solver passes: 104
- Phase timings: `{"modelConstructionMs":750.605800000003,"primaryPowerMs":0,"primaryRarityMs":0,"primaryQualityMs":8309.793599999997,"backupPowerMs":204.77990000000136,"backupRarityMs":0,"backupQualityMs":2208.2374999999956,"stableKeyMs":17571.033300000003}`
- Unused dragon: antares
- Solution hash: `fnv1a64:d4825beceda28c08`
- Result hash: `fnv1a64:e21b2e94174014f0`
- Optimal solver status: PASS

## Before v2 comparison

- Primary added / removed: venator / thunderstrike
- Backup added / removed: thunderstrike / venator
- Unused dragon: antares -> antares
- Primary Power: 201710 -> 195030 (-6680)
- Backup Power: 42410 -> 46590 (+4180)
- Solution hash: `fnv1a64:cc6910debb29d0fe` -> `fnv1a64:d4825beceda28c08`
- Result hash: `fnv1a64:46b04e2c0f2cfaac` -> `fnv1a64:e21b2e94174014f0`

## Per-dragon Estimated Power

| Dragon | Progression | v1 | v2 | Delta | Confidence |
| --- | --- | ---: | ---: | ---: | --- |
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

- Dragons: caraxes, crimson, daemoros, dawnseeker, feskar, jagadrix, kalspire, seasmoke, shadowsong, sheepstealer, tashix, velar, venator, vesper, zivern
- Total Estimated Power: 195030
- Formation ratings: 67, 59, 47, 47, 42
- Power confidence: {"observed":0,"modeled":0,"low":15}

## Backup

- Dragons: arrax, arulix, bevlorin, malachite, nyrena, rhysarion, shadowrend, shimmer, solstryker, syrax, tessarion, thunderstrike, vaeldra, vermax, vhagar
- Total Estimated Power: 46590
- Formation ratings: 53, 53, 53, 41, 37
- Power confidence: {"observed":0,"modeled":0,"low":15}
