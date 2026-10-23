import type { ReactNode } from 'react'
import { platform } from '../../platform'
import { BackIcon } from '../icons'

interface Props {
  title: ReactNode
  subtitle?: ReactNode
  /** Своя кнопка «назад» — только на сайте: в Telegram есть системная (см. useBack) */
  onBack?: () => void
  backLabel?: string
  right?: ReactNode
}

export function TopBar({ title, subtitle, onBack, backLabel = 'Назад', right }: Props) {
  return (
    <header className="topbar">
      {onBack && !platform.nativeBack ? (
        <button type="button" className="icon-btn" onClick={onBack} aria-label={backLabel}>
          <BackIcon />
        </button>
      ) : null}
      <div className="topbar-title">
        {subtitle ? <small>{subtitle}</small> : null}
        <h1>{title}</h1>
      </div>
      {right}
    </header>
  )
}
