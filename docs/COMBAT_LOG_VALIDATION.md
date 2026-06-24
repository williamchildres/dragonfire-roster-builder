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
