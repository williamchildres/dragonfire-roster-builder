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

- Status: pending
- Current interpretation: Physical Damage increase does not apply to Basic Attacks unless verified
- Validation goal: Confirm whether Warrior's Zeal applies to Commands and Habits only, or also to Basic Attacks

### 5. Stack Refresh And Expiration Behavior

- Status: pending
- Validation goal: Determine whether each stack has an independent duration, a new stack refreshes all stacks, or the status shares one duration
- Notes: The app does not simulate expiration or maximum uptime assumptions

### 6. Infectious Wrath Augmentation Detail

- Status: pending
- Current handling: Existing structured augmentation remains enabled; detailed presentation and normalization require follow-up
- Validation goal: Confirm the exact presentation and interaction details for Infectious Wrath's augmentation of Cleansing Wrath
