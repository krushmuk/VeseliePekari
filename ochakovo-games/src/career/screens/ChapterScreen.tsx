import { useRef, useState, type CSSProperties } from 'react'
import { platform, useBack } from '../../platform'
import type { ChapterInfo } from '../chapters'
import { LockIcon, StarIcon, Stars } from '../icons'
import {
  chapterStars,
  isLevelOpen,
  levelStars,
  maxStars,
  useProgress,
} from '../progress'
import { ConveyorArt } from './ConveyorArt'
import { WarehouseArt } from './WarehouseArt'
import { TopBar } from './TopBar'

interface Props {
  chapter: ChapterInfo
  onBack: () => void
  onPlay: (levelIndex: number) => void
}

const LEAVE_MS = 180

/** Глава: шапка и список уровней */
export function ChapterScreen({ chapter, onBack, onPlay }: Props) {
  const progress = useProgress()
  const [leaving, setLeaving] = useState(false)
  const timer = useRef(0)
  // Выход: сначала проигрывается анимация, потом экран закрывается
  const leave = () => {
    if (timer.current) return
    setLeaving(true)
    timer.current = window.setTimeout(onBack, LEAVE_MS)
  }
  useBack(leave)

  const last = chapter.levels.length - 1

  return (
    <div className={`screen chapter-screen${leaving ? ' leaving' : ''}`} style={{ '--c': chapter.color } as CSSProperties}>
      <TopBar
        subtitle="Очаково"
        title={chapter.title}
        onBack={leave}
        backLabel="К карте"
        right={
          <span className="pill">
            <StarIcon size={16} /> {chapterStars(progress, chapter)}/{maxStars(chapter)}
          </span>
        }
      />

      {/* Картинка главы */}
      <div className="chapter-art" aria-hidden="true">
        {chapter.id === 'bottling' ? <ConveyorArt /> : null}
        {chapter.id === 'warehouse' ? <WarehouseArt /> : null}
      </div>

      <ol className="levels">
        {chapter.levels.map((level, k) => {
          const open = isLevelOpen(progress, chapter.id, k)
          const stars = levelStars(progress, chapter.id, k)
          const exam = k === last
          return (
            <li key={k} className={exam ? 'exam' : undefined} style={{ '--i': k } as CSSProperties}>
              <button
                type="button"
                className={`level-tile${open ? '' : ' locked'}${stars ? ' passed' : ''}`}
                disabled={!open}
                onClick={() => {
                  platform.haptic('tap')
                  onPlay(k)
                }}
              >
                <span className="level-num">{open ? (exam ? 'Экзамен' : k + 1) : <LockIcon size={22} />}</span>
                <span className="level-title">{level.title}</span>
                {open ? <Stars count={stars} size={15} /> : null}
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
