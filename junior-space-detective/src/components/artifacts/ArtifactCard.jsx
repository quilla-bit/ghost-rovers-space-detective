import DestinationChip from "../shared/DestinationChip.jsx";
import { DIFFICULTY_LABELS, STATUS_LABELS } from "../../utils/constants.js";

/**
 * Summary card in the artifact grid.
 */
export function ArtifactCard({ artifact, explored = false, onOpen }) {
  return (
    <button
      type="button"
      className="card artifact-card"
      onClick={() => onOpen(artifact.id)}
      aria-label={`Open artifact file: ${artifact.name}${
        explored ? " (already explored)" : ""
      }`}
    >
      <div className="row spread">
        <DestinationChip destination={artifact.destination} />
        {explored ? (
          <span className="chip chip-success">
            <span aria-hidden="true">✓</span> Explored
          </span>
        ) : null}
      </div>

      <h3 className="artifact-title">{artifact.name}</h3>
      <span className="artifact-mission">
        {artifact.mission} · {artifact.category}
      </span>
      <p className="artifact-summary">{artifact.educationalSummary}</p>

      <div className="card-tags">
        <span className="chip">{DIFFICULTY_LABELS[artifact.difficulty] || artifact.difficulty}</span>
        <span className="chip">{STATUS_LABELS[artifact.status] || artifact.status}</span>
      </div>
    </button>
  );
}

export default ArtifactCard;
