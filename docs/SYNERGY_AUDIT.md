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
- Provider effect, recipient-side modifier, combat-log confirmation state, and exact-result known/unknown status for amplification traces
- Assumptions, unresolved questions, and the reason the trace is active or inactive

Active traces represent interactions supported by current formation placement and current user progression. Potential traces represent future, locked, conditional, previewed, or unresolved interactions. Inactive traces identify which requirement failed. Locked Habits are never labeled active for the user's current roster, even when preview mode displays their future interactions.

## Confirmed Formation Rules

The friendly formation is linear:

`Left Flank - Vanguard - Right Flank`

Left Flank is adjacent only to Vanguard. Right Flank is adjacent only to Vanguard. Vanguard is adjacent to both flanks. Left Flank and Right Flank are not adjacent to each other.

Enemy-formation adjacency is not modeled as confirmed data.

## Three-Allies Behavior

Manual combat-log observation in build `26.6.53509` confirms Malachite can receive Warden's Rally Recovery. Exact "3 Allies" friendly effects are therefore normalized as all three friendly dragons including the caster.

Repeated manual ability-text review confirms that "Other Ally" and "Other Allies" exclude the caster, while plain "Ally" and "Allies" allow caster eligibility when targeting rules otherwise permit it. Spatial targeting still applies; a caster is not adjacent to itself.

## Recipient Amplification

The trace engine detects generic provider-to-recipient amplification. The current verified pattern is Recovery provider plus Recovery Received increase. Malachite's Warden's Rally provides Recovery to three Allies in any lane, and Sheepstealer's Hunter's Cunning increases Sheepstealer Recovery Received by 20% while Sheepstealer is Level 16+ and deployed in Vanguard.

This trace is active when Sheepstealer is Vanguard and its Level requirement is satisfied. Malachite does not need to be Vanguard to provide Warden's Rally Recovery. If Malachite is in a flank, Sentinel's Presence is shown as inactive due to placement while the Recovery amplification can still be active. This is a positional tradeoff rather than a formation error.

Exact final Recovery is not calculated because the complete Level and Instinct Recovery formula is unknown.

## Capability Framework

The audit view now receives generic capability traces. Output capabilities describe what a dragon can produce in an effect channel. Modifier capabilities describe how an ability changes a channel for a provider, a recipient, or another selected ally. The current channels are Physical Damage, Tactical Damage, Fire Damage, and Recovery.

Outgoing amplification traces match an `ally-support` modifier with recipient outputs in the same channel. For example, Sheepstealer's Hunter's Cunning can match both Vermax Physical Basic Attack output and Vermax Spreading Blaze Physical Damage output, then aggregate them into one normal-view Physical Damage Support card.

Self-amplification modifiers are excluded from cross-dragon outgoing support. Stolen Flock does not support another dragon's Fire Damage, Warrior's Zeal does not support another dragon's Physical Damage, and Rallying Flame does not support another dragon's Physical Damage. These self modifiers remain visible in the capability review and debug output.

Incoming amplification traces match provider outputs to `recipient-side-amplification` modifiers. For example, Malachite's Warden's Rally Recovery can match Sheepstealer's Recovery Received increase. The trace explains the benefit and why the exact result is unknown.

Enemy debuffs are not direct ally support and are reserved for a separate future framework. Stat support is visible as other support, but it is not treated as direct Physical, Tactical, Fire, or Recovery amplification.

The debug view keeps child capability matches for review. It shows channel, modifier role, target selector, self-only state, source-scope compatibility, position compatibility, availability context, evidence, confidence, and the reason each interaction is active, potential, inactive, or unknown.

Run `npm run report:synergy` for a read-only capability report containing the revised matrix, availability context, modifier roles, generated cross-dragon synergies, excluded self modifiers, integrity checks, and unresolved assumptions.

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
  "databaseVersion": "0.4.3",
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
