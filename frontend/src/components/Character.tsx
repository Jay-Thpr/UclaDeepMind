type CharacterProps = {
  size?: 'small' | 'medium' | 'large'
  className?: string
}

const SIZE_PX = { small: 64, medium: 128, large: 192 } as const

/**
 * Pixel bear from Figma Make (same asset as select-skill screen).
 */
export function Character({ size = 'medium', className = '' }: CharacterProps) {
  const px = SIZE_PX[size]
  return (
    <div
      className={`character ${className}`.trim()}
      style={{ width: px, height: px }}
    >
      <img
        src="/bear-character.png"
        alt=""
        className="character__img"
        width={px}
        height={px}
        draggable={false}
      />
      <div className="character__shadow" aria-hidden />
    </div>
  )
}
