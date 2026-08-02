# Formation Builder UI

The live Formation Builder is a high-level formation planner. It uses curated simple synergy profiles in `src/synergy` and does not run a combat simulator. It retains narrow reliability and target-resolution traces needed to explain the displayed rating.

## Position Cards

Each position card represents one lane:

- Left Flank
- Vanguard
- Right Flank

Cards keep the planner controls and selected-dragon details needed for formation building:

- Dragon selector.
- Move-to-position buttons.
- Clear-position button.
- Selected dragon identity.
- High-level profile coverage.
- Command panel using source wording.
- Trait panel with unlock and hard position requirement.
- Favorable and unfavorable troop affinities.

Cards present compact Damage Profile, Provides, and Synergy needs signals without exposing trace cards, target-candidate labels, technical debug controls, or raw effect execution fields.

## Formation Analysis

The Formation Rating panel explains Active Synergy and Placement Effectiveness, then groups actionable evaluator findings into:

- Strong synergies.
- Missing enablers.
- Placement issues.
- Position conflicts.
- Future unlocks.
- Resolved or unresolved shared recipient selection.

Single selected dragons do not show missing-enabler warnings. Repeated ability paths are aggregated by semantic relationship, and active paths suppress duplicate locked or blocked variants of the same relationship.

Blazing Fury's two sibling signals display one shared target-resolution finding. A unique active Fire producer is named as the resolved target. Multiple active Fire producers are named as unresolved priority candidates, and multiple no-Fire fallback Allies are named as unresolved fallback candidates. Unresolved target selection contributes no recipient-specific relationship value; the technical detail preserves selector, group, candidate, reason, ability, and signal identities.

Estimated Formation Power is a separate read-only progression diagnostic. It sums the three current rarity/Star Rank/Dragon Level estimates, exposes each dragon's confidence classification, and remains visually and semantically separate from Formation Rating. It is empirical and unofficial, does not alter recommendations or scoring, and is unavailable until all three dragons have recorded progression.

## Troop Affinity

A separate Troop Affinity section evaluates the canonical affinity records of the selected three dragons. It recommends every tied troop type under `troop-affinity-recommendation-v1`, shows positive coverage as N of 3, and expands to positive, neutral, negative, and unknown dragon names for all five troop types. Position is not an input, so swapping the same trio cannot change the recommendation; adding, removing, or replacing a dragon recalculates it immediately.

Positive affinity is displayed as +20% for each positively aligned dragon. Neutral has no affinity modifier, negative reduces that dragon's stats and siege damage without an invented percentage, and unknown remains unverified rather than being treated as neutral. The UI never combines three positive dragons into +60%, multiplies Estimated Power, adjusts Formation Rating, or claims combat simulation.

The recommendation is affinity guidance, not a universal battle optimum. Enemy Troop Type Advantage is a separate matchup system and may change the actual choice. Siege remains in the five-candidate comparison, but a recommended or tied Siege option is labeled as objective-specific for Durability and siege damage and weak in ordinary troop matchups. See [`TROOP_AFFINITY_RECOMMENDATIONS.md`](TROOP_AFFINITY_RECOMMENDATIONS.md).

## Progression Mapping

- `OwnedDragon.starRank` becomes simple `starRank`.
- `OwnedDragon.reignLevel` becomes simple `dragonLevel`.
- Unlocked Habit Levels are tracked as sparse roster investment data and do not affect current simple analysis.

## Placement Contract

- Left Flank is adjacent only to Vanguard.
- Right Flank is adjacent only to Vanguard.
- Vanguard is adjacent to both flanks.
- The two flanks are not adjacent.

Hard recipient-position support only applies when verified wording requires that recipient position. Preferred targeting with fallback is not treated as a hard block.

Placement requirements are evaluated before progression. A relationship that is both position-blocked and progression-locked appears as a placement issue; once positioned correctly, it may then appear as a Future unlock until the saved progression requirement is met.

## Non-Goals

The Formation Builder uses documented activation probability only where the reliability contract supports it. Unresolved potential remains visible and contributes zero; it is not displayed as a known 0% chance. Reliability does not measure damage or Recovery magnitude, duration, target count, or win probability. Estimated Formation Power and troop-affinity guidance remain separate diagnostics. All three Roster Optimizer strategies use the same v3 relationship and six-placement source; opening a result applies its exact retained arrangement without changing Star Rank, Dragon Level, Habit Levels, optimizer output, or affinity recommendation for the same trio.
