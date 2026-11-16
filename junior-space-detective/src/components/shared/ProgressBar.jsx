/**
 * Accessible progress bar used for quiz progress and badge requirements.
 */
export function ProgressBar({ value, max = 100, label, showValue = true }) {
  const safeMax = Number(max) > 0 ? Number(max) : 100;
  const safeValue = Math.max(0, Math.min(Number(value) || 0, safeMax));
  const percent = Math.round((safeValue / safeMax) * 100);

  return (
    <div className="progress-block">
      {(label || showValue) && (
        <div className="progress-row">
          {label ? <span>{label}</span> : <span />}
          {showValue ? (
            <span aria-hidden="true">
              {safeValue} / {safeMax}
            </span>
          ) : null}
        </div>
      )}
      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={safeValue}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-label={label || undefined}
        aria-valuetext={`${percent}%`}
      >
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export default ProgressBar;
