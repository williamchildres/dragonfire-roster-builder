# Estimated Dragon Power v1 audit

> Estimated Power is an unofficial empirical approximation based on observed game values. It is separate from Formation Rating and is not combat simulation.

- Model version: `estimated-power-v1`
- Observation hash: `fnv1a64:57268e00007bfab8`
- Model hash: `fnv1a64:0b65e3eac0902891`
- Raw samples: 31
- Unique fitting combinations: 25
- Deduplicated samples: 6

## Candidate selection

| Candidate | Parameters | Training MAPE | Training max APE | LOO MAPE | Monotonicity violations | Rarity-order violations | Decision |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| shared-monotone-power-law | 5 | 4.789192% | 15.982272% | 6.073792% | 0 | 0 | Not selected |
| rarity-specific-monotone-power-laws | 9 | 2.927356% | 8.261563% | 5.155141% | 0 | 215 | Not selected |
| rarity-level-additive-with-shared-star-contribution-and-monotone-envelope | 7 | 2.88213% | 7.755341% | 3.83628% | 0 | 80 | Selected |

The selected family is the simplest candidate meeting the training guardrails after a transparent monotone runtime envelope. The shared power law misses the maximum-error guardrail; independent rarity power laws create rarity-order crossings. The selected model's leave-one-out prediction refits without the held-out unique combination and excludes that combination from the empirical envelope.

## Frozen formula

base(rarity, stars, level>=20) = intercept[rarity] + levelSlope[rarity] * level + sharedStarRankSlope * stars

- Low-level rule: For levels 0-19, scale the level-20 base by max(1, level) / 20.
- Runtime guardrails: Round to 10; clamp within monotone empirical lower/upper bounds; project Rare <= Epic <= Legendary.
- Coefficients: `{"rarityIntercept":{"Legendary":-5345.526402998704,"Epic":-3518.798289613967,"Rare":-8030.898292604834},"rarityLevelSlope":{"Legendary":712.604230387158,"Epic":491.403841476919,"Rare":395.629654678922},"sharedStarRankSlope":2434.713675015537,"empiricalMinimumDragonLevel":20}`
- Training metrics: `{"meanAbsoluteError":529.5786,"mapePercent":2.88213,"medianAbsolutePercentageErrorPercent":2.265042,"maximumAbsolutePercentageErrorPercent":7.755341,"rootMeanSquaredError":702.0812}`
- Leave-one-unique-combination-out metrics: `{"meanAbsoluteError":724,"mapePercent":3.83628,"medianAbsolutePercentageErrorPercent":2.761982,"maximumAbsolutePercentageErrorPercent":11.959288,"rootMeanSquaredError":1044.4175}`

## Observations and residuals

| Rarity | Stars | Level | Observed | Provenance | Samples | Base fit | Residual | Absolute % error |
| --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: |
| Legendary | 1 | 35 | 22400 | Malachite, Venator | 2 | 22030.3353 | -369.6647 | 1.650289% |
| Legendary | 1 | 36 | 22400 | Seasmoke, Syrax | 2 | 22742.9396 | 342.9396 | 1.53098% |
| Legendary | 2 | 20 | 13620 | Sunfyre | 1 | 13775.9856 | 155.9856 | 1.145268% |
| Legendary | 2 | 21 | 14620 | Sunfyre | 1 | 14488.5898 | -131.4102 | 0.898839% |
| Legendary | 2 | 35 | 24620 | Sheepstealer | 1 | 24465.049 | -154.951 | 0.62937% |
| Legendary | 2 | 36 | 24620 | Caraxes, Crimson | 2 | 25177.6532 | 557.6532 | 2.265042% |
| Legendary | 3 | 36 | 27020 | Kalspire | 1 | 27612.3669 | 592.3669 | 2.192328% |
| Legendary | 4 | 36 | 31040 | Vhagar | 1 | 30047.0806 | -992.9194 | 3.198838% |
| Epic | 1 | 20 | 9050 | Tairax | 1 | 8743.9922 | -306.0078 | 3.381301% |
| Epic | 1 | 21 | 9550 | Tairax | 1 | 9235.3961 | -314.6039 | 3.294282% |
| Epic | 2 | 30 | 15540 | Zivern | 1 | 16092.7443 | 552.7443 | 3.556913% |
| Epic | 2 | 31 | 16540 | Feskar, Vermax | 2 | 16584.1481 | 44.1481 | 0.266917% |
| Epic | 2 | 36 | 19540 | Daemoros | 1 | 19041.1674 | -498.8326 | 2.552879% |
| Epic | 3 | 31 | 18140 | Vaeldra | 1 | 19018.8618 | 878.8618 | 4.844883% |
| Epic | 3 | 35 | 20140 | Shadowsong | 1 | 20984.4772 | 844.4772 | 4.193035% |
| Epic | 4 | 35 | 22580 | Rhysarion, Tashix, Velar | 3 | 23419.1909 | 839.1909 | 3.716523% |
| Epic | 6 | 36 | 30820 | Tessarion | 1 | 28780.0221 | -2039.9779 | 6.619007% |
| Rare | 3 | 29 | 11650 | Antares | 1 | 10746.5027 | -903.4973 | 7.755341% |
| Rare | 3 | 30 | 12050 | Shadowrend | 1 | 11142.1324 | -907.8676 | 7.534171% |
| Rare | 4 | 20 | 9600 | Solstryker | 1 | 9620.5495 | 20.5495 | 0.214057% |
| Rare | 4 | 21 | 10000 | Solstryker | 1 | 10016.1792 | 16.1792 | 0.161792% |
| Rare | 4 | 28 | 12600 | Dawnseeker | 1 | 12785.5867 | 185.5867 | 1.472911% |
| Rare | 4 | 29 | 13000 | Arulix | 1 | 13181.2164 | 181.2164 | 1.393972% |
| Rare | 4 | 30 | 13400 | Thunderstrike | 1 | 13576.846 | 176.846 | 1.319747% |
| Rare | 7 | 30 | 19650 | Jagadrix | 1 | 20880.9871 | 1230.9871 | 6.264565% |

## Structural checks

- Checked estimates: 30030
- Invalid/nonpositive estimates: 0
- Monotonicity violations: 0
- Rarity-order violations: 0
- Exact-observation mismatches: 0
- Observation-order reversal: PASS
- Invalid input rejection: PASS
- Extension proof: All level slopes and the low-level scale are nonnegative; empirical bounds and rarity projection are monotone max/min operations, so the checks extend to every nonnegative integer level.

## Confidence contract

Exact observed rarity/Star Rank/Dragon Level tuples are `observed`. Non-exact tuples inside the observed global 1-7 Star Rank and 20-36 Dragon Level envelope are `modeled`. Values outside either range are low-confidence `extrapolation`. Habit Levels, notes, and dragon identity are not model inputs.
