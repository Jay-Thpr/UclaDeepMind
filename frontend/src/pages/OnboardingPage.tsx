import { useState } from 'react'
import { Link } from 'react-router-dom'
import './Page.css'

const levels = ['Beginner', 'Intermediate', 'Advanced'] as const

export function OnboardingPage() {
  const [skill, setSkill] = useState('Knife skills')
  const [goal, setGoal] = useState('Dice vegetables evenly and safely')
  const [level, setLevel] = useState<(typeof levels)[number]>('Beginner')

  return (
    <div className="page">
      <h1 className="page__title page__title--sm">Set your quest</h1>
      <p className="page__lead">
        Stub form — wire to research + Docs in the next milestone.
      </p>
      <form
        className="form-card"
        onSubmit={(e) => {
          e.preventDefault()
        }}
      >
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
