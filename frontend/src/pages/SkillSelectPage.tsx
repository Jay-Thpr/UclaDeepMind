import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Page.css'

const SKILLS = [
  { id: 'cooking', label: 'Cooking', emoji: '🍳' },
  { id: 'movement', label: 'Movement', emoji: '🏀' },
  { id: 'music', label: 'Music', emoji: '🎵' },
  { id: 'art', label: 'Art', emoji: '🎨' },
  { id: 'logic', label: 'Logic', emoji: '💻' },
  { id: 'photo', label: 'Photography', emoji: '📷' },
  { id: 'more', label: 'More', emoji: '➕' },
] as const

export function SkillSelectPage() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<string | null>(null)

  const handleBegin = () => {
    if (!selected) return
    if (selected === 'more') navigate('/onboarding')
    else navigate('/dashboard')
  }

  return (
    <div className="page skill-select">
      <div className="skill-select__glow" aria-hidden />
      <div className="skill-select__intro">
        <h1 className="page__title" style={{ textAlign: 'center' }}>
          What would you like to practice?
        </h1>
        <p className="page__lead" style={{ margin: '0.5rem auto 0', textAlign: 'center' }}>
          {selected
            ? 'Lock in your focus, then begin.'
            : 'Tap a focus area to highlight it, then continue.'}
        </p>
      </div>
      <div className="skill-select__grid">
        {SKILLS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`skill-select__tile${selected === s.id ? ' skill-select__tile--active' : ''}`}
            onClick={() => setSelected(s.id)}
          >
            <span className="skill-select__emoji">{s.emoji}</span>
            {s.label}
          </button>
        ))}
      </div>
      <div className="skill-select__actions">
        <button
          type="button"
          className="btn btn--primary btn--lg"
          disabled={!selected}
          onClick={handleBegin}
        >
          Begin journey
        </button>
        <Link to="/" className="btn btn--ghost">
          Back home
        </Link>
      </div>
    </div>
  )
}
