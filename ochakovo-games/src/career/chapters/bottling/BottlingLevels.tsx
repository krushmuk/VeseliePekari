import { useCallback, useEffect, useRef, useState } from 'react'
import type Phaser from 'phaser'
import { PhaserGame } from '../../../games/shared/PhaserGame'
import type { LevelProps } from '../../chapters'
import { loadDialog } from '../../dialogs'
import { platform } from '../../../platform'
import { PauseIcon } from '../../icons'
import { BottlingScene, type BottlingBridge, type HudState, type ShiftResult } from './BottlingScene'
import { levelConfig, LEVELS, PERFECT_MISSES, type LevelConfig } from './config'
import './bottling.css'

/** Вступительные монологи уровней — dialogs/глава-1-уровень-N.txt, по одной реплике на нажатие */
const INTROS = LEVELS.map((_, i) => loadDialog(`глава-1-уровень-${i + 1}`))

/** Звёзды за смену: 1 — набрана цель, 2 — хороший результат, 3 — отличный и почти без промахов */
function starsFor({ score, misses, failed }: ShiftResult, level: LevelConfig) {
  const [goal, good, great] = level.stars
  if (failed || score < goal) return 0
  if (score >= great && misses <= PERFECT_MISSES) return 3
  return score >= good ? 2 : 1
}

/**
 * Уровни главы «Сортировка на конвейере». Этап 1 — серый прототип:
 * параметры уровней — LEVELS в config.ts, уровни после последнего играют его набор.
 */
export default function BottlingLevels({ levelIndex, paused, onFinish, onPause }: LevelProps) {
  const level = levelConfig(levelIndex)
  const INTRO = (levelIndex < INTROS.length && INTROS[levelIndex]) || []
  const [hud, setHud] = useState<HudState>({ score: 0, time: level.shift, misses: 0, boxes: 0 })
  const sceneRef = useRef<BottlingScene | null>(null)
  const [intro, setIntro] = useState(INTRO.length > 0)
  const [part, setPart] = useState(0)
  // Пока идёт монолог, сцена стоит так же, как на паузе
  const frozen = paused || intro
  const pausedRef = useRef(frozen)
  const onFinishRef = useRef(onFinish)

  useEffect(() => {
    onFinishRef.current = onFinish
  }, [onFinish])

  const onCreate = useCallback((game: Phaser.Game) => {
    const bridge: BottlingBridge = {
      onReady: scene => {
        sceneRef.current = scene
        if (pausedRef.current) scene.setPaused(true)
      },
      onHud: setHud,
      onEnd: result => onFinishRef.current(starsFor(result, level)),
    }
    game.scene.add('bottling', BottlingScene, true, { bridge, levelIndex })
  }, [level, levelIndex])

  useEffect(() => {
    pausedRef.current = frozen
    sceneRef.current?.setPaused(frozen)
  }, [frozen])

  return (
    <div className="bottling">
      <PhaserGame onCreate={onCreate} backgroundColor="#23363b" pixelArt />
      <div className="bottling-hud">
        <button type="button" className="bottling-pause" onClick={onPause} disabled={paused} aria-label="Пауза">
          <PauseIcon />
        </button>
        <div className="stat">
          <span className="label">Очки</span>
          <span className="value">{hud.score}</span>
        </div>
        <div className="stat">
          <span className="label">Коробки</span>
          <span className="value">{hud.boxes}</span>
        </div>
        <div className={`stat ${hud.misses >= level.maxMisses - 1 ? 'low' : ''}`}>
          <span className="label">Промахи</span>
          <span className="value">
            {hud.misses}/{level.maxMisses}
          </span>
        </div>
        <div className={`stat ${hud.time <= 10 ? 'low' : ''}`}>
          <span className="label">Время</span>
          <span className="value">{hud.time}</span>
        </div>
      </div>
      {intro && (
        <div
          className="bottling-intro"
          onClick={() => {
            platform.haptic('tap')
            if (part < INTRO.length - 1) setPart(part + 1)
            else setIntro(false)
          }}
        >
          <div className="bottling-intro-bubble" key={part}>
            <small>{INTRO[part].who}</small>
            <p>{INTRO[part].text}</p>
            <span className="bottling-intro-hint">
              {part < INTRO.length - 1 ? 'Нажмите, чтобы продолжить' : 'Нажмите, чтобы начать'}
            </span>
          </div>
          <div className="bottling-intro-char" aria-label={INTRO[part].who} />
        </div>
      )}
    </div>
  )
}
