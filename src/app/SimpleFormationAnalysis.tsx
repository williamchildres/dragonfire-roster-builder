import type { Dragon } from '../models/dragon';
import { positionLabels, type Formation } from '../services/teamShare';
import type { FormationRatingResult } from '../services/formationRating';
import type { SimpleFormationPresentation } from '../synergy/formationPresentation';
import type { SimpleSynergyResult } from '../synergy/types';

export function SimpleFormationAnalysis({
  presentation,
  dragons,
  formation,
  rating,
}: {
  presentation: SimpleFormationPresentation;
  dragons: Dragon[];
  formation: Formation;
  rating: FormationRatingResult;
}) {
  const selectedCount = presentation.selectedDragonIds.length;
  const hasActiveSynergy = presentation.activeSynergies.length > 0;

  return (
    <section className="panel simple-formation-analysis" aria-labelledby="simple-formation-analysis-title">
      <h3 id="simple-formation-analysis-title">Formation Analysis</h3>
      <FormationSummary formation={formation} dragons={dragons} />
      <CoverageSummary presentation={presentation} dragons={dragons} />
      <FormationRatingPanel rating={rating} />
      {selectedCount < 2 ? (
        <p className="empty-card-note">Select at least two dragons to review formation synergies.</p>
      ) : (
        <>
          {!hasActiveSynergy ? (
            <p className="empty-card-note">No active curated relationship is mapped for this formation yet.</p>
          ) : null}
          <ResultSection title="Strong synergies" results={presentation.activeSynergies} />
          {!presentation.hasCompleteProfileCoverage ? <IncompleteMissingEnablerNotice /> : null}
          <ResultSection title="Missing enablers" results={presentation.missingEnablers} />
          <ResultSection title="Placement issues" results={presentation.placementIssues} />
          <ResultSection title="Position conflicts" results={presentation.positionConflicts} />
          <ResultSection title="Future unlocks" results={presentation.futureUnlocks} />
        </>
      )}
      <p className="notice-text">
        Formation adjacency is linear: Left Flank and Right Flank are adjacent only to Vanguard.
      </p>
    </section>
  );
}

function FormationRatingPanel({ rating }: { rating: FormationRatingResult }) {
  return (
    <section className="formation-rating-panel" aria-labelledby="formation-rating-title">
      <div className="formation-rating-header">
        <div>
          <p className="eyebrow">Mapped signal score</p>
          <h4 id="formation-rating-title">Formation Rating</h4>
        </div>
        <div className="formation-rating-score" aria-label={`Formation rating ${rating.score} out of 100, ${rating.tier}`}>
          <span className="formation-rating-value">{rating.score}</span>
          <span className="formation-rating-max">/ 100</span>
          <span className="formation-rating-tier">{rating.tier}</span>
        </div>
      </div>
      <p className="formation-rating-summary">{rating.summary}</p>
      <div className="formation-rating-breakdown" aria-label="Formation rating breakdown">
        {rating.breakdown.map((item) => (
          <div className="formation-rating-breakdown-row" key={item.label}>
            <div className="formation-rating-breakdown-copy">
              <span>{item.label}</span>
              <small>{item.explanation}</small>
            </div>
            <strong>
              {item.score} / {item.max}
            </strong>
          </div>
        ))}
      </div>
      <div className="formation-rating-lists">
        <RatingList title="Strengths" items={rating.strengths} fallback="No active mapped strength yet." />
        <RatingList title="Weaknesses / opportunities" items={rating.weaknesses} fallback="No mapped weakness found." />
      </div>
      {rating.notes.map((note) => (
        <p className="formation-rating-note" key={note}>
          {note}
        </p>
      ))}
    </section>
  );
}

function RatingList({ title, items, fallback }: { title: string; items: string[]; fallback: string }) {
  return (
    <div>
      <h5>{title}</h5>
      {items.length > 0 ? (
        <ul className="plain-list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="empty-card-note">{fallback}</p>
      )}
    </div>
  );
}

function IncompleteMissingEnablerNotice() {
  return (
    <section className="simple-result-section" aria-labelledby="simple-incomplete-missing-enablers">
      <h4 id="simple-incomplete-missing-enablers">Missing enablers</h4>
      <p className="notice-text">Missing-enabler checks are incomplete until all selected dragons have curated profiles.</p>
    </section>
  );
}

function FormationSummary({ formation, dragons }: { formation: Formation; dragons: Dragon[] }) {
  return (
    <div className="simple-analysis-summary">
      {Object.entries(formation).map(([position, dragonId]) => {
        const dragon = dragons.find((candidate) => candidate.id === dragonId);
        return (
          <p key={position}>
            <strong>{positionLabels[position as keyof Formation]}:</strong> {dragon?.name ?? 'Empty'}
          </p>
        );
      })}
    </div>
  );
}

function CoverageSummary({
  presentation,
  dragons,
}: {
  presentation: SimpleFormationPresentation;
  dragons: Dragon[];
}) {
  const selectedCount = presentation.selectedDragonIds.length;
  const unmappedNames = presentation.unmappedDragonIds.map((dragonId) => dragonName(dragonId, dragons));

  if (selectedCount === 0) {
    return <p className="notice-text">No dragons selected.</p>;
  }

  return (
    <div className="coverage-summary">
      <p>
        Curated profiles are available for {presentation.mappedDragonIds.length} of the {selectedCount} selected dragons.
      </p>
      {unmappedNames.length > 0 ? (
        <p>Synergy data not yet mapped: {unmappedNames.join(', ')}.</p>
      ) : null}
    </div>
  );
}

function ResultSection({ title, results }: { title: string; results: SimpleSynergyResult[] }) {
  if (results.length === 0) {
    return null;
  }

  return (
    <section className="simple-result-section" aria-labelledby={`simple-${title.toLowerCase().replaceAll(' ', '-')}`}>
      <h4 id={`simple-${title.toLowerCase().replaceAll(' ', '-')}`}>{title}</h4>
      <ul className="plain-list">
        {results.map((result) => (
          <li key={result.id}>{result.explanation}</li>
        ))}
      </ul>
    </section>
  );
}

function dragonName(dragonId: string, dragons: Dragon[]) {
  return dragons.find((dragon) => dragon.id === dragonId)?.name ?? dragonId;
}
