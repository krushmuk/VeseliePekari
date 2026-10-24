import type { CSSProperties } from 'react'
import { platform, useBack } from '../../platform'
import { CHAPTERS } from '../chapters'
import { ChapterIcon, CheckIcon, LockIcon, ProfileIcon, StarIcon } from '../icons'
import {
  chapterStars,
  isChapterDone,
  isChapterOpen,
  maxStars,
  useProgress,
} from '../progress'
import { TopBar } from './TopBar'

interface Props {
  onOpen: (chapterId: string) => void
  onProfile: () => void
  onExit?: () => void
}

/** Выбор профессии: обычный список глав, следующая открывается после экзамена */
export function MapScreen({ onOpen, onProfile, onExit }: Props) {
  const progress = useProgress()
  useBack(onExit ?? null)

  return (
    <div className="screen map-screen">
      <TopBar
        subtitle="Очаково"
        title="Выбери профессию"
        onBack={onExit}
        backLabel="На сайт"
        right={
          <button
            type="button"
            className="icon-btn profile-btn"
            onClick={() => {
              platform.haptic('tap')
              onProfile()
            }}
            aria-label="Профиль"
          >
            <ProfileIcon size={26} />
          </button>
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
