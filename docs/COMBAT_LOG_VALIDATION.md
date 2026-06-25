# Combat Log Validation

Use this file to plan repeatable checks against combat logs and screenshots. The current documented game build for reviewed screenshot-normalized data is `26.6.53509`.

Do not submit private account details, credentials, exploit instructions, copied game artwork, or raw assets. Evidence can be described with a label when the screenshot or log is not committed to the repository.

## Validation Template

- Game build:
- Formation positions:
- Dragon Levels:
- Star Ranks:
- Habit Levels:
- Troop types:
- Battle context:
- Expected interaction:
- Observed combat-log line:
- Result: confirmed / contradicted / inconclusive
- Notes:
- Screenshot or log reference:

## Initial Scenarios

### 1. Warden's Rally Includes Malachite

- Status: confirmed
- Game build: `26.6.53509`
- Formation positions: Malachite selected in a friendly three-dragon formation
- Expected interaction: Warden's Rally Recovery can target all three friendly dragons, including Malachite
- Observed result: Manual combat-log observation showed Malachite as a recipient of Warden's Rally Recovery
- Evidence: `malachite-wardens-rally-combat-log-self-recovery-2026-06-24`
- Notes: Raw combat log is not yet archived in the repository

### 2. Exact 50% Threshold Behavior

- Status: pending
- Expected interaction: Textual wording uses strict comparisons: "above 50%" means `> 50`, and "below 50%" means `< 50`
- Validation goal: Confirm whether exactly 50% matches neither condition in game behavior
- Notes: The app currently uses a conservative textual interpretation

### 3. Sheepstealer Dragon's Cunning Scaling Scope

- Status: pending
- Current interpretation: Self Intelligence increase is a normal effect; enemy Instinct reduction is enhanced by Initiative
- Validation goal: Confirm whether the enhanced-by-Initiative clause applies only to the Instinct reduction

### 4. Vermax Warrior's Zeal Source Scope

- Status: confirmed
- Game build: `26.6.53509`
- Expected interaction: Warrior's Zeal increases Vermax Physical Damage Dealt from all qualifying Physical Damage sources unless explicitly restricted
- Observed result: Combat-log observation showed Warrior's Zeal increasing Vermax Basic Attack Physical Damage
- Evidence: `vermax-warriors-zeal-basic-attack-combat-log-2026-06-24`
- Notes: Reviewed Dragonfire wording generally states explicitly when Basic Attacks are excluded

### 5. Stack Refresh And Expiration Behavior

- Status: pending
- Validation goal: Determine whether each stack has an independent duration, a new stack refreshes all stacks, or the status shares one duration
- Notes: The app does not simulate expiration or maximum uptime assumptions

### 6. Infectious Wrath Augmentation Detail

- Status: pending
- Current handling: Existing structured augmentation remains enabled; detailed presentation and normalization require follow-up
- Validation goal: Confirm the exact presentation and interaction details for Infectious Wrath's augmentation of Cleansing Wrath

### 7. Wild Hunt Previous-Round Recovery Priority

- Status: confirmed
- Game build: `26.6.53509`
- Expected interaction: when no current Prey exists, Wild Hunt prioritizes an eligible enemy that received Recovery during the previous round
- Observed result: Combat-log observation confirmed the priority during new Prey selection
- Evidence: `sheepstealer-wild-hunt-recovery-priority-combat-log-2026-06-24`
- Notes: This does not replace the requirement that no current Prey exists

### 8. Ally Language Caster Eligibility

- Status: confirmed
- Game build: `26.6.53509`
- Expected interaction: "Other Ally" and "Other Allies" exclude caster; plain "Ally" and "Allies" allow caster eligibility when otherwise eligible
- Observed result: repeated manual ability-text review confirmed the wording convention
- Evidence: `ally-targeting-language-review-2026-06-24`
- Notes: Spatial targeting still applies; a caster is not adjacent to itself

### 9. Malachite To Sheepstealer Recovery Amplification

- Status: confirmed reasoning example
- Game build: `26.6.53509`
- Formation positions: Malachite selected, Sheepstealer deployed in Vanguard
- Expected interaction: Warden's Rally Recovery can target Sheepstealer, and Hunter's Cunning increases Sheepstealer Recovery Received by 20%
- Result: confirmed from the combined Warden's Rally targeting, Hunter's Cunning review, and ally-language rules
- Notes: Exact final Recovery cannot be calculated until the Level and Instinct Recovery formula is known

### 10. Capability Framework Regression Checks

- Status: active website regression suite
- Game build: `26.6.53509`
- Expected interaction: capability matching should explain reviewed interactions without dragon-specific pair rules or numerical scores
- Covered formations:

### 11. Formation Analysis Repair Review

- Status: pending manual retest after merge
- Game build: `26.6.53509`
- Expected interaction: the eight Batch 1/Batch 2 formations match the generated current and preview traces without unselected friendly dragons, hard-failed potential traces, duplicate parent traces, duplicate requirements, simultaneous single-target recipient cards, or duplicate normal Burn support
- Validation goal: compare normal Formation Analysis, preview mode, debug JSON, and `npm run report:synergy` output against the reviewed expectations
- Notes: Champion's Brilliance should reduce Damage Received only for the Right Flank ally when Seasmoke is Vanguard; Resistance already means Damage Received reduction, while stacking/refresh/final formula remain unresolved
  - Malachite / Sheepstealer / Vermax validates Recovery Received amplification and Sheepstealer Physical support to Vermax
  - Sheepstealer / Malachite / Vermax validates Malachite Fire support to Left Flank Sheepstealer and inactive Sheepstealer Vanguard support
  - Malachite / Vermax / Seasmoke validates Vermax Tactical Damage stack eligibility for Malachite
  - Seasmoke / Malachite / Sheepstealer validates Malachite Fire support to Left Flank Seasmoke only
- Notes: use `npm run report:synergy` to print the current expected trace set before comparing against new combat logs

### 11. Syrax First-Strike Enables Caraxes Infernal Burst

- Status: pending combat-log confirmation
- Game build: `26.6.53509`
- Expected interaction: Syrax Blazing Fury can grant First-Strike to Caraxes; Caraxes Infernal Burst displays a 1.5x Fire Damage multiplier while Caraxes has First-Strike
- Validation goal: Confirm the trigger/target sequence and whether Caraxes can reliably be selected when multiple Fire Damage allies are present
- Notes: Current trace is status-condition enablement, not a guaranteed effect

### 12. Caraxes Slow Enables Syrax Strategic Revival

- Status: pending combat-log confirmation
- Game build: `26.6.53509`
- Expected interaction: Caraxes Crippling Inferno can apply Slow; Syrax Strategic Revival has a conditional 1.5x Recovery multiplier if any enemy has Slow
- Validation goal: Confirm timing across rounds and whether any enemy Slow is sufficient regardless of lane
- Notes: Strategic Revival and Crippling Inferno are both future unlocks in the observed account state

### 13. Caraxes Burn Periodic Damage

- Status: pending combat-log confirmation
- Game build: `26.6.53509`
- Expected interaction: Burn deals Fire Damage each round, scales with attacker Intelligence, and is mitigated by target Initiative
- Validation goal: Confirm tick timing, stacking, refresh behavior, and whether Fire Damage Dealt support affects Burn ticks

### 14. Syrax And Caraxes Stat Scaling Support

- Status: pending formula validation
- Game build: `26.6.53509`
- Expected interaction: Syrax and Caraxes stat-support effects can improve outputs that scale with the supported stat
- Validation goal: Confirm exact formulas for Initiative-enhanced Recovery, Intelligence-enhanced Fire Damage, and enemy Initiative mitigation reduction

### 15. Caraxes Text/Table Discrepancies

- Status: pending follow-up
- Game build: `26.6.53509`
- Expected interaction: Battle Dread and Mass Enfeeble preserve the visible discrepancy between raw description and ranked table values
- Validation goal: Confirm whether the ranked table or raw description controls the applied value at Habit Level 1

### 16. Phase 3.8.1 Formation Trace Review

- Status: website regression suite
- Game build: `26.6.53509`
- Formation A: Left Flank Malachite, Vanguard Caraxes, Right Flank Syrax
  - Expected: Syrax Fire support and First-Strike can target Caraxes; Hunter's Wrath supports Right Flank Syrax; Slow to Strategic Revival is preview-only unless unlocked
- Formation B: Left Flank Caraxes, Vanguard Syrax, Right Flank Malachite
  - Expected: Syrax Fire support and First-Strike can target Caraxes; Sentinel's Wit supports Left Flank Caraxes; Hunter's Wrath is inactive
- Formation C: Left Flank Malachite, Vanguard Syrax, Right Flank Caraxes
  - Expected: Sentinel's Wit supports Malachite Instinct and Initiative; Malachite Instinct scaling matches Warden's Rally Tactical Damage and Recovery; Tactical Inferno preview prefers Right Flank Caraxes
- Formation D: Left Flank Syrax, Vanguard Caraxes, Right Flank Malachite
  - Expected: Hunter's Wrath supports Right Flank Malachite and does not support Left Flank Syrax; Slow to Strategic Revival is preview-only unless unlocked
- Notes: Warden's Rally self-inclusion remains a confirmed targeting fact, not a standalone active synergy
