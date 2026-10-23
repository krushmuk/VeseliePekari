import { useEffect, useState } from 'react'
import type { LevelProps } from '../chapters'
import { ChapterIcon } from '../icons'

/**
 * Заглушка уровня, пока у главы нет своей механики. Таймер показывает, что пауза
 * доходит до уровня; кнопки завершают уровень с нужным числом звёзд.
 */
export function StubLevel({ chapter, levelIndex, paused, onFinish }: LevelProps) {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (paused) return
    const id = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [paused])

  return (
    <div className="stub">
      <span className="stub-icon">
        <ChapterIcon name={chapter.icon} size={64} />
      </span>
      <small className="sheet-kicker">Заглушка уровня</small>
      <p className="stub-goal">{chapter.levels[levelIndex].goal}</p>
      <p className="stub-mechanic">Здесь будет механика: {chapter.mechanic}</p>
      <p className="stub-timer" aria-live="off">
        {paused ? 'Пауза' : `Идёт уровень: ${seconds} с`}
      </p>
      <div className="stub-actions">
        <button type="button" className="btn btn-ghost" onClick={() => onFinish(0)}>
          Провал
        </button>
        {[1, 2, 3].map(n => (
          <button key={n} type="button" className="btn btn-primary" onClick={() => onFinish(n)}>
            {'★'.repeat(n)}
          </button>
        ))}
      </div>
    </div>
  )
}
