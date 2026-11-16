import { useMemo, useState } from "react";
import ArtifactCard from "../components/artifacts/ArtifactCard.jsx";
import ArtifactDetail from "../components/artifacts/ArtifactDetail.jsx";
import ArtifactFilters from "../components/artifacts/ArtifactFilters.jsx";
import {
  getAllArtifacts,
  getArtifactById,
  getArtifacts,
  getDestinationCounts,
  getQuestionsForArtifact,
  getRelatedArtifacts,
} from "../services/artifactService.js";

const DEFAULT_FILTERS = { search: "", destination: "all", difficulty: "all" };

/**
 * Browsable artifact library with search, filters and a full detail dossier.
 * Opening a dossier records "explored" progress, once per artifact.
 */
export function ArtifactExplorer({ exploredArtifactIds = [], onExplore, onNavigate }) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState(null);

  // Reflect the central progress record so markers update immediately.
  const exploredSet = useMemo(
    () => new Set(exploredArtifactIds),
    [exploredArtifactIds],
  );

  const counts = useMemo(() => getDestinationCounts(), []);
  const results = useMemo(() => getArtifacts(filters), [filters]);
  const artifact = selectedId ? getArtifactById(selectedId) : null;

  function openArtifact(id) {
    setSelectedId(id);
    if (typeof onExplore === "function") onExplore(id);
    if (typeof window !== "undefined") window.scrollTo?.({ top: 0, behavior: "smooth" });
  }

  if (artifact) {
    return (
      <ArtifactDetail
        artifact={artifact}
        explored={exploredSet.has(artifact.id)}
        questionCount={getQuestionsForArtifact(artifact.id).length}
        related={getRelatedArtifacts(artifact.id)}
        onBack={() => setSelectedId(null)}
        onOpenRelated={openArtifact}
        onStartQuiz={() => onNavigate("quiz")}
      />
    );
  }

  return (
    <>
      <div className="section-head">
        <div>
          <p className="eyebrow">Archive access</p>
          <h1>Artifact Explorer</h1>
          <p className="lede">
            {getAllArtifacts().length} mission files covering equipment left on the
            Moon, on Mars and in deep space. Open a file to log it in your explorer
            record.
          </p>
        </div>
        <span className="pill">
          <span aria-hidden="true">🧭</span>
          <strong>{exploredSet.size}</strong> explored
        </span>
      </div>

      <ArtifactFilters
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(DEFAULT_FILTERS)}
        resultCount={results.length}
        counts={counts}
      />

      {results.length === 0 ? (
        <div className="card">
          <h2>No artifacts match those filters</h2>
          <p className="muted">
            Try a different destination, a wider difficulty, or a search term such as
            &ldquo;rover&rdquo; or &ldquo;Apollo&rdquo;.
          </p>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setFilters(DEFAULT_FILTERS)}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-3">
          {results.map((item) => (
            <ArtifactCard
              key={item.id}
              artifact={item}
              explored={exploredSet.has(item.id)}
              onOpen={openArtifact}
            />
          ))}
        </div>
      )}
    </>
  );
}

export default ArtifactExplorer;
