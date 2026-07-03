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

Cards do not contain Receives/Provides regions, trace cards, target-candidate labels, technical debug controls, or raw effect execution fields.

## Formation Analysis

The formation analysis panel groups simple evaluator results into:

- Strong synergies.
- Missing enablers.
- Placement issues.
- Position conflicts.
- Future unlocks.

Single selected dragons do not show missing-enabler warnings. Repeated ability paths are aggregated by semantic relationship, and active paths suppress duplicate locked or blocked variants of the same relationship.

## Progression Mapping

- `OwnedDragon.starRank` becomes simple `starRank`.
- `OwnedDragon.reignLevel` becomes simple `dragonLevel`.
- Habit Level is tracked as roster investment data and does not affect current simple analysis.

## Placement Contract

- Left Flank is adjacent only to Vanguard.
- Right Flank is adjacent only to Vanguard.
- Vanguard is adjacent to both flanks.
- The two flanks are not adjacent.

Hard recipient-position support only applies when verified wording requires that recipient position. Preferred targeting with fallback is not treated as a hard block.

## Non-Goals

The Formation Builder does not calculate exact combat rounds, proc timing, activation percentages, target probability, stack behavior, damage formulas, expected damage, win probability, numerical scores, or optimizer recommendations.