import { DESTINATIONS, DIFFICULTIES, DIFFICULTY_LABELS } from "../../utils/constants.js";

/**
 * Search and filter controls for the artifact explorer.
 * Controlled component: all state lives in the page.
 */
export function ArtifactFilters({
  filters,
  onChange,
  onReset,
  resultCount,
  counts = {},
}) {
  const update = (field) => (event) => onChange({ ...filters, [field]: event.target.value });

  return (
    <form
      className="filter-bar"
      role="search"
      onSubmit={(event) => event.preventDefault()}
      aria-label="Filter artifacts"
    >
      <div className="field" style={{ flex: "2 1 240px" }}>
        <label htmlFor="artifact-search">Search artifacts</label>
        <input
          id="artifact-search"
          type="search"
          placeholder="Try 'rover', 'Apollo', 'water ice'…"
          value={filters.search}
          onChange={update("search")}
        />
      </div>

      <div className="field">
        <label htmlFor="artifact-destination">Destination</label>
        <select
          id="artifact-destination"
          value={filters.destination}
          onChange={update("destination")}
        >
          <option value="all">All destinations ({counts.all ?? 0})</option>
          {DESTINATIONS.map((destination) => (
            <option key={destination} value={destination}>
              {destination} ({counts[destination] ?? 0})
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="artifact-difficulty">Difficulty</label>
        <select
          id="artifact-difficulty"
          value={filters.difficulty}
          onChange={update("difficulty")}
        >
          <option value="all">All levels</option>
          {DIFFICULTIES.map((difficulty) => (
            <option key={difficulty} value={difficulty}>
              {DIFFICULTY_LABELS[difficulty]}
            </option>
          ))}
        </select>
      </div>

      <div className="row" style={{ gap: "0.5rem" }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onReset}>
          Reset filters
        </button>
        <span className="dim" aria-live="polite">
          {resultCount} result{resultCount === 1 ? "" : "s"}
        </span>
      </div>
    </form>
  );
}

export default ArtifactFilters;
