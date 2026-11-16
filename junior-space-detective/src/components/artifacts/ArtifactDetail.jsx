import DestinationChip from "../shared/DestinationChip.jsx";
import {
  DIFFICULTY_LABELS,
  STATUS_LABELS,
} from "../../utils/constants.js";

/**
 * Full artifact dossier: mission context, scientific results, sources and
 * related hardware.
 */
export function ArtifactDetail({
  artifact,
  explored,
  questionCount = 0,
  related = [],
  onBack,
  onOpenRelated,
  onStartQuiz,
}) {
  return (
    <article>
      <button type="button" className="btn btn-ghost btn-sm detail-back" onClick={onBack}>
        <span aria-hidden="true">←</span> Back to all artifacts
      </button>

      <header className="detail-hero">
        <div className="row spread">
          <DestinationChip destination={artifact.destination} />
          {explored ? (
            <span className="chip chip-success">
              <span aria-hidden="true">✓</span> Recorded in your log
            </span>
          ) : null}
        </div>
        <h1>{artifact.name}</h1>
        <p className="lede">{artifact.educationalSummary}</p>

        <dl className="meta-grid">
          <div className="meta-item">
            <dt>Mission</dt>
            <dd>{artifact.mission}</dd>
          </div>
          <div className="meta-item">
            <dt>Agency</dt>
            <dd>{artifact.agency}</dd>
          </div>
          <div className="meta-item">
            <dt>Deployed / launched</dt>
            <dd>{artifact.deploymentDate}</dd>
          </div>
          <div className="meta-item">
            <dt>Status</dt>
            <dd>{STATUS_LABELS[artifact.status] || artifact.status}</dd>
          </div>
          <div className="meta-item">
            <dt>Difficulty</dt>
            <dd>{DIFFICULTY_LABELS[artifact.difficulty] || artifact.difficulty}</dd>
          </div>
          <div className="meta-item">
            <dt>Category</dt>
            <dd>{artifact.category}</dd>
          </div>
        </dl>
      </header>

      <div className="grid grid-2">
        <section className="card" aria-labelledby="location-heading">
          <h2 id="location-heading">Where is it now?</h2>
          <p className="muted">{artifact.locationDescription}</p>
          <h3 className="mt-2">Communication status</h3>
          <p className="muted">{artifact.communicationStatus}</p>
        </section>

        <section className="card" aria-labelledby="significance-heading">
          <h2 id="significance-heading">Why it matters</h2>
          <p className="muted">{artifact.historicalSignificance}</p>
        </section>

        <section className="card" aria-labelledby="objectives-heading">
          <h2 id="objectives-heading">Mission objectives</h2>
          <ul className="fact-list">
            {artifact.missionObjective.map((objective) => (
              <li key={objective}>{objective}</li>
            ))}
          </ul>
        </section>

        <section className="card" aria-labelledby="discoveries-heading">
          <h2 id="discoveries-heading">Scientific results</h2>
          <ul className="fact-list">
            {artifact.scientificDiscoveries.map((discovery) => (
              <li key={discovery}>{discovery}</li>
            ))}
          </ul>
        </section>

        <section className="card" aria-labelledby="facts-heading">
          <h2 id="facts-heading">Detective notes</h2>
          <ul className="fact-list">
            {artifact.funFacts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </section>

        <section className="card" aria-labelledby="sources-heading">
          <h2 id="sources-heading">NASA sources</h2>
          <p className="dim">
            Source links open NASA pages and need an internet connection.
          </p>
          <ul className="source-list">
            {artifact.sources.map((source) => (
              <li key={source.url}>
                <a href={source.url} target="_blank" rel="noreferrer noopener">
                  {source.title}
                  <span aria-hidden="true">↗</span>
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
                <span className="dim"> — {source.publisher}</span>
              </li>
            ))}
          </ul>
          {questionCount > 0 ? (
            <p className="dim mt-2">
              {questionCount} quiz question{questionCount === 1 ? "" : "s"} cover this
              artifact.
            </p>
          ) : null}
          {typeof onStartQuiz === "function" ? (
            <button type="button" className="btn btn-sm mt-2" onClick={onStartQuiz}>
Take the detective quiz
            </button>
          ) : null}
        </section>
      </div>

      {related.length > 0 ? (
        <section className="section mt-3" aria-labelledby="related-heading">
          <div className="section-head">
            <h2 id="related-heading">Related hardware</h2>
          </div>
          <div className="grid grid-3">
            {related.map((item) => (
              <button
                key={item.id}
                type="button"
                className="card artifact-card"
                onClick={() => onOpenRelated(item.id)}
              >
                <DestinationChip destination={item.destination} />
                <span className="artifact-title">{item.name}</span>
                <span className="artifact-mission">{item.mission}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}

export default ArtifactDetail;
