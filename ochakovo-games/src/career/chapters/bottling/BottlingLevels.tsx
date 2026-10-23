import { useCallback, useEffect, useRef, useState } from 'react'
import type Phaser from 'phaser'
import { PhaserGame } from '../../../games/shared/PhaserGame'
import type { LevelProps } from '../../chapters'
import { PauseIcon } from '../../icons'
import { BottlingScene, type BottlingBridge, type HudState, type ShiftResult } from './BottlingScene'
import { LEVEL, PERFECT_MISSES } from './config'
import './bottling.css'

/** Звёзды за смену: 1 — набрана цель, 2 — хороший результат, 3 — отличный и почти без промахов */
function starsFor({ score, misses, failed }: ShiftResult) {
  const [goal, good, great] = LEVEL.stars
  if (failed || score < goal) return 0
  if (score >= great && misses <= PERFECT_MISSES) return 3
  return score >= good ? 2 : 1
}

/**
 * Уровни главы «Сортировка на конвейере». Этап 1 — серый прототип:
 * все уровни пока играют один и тот же набор параметров (LEVEL в config.ts).
 */
export default function BottlingLevels({ paused, onFinish, onPause }: LevelProps) {
  const [hud, setHud] = useState<HudState>({ score: 0, time: LEVEL.shift, misses: 0, boxes: 0 })
  const sceneRef = useRef<BottlingScene | null>(null)
  const pausedRef = useRef(paused)
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
      onEnd: result => onFinishRef.current(starsFor(result)),
    }
    game.scene.add('bottling', BottlingScene, true, { bridge })
  }, [])

  useEffect(() => {
    pausedRef.current = paused
    sceneRef.current?.setPaused(paused)
  }, [paused])

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
        <div className={`stat ${hud.misses >= LEVEL.maxMisses - 1 ? 'low' : ''}`}>
          <span className="label">Промахи</span>
          <span className="value">
            {hud.misses}/{LEVEL.maxMisses}
          </span>
        </div>
        <div className={`stat ${hud.time <= 10 ? 'low' : ''}`}>
          <span className="label">Время</span>
          <span className="value">{hud.time}</span>
        </div>
      </div>
    </div>
  )
}
