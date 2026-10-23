import { useState } from 'react'
import { CHAPTERS } from './chapters'
import { ChapterScreen } from './screens/ChapterScreen'
import { LevelScreen } from './screens/LevelScreen'
import { MapScreen } from './screens/MapScreen'
import { PrologueScreen } from './screens/PrologueScreen'
import { isPrologueDone, markPrologueDone, useProgress } from './progress'
import './career.css'

type Screen =
  | { name: 'map' }
  | { name: 'chapter'; chapterId: string }
  | { name: 'level'; chapterId: string; levelIndex: number; run: number }

interface Props {
  /** Выход на сайт. Нет — игра запущена как приложение (Telegram, ?app): выходить некуда */
  onExit?: () => void
}

/** Оболочка игры «Профессии»: карта глав → глава → уровень */
export default function CareerApp({ onExit }: Props) {
  const progress = useProgress()
  const [screen, setScreen] = useState<Screen>({ name: 'map' })
  const chapter = 'chapterId' in screen ? CHAPTERS.find(c => c.id === screen.chapterId) : undefined

  const toMap = () => setScreen({ name: 'map' })
  const toChapter = (chapterId: string) => setScreen({ name: 'chapter', chapterId })
  // run меняется при каждом запуске — «Ещё раз» пересоздаёт уровень с нуля
  const toLevel = (chapterId: string, levelIndex: number) =>
    setScreen({ name: 'level', chapterId, levelIndex, run: Date.now() })

  // Пока вступительная миссия не пройдена, карта глав недоступна
  if (!isPrologueDone(progress)) {
    return (
      <div className="career">
        <PrologueScreen onDone={markPrologueDone} onExit={onExit} />
      </div>
    )
  }

  return (
    <div className="career">
      {screen.name === 'map' || !chapter ? (
        <MapScreen onOpen={toChapter} onExit={onExit} />
      ) : screen.name === 'chapter' ? (
        <ChapterScreen chapter={chapter} onBack={toMap} onPlay={k => toLevel(chapter.id, k)} />
      ) : (
        <LevelScreen
          key={screen.run}
          chapter={chapter}
          levelIndex={screen.levelIndex}
          onPlay={k => toLevel(chapter.id, k)}
          onLevels={() => toChapter(chapter.id)}
          onMap={toMap}
        />
      )}
    </div>
  )
}
