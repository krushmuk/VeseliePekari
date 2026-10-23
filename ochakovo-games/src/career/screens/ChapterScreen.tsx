import { useState, type CSSProperties } from 'react'
import { platform, useBack } from '../../platform'
import { CHAPTERS, type ChapterInfo } from '../chapters'
import { ChapterIcon, LockIcon, StarIcon, Stars } from '../icons'
import {
  chapterStars,
  isIntroSeen,
  isLevelOpen,
  levelStars,
  markIntroSeen,
  maxStars,
  useProgress,
} from '../progress'
import { TopBar } from './TopBar'

interface Props {
  chapter: ChapterInfo
  onBack: () => void
  onPlay: (levelIndex: number) => void
}

/** Глава: наставник и список уровней. При первом входе — вступление о профессии */
export function ChapterScreen({ chapter, onBack, onPlay }: Props) {
  const progress = useProgress()
  const [intro, setIntro] = useState(() => !isIntroSeen(progress, chapter.id))
  const closeIntro = () => {
    markIntroSeen(chapter.id)
    setIntro(false)
  }
  useBack(intro ? closeIntro : onBack)

  const number = CHAPTERS.indexOf(chapter) + 1
  const last = chapter.levels.length - 1

  return (
    <div className="screen" style={{ '--c': chapter.color } as CSSProperties}>
      <TopBar
        subtitle={`Глава ${number}`}
        title={chapter.title}
        onBack={onBack}
        backLabel="К карте"
        right={
          <span className="pill">
            <StarIcon size={16} /> {chapterStars(progress, chapter)}/{maxStars(chapter)}
          </span>
        }
      />

      <section className="mentor">
        <span className="mentor-avatar">
          <ChapterIcon name={chapter.icon} size={34} />
        </span>
        <div>
          <b>{chapter.tagline}</b>
          <p>
            Наставник: {chapter.mentor.name}, {chapter.mentor.role}
          </p>
        </div>
        <button type="button" className="btn btn-small btn-ghost" onClick={() => setIntro(true)}>
          О профессии
        </button>
      </section>

      <ol className="levels">
        {chapter.levels.map((level, k) => {
          const open = isLevelOpen(progress, chapter.id, k)
          const stars = levelStars(progress, chapter.id, k)
          const exam = k === last
          return (
            <li key={k} className={exam ? 'exam' : undefined}>
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

      {intro ? <IntroOverlay chapter={chapter} onDone={closeIntro} /> : null}
    </div>
  )
}

function IntroOverlay({ chapter, onDone }: { chapter: ChapterInfo; onDone: () => void }) {
  const [slide, setSlide] = useState(0)
  const lastSlide = slide === chapter.intro.length - 1

  return (
    <div className="overlay-c" role="dialog" aria-modal="true" aria-label={`Вступление: ${chapter.title}`}>
      <div className="sheet">
        <div className="sheet-hero">
          <span className="mentor-avatar big">
            <ChapterIcon name={chapter.icon} size={52} />
          </span>
          <div>
            <b>{chapter.mentor.name}</b>
            <small>{chapter.mentor.role}</small>
          </div>
        </div>
        <p className="speech">{chapter.intro[slide]}</p>
        <div className="dots" aria-hidden="true">
          {chapter.intro.map((_, k) => (
            <span key={k} className={k === slide ? 'on' : undefined} />
          ))}
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            platform.haptic('select')
            if (lastSlide) onDone()
            else setSlide(slide + 1)
          }}
        >
          {lastSlide ? 'Начать' : 'Дальше'}
        </button>
        {!lastSlide ? (
          <button type="button" className="btn btn-link" onClick={onDone}>
            Пропустить
          </button>
        ) : null}
      </div>
    </div>
  )
}
