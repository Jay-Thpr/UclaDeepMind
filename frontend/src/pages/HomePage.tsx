import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchHealth } from '../api/client'
import './Page.css'

export function HomePage() {
  const [apiStatus, setApiStatus] = useState<'checking' | 'ok' | 'error'>(
    'checking',
  )

  useEffect(() => {
    fetchHealth()
      .then(() => setApiStatus('ok'))
      .catch(() => setApiStatus('error'))
  }, [])

  return (
    <div className="page page--home">
      <p className="page__kicker">UCLA Glitch × DeepMind</p>
      <h1 className="page__title">Level up any skill</h1>
      <p className="page__lead">
        Research-backed coaching, live feedback, and a pixel hero that grows
        with you. Connect the API, pick a skill, then jump into a session.
      </p>
      <div className="page__actions">
        <Link to="/onboarding" className="btn btn--primary">
          Start your quest
        </Link>
        <Link to="/dashboard" className="btn btn--ghost">
          Quest board
        </Link>
      </div>
      <div
        className={`api-pill api-pill--${apiStatus}`}
        role="status"
        aria-live="polite"
      >
        API:{' '}
        {apiStatus === 'checking' && 'checking…'}
        {apiStatus === 'ok' && 'connected'}
        {apiStatus === 'error' && 'offline (run backend on :8000)'}
      </div>
    </div>
  )
}
