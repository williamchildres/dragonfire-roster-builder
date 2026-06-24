# Synergy Capability Framework

Phase 3.7 introduces a generic capability framework for effect-channel matching. The goal is to explain formation interactions from normalized ability facts instead of writing one-off pair checks for specific dragons.

The framework currently supports four effect channels:

- Physical Damage
- Tactical Damage
- Fire Damage
- Recovery

It is designed to extend later to shields, damage-over-time, control effects, damage received modifiers, Basic Attack amplification, command activation, recovery prevention, and similar mechanics.

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

A dragon may have multiple output capabilities in the same channel. Mixed-damage dragons must retain every verified channel.

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

## Outgoing Amplification

Outgoing amplification matches a provider modifier to recipient outputs.

The rule is:

1. The modifier direction is `dealt`.
2. The recipient has one or more output capabilities in the same channel.
3. Source scope is compatible.
4. Provider position, recipient position, targeting, unlock, level, and Habit requirements are evaluated.
5. Matching outputs are aggregated into one normal-view synergy card per provider modifier and recipient.

Examples:

- Sheepstealer in Vanguard buffs Vermax Physical Damage in Right Flank. Vermax qualifies through both Basic Attack and Spreading Blaze.
- Malachite in Vanguard buffs Fire Damage for the Left Flank. Seasmoke qualifies through Cleansing Wrath; Sheepstealer qualifies through Wild Hunt and future Savage Claim.
- Vermax can grant Tactical Damage Dealt stacks to any eligible ally with verified Tactical Damage output. Malachite qualifies through Warden's Rally.

## Incoming Amplification

Incoming amplification matches an ally or self output to a recipient-side received modifier.

The rule is:

1. The provider output targets allies or self.
2. The recipient has a `received` modifier in the same channel.
3. Provider targeting includes the recipient.
4. Recipient modifier requirements are satisfied or marked potential/unknown.

Example:

- Malachite provides Recovery through Warden's Rally. Sheepstealer has Recovery Received +20% from Hunter's Cunning while Level 16+ and deployed in Vanguard. The trace is active when those requirements are met.

The framework does not calculate exact Recovery or final damage amounts because the complete game formulas remain unknown.

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

## Trace Aggregation

One support modifier can match multiple recipient outputs. The normal Formation Builder aggregates those into one card to avoid repeated cards for the same support relationship.

Example:

- Sheepstealer -> Vermax Physical Damage Support is one normal card.
- The card lists Vermax Basic Attack and Spreading Blaze as qualifying outputs.
- Debug traces retain individual capability matches and source-scope checks.

## Capability Matrix

The app and `npm run report:synergy` expose the current matrix for Malachite, Seasmoke, Sheepstealer, and Vermax. Each cell shows no verified capability, current capability, future capability, or conditional capability with relevant ability names.

## Current Limitations

- Vermax Basic Attack Physical Damage is represented as a reviewed capability because a full canonical Basic Attack model does not exist yet.
- Spreading Blaze target selection is chance-based and selection-dependent; exact stack count is unknown.
- Exact damage, Recovery, and stacking formulas remain unknown.
- Stack refresh and expiration behavior remains unresolved.
- Sheepstealer Dragon's Cunning scaling scope remains provisional.
- Infectious Wrath augmentation presentation remains needs-follow-up.
- Enemy-formation adjacency is not confirmed.
