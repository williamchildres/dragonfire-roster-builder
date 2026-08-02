# Formation Reliability layer

## 1. Executive summary

Dragonfire Lab 0.20.3 gives a matched semantic relationship its full fixed value whenever the producing and receiving curated signals are unlocked, position-valid, target-compatible, and tag-compatible. It does not currently distinguish a guaranteed effect from a 10%, 20%, or 50% activation. That is a confirmed model limitation, not proof that any dragon is always ranked incorrectly.

This investigation started from Dragonfire Lab release `0.20.3` at `origin/main` commit `010555fd8f79268a60a805e2ed296a8d6cc322fc`. The report preserves those immutable values as `researchBaselineRelease` and `researchBaselineSha`; they describe the historical research baseline and do not claim that a future audit run analyzes the then-current `main`. It audited all 33 profiles, all 239 curated signals, all 234 currently scoring signals, the five explicitly non-scoring signals, and all 33 position claims. The deterministic machine-readable inventory is [formation-reliability-audit.json](formation-reliability-audit.json).

The inventory found:

| Measure                                                                                | Count |
| -------------------------------------------------------------------------------------- | ----: |
| Currently scoring signals                                                              |   234 |
| Guaranteed signals                                                                     |   133 |
| Conditional-deterministic signals                                                      |    28 |
| Chance-bearing signals, including mixed signals                                        |    73 |
| Mixed guaranteed/chance signals                                                        |     3 |
| Chance-bearing signals with an explicit probability                                    |    69 |
| Signals with Habit-Level probability progression                                       |    43 |
| Signals with exact opportunity count, known scope, and complete independence treatment |     2 |
| Signals with unresolved actual opportunity count                                       |    68 |
| Signals with unresolved independence                                                   |    68 |
| Signals with unknown probability                                                       |     0 |
| Missing reliability coverage                                                           |     0 |
| Chance-bearing signals with at least one guaranteed opportunity                        |    43 |
| Chance-bearing signals with conditional opportunity presence                           |    27 |
| Chance-bearing signals with unknown opportunity presence                               |     3 |
| Deterministic scoring signals where opportunity presence is not applicable             |   161 |

The recommended data design is a hybrid: reusable ability-level reliability components hold roll facts, while every scoring signal explicitly references the component or components that govern it. This avoids duplicated facts and prevents a chance multiplier from being applied to an entire mixed ability.

Recipient eligibility is resolved upstream of reliability. In release 0.23.3, structured targeting resolutions select a documented unique recipient or remain explicitly unresolved; reliability is evaluated only for relationships that survive that eligibility gate. The two Blazing Fury branches share one targeting resolution, so reliability cannot cause sibling effects to select different recipients.

The recommended Formation Rating v3 model is evidence-aware:

- guaranteed components receive reliability 1;
- a confirmed single opportunity uses its documented probability;
- repeated cumulative probability is allowed only when probability, actual opportunity count, separate opportunities, and independence are supported;
- known probability with unresolved additional repetition uses direct `p` only when at least one opportunity is guaranteed;
- conditional or unknown opportunity presence keeps unconditional relationship reliability unquantified while exposing `p` only as conditional per-opportunity evidence;
- unknown probability is displayed as unquantified and receives no fabricated numeric reliability contribution;
- mixed signals must be split or component-referenced before scoring.

No production score, optimizer behavior, Estimated Power value, dragon meaning, roster persistence, route, sharing behavior, account synchronization behavior, version, public disclaimer, or deterministic production hash changed in this research PR.

## 2. Current scoring data flow

The exact production path is:

1. `AbilityDefinition` in `src/models/dragon.ts` defines canonical commands, traits, and habits. Canonical records live in `src/data/dragons.ts` and `src/data/sunfyreTairax.ts`; probability progression currently exists only in `rawDescription`, not structured fields.
2. `OwnedDragon` stores Star Rank, Dragon Level as `reignLevel`, and Habit Levels. `src/services/habitLevels.ts` reconciles Habit Levels 1–5 only for unlocked habits. `src/services/rosterEligibility.ts::currentRosterProgression` exposes only Star Rank and Dragon Level to the current Formation Rating evaluator.
3. `src/synergy/profiles.ts::simpleSynergyProfiles` curates `outputs`, `supports`, `benefitsFrom`, and `positionClaims` as `SynergySignal` and `PositionClaim` values from `src/synergy/types.ts`.
4. `src/app/App.tsx` creates formation progression, calls `evaluateFormation`, then calls `buildSemanticRelationships`, `compareFormationPlacements`, and `rateFormation`.
5. `src/synergy/evaluateFormation.ts::evaluateFormation` selects the three profiles, checks unlocks, hard positions, adjacency, recipient selectors, and tag compatibility, and emits deterministic `setup-payoff` and `amplifier-output` results. A single semantic provider/tag/beneficiary candidate is selected deterministically.
6. `src/synergy/semanticRelationships.ts::buildSemanticRelationships` canonicalizes Control aliases and converts active results to `SemanticRelationship` records. Base values are 10 for `conditional-payoff`, 6 for `output-amplification`, and 5 for `stat-support`.
7. Redundant providers for the same beneficiary, semantic tag, and class receive 100%, 50%, then 0% marginal credit. `relationshipValue` sums positive marginal values without the Formation Rating class caps.
8. `src/services/formationRating.ts::scoreActiveSynergy` caps conditional payoff at 30, output amplification at 30, and stat support at 15, adds a +5 three-dragon or +2 two-dragon participation bonus, and caps Active Synergy at 80. `rateFormation` adds Placement Effectiveness up to 20.
9. `src/services/formationPlacementComparison.ts::compareFormationPlacements` evaluates all six arrangements of the selected trio using the same evaluator and relationship builder. A meaningful alternative requires both at least +5 relationship value and at least 10% relative gain.
10. `src/optimizer/rosterOptimizerCandidates.ts::generateOptimizerFormationCandidates` generates a best-placement candidate for every eligible trio and consumes the same Formation Rating, uncapped relationship value, active relationship count, and stable keys.
11. `src/optimizer/rosterOptimizerObjective.ts` compares total rating, minimum rating, the complete ascending rating vector, uncapped relationship value, relationship count, and stable solution key after the strategy-specific Power or rarity objectives.
12. `src/app/SimpleFormationAnalysis.tsx` displays the score, two-category breakdown, relationship summaries, ability IDs, marginal values, and redundancy ranks. `src/app/formationCardPresentation.ts` independently builds signal-state chips for the formation cards.
13. `src/audit/fullRosterAudit.ts` sweeps all 32,736 ordered formations and produces the current Formation Rating v2 hash `5678952ad31630f7702fc2c56c6c9c5378b2445292696e39accb58f078ba9baf`. `src/audit/rosterOptimizerAudit.ts` pins that hash and the optimizer fixtures. `src/optimizer/rosterOptimizerTypes.ts` identifies optimizer contract version 3 and rating contract `formation-rating-v2`.

The decisive current boundary is between `buildSemanticRelationships` and `scoreActiveSynergy`: relationships already carry source ability IDs, class, base value, marginal value, and stable semantic identity, but not the specific signal IDs or reliability components that produced the chosen relationship.

## 3. Current limitation

Unlock, position, adjacency, recipient selection, and tag matching are explicit. Random activation is not. Once a chance-bearing signal passes the static gates, its relationship receives the same base value as a guaranteed signal of the same class.

The limitation has four distinct forms:

- a 20% single check receives full value;
- repeated checks receive neither cumulative treatment nor frequency treatment;
- one shared roll and several separate per-target/per-effect rolls are indistinguishable;
- a mixed ability can be represented by separate signals correctly, but three current receiving signals still summarize both guaranteed and chance-based components.

The current public disclaimer accurately states this limitation and remains unchanged in 0.20.3.

## 4. Full inventory summary

The audit classifies the 234 scoring signals, not merely abilities containing the word “chance.” A deterministic component in an ability that also has a random component remains deterministic. Position claims and five explicitly non-scoring defensive/Recovery-Received signals are separately classified as not applicable to activation reliability.

| Dragon        | Scoring | Chance-bearing | Mixed | Conditional deterministic |
| ------------- | ------: | -------------: | ----: | ------------------------: |
| Antares       |       6 |              1 |     0 |                         1 |
| Arrax         |       5 |              2 |     0 |                         1 |
| Arulix        |       5 |              2 |     0 |                         2 |
| Bevlorin      |      10 |              4 |     0 |                         0 |
| Caraxes       |       6 |              3 |     0 |                         1 |
| Crimson       |       5 |              2 |     0 |                         1 |
| Daemoros      |       5 |              3 |     0 |                         0 |
| Dawnseeker    |      11 |              1 |     0 |                         0 |
| Feskar        |       5 |              1 |     0 |                         2 |
| Jagadrix      |       7 |              2 |     0 |                         1 |
| Kalspire      |       4 |              2 |     0 |                         2 |
| Malachite     |       8 |              4 |     0 |                         0 |
| Nyrena        |       9 |              0 |     0 |                         1 |
| Rhysarion     |       8 |              2 |     0 |                         1 |
| Seasmoke      |       7 |              1 |     0 |                         1 |
| Shadowrend    |      14 |              3 |     0 |                         0 |
| Shadowsong    |       7 |              4 |     1 |                         0 |
| Sheepstealer  |       4 |              0 |     0 |                         1 |
| Shimmer       |      10 |              4 |     1 |                         0 |
| Solstryker    |       6 |              1 |     0 |                         3 |
| Sunfyre       |       6 |              1 |     0 |                         2 |
| Syrax         |      10 |              3 |     0 |                         1 |
| Tairax        |       9 |              4 |     0 |                         3 |
| Tashix        |       6 |              0 |     0 |                         0 |
| Tessarion     |       4 |              0 |     0 |                         0 |
| Thunderstrike |       8 |              3 |     0 |                         2 |
| Vaeldra       |       6 |              3 |     0 |                         0 |
| Velar         |       9 |              3 |     0 |                         0 |
| Venator       |       5 |              1 |     0 |                         2 |
| Vermax        |       5 |              2 |     0 |                         0 |
| Vesper        |       9 |              3 |     0 |                         0 |
| Vhagar        |       7 |              3 |     0 |                         0 |
| Zivern        |       8 |              5 |     1 |                         0 |

The JSON report records, for every signal, the dragon, category, tags, source ability, ability kind, unlocks, Habit dependence, description, confidence, relationship class/value exposure, component IDs, probability, timing, scope, opportunity model, target count, per-target/per-effect status, duration, independence, canonical wording, evidence IDs, verification source, and unresolved questions.

## 5. Reliability classification vocabulary

The minimum classification vocabulary is:

| Classification                                   | Meaning                                                                                                                                                |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `guaranteed`                                     | The component occurs deterministically when unlocked and position-valid. A schedule may still be battle-length-dependent, but there is no random roll. |
| `conditional-deterministic`                      | No random roll exists; a documented battle-state or action condition decides whether it occurs. Condition frequency is not estimated.                  |
| `known-single-opportunity-chance`                | One opportunity and its probability are explicit.                                                                                                      |
| `known-repeated-opportunity-chance`              | A repeated schedule is explicit, but actual battle reach and/or temporal independence may remain unresolved.                                           |
| `known-chance-with-unresolved-opportunity-count` | Probability is explicit but battle length, Basic Attack count, Command frequency, or condition count prevents a supported `n`.                         |
| `probability-present-exact-value-unresolved`     | Chance facts exist, but the scoring component is a composite whose exact activation probability is not derivable.                                      |
| `probability-unknown`                            | The source says activation is random but supplies no supported probability. No current scoring signal is in this class.                                |
| `mixed-guaranteed-and-chance-based-ability`      | One current signal summarizes components with different reliability. It must be split or component-referenced before scoring.                          |
| `not-applicable-to-activation-reliability`       | Position claims and explicitly non-scoring signal rows are deterministic gates or outside Formation Rating.                                            |

Unlock and hard-position failures remain inactive, not low reliability. A locked signal contributes nothing exactly as it does now.

Classification coverage is explicit, not inferred. The research audit contains registries for guaranteed, conditional-deterministic, chance-bearing, and mixed guaranteed/chance scoring signal IDs. There is no default-to-guaranteed branch. Before any row receives `coverageStatus: "covered"`, the audit compares the 234 current scoring IDs with those registries, sorts any missing IDs, and fails with a deterministic error containing the exact list. `signalsMissingProposedReliabilityCoverage` is computed from that list rather than fixed to zero. The five `nonScoring: true` rows remain separately represented as `not-applicable-to-activation-reliability` and are not used to satisfy scoring coverage.

## 6. Roll-scope vocabulary

Timing and scope should be orthogonal. The smallest supported timing vocabulary is:

- `start-of-combat`;
- `scheduled-rounds` with an ordered round array;
- `each-round`;
- `after-ability-activation` with the source event, such as Basic Attack;
- `conditional-event`, such as successful Taunt or one check per Burned Enemy;
- `unresolved`.

The smallest supported roll-scope vocabulary is:

- `shared`: one roll controls all listed recipients/effects;
- `per-target`: separate checks are stated per target;
- `per-effect`: separate checks are stated per effect or stat branch;
- `per-target-and-effect`;
- `unresolved`.

`once-per-hit` is not needed as a top-level value today; it is an `after-ability-activation` schedule whose source event can be a hit. `repeated-known-schedule` belongs in the opportunity object, not roll scope. “Separate checks” and statistical independence remain different fields.

Opportunity existence is also independent of opportunity count:

| Opportunity presence      | Meaning                                                                                                                                                   | Current chance-bearing or mixed signals |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------: |
| `guaranteed-at-least-one` | At least one opportunity is supported after unlock and static position gates pass. Additional opportunities may remain unresolved.                        |                                      43 |
| `conditional`             | The first opportunity requires battle reach, a Basic Attack, a successful status, a below-50% branch, a Burned Enemy, or another documented prerequisite. |                                      27 |
| `unknown`                 | Current mixed signal semantics do not identify one component-level opportunity path.                                                                      |                                       3 |
| `not-applicable`          | No random opportunity exists for the deterministic signal.                                                                                                |                     161 scoring signals |

Scheduled checks beginning after Round 1 are conditional because the battle may end before the first listed round. Scheduled Round 1 and unconditional each-round checks can support at least one opportunity. Basic-Attack, below-50%, successful-status, Burned-Enemy, chance-setup, and other prerequisite-driven checks remain conditional. The audit never infers battle length.

This vocabulary distinguishes:

- Velar Whirlwind Advantage: four scheduled shared rolls, each affecting two other Allies;
- Velar Gales of Power: four scheduled rounds, separate target and effect checks;
- Velar Breath of Renewal Recovery: deterministic scheduled applications;
- Tairax Gift of Fire: per-round checks whose count depends on Burned Enemies;
- Malachite Lightning Strike: one shared Round 1 roll governing several effects;
- Tairax Sunder: conditional deterministic with no random roll.

## 7. Proposed metadata contract

Use option D, a hybrid. Ability-level component definitions own the reusable roll facts. Every scoring signal has explicit component references. Canonical `rawDescription` remains evidence and display text, never a production parser input.

```ts
type ReliabilityClass = 'guaranteed' | 'conditional-deterministic' | 'chance' | 'unknown';

type RollTiming =
  | { kind: 'start-of-combat' }
  | { kind: 'scheduled-rounds'; rounds: number[] }
  | { kind: 'each-round' }
  | { kind: 'after-ability-activation'; abilityEvent: string }
  | { kind: 'conditional-event'; event: string }
  | { kind: 'unresolved' };

type Probability =
  | { kind: 'fixed'; value: number }
  | { kind: 'habit-level'; values: Record<1 | 2 | 3 | 4 | 5, number> }
  | { kind: 'round-specific'; values: Record<number, number> }
  | { kind: 'unknown' };

type OpportunityPresence = 'guaranteed-at-least-one' | 'conditional' | 'unknown' | 'not-applicable';

interface AbilityReliabilityComponent {
  id: `${string}:${string}`; // ability-id:stable-component-slug
  abilityId: string;
  class: ReliabilityClass;
  probability?: Probability;
  timing: RollTiming;
  opportunityPresence: OpportunityPresence;
  opportunityCount:
    | { kind: 'exact'; value: number }
    | { kind: 'scheduled-maximum'; value: number; battleLengthDependent: true }
    | { kind: 'unresolved'; reason: string };
  rollScope: 'shared' | 'per-target' | 'per-effect' | 'per-target-and-effect' | 'unresolved';
  targetCount?: number;
  separatePerTarget?: boolean;
  separatePerEffect?: boolean;
  independence:
    'confirmed' | 'reasonable-model-assumption' | 'unknown' | 'contradicted' | 'not-applicable';
  durationRounds?: number;
  sourceAbilityId: string;
  unlock: { minimumStarRank?: number; minimumDragonLevel?: number };
  evidence: { confidence: 'verified' | 'provisional'; evidenceIds: string[] };
  unresolved: string[];
}

interface SynergySignal {
  // existing fields...
  reliabilityComponentIds: string[];
}
```

Stable component IDs should describe source semantics, not UI wording: `velar-gales-of-power:first-strike`, `velar-gales-of-power:slow`, `velar-breath-of-renewal:cleanse`, and `velar-breath-of-renewal:recovery`.

The production migration should place component definitions in a typed curated module near canonical abilities, export them in project context, and require profile coverage in CI. The research inventory in `src/audit/formationReliabilityAudit.ts` is intentionally read-only and is not production data.

## 8. Mixed-ability handling

Reliability is component-specific, never ability-wide.

Velar Breath of Renewal demonstrates the rule: Cleanse is chance-based per target each round, while Recovery is deterministic on rounds 2, 4, 6, and 8. The current scoring profile includes only the Recovery signal, so it remains guaranteed. Adding a future Cleanse signal would reference `velar-breath-of-renewal:cleanse`; it must not change Recovery reliability.

The audit found three current mixed receiving signals:

| Signal                                        | Guaranteed component                                     | Chance component                                  | Required migration                                    |
| --------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------- |
| `shadowsong-panic-payoff`                     | Panic increases Breath of Fire damage                    | Panic doubles Scorched Earth chance               | Split or reference both payoff components             |
| `shimmer-unbreakable-loyalty-instinct-payoff` | Instinct improves scheduled Tactical Damage and Recovery | Instinct improves the 30% Command buffs           | Split into three component-specific receiving signals |
| `zivern-battle-mastery-intelligence-payoff`   | Intelligence improves deterministic Battle Mastery       | Intelligence improves chance-based Fearsome Reach | Split or reference both components                    |

A relationship may carry multiple candidate component paths. If any valid path is guaranteed, chance-based alternatives must not discount that relationship. If multiple tags come from one component, the component event is counted once.

## 9. Candidate model comparison

| Model                          | Explainability                  | Repeated/per-target correctness                                                                                                    | False precision                                           | Data need                                       | Optimizer stability                                             | Recommendation                                                          |
| ------------------------------ | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------- |
| A — direct `p`                 | Very high                       | Describes one per-opportunity check; it is not unconditional activation reliability when zero opportunities are possible           | Low                                                       | Probability plus supported opportunity presence | Stable but may overstate or understate unconditional activation | Use only as a one-supported-opportunity fallback or conditional display |
| B — `1 - (1-p)^n`              | High when assumptions are shown | Correct only for supported independent opportunities and a defined “at least once” event                                           | High when `n`, valid targets, or independence are guessed | `p`, actual `n`, scope, independence            | Can move ranks sharply with target count                        | Use only for evidence-complete components                               |
| C — expected successes `n × p` | Moderate                        | Measures frequency, not at-least-once activation; easily over-rewards many targets                                                 | High after arbitrary cap/normalization                    | `p`, `n`, target count, normalization           | Most volatile                                                   | Defer                                                                   |
| D — coarse tiers               | High                            | Hides exact supported probabilities and threshold artifacts                                                                        | Low numeric precision but high boundary arbitrariness     | Curated tier policy                             | Stable near tier centers, unstable at boundaries                | Display aid only                                                        |
| E — evidence-aware hybrid      | High                            | Uses cumulative only where supported, direct `p` only with one supported opportunity, and unquantified joint reliability otherwise | Lowest supported precision                                | Explicit component/event evidence               | Predictable and auditable                                       | Recommended                                                             |

Duration, magnitude, expected targets, and expected active rounds are intentionally excluded from every candidate calculation in this document.

## 10. Recommended model

Formation Rating v3 should measure the probability that the relationship-enabling component activates at least once within a supported opportunity window.

1. Guaranteed component: reliability 1.
2. Conditional deterministic component: reliability 1 once the existing static evaluator can prove its condition; otherwise label its frequency unmodeled and do not invent a condition probability.
3. Guaranteed at least one opportunity, known `p`, and unresolved additional repetition: use direct `p` as the one-supported-opportunity fallback.
4. Repeated opportunities with guaranteed presence, supported actual `n`, known scope, and confirmed independence: `1 - (1-p)^n`.
5. Conditional or unknown opportunity presence: expose `p` as conditional per-opportunity reliability, but keep unconditional relationship reliability and its adjusted numeric contribution unquantified until the prerequisite event path is resolved.
6. Unknown `p`: do not fabricate a percentage. Keep the base relationship visible as unquantified potential but contribute 0 to the reliability-adjusted numeric subtotal until evidence exists.
7. Mixed signal: block scoring migration for that signal until it has component-specific references.
8. Chance setup plus chance payoff: resolve both explicit component events; never apply only the downstream `p`.
9. Guaranteed setup plus chance payoff: use payoff reliability only when at least one payoff opportunity is supported.
10. Chance setup plus guaranteed payoff: use setup reliability.

“Reasonable model assumption” may be retained in metadata for experiments, but v3 production cumulative scoring should require confirmed independence. This keeps the public score evidence-backed.

## 11. Independence policy

`1 - (1-p)^n` is permitted only when:

- `p` applies to each opportunity;
- at least one opportunity is guaranteed within the measured window;
- the actual opportunity window and `n` are defined;
- separate opportunities are explicit;
- statistical independence is confirmed;
- target validity for the measured event is defined.

“Checked separately per target” confirms distinct rolls but does not, by itself, prove statistical independence. The audit therefore leaves Velar Gales of Power independence unknown despite its explicit per-target/per-effect wording. Temporal independence is also unknown for nearly every repeated check.

Independence values are `confirmed`, `reasonable-model-assumption`, `unknown`, `contradicted`, and `not-applicable`. Production treats only `confirmed` as cumulative-eligible.

Evidence-complete detection is count-aware. An exact count of one requires `independence: 'not-applicable'`. An exact count greater than one requires `independence: 'confirmed'`. Explicit probability and known roll scope are still required, and `opportunityPresence` must be `guaranteed-at-least-one`; conditional or unknown presence is never evidence-complete. Under these corrected rules, the current evidence-complete count remains two because only the two Malachite Lightning Strike signals satisfy every requirement.

## 12. Unknown-data fallback policy

| Unresolved fact                                                                     | Default                                                                                                                 |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Guaranteed at least one opportunity, known `p`, unknown additional count            | Direct `p`; label “One opportunity supported; additional repetition unresolved.”                                        |
| Conditional or unknown opportunity presence                                         | Show `p` as conditional per-opportunity evidence; keep unconditional relationship reliability unquantified.             |
| Known schedule whose first check may not be reached                                 | Keep unconditional relationship reliability unquantified until the observation window or battle reach is supported.     |
| Guaranteed opportunity presence, known multiple opportunities, unknown independence | Direct `p` for the one supported opportunity; do not use cumulative probability.                                        |
| Known target count, unknown valid-target availability                               | Score the relationship’s documented recipient component once; do not multiply by target count.                          |
| Ability activation frequency unknown                                                | Treat opportunity presence as conditional or unknown; do not convert per-opportunity `p` into unconditional activation. |
| Probability unknown                                                                 | Numeric adjusted contribution 0 and visible unquantified base potential.                                                |
| Mixed known/unknown components                                                      | Use a separately referenced known component; otherwise keep the relationship unquantified.                              |

This policy avoids treating unresolved chance as guaranteed and avoids inventing a fixed “unknown” percentage. Direct `p` is not universally conservative: when zero opportunities are possible, it can exceed the unconditional probability of activation.

## 13. Habit Level handling

The existing roster contract remains:

- locked Habits contribute nothing;
- unlocked Habits have levels 1–5, never level 0 or unknown;
- lowering progression removes an invalid stored Habit Level;
- ownership removal does not erase otherwise valid progression data;
- Habit Levels remain excluded from Estimated Power.

Current Formation Rating progression exposes only Star Rank and Dragon Level through `DragonProgression`; Habit Levels are stored on `OwnedDragon` but are not passed to the evaluator. Canonical probability values are prose in `rawDescription`.

The production migration must:

1. add active Habit Levels to the formation-evaluation progression input without changing storage;
2. define structured `Probability.kind = 'habit-level'` values;
3. select the active value only after the habit is unlocked;
4. avoid parsing progression prose at runtime;
5. preserve the current behavior when no reliability scoring mode is active.

## 14. Velar case study

### Signal trace

| Current Velar signal                   | Current full base exposure                                                        | Classification | Supported reliability facts                                                                                                                                                                  |
| -------------------------------------- | --------------------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `velar-whirlwind-tactical`             | Receiving output for 6-value amplification and 5-value stat support               | Guaranteed     | Tactical Damage on rounds 3, 5, 7, 9                                                                                                                                                         |
| `velar-whirlwind-advantage-damage`     | Producing 6-value amplification                                                   | Chance         | `p=20%`; rounds 2, 4, 6, 8; one shared roll affects two other Allies; opportunity presence is conditional on reaching Round 2; independence across rounds unknown                            |
| `velar-gales-of-power-first-strike`    | Producing 10-value conditional payoff                                             | Chance         | Habit 1–5 `p=12%, 14.4%, 16.8%, 20.4%, 24%`; four scheduled rounds; opportunity presence is conditional on reaching Round 2; three targets; separate per target/effect; independence unknown |
| `velar-gales-of-power-slow`            | Producing 10-value conditional payoff                                             | Chance         | Same progression, conditional opportunity presence, and schedule as First-Strike; separate effect and enemy-target checks                                                                    |
| `velar-breath-of-renewal-recovery`     | Producing 10-value payoff; receiving 5-value Initiative support                   | Guaranteed     | Recovery on rounds 2, 4, 6, 8; Habit changes Recovery rate, not activation                                                                                                                   |
| `velar-strategic-leader-tactical`      | Producing 6-value amplification                                                   | Guaranteed     | Start-of-combat support to one Ally prioritizing Vanguard; Habit changes magnitude                                                                                                           |
| `velar-fierce-unity-stats`             | Producing 5-value stat support                                                    | Guaranteed     | Start-of-combat Strength and Instinct support to all three Allies                                                                                                                            |
| `velar-sentinels-wit-left-stats`       | Producing 5-value stat support when Velar is Vanguard and recipient is Left Flank | Guaranteed     | Dragon Level 16 hard position support                                                                                                                                                        |
| `velar-fierce-unity-initiative-payoff` | Receiving 5-value stat support                                                    | Guaranteed     | Initiative enhances deterministic Fierce Unity and Recovery magnitude                                                                                                                        |

Whirlwind’s Star 10 Cleanse and Breath of Renewal’s Cleanse progression are canonical chance components but are not current scoring signals. They are inventoried as required future component evidence, not silently added to the current profile.

At Habit Level 5:

- conditional per-opportunity `p` for either Gales effect is 24%; it is not unconditional activation reliability without support that Round 2 is reached;
- an independence-assumption per-target four-round cumulative value would be `1 - 0.76^4 = 66.64%`;
- an independence-and-three-valid-target assumption for at least one Slow would be `1 - 0.76^12 = 96.27%`;
- those cumulative values are diagnostic only because temporal and target independence are not confirmed;
- Whirlwind Advantage conditional per-opportunity `p` is 20%; if all four rounds were reached and independent, the diagnostic cumulative value would be `1 - 0.8^4 = 59.04%`.

### Three representative formations

All cases use Star Rank 10, Dragon Level 16, and Habit Level 5 for the diagnostic probabilities. Current scores and relationships come from the production v2 evaluator. Candidate scores below hold each stated v2 Placement Effectiveness score fixed so the model effect is visible; a real v3 must rerun all six placements and may produce a different placement score.

| Formation                    | Current active / placement / total | Current uncapped relationship value | Deterministic current value | Chance-backed current value |
| ---------------------------- | ---------------------------------: | ----------------------------------: | --------------------------: | --------------------------: |
| Velar / Caraxes / Syrax      |                       71 / 20 / 91 |                                  76 |                          46 |                          30 |
| Velar / Sheepstealer / Syrax |                       66 / 20 / 86 |                                  66 |                          53 |                          13 |
| Velar / Kalspire / Venator   |                       41 / 16 / 57 |                                  36 |                          24 |                          12 |

Chance-backed relationships receiving full v2 credit:

| Formation                    | Relationship                                | Current marginal | Direct per-opportunity scenario |                     Cumulative assumption |
| ---------------------------- | ------------------------------------------- | ---------------: | ------------------------------: | ----------------------------------------: |
| Velar / Caraxes / Syrax      | Caraxes Slow → Syrax Strategic Revival      |               10 |                            2.00 |               2.00; actual `n` unresolved |
|                              | Syrax First-Strike → Caraxes Infernal Burst |               10 |                            2.00 |               2.00; actual `n` unresolved |
|                              | Velar Advantage → Caraxes Fire              |                3 |                            0.60 |                                      1.77 |
|                              | Velar First-Strike → Caraxes Infernal Burst |                5 |                            1.20 |                           3.33 per-target |
|                              | Velar Slow → Syrax Strategic Revival        |                5 |                            1.20 | 4.81 assuming 12 independent valid checks |
| Velar / Sheepstealer / Syrax | Velar Advantage → Sheepstealer Fire         |                3 |                            0.60 |                                      1.77 |
|                              | Velar Slow → Syrax Strategic Revival        |               10 |                            2.40 | 9.63 assuming 12 independent valid checks |
| Velar / Kalspire / Venator   | Velar Advantage → Kalspire Physical         |                6 |                            1.20 |                                      3.54 |
|                              | Velar Advantage → Venator Physical          |                6 |                            1.20 |                                      3.54 |

Strategic Leader supplies a guaranteed Tactical support path in all applicable Velar relationships, so a relationship that also lists Whirlwind must remain full when the guaranteed path is valid. Fierce Unity stat relationships and Breath of Renewal Recovery likewise remain full.

Illustrative three-formation ranking:

| Model                                                                       | Velar/Caraxes/Syrax | Velar/Sheepstealer/Syrax | Velar/Kalspire/Venator | Rank change                                                     |
| --------------------------------------------------------------------------- | ------------------: | -----------------------: | ---------------------: | --------------------------------------------------------------- |
| Current v2                                                                  |                  91 |                       86 |                     57 | Caraxes first                                                   |
| A — direct per-opportunity discount scenario                                |                  65 |                       76 |                     47 | Sheepstealer becomes first in this illustration                 |
| B — cumulative where an explicit independence assumption is made            |                  72 |                       84 |                     52 | Sheepstealer remains first; values are not production-supported |
| C — capped `n × p` illustration                                             |                  74 |                       85 |                     55 | Sheepstealer remains first; target frequency drives large gains |
| D — Low tier = 0.25 illustration                                            |                  66 |                       76 |                     48 | Sheepstealer becomes first; tier boundary is arbitrary          |
| E — illustrative one-opportunity fallback if one opportunity were supported |                  65 |                       76 |                     47 | Not a final v3 result for Velar’s Round-2-dependent checks      |

The `65 / 76 / 47` values are a direct per-opportunity discount scenario, not final v3 activation scores. Velar’s three chance signals begin at Round 2, so unconditional relationship reliability remains unquantified until battle reach is supported. The diagnostic supports the limitation: chance weighting can change a specific comparison. It does not support a categorical statement that Velar is overrated. Deterministic Velar relationships remain substantial, different trios expose different chance paths, and all six placements must be recalculated during the actual v3 implementation.

## 15. Representative non-Velar cases

| Requested case                                        | Repository-backed example                                                                         | Contract/model behavior                                                                                                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guaranteed setup/payoff                               | Syrax Strategic Revival Recovery → Sheepstealer Hunter’s Cunning Recovery payoff                  | Reliability 1 after unlock; duration/magnitude excluded                                                                                                          |
| Low-chance one-opportunity                            | No current scoring signal is both low-chance and exact-single-opportunity                         | Do not invent one. Closest low chance is Velar Gales at 12% with repeated schedule; exact single-opportunity examples are Malachite Lightning Strike at 40–100%. |
| Repeated scheduled chance                             | Crimson Bloodscale Terror Stun; five odd-round checks, with a Habit-dependent Round 1 replacement | Round 1 supports one opportunity, so direct `p` is valid while additional `n` and temporal independence remain unresolved                                        |
| Separate per-target chance                            | Kalspire Tactical Strike Bleed against two targets after each Basic Attack                        | Preserve per-target scope; Basic Attack count and independence remain unresolved                                                                                 |
| Multiple effects with separate checks                 | Caraxes Crippling Inferno Slow and Burn                                                           | Separate component IDs and per-target/effect scope; no shared-roll assumption                                                                                    |
| Mixed guaranteed/chance ability                       | Shimmer Unbreakable Loyalty                                                                       | Chance Command buffs, guaranteed scheduled Tactical Damage, and guaranteed Recovery use separate components                                                      |
| Conditional opportunity presence and unresolved count | Tairax Gift of Fire                                                                               | `p` by Habit Level is conditional per Burned-Enemy opportunity; unconditional reliability remains unquantified                                                   |
| Unknown probability                                   | None among current scoring signals                                                                | Keep the supported zero count. Vaeldra Tempting Distraction is instead an exact composite probability unresolved from known Taunt sources.                       |
| High-chance effect                                    | Malachite Lightning Strike reaches 100% at Habit Level 5                                          | One supported opportunity uses exact `p`; at level 5 reliability is 1                                                                                            |
| Conditional deterministic                             | Tairax Sunder applies only to Control-afflicted Enemies                                           | Reliability is deterministic conditional; condition frequency is not guessed                                                                                     |
| Position-dependent deterministic support              | Velar Sentinel’s Wit or Vesper Sentinel’s Wit                                                     | Full reliability only after Level 16, Vanguard provider, and Left Flank recipient gates pass                                                                     |

## 16. Proposed v3 calculation

Reliability should be calculated in a new pure service between active result selection and semantic relationship aggregation. The service receives the selected provider signal, selected receiving signal, active Habit Levels, and component definitions, and returns a stable relationship reliability trace. Current production additionally receives the upstream structured targeting result; an unresolved recipient suppresses the relationship before any reliability weight is assigned.

Reliability belongs to the relationship-enabling event graph:

- guaranteed setup + chance payoff: use the payoff component reliability;
- chance setup + guaranteed payoff: use the setup reliability;
- chance setup + chance payoff: follow both explicit component events; combine them only when their joint behavior is supported, never by applying only the downstream probability;
- two chance-dependent sides referring to the same component/event: count the component once;
- two distinct chance-dependent sides with confirmed independence: multiply;
- two distinct chance-dependent sides without confirmed joint behavior: mark joint reliability unquantified instead of multiplying;
- amplification: treat the buff/support activation and receiving output as distinct components; do not discount a guaranteed alternative provider path;
- multiple matched tags from the same component: one component event and one semantic relationship;
- mixed abilities: selected signal component references prevent whole-ability discounting.

Proposed numeric flow:

1. Build active component-qualified candidates.
2. Choose the deterministic preferred candidate by current unlock/position/tag ordering plus stable signal/component IDs.
3. Compute `baseValue` exactly as v2.
4. Return either a quantified `reliability` or an unquantified trace with conditional per-opportunity evidence.
5. For quantified traces, compute `adjustedBaseValue = baseValue × reliability`. Keep unquantified base potential visible but outside the adjusted numeric subtotal.
6. Apply provider redundancy to adjusted value in stable provider/component order.
7. Sum unrounded marginal values by relationship class.
8. Apply existing class caps and participation behavior to unrounded subtotals.
9. Round only the public Active Synergy score to an integer at the existing boundary.
10. Recompute all six placements from adjusted uncapped relationship values.

Store calculation values as ordinary deterministic JavaScript numbers, serialize probabilities and adjusted contributions to at least six decimal places in audit/hash inputs, and display percentages to at most two decimals and contributions to two decimals. Do not round component reliability before multiplication.

The optimizer consumes the same v3 candidate fields. Uncapped adjusted relationship value replaces v2 uncapped value in placement and optimizer tie-breaking. Stable candidate ordering remains lexicographic after every numeric objective.

## 17. Proposed breakdown presentation

When evidence is complete:

> Base relationship value: 10; activation reliability: 36%; adjusted contribution: 3.60.
> Evidence: two confirmed independent 20% opportunities

The calculation is internally consistent: `1 - (1 - 0.20)^2 = 36%`. Four confirmed independent 20% opportunities would instead be `1 - (1 - 0.20)^4 = 59.04%`.

When evidence is incomplete:

- “Reliability based on one supported opportunity.”
- “Repeated opportunities unresolved.”
- “Probability shown is conditional per opportunity; unconditional activation is unresolved.”
- “Probability known; activation frequency unresolved.”
- “Separate target checks confirmed; independence unresolved.”
- “Reliability not yet quantified.”
- “Guaranteed component; condition frequency is not modeled.”

Relationship details should show component IDs and whether several ability IDs represent alternative paths or one shared event.

After v3 launches, replace the 0.20.3 disclaimer with:

> Formation Rating weights mapped relationships by documented activation reliability when evidence supports it. Repeated opportunities use cumulative treatment only with supported opportunity counts and independence. It still does not model effect magnitude, duration value, target overlap, battle length, damage, healing, movement, enemy composition, or combat outcomes.

## 18. Optimizer implications

Candidate generation already reuses Formation Rating and all six placements, so the architectural adoption point is `generateOptimizerFormationCandidates`. No solver rewrite is required, but every candidate rating, best arrangement, uncapped relationship total, active count, tier, stable solution, and result hash can change.

The safe comparison path is to keep a temporary explicit `formation-rating-v2`/`formation-rating-v3` engine selector in audit code, not user persistence. Production should expose one released contract at a time. Power-Aware mode must continue selecting the 15-dragon Primary pool using Estimated Power before Formation Rating organizes equal-Power choices.

Tie-breaking effects are expected because reliability creates fractional uncapped values even when public integer scores tie. The optimizer must use stable unrounded adjusted totals before the stable key and must include the rating contract in request fingerprints.

## 19. Version and hash impact

| Category                            | Later v3 impact                                                                                                                                                                         |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contracts that must change          | Introduce Formation Rating v3 identifier; change `ROSTER_OPTIMIZER_RATING_CONTRACT` to `formation-rating-v3`; bump optimizer contract version because request/result semantics change   |
| Hashes that naturally change        | Full-roster Formation Rating hash `567895…`; optimizer request fingerprints; optimizer solution/result hashes; placement-comparison and full-roster regression fixtures                 |
| Schemas that may need additive bump | `SynergySignal` component references; curated reliability component source; database/source schema 13 if exported canonical schema changes; project-context export schema and snapshots |
| UI artifacts that change            | Relationship breakdown types, explanation snapshots, disclaimer text, public methodology copy                                                                                           |
| Release metadata                    | Release version and changelog only in the later behavior-changing release                                                                                                               |
| Contracts that remain unchanged     | Estimated Power model/version/hashes; roster schema 5 unless new user data is stored; cloud roster contract; ownership/account sync; routes; team sharing; dragon canonical wording     |

The project-context package ZIP must not be regenerated in this investigation.

The corrected research artifact has deterministic audit hash `f2984df99ea2d2cbc0b12866287cc3c03248048c86b9f5e3ffed490e0449918f`. This hash covers the research report, including explicit classification coverage, opportunity presence, count-aware evidence completeness, and historical baseline provenance. It is not a production Formation Rating, optimizer, or Estimated Power hash.

## 20. Staged implementation plan

1. **PR A — production contract and audit gate.** Add typed reliability component definitions and `SynergySignal.reliabilityComponentIds`, active Habit Level input, component validators, and project-context exports. No scoring change.
2. **PR B — complete curated migration.** Move the research facts into production-curated metadata, split the three mixed signals, classify every component, record unresolved facts explicitly, and require 100% coverage. No scoring change.
3. **PR C — Formation Rating v3 engine and comparison audits.** Add the evidence-aware calculator, relationship traces, v2/v3 audit comparison, six-placement recalculation, version/hash changes, focused UI breakdown data, and exhaustive Formation Rating fixtures. Keep the optimizer audit pinned to v2 only as a temporary comparison harness.
4. **PR D — optimizer and public release.** Adopt v3 in optimizer candidates/objectives, bump the optimizer contract, regenerate all optimizer hashes, update UI explanations and disclaimer, run full audits, bump release metadata, and remove the temporary v2 production path.

This sequence isolates contract review, data review, scoring behavior, and optimizer/release adoption.

## 21. Required gameplay evidence

Highest-value evidence gaps:

- temporal independence for repeated scheduled and each-round checks;
- whether “checked separately” also means statistically independent;
- group roll versus per-target roll for Vhagar Taunt, Vaeldra Taunt, Zivern Fearsome Reach/Cloak of Terror, Shadowsong Scorched Earth, and Seasmoke Loyal Bond;
- actual valid-target behavior when fewer targets exist or preferred targets are invalid;
- Basic Attack and Command opportunity counts, including Double-Strike interactions;
- whether repeated rolls stop when an effect is already active, refresh it, or stack it;
- Battle length distribution only if a later model defines a battle-window cumulative probability;
- shared-event identity where several current signals or tags come from one roll;
- Vaeldra Tempting Distraction composite event identity across Lure and Siren’s Call;
- exact low-chance single-opportunity and unknown-probability examples if future canonical data introduces them.

Acceptable evidence is canonical in-game wording/screenshots or controlled gameplay observations with explicit build, progression, targets, rounds, and repeated trials. Absence of a proc is not proof of dependence.

## 22. Explicit non-goals

This investigation does not implement or change:

- production Formation Rating values, tiers, placement decisions, or hashes;
- optimizer rankings, objectives, tie-breaking, or hashes;
- Estimated Power;
- effect magnitude, damage rate, Recovery rate, duration value, expected active rounds, or expected affected targets;
- battle, AI, target-selection, movement, enemy-composition, or combat-outcome simulation;
- private combat stats or dragon power;
- canonical ability wording or curated profile meaning;
- roster persistence, account synchronization, routes, formation sharing, or release metadata;
- the existing public disclaimer;
- Velar-specific scoring logic.

The new audit reads canonical data and profiles, emits a stable sorted report, and never writes to or mutates production data.
