import { Suspense, useEffect, useState, type CSSProperties } from 'react'
import { sfx } from '../../games/shared/sfx'
import { platform, useBack } from '../../platform'
import { CHAPTERS, type ChapterInfo } from '../chapters'
import { ChapterIcon, ExitIcon, PauseIcon, RestartIcon, Stars } from '../icons'
import { isChapterDone, levelStars, recordResult, useProgress } from '../progress'
import { StubLevel } from './StubLevel'

interface Props {
  chapter: ChapterInfo
  levelIndex: number
  onPlay: (levelIndex: number) => void
  onLevels: () => void
  onMap: () => void
}

type Phase = 'play' | 'result'

/**
 * Общая оболочка уровня: игра (пауза) → итог.
 * Саму механику рисует компонент главы (chapter.component), пока его нет — заглушка.
 */
export function LevelScreen({ chapter, levelIndex, onPlay, onLevels, onMap }: Props) {
  const progress = useProgress()
  const level = chapter.levels[levelIndex]
  const exam = levelIndex === chapter.levels.length - 1
  const number = CHAPTERS.indexOf(chapter) + 1

  const [phase, setPhase] = useState<Phase>('play')
  const [paused, setPaused] = useState(false)
  const [result, setResult] = useState<{ stars: number; best: boolean; mastered: boolean } | null>(null)

  useBack(phase === 'play' ? () => setPaused(p => !p) : onLevels)

  // Свернули приложение или переключили вкладку — ставим на паузу
  useEffect(
    () =>
      platform.onSuspend(suspended => {
        if (suspended && phase === 'play') setPaused(true)
      }),
    [phase],
  )

  // Уровень начинается сразу после нажатия на плитку — это и есть жест для запуска звука
  useEffect(() => {
    sfx.init()
  }, [])

  const finish = (stars: number) => {
    const best = stars > levelStars(progress, chapter.id, levelIndex)
    const mastered = exam && stars > 0 && !isChapterDone(progress, chapter)
    recordResult(chapter.id, levelIndex, stars)
    platform.haptic(stars > 0 ? 'success' : 'error')
    if (stars > 0) for (let k = 0; k < stars; k++) sfx.tone(660 + k * 220, 0.18, 'triangle', 0.08, 0.15 + k * 0.18)
    else sfx.tone(180, 0.35, 'sawtooth', 0.06)
    setResult({ stars, best, mastered })
    setPaused(false)
    setPhase('result')
  }

  const Level = chapter.component ?? StubLevel
  const hasNext = levelIndex < chapter.levels.length - 1

  return (
    <div
      className={`screen level-screen${chapter.fullscreen ? ' fullscreen' : ''}`}
      style={{ '--c': chapter.color } as CSSProperties}
    >
      {chapter.fullscreen ? null : (
        <header className="level-hud">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setPaused(true)}
            aria-label="Пауза"
            disabled={phase !== 'play'}
          >
            <PauseIcon />
          </button>
          <div className="topbar-title">
            <small>
              Глава {number} · {exam ? 'Экзамен' : `Уровень ${levelIndex + 1}`}
            </small>
            <h1>{level.title}</h1>
          </div>
        </header>
      )}

      <div className="level-stage">
        <Suspense fallback={<div className="loading">Загрузка…</div>}>
          <Level
            chapter={chapter}
            levelIndex={levelIndex}
            paused={paused || phase !== 'play'}
            onFinish={finish}
            onPause={() => setPaused(true)}
          />
        </Suspense>
      </div>

      {phase === 'play' && paused ? (
        <div className="overlay-c overlay-pause">
          <div className="sheet sheet-pause">
            <h2>Пауза</h2>
            <div className="pause-actions">
              <button type="button" className="btn btn-ghost btn-icon btn-danger" onClick={onLevels} aria-label="Выйти к уровням">
                <ExitIcon size={28} />
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setPaused(false)}>
                Продолжить
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={() => onPlay(levelIndex)}
                aria-label="Заново"
              >
                <RestartIcon size={28} />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {phase === 'result' && result ? (
        <div className="overlay-c">
          <div className="sheet">
            {result.mastered ? (
              <>
                <span className="badge">
                  <ChapterIcon name={chapter.icon} size={56} />
                </span>
                <small className="sheet-kicker">Профессия освоена</small>
                <h2>{chapter.title}</h2>
                <Stars count={result.stars} size={30} />
                <ul className="facts">
                  {chapter.facts.map(f => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <button type="button" className="btn btn-primary" onClick={onMap}>
                  {number < CHAPTERS.length ? 'Следующая профессия' : 'К карте'}
                </button>
                <button type="button" className="btn btn-link" onClick={() => onPlay(levelIndex)}>
                  Ещё раз
                </button>
              </>
            ) : (
              <>
                <h2>{result.stars > 0 ? 'Уровень пройден!' : 'Не получилось'}</h2>
                <Stars count={result.stars} size={36} />
                <p>
                  {result.stars === 0
                    ? 'Попробуй ещё раз — у тебя получится.'
                    : result.best
                      ? 'Новый лучший результат!'
                      : `Лучший результат: ${levelStars(progress, chapter.id, levelIndex)} из 3`}
                </p>
                {result.stars > 0 && hasNext ? (
                  <button type="button" className="btn btn-primary" onClick={() => onPlay(levelIndex + 1)}>
                    Дальше
                  </button>
                ) : null}
                <button
                  type="button"
                  className={`btn ${result.stars > 0 && hasNext ? 'btn-ghost' : 'btn-primary'}`}
                  onClick={() => onPlay(levelIndex)}
                >
                  Ещё раз
                </button>
                <button type="button" className="btn btn-link" onClick={onLevels}>
                  К уровням
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
