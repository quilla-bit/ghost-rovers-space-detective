/**
 * Application shell: sticky mission-control header, main landmark, footer and
 * the badge-unlock toast stack.
 */

const NAV_ITEMS = [
  { id: "home", label: "Mission Control" },
  { id: "explorer", label: "Artifact Explorer" },
  { id: "quiz", label: "Detective Quiz" },
  { id: "decoder", label: "Decoder" },
  { id: "profile", label: "Explorer Profile" },
];

export function Layout({
  view,
  onNavigate,
  totalScore = 0,
  badgeCount = 0,
  toasts = [],
  children,
}) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <header className="site-header">
        <div className="container header-inner">
          <button
            type="button"
            className="brand"
            onClick={() => onNavigate("home")}
            aria-label="Junior Space Detective, go to Mission Control"
          >
            <span className="brand-mark" aria-hidden="true">
              🛰️
            </span>
            <span className="brand-text">
              <strong>Junior Space Detective</strong>
              <span>NASA Space Apps</span>
            </span>
          </button>

          <nav className="main-nav" aria-label="Primary">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                className="nav-link"
                onClick={() => onNavigate(item.id)}
                aria-current={view === item.id ? "page" : undefined}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="header-stats" aria-label="Player summary">
            <span className="pill">
              <span aria-hidden="true">⭐</span>
              <span className="sr-only">Total score:</span>
              <strong>{totalScore}</strong>
              <span className="sr-only">points</span>
            </span>
            <span className="pill">
              <span aria-hidden="true">🎖️</span>
              <span className="sr-only">Badges unlocked:</span>
              <strong>{badgeCount}</strong>
              <span className="sr-only">badges</span>
            </span>
          </div>
        </div>
      </header>

      <main id="main-content" className="container" tabIndex={-1}>
        {children}
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <span>
            An educational game about NASA hardware left on the Moon, Mars and in
            deep space. Built for the NASA Space Apps Challenge.
          </span>
          <span>
            Progress is stored in this browser only. Simulated decoder messages are
            fictional puzzles, not real mission transmissions.
          </span>
        </div>
      </footer>

      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div className="toast" key={toast.id}>
            <strong>{toast.title}</strong>
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Layout;
