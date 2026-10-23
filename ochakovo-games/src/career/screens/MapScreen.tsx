import type { CSSProperties } from 'react'
import { platform, useBack } from '../../platform'
import { CHAPTERS } from '../chapters'
import { ChapterIcon, CheckIcon, LockIcon, StarIcon } from '../icons'
import {
  chapterStars,
  isChapterDone,
  isChapterOpen,
  maxStars,
  totalStars,
  useProgress,
} from '../progress'
import { TopBar } from './TopBar'

interface Props {
  onOpen: (chapterId: string) => void
  onExit?: () => void
}

/** Выбор профессии: обычный список глав, следующая открывается после экзамена */
export function MapScreen({ onOpen, onExit }: Props) {
  const progress = useProgress()
  useBack(onExit ?? null)

  const total = CHAPTERS.reduce((sum, c) => sum + maxStars(c), 0)

  return (
    <div className="screen map-screen">
      <TopBar
        subtitle="Очаково"
        title="Выбери профессию"
        onBack={onExit}
        backLabel="На сайт"
        right={
          <span className="pill" aria-label={`Звёзд: ${totalStars(progress)} из ${total}`}>
            <StarIcon size={16} /> {totalStars(progress)}/{total}
          </span>
        }
      />
      {platform.user ? <p className="greeting">Привет, {platform.user.name}!</p> : null}

      <div className="map">
        <ol className="map-list">
          {CHAPTERS.map((chapter, k) => {
            const open = isChapterOpen(progress, k)
            const done = isChapterDone(progress, chapter)
            return (
              <li key={chapter.id} className="map-item">
                <button
                  type="button"
                  className={`map-node${open ? '' : ' locked'}`}
                  style={{ '--c': chapter.color } as CSSProperties}
                  disabled={!open}
                  onClick={() => {
                    platform.haptic('tap')
                    onOpen(chapter.id)
                  }}
                >
                  <span className="map-node-circle">
                    {open ? <ChapterIcon name={chapter.icon} size={32} /> : <LockIcon size={26} />}
                    {done ? (
                      <span className="map-node-done">
                        <CheckIcon size={13} />
                      </span>
                    ) : null}
                  </span>
                  <span className="map-node-card">
                    <b>{chapter.title}</b>
                    {open ? (
                      <span className="map-node-stars">
                        <StarIcon size={14} /> {chapterStars(progress, chapter)}/{maxStars(chapter)}
                      </span>
                    ) : (
                      <span className="map-node-hint">Сдай экзамен в главе {k}</span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
