import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './Page.css'

const levels = ['Beginner', 'Intermediate', 'Advanced'] as const

export function OnboardingPage() {
  const location = useLocation()
  const fromPickMore = Boolean(
    (location.state as { createSkill?: boolean } | null)?.createSkill,
  )
  const [skill, setSkill] = useState(fromPickMore ? '' : 'Knife skills')
  const [goal, setGoal] = useState('Dice vegetables evenly and safely')
  const [level, setLevel] = useState<(typeof levels)[number]>('Beginner')

  return (
    <div className="page page--onboarding">
      <form
        className="form-card"
        onSubmit={(e) => {
          e.preventDefault()
        }}
      >
        <div className="text-center" style={{ marginBottom: '0.25rem' }}>
          <h1 className="page__title page__title--sm" style={{ marginBottom: '0.35rem' }}>
            {fromPickMore ? 'Create your skill' : 'Set your quest'}
          </h1>
          <p className="page__lead" style={{ margin: '0 auto', maxWidth: '28rem' }}>
            {fromPickMore
              ? 'Name your skill and what you want to achieve. We will use this to tune coaching in upcoming milestones.'
              : 'Tell us what you are building toward. We will use this to tune coaching in upcoming milestones.'}
          </p>
        </div>
        <label className="field">
          <span className="field__label">Skill</span>
          <input
            className="field__input"
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            placeholder="e.g. Guitar, Python, Basketball"
          />
        </label>
        <label className="field">
          <span className="field__label">Goal for next sessions</span>
          <textarea
            className="field__input field__input--area"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={3}
          />
        </label>
        <fieldset className="field">
          <legend className="field__label">Starting level</legend>
          <div className="chip-row">
            {levels.map((l) => (
              <button
                key={l}
                type="button"
                className={`chip ${level === l ? 'chip--active' : ''}`}
                onClick={() => setLevel(l)}
              >
                {l}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="page__actions">
          <button type="submit" className="btn btn--primary">
            Generate plan (soon)
          </button>
          <Link to="/dashboard" className="btn btn--ghost">
            Skip to board
          </Link>
        </div>
      </form>
    </div>
  )
}
