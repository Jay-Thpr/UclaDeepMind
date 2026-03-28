import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Character } from '../components/Character'
import './Page.css'

type LevelUpState = {
  durationSec?: number
  skillLabel?: string
}

const MOCK_SUMMARY =
  'You stayed in frame for most of the drill, kept a steady pace on the cuts, and responded quickly when the coach asked you to adjust your grip. Next time we can tighten the rhythm on the backhand slice.'

/** Served from `public/level_up_jingle.mp3` → URL `/level_up_jingle.mp3` */
const LEVEL_UP_JINGLE_SRC = '/level_up_jingle.mp3'

export function LevelUpPage() {
  const location = useLocation()
  const state = (location.state ?? {}) as LevelUpState
  const durationSec = state.durationSec ?? 0
  const skillLabel = state.skillLabel ?? 'Knife skills'

  const [notes, setNotes] = useState('')

  useEffect(() => {
    const el = new Audio(LEVEL_UP_JINGLE_SRC)
    el.volume = 0.5
    void el.play().catch(() => {
      // Autoplay can be blocked without a recent user gesture on some browsers.
    })
    return () => {
      el.pause()
      el.src = ''
    }
  }, [])

  const prevLevel = 2
  const nextLevel = 3
  const newItemLabel = 'Chef’s pan'

  const durationLabel =
    durationSec > 0
      ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`
      : '—'

  return (
    <div className="page level-up page--flush">
      <div className="level-up__hero">
        <div className="level-up__badge-row">
          <Sparkles className="level-up__sparkle" aria-hidden />
          <span className="level-up__kicker">Session complete</span>
        </div>
        <h1 className="level-up__title">Level up!</h1>
        <p className="level-up__subtitle">
          You reached <strong>level {nextLevel}</strong> in {skillLabel}. Here’s your hero with a new gear unlock.
        </p>
      </div>

      <div className="level-up__compare" aria-label="Avatar before and after level up">
        <div className="level-up__column">
          <span className="level-up__column-label">Your hero now</span>
          <div className="level-up__avatar-card">
            <Character size="large" />
            <span className="level-up__lvl-pill">Lv. {prevLevel}</span>
          </div>
        </div>

        <div className="level-up__arrow-wrap" aria-hidden>
          <ArrowRight className="level-up__arrow" strokeWidth={2.5} />
        </div>

        <div className="level-up__column level-up__column--next">
          <span className="level-up__column-label level-up__column-label--new">After unlock</span>
          <div className="level-up__avatar-card level-up__avatar-card--glow">
            <div className="level-up__avatar-with-item">
              <Character size="large" />
              <div className="level-up__new-item" title={`New: ${newItemLabel}`}>
                <span className="level-up__new-item-emoji" aria-hidden>
                  🍳
                </span>
                <span className="level-up__new-item-caption">New</span>
              </div>
            </div>
            <span className="level-up__lvl-pill level-up__lvl-pill--up">Lv. {nextLevel}</span>
          </div>
          <p className="level-up__unlock-name">{newItemLabel}</p>
        </div>
      </div>

      <section className="level-up__section" aria-labelledby="session-summary-heading">
        <h2 id="session-summary-heading" className="level-up__section-title">
          Session recap
        </h2>
        <p className="level-up__summary">
          <span className="level-up__meta">Practice time: {durationLabel}</span>
          <span className="level-up__meta-sep" aria-hidden>
            ·
          </span>
          <span className="level-up__meta">Focus: {skillLabel}</span>
        </p>
        <p className="level-up__description">{MOCK_SUMMARY}</p>
      </section>

      <section className="level-up__section" aria-labelledby="feedback-heading">
        <h2 id="feedback-heading" className="level-up__section-title">
          Your notes
        </h2>
        <p className="level-up__hint">
          How did this session feel? (Mock — not saved yet.)
        </p>
        <textarea
          id="session-notes"
          className="level-up__notes"
          rows={4}
          placeholder="What went well? What should we drill next time?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          aria-label="Session feedback"
        />
      </section>

      <div className="level-up__actions">
        <Link to="/dashboard" className="btn btn--primary btn--lg">
          Back to journey
        </Link>
        <Link to="/session" className="btn btn--ghost">
          Another session
        </Link>
      </div>
    </div>
  )
}
