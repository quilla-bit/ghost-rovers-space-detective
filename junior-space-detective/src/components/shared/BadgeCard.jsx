import ProgressBar from "./ProgressBar.jsx";

/** Icon identifiers from badges.json mapped to accessible glyphs. */
const ICONS = {
  boots: "🥾",
  moon: "🌕",
  mars: "🔴",
  telescope: "🔭",
  brain: "🧠",
  key: "🗝️",
  lock_open: "🔓",
  book: "📖",
  trophy: "🏆",
  star: "⭐",
};

const RARITY_LABELS = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  legendary: "Legendary",
};

/**
 * One achievement, showing requirement progress and unlock state.
 */
export function BadgeCard({ badge, unlocked, current, target, percent }) {
  return (
    <article
      className={`badge-card ${unlocked ? "is-unlocked" : "is-locked"}`}
      aria-label={`${badge.name}, ${unlocked ? "unlocked" : "locked"}`}
    >
      <div className="badge-head">
        <span className="badge-icon" aria-hidden="true">
          {ICONS[badge.icon] || "🎖️"}
        </span>
        <div>
          <div className="badge-name">{badge.name}</div>
          <div className="dim">
            {RARITY_LABELS[badge.rarity] || badge.rarity} · +{badge.points} pts
          </div>
        </div>
      </div>

      <p className="badge-desc">{badge.description}</p>

      {unlocked ? (
        <span className="chip chip-success">Unlocked</span>
      ) : (
        <ProgressBar
          value={current ?? 0}
          max={target ?? 1}
          label="Requirement progress"
          showValue
        />
      )}

      <div className="badge-meta">
        <span>{badge.category}</span>
        <span aria-hidden="true">{unlocked ? "Complete" : `${percent ?? 0}%`}</span>
      </div>
    </article>
  );
}

export default BadgeCard;
