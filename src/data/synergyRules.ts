import type { SynergyRule } from '../models/synergy';

export const defaultSynergyRules: SynergyRule[] = [
  {
    id: 'burn-enabler-payoff',
    kind: 'positive',
    title: 'Burn setup and payoff',
    description:
      'One dragon can apply BURN while another has verified effects that benefit from burning targets.',
    requiresTags: ['BURN', 'SINGLE_TARGET_DAMAGE'],
    evidenceStatus: 'community-verified',
  },
  {
    id: 'command-trigger-support',
    kind: 'positive',
    title: 'Command trigger support',
    description:
      'One dragon improves Command reliability while another has verified Command-trigger effects.',
    requiresTags: ['BUFF_INITIATIVE', 'ON_COMMAND_TRIGGER'],
    evidenceStatus: 'community-verified',
  },
  {
    id: 'shielded-ally-payoff',
    kind: 'positive',
    title: 'Shield protection package',
    description: 'One dragon can shield allies while another has verified effects that benefit from shields.',
    requiresTags: ['SHIELD', 'BUFF_STRENGTH'],
    evidenceStatus: 'community-verified',
  },
  {
    id: 'position-conflict-vanguard',
    kind: 'conflict',
    title: 'Vanguard position conflict',
    description: 'Multiple dragons require the same exclusive Vanguard position to unlock verified effects.',
    requiresTags: ['VANGUARD'],
    evidenceStatus: 'community-verified',
    nonStacking: true,
  },
  {
    id: 'duplicate-silence-package',
    kind: 'conflict',
    title: 'Non-stacking silence overlap',
    description: 'Two verified non-stacking SILENCE packages may duplicate one another.',
    requiresTags: ['SILENCE'],
    evidenceStatus: 'community-verified',
    nonStacking: true,
  },
];
