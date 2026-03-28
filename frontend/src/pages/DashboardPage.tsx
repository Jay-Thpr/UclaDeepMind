import { Link } from 'react-router-dom'
import { PixelAvatar } from '../components/PixelAvatar'
import './Page.css'

export function DashboardPage() {
  return (
    <div className="page">
      <h1 className="page__title page__title--sm">Quest board</h1>
      <p className="page__lead">
        Progress, Calendar hooks, and Doc links will land here. For now, your
        skill hero previews by level.
      </p>
      <div className="dashboard-grid">
        <section className="panel">
          <h2 className="panel__title">Active skill</h2>
          <PixelAvatar skillLabel="Knife skills" level={2} />
          <div className="xp-bar" aria-hidden>
            <div className="xp-bar__fill" style={{ width: '42%' }} />
          </div>
          <p className="panel__meta">XP to next outfit: 420 / 1000</p>
        </section>
        <section className="panel">
          <h2 className="panel__title">Next session</h2>
          <p className="panel__body">
            Calendar integration pending. You’ll see proposed practice times
            after each coaching round.
          </p>
          <Link to="/session" className="btn btn--primary">
            Start live session
          </Link>
        </section>
      </div>
    </div>
  )
}
