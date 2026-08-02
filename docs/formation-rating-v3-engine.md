# Formation Rating v3 engine

Formation Rating v3 is the live production engine identified by `formation-rating-v3`. It is implemented under `src/synergy/reliability/scoring`, `src/services/formationRatingV3.ts`, and `src/services/formationPlacementComparisonV3.ts`. Formation Rating v2 remains available only for historical regression and comparison audits.

## Inputs and identity

The formation evaluator has an internal-facing candidate result that retains every eligible provider-beneficiary candidate before semantic selection. Each candidate carries exact provider and beneficiary signal IDs, signal categories, dragon and ability IDs, semantic tag, result kind, and a stable identity. Both evaluator entry points also expose structured recipient-selection resolutions; the legacy relationship result shape remains intact under `results`.

V3 resolves those exact signal IDs through the production reliability registry. It never parses result IDs, ability text, or explanations to recover signal or probability context. Current unlock, position, targeting, and recipient selection use `SimpleProgressionByDragonId`; probability resolution uses a separate `ReliabilityProgressionByDragonId`, normally built with `reliabilityProgressionFromOwnedDragon`. No Habit level is inferred for an actual roster.

## Recipient selection before reliability

Recipient selection gates candidate generation before reliability is evaluated. `capability-priority-one` builds the complete eligible formation pool, checks active output signals for the priority semantic tag at current progression and self position, and resolves only a unique priority or unique fallback recipient. Support signals do not qualify as active damage output. Multiple priority or fallback candidates remain unresolved with zero recipient-specific candidates; no probability, lane order, stats, or canonical-ID preference is invented. Sibling signals with one `selectionGroupId` share the same resolution object. See [`TARGETING_SELECTORS.md`](TARGETING_SELECTORS.md).

## Reliability quantification

Guaranteed components resolve to 1. A conditional-deterministic component resolves to 1 only when the active graph proves its documented prerequisite. In particular, an eligible setup provider proves the exact semantic condition for the selected `benefitsFrom` signal. A provider output or support with its own unresolved dynamic trigger remains unquantified. A deterministic follow-on explicitly joined to a preceding chance prerequisite adds no second discount.

Chance components follow a conservative evidence boundary:

- conditional, unknown, or later-round opportunity presence is unquantified, while supported per-opportunity probabilities remain in the trace;
- one guaranteed supported opportunity uses its documented probability;
- unresolved repetition and unconfirmed independence receive no additional credit;
- exact multiple opportunities use `1 - product(1 - p)` only with confirmed independence and supported scope;
- unknown probabilities and missing active Habit levels are unquantified;
- Habit overrides use the base while inactive, the active-level replacement while active, and no value when the active level is missing;
- round-specific schedules use Round 1 as the supported fallback and do not assume later rounds occur.

Unquantified reliability has no numeric surrogate. Its adjusted contribution is zero and its base potential remains visible.

## Events, paths, and mixed uses

Components in one event share activation identity. A shared chance is counted once; conflicting probabilities for one shared event are unquantified. Events in a path are jointly required. One chance event supplies the path reliability, but distinct jointly required chance events remain unquantified unless their joint behavior is documented.

Ordinary paths are alternatives, not simultaneous activations. A guaranteed path wins; otherwise the best supported alternative is a conservative lower bound. Probability variants require structured context selection, and ambiguous variants remain unquantified rather than choosing the largest probability.

Resolved-mixed uses are simultaneous semantic uses of one relationship. V3 evaluates every use for traceability but allocates the base relationship value once: any fully supported use keeps the relationship at 1, otherwise the strongest quantified use supplies a lower bound. Uses are never summed, averaged, multiplied, or treated as alternatives. This keeps the deterministic Shadowsong, Shimmer, and Zivern uses from being discounted by their chance secondary uses.

## Relationship graph and selection

V3 evaluates the exact provider and beneficiary bindings. A guaranteed setup joined to a chance payoff uses the payoff reliability; a chance setup joined to a guaranteed or proven payoff uses the setup reliability. A shared component or event is discounted once. Two distinct chance events with no joint evidence are unquantified and are never multiplied.

All active candidates for one semantic relationship remain in its trace. Selection is deterministic: full reliability, highest quantified adjusted base, quantified over unquantified, reliability, existing base/class preference, then stable signal, component, and candidate identity.

Redundancy runs after reliability by beneficiary, semantic tag, and relationship class. The highest adjusted provider receives full marginal value, the second receives half, and later providers receive zero. Unquantified candidates cannot displace positive evidence-backed candidates.

## Formation score and placement

Adjusted positive marginals feed the unchanged class caps of 30 conditional payoff, 30 output amplification, and 15 stat support. Only positive marginals establish participation; the existing two- and three-dragon bonuses remain 2 and 5. The public Active Synergy subtotal is rounded once and remains capped at 80.

V3 evaluates all six placements using fractional adjusted uncapped relationship value. Existing absolute and relative meaningful-improvement thresholds and the 0-20 placement formula remain unchanged. All-zero arrangements are deterministic ties and receive 20 placement points.

`rateFormationV3` adds the integer Active Synergy and Placement Effectiveness subtotals and clamps to 0-100. Its separate calibrated thresholds are Excellent 66, Strong 53, Solid 34, and Developing 5. Reliability coverage is reported separately as all, partial, or none quantified; unquantified relationships do not make a complete formation globally incomplete.

## Trace and audit

Structured traces retain signal, component, event, probability-variant, path, mixed-use, opportunity, count, scope, independence, method, reason, and selection data. They are data for a later UI and contain no display-specific React copy.

`pnpm run audit:formation-rating-v3` verifies `docs/formation-rating-v3-audit.json`; the write variant regenerates it intentionally. The audit compares v2 and v3 across all 32,736 ordered formations at maximum star/dragon progression with every unlocked Habit explicitly set to Level 5. It reports deterministic hashes, distributions, transitions, placement changes, method and reason counts, per-dragon changes, and the three requested Velar trios without serializing every full trace.

## Production adoption boundaries

The Formation Builder and all three optimizer strategies consume v3 together. Actual-roster evaluation uses saved Habit progression; planning mode explicitly uses Level 5 for unlocked Habits. The optimizer uses exact fixed-point adjusted relationship values and excludes unquantified potential from every objective.

Persistence, cloud synchronization, routes, sharing, and Estimated Power remain separate from the rating cutover. The historical v2 audit consumes a committed, deeply frozen JSON profile input captured directly from base commit `2832d64c75621ce2fcf57385d716df2f2de52aab`: schema 1, 33 profiles, 239 signals, identity `sha256:68343cd6bfa67e10f616cf8c3ee109f0d19026058cbf6ffb53776aa6cb758719`. The historical module does not import or derive from `simpleSynergyProfiles`; current v3 production continues to use the corrected current profiles. Historical expected output hashes are not rewritten.
