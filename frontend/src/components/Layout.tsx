import { Link, Outlet } from 'react-router-dom'
import './Layout.css'

const nav = [
  { to: '/', label: 'Home' },
  { to: '/onboarding', label: 'Goals' },
  { to: '/dashboard', label: 'Quest board' },
  { to: '/session', label: 'Live coach' },
]

export function Layout() {
  return (
    <div className="layout">
      <header className="layout__header">
        <Link to="/" className="layout__brand">
          Skill Quest
        </Link>
        <nav className="layout__nav" aria-label="Main">
          {nav.map(({ to, label }) => (
            <Link key={to} to={to} className="layout__link">
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="layout__main">
        <Outlet />
      </main>
    </div>
  )
}
