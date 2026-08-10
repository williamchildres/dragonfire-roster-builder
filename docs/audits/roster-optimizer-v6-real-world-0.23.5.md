# Optimizer v6 real-world comparison — 0.23.5

- Fixture: minimal deterministic 33-dragon progression snapshot
- Shared candidate-pool builds: 1
- Candidates: 5456
- Best Overall differs from Highest Raw Power: true
- Best Overall total Formation Rating gain: 56
- Deterministic comparison hash: `fnv1a64:78cb69e50503adcf`

## Three-mode summary

| Mode | Average rating | Minimum rating | Total rating | Strongest raw power | Weakest raw power | Total raw power | Spread | Solution | Result |
|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| Best Overall First | 38.36 | 20 | 422 | 87440 | 37050 | 638730 | 50390 | `fnv1a64:9f1e9ac8897508c7` | `fnv1a64:2067bb497b1a2df6` |
| Highest Raw Power First | 33.27 | 20 | 366 | 91880 | 35900 | 638730 | 55980 | `fnv1a64:e52f8e3190f8554a` | `fnv1a64:3bbeddea890b2159` |
| Balance Raw Power Across Armies | 34.82 | 28 | 383 | 59050 | 57370 | 638730 | 1680 | `fnv1a64:0e5b11180746ca77` | `fnv1a64:391d922f7c2041d7` |

## Selected formations

### Best Overall First

| Army | Dragons | Arrangement | Raw power | Formation Rating | Overall Score |
|---:|---|---|---:|---:|---:|
| 1 | rhysarion, tessarion, vhagar | left-flank: vhagar; vanguard: rhysarion; right-flank: tessarion | 87440 | 52 | 77.9 |
| 2 | malachite, sheepstealer, velar | left-flank: malachite; vanguard: sheepstealer; right-flank: velar | 72600 | 41 | 70.7 |
| 3 | caraxes, kalspire, tashix | left-flank: kalspire; vanguard: caraxes; right-flank: tashix | 77220 | 27 | 68.5 |
| 4 | crimson, syrax, venator | left-flank: syrax; vanguard: venator; right-flank: crimson | 73420 | 31 | 72.4 |
| 5 | daemoros, seasmoke, shadowsong | left-flank: seasmoke; vanguard: shadowsong; right-flank: daemoros | 65080 | 30 | 72.0 |
| 6 | sunfyre, vaeldra, zivern | left-flank: zivern; vanguard: vaeldra; right-flank: sunfyre | 53000 | 39 | 72.1 |
| 7 | antares, jagadrix, nyrena | left-flank: antares; vanguard: jagadrix; right-flank: nyrena | 46650 | 52 | 73.7 |
| 8 | feskar, shadowrend, vermax | left-flank: shadowrend; vanguard: vermax; right-flank: feskar | 45330 | 40 | 73.8 |
| 9 | bevlorin, shimmer, vesper | left-flank: bevlorin; vanguard: shimmer; right-flank: vesper | 40400 | 49 | 78.5 |
| 10 | dawnseeker, tairax, thunderstrike | left-flank: dawnseeker; vanguard: thunderstrike; right-flank: tairax | 40540 | 41 | 75.8 |
| 11 | arrax, arulix, solstryker | left-flank: arrax; vanguard: arulix; right-flank: solstryker | 37050 | 20 | 68.0 |

### Highest Raw Power First

| Army | Dragons | Arrangement | Raw power | Formation Rating | Overall Score |
|---:|---|---|---:|---:|---:|
| 1 | kalspire, tessarion, vhagar | left-flank: kalspire; vanguard: tessarion; right-flank: vhagar | 91880 | 28 | — |
| 2 | caraxes, crimson, sheepstealer | left-flank: caraxes; vanguard: crimson; right-flank: sheepstealer | 77860 | 20 | — |
| 3 | rhysarion, tashix, velar | left-flank: rhysarion; vanguard: tashix; right-flank: velar | 70740 | 38 | — |
| 4 | malachite, seasmoke, syrax | left-flank: seasmoke; vanguard: malachite; right-flank: syrax | 70200 | 32 | — |
| 5 | daemoros, shadowsong, venator | left-flank: venator; vanguard: shadowsong; right-flank: daemoros | 65080 | 30 | — |
| 6 | jagadrix, sunfyre, vaeldra | left-flank: sunfyre; vanguard: vaeldra; right-flank: jagadrix | 56310 | 28 | — |
| 7 | feskar, vermax, zivern | left-flank: feskar; vanguard: vermax; right-flank: zivern | 49620 | 38 | — |
| 8 | bevlorin, tairax, thunderstrike | left-flank: thunderstrike; vanguard: bevlorin; right-flank: tairax | 41140 | 28 | — |
| 9 | antares, nyrena, shimmer | left-flank: antares; vanguard: shimmer; right-flank: nyrena | 40200 | 53 | — |
| 10 | arulix, dawnseeker, vesper | left-flank: vesper; vanguard: dawnseeker; right-flank: arulix | 39800 | 34 | — |
| 11 | arrax, shadowrend, solstryker | left-flank: shadowrend; vanguard: arrax; right-flank: solstryker | 35900 | 37 | — |

### Balance Raw Power Across Armies

| Army | Dragons | Arrangement | Raw power | Formation Rating | Overall Score |
|---:|---|---|---:|---:|---:|
| 1 | arrax, malachite, venator | left-flank: malachite; vanguard: arrax; right-flank: venator | 59050 | 28 | — |
| 2 | caraxes, vermax, zivern | left-flank: zivern; vanguard: caraxes; right-flank: vermax | 58700 | 36 | — |
| 3 | dawnseeker, shadowrend, vhagar | left-flank: dawnseeker; vanguard: vhagar; right-flank: shadowrend | 58290 | 47 | — |
| 4 | seasmoke, solstryker, syrax | left-flank: solstryker; vanguard: syrax; right-flank: seasmoke | 58200 | 31 | — |
| 5 | antares, crimson, vaeldra | left-flank: antares; vanguard: crimson; right-flank: vaeldra | 58160 | 37 | — |
| 6 | shadowsong, shimmer, velar | left-flank: shadowsong; vanguard: shimmer; right-flank: velar | 58120 | 43 | — |
| 7 | feskar, kalspire, vesper | left-flank: kalspire; vanguard: feskar; right-flank: vesper | 57960 | 28 | — |
| 8 | daemoros, tashix, thunderstrike | left-flank: tashix; vanguard: daemoros; right-flank: thunderstrike | 57720 | 33 | — |
| 9 | arulix, nyrena, tessarion | left-flank: arulix; vanguard: nyrena; right-flank: tessarion | 57620 | 41 | — |
| 10 | bevlorin, sheepstealer, sunfyre | left-flank: sheepstealer; vanguard: bevlorin; right-flank: sunfyre | 57540 | 28 | — |
| 11 | jagadrix, rhysarion, tairax | left-flank: jagadrix; vanguard: rhysarion; right-flank: tairax | 57370 | 31 | — |

## Caraxes + Syrax diagnostic

- Earliest step where both are available: 1
- Best third dragon: vhagar
- Arrangement: left-flank: syrax; vanguard: vhagar; right-flank: caraxes
- Estimated Formation Power: 82060
- Formation Rating: 34
- Overall Score: 67.2 (671860 units)
- Active relationships: 3
- Unquantified relationships: 0
- Missing or locked mechanics: Vhagar's Physical Damage is active but not amplified by the selected allies.; Vhagar's Physical Damage support is active but unused by this formation.
- Selected by Best Overall: false
- Exact winning candidate: `rhysarion+tessarion+vhagar@left-flank:vhagar|vanguard:rhysarion|right-flank:tessarion`
- Exact score difference: 10.7160 (107160 units)

The First-Strike and Fire Damage interactions are generated and scored normally; no pair receives special-case treatment.
Overall Score is an explainable planning index, not combat simulation or predicted damage.
