# Troop Affinity Recommendations

Dragonfire Lab 0.23.2 adds the deterministic domain contract `troop-affinity-recommendation-v1`. It answers a narrow question: which canonical troop types provide the strongest shared affinity coverage for the three selected dragons?

It does not select an enemy troop, simulate a matchup, assign troops, calculate Durability, adjust combat power, or claim a universally optimal battle choice.

## Evidence boundary

Official game guidance confirms the qualitative mechanic: positive affinity increases the affected dragon's combat stats and siege damage, neutral has no effect, and negative affinity reduces combat stats and siege damage. Troop Type Advantage is a separate enemy-matchup system.

The displayed `+20%` comes from the in-game Army Builder and user-confirmed behavior, not a published numeric formula in the official support article. Dragonfire Lab applies that label to each positively aligned dragon. Three positive dragons are three individual matches, not a combined `+60%` formation bonus. The app does not reverse-engineer a complete combat formula, infer the magnitude of negative affinity, or simulate affinity-adjusted performance.

Canonical dragon affinity records are the sole classification source. Unknown remains unknown; the service does not infer missing values from external websites, icon patterns, another dragon, or another troop type.

## Candidate contract

The service accepts exactly three unique canonical dragon records. It evaluates Cavalry, Shieldbearers, Archers, Spearmen, and Siege in that canonical order. For every troop type it returns canonical dragon IDs in four disjoint groups:

- positive: `+20% positive affinity` for that dragon;
- neutral: no affinity modifier;
- negative: reduced stats and siege damage, with no invented percentage;
- unknown: affinity not verified.

Position is not an input. All six permutations of one trio produce byte-identical recommendation output. Display names are resolved only in the UI.

## Ranking hierarchy

1. `full-positive`: retain every candidate with three positive, zero negative, and zero unknown dragons.
2. `best-nonnegative-coverage`: when no full match exists, consider candidates with zero negative and zero unknown dragons, maximize positive count, and retain every tie.
3. `incomplete`: when no complete nonnegative candidate exists but at least one candidate has no verified negative, maximize known positive count, minimize unknown count, and retain every tie. Unknown is never neutral. A complete nonnegative candidate always beats an incomplete one.
4. `least-negative-tradeoff`: when every troop type has at least one verified negative, minimize negative count, then maximize positive count, then minimize unknown count, and retain every remaining tie.

Canonical troop order controls presentation order only; there is no hidden numeric troop score.

## Siege and enemy matchup boundary

Siege remains one of the five evaluated candidates and is never given an invented numeric penalty. If it is recommended or tied, the UI labels it objective-specific for Durability and siege damage and warns that it is weak in ordinary troop matchups. Every recommendation also states that enemy troop advantage may change the actual battle choice.

## Integration and persistence

Formation Builder, Saved Formations, and all three optimizer modes derive the same service result from current canonical dragon data at render time. Saved records continue to store only schema-2 fields; optimizer contract 6, candidates, arrangements, objectives, fingerprints, solution hashes, result hashes, and reservation-context fingerprints remain unchanged.

The service emits no Estimated Power adjustment, Formation Rating adjustment, combined percentage, or affinity scoring objective. The current independent audit report is [`audits/troop-affinity-recommendation-0.23.5.md`](audits/troop-affinity-recommendation-0.23.5.md); the 0.23.2 artifact remains immutable historical evidence.
