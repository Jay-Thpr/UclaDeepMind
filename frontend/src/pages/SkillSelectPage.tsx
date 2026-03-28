import { useEffect, useMemo, useState } from 'react'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Link, useNavigate } from 'react-router-dom'
import {
  Camera,
  ChefHat,
  Code,
  Dumbbell,
  Music,
  Palette,
  Plus,
} from 'lucide-react'
import { Character } from '../components/Character'
import './Page.css'

const DND_TYPE = 'character' as const

const SKILL_TYPES = {
  COOKING: 'cooking',
  BASKETBALL: 'basketball',
  MUSIC: 'music',
  ART: 'art',
  CODING: 'coding',
  PHOTOGRAPHY: 'photography',
  MORE: 'more',
} as const

type SlotColor = 'primary' | 'secondary' | 'accent' | 'muted'

type IconName =
  | 'chef'
  | 'dumbbell'
  | 'music'
  | 'palette'
  | 'code'
  | 'camera'
  | 'plus'

function SlotIcon({ name, size }: { name: IconName; size: number }) {
  const p = {
    size,
    strokeWidth: 2,
    className: 'skill-select__lucide',
  } as const
  switch (name) {
    case 'chef':
      return <ChefHat {...p} />
    case 'dumbbell':
      return <Dumbbell {...p} />
    case 'music':
      return <Music {...p} />
    case 'palette':
      return <Palette {...p} />
    case 'code':
      return <Code {...p} />
    case 'camera':
      return <Camera {...p} />
    case 'plus':
      return <Plus {...p} />
    default:
      return <ChefHat {...p} />
  }
}

interface SkillSlot {
  id: string
  type: string
  label: string
  icon: IconName
  position: { x: number; y: number }
  color: SlotColor
  popularity: number
}

const ALL_SKILL_SLOTS: SkillSlot[] = [
  {
    id: 'cooking',
    type: SKILL_TYPES.COOKING,
    label: 'Cooking',
    icon: 'chef',
    position: { x: -120, y: -80 },
    color: 'primary',
    popularity: 95,
  },
  {
    id: 'basketball',
    type: SKILL_TYPES.BASKETBALL,
    label: 'Movement',
    icon: 'dumbbell',
    position: { x: 120, y: -80 },
    color: 'secondary',
    popularity: 90,
  },
  {
    id: 'music',
    type: SKILL_TYPES.MUSIC,
    label: 'Music',
    icon: 'music',
    position: { x: -160, y: 40 },
    color: 'accent',
    popularity: 85,
  },
  {
    id: 'art',
    type: SKILL_TYPES.ART,
    label: 'Art',
    icon: 'palette',
    position: { x: 160, y: 40 },
    color: 'primary',
    popularity: 80,
  },
  {
    id: 'coding',
    type: SKILL_TYPES.CODING,
    label: 'Logic',
    icon: 'code',
    position: { x: -120, y: 140 },
    color: 'secondary',
    popularity: 75,
  },
  {
    id: 'photography',
    type: SKILL_TYPES.PHOTOGRAPHY,
    label: 'Photography',
    icon: 'camera',
    position: { x: 120, y: 140 },
    color: 'accent',
    popularity: 70,
  },
  {
    id: 'more',
    type: SKILL_TYPES.MORE,
    label: 'More',
    icon: 'plus',
    position: { x: 0, y: 200 },
    color: 'muted',
    popularity: 100,
  },
]

const MAX_SKILLS = 7

function DraggableCharacter({
  onDrag,
  isOverSlot,
}: {
  onDrag: (v: boolean) => void
  isOverSlot: string | null
}) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: DND_TYPE,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }))

  useEffect(() => {
    onDrag(isDragging)
  }, [isDragging, onDrag])

  return (
    <div
      ref={(node) => {
        drag(node)
      }}
      className={`skill-select__bear${isDragging ? ' skill-select__bear--dragging' : ''}${
        isOverSlot ? ' skill-select__bear--over' : ''
      }`}
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
      }}
      aria-label="Drag the bear onto a skill"
    >
      <Character size="large" />
    </div>
  )
}

function SkillSlotComponent({
  slot,
  onDrop,
  onHover,
  isSelected,
  circleSize,
  iconSize,
}: {
  slot: SkillSlot
  onDrop: (skillId: string) => void
  onHover: (skillId: string | null) => void
  isSelected: boolean
  circleSize: number
  iconSize: number
}) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: DND_TYPE,
    drop: () => onDrop(slot.id),
    hover: () => onHover(slot.id),
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
    }),
  }))

  const hot = isOver || isSelected

  return (
    <div
      ref={(node) => {
        drop(node)
      }}
      className={`skill-select__slot${hot ? ' skill-select__slot--hot' : ''}`}
      style={{
        left: `calc(50% + ${slot.position.x}px)`,
        top: `calc(50% + ${slot.position.y}px)`,
      }}
    >
      <div
        className={`skill-select__disc skill-select__disc--${slot.color}${
          hot ? ' skill-select__disc--ring' : ''
        }`}
        style={{
          width: circleSize,
          height: circleSize,
        }}
      >
        <span className="skill-select__icon-wrap">
          <SlotIcon name={slot.icon} size={iconSize} />
        </span>
      </div>
      <div
        className="skill-select__slot-label"
        style={{
          fontSize: circleSize > 80 ? '1rem' : '0.875rem',
        }}
      >
        {slot.label}
      </div>
    </div>
  )
}

function ArenaHoverClear({ onClear }: { onClear: () => void }) {
  const [, drop] = useDrop(() => ({
    accept: DND_TYPE,
    hover: () => onClear(),
  }))
  return (
    <div
      ref={(node) => {
        drop(node)
      }}
      className="skill-select__arena-clear"
      aria-hidden
    />
  )
}

export function SkillSelectPage() {
  const navigate = useNavigate()
  const [isDragging, setIsDragging] = useState(false)
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null)
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const { displayedSkills, circleSize, iconSize } = useMemo(() => {
    const sorted = [...ALL_SKILL_SLOTS].sort((a, b) => b.popularity - a.popularity)
    const skillsToShow = sorted.slice(0, MAX_SKILLS)
    const n = skillsToShow.length
    let size = 96
    let iconPx = 32
    if (n <= 4) {
      size = 96
      iconPx = 32
    } else if (n <= 6) {
      size = 80
      iconPx = 28
    } else if (n <= 8) {
      size = 72
      iconPx = 24
    } else {
      size = 64
      iconPx = 20
    }
    return { displayedSkills: skillsToShow, circleSize: size, iconSize: iconPx }
  }, [])

  const handleDrop = (skillId: string) => {
    setHoveredSlot(null)
    if (skillId === 'more') {
      navigate('/onboarding', { state: { createSkill: true } })
      return
    }
    setSelectedSkill(skillId)
    setShowConfirm(true)
  }

  const handleConfirm = () => {
    if (!selectedSkill) return
    navigate('/dashboard')
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="page skill-select">
        <div className="skill-select__glow" aria-hidden />

        <div className="skill-select__header">
          <h1 className="skill-select__title">What would you like to practice?</h1>
          <p className="skill-select__subtitle">
            {selectedSkill
              ? 'Tap to confirm your choice'
              : 'Drag your character to a focus area'}
          </p>
        </div>

        <div className="skill-select__arena-wrap">
          <div className="skill-select__arena">
            <ArenaHoverClear onClear={() => setHoveredSlot(null)} />

            {displayedSkills.map((slot) => (
              <SkillSlotComponent
                key={slot.id}
                slot={slot}
                onDrop={handleDrop}
                onHover={(id) => setHoveredSlot(id)}
                isSelected={selectedSkill === slot.id}
                circleSize={circleSize}
                iconSize={iconSize}
              />
            ))}

            <DraggableCharacter onDrag={setIsDragging} isOverSlot={hoveredSlot} />

            {showConfirm && selectedSkill ? (
              <div className="skill-select__confirm-scrim">
                <div
                  className="skill-select__confirm-card"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="skill-confirm-title"
                >
                  <p id="skill-confirm-title" className="skill-select__confirm-text">
                    Focus on{' '}
                    <span className="skill-select__confirm-accent">
                      {displayedSkills.find((s) => s.id === selectedSkill)?.label}
                    </span>
                    ?
                  </p>
                  <button
                    type="button"
                    className="btn btn--primary btn--lg skill-select__confirm-btn"
                    onClick={handleConfirm}
                  >
                    Begin journey
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {isDragging && !hoveredSlot ? (
          <div className="skill-select__hint">
            <p className="skill-select__hint-text">Gently place on a focus area</p>
          </div>
        ) : null}

        <div className="skill-select__footer">
          <Link to="/" className="skill-select__home-link">
            Back home
          </Link>
        </div>
      </div>
    </DndProvider>
  )
}
