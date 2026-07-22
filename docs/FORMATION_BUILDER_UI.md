# Formation Builder UI

The live Formation Builder is a high-level formation planner. It uses curated simple synergy profiles in `src/synergy` and does not run a combat-analysis, trace, capability, audit, or card-projection engine.

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

Single selected dragons do not show missing-enabler warnings. Repeated ability paths are aggregated by semantic relationship, and active paths suppress duplicate locked or blocked variants of the same relationship.

Estimated Formation Power is a separate read-only progression diagnostic. It sums the three current rarity/Star Rank/Dragon Level estimates, exposes each dragon's confidence classification, and remains visually and semantically separate from Formation Rating. It is empirical and unofficial, does not alter recommendations or scoring, and is unavailable until all three dragons have recorded progression.

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

The Formation Builder does not calculate exact combat rounds, proc timing, activation percentages, target probability, stack behavior, damage formulas, expected damage, or win probability. Estimated Formation Power is an empirical display diagnostic, not combat simulation. Both Roster Optimizer strategies reuse Formation Builder's current My Roster progression, semantic relationships, six-placement comparison, and Formation Rating v2; opening a Primary, Backup, or Best 10 Overall card applies the exact retained arrangement without changing Star Rank, Dragon Level, or Habit Levels.
