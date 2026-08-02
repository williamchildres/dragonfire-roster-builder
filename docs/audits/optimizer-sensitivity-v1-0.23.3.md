# Optimizer Sensitivity Pass v1 — 0.23.3

This report compares the private 2026-08-02 current-roster export at authoritative base `2832d64c75621ce2fcf57385d716df2f2de52aab` and after the Blazing Fury recipient correction. The private roster is not committed. Both runs used Best Overall First, 10 formations, current progression, and reservation exclusions disabled.

No optimizer weight, Estimated Power input, comparator, allocation rule, formation count, or pairing preference changed.

## Identities

| Identity | Before | After |
|---|---|---|
| Request | `fnv1a64:242e72528c38e4bc` | `fnv1a64:242e72528c38e4bc` |
| Solution | `fnv1a64:e761c0833febc186` | `fnv1a64:e761c0833febc186` |
| Result | `fnv1a64:4bea2540ebaeb301` | `fnv1a64:4bea2540ebaeb301` |
| Candidate pool | `fnv1a64:2ace5c8c309a43cb` | `fnv1a64:2e9e9b6f2e87753b` |
| Candidates without Syrax | `fnv1a64:dc5ede10b3c9478c` | `fnv1a64:dc5ede10b3c9478c` |
| Formation Rating v3 | `215f2c669cee0c96d584b6b3014aa2f075302c644f85ec0801c70b4a6740344f` | `bceda8493e5af3ae4a805fd45dca4861b6a35e2788531699b7e65e707ed6a31a` |
| Formation Rating v3 numeric | `958cf36d329a6fb00c732ecf576d8020d10553d3585b136bda0493a7db754724` | `c9c93c5a9c89f85c08df958924d3fa61cfbdae555a0c50779c7f3b37d05f9c00` |
| Formation Rating audit | `0cd7e73c6dffe528dcb738c3eeb1f7a06bf19008c62280aa2bf9a74cdbcaf94a` | `fc21d2d75740def4a23b9deeb4a8c03712d9b1724522ab05304b109820a67f3f` |
| Historical Formation Rating v2 | `5678952ad31630f7702fc2c56c6c9c5378b2445292696e39accb58f078ba9baf` | `5678952ad31630f7702fc2c56c6c9c5378b2445292696e39accb58f078ba9baf` |
| Reliability registry | `e966ccec17027a0c7af761f5aff9b0ca50d6163a25e4e483948559a603f79c4c` | `e966ccec17027a0c7af761f5aff9b0ca50d6163a25e4e483948559a603f79c4c` |
| Reliability/research audit | `f2984df99ea2d2cbc0b12866287cc3c03248048c86b9f5e3ffed490e0449918f` | `f2d2b87abc803494e2f1eadd92dcd5fd79d9bcb8c389254d47b4e5f28471b73d` |
| Optimizer v6 real-world comparison | `fnv1a64:be1303065e21de60` | `fnv1a64:092ea9e799638354` |
| Complete optimizer v6 audit | `fnv1a64:ffb3095cf43ea1f6` | `fnv1a64:2de5527469a511c0` |

The candidate pool and current Formation Rating identities change because current Syrax trios are corrected and structured targeting evidence is now emitted. The selected solution and public result happen to remain identical. Every candidate without Syrax is byte-for-byte semantically unchanged under the report identity. The historical v2 and production reliability-registry identities remain protected; the reliability/research audit identity changes only because the current signal metadata now includes the selector contract.

The deterministic optimizer-v6 real-world comparison identity changes only in its Caraxes/Syrax diagnostic: the best available third dragon changes from Tessarion (rating 40, five active relationships) to Vhagar (rating 34, three active relationships) after tied Fire-recipient candidates stop receiving guaranteed Blazing Fury credit. All three selected 11-army mode results and their solution/result identities remain unchanged.

The complete optimizer-v6 audit was regenerated from six independent candidate pools and 198 independent exact solves. All forward/reverse pairs match, exact reconstruction and no-duplicate checks pass, and exactly 50 current execution records differ semantically from the immutable optimizer-v5 comparison because their current Formation Rating candidate inputs changed. Those 50 records must exactly equal the committed 0.23.3 approved-delta manifest (`sha256:7630e354700b908f4e3c86379552a2c13b9e6d1034a0fdaa011772cd4eaff69a`); all unapproved historical drift is a failure. The historical optimizer-v5 identity remains `fnv1a64:e5ac2432442f5cb0`.

Adding the approved-delta manifest identity and validation result changes only the complete audit-document identity from the initial 0.23.3 value `fnv1a64:0f61190ace8f1e22` to `fnv1a64:2de5527469a511c0`. The regenerated execution records, candidate identities, and solver solution/result hashes are unchanged.

## Ten-army result

Every selected formation, arrangement, value, rating, power, and Overall Score is unchanged before/after.

| Army | Dragons | Arrangement | Power | Rating | Relationship value | Overall Score |
|---:|---|---|---:|---:|---:|---:|
| 1 | Rhysarion, Tessarion, Vhagar | L Vhagar / V Rhysarion / R Tessarion | 97,240 | 52 | 27 | 77.128 |
| 2 | Caraxes, Crimson, Seasmoke | L Caraxes / V Crimson / R Seasmoke | 91,060 | 35 | 10 | 72.458 |
| 3 | Kalspire, Malachite, Sheepstealer | L Kalspire / V Sheepstealer / R Malachite | 89,840 | 32 | 10 | 72.338 |
| 4 | Sunfyre, Syrax, Velar | L Sunfyre / V Syrax / R Velar | 81,500 | 42 | 17 | 76.350 |
| 5 | Daemoros, Shadowsong, Tashix | L Daemoros / V Shadowsong / R Tashix | 75,260 | 39 | 13.5 | 73.254 |
| 6 | Vaeldra, Venator, Zivern | L Zivern / V Vaeldra / R Venator | 65,880 | 34 | 12 | 71.740 |
| 7 | Dawnseeker, Jagadrix, Nyrena | L Nyrena / V Dawnseeker / R Jagadrix | 49,450 | 53 | 28 | 72.596 |
| 8 | Feskar, Shadowrend, Tairax | L Feskar / V Tairax / R Shadowrend | 51,480 | 40 | 15 | 71.536 |
| 9 | Antares, Bevlorin, Vermax | L Antares / V Bevlorin / R Vermax | 47,340 | 43 | 18 | 77.200 |
| 10 | Arulix, Shimmer, Vesper | L Arulix / V Shimmer / R Vesper | 43,200 | 34 | 12 | 73.600 |

Army 1 remains Rhysarion/Tessarion/Vhagar and Army 2 remains Caraxes/Crimson/Seasmoke with the exact arrangements shown above.

## Collection totals

All collection totals are unchanged: total Estimated Power 692,250; average 69,225; minimum 43,200; maximum 97,240; spread 54,040; total Formation Rating 404; average 40.4; minimum 32; total relationship value 162.5; 29 active relationships; 29 quantified relationships; 3 unquantified relationships; and 18 unquantified base potential. The tier distribution remains 1 Strong, 8 Solid, and 1 Developing. Power confidence remains 1 observed, 5 modeled, and 24 low; the selected rarity mix remains 10 Legendary, 11 Epic, and 9 Rare.

## Corrected candidate diagnostics

| Candidate | Before value / rating | After value / rating | Conclusion |
|---|---:|---:|---|
| Caraxes / Syrax / Seasmoke | 9.4 / 34 | 5 / 27 | Removed both simultaneous Fire-support credits and Caraxes's guaranteed First-Strike credit; retained Seasmoke Intelligence → Caraxes at 5. |
| Caraxes / Syrax / Velar | 14.2 / 39 | 14.2 / 39 | Caraxes is the unique active Fire-priority recipient, so both Blazing Fury relationships remain. |

All six Caraxes/Syrax/Seasmoke arrangements remain tied because position does not resolve the unknown Caraxes/Seasmoke priority tie. The candidate retains structured unresolved evidence naming both Fire producers.

The highest Best Overall-ranked Caraxes/Syrax candidate after correction is Caraxes/Syrax/Vhagar at L Syrax / V Vhagar / R Caraxes: Estimated Power 95,260, relationship value 9.2, rating 34. It retains Blazing Fury Fire support (1.2), Blazing Fury First-Strike (2), and Vhagar Tactical support to Syrax (6). Caraxes and Syrax remain split across the selected ten armies.

## Top 25 Army 2 candidates after Army 1

| Rank | Dragons | Power | Rating | Value | Overall Score |
|---:|---|---:|---:|---:|---:|
| 1 | Caraxes, Crimson, Seasmoke | 91,060 | 35 | 10 | 72.458 |
| 2 | Crimson, Seasmoke, Sheepstealer | 91,060 | 35 | 10 | 72.458 |
| 3 | Crimson, Seasmoke, Tashix | 87,520 | 40 | 15 | 72.184 |
| 4 | Malachite, Seasmoke, Sheepstealer | 87,440 | 40 | 15 | 72.136 |
| 5 | Caraxes, Seasmoke, Sheepstealer | 90,360 | 35 | 10 | 72.008 |
| 6 | Malachite, Seasmoke, Tashix | 83,900 | 45 | 20 | 71.862 |
| 7 | Caraxes, Seasmoke, Tashix | 86,820 | 40 | 17.5 | 71.740 |
| 8 | Seasmoke, Sheepstealer, Tashix | 86,820 | 40 | 15 | 71.740 |
| 9 | Crimson, Malachite, Seasmoke | 88,140 | 36 | 11 | 70.986 |
| 10 | Crimson, Kalspire, Seasmoke | 93,460 | 27 | 5 | 70.800 |
| 11 | Caraxes, Malachite, Seasmoke | 87,440 | 36 | 11 | 70.536 |
| 12 | Kalspire, Malachite, Sheepstealer | 89,840 | 32 | 10 | 70.478 |
| 13 | Caraxes, Kalspire, Seasmoke | 92,760 | 27 | 5 | 70.350 |
| 14 | Kalspire, Seasmoke, Sheepstealer | 92,760 | 27 | 5 | 70.350 |
| 15 | Malachite, Sheepstealer, Velar | 83,900 | 41 | 16 | 70.262 |
| 16 | Kalspire, Seasmoke, Tashix | 89,220 | 32 | 10 | 70.076 |
| 17 | Caraxes, Syrax, Velar | 84,600 | 39 | 14.2 | 69.912 |
| 18 | Daemoros, Seasmoke, Tashix | 81,240 | 44 | 18.5 | 69.752 |
| 19 | Crimson, Syrax, Velar | 85,300 | 37 | 12.2 | 69.562 |
| 20 | Seasmoke, Syrax, Tashix | 84,600 | 38 | 12.5 | 69.512 |
| 21 | Crimson, Malachite, Sheepstealer | 88,140 | 32 | 10 | 69.386 |
| 22 | Crimson, Kalspire, Malachite | 90,540 | 28 | 6 | 69.328 |
| 23 | Crimson, Daemoros, Seasmoke | 85,480 | 36 | 11 | 69.276 |
| 24 | Malachite, Syrax, Velar | 81,680 | 42 | 17 | 69.240 |
| 25 | Sunfyre, Syrax, Velar | 81,500 | 42 | 17 | 69.120 |

## Conclusion

The previous 9.4 Caraxes/Syrax/Seasmoke value loses exactly 4.4 invalid Blazing Fury credit and becomes 5. The correction changes only Syrax-containing candidate identities; it does not unexpectedly change formations without Syrax. The selected ten armies stay identical, so the sensitivity solution/result hashes and collection totals stay unchanged even though the complete candidate identity changes.
