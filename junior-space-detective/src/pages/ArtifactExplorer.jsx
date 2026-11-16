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
import { GHOST_MISSIONS, getGhostMediaForArtifact } from "../data/ghostRoversMedia.js";

const DEFAULT_FILTERS = { search: "", destination: "all", difficulty: "all" };

/**
 * Browsable artifact library with visual Radar Sector Map, search, filters,
 * and a full detail dossier with voice transmissions.
 */
export function ArtifactExplorer({ exploredArtifactIds = [], onExplore, onNavigate }) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState(null);
  const [radarSector, setRadarSector] = useState("Moon");

  const exploredSet = useMemo(
    () => new Set(exploredArtifactIds),
    [exploredArtifactIds],
  );

  const allArtifacts = useMemo(() => getAllArtifacts(), []);
  const counts = useMemo(() => getDestinationCounts(), []);
  const results = useMemo(() => getArtifacts(filters), [filters]);
  const artifact = selectedId ? getArtifactById(selectedId) : null;

  function openArtifact(id) {
    setSelectedId(id);
    if (typeof onExplore === "function") onExplore(id);
    if (typeof window !== "undefined") window.scrollTo?.({ top: 0, behavior: "smooth" });
  }

  // Match the 6 featured Ghost Rovers voice beacons to Donovan's 25-artifact dataset
  const sectorBeacons = useMemo(() => {
    return GHOST_MISSIONS.filter((m) => m.destination === radarSector)
      .map((mission) => {
        const matchedArtifact = allArtifacts.find(
          (art) => getGhostMediaForArtifact(art)?.key === mission.key
        );
        return matchedArtifact ? { mission, artifact: matchedArtifact } : null;
      })
      .filter(Boolean);
  }, [radarSector, allArtifacts]);

  const bgImage =
    radarSector === "Moon"
      ? "/images/moon-bg.png"
      : radarSector === "Mars"
      ? "/images/mars-bg.png"
      : "/images/deepspace-bg.png";

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
          <p className="eyebrow">Ghost Rovers • Archive access</p>
          <h1>Artifact Explorer</h1>
          <p className="lede">
            {allArtifacts.length} mission files covering equipment left on the
            Moon, on Mars and in deep space. Tune into a glowing voice beacon or open
            any mission dossier below.
          </p>
        </div>
        <span className="pill">
          <span aria-hidden="true">🧭</span>
          <strong>{exploredSet.size}</strong> explored
        </span>
      </div>

      {/* Interactive Planetary Voice Beacon Radar */}
      <section
        className="card"
        aria-label="Interactive Planetary Radar"
        style={{
          marginBottom: "1.5rem",
          backgroundImage: `linear-gradient(rgba(6, 9, 22, 0.72), rgba(6, 9, 22, 0.84)), url('${bgImage}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="row spread" style={{ flexWrap: "wrap", gap: "0.75rem", marginBottom: "0.75rem" }}>
          <strong>📡 Live Voice Beacon Radar — Select Sector:</strong>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {["Moon", "Mars", "Deep Space"].map((sector) => (
              <button
                key={sector}
                type="button"
                className={`btn btn-sm ${radarSector === sector ? "" : "btn-ghost"}`}
                onClick={() => setRadarSector(sector)}
              >
                {sector === "Moon" ? "🌕 Moon" : sector === "Mars" ? "🔴 Mars" : "✨ Deep Space"}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            position: "relative",
            minHeight: "160px",
            border: "1px dashed rgba(255,255,255,0.25)",
            borderRadius: "12px",
            padding: "1rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {sectorBeacons.map(({ mission, artifact: targetArt }) => (
            <button
              key={mission.key}
              type="button"
              className="btn btn-sm"
              onClick={() => openArtifact(targetArt.id)}
            >
              🎙️ {targetArt.name} ({mission.frequencyMhz} MHz)
            </button>
          ))}
        </div>
      </section>

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