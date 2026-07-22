# Estimated Dragon Power v1

Estimated Power is an unofficial empirical diagnostic. It approximates the Power value displayed by the game from rarity, Star Rank, and Dragon Level. It is separate from Formation Rating, does not simulate combat, and is not an official game formula.

## Runtime contract

- Inputs are rarity (`Legendary`, `Epic`, or `Rare`), Star Rank 1-10, and a nonnegative integer Dragon Level.
- Dragon identity, Habit Levels, notes, formation position, and synergy are not inputs.
- Exact observed rarity/Star Rank/Dragon Level combinations return the observed displayed value.
- Other estimates are rounded to the nearest 10 and remain positive and finite.
- Estimates are monotone as Star Rank or Dragon Level increases.
- At equal progression, Legendary is never below Epic and Epic is never below Rare.
- Invalid inputs throw a `RangeError`; the UI displays no estimate when required progression is missing.

The fitted base model is:

```text
base = rarityIntercept + rarityLevelSlope * Dragon Level + 2434.713675015537 * Star Rank
```

| Rarity | Intercept | Dragon Level slope |
| --- | ---: | ---: |
| Legendary | -5345.526402998704 | 712.604230387158 |
| Epic | -3518.798289613967 | 491.403841476919 |
| Rare | -8030.898292604834 | 395.629654678922 |

For Dragon Levels below 20, the level-20 estimate is scaled by `max(1, level) / 20`. A monotone empirical lower/upper envelope preserves supplied observations, and a final rarity projection enforces `Legendary >= Epic >= Rare`.

## Confidence

- `Observed`: the exact rarity/Star Rank/Dragon Level combination exists in the observation dataset.
- `Modeled`: the combination is not observed but lies inside the global observed Star Rank 1-7 and Dragon Level 20-36 envelope.
- `Low`: either input lies outside that observed envelope and the value is extrapolated.

Confidence describes empirical coverage, not combat effectiveness or the reliability of a specific dragon.

## Data and identity

The source contains 31 raw observations and 25 unique progression combinations. Duplicate combinations are fitted once while retaining sorted provenance and sample counts. Sunfyre and Tairax appear only as observation provenance; neither is added to the 31-dragon canonical database.

- Model version: `estimated-power-v1`
- Observation hash: `fnv1a64:57268e00007bfab8`
- Model hash: `fnv1a64:0b65e3eac0902891`

The hashes and generated coefficients are verified by `npm run fit:power`. `npm run audit:power` performs the same bounded deterministic fit plus observation deduplication, training and leave-one-unique-combination-out errors, exact-observation checks, invalid-value checks, observation-order reversal, and grid validation. No optimizer or solver is loaded.

The complete model audit is committed as [`audits/estimated-power-v1.md`](audits/estimated-power-v1.md) and [`audits/estimated-power-v1.json`](audits/estimated-power-v1.json).

## Presentation and persistence

My Roster shows each owned dragon's read-only estimate and confidence basis. Formation Builder sums the three current dragon estimates into Estimated Formation Power and shows each component. Missing progression produces no estimate.

There is no manual Power field, local roster field, cloud roster field, Supabase migration, optimizer objective, or optimizer strategy. Formation Rating v2 remains unchanged.

## Limitations

The dataset is sparse, especially at low Dragon Levels, high Star Ranks, and rarity/progression combinations outside the observed envelope. Duplicate screenshots improve provenance but do not add independent progression combinations. Extrapolated values should be treated as directional diagnostics, not verified game values.
