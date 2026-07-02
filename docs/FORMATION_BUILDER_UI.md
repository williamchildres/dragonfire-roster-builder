# Formation Builder UI

The live Formation Builder is a high-level formation planner. It uses the curated simple synergy profiles in `src/synergy` and does not run the legacy trace, capability, audit, or card-analysis presentation engines.

## Position Cards

Each of the three position cards represents one lane:

- Left Flank
- Vanguard
- Right Flank

Each card keeps only the planner controls and identity details needed for formation building:

- Dragon selector.
- Move-to-position buttons.
- Clear-position button.
- Selected dragon identity through the selector value.
- High-level synergy profile coverage.
- Command panel using the selected dragon's source wording.
- Trait panel with recorded Star Rank, Dragon Level, and position requirements.
- Favorable and unfavorable troop affinities.

The cards do not contain per-dragon Receives or Provides regions, interaction overflow controls, trace cards, target-candidate labels, technical debug controls, or raw effect tag displays.

## Formation Analysis

The formation-level analysis panel groups simple evaluator results into player-facing sections:

- Strong synergies: active setup/payoff and amplifier/output relationships.
- Missing enablers: selected dragons that benefit from a tag no selected teammate currently provides.
- Placement issues: relationships blocked by required position or adjacency.
- Position conflicts: selected dragons competing for the same exclusive meaningful position.
- Future unlocks: relationships available only after saved Star Rank or Dragon Level progression.

Single selected dragons do not show missing-enabler warnings in the UI. Missing-enabler messages appear only once at least two dragons are selected.

## Progression Mapping

The UI maps local roster progression into the simple evaluator as follows:

- `OwnedDragon.starRank` becomes simple `starRank`.
- `OwnedDragon.reignLevel` becomes simple `dragonLevel`.

Habit Level is not part of the current simple Formation Builder analysis.

## Placement Contract

The Formation Builder uses the shared linear formation contract:

- Left Flank is adjacent only to Vanguard.
- Right Flank is adjacent only to Vanguard.
- Vanguard is adjacent to both flanks.
- The two flanks are not adjacent.

An adjacent relationship can be active when one dragon is Vanguard and the other is a flank. The same relationship is placement-blocked when the two dragons occupy opposite flanks.

## Non-Goals

The live Formation Builder does not show or calculate:

- Exact combat rounds.
- Proc timing or activation percentages.
- Target candidates or target-selection probability.
- Per-target behavior.
- Stack duration or refresh behavior.
- Damage formulas, expected damage, or win probability.
- Legacy trace cards, audit controls, or technical analysis status.
- Numerical synergy scores or optimizer recommendations.

Legacy services and pure service tests remain in the repository for historical framework coverage and reporting, but production Formation Builder UI does not import them.

## Review Cases

Use these cases when reviewing the cutover:

- Daemoros plus Shadowsong: Panic provider improves Shadowsong's Panic-dependent ability.
- Syrax plus Caraxes: First-Strike and Fire Damage relationships appear under Strong synergies.
- Malachite plus Sheepstealer: Recovery relationship is active when Sheepstealer is Vanguard and Level 16+.
- Malachite plus Caraxes: Malachite's adjacent First-Strike support works beside Vanguard and is blocked across opposite flanks.
- Caraxes plus Sheepstealer: both unlocked Vanguard claims produce a position conflict.
- One selected dragon: card details render, but missing enabler warnings remain hidden.
- An unmapped dragon such as Seasmoke: profile coverage reports that high-level synergy data is not yet mapped.
