# Estimated Dragon Power v2 audit

> Estimated Power is an unofficial empirical approximation. It is separate from Formation Rating and is not combat simulation.

- Model version: `estimated-power-v2`
- Observation hash: `fnv1a64:26bfe615f0d9bdd5`
- Model hash: `fnv1a64:efa6081babb4e520`
- Numerical grid fingerprint: `fnv1a64:1acab49e4408602b`
- Observations: 59 raw provenance samples; 42 unique progression tuples.

## Candidate comparison

- Frozen v1 historical holdout (17 genuinely new tuples): MAE 522.3529; MAPE 2.564692%; max APE 7.55237%; RMSE 718.7489.
- Rarity-specific linear additive training: MAE 453.9356; MAPE 2.368376%; max APE 7.277156%; RMSE 586.1562; leave-one-unique-out: MAE 583.7535; MAPE 3.036713%; max APE 8.888758%; RMSE 766.7285.
- Selected rarity-specific additive curves training before exact override: MAE 0; MAPE 0%; max APE 0%; RMSE 0.
- Selected leave-one-unique-out: MAE 60; MAPE 0.408725%; max APE 3.249631%; RMSE 152.6122.
- Selected leave-one-level-anchor-out: MAE 289.2857; MAPE 1.470161%; max APE 3.249631%; RMSE 360.2215.
- Selected leave-one-Star-anchor-out: MAE 783.3333; MAPE 3.948252%; max APE 13.108371%; RMSE 1197.4139.
- Selected leave-one-upgrade-endpoint-out: MAE 60; MAPE 0.408725%; max APE 3.249631%; RMSE 152.6122.

The additive curve family is selected because the support graph demonstrates exact Star-plus-Level structure while the linear candidate smooths away observed plateaus and nonuniform increments. Zero training error is structural fit, not evidence of generalization; the held-out metrics above are reported separately.

## Support graph and identifiability

| Rarity | Component | Stars | Levels | Edges | Max cycle residual | Unique after gauge |
| --- | --- | --- | --- | ---: | ---: | --- |
| Legendary | legendary-1 | 1, 2, 3, 4 | 20, 21, 25, 35, 36, 37, 38 | 14 | 0 | Yes |
| Epic | epic-1 | 1 | 20, 21 | 2 | 0 | Yes |
| Epic | epic-2 | 2, 3, 4, 6 | 25, 30, 31, 32, 35, 36, 37, 38 | 14 | 0 | Yes |
| Rare | rare-1 | 3, 4, 7 | 20, 21, 25, 28, 29, 30, 31 | 12 | 0 | Yes |

Legendary and Rare each form one connected component. Epic Star 1 at Levels 20-21 is disconnected from Epic Stars 2, 3, 4, and 6 at Levels 25-38. Therefore the absolute Epic Star 1 to Star 2 difference is not identified. The Tairax Star 1 Level 20 to Star 2 Level 25 change alters both variables and is not treated as an independent Star or Level rule.

## Frozen model

- Star curves: `{"Legendary":[{"input":1,"value":0},{"input":2,"value":2220},{"input":3,"value":4620},{"input":4,"value":8640}],"Epic":[{"input":1,"value":0},{"input":2,"value":1600},{"input":3,"value":3200},{"input":4,"value":5640},{"input":6,"value":12880}],"Rare":[{"input":3,"value":0},{"input":4,"value":1350},{"input":7,"value":7600}]}`
- Level curves: `{"Legendary":[{"input":20,"value":11400},{"input":21,"value":12400},{"input":25,"value":15400},{"input":35,"value":22400},{"input":36,"value":22400},{"input":37,"value":23400},{"input":38,"value":24400}],"Epic":[{"input":20,"value":9050},{"input":21,"value":9550},{"input":25,"value":11940},{"input":30,"value":13940},{"input":31,"value":14940},{"input":32,"value":14940},{"input":35,"value":16940},{"input":36,"value":17940},{"input":37,"value":17940},{"input":38,"value":18940}],"Rare":[{"input":20,"value":8250},{"input":21,"value":8650},{"input":25,"value":10050},{"input":28,"value":11250},{"input":29,"value":11650},{"input":30,"value":12050},{"input":31,"value":12250}]}`
- Epic bridge: infer +1600 by copying the nearest directly identified adjacent Epic Star increment (Star 2 to 3). This implies +2390 across Levels 21 to 25 and is modeled inference, not an observed game rule.
- Bridge sensitivity: `[{"inferredStarRankGain":0,"impliedLevel21To25Gain":3990},{"inferredStarRankGain":2440,"impliedLevel21To25Gain":1550}]`.
- Interpolation: deterministic piecewise-linear interpolation between frozen anchors.
- Extrapolation: below Level 20 scale the Level-20 total by `max(1, level) / 20`; otherwise use the smallest positive observed per-unit slope for that rarity and axis.
- Exact tuples: return observed Power with `observed` confidence.
- Confidence: non-exact tuples inside one connected support component are `modeled`; bridges and out-of-range values are `low`.
- Rounding and guards: nearest 10, positive monotone curves, then project Legendary >= Epic >= Rare.

## Structural validation

- Maximum additive residual: 0.
- Transition deltas: 100; mean absolute error 0; maximum 0.
- Full grid: 30030 estimates through Level 1000; 0 invalid; 0 monotonicity violations; 0 rarity-order violations.
- Exact observation mismatches: 0.
- Observation/model order reversal: PASS.

## Observations and provenance

| Rarity | Stars | Level | Observed | Provenance | Samples | Raw curve | Residual |
| --- | ---: | ---: | ---: | --- | ---: | ---: | ---: |
| Legendary | 1 | 35 | 22400 | Malachite, Venator | 2 | 22400 | 0 |
| Legendary | 1 | 36 | 22400 | Seasmoke, Syrax | 2 | 22400 | 0 |
| Legendary | 1 | 37 | 23400 | Malachite, Seasmoke, Syrax, Venator | 4 | 23400 | 0 |
| Legendary | 2 | 20 | 13620 | Sunfyre | 1 | 13620 | 0 |
| Legendary | 2 | 21 | 14620 | Sunfyre | 1 | 14620 | 0 |
| Legendary | 2 | 25 | 17620 | Sunfyre | 1 | 17620 | 0 |
| Legendary | 2 | 35 | 24620 | Sheepstealer | 1 | 24620 | 0 |
| Legendary | 2 | 36 | 24620 | Caraxes, Crimson | 2 | 24620 | 0 |
| Legendary | 2 | 37 | 25620 | Caraxes, Sheepstealer | 2 | 25620 | 0 |
| Legendary | 2 | 38 | 26620 | Crimson | 1 | 26620 | 0 |
| Legendary | 3 | 36 | 27020 | Kalspire | 1 | 27020 | 0 |
| Legendary | 3 | 37 | 28020 | Kalspire | 1 | 28020 | 0 |
| Legendary | 4 | 36 | 31040 | Vhagar | 1 | 31040 | 0 |
| Legendary | 4 | 38 | 33040 | Vhagar | 1 | 33040 | 0 |
| Epic | 1 | 20 | 9050 | Tairax | 1 | 9050 | 0 |
| Epic | 1 | 21 | 9550 | Tairax | 1 | 9550 | 0 |
| Epic | 2 | 25 | 13540 | Tairax | 1 | 13540 | 0 |
| Epic | 2 | 30 | 15540 | Zivern | 1 | 15540 | 0 |
| Epic | 2 | 31 | 16540 | Feskar, Vermax, Zivern | 3 | 16540 | 0 |
| Epic | 2 | 32 | 16540 | Feskar, Vermax | 2 | 16540 | 0 |
| Epic | 2 | 36 | 19540 | Daemoros | 1 | 19540 | 0 |
| Epic | 2 | 38 | 20540 | Daemoros | 1 | 20540 | 0 |
| Epic | 3 | 31 | 18140 | Vaeldra | 1 | 18140 | 0 |
| Epic | 3 | 32 | 18140 | Vaeldra | 1 | 18140 | 0 |
| Epic | 3 | 35 | 20140 | Shadowsong | 1 | 20140 | 0 |
| Epic | 3 | 37 | 21140 | Shadowsong | 1 | 21140 | 0 |
| Epic | 4 | 35 | 22580 | Rhysarion, Tashix, Velar | 3 | 22580 | 0 |
| Epic | 4 | 37 | 23580 | Rhysarion, Tashix, Velar | 3 | 23580 | 0 |
| Epic | 6 | 36 | 30820 | Tessarion | 1 | 30820 | 0 |
| Epic | 6 | 37 | 30820 | Tessarion | 1 | 30820 | 0 |
| Rare | 3 | 29 | 11650 | Antares | 1 | 11650 | 0 |
| Rare | 3 | 30 | 12050 | Shadowrend | 1 | 12050 | 0 |
| Rare | 3 | 31 | 12250 | Shadowrend | 1 | 12250 | 0 |
| Rare | 4 | 20 | 9600 | Solstryker | 1 | 9600 | 0 |
| Rare | 4 | 21 | 10000 | Solstryker | 1 | 10000 | 0 |
| Rare | 4 | 25 | 11400 | Solstryker | 1 | 11400 | 0 |
| Rare | 4 | 28 | 12600 | Dawnseeker | 1 | 12600 | 0 |
| Rare | 4 | 29 | 13000 | Arulix, Dawnseeker | 2 | 13000 | 0 |
| Rare | 4 | 30 | 13400 | Antares, Arulix, Thunderstrike | 3 | 13400 | 0 |
| Rare | 4 | 31 | 13600 | Thunderstrike | 1 | 13600 | 0 |
| Rare | 7 | 30 | 19650 | Jagadrix | 1 | 19650 | 0 |
| Rare | 7 | 31 | 19850 | Jagadrix | 1 | 19850 | 0 |
