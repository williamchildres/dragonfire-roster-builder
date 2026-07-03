# Simple Synergy Profile Audit

This audit covers the curated simple-synergy profiles used by the live Formation Builder.

## Coverage

- Total roster: 30 dragons.
- Detailed ability data: 18 dragons.
- Metadata-only and unmapped: 12 dragons.
- Detailed abilities reviewed: 126 Commands, Traits, and Habits.
- Simple profiles before this pass: 6.
- Simple profiles after this pass: 18.

Mapped dragons: Syrax, Vhagar, Caraxes, Seasmoke, Crimson, Kalspire, Malachite, Venator, Daemoros, Feskar, Rhysarion, Shadowsong, Vaeldra, Sheepstealer, Vermax, Tashix, Velar, Zivern.

Metadata-only dragons: Solstryker, Antares, Shimmer, Jagadrix, Bevlorin, Shadowrend, Thunderstrike, Vesper, Arulix, Nyrena, Dawnseeker, Arrax.

## Controlled Vocabulary

The simple engine uses only these tags:

- Conditions: Panic, First-Strike, Burn, Slow, Taunt, Control, Stun, Stagger, Overwhelm, Confusion, Vulnerable.
- Damage and Recovery: Physical Damage, Tactical Damage, Fire Damage, Recovery.
- Stats: Strength, Instinct, Intelligence, Initiative.

Stun, Stagger, Overwhelm, and Confusion are Control aliases for Rhysarion's Control payoff. They are not simulated as separate combat mechanics.

## Inclusion Rules

A profile signal is included when verified or provisionally verified ability text shows a meaningful pair-specific relationship: setup/payoff, damage or Recovery amplification, enemy damage-received vulnerability, stat support for explicit scaling, hard position-specific support, adjacency support, or exclusive position claims.

Exact timing, chance, target overlap, duration, stack acquisition, refresh behavior, target selection, and damage or Recovery values are not modeled.

## Disposition Counts

- represented: 69.
- represented: 84.
- reinforces-existing: 3.
- self-only: 22.
- general-support-only: 8.
- no-cross-dragon-synergy: 9.
- not-modeled: 0.

Every detailed Command, Trait, and Habit has exactly one disposition in `src/synergy/profileAudit.ts`. Every represented or reinforcing disposition references at least one simple profile signal.

## Repeated Path Aggregation

The evaluator groups setup/payoff paths by provider dragon, condition tag, and beneficiary dragon. It groups amplifier/output paths by supporter dragon, supported tag, and output dragon. Individual ability IDs are retained on the chosen result as deduplicated provenance, but they are not part of the visible relationship identity.

When multiple paths exist for the same semantic relationship, the evaluator emits one result using active, then position-blocked, then progression-locked precedence. An active base relationship suppresses future-unlock or placement messages for later reinforcing paths. Syrax's Tactical Inferno Fire component reinforces Blazing Fury's Fire support, Caraxes's Crippling Inferno Fire output reinforces Infernal Burst's Fire output, and Vermax's Rallying Flame reinforces Spreading Blaze Tactical support.

## Explicit Condition And Payoff Matrix

| Provider | Provider ability | Tag | Beneficiary | Beneficiary ability | Provider unlock | Beneficiary unlock | Position or adjacency | Confidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Caraxes | Crippling Inferno | Slow | Syrax | Strategic Revival | Star Rank 6 | Star Rank 6 | None | verified |
| Daemoros | Instill Fear | Panic | Shadowsong | Breath of Fire and Scorched Earth | Star Rank 2 | Base | None | verified |
| Kalspire | Tactical Assault | Panic | Shadowsong | Breath of Fire and Scorched Earth | Star Rank 6 | Base | None | verified |
| Daemoros | Instill Fear | Panic | Seasmoke | Infectious Wrath | Star Rank 2 | Star Rank 6 | None | verified |
| Kalspire | Tactical Assault | Panic | Seasmoke | Infectious Wrath | Star Rank 6 | Star Rank 6 | None | verified |
| Daemoros | Shadowflame | Burn | Feskar | Emerald Inferno | Base | Star Rank 6 | None | verified |
| Caraxes | Crippling Inferno | Burn | Feskar | Emerald Inferno | Star Rank 6 | Star Rank 6 | None | verified |
| Shadowsong | Blazing Conductor | Burn | Feskar | Emerald Inferno | Star Rank 10 | Star Rank 6 | None | verified |
| Daemoros | Shadowflame | Burn | Vhagar | Fiery Bonds | Base | Base | None | verified |
| Caraxes | Crippling Inferno | Burn | Vhagar | Fiery Bonds | Star Rank 6 | Base | None | verified |
| Shadowsong | Blazing Conductor | Burn | Vhagar | Fiery Bonds | Star Rank 10 | Base | None | verified |
| Syrax | Blazing Fury | First-Strike | Caraxes | Infernal Burst | Base | Base | None | verified |
| Malachite | Lightning Strike | First-Strike | Caraxes | Infernal Burst | Star Rank 10 | Base | Adjacent recipient | verified |
| Vhagar | Fiery Bonds | Taunt | Crimson | Bloodscale Fury | Base | Star Rank 6 | None | verified |
| Vaeldra | Lure | Taunt | Crimson | Bloodscale Fury | Base | Star Rank 6 | None | verified |
| Crimson | Bloodscale Terror | Control | Rhysarion | Dawnsong | Base | Base | None | verified |
| Daemoros | Shroud of Shadows | Control | Rhysarion | Dawnsong | Star Rank 6 | Base | None | verified |
| Feskar | Unyielding Grasp | Control | Rhysarion | Dawnsong | Star Rank 10 | Base | None | verified |
| Venator | Desperate Ambush | Control | Rhysarion | Dawnsong | Star Rank 10 | Base | None | verified |
| Vaeldra | Siren's Call | Control | Rhysarion | Dawnsong | Star Rank 10 | Base | None | verified |
| Zivern | Fearsome Reach | Panic | Shadowsong | Breath of Fire and Scorched Earth | Star Rank 6 | Base | None | verified |
| Zivern | Cloak of Terror | Control | Rhysarion | Dawnsong | Star Rank 10 | Base | None | verified |
| Shadowsong | Scorched Earth | Vulnerable | Zivern | Cloak of Terror | Star Rank 6 | Star Rank 10 | None | verified |

Vaeldra's Tempting Distraction is represented as Vaeldra-owned Fire and non-Basic Physical vulnerability support, but it is not a beneficiary of another dragon's Taunt. Sheepstealer's Prey loops and Vermax's self-Weakened payoff are self-owned and do not create teammate setup requirements.

Tashix contributes Intelligence-based Fire Damage through Shimmering Mirage, Right Flank Physical support and incoming Recovery payoff through Hunter's Cunning, Physical support through Dragon's Cunning, and Fire support through Battle Guile. Veiled Ambush reinforces the same Fire output.

Velar contributes Instinct-based Tactical Damage through Whirlwind, generic damage-channel support through Advantage wording, First-Strike and Slow setup through Gales of Power, Recovery through Breath of Renewal, and Strength/Instinct support through Fierce Unity.

Zivern contributes Instinct-based Tactical Damage and Tactical vulnerability through Silent Shade, Physical support and Intelligence scaling through Battle Mastery, Panic through Fearsome Reach, and Overwhelm-as-Control plus Vulnerable payoff through Cloak of Terror.

## Damage Support Summary

Fire Damage support comes from Syrax Blazing Fury, Syrax Tactical Inferno, Malachite Sentinel's Presence, Seasmoke Cunning Ferocity, Vhagar Blazing Onslaught, Crimson Unlikely Hero, Shadowsong Blazing Onslaught, Vaeldra Tempting Distraction, Vaeldra Infernal Force, Tashix Battle Guile, and generic Damage Dealt support from Rhysarion Champion's Vigor, Malachite Thunderous Roar, and Velar Whirlwind.

Tactical Damage support comes from Syrax Tactical Inferno, Vhagar Warrior's Resilience, Vaeldra Warrior's Resilience, Vermax Spreading Blaze, Vermax Rallying Flame, Velar Strategic Leader, Zivern Silent Shade, Rhysarion Champion's Vigor, Malachite Thunderous Roar, and Velar Whirlwind.

Physical Damage support comes from Vhagar Battle Leader, Crimson Hunter's Cunning, Malachite Forest's Instinct, Venator Armor Break, Sheepstealer Hunter's Cunning, Tashix Hunter's Cunning, Tashix Dragon's Cunning, Zivern Battle Mastery, Vhagar Blazing Onslaught, Crimson Unlikely Hero, Shadowsong Blazing Onslaught, Vaeldra Tempting Distraction, Vaeldra Infernal Force, Rhysarion Champion's Vigor, Malachite Thunderous Roar, and Velar Whirlwind. Non-Basic restrictions remain in the player-facing wording where source text excludes Basic Attacks.

## Recovery Support Summary

Recovery outputs are represented for Syrax Strategic Revival, Malachite Warden's Rally, Rhysarion Ebbing Fury, Rhysarion Echoing Melody, Sheepstealer Savage Claim, and Velar Breath of Renewal. Recovery amplification is represented for Sheepstealer Hunter's Cunning, Tashix Hunter's Cunning, and Rhysarion Unbroken Devotion. Malachite's self-only Recovery Dealt increases are audited but not modeled as teammate support.

## Stat Support Summary

Strength support is represented for Malachite Collective Might, Malachite Lightning Strike, Velar Fierce Unity, and hard flank Trait support from Caraxes, Shadowsong, and Sheepstealer when applicable.

Instinct support is represented for Syrax Mindful Synergy, Syrax Sentinel's Wit, Feskar Insightful Allies, Vermax Warrior's Zeal, Vermax Reactive Instincts, Venator Warrior's Zeal, Daemoros Warrior's Zeal, Velar Sentinel's Wit, Velar Fierce Unity, Zivern Sentinel's Wit, and Malachite Warden's Rally recipients that explicitly use Instinct.

Intelligence support is represented for Syrax Mindful Synergy and Seasmoke Cunning Ferocity when the recipient output explicitly uses Intelligence. Zivern Battle Mastery benefits from external Intelligence support.

Initiative support is represented for Syrax Flight Mastery, Seasmoke Clever Maneuver, Seasmoke Wind's Favor, Rhysarion Inspiring Melody, hard flank Trait support where the recipient output explicitly uses Initiative, and Tashix/Velar Initiative-scaling payoffs.

## Position Claims

Every detailed Trait with a hard Vanguard requirement has a position claim. When multiple selected dragons have unlocked claims for the same position, the Formation Builder emits one grouped conflict for that position instead of pairwise duplicate conflicts.

Hard recipient-position supports are modeled with `requiredRecipientPosition`. A provider's own Vanguard requirement is modeled separately with `requiredSelfPosition`. Preferred flank selectors with fallback are not treated as hard recipient-position requirements.

## Intentional Exclusions

Self-only abilities: Vhagar Ancestral Shield; Caraxes Dragon's Flair and Blood Wyrm; Crimson Dragon's Intellect; Kalspire Robust Insight and Dragon's Insight; Malachite Wise Vigor; Venator Dragon's Might; Daemoros Powerful Reflexes and Phantom's Veil; Feskar Quick-Witted; Rhysarion Sharp Resolve; Shadowsong Dragon's Intellect; Vaeldra Dragon's Valor; Sheepstealer Stolen Flock, Dragon's Cunning, Baited Kill, Wary Beast; Vermax Dragon's Valor and Unyielding Resolve; Velar Quick Reflexes; Zivern Keen Instinct.

General support only: Syrax Mother's Mercy; Vhagar Eclipse Cover; Seasmoke Loyal Bond; Feskar Resilient Bond; Vermax Trial by Flame; Tashix Enervate; Tashix Cunning Ruse; Zivern Steel Shroud.

No current cross-dragon synergy: Caraxes Battle Dread and Mass Enfeeble; Crimson Enervate and Vermin's Bane; Kalspire Battle Cunning and Radiant Conqueror; Venator Hunter's Bane; Shadowsong Ensnare; Vaeldra Ensnare.

Daemoros Darkening Fear reinforces Daemoros's existing Panic provider signal and is not emitted as a separate duplicate relationship. Vermax Rallying Flame reinforces Vermax's existing Tactical Damage support and is likewise aggregated with the base Tactical support relationship. Tashix Veiled Ambush reinforces Tashix's existing Fire output instead of creating a duplicate visible Fire relationship.
