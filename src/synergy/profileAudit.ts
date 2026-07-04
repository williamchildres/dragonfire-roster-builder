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

export const metadataOnlyDragonIds = [
  'solstryker',
  'antares',
  'shimmer',
  'jagadrix',
  'bevlorin',
  'shadowrend',
  'thunderstrike',
  'vesper',
  'arulix',
  'nyrena',
  'dawnseeker',
  'arrax',
] as const;

export const simpleSynergyAbilityReviews = [
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
      ['syrax-strategic-revival-recovery', 'syrax-strategic-revival-slow-payoff'],
      'The augmentation provides Recovery and explicitly improves that Recovery when any enemy has Slow.',
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
  review('seasmoke', 'seasmoke-loyal-bond', 'habit', generalOnly('Advantage and Resistance are broad survivability/damage effects without a current explicit payoff.')),

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
    represented(['kalspire-tactical-strike-tactical'], 'The command deals Instinct-based Tactical Damage; Bleed has no current explicit payoff.'),
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
  review('rhysarion', 'rhysarion-inspiring-melody', 'habit', represented(['rhysarion-inspiring-melody-initiative'], 'The habit gives adjacent Initiative support; Resistance is general support only.')),

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
] as const satisfies readonly AbilitySynergyReview[];
