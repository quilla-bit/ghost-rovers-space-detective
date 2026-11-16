const CLASS_BY_DESTINATION = {
  Moon: "chip chip-moon",
  Mars: "chip chip-mars",
  "Deep Space": "chip chip-deep-space",
};

const GLYPH_BY_DESTINATION = {
  Moon: "🌕",
  Mars: "🔴",
  "Deep Space": "🌌",
};

/**
 * Destination label with a per-destination visual treatment.
 */
export function DestinationChip({ destination }) {
  return (
    <span className={CLASS_BY_DESTINATION[destination] || "chip"}>
      <span aria-hidden="true">{GLYPH_BY_DESTINATION[destination] || "🛰️"}</span>
      {destination}
    </span>
  );
}

export default DestinationChip;
