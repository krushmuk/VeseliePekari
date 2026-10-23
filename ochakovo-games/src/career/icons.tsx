import type { ReactNode } from 'react'
import type { ChapterIconName } from './chapters'

// Простые плоские иконки на сетке 24×24: толстая линия, скругления, без мелких деталей

function Svg({ size = 24, children, fill = 'none' }: { size?: number; children: ReactNode; fill?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

const CHAPTER_ICONS: Record<ChapterIconName, ReactNode> = {
  truck: (
    <>
      <path d="M2 6h11v10H2zM13 9h4.5l3.5 3.5V16h-8" />
      <circle cx="6" cy="17.5" r="1.8" />
      <circle cx="17" cy="17.5" r="1.8" />
    </>
  ),
  bottle: <path d="M10 2.5h4V6l2.2 3.2V20.5a1 1 0 0 1-1 1H8.8a1 1 0 0 1-1-1V9.2L10 6zM7.8 13h8.4M7.8 17h8.4" />,
  flask: <path d="M9 2h6M10 2v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 8V2M7 15h10" />,
  lens: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5 21 21" />
    </>
  ),
  boxes: <path d="M3 12h8v9H3zM13 12h8v9h-8zM8 3h8v9H8z" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
    </>
  ),
}

export const ChapterIcon = ({ name, size }: { name: ChapterIconName; size?: number }) => (
  <Svg size={size}>{CHAPTER_ICONS[name]}</Svg>
)

export const StarIcon = ({ size, filled = true }: { size?: number; filled?: boolean }) => (
  <Svg size={size} fill={filled ? 'currentColor' : 'none'}>
    <path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z" />
  </Svg>
)

export const LockIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Svg>
)

export const BackIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="M15 5l-7 7 7 7" />
  </Svg>
)

export const PauseIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="M9 5v14M15 5v14" />
  </Svg>
)

export const CheckIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
)

/** Ряд из трёх звёзд: закрашено `count` */
export function Stars({ count, size = 16 }: { count: number; size?: number }) {
  return (
    <span className="stars" aria-label={`${count} из 3 звёзд`}>
      {[0, 1, 2].map(k => (
        <span key={k} className={k < count ? 'on' : 'off'}>
          <StarIcon size={size} filled={k < count} />
        </span>
      ))}
    </span>
  )
}
