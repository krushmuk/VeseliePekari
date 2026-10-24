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
      <path d="M10.3 4.6L10.6 2.1L13.4 2.1L13.7 4.6L16.0 5.6L18.0 4.0L20.0 6.0L18.4 8.0L19.4 10.3L21.9 10.6L21.9 13.4L19.4 13.7L18.4 16.0L20.0 18.0L18.0 20.0L16.0 18.4L13.7 19.4L13.4 21.9L10.6 21.9L10.3 19.4L8.0 18.4L6.0 20.0L4.0 18.0L5.6 16.0L4.6 13.7L2.1 13.4L2.1 10.6L4.6 10.3L5.6 8.0L4.0 6.0L6.0 4.0L8.0 5.6z" />
      <circle cx="12" cy="12" r="3" />
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

export const RestartIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="M4 12a8 8 0 1 0 2.6-5.9M4 4v4.5h4.5" />
  </Svg>
)

/** Стрелка выхода: наружу из рамки, влево */
export const ExitIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="M10 4H5v16h5M9 12h11M16 8l4 4-4 4" transform="matrix(-1 0 0 1 24 0)" />
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
