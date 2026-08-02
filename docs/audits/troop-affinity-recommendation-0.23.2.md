# Troop Affinity Recommendation v1 audit

- Version: `troop-affinity-recommendation-v1`
- Deterministic identity: `fnv1a64:141946fee6c0585f`
- Canonical troop order: Cavalry, Shieldbearers, Archers, Spearmen, Siege
- Canonical dragon affinity records: 33
- Formation fixtures: 6
- Full-positive fixtures: 2
- Partial fixtures: 2
- Tie fixtures: 2
- Negative-tradeoff fixtures: 1
- Unknown-data fixtures: 1
- Siege objective-specific fixtures: 1
- Position-invariance checks: 6
- Failures: 0

## Representative fixtures

| Fixture | Dragons | Kind | Recommended troop types | Positive coverage |
| --- | --- | --- | --- | --- |
| real-full-positive | antares, crimson, syrax | full-positive | Archers | 3 of 3 |
| real-partial | antares, seasmoke, velar | best-nonnegative-coverage | Archers | 2 of 3 |
| real-tie | caraxes, seasmoke, syrax | best-nonnegative-coverage | Cavalry, Archers, Spearmen | 2 of 3 |
| real-siege-tie | kalspire, tairax, vhagar | full-positive | Shieldbearers, Siege | 3 of 3 |
| verified-negative-tradeoff | negative-a, negative-b, negative-c | least-negative-tradeoff | Cavalry | 2 of 3 |
| unknown-incomplete | unknown-a, unknown-b, unknown-c | incomplete | Cavalry | 2 of 3 |

The identity covers the domain version, canonical troop ordering, candidate classifications, ranking hierarchy, tie and incomplete-data behavior, Siege classification, representative fixture outputs, and every canonical dragon affinity record. Cosmetic or localized UI wording is excluded.
