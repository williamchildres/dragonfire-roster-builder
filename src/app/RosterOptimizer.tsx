import { ChevronRight, CircleCheck, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dragon, DragonRarity, OwnedDragon } from '../models/dragon';
import {
  buildOptimizerRosterSnapshot,
  createRosterOptimizerFingerprint,
} from '../optimizer/rosterOptimizerCandidates';
import {
  RosterOptimizerClient,
  type RosterOptimizerRunner,
} from '../optimizer/rosterOptimizerClient';
import {
  RosterOptimizerCancelledError,
  type OptimizedFormation,
  type OptimizerRosterDragon,
  type RosterOptimizationResult,
} from '../optimizer/rosterOptimizerTypes';
import type { FormationArrangement } from '../services/formationPlacementComparison';

export function RosterOptimizer({
  allDragons,
  roster,
  runner: suppliedRunner,
  onOpenFormation,
  onOpenRoster,
}: {
  allDragons: Dragon[];
  roster: Record<string, OwnedDragon>;
  runner?: RosterOptimizerRunner;
  onOpenFormation: (arrangement: FormationArrangement) => void;
  onOpenRoster: () => void;
}) {
  const [ownedRunner] = useState<RosterOptimizerRunner | null>(() =>
    suppliedRunner ? null : new RosterOptimizerClient(),
  );
  const runner = suppliedRunner ?? ownedRunner!;
  const snapshot = useMemo(
    () => buildOptimizerRosterSnapshot(allDragons, roster),
    [allDragons, roster],
  );
  const fingerprint = useMemo(
    () => createRosterOptimizerFingerprint(snapshot),
    [snapshot],
  );
  const latestFingerprint = useRef(fingerprint);
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<RosterOptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eligibleCounts = rarityCounts(snapshot.map((dragon) => dragon.rarity));
  const isStale = Boolean(result && result.rosterFingerprint !== fingerprint);

  useEffect(() => () => {
    if (!suppliedRunner) ownedRunner?.dispose();
  }, [ownedRunner, suppliedRunner]);

  useEffect(() => {
    latestFingerprint.current = fingerprint;
  }, [fingerprint]);

  const run = async () => {
    const requestFingerprint = fingerprint;
    setStatus('running');
    setError(null);
    try {
      const response = await runner.run(roster);
      if (latestFingerprint.current !== requestFingerprint) {
        setStatus('idle');
        return;
      }
      if (!response.optimal) {
        setStatus('idle');
        return;
      }
      setResult(response);
      setStatus('success');
    } catch (runError) {
      if (runError instanceof RosterOptimizerCancelledError) {
        setStatus('idle');
        return;
      }
      setError(runError instanceof Error ? runError.message : 'Roster optimization failed.');
      setStatus('error');
    }
  };

  const cancel = () => {
    runner.cancel();
    setStatus('idle');
  };

  return (
    <section className="optimizer-workspace" aria-labelledby="optimizer-title">
      <header className="optimizer-header">
        <p className="eyebrow">Exact global allocation</p>
        <h2 id="optimizer-title">Roster Optimizer</h2>
        <p>Build the best complete set of 10 formations from your current roster. Each dragon can be used only once.</p>
      </header>

      <div className="optimizer-roster-summary" aria-label="Eligible roster summary">
        <Metric label="Eligible dragons" value={snapshot.length} />
        <Metric label="Required" value={30} />
        <Metric label="Legendary" value={eligibleCounts.Legendary} />
        <Metric label="Epic" value={eligibleCounts.Epic} />
        <Metric label="Rare" value={eligibleCounts.Rare} />
      </div>
      <p className="optimizer-policy-note">
        Recommendations use your owned dragons, current Star Ranks, and Dragon Levels. Habit Levels are preserved but do not change synergy ranking.
      </p>

      {snapshot.length < 30 ? (
        <div className="optimizer-unavailable" role="status">
          <p>You need {30 - snapshot.length} more eligible dragons to build 10 complete formations.</p>
          <button type="button" className="secondary-button" onClick={onOpenRoster}>
            Go to My Roster <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="optimizer-actions">
          <button
            type="button"
            className="primary-button"
            disabled={status === 'running'}
            onClick={() => void run()}
          >
            <Sparkles size={18} aria-hidden="true" />
            {result ? 'Run Again' : 'Find My Best 10 Formations'}
          </button>
          {status === 'running' ? (
            <button type="button" className="secondary-button" onClick={cancel}>
              <X size={17} aria-hidden="true" /> Cancel
            </button>
          ) : null}
        </div>
      )}

      <div className="sr-only" role="status" aria-live="polite">
        {status === 'running' ? 'Finding the exact best complete allocation.' : null}
        {status === 'success' ? 'Exact optimal roster allocation ready.' : null}
        {status === 'error' ? error : null}
      </div>
      {status === 'running' ? (
        <div className="optimizer-running" role="status">
          <span className="optimizer-spinner" aria-hidden="true" />
          <div>
            <strong>Finding the exact best complete allocation…</strong>
            <p>Evaluating every trio and proving the global result. No percentage is estimated.</p>
          </div>
        </div>
      ) : null}
      {error ? <div className="status-message error" role="alert">{error}</div> : null}
      {isStale ? (
        <div className="optimizer-stale" role="status">
          Your roster’s ranking-relevant progression changed. Run the optimizer again to refresh this result.
        </div>
      ) : null}
      {result ? (
        <OptimizerResultView
          result={result}
          allDragons={allDragons}
          snapshot={snapshot}
          stale={isStale}
          onOpenFormation={onOpenFormation}
        />
      ) : null}

      <details className="optimizer-methodology">
        <summary>How this was chosen</summary>
        <div>
          <p>The optimizer uses eligible dragons from My Roster and requires at least 30.</p>
          <ul>
            <li>Legendary inclusion is prioritized over Epic; Epic is prioritized over Rare.</li>
            <li>Every unique three-dragon combination and all six position assignments are evaluated.</li>
            <li>Exactly 10 formations are selected globally with no dragon reuse; this is not a greedy list.</li>
            <li>Formation Rating v2 is reused unchanged. Equal totals favor the stronger weakest formation and then the complete rating vector.</li>
            <li>Star Rank and Dragon Level unlocks are respected. Habit Levels are preserved but do not affect v1 ranking.</li>
            <li>No combat, damage, troop-capacity, or battle simulation is performed.</li>
          </ul>
        </div>
      </details>
    </section>
  );
}

function OptimizerResultView({
  result,
  allDragons,
  snapshot,
  stale,
  onOpenFormation,
}: {
  result: RosterOptimizationResult;
  allDragons: Dragon[];
  snapshot: OptimizerRosterDragon[];
  stale: boolean;
  onOpenFormation: (arrangement: FormationArrangement) => void;
}) {
  const dragonsById = new Map(allDragons.map((dragon) => [dragon.id, dragon]));
  const progressionById = new Map(snapshot.map((dragon) => [dragon.dragonId, dragon]));
  return (
    <div className={stale ? 'optimizer-result is-stale' : 'optimizer-result'}>
      <header className="optimizer-result-header">
        <div>
          <p className="eyebrow">Best complete 10-formation allocation</p>
          <h3>Exact optimal result</h3>
        </div>
        <span className="optimizer-optimal-badge"><CircleCheck size={17} aria-hidden="true" /> Proven optimal</span>
      </header>
      <div className="optimizer-result-metrics">
        <Metric label="Total Formation Rating" value={result.objective.totalRating} />
        <Metric label="Average" value={result.averageRating.toFixed(1)} />
        <Metric label="Lowest" value={result.minimumRating} />
        <Metric label="Dragons used" value={result.usedDragonIds.length} />
        <Metric label="Legendary used" value={result.usedRarityCounts.Legendary} />
        <Metric label="Epic used" value={result.usedRarityCounts.Epic} />
        <Metric label="Rare used" value={result.usedRarityCounts.Rare} />
      </div>
      <p className="optimizer-allocation-note">The optimizer chooses the strongest complete non-overlapping allocation, not the ten highest independent formations.</p>
      {result.unusedDragonIds.length > 0 ? (
        <div className="optimizer-unused">
          <h4>Unused eligible {result.unusedDragonIds.length === 1 ? 'dragon' : 'dragons'}</h4>
          <p>Not used in this optimal rarity-prioritized 10-formation allocation.</p>
          <ul>
            {result.unusedDragonIds.map((dragonId) => {
              const dragon = dragonsById.get(dragonId);
              const progression = progressionById.get(dragonId);
              return (
                <li key={dragonId}>
                  <strong>{dragon?.name ?? dragonId}</strong> · {dragon?.rarity ?? 'Unknown rarity'} · Star {progression?.starRank ?? '—'} · Level {progression?.dragonLevel ?? '—'}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      <div className="optimizer-formation-grid">
        {result.formations.map((formation) => (
          <OptimizerFormationCard
            key={formation.stableCandidateKey}
            formation={formation}
            dragonsById={dragonsById}
            disabled={stale}
            onOpen={() => onOpenFormation(formation.arrangement)}
          />
        ))}
      </div>
      <details className="optimizer-technical">
        <summary>Technical details</summary>
        <dl>
          <div><dt>Candidates considered</dt><dd>{result.diagnostics.candidateCount.toLocaleString()}</dd></div>
          <div><dt>Solver passes</dt><dd>{result.diagnostics.solverPasses ?? '—'}</dd></div>
          <div><dt>Nodes visited</dt><dd>{result.diagnostics.nodesVisited.toLocaleString()}</dd></div>
          <div><dt>Branches pruned</dt><dd>{result.diagnostics.branchesPruned.toLocaleString()}</dd></div>
          <div><dt>Candidate generation</dt><dd>{formatMs(result.diagnostics.candidateGenerationMs)}</dd></div>
          <div><dt>Exact solver</dt><dd>{formatMs(result.diagnostics.solverMs)}</dd></div>
          <div><dt>Total</dt><dd>{formatMs(result.diagnostics.totalMs)}</dd></div>
          <div><dt>Result hash</dt><dd><code>{result.optimizerResultHash}</code></dd></div>
        </dl>
      </details>
    </div>
  );
}

function OptimizerFormationCard({
  formation,
  dragonsById,
  disabled,
  onOpen,
}: {
  formation: OptimizedFormation;
  dragonsById: Map<string, Dragon>;
  disabled: boolean;
  onOpen: () => void;
}) {
  return (
    <article className="optimizer-formation-card" aria-labelledby={`optimizer-formation-${formation.rank}`}>
      <header>
        <div>
          <p className="eyebrow">Formation {formation.rank}</p>
          <h4 id={`optimizer-formation-${formation.rank}`}>{formation.rating} · {formation.tier}</h4>
        </div>
        <div className="optimizer-score-pills" aria-label="Formation score breakdown">
          <span>Synergy {formation.activeSynergyScore}/80</span>
          <span>Placement {formation.placementScore}/20</span>
        </div>
      </header>
      <dl className="optimizer-positions">
        {(['left-flank', 'vanguard', 'right-flank'] as const).map((position) => {
          const dragon = dragonsById.get(formation.arrangement[position]);
          return (
            <div key={position}>
              <dt>{position === 'left-flank' ? 'Left Flank' : position === 'right-flank' ? 'Right Flank' : 'Vanguard'}</dt>
              <dd><strong>{dragon?.name ?? formation.arrangement[position]}</strong><span>{dragon?.rarity}</span></dd>
            </div>
          );
        })}
      </dl>
      <p className="optimizer-relationship-count">{formation.activeRelationshipCount} active semantic {formation.activeRelationshipCount === 1 ? 'relationship' : 'relationships'}</p>
      {formation.strengths[0] ? <p className="optimizer-strength"><strong>Key strength:</strong> {formation.strengths[0].summary}</p> : null}
      {formation.gaps.length > 0 ? (
        <ul className="optimizer-gaps" aria-label="Important gaps">
          {formation.gaps.slice(0, 2).map((gap) => <li key={gap.id}>{gap.summary}</li>)}
        </ul>
      ) : null}
      {formation.tiedBestArrangements.length > 1 ? (
        <p className="optimizer-tie-note">{formation.tiedBestArrangements.length} position assignments tie for best; the stable first is shown.</p>
      ) : null}
      <details>
        <summary>Relationship details</summary>
        <ul>
          {formation.relationships.filter((relationship) => relationship.marginalValue > 0).map((relationship) => (
            <li key={relationship.id}>{relationship.summary}</li>
          ))}
        </ul>
      </details>
      <button type="button" className="secondary-button" disabled={disabled} onClick={onOpen}>
        Open in Formation Builder <ChevronRight size={16} aria-hidden="true" />
      </button>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function rarityCounts(rarities: DragonRarity[]) {
  return rarities.reduce(
    (counts, rarity) => ({ ...counts, [rarity]: counts[rarity] + 1 }),
    { Legendary: 0, Epic: 0, Rare: 0 },
  );
}

function formatMs(milliseconds: number): string {
  return `${(milliseconds / 1000).toFixed(2)}s`;
}
