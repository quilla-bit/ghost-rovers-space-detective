/**
 * Compact metric tile used on the dashboard and profile.
 */
export function StatCard({ label, value, hint }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {hint ? <div className="dim">{hint}</div> : null}
    </div>
  );
}

export default StatCard;
