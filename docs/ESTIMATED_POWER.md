# Estimated Dragon Power v2

Estimated Power is an unofficial empirical diagnostic. It approximates the Power value displayed by the game from rarity, Star Rank, and Dragon Level. It is separate from Formation Rating, does not simulate combat, and is not an official game formula.

## Evidence and model choice

Version 2 expands the source to 59 provenance observations covering 42 unique rarity/Star Rank/Dragon Level/Power tuples. Duplicate progression tuples are fitted once while retaining all provenance and sample counts. Sunfyre and Tairax are canonical dragons as of 0.19.0, while their existing Power observations and the frozen v2 model remain unchanged.

The observations form a bipartite support graph for each rarity: Star Rank nodes on one side, Dragon Level nodes on the other, and observed Power values on the edges. Every connected component is exactly compatible with:

```text
Displayed Power = rarity-specific Star component + rarity-specific Level component
```

All additive cycle residuals are zero. The evidence includes real plateaus and changing increments, so v2 selects deterministic rarity-specific piecewise-linear Star and Level curves instead of smoothing them into one linear slope.

Legendary and Rare each have one connected component. Epic has two: Star 1 with Levels 20-21, and Stars 2, 3, 4, and 6 with Levels 25-38. The absolute offset between those Epic components is not identified by observations. In particular, Tairax changing from Star 1 Level 20 to Star 2 Level 25 does not independently reveal either the Star gain or the Level gain.

## Frozen curves

Each curve uses an arbitrary documented gauge; only Star-plus-Level sums have empirical meaning.

| Rarity | Star component anchors |
| --- | --- |
| Legendary | 1: 0; 2: 2220; 3: 4620; 4: 8640 |
| Epic | 1: 0; 2: 1600; 3: 3200; 4: 5640; 6: 12880 |
| Rare | 3: 0; 4: 1350; 7: 7600 |

| Rarity | Level component anchors |
| --- | --- |
| Legendary | 20: 11400; 21: 12400; 25: 15400; 35: 22400; 36: 22400; 37: 23400; 38: 24400 |
| Epic | 20: 9050; 21: 9550; 25: 11940; 30: 13940; 31: 14940; 32: 14940; 35: 16940; 36: 17940; 37: 17940; 38: 18940 |
| Rare | 20: 8250; 21: 8650; 25: 10050; 28: 11250; 29: 11650; 30: 12050; 31: 12250 |

The Epic bridge copies the nearest directly identified adjacent Epic Star increment: Star 2 to 3 is +1600, so the completion assigns +1600 from Star 1 to 2 and an implied +2390 from Level 21 to 25. This is deterministic modeled inference, not an observed game rule. The audit also reports alternative bridge allocations of 0/3990 and 2440/1550 for Star/Level gains.

## Runtime and confidence

- Exact observed tuples return displayed Power with `observed` confidence and `exact-observation` basis.
- Non-exact tuples inside one connected support component use piecewise-linear interpolation with `modeled` confidence.
- Tuples crossing disconnected support or outside a component use `low` confidence and `extrapolation` basis.
- Below Level 20, the Level-20 total is scaled by `max(1, level) / 20`.
- Other extrapolation uses the smallest positive observed per-unit slope for that rarity and axis. This avoids freezing at a zero-slope plateau or repeating one large endpoint jump indefinitely.
- Values are positive and rounded to the nearest 10. A final monotone projection preserves `Legendary >= Epic >= Rare` at equal progression.

Examples of structural low confidence include Epic Star 1 Level 30, Epic Star 2 Level 21, Rare Stars 1-2, and Legendary Stars 5-10. Epic Star 5 within the higher connected component and Rare Stars 5-6 within their connected component are modeled interpolation.

Dragon identity, Habit Levels, notes, formation position, and synergy are not inputs. Invalid rarity, Star Rank outside 1-10, negative Level, or noninteger progression throws a `RangeError`.

## Identity and validation

- Model version: `estimated-power-v2`
- Observation hash: `fnv1a64:26bfe615f0d9bdd5`
- Model hash: `fnv1a64:efa6081babb4e520`
- Numerical Level 0-1000 grid fingerprint: `fnv1a64:1acab49e4408602b`

The model hash covers the observations, curves, gauges, Epic completion, support components, interpolation, extrapolation, exact-observation, rounding, monotonicity, rarity projection, and confidence rules. `npm run fit:power` verifies the frozen artifacts and `npm run fit:power --write` regenerates them.

Frozen v1 is retained as a historical benchmark. Against the 17 genuinely new unique combinations, v1 has MAE 522.3529, MAPE 2.564692%, maximum APE 7.55237%, and RMSE 718.7489. V2 training quality is reported before the exact-observation override, and separate leave-one-combination, Level-anchor, Star-anchor, and upgrade-endpoint metrics are committed rather than treating structural zero training error as proof of generalization.

The complete audits are [`audits/estimated-power-v2.md`](audits/estimated-power-v2.md), [`audits/estimated-power-v2.json`](audits/estimated-power-v2.json), and the preserved historical [`audits/estimated-power-v1.md`](audits/estimated-power-v1.md).

## Presentation, persistence, and optimizer impact

My Roster shows each owned dragon's read-only estimate and confidence and can sort current estimates from high to low. The roster sort calls this same protected v2 estimator; it does not duplicate model curves or confidence logic. Numeric power alone controls the primary order, name and canonical ID resolve ties, and missing Star Rank or Dragon Level is unavailable and sorts after every calculable dragon. Progression edits update the value and order immediately while selection remains keyed to dragon ID.

Formation Builder sums exactly three individual estimates. Missing progression produces no estimate.

There is no manual Power field, persisted sort field, Supabase migration, Habit Level Power effect, affinity multiplier, damage estimate, combat simulation, or win probability. Formation Rating v3 is unchanged.

Optimizer contract-v6 requests include the Estimated Power version, observation hash, model hash, allocation mode, formation count, Best Overall scoring profile, Formation Rating contract, and the complete eligible progression snapshot. All v0.22.1 modes use the same cached per-dragon v2 estimates and per-trio integer power units. Best Overall uses power only through its documented step-relative 60/40 planning index; the two preserved modes retain their v5 raw-power objectives. Rarity and confidence remain descriptive.

## Limitations

Support remains sparse at low Levels, high Star Ranks, and outside observed components. The Epic Star 1-to-2 bridge is underidentified, extrapolation is deliberately conservative, and confidence describes empirical support rather than combat effectiveness. Estimates outside support are directional diagnostics, not verified game values.
