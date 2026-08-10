import type { AbilityKind } from '../models/dragon';

export type AbilitySynergyDisposition =
  | {
      kind: 'represented';
      signalIds: string[];
      rationale: string;
    }
  | {
      kind: 'reinforces-existing';
      signalIds: string[];
      rationale: string;
    }
  | {
      kind: 'self-only';
      rationale: string;
    }
  | {
      kind: 'general-support-only';
      rationale: string;
    }
  | {
      kind: 'no-cross-dragon-synergy';
      rationale: string;
    }
  | {
      kind: 'not-modeled';
      rationale: string;
    };

export interface AbilitySynergyReview {
  dragonId: string;
  abilityId: string;
  abilityKind: AbilityKind;
  disposition: AbilitySynergyDisposition;
}

const represented = (signalIds: string[], rationale: string): AbilitySynergyDisposition => ({
  kind: 'represented',
  signalIds,
  rationale,
});

const reinforces = (signalIds: string[], rationale: string): AbilitySynergyDisposition => ({
  kind: 'reinforces-existing',
  signalIds,
  rationale,
});

const selfOnly = (rationale: string): AbilitySynergyDisposition => ({ kind: 'self-only', rationale });
const generalOnly = (rationale: string): AbilitySynergyDisposition => ({
  kind: 'general-support-only',
  rationale,
});
const noCross = (rationale: string): AbilitySynergyDisposition => ({
  kind: 'no-cross-dragon-synergy',
  rationale,
});

const review = (
  dragonId: string,
  abilityId: string,
  abilityKind: AbilityKind,
  disposition: AbilitySynergyDisposition,
): AbilitySynergyReview => ({
  dragonId,
  abilityId,
  abilityKind,
  disposition,
});

export const metadataOnlyDragonIds: readonly string[] = [];

export const simpleSynergyAbilityReviews = [
  review(
    'sunfyre',
    'sunfyre-golden-wrath',
    'command',
    represented(
      ['sunfyre-golden-wrath-tactical', 'sunfyre-golden-wrath-fire', 'sunfyre-golden-wrath-burn'],
      'Golden Wrath is represented by its Tactical output and its Troop-Capacity-conditional Fire and Burn outputs.',
    ),
  ),
  review(
    'sunfyre',
    'sunfyre-sentinels-wit',
    'trait',
    represented(
      ['sunfyre-sentinels-wit-left-stats', 'sunfyre-sentinels-wit-vanguard'],
      'The Vanguard trait supports Left Flank Instinct and Initiative while its Tactical Damage increase remains self-only.',
    ),
  ),
  review('sunfyre', 'sunfyre-radiant-majesty', 'habit', represented(['sunfyre-radiant-majesty-damage'], 'Radiant Majesty provides one generic Damage support signal without scoring its lower-capacity expansion twice.')),
  review('sunfyre', 'sunfyre-extinguish', 'habit', generalOnly('Enemy Fire prevention has no explicit current teammate payoff.')),
  review('sunfyre', 'sunfyre-the-kings-ire', 'habit', reinforces(['sunfyre-golden-wrath-tactical'], 'The King\'s Ire reinforces Sunfyre\'s existing Tactical output; its enemy Intelligence reduction has no pair-specific teammate payoff.')),
  review('sunfyre', 'sunfyre-unbroken-splendor', 'habit', selfOnly('Fire and generic Damage Received reductions plus conditional Cleanse apply only to Sunfyre.')),
  review('sunfyre', 'sunfyre-adaptive-glory', 'habit', represented(['sunfyre-adaptive-glory-damage'], 'Only the explicit allied Damage support branch is represented; Recovery, enemy debuff, and self-stat branches remain descriptive.')),

  review(
    'tairax',
    'tairax-burning-ward',
    'command',
    represented(
      ['tairax-burning-ward-fire', 'tairax-burning-ward-burn', 'tairax-burning-ward-stagger'],
      'Burning Ward provides Fire, Burn, and one Stagger output; Stagger satisfies Control through the existing alias.',
    ),
  ),
  review(
    'tairax',
    'tairax-hunters-wrath',
    'trait',
    represented(
      ['tairax-hunters-wrath-right-stats', 'tairax-hunters-wrath-vanguard'],
      'The Vanguard trait supports Right Flank Strength and Initiative while its Fire Damage increase remains self-only.',
    ),
  ),
  review('tairax', 'tairax-whisper-of-ash', 'habit', noCross('Enemy stat reduction and self buffs remain descriptive with no cross-dragon synergy.')),
  review('tairax', 'tairax-sunder', 'habit', represented(['tairax-sunder-damage', 'tairax-sunder-control-payoff'], 'Sunder provides generic Damage amplification and one Control payoff without inventing Vulnerable.')),
  review('tairax', 'tairax-gleamstrike', 'habit', represented(['tairax-gleamstrike-fire'], 'Gleamstrike adds Fire output; its Stagger chance increase reinforces Burning Ward instead of creating a duplicate Stagger signal.')),
  review('tairax', 'tairax-gift-of-fire', 'habit', represented(['tairax-gift-of-fire-resistance', 'tairax-gift-of-fire-burn-payoff'], 'Gift of Fire is represented by its Resistance output and one Burn payoff without treating Resistance as Fire support.')),
  review('tairax', 'tairax-moonlit-hunt', 'habit', selfOnly('Evade and Fire Damage Dealt increases apply only to Tairax.')),

  review(
    'syrax',
    'syrax-blazing-fury',
    'command',
    represented(
      ['syrax-blazing-fury-first-strike', 'syrax-blazing-fury-tactical', 'syrax-blazing-fury-fire-support'],
      'Blazing Fury grants First-Strike, supports Fire Damage, and deals Tactical Damage that can receive Instinct/Tactical support.',
    ),
  ),
  review(
    'syrax',
    'syrax-sentinels-wit',
    'trait',
    represented(
      ['syrax-sentinels-wit-left-stats', 'syrax-sentinels-wit-vanguard'],
      "The Vanguard trait gives hard Left Flank Instinct and Initiative support and creates an exclusive Vanguard claim.",
    ),
  ),
  review(
    'syrax',
    'syrax-mindful-synergy',
    'habit',
    represented(['syrax-mindful-synergy-stats'], 'Formation-wide Intelligence and Instinct support matches verified scaling channels.'),
  ),
  review(
    'syrax',
    'syrax-flight-mastery',
    'habit',
    represented(['syrax-flight-mastery-initiative'], 'Formation-wide Initiative support is modeled only for recipients with explicit Initiative scaling.'),
  ),
  review(
    'syrax',
    'syrax-strategic-revival',
    'habit',
    represented(
      ['syrax-strategic-revival-recovery', 'syrax-strategic-revival-resistance', 'syrax-strategic-revival-slow-payoff'],
      'The augmentation provides Recovery, explicitly grants named Resistance, and improves Recovery when any enemy has Slow.',
    ),
  ),
  review(
    'syrax',
    'syrax-tactical-inferno',
    'habit',
    represented(['syrax-tactical-inferno-damage-support'], 'The Tactical Damage support is distinct; the Fire Damage component reinforces Syrax as a Fire supporter and is aggregated with Blazing Fury.'),
  ),
  review(
    'syrax',
    'syrax-mothers-mercy',
    'habit',
    generalOnly('Cleanse is useful but has no current kit-specific teammate dependency in the simple profile set.'),
  ),

  review(
    'vhagar',
    'vhagar-fiery-bonds',
    'command',
    represented(
      ['vhagar-fiery-bonds-taunt', 'vhagar-fiery-bonds-physical', 'vhagar-fiery-bonds-burn-payoff'],
      'Fiery Bonds applies Taunt, deals Strength-based Physical Damage, and explicitly benefits from Burned targets.',
    ),
  ),
  review(
    'vhagar',
    'vhagar-warriors-resilience',
    'trait',
    represented(
      ['vhagar-warriors-resilience-left-tactical', 'vhagar-warriors-resilience-vanguard'],
      'The Vanguard trait gives hard Left Flank Tactical Damage support and creates an exclusive Vanguard claim.',
    ),
  ),
  review('vhagar', 'vhagar-ancestral-shield', 'habit', selfOnly('The defensive and Recovery Received effects apply only to Vhagar.')),
  review(
    'vhagar',
    'vhagar-battle-leader',
    'habit',
    represented(['vhagar-battle-leader-physical'], 'The habit improves a teammate non-Basic Physical Damage channel.'),
  ),
  review('vhagar', 'vhagar-eclipse-cover', 'habit', generalOnly('Advantage and Weakened are broad effects with no current explicit teammate payoff.')),
  review(
    'vhagar',
    'vhagar-blazing-onslaught',
    'habit',
    represented(['vhagar-blazing-onslaught-vulnerability'], 'The habit increases enemy Fire and non-Basic Physical Damage Received.'),
  ),
  review(
    'vhagar',
    'vhagar-skyward-titan',
    'habit',
    represented(['vhagar-skyward-titan-physical'], 'The third Bulwark event deals Strength-based Physical Damage; the stack loop itself is self-only.'),
  ),

  review(
    'caraxes',
    'caraxes-infernal-burst',
    'command',
    represented(
      ['caraxes-infernal-burst-fire', 'caraxes-infernal-burst-first-strike-payoff'],
      'Infernal Burst is Intelligence-based Fire Damage and explicitly benefits from First-Strike.',
    ),
  ),
  review(
    'caraxes',
    'caraxes-hunters-wrath',
    'trait',
    represented(
      ['caraxes-hunters-wrath-right-stats', 'caraxes-hunters-wrath-vanguard'],
      'The Vanguard trait gives hard Right Flank Strength and Initiative support and creates an exclusive Vanguard claim.',
    ),
  ),
  review('caraxes', 'caraxes-battle-dread', 'habit', noCross('Enemy stat reduction is generally useful but does not match a current explicit teammate payoff.')),
  review('caraxes', 'caraxes-dragons-flair', 'habit', selfOnly('The Fire Damage increase applies only to Caraxes.')),
  review(
    'caraxes',
    'caraxes-crippling-inferno',
    'habit',
    represented(
      ['caraxes-crippling-inferno-slow', 'caraxes-crippling-inferno-burn', 'caraxes-crippling-inferno-fire'],
      'Crippling Inferno supplies distinct Slow and Burn setup; its high-level Fire output through Burn reinforces Caraxes as a Fire output dragon and is aggregated with Infernal Burst.',
    ),
  ),
  review('caraxes', 'caraxes-mass-enfeeble', 'habit', noCross('Enemy non-Basic Physical Damage reduction has no current pair-specific payoff.')),
  review('caraxes', 'caraxes-blood-wyrm', 'habit', selfOnly('The Fire Damage and Recovery effects are conditional self benefits.')),

  review('seasmoke', 'seasmoke-cleansing-wrath', 'command', represented(['seasmoke-cleansing-wrath-fire'], 'The command deals Intelligence-based Fire Damage.')),
  review(
    'seasmoke',
    'seasmoke-champions-brilliance',
    'trait',
    represented(['seasmoke-champions-brilliance-vanguard'], 'The trait requires Vanguard; its teammate Damage Received reduction is general support only.'),
  ),
  review(
    'seasmoke',
    'seasmoke-clever-maneuver',
    'habit',
    represented(['seasmoke-clever-maneuver-stats'], 'The habit improves Intelligence and Initiative for a stat-scaling ally.'),
  ),
  review('seasmoke', 'seasmoke-winds-favor', 'habit', represented(['seasmoke-winds-favor-initiative'], 'The habit improves allied Initiative.')),
  review(
    'seasmoke',
    'seasmoke-infectious-wrath',
    'habit',
    represented(
      ['seasmoke-infectious-wrath-physical', 'seasmoke-infectious-wrath-panic-payoff'],
      'The augmentation adds Physical Damage that is explicitly improved by Panic.',
    ),
  ),
  review(
    'seasmoke',
    'seasmoke-cunning-ferocity',
    'habit',
    represented(['seasmoke-cunning-ferocity-fire-intelligence'], 'The habit gives adjacent Fire Damage and Intelligence support.'),
  ),
  review('seasmoke', 'seasmoke-loyal-bond', 'habit', represented(['seasmoke-loyal-bond-resistance'], 'The verified wording explicitly grants named Resistance below 50% Troop Capacity; conditional Advantage remains general support only.')),

  review(
    'crimson',
    'crimson-bloodscale-terror',
    'command',
    represented(['crimson-bloodscale-terror-stun', 'crimson-bloodscale-terror-fire'], 'The command supplies Stun as Control and Intelligence-based Fire Damage.'),
  ),
  review(
    'crimson',
    'crimson-hunters-cunning',
    'trait',
    represented(
      ['crimson-hunters-cunning-right-physical', 'crimson-hunters-cunning-vanguard'],
      'The Vanguard trait gives hard Right Flank Physical support and creates an exclusive Vanguard claim.',
    ),
  ),
  review('crimson', 'crimson-enervate', 'habit', noCross('Enemy Tactical Damage reduction targets enemy output and has no current pair-specific teammate payoff.')),
  review('crimson', 'crimson-dragons-intellect', 'habit', selfOnly('The Damage Received reduction and Intelligence increase apply only to Crimson.')),
  review(
    'crimson',
    'crimson-bloodscale-fury',
    'habit',
    represented(['crimson-bloodscale-fury-taunt-payoff'], 'Bloodscale Fury explicitly improves when a target has Taunt.'),
  ),
  review(
    'crimson',
    'crimson-unlikely-hero',
    'habit',
    represented(['crimson-unlikely-hero-vulnerability'], 'The habit increases enemy non-Basic Physical and Fire Damage Received.'),
  ),
  review('crimson', 'crimson-vermins-bane', 'habit', noCross('The Command augmentation adds enemy stat reductions but no current teammate payoff.')),

  review(
    'kalspire',
    'kalspire-tactical-strike',
    'command',
    represented(['kalspire-tactical-strike-tactical', 'kalspire-tactical-strike-bleed'], 'The command deals Instinct-based Tactical Damage and provides the specific Bleed setup used by Arrax.'),
  ),
  review(
    'kalspire',
    'kalspire-champions-brilliance',
    'trait',
    represented(['kalspire-champions-brilliance-vanguard'], 'The trait requires Vanguard; its teammate Damage Received reduction is general support only.'),
  ),
  review('kalspire', 'kalspire-robust-insight', 'habit', selfOnly('The Strength and Instinct increases apply only to Kalspire.')),
  review('kalspire', 'kalspire-battle-cunning', 'habit', noCross('Enemy Strength and Intelligence reductions have no current pair-specific payoff.')),
  review(
    'kalspire',
    'kalspire-tactical-assault',
    'habit',
    represented(
      ['kalspire-tactical-assault-physical', 'kalspire-tactical-assault-panic'],
      'The augmentation adds Strength-based Physical Damage and Panic setup.',
    ),
  ),
  review('kalspire', 'kalspire-dragons-insight', 'habit', selfOnly('The Damage Received reduction and Instinct increase apply only to Kalspire.')),
  review('kalspire', 'kalspire-radiant-conqueror', 'habit', noCross('The self-Stun is source-bound and enemy damage reductions have no current explicit teammate payoff.')),

  review(
    'malachite',
    'malachite-wardens-rally',
    'command',
    represented(
      ['malachite-wardens-rally-tactical', 'malachite-wardens-rally-recovery'],
      "Warden's Rally deals Instinct-based Tactical Damage and provides Instinct-enhanced Recovery.",
    ),
  ),
  review(
    'malachite',
    'malachite-sentinels-presence',
    'trait',
    represented(
      ['malachite-sentinels-presence-left-fire', 'malachite-sentinels-presence-vanguard'],
      'The Vanguard trait gives hard Left Flank Fire support and creates an exclusive Vanguard claim.',
    ),
  ),
  review(
    'malachite',
    'malachite-forests-instinct',
    'habit',
    represented(['malachite-forests-instinct-physical'], 'The habit improves other allies non-Basic Physical Damage.'),
  ),
  review('malachite', 'malachite-wise-vigor', 'habit', selfOnly('The Instinct and Recovery Dealt increases apply only to Malachite.')),
  review('malachite', 'malachite-thunderous-roar', 'habit', represented(['malachite-thunderous-roar-damage'], 'Advantage is represented as broad Damage Dealt support.')),
  review('malachite', 'malachite-collective-might', 'habit', represented(['malachite-collective-might-strength'], 'The habit improves allied Strength.')),
  review(
    'malachite',
    'malachite-lightning-strike',
    'habit',
    represented(['malachite-lightning-strike-first-strike', 'malachite-lightning-strike-strength'], 'The habit grants adjacent First-Strike and Strength support.'),
  ),

  review('venator', 'venator-feral-strike', 'command', represented(['venator-feral-strike-physical'], 'The command deals Strength-based Physical Damage.')),
  review(
    'venator',
    'venator-warriors-zeal',
    'trait',
    represented(
      ['venator-warriors-zeal-left-stats', 'venator-warriors-zeal-vanguard'],
      'The Vanguard trait gives hard Left Flank Instinct and Initiative support and creates an exclusive Vanguard claim.',
    ),
  ),
  review('venator', 'venator-hunters-bane', 'habit', noCross('Enemy Intelligence reduction has no current pair-specific payoff.')),
  review('venator', 'venator-dragons-might', 'habit', selfOnly('The non-Basic Physical Damage increase applies only to Venator.')),
  review('venator', 'venator-feral-precision', 'habit', represented(['venator-feral-precision-physical'], 'The augmentation adds Strength-based Physical Damage.')),
  review('venator', 'venator-armor-break', 'habit', represented(['venator-armor-break-physical'], 'The habit increases enemy Physical Damage Received.')),
  review(
    'venator',
    'venator-desperate-ambush',
    'habit',
    represented(['venator-desperate-ambush-overwhelm'], 'The habit applies Overwhelm, which satisfies the high-level Control setup.'),
  ),

  review(
    'daemoros',
    'daemoros-shadowflame',
    'command',
    represented(['daemoros-shadowflame-physical', 'daemoros-shadowflame-burn'], 'The command deals Strength-based Physical Damage and can apply Burn.'),
  ),
  review(
    'daemoros',
    'daemoros-warriors-zeal',
    'trait',
    represented(
      ['daemoros-warriors-zeal-left-stats', 'daemoros-warriors-zeal-vanguard'],
      'The Vanguard trait gives hard Left Flank Instinct and Initiative support and creates an exclusive Vanguard claim.',
    ),
  ),
  review('daemoros', 'daemoros-instill-fear', 'habit', represented(['daemoros-instill-fear-panic'], 'The habit applies Panic.')),
  review('daemoros', 'daemoros-powerful-reflexes', 'habit', selfOnly('The Strength and Initiative increases apply only to Daemoros.')),
  review('daemoros', 'daemoros-shroud-of-shadows', 'habit', represented(['daemoros-shroud-of-shadows-confusion'], 'The habit applies Confusion, which satisfies Control.')),
  review('daemoros', 'daemoros-darkening-fear', 'habit', reinforces(['daemoros-instill-fear-panic'], 'The later Panic ability reinforces Daemoros as a Panic provider without adding a distinct visible relationship.')),
  review('daemoros', 'daemoros-phantoms-veil', 'habit', selfOnly('The exclusive Damage Received reduction applies only to Daemoros.')),

  review(
    'feskar',
    'feskar-calculated-assault',
    'command',
    represented(['feskar-calculated-assault-tactical'], 'The base command deals Instinct-based Tactical Damage; the Fire augmentation is reviewed on Emerald Inferno.'),
  ),
  review(
    'feskar',
    'feskar-champions-brilliance',
    'trait',
    represented(['feskar-champions-brilliance-vanguard'], 'The trait requires Vanguard; its teammate Damage Received reduction is general support only.'),
  ),
  review('feskar', 'feskar-resilient-bond', 'habit', generalOnly('The adjacent defensive bond is survivability support without a current explicit payoff.')),
  review('feskar', 'feskar-insightful-allies', 'habit', represented(['feskar-insightful-allies-instinct'], 'The habit improves allied Instinct.')),
  review(
    'feskar',
    'feskar-emerald-inferno',
    'habit',
    represented(['feskar-emerald-inferno-fire', 'feskar-emerald-inferno-burn-payoff'], 'The augmentation adds Intelligence-based Fire Damage that explicitly benefits from Burn.'),
  ),
  review('feskar', 'feskar-quick-witted', 'habit', selfOnly('The Intelligence and Initiative increases apply only to Feskar.')),
  review('feskar', 'feskar-unyielding-grasp', 'habit', represented(['feskar-unyielding-grasp-stagger'], 'The habit applies Stagger, which satisfies Control.')),

  review(
    'rhysarion',
    'rhysarion-dawnsong',
    'command',
    represented(
      ['rhysarion-dawnsong-physical', 'rhysarion-dawnsong-fire', 'rhysarion-dawnsong-control-payoff'],
      'Dawnsong deals Physical and Fire Damage and explicitly improves Fire Damage against Control.',
    ),
  ),
  review(
    'rhysarion',
    'rhysarion-champions-vigor',
    'trait',
    represented(
      ['rhysarion-champions-vigor-right-damage', 'rhysarion-champions-vigor-vanguard'],
      'The Vanguard trait gives hard Right Flank generic Damage support and creates an exclusive Vanguard claim.',
    ),
  ),
  review('rhysarion', 'rhysarion-ebbing-fury', 'habit', represented(['rhysarion-ebbing-fury-recovery'], 'The habit provides Strength-enhanced Recovery.')),
  review('rhysarion', 'rhysarion-sharp-resolve', 'habit', selfOnly('The Strength and Intelligence increases apply only to Rhysarion.')),
  review('rhysarion', 'rhysarion-echoing-melody', 'habit', represented(['rhysarion-echoing-melody-recovery'], 'The augmentation provides Intelligence-enhanced Recovery to other allies.')),
  review('rhysarion', 'rhysarion-unbroken-devotion', 'habit', represented(['rhysarion-unbroken-devotion-recovery'], 'The habit improves other allies Recovery Received.')),
  review('rhysarion', 'rhysarion-inspiring-melody', 'habit', represented(['rhysarion-inspiring-melody-initiative', 'rhysarion-inspiring-melody-resistance'], 'The verified wording gives adjacent Initiative support and explicitly grants named Resistance to the same ally.')),

  review(
    'shadowsong',
    'shadowsong-breath-of-fire',
    'command',
    represented(['shadowsong-breath-of-fire-fire', 'shadowsong-panic-payoff'], 'Breath of Fire deals Intelligence-based Fire Damage and explicitly benefits from Panic.'),
  ),
  review(
    'shadowsong',
    'shadowsong-hunters-wrath',
    'trait',
    represented(
      ['shadowsong-hunters-wrath-right-stats', 'shadowsong-hunters-wrath-vanguard'],
      'The Vanguard trait gives hard Right Flank Strength and Initiative support and creates an exclusive Vanguard claim.',
    ),
  ),
  review('shadowsong', 'shadowsong-ensnare', 'habit', noCross('Enemy Instinct and Initiative reductions have no current pair-specific payoff.')),
  review('shadowsong', 'shadowsong-blazing-onslaught', 'habit', represented(['shadowsong-blazing-onslaught-vulnerability'], 'The habit increases enemy Fire and non-Basic Physical Damage Received.')),
  review('shadowsong', 'shadowsong-scorched-earth', 'habit', represented(['shadowsong-scorched-earth-vulnerable', 'shadowsong-scorched-earth-vulnerable-status', 'shadowsong-panic-payoff'], 'The habit provides generic Damage Received vulnerability, emits Vulnerable setup for Zivern, and also benefits from Panic without a duplicate visible Panic relationship.')),
  review('shadowsong', 'shadowsong-dragons-intellect', 'habit', selfOnly('The Damage Received reduction and Intelligence increase apply only to Shadowsong.')),
  review('shadowsong', 'shadowsong-blazing-conductor', 'habit', represented(['shadowsong-blazing-conductor-burn'], 'The augmentation adds Burn setup and additional Fire Damage already covered by Breath of Fire output.')),

  review(
    'vaeldra',
    'vaeldra-lure',
    'command',
    represented(['vaeldra-lure-taunt', 'vaeldra-lure-physical'], 'Lure applies Taunt and deals Strength-based Physical Damage.'),
  ),
  review(
    'vaeldra',
    'vaeldra-warriors-resilience',
    'trait',
    represented(
      ['vaeldra-warriors-resilience-left-tactical', 'vaeldra-warriors-resilience-vanguard'],
      'The Vanguard trait gives hard Left Flank Tactical support and creates an exclusive Vanguard claim.',
    ),
  ),
  review('vaeldra', 'vaeldra-dragons-valor', 'habit', selfOnly('The Damage Received reduction and Strength increase apply only to Vaeldra.')),
  review('vaeldra', 'vaeldra-ensnare', 'habit', noCross('Enemy Instinct and Initiative reductions have no current pair-specific payoff.')),
  review('vaeldra', 'vaeldra-tempting-distraction', 'habit', represented(['vaeldra-tempting-distraction-vulnerability'], "The vulnerability is represented as Vaeldra-owned support and is not modeled as benefiting from another dragon's Taunt.")),
  review('vaeldra', 'vaeldra-infernal-force', 'habit', represented(['vaeldra-infernal-force-damage'], 'The habit improves allied Fire and non-Basic Physical Damage.')),
  review('vaeldra', 'vaeldra-sirens-call', 'habit', represented(['vaeldra-sirens-call-stagger'], 'The habit applies Stagger as Control; its self defense is self-only.')),

  review('sheepstealer', 'sheepstealer-wild-hunt', 'command', represented(['sheepstealer-wild-hunt-fire'], 'Wild Hunt deals Intelligence-based Fire Damage; Prey is a self-owned loop.')),
  review(
    'sheepstealer',
    'sheepstealer-hunters-cunning',
    'trait',
    represented(
      ['sheepstealer-hunters-cunning-right-physical', 'sheepstealer-hunters-cunning-recovery-payoff', 'sheepstealer-hunters-cunning-vanguard'],
      'The Vanguard trait gives hard Right Flank Physical support, improves incoming Recovery, and creates an exclusive Vanguard claim.',
    ),
  ),
  review('sheepstealer', 'sheepstealer-stolen-flock', 'habit', selfOnly('The Fire Damage and Stolen Flock stack loop is self-owned.')),
  review('sheepstealer', 'sheepstealer-dragons-cunning', 'habit', selfOnly('The Intelligence increase is self-only; the enemy Instinct reduction has no explicit teammate payoff.')),
  review('sheepstealer', 'sheepstealer-baited-kill', 'habit', selfOnly('The Prey/Vulnerable loop is source-bound to Sheepstealer and does not create a teammate requirement.')),
  review('sheepstealer', 'sheepstealer-wary-beast', 'habit', selfOnly('Evade is self-only and enemy Recovery Received reduction has no current teammate payoff.')),
  review('sheepstealer', 'sheepstealer-savage-claim', 'habit', represented(['sheepstealer-savage-claim-recovery'], 'The augmentation adds self Recovery; its Prey condition remains self-owned.')),

  review(
    'vermax',
    'vermax-spreading-blaze',
    'command',
    represented(['vermax-spreading-blaze-physical', 'vermax-spreading-blaze-tactical'], 'The command deals Strength-based Physical Damage and supports an ally that deals Tactical Damage.'),
  ),
  review(
    'vermax',
    'vermax-warriors-zeal',
    'trait',
    represented(
      ['vermax-warriors-zeal-left-stats', 'vermax-warriors-zeal-vanguard'],
      'The Vanguard trait gives hard Left Flank Instinct and Initiative support and creates an exclusive Vanguard claim.',
    ),
  ),
  review('vermax', 'vermax-trial-by-flame', 'habit', generalOnly('Threshold Fire resistance and Resistance are defensive support without a current explicit payoff.')),
  review('vermax', 'vermax-reactive-instincts', 'habit', represented(['vermax-reactive-instincts-stats'], 'The habit improves Instinct and Initiative of an ally.')),
  review('vermax', 'vermax-rallying-flame', 'habit', reinforces(['vermax-rallying-flame-tactical'], 'The habit reinforces Vermax as a Tactical Damage supporter without adding a separate visible relationship beyond Spreading Blaze.')),
  review('vermax', 'vermax-dragons-valor', 'habit', selfOnly('The Damage Received reduction and Strength increase apply only to Vermax.')),
  review('vermax', 'vermax-unyielding-resolve', 'habit', selfOnly('The Weakened payoff is explicitly self-owned and cannot be enabled by a teammate.')),

  review(
    'tashix',
    'tashix-shimmering-mirage',
    'command',
    represented(['tashix-shimmering-mirage-fire'], 'Shimmering Mirage establishes Tashix as an Intelligence-based Fire Damage output; Mirage stacks remain self-owned raw wording.'),
  ),
  review(
    'tashix',
    'tashix-hunters-cunning',
    'trait',
    represented(
      ['tashix-hunters-cunning-right-physical', 'tashix-hunters-cunning-recovery-payoff', 'tashix-hunters-cunning-vanguard'],
      'The Vanguard trait gives hard Right Flank Physical support, improves Tashix incoming Recovery, and creates an exclusive Vanguard claim.',
    ),
  ),
  review('tashix', 'tashix-enervate', 'habit', generalOnly('Enemy Tactical Damage reduction is useful prevention but has no current explicit teammate payoff.')),
  review(
    'tashix',
    'tashix-dragons-cunning',
    'habit',
    represented(
      ['tashix-dragons-cunning-physical', 'tashix-dragons-cunning-initiative-payoff'],
      'Enemy Instinct reduction supports allied Physical Damage, and the Initiative scaling creates an Initiative-support payoff for Tashix.',
    ),
  ),
  review('tashix', 'tashix-cunning-ruse', 'habit', generalOnly('Mirage is self-owned and Weakened has no current explicit teammate payoff in the simple profile set.')),
  review(
    'tashix',
    'tashix-battle-guile',
    'habit',
    represented(['tashix-battle-guile-fire'], 'Enemy Initiative reduction supports allied Fire Damage because Initiative reduces Fire Damage Received.'),
  ),
  review(
    'tashix',
    'tashix-veiled-ambush',
    'habit',
    reinforces(['tashix-shimmering-mirage-fire'], 'The later Mirage payoff reinforces Tashix as a Fire Damage output without creating a duplicate visible Fire relationship.'),
  ),

  review(
    'velar',
    'velar-whirlwind',
    'command',
    represented(
      ['velar-whirlwind-tactical', 'velar-whirlwind-advantage-damage'],
      'Whirlwind deals Instinct-based Tactical Damage and represents Advantage through the current generic damage-channel support pattern; Cleanse is general support only.',
    ),
  ),
  review(
    'velar',
    'velar-sentinels-wit',
    'trait',
    represented(
      ['velar-sentinels-wit-left-stats', 'velar-sentinels-wit-vanguard'],
      'The Vanguard trait gives hard Left Flank Instinct and Initiative support and creates an exclusive Vanguard claim.',
    ),
  ),
  review('velar', 'velar-strategic-leader', 'habit', represented(['velar-strategic-leader-tactical'], 'The habit improves allied Tactical Damage; Vanguard is only a targeting preference with fallback.')),
  review('velar', 'velar-quick-reflexes', 'habit', selfOnly('The Instinct and Initiative increases apply only to Velar.')),
  review(
    'velar',
    'velar-gales-of-power',
    'habit',
    represented(['velar-gales-of-power-first-strike', 'velar-gales-of-power-slow'], 'The habit grants First-Strike setup and applies Slow setup.'),
  ),
  review(
    'velar',
    'velar-fierce-unity',
    'habit',
    represented(['velar-fierce-unity-stats', 'velar-fierce-unity-initiative-payoff'], 'The habit improves allied Strength and Instinct and creates an Initiative-support payoff through its scaling.'),
  ),
  review(
    'velar',
    'velar-breath-of-renewal',
    'habit',
    represented(['velar-breath-of-renewal-recovery'], 'The augmentation provides Initiative-enhanced Recovery; Cleanse remains general support only.'),
  ),

  review(
    'zivern',
    'zivern-silent-shade',
    'command',
    represented(
      ['zivern-silent-shade-tactical', 'zivern-silent-shade-tactical-vulnerability'],
      'Silent Shade deals Instinct-based Tactical Damage and increases enemy Tactical Damage Received for allied Tactical outputs.',
    ),
  ),
  review(
    'zivern',
    'zivern-sentinels-wit',
    'trait',
    represented(
      ['zivern-sentinels-wit-left-stats', 'zivern-sentinels-wit-vanguard'],
      'The Vanguard trait gives hard Left Flank Instinct and Initiative support and creates an exclusive Vanguard claim.',
    ),
  ),
  review(
    'zivern',
    'zivern-battle-mastery',
    'habit',
    represented(
      ['zivern-battle-mastery-physical', 'zivern-battle-mastery-intelligence-payoff'],
      'Enemy Instinct reduction supports allied Physical Damage, and Intelligence scaling creates an Intelligence-support payoff for Zivern.',
    ),
  ),
  review('zivern', 'zivern-keen-instinct', 'habit', selfOnly('The Intelligence and Instinct increases apply only to Zivern.')),
  review('zivern', 'zivern-fearsome-reach', 'habit', represented(['zivern-fearsome-reach-panic'], "The habit applies Panic and reinforces Battle Mastery's Physical-support and Intelligence-scaling paths without duplicate signals.")),
  review('zivern', 'zivern-steel-shroud', 'habit', generalOnly('The allied defensive support remains visible as raw ability text but has no current explicit teammate payoff.')),
  review(
    'zivern',
    'zivern-cloak-of-terror',
    'habit',
    represented(
      ['zivern-cloak-of-terror-overwhelm', 'zivern-cloak-of-terror-vulnerable-payoff'],
      'The habit applies Overwhelm as Control and explicitly benefits from Vulnerable setup.',
    ),
  ),

  review(
    'antares',
    'antares-relentless-pursuit',
    'command',
    represented(
      ['antares-relentless-pursuit-fire', 'antares-relentless-pursuit-vulnerable'],
      'The Command deals Intelligence-based Fire Damage and applies the named Vulnerable status; its later Slow payoff is reviewed on Fiery Precision.',
    ),
  ),
  review(
    'antares',
    'antares-hunters-wrath',
    'trait',
    represented(
      ['antares-hunters-wrath-right-stats', 'antares-hunters-wrath-vanguard'],
      "The Vanguard trait gives hard Right Flank Strength and Initiative support; Antares's Fire increase remains self-only.",
    ),
  ),
  review(
    'antares',
    'antares-blazing-onslaught',
    'habit',
    represented(
      [
        'antares-blazing-onslaught-fire-vulnerability',
        'antares-blazing-onslaught-non-basic-physical-vulnerability',
      ],
      'The habit increases enemy Fire Damage Received broadly while its Physical branch matches only outputs explicitly typed as non-Basic-Attack damage.',
    ),
  ),
  review('antares', 'antares-dragons-flair', 'habit', selfOnly('The Fire Damage increase applies only to Antares.')),
  review('antares', 'antares-fiery-precision', 'habit', represented(['antares-fiery-precision-slow-payoff'], 'The augmentation creates the Star Rank 6 Slow payoff while its Fire output remains the single Relentless Pursuit Damage Profile path.')),
  review('antares', 'antares-dragons-intellect', 'habit', selfOnly('The Damage Received reduction and Intelligence increase apply only to Antares.')),
  review('antares', 'antares-redemption', 'habit', selfOnly('The stat increases and shared-roll Vulnerable/Weakened immunity apply only to Antares and do not imply cleanse behavior.')),

  review(
    'arulix',
    'arulix-gleaming-spiral',
    'command',
    represented(
      ['arulix-gleaming-spiral-tactical', 'arulix-gleaming-spiral-physical'],
      'The Command deals Instinct-based Tactical Damage and gains one Strength-based Physical Damage path at Star Rank 6; enemy Fire suppression and battlefield target typing remain descriptive.',
    ),
  ),
  review(
    'arulix',
    'arulix-champions-brilliance',
    'trait',
    represented(
      ['arulix-champions-brilliance-vanguard'],
      'The trait requires Vanguard; its self stats are self-only and its Right Flank Damage Received reduction is non-scoring defensive support.',
    ),
  ),
  review(
    'arulix',
    'arulix-hypnotic-helix',
    'habit',
    represented(
      ['arulix-hypnotic-helix-overwhelm', 'arulix-hypnotic-helix-stagger'],
      'The habit preserves distinct Overwhelm and Stagger outputs, both of which satisfy Control without collapsing their labels.',
    ),
  ),
  review('arulix', 'arulix-battle-cunning', 'habit', represented(['arulix-battle-cunning-instinct-payoff'], 'External Instinct support improves Battle Cunning; direct enemy stat reductions do not invent damage-type relationships.')),
  review('arulix', 'arulix-spiral-surge', 'habit', reinforces(['arulix-gleaming-spiral-physical'], 'The Command augmentation adds one progression-gated Physical Damage path and derives later-round rates from the current upgraded base.')),
  review('arulix', 'arulix-iron-shell', 'habit', generalOnly('The non-Basic Physical and Fire Damage Received reductions are typed defensive support without a scored offensive consumer model.')),
  review('arulix', 'arulix-mimicry', 'habit', noCross('Mimicry copies battlefield-present effects through two conditional branches and does not provide any copied status unconditionally.')),

  review(
    'arrax',
    'arrax-sudden-strike',
    'command',
    represented(
      ['arrax-sudden-strike-physical', 'arrax-sudden-strike-weakened', 'arrax-sudden-strike-bleed-payoff'],
      'The Command deals Strength-based Physical Damage, applies Weakened, and explicitly improves that application chance against Bleed without treating either status as Control.',
    ),
  ),
  review(
    'arrax',
    'arrax-warriors-resilience',
    'trait',
    represented(
      ['arrax-warriors-resilience-left-tactical', 'arrax-warriors-resilience-vanguard'],
      'The Vanguard trait gives hard Left Flank Tactical support while Arrax Damage Received reduction remains self-only.',
    ),
  ),
  review('arrax', 'arrax-headlong-into-danger', 'habit', selfOnly('The positive effects and displayed penalties apply only to Arrax and do not create named status or allied support signals.')),
  review('arrax', 'arrax-stone-bulwark', 'habit', generalOnly('The Tactical and Fire Damage Received reductions are typed defensive support, not offensive Tactical or Fire support.')),
  review('arrax', 'arrax-adaptive-guard', 'habit', generalOnly('Both defensive branches remain troop-gated and inactive because Formation Builder has no selected troop context.')),
  review('arrax', 'arrax-fire-ward', 'habit', generalOnly('Fire Ward remains a distinct defensive status and does not become offensive Fire Damage support.')),
  review('arrax', 'arrax-turn-the-line', 'habit', represented(['arrax-turn-the-line-physical'], 'The Star Rank 10 habit directly increases enemy Physical Damage Received without inventing named Vulnerable.')),

  review('solstryker', 'solstryker-tactical-onslaught', 'command', represented(['solstryker-tactical-onslaught-physical', 'solstryker-tactical-onslaught-tactical', 'solstryker-tactical-onslaught-vulnerable-payoff', 'solstryker-tactical-onslaught-strength-payoff', 'solstryker-tactical-onslaught-instinct-payoff'], 'The Command provides Physical and Tactical output with one Strength need, one Instinct need, and a base Vulnerable payoff; typed enemy Physical suppression is non-scoring.')),
  review('solstryker', 'solstryker-champions-brilliance', 'trait', represented(['solstryker-champions-brilliance-vanguard'], 'The trait requires Vanguard; self stats and Right Flank defensive support do not create ordinary support signals.')),
  review('solstryker', 'solstryker-steady-erosion', 'habit', noCross('Steady Erosion is a named stacking enemy Strength debuff, not Vulnerable, Weakened, or Control.')),
  review('solstryker', 'solstryker-energy-drain', 'habit', noCross('Direct enemy Strength and Initiative reductions are detailed and non-scoring.')),
  review('solstryker', 'solstryker-oppressive-onslaught', 'habit', represented(['solstryker-oppressive-onslaught-overwhelm'], 'The Habit applies specifically visible Overwhelm, which satisfies Control through one alias path at Star Rank 6.')),
  review('solstryker', 'solstryker-robust-insight', 'habit', selfOnly('The Strength and Instinct increases apply only to Solstryker.')),
  review('solstryker', 'solstryker-amplified-drain', 'habit', noCross('The independent Round 4 enemy stat reduction is detailed and non-scoring.')),

  review('shimmer', 'shimmer-unbreakable-loyalty', 'command', represented(['shimmer-unbreakable-loyalty-tactical', 'shimmer-unbreakable-loyalty-stats', 'shimmer-unbreakable-loyalty-instinct-payoff'], 'The Command deals Tactical Damage and gives paired Strength/Initiative support to one deterministic highest-Strength other ally.')),
  review('shimmer', 'shimmer-sentinels-presence', 'trait', represented(['shimmer-sentinels-presence-left-fire', 'shimmer-sentinels-presence-vanguard'], 'The Vanguard trait supports Left Flank Fire Damage; self Recovery and Instinct increases remain self-only.')),
  review('shimmer', 'shimmer-crushing-force', 'habit', represented(['shimmer-crushing-force-physical', 'shimmer-crushing-force-tactical'], 'Two independent priority selectors preserve Left Flank non-Basic Physical and Right Flank Tactical support without unrestricted fallback or self-synergy.')),
  review('shimmer', 'shimmer-dragons-insight', 'habit', selfOnly('Damage Received reduction and Instinct increase apply only to Shimmer.')),
  review('shimmer', 'shimmer-loyal-shield', 'habit', represented(['shimmer-loyal-shield-recovery', 'shimmer-loyal-shield-resistance-payoff'], 'The augmentation adds one Recovery path at Star Rank 6 and a per-recipient Resistance doubling payoff.')),
  review('shimmer', 'shimmer-unbroken-devotion', 'habit', represented(['shimmer-unbroken-devotion-recovery'], 'The Habit improves Recovery Received of both other allies and cannot support Shimmer herself.')),
  review('shimmer', 'shimmer-sneak-attack', 'habit', represented(['shimmer-sneak-attack-first-strike', 'shimmer-sneak-attack-physical'], 'One activation grants paired Physical support and First-Strike to the same highest-Strength other ally at Star Rank 10.')),

  review('jagadrix', 'jagadrix-cunning-whispers', 'command', represented(['jagadrix-cunning-whispers-fire', 'jagadrix-cunning-whispers-intelligence-payoff', 'jagadrix-cunning-whispers-initiative-payoff'], 'The Command deals Fire Damage and exposes Intelligence, Initiative, and Fire support compatibility; enemy same-lane reductions remain battlefield-facing.')),
  review('jagadrix', 'jagadrix-hunters-wrath', 'trait', represented(['jagadrix-hunters-wrath-right-stats', 'jagadrix-hunters-wrath-vanguard'], 'The Vanguard trait supports Right Flank Strength and Initiative while its Fire increase is self-only.')),
  review('jagadrix', 'jagadrix-enervate', 'habit', noCross('Enemy Tactical Damage suppression is not Weakened or allied Tactical support.')),
  review('jagadrix', 'jagadrix-second-wind', 'habit', selfOnly('Damage, immediate Recovery, and subsequent Nullify Recovery are ordered self-only effects with no static cross-dragon relationship.')),
  review('jagadrix', 'jagadrix-whispering-sabotage', 'habit', represented(['jagadrix-whispering-sabotage-weakened'], 'The Habit provides one Weakened path at Star Rank 6 without a Control alias.')),
  review('jagadrix', 'jagadrix-quick-witted', 'habit', selfOnly('Intelligence and Initiative increases apply only to Jagadrix.')),
  review('jagadrix', 'jagadrix-echoes-of-deceit', 'habit', represented(['jagadrix-echoes-of-deceit-fire', 'jagadrix-echoes-of-deceit-panic-payoff'], 'The augmentation adds one extra Fire path and one Panic payoff at Star Rank 10 without adding Tactical Damage.')),

  review('bevlorin', 'bevlorin-natures-reckoning', 'command', represented(['bevlorin-natures-reckoning-physical', 'bevlorin-natures-reckoning-fire', 'bevlorin-natures-reckoning-strength-payoff', 'bevlorin-natures-reckoning-intelligence-payoff'], "The Command provides Strength-based Physical and Intelligence-based Fire output; enemy Fire suppression remains battlefield-facing and Renewal is reviewed as one augmentation path.")),
  review('bevlorin', 'bevlorin-champions-vigor', 'trait', represented(['bevlorin-champions-vigor-right-damage', 'bevlorin-champions-vigor-vanguard'], 'The Vanguard trait provides one generic Damage Dealt relationship to a damaging Right Flank recipient; self Recovery and Initiative remain self-only.')),
  review('bevlorin', 'bevlorin-fire-ward', 'habit', generalOnly('Fire Ward remains named defensive support and never becomes offensive Fire support.')),
  review('bevlorin', 'bevlorin-dragons-fury', 'habit', selfOnly('The Physical and Fire increases apply only to Bevlorin.')),
  review('bevlorin', 'bevlorin-renewal', 'habit', represented(['bevlorin-renewal-recovery'], "The Command augmentation creates one Strength-enhanced full-formation Recovery path while self relationships remain suppressed.")),
  review('bevlorin', 'bevlorin-vital-essence', 'habit', selfOnly('The Strength and Recovery Dealt increases apply only to Bevlorin.')),
  review('bevlorin', 'bevlorin-bountiful-gifts', 'habit', represented(['bevlorin-bountiful-gifts-strength', 'bevlorin-bountiful-gifts-intelligence', 'bevlorin-bountiful-gifts-instinct', 'bevlorin-bountiful-gifts-initiative'], 'Four independent highest-stat selectors allow self, require unique known maxima, and create no self relationship.')),

  review('shadowrend', 'shadowrend-eclipse-fervor', 'command', represented(['shadowrend-eclipse-fervor-physical', 'shadowrend-eclipse-fervor-panic', 'shadowrend-eclipse-fervor-tactical', 'shadowrend-strength-payoff'], 'The base Command provides Strength-based Physical Damage and one named Panic path whose recurring damage establishes Tactical output without a Control alias.')),
  review('shadowrend', 'shadowrend-warriors-zeal', 'trait', represented(['shadowrend-warriors-zeal-left-stats', 'shadowrend-warriors-zeal-vanguard'], "The Vanguard trait supports Left Flank Instinct and Initiative; Shadowrend's non-Basic Physical increase is self-only.")),
  review('shadowrend', 'shadowrend-midnight-aura', 'habit', represented(['shadowrend-midnight-aura-strength', 'shadowrend-midnight-aura-instinct', 'shadowrend-initiative-payoff'], 'The full-formation Strength and Instinct support is explicitly limited to rounds 7–10 and exposes its Initiative scaling without self-synergy.')),
  review('shadowrend', 'shadowrend-nimble-resilience', 'habit', selfOnly('Damage Received reduction and Initiative apply only to Shadowrend.')),
  review('shadowrend', 'shadowrend-fueled-by-darkness', 'habit', represented(['shadowrend-fueled-by-darkness-advantage'], 'Advantage remains visible through an unresolved two-of-three selector that scores no guessed recipient and creates no utilization penalty.')),
  review('shadowrend', 'shadowrend-midnight-mastery', 'habit', represented(['shadowrend-midnight-mastery-physical', 'shadowrend-midnight-mastery-tactical'], 'Physical and Tactical full-formation support is represented once per type and explicitly limited to rounds 7–10.')),
  review('shadowrend', 'shadowrend-event-horizon', 'habit', represented(['shadowrend-event-horizon-physical', 'shadowrend-event-horizon-tactical', 'shadowrend-instinct-payoff'], 'The augmentation adds one direct Physical and one direct Instinct-based Tactical path at 10 Stars while preserving the base Round 9 attack.')),

  review('thunderstrike', 'thunderstrike-tail-whip', 'command', represented(['thunderstrike-tail-whip-physical', 'thunderstrike-strength-payoff'], 'The base Command provides odd-round Strength-based Physical Damage; same-lane enemy targeting creates no ally placement rule.')),
  review('thunderstrike', 'thunderstrike-warriors-zeal', 'trait', represented(['thunderstrike-warriors-zeal-left-stats', 'thunderstrike-warriors-zeal-vanguard'], "The Vanguard trait supports Left Flank Instinct and Initiative; Thunderstrike's non-Basic Physical increase is self-only.")),
  review('thunderstrike', 'thunderstrike-battle-rush', 'habit', noCross('Self Initiative and direct enemy Instinct reduction remain detailed and non-scoring.')),
  review('thunderstrike', 'thunderstrike-dragons-might', 'habit', selfOnly('The non-Basic Physical increase applies only to Thunderstrike.')),
  review('thunderstrike', 'thunderstrike-barbed-lash', 'habit', represented(['thunderstrike-barbed-lash-physical', 'thunderstrike-barbed-lash-bleed'], 'The Command augmentation adds one even-round Physical output and one specifically named Bleed provider at 6 Stars.')),
  review('thunderstrike', 'thunderstrike-armor-break', 'habit', represented(['thunderstrike-armor-break-physical'], 'Direct Physical Damage Received amplification provides broad Physical support without becoming Vulnerable or creating an ally placement rule.')),
  review('thunderstrike', 'thunderstrike-staggering-assault', 'habit', represented(['thunderstrike-staggering-assault-stagger', 'thunderstrike-staggering-assault-advantage-payoff'], 'The Habit provides one specifically named Stagger output that satisfies Control through aliasing and one self-recipient Advantage duration payoff.')),

  review('vesper', 'vesper-eventide-strike', 'command', represented(['vesper-eventide-strike-tactical', 'vesper-eventide-strike-slow', 'vesper-instinct-payoff', 'vesper-tactical-payoff'], 'The Command preserves independent Tactical and specifically named Slow paths; Slow does not satisfy Control.')),
  review('vesper', 'vesper-sentinels-wit', 'trait', represented(['vesper-sentinels-wit-left-stats', 'vesper-sentinels-wit-vanguard'], 'The Vanguard trait supports the same Left Flank ally with Instinct and Initiative while self Tactical amplification remains self-only.')),
  review('vesper', 'vesper-strategic-leader', 'habit', represented(['vesper-strategic-leader-tactical'], 'The self-eligible Vanguard-priority selector supports Vanguard from a flank and produces no self relationship when Vesper is Vanguard.')),
  review('vesper', 'vesper-dragons-insight', 'habit', selfOnly('Damage Received reduction and Instinct increase apply only to Vesper.')),
  review('vesper', 'vesper-saviors-waltz', 'habit', represented(['vesper-saviors-waltz-resistance'], 'One shared activation grants Resistance to self and one adjacent other ally; Vanguard selection remains unresolved and non-scoring.')),
  review('vesper', 'vesper-insightful-allies', 'habit', represented(['vesper-insightful-allies-instinct'], 'The full-formation Instinct effect supports both teammates while suppressing self relationships.')),
  review('vesper', 'vesper-midnight-onslaught', 'habit', represented(['vesper-midnight-onslaught-confusion'], 'The standalone Habit provides one specifically named Confusion path that satisfies Control once.')),

  review('nyrena', 'nyrena-undermine', 'command', represented(['nyrena-undermine-fire', 'nyrena-undermine-tactical', 'nyrena-intelligence-payoff', 'nyrena-instinct-payoff', 'nyrena-fire-payoff', 'nyrena-tactical-payoff'], 'Fire and Tactical outputs remain distinct; enemy Physical Damage Dealt suppression and its Burn duration condition are detailed and non-scoring.')),
  review('nyrena', 'nyrena-champions-brilliance', 'trait', represented(['nyrena-champions-brilliance-right-defense', 'nyrena-champions-brilliance-vanguard'], 'The Vanguard trait presents non-scoring Right Flank defense while all stat increases remain self-only.')),
  review('nyrena', 'nyrena-battle-dread', 'habit', noCross('Paired battlefield enemy Strength and Initiative suppression is detailed and non-scoring.')),
  review('nyrena', 'nyrena-mindful-synergy', 'habit', represented(['nyrena-mindful-synergy-stats', 'nyrena-initiative-payoff'], 'The same full-formation recipient group receives Intelligence and Instinct support; Initiative scaling is exposed once.')),
  review('nyrena', 'nyrena-deepen-the-breach', 'habit', represented(['nyrena-deepen-the-breach-fire'], 'Timed rounds 6-10 Fire support reaches one adjacent other ally; self Fire and post-combat Tile Damage remain non-scoring.')),
  review('nyrena', 'nyrena-dragons-ire', 'habit', selfOnly('Tactical and Fire Damage increases apply only to Nyrena.')),
  review('nyrena', 'nyrena-the-long-siege', 'habit', represented(['nyrena-the-long-siege-physical-defense'], 'Timed Physical Damage Received reduction is presented as non-scoring defense and never as offensive Physical support.')),

  review('dawnseeker', 'dawnseeker-radiant-wings', 'command', represented(['dawnseeker-radiant-wings-tactical', 'dawnseeker-radiant-wings-recovery', 'dawnseeker-instinct-payoff', 'dawnseeker-initiative-payoff', 'dawnseeker-tactical-payoff'], 'The Command preserves Tactical Damage and two-of-adjacent Recovery; self stat buffs remain self-only.')),
  review('dawnseeker', 'dawnseeker-sentinels-presence', 'trait', represented(['dawnseeker-sentinels-presence-left-fire', 'dawnseeker-sentinels-presence-vanguard'], 'The Vanguard trait supports Left Flank Fire Damage while self Recovery and Instinct remain self-only.')),
  review('dawnseeker', 'dawnseeker-tactical-inferno', 'habit', represented(['dawnseeker-tactical-inferno-tactical', 'dawnseeker-tactical-inferno-fire'], 'Independent self-eligible Left and Right priority selectors retain typed rounds 1-3 support and suppress self relationships.')),
  review('dawnseeker', 'dawnseeker-unbroken-devotion', 'habit', represented(['dawnseeker-unbroken-devotion-recovery-received'], 'Recovery Received support is presented distinctly from Recovery application and remains non-scoring.')),
  review('dawnseeker', 'dawnseeker-sunbreak', 'habit', reinforces(['dawnseeker-radiant-wings-tactical', 'dawnseeker-radiant-wings-recovery'], 'The Command augmentation replaces existing Round 1/2 rates without inventing Round 1 Recovery or duplicate outputs.')),
  review('dawnseeker', 'dawnseeker-winds-favor', 'habit', represented(['dawnseeker-winds-favor-initiative'], 'Full-formation Initiative support reaches both teammates without self-synergy.')),
  review('dawnseeker', 'dawnseeker-first-light', 'habit', represented(['dawnseeker-first-light-stats', 'dawnseeker-first-light-first-strike'], 'Paired Intelligence and Instinct share one group, while one shared activation grants specifically named First-Strike to both other allies without Control aliasing.')),

  review('moondancer', 'moondancer-crescent-blade', 'command', represented(['moondancer-crescent-blade-physical', 'moondancer-rising-tide-self', 'moondancer-crescent-blade-trigger-payoff', 'moondancer-strength-payoff', 'moondancer-physical-payoff'], 'The Command preserves one other Sentinel recipient, qualifying Tactical-or-Recovery trigger evidence, the 50% Rising Tide roll, stack defense, and even-round Strength-based Physical output.')),
  review('moondancer', 'moondancer-warriors-zeal', 'trait', represented(['moondancer-warriors-zeal-self-physical', 'moondancer-warriors-zeal-left-stats', 'moondancer-warriors-zeal-vanguard'], 'The Vanguard trait preserves self Physical amplification and exact Left Flank Instinct and Initiative support.')),
  review('moondancer', 'moondancer-new-moon', 'habit', represented(['moondancer-new-moon-instinct', 'moondancer-new-moon-tactical', 'moondancer-advantage-rising-tide-payoff', 'moondancer-new-moon-initiative-payoff'], 'New Moon preserves one independently selected other Sentinel, progression-aware support, a 4+ stack magnitude modifier, the Advantage probability uplift, and its explicit Initiative-enhanced Instinct support.')),
  review('moondancer', 'moondancer-reactive-instincts', 'habit', represented(['moondancer-reactive-instincts-instinct', 'moondancer-reactive-instincts-initiative'], 'One grouped highest-Instinct selector governs both deterministic start-of-combat stat effects and preserves unresolved ties.')),
  review('moondancer', 'moondancer-full-moon', 'habit', reinforces(['moondancer-crescent-blade-physical', 'moondancer-advantage-rising-tide-payoff'], 'Full Moon augments the Command rate and contributes the second progression-aware Advantage uplift while least-troops and 4+ stack conditions remain explicit.')),
  review('moondancer', 'moondancer-blood-moon', 'habit', represented(['moondancer-blood-moon-bleed'], 'Blood Moon exposes Bleed while retaining conditional Physical amplification, 6+ stack chance uplift, two-target adjacency, duration, and unresolved roll scope.')),
  review('moondancer', 'moondancer-eclipsing-strike', 'habit', represented(['moondancer-eclipsing-strike-damage-down', 'moondancer-eclipsing-strike-initiative-down', 'moondancer-eclipsing-strike-initiative-payoff'], 'Eclipsing Strike preserves one shared activation, fixed enemy reductions, highest-troop targeting, unresolved ties, and the explicit Initiative enhancement dependency.')),

  review(
    'tessarion',
    'tessarion-cobalt-flame',
    'command',
    represented(
      ['tessarion-cobalt-flame-fire', 'tessarion-cobalt-flame-physical'],
      'Cobalt Flame deals Intelligence-based Fire Damage and Strength-based Physical Damage; the Damage Dealt reduction remains descriptive enemy mitigation.',
    ),
  ),
  review(
    'tessarion',
    'tessarion-champions-brilliance',
    'trait',
    represented(
      ['tessarion-champions-brilliance-vanguard'],
      "The trait requires Vanguard; its self stat increases are self-only and its Right Flank Damage Received reduction is general support only.",
    ),
  ),
  review(
    'tessarion',
    'tessarion-sharpened-beauty',
    'habit',
    reinforces(
      ['tessarion-cobalt-flame-fire', 'tessarion-cobalt-flame-physical'],
      "The self Physical and Fire Damage increases reinforce Tessarion's existing output without adding Advantage or Troop Capacity as simple tags.",
    ),
  ),
  review(
    'tessarion',
    'tessarion-blazing-leader',
    'habit',
    represented(['tessarion-blazing-leader-fire'], 'The habit provides formation-wide Fire Damage support; Left Flank is only a priority, not a hard recipient requirement.'),
  ),
  review(
    'tessarion',
    'tessarion-molten-armor',
    'habit',
    reinforces(
      ['tessarion-cobalt-flame-fire'],
      "The Fire boost reinforces Tessarion's Fire output; allied Physical defense is general support only and the Panic clause is self-conditional.",
    ),
  ),
  review(
    'tessarion',
    'tessarion-clever-maneuver',
    'habit',
    represented(['tessarion-clever-maneuver-stats'], 'The habit provides high-level Intelligence and Initiative support without modeling highest-Intelligence target selection.'),
  ),
  review(
    'tessarion',
    'tessarion-the-blue-queen',
    'habit',
    reinforces(
      ['tessarion-blazing-leader-fire'],
      'The Fire-ally support reinforces Blazing Leader as Tessarion primary Fire support; the defensive and Troop Capacity clauses remain descriptive.',
    ),
  ),
] as const satisfies readonly AbilitySynergyReview[];
