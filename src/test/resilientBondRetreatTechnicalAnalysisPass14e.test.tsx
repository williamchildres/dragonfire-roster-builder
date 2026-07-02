import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../app/App';
import { dragons } from '../data/dragons';
import type { FormationAnalysisInput, SynergyTrace } from '../models/synergy';
import { analyzeFormationTraces, createSynergyAuditExport, technicalAnalysisTraceIdentity } from '../services/synergyTrace';
import { createEmptyRoster, ROSTER_SCHEMA_VERSION, STORAGE_KEY } from '../services/rosterStorage';

const formation = {
  'left-flank': 'shadowsong',
  vanguard: 'feskar',
  'right-flank': 'vaeldra',
} as const satisfies FormationAnalysisInput;

function pass14Roster() {
  const roster = createEmptyRoster(dragons);
  for (const dragonId of ['shadowsong', 'feskar', 'vaeldra']) {
    const entry = roster[dragonId]!;
    entry.owned = true;
    entry.collection.state = 'hatched';
    entry.starRank = 10;
    entry.reignLevel = 26;
  }
  return roster;
}

function currentTraces(): SynergyTrace[] {
  return analyzeFormationTraces(formation, dragons, {
    roster: pass14Roster(),
    dragonLevels: { shadowsong: 26, feskar: 26, vaeldra: 26 },
  });
}

function exportTraces() {
  const traces = currentTraces();
  const exportData = createSynergyAuditExport(formation, traces, pass14Roster());
  return exportData.traces;
}

function countOccurrences(text: string, phrase: string): number {
  return (text.match(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length;
}

async function renderFormation() {
  const user = userEvent.setup();
  const roster = pass14Roster();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
    format: 'dragonfire-roster-lab-local',
    schemaVersion: ROSTER_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    roster: Object.values(roster),
  }));
  render(<App />);
  await user.click(screen.getAllByRole('button', { name: /formation builder/i })[0]!);
  await user.click(screen.getByLabelText(/include unowned dragons/i));
  const selectors = screen.getAllByLabelText('Dragon');
  await user.selectOptions(selectors[0]!, 'shadowsong');
  await user.selectOptions(selectors[1]!, 'feskar');
  await user.selectOptions(selectors[2]!, 'vaeldra');
  await user.click(screen.getByLabelText(/show analysis details/i));
  await user.click(screen.getByLabelText(/include inactive\/potential traces/i));
  return user;
}

describe('Resilient Bond retreat technical-analysis pass 14E', () => {
  it('renders the retreat trace with the conditional lead and a single exact-result reason', async () => {
    const traces = exportTraces();
    const retreatTraces = traces.filter((trace) => trace.id.includes('resilient-bond-self-retreat-stack'));
    expect(retreatTraces).toHaveLength(1);
    expect(retreatTraces[0]!.status).toBe('potential');
    expect(retreatTraces[0]!.modifier?.sourceEffectId).toBe('resilient-bond-self-retreat-stack');
    expect(retreatTraces[0]!.exactResultUnknownReason).toBe('Exact final mitigated damage cannot be calculated because the tracked ally identity, whether that ally retreated during the previous round, maximum or final stack count, stack-combination behavior, and the final mitigation formula remain unresolved.');

    await renderFormation();
    const retreatNode = screen.getAllByText('Source effect ID: resilient-bond-self-retreat-stack.').find((node) => node.closest('article.trace-card'));
    const retreatArticle = retreatNode?.closest('article.trace-card');
    expect(retreatArticle).toBeDefined();
    const text = retreatArticle!.textContent ?? '';

    expect(text).toContain("Each round, Resilient Bond checks whether the ally selected at Start of Combat retreated during the previous round. If so, Feskar gains 1 additional Resilient Bond stack. Each verified stack reduces non-Basic Physical Damage Received by 6.5%, and the resulting stack lasts until end of combat.");
    expect(text).not.toContain("Feskar's Resilient Bond can reduce Feskar's Physical Damage Received by 6.5%.");
    expect(text).toContain('Exact final mitigated damage cannot be calculated because the tracked ally identity, whether that ally retreated during the previous round, maximum or final stack count, stack-combination behavior, and the final mitigation formula remain unresolved.');
    expect(countOccurrences(text, 'Exact final mitigated damage cannot be calculated because the tracked ally identity, whether that ally retreated during the previous round, maximum or final stack count, stack-combination behavior, and the final mitigation formula remain unresolved.')).toBe(1);
    expect(text).not.toMatch(/Activation success|modifier uptime|support uptime/i);
    expect(text).toContain('Grants 1 additional Resilient Bond stack.');
    expect(text).toContain('The same adjacent ally selected at start of combat retreated in the previous round.');
    expect(text).toContain('resilient-bond-retreat-reference');

    const initialNode = screen.getAllByText('Source effect ID: resilient-bond-self-stack.').find((node) => node.closest('article.trace-card'));
    const selectedNode = screen.getAllByText('Source effect ID: resilient-bond-adjacent-stack.').find((node) => node.closest('article.trace-card'));
    const initialArticle = initialNode?.closest('article.trace-card');
    const selectedArticle = selectedNode?.closest('article.trace-card');
    expect(initialArticle?.textContent ?? '').toContain('Grants 1 Resilient Bond stack.');
    expect(initialArticle?.textContent ?? '').not.toContain('Grants 1 additional Resilient Bond stack.');
    expect(selectedArticle?.textContent ?? '').toContain('At Start of combat, exactly one eligible adjacent ally is selected; the selected ally identity is unresolved.');

    expect(new Set(traces.map(technicalAnalysisTraceIdentity)).size).toBe(57);
    expect(traces).toHaveLength(57);
  }, 10000);
});
