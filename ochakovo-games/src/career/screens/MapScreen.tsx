import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
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

/** Карта глав: профессии стоят на извилистой дорожке, следующая открывается после экзамена */
export function MapScreen({ onOpen, onExit }: Props) {
  const progress = useProgress()
  useBack(onExit ?? null)

  const listRef = useRef<HTMLOListElement>(null)
  const path = useTrailPath(listRef)
  const total = CHAPTERS.reduce((sum, c) => sum + maxStars(c), 0)

  return (
    <div className="screen">
      <TopBar
        subtitle="Очаково"
        title="Профессии"
        onBack={onExit}
        backLabel="На сайт"
        right={
          <span className="pill" aria-label={`Звёзд: ${totalStars(progress)} из ${total}`}>
            <StarIcon size={16} /> {totalStars(progress)}/{total}
          </span>
        }
      />
      {platform.user ? <p className="greeting">Привет, {platform.user.name}! Выбери профессию.</p> : null}

      <div className="map">
        <svg className="map-trail" aria-hidden="true">
          <path d={path} />
        </svg>
        <ol ref={listRef} className="map-list">
          {CHAPTERS.map((chapter, k) => {
            const open = isChapterOpen(progress, k)
            const done = isChapterDone(progress, chapter)
            return (
              <li key={chapter.id} className={`map-item ${k % 2 ? 'right' : 'left'}`}>
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
                  <span className="map-node-circle" data-trail>
                    {open ? <ChapterIcon name={chapter.icon} size={38} /> : <LockIcon size={30} />}
                    {done ? (
                      <span className="map-node-done">
                        <CheckIcon size={16} />
                      </span>
                    ) : null}
                  </span>
                  <span className="map-node-card">
                    <small>Глава {k + 1}</small>
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

/** Строит плавную дорожку через центры кругов-глав и пересчитывает её при изменении размеров */
function useTrailPath(listRef: RefObject<HTMLOListElement | null>) {
  const [path, setPath] = useState('')

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    const update = () => {
      const base = list.getBoundingClientRect()
      const points = [...list.querySelectorAll('[data-trail]')].map(el => {
        const r = el.getBoundingClientRect()
        return { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height / 2 }
      })
      let d = ''
      points.forEach((p, k) => {
        if (k === 0) d = `M${p.x},${p.y}`
        else {
          const prev = points[k - 1]
          const midY = (prev.y + p.y) / 2
          d += ` C${prev.x},${midY} ${p.x},${midY} ${p.x},${p.y}`
        }
      })
      setPath(d)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(list)
    return () => ro.disconnect()
  }, [listRef])

  return path
}
