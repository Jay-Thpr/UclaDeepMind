import './Page.css'

export function SessionPage() {
  return (
    <div className="page">
      <h1 className="page__title page__title--sm">Live coaching</h1>
      <p className="page__lead">
        Gemini Live + camera preview + annotated frames will mount here.
      </p>
      <div className="session-placeholder">
        <div className="session-placeholder__frame">
          <span className="session-placeholder__label">Camera preview</span>
        </div>
        <div className="session-placeholder__sidebar">
          <p className="panel__body">
            Session timer, tiered interventions, and tool traces will appear
            beside the feed.
          </p>
          <button type="button" className="btn btn--ghost" disabled>
            End session (stub)
          </button>
        </div>
      </div>
    </div>
  )
}
