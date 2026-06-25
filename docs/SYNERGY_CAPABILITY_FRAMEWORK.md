# Synergy Capability Framework

Phase 3.7 introduced a generic capability framework for effect-channel matching. Phase 3.7.1 clarified modifier roles, target scope, and availability context. Phase 3.8 adds Syrax and Caraxes plus status output, dependency, stat-scaling, enemy-mitigation, and periodic-damage tracing. Version 0.5.2 adds direct defensive ally support, selected-formation trace boundaries, hard-requirement precedence, and normal-view aggregation rules. The goal is to explain formation interactions from normalized ability facts instead of writing one-off pair checks for specific dragons.

The framework currently supports these effect channels:

- Physical Damage
- Tactical Damage
- Fire Damage
- Recovery
- Stat
- Damage Received

The `damage-received` channel is intentionally generic so later schema revisions can split it into physical, tactical, or fire Damage Received when verified behavior requires that detail.

Status outputs and periodic damage now sit beside the four channel model. First-Strike, Slow, Burn, and Resistance can be represented as status capabilities, while Burn also has a periodic Fire Damage definition. Status capabilities do not automatically become damage outputs unless structured effect data says they produce a channel such as Burn producing Fire Damage.

## Output Capabilities

An output capability describes an effect a dragon can produce. Examples include Warden's Rally Tactical Damage, Warden's Rally Recovery, Cleansing Wrath Fire Damage, Wild Hunt Fire Damage, Vermax Basic Attack Physical Damage, and Spreading Blaze Physical Damage.

Output capabilities record:

- Dragon and ability IDs
- Effect channel
- Source kind: Basic Attack, Command, Trait, or Habit
- Source scope
- Target side and target scope
- Unlock Star Rank, Dragon Level, and Habit Level requirements
- Conditional state and conditions
- Evidence IDs and confidence
- Structured dependencies, such as scales with Intelligence, mitigated by target Initiative, requires self First-Strike, or requires any enemy Slow

A dragon may have multiple output capabilities in the same channel. Mixed-damage dragons must retain every verified channel.

Examples added in Phase 3.8:

- Syrax Blazing Fury produces Tactical Damage.
- Syrax Strategic Revival produces Recovery and depends on any enemy Slow for its conditional 1.5x Recovery.
- Caraxes Infernal Burst produces Fire Damage and depends on self First-Strike for its conditional 1.5x damage.
- Caraxes Crippling Inferno produces Burn as periodic Fire Damage and Slow as a status.

## Modifier Capabilities

A modifier capability describes an ability that increases or decreases an effect channel. Examples include Malachite Fire Damage Dealt support, Sheepstealer Physical Damage Dealt support, Sheepstealer Recovery Received amplification, Vermax Tactical Damage stack support, and Vermax self Physical Damage support.

Modifier capabilities record:

- Dragon and ability IDs
- Effect channel
- Direction: dealt or received
- Operation and value
- Unit: percent, flat, stack, or unknown
- Source scope
- Target selector
- Provider and recipient requirements
- Unlock and Dragon Level requirements
- Conditional state and conditions
- Evidence IDs and confidence
- Modifier role

## Modifier Roles

Every modifier has one role:

- `self-amplification`: changes the originating dragon's own output or stats. It is reviewable but never creates cross-dragon outgoing support.
- `ally-support`: targets one or more friendly dragons and may create outgoing amplification traces.
- `recipient-side-amplification`: makes the receiving dragon benefit more from an effect supplied by another dragon.
- `enemy-debuff`: changes an enemy's received damage, stats, Recovery, or related properties. It is not direct ally support.

Examples:

- Stolen Flock is self Fire Damage amplification, not team Fire support.
- Warrior's Zeal is Vermax self Physical Damage amplification, not team Physical support.
- Rallying Flame is Vermax self Physical Damage amplification, not team Physical support.
- Hunter's Cunning Physical Damage is ally support for the Right Flank.
- Hunter's Cunning Recovery Received is recipient-side amplification.
- Dragon's Cunning enemy Instinct reduction is an enemy debuff.
- Champion's Brilliance Right Flank Damage Received reduction is defensive ally support, not outgoing damage support and not recipient-side Recovery amplification.

## Outgoing Amplification

Outgoing amplification matches a provider ally-support modifier to recipient outputs.

The rule is:

1. The modifier role is `ally-support`.
2. The modifier direction is `dealt`.
3. The recipient has one or more output capabilities in the same channel.
4. Source scope is compatible.
5. Provider position, recipient position, targeting, unlock, level, and Habit requirements are evaluated.
6. Matching outputs are aggregated into one normal-view synergy card per provider modifier and recipient.

Examples:

- Sheepstealer in Vanguard buffs Vermax Physical Damage in Right Flank. Vermax qualifies through both Basic Attack and Spreading Blaze.
- Malachite in Vanguard buffs Fire Damage for the Left Flank. Seasmoke qualifies through Cleansing Wrath; Sheepstealer qualifies through Wild Hunt and future Savage Claim.
- Vermax can grant Tactical Damage Dealt stacks to any eligible ally with verified Tactical Damage output. Malachite qualifies through Warden's Rally.

## Incoming Amplification

Incoming amplification matches an ally or self output to a recipient-side received modifier.

The rule is:

1. The provider output targets allies or self.
2. The recipient has a `recipient-side-amplification` modifier in the same channel.
3. Provider targeting includes the recipient.
4. Recipient modifier requirements are satisfied or marked potential/unknown.

Example:

- Malachite provides Recovery through Warden's Rally. Sheepstealer has Recovery Received +20% from Hunter's Cunning while Level 16+ and deployed in Vanguard. The trace is active when those requirements are met.

The framework does not calculate exact Recovery or final damage amounts because the complete game formulas remain unknown.

## Defensive Ally Support

Defensive ally support matches a provider's ally-targeted `received` modifier directly to the selected recipient. It does not require the recipient to produce a damage output. Champion's Brilliance is the first confirmed example: Seasmoke in Vanguard can reduce Damage Received for the Right Flank ally. This is represented by `defensive-ally-support` with channel `damage-received`.

## Dependency Traces

Phase 3.8 and 0.5.2 add additional generic trace families:

- `status-condition-enablement`: a status output satisfies a condition on another capability. Example: Syrax can grant First-Strike, and Caraxes Infernal Burst has a verified self First-Strike multiplier.
- `stat-scaling-support`: ally stat support matches an output that scales with that stat. Example: Caraxes Hunter's Wrath can support Syrax Strategic Revival Recovery through Right Flank Initiative support when Syrax is in Right Flank.
- `enemy-mitigation-reduction`: enemy stat debuffs match outputs mitigated by that stat. Example: Syrax Flight Mastery can reduce enemy Initiative, which may improve Caraxes Fire Damage outputs because Fire Damage is mitigated by target Initiative.
- `periodic-damage-amplification`: damage-channel support can apply to periodic damage definitions. Example: Syrax Fire support can amplify Caraxes Burn because Burn is periodic Fire Damage.
- `defensive-ally-support`: direct defensive teammate support such as Damage Received reduction.

These traces are conditional or potential when unlocks, trigger chances, target selection, or exact battlefield state are unresolved. They never produce numerical scores.

Phase 3.8.1 adds direct position stat-support traces and clarifies presentation:

- Direct stat support records the verified flank stat bonus even when no output dependency consumes that stat.
- Stat-scaling support is a child reasoning layer that appears only when the recipient has an output dependency for the supported stat.
- Eligibility means the target and channel match.
- Activation means the effect actually triggers, selects that target, and overlaps the relevant timing window.
- Chance-based or selection-dependent support is shown as conditional or potential, never guaranteed.
- Targeting facts, threshold notes, and contextual PvE facts are debug/audit details unless they modify or benefit another selected dragon.

Version 0.5.2 adds aggregation requirements:

- Normal parent traces are deduplicated by semantic identity, not explanation text.
- Requirements are deduplicated by requirement identity so repeated Habit unlock or selected Habit Level blockers display once.
- Repeated ability names are grouped with output context, such as "Warden's Rally: Tactical Damage and Recovery".
- Single-target ally effects with multiple eligible selected recipients become one target-selection interaction instead of simultaneous recipient cards.
- Periodic damage such as Burn is listed as a qualifying Fire output and retained as debug metadata, not displayed as a second normal buff.
- Unselected friendly dragons cannot appear in formation traces, matched outputs, debug JSON, reports, or project-context review cases.

## Source-Scope Matching

Source scope prevents support from matching the wrong output source.

- `all-qualifying-sources` can match Basic Attacks, Commands, and Habits in the same channel.
- `non-basic-attacks` can match Commands and Habits but not Basic Attacks.
- `commands-and-habits` can match Commands and Habits, but not Basic Attacks.
- Exact scope matches are allowed.
- Unknown scopes are not treated as compatible.

Unqualified Damage Dealt wording defaults to all qualifying sources. Explicit wording overrides that default. For example, Vermax Warrior's Zeal applies to Basic Attack Physical Damage because it is unqualified and combat-log confirmed. Malachite Forest's Instinct does not apply to Basic Attacks because the text explicitly excludes them.

## Position Matching

Position and target compatibility are checked before a trace can be active.

Supported selectors include self, Left Flank ally, Right Flank ally, Vanguard ally, any lane, adjacent ally, other allies, one eligible ally, and all eligible allies.

Friendly adjacency is confirmed as:

- Left Flank adjacent to Vanguard
- Vanguard adjacent to Left Flank and Right Flank
- Right Flank adjacent to Vanguard
- Left Flank and Right Flank not adjacent to each other

Caster eligibility does not override spatial targeting. A caster is not adjacent to itself.

## Availability Matching

Capabilities track current and future availability.

Current roster mode:

- Active matches require current unlock and progression requirements.
- Locked abilities do not create active matches.

Preview mode:

- Future abilities may generate potential matches.
- Potential traces list the missing unlock, level, Star Rank, or Habit Level requirement.
- Preview mode never labels a locked ability active for the user's current roster.

Unknown Dragon Level produces an unknown requirement instead of silently passing.

## Availability Context

Capabilities carry three availability contexts:

- Canonical availability: base kit versus future Star Rank, Dragon Level, or Habit Level requirements.
- Observed-account availability: supplied screenshot observations, such as Seasmoke being not hatched.
- User-roster availability: browser localStorage state. The website can use this in Formation Builder analysis, but the report script cannot inspect it.

Reports must not use the word "current" without context. Prefer labels such as Base kit, Future at Star Rank X, observed account hatched, not hatched in observed account, and user roster unknown.

## Derivation And Integrity

Capabilities are derived from structured `AbilityEffect` data. The only current reviewed exception is Vermax Basic Attack Physical Damage, which is represented because combat logs confirmed Warrior's Zeal affecting it and there is not yet a full canonical Basic Attack model.

Effect tags alone do not create authoritative capabilities. Integrity checks verify:

- Capability IDs are unique.
- Dragon references exist.
- Ability-backed capability references exist.
- Evidence IDs exist.
- Ally-support capabilities do not target self.
- Self-amplification and recipient-side amplification target self.
- No capability is created from tags alone.

## Trace Aggregation

One support modifier can match multiple recipient outputs. The normal Formation Builder aggregates those into one card to avoid repeated cards for the same support relationship.

Example:

- Sheepstealer -> Vermax Physical Damage Support is one normal card.
- The card lists Vermax Basic Attack and Spreading Blaze as qualifying outputs.
- Debug traces retain individual capability matches and source-scope checks.

## Capability Matrix

The app and `npm run report:synergy` expose the matrix for Syrax, Caraxes, Malachite, Seasmoke, Sheepstealer, and Vermax. The matrix separates Outputs, Status Outputs, Supports Allies, and Self / Recipient Modifiers. Each cell names canonical and observed-account availability rather than using ambiguous "current" terminology.

## Current Limitations

- Vermax Basic Attack Physical Damage is represented as a reviewed capability because a full canonical Basic Attack model does not exist yet.
- Syrax enemy adjacency semantics for Blazing Fury Tactical Damage remain unresolved.
- Burn stacking, refresh, and overlapping source behavior remain unresolved.
- Slow ordering relative to all turn-order modifiers is not fully modeled.
- Control versus Negative-effect cleanse overlap remains unresolved.
- Caraxes Blood Wyrm Fire Damage duration and accumulation semantics remain unresolved.
- Spreading Blaze target selection is chance-based and selection-dependent; exact stack count is unknown.
- Exact damage, Recovery, and stacking formulas remain unknown.
- Stack refresh and expiration behavior remains unresolved.
- Sheepstealer Dragon's Cunning scaling scope remains provisional.
- Infectious Wrath augmentation presentation remains needs-follow-up.
- Enemy-formation adjacency is not confirmed.
## Formation Normalization 0.5.3

- Direct stat support aggregates sibling effects from the same ability and recipient-selection group. Debug traces retain every child modifier capability ID, and stat-scaling traces remain selective by stat.
- Defensive ally support carries `damageScope`: `all`, `physical`, `tactical`, or `fire`. Normal titles must preserve the subtype.
- Thresholds are conditions, not target counts. Trial by Flame exports strict below 75%, 50%, and 25% Troop Capacity conditions with `targetSelector.count` left null.
- Highest-stat and one-adjacent selectors are one-target selectors. Unique observed stat winners resolve to one recipient; ties or missing stat values create grouped candidate interactions.
- Requirement labels should identify provider and recipient-output ownership.
- `interactionScope` separates cross-dragon, internal, enemy-side, and targeting-fact traces. Internal traces remain available for debug/export but are not cross-dragon normal synergy.
- Source ability identity is part of normal text; Spreading Blaze and Rallying Flame must remain distinguishable.

## Normal Requirement Summary 0.5.4

- Normal Unmet requirements are a pure result of the current formation, current preview flag, selected dragons, and visible normal traces.
- The global summary includes standalone selected Trait placement failures and concrete Trait progression failures only when hard formation requirements pass and no visible card owns the blocker.
- Visible active, conditional, and potential cards own their provider unlock and recipient-output blockers; those blockers stay in the card and are not repeated globally.
- Semantic deduplication uses requirement kind, source dragon, source ability, expected value, actual value, and material recipient identity rather than generated text or confidence.
- Preview mode and formation switching must not reuse prior results or module-level accumulators.
- Trial by Flame normal presentation groups selected recipients and threshold tiers while preserving threshold conditions in exported capabilities.
- Grouped stat cards may combine sibling effects with the same value; different sibling values must be listed individually.
