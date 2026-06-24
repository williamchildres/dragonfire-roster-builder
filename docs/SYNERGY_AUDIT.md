# Synergy Audit

The Formation Builder includes a production debug view for repository owners and testers. It explains why each formation interaction is active, inactive, potential, blocked, unknown, or not applicable. It does not require browser developer tools.

## Trace Structure

Each trace includes:

- Status and confidence
- Source dragon and source ability
- Recipient dragon and recipient ability or qualifying mechanic
- Position, adjacency, Dragon Level, Star Rank, Habit unlock, Habit Level, and battle-context requirements
- Matched effect tags and structured effect matches
- Raw source wording when available
- Evidence IDs and reviewed game build
- Manual-review state
- Assumptions, unresolved questions, and the reason the trace is active or inactive

Active traces represent interactions supported by current formation placement and current user progression. Potential traces represent future, locked, conditional, previewed, or unresolved interactions. Inactive traces identify which requirement failed. Locked Habits are never labeled active for the user's current roster, even when preview mode displays their future interactions.

## Confirmed Formation Rules

The friendly formation is linear:

`Left Flank - Vanguard - Right Flank`

Left Flank is adjacent only to Vanguard. Right Flank is adjacent only to Vanguard. Vanguard is adjacent to both flanks. Left Flank and Right Flank are not adjacent to each other.

Enemy-formation adjacency is not modeled as confirmed data.

## Three-Allies Behavior

Manual combat-log observation in build `26.6.53509` confirms Malachite can receive Warden's Rally Recovery. Exact "3 Allies" friendly effects are therefore normalized as all three friendly dragons including the caster. "Other Allies" still excludes the caster, and singular or smaller-count Ally wording remains ability-specific unless verified.

## Threshold Interpretation

"Above" and "below" threshold wording uses strict textual comparison. Exactly 50% is not covered by displayed "above 50%" or "below 50%" wording. This is a conservative textual interpretation and has not yet been confirmed in combat logs.

## Audit Matrix

The debug-only audit matrix generates all 24 ordered formations using Malachite, Seasmoke, Sheepstealer, and Vermax:

- 4 choices of omitted dragon
- 6 position orders for each omitted dragon

Each entry shows Left Flank, Vanguard, Right Flank, active traces, inactive Vanguard Traits, position conflicts, potential future interactions, unknown assumptions, and trace counts by status. Filters are available for dragon, source ability, status, and confidence. The matrix is generated on demand and is not stored in localStorage.

## Audit Export

Audit JSON uses:

```json
{
  "format": "dragonfire-synergy-audit",
  "schemaVersion": 1,
  "databaseVersion": "0.4.0",
  "gameBuild": "26.6.53509",
  "generatedAt": "ISO timestamp",
  "formation": {
    "leftFlank": "dragon-id",
    "vanguard": "dragon-id",
    "rightFlank": "dragon-id"
  },
  "userProgression": {},
  "battleContext": "unspecified",
  "traces": []
}
```

Use the export to compare website reasoning with future combat logs. Do not treat audit output as a replacement for evidence review.
