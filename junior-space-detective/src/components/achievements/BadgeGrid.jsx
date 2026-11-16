import BadgeCard from "../shared/BadgeCard.jsx";

/**
 * Renders achievement cards for any badge set (unlocked, locked or all).
 */
export function BadgeGrid({ badges, emptyMessage = "No badges to show yet." }) {
  if (!badges || badges.length === 0) {
    return <p className="muted">{emptyMessage}</p>;
  }

  return (
    <div className="grid grid-3">
      {badges.map((badge) => (
        <BadgeCard key={badge.badgeId} badge={badge} {...badge} />
      ))}
    </div>
  );
}

export default BadgeGrid;
