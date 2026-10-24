import { useCallback, useEffect, useRef, useState } from 'react'
import type Phaser from 'phaser'
import { PhaserGame } from '../../../../games/shared/PhaserGame'
import type { LevelProps } from '../../../chapters'
import { loadDialog } from '../../../dialogs'
import { platform } from '../../../../platform'
import { PauseIcon } from '../../../icons'
import { PERFECT_MISSES, PRESS_CONFIG } from './config'
import { ForemanArt } from './ForemanArt'
import { MasterArt } from './MasterArt'
import { ShopScene } from './ShopScene'
import { PressScene, type PressBridge, type PressHud, type PressResult } from './PressScene'
import '../bottling.css'

// Диалоги уровня — dialogs/глава-1-уровень-3*.txt:
// «цех» — старая локация (мастер цеха), «пресс» — новая локация (мастер пресса),
// «ошибки» — реплики мастера пресса при ошибке, каждая реплика файла — отдельный вариант
const SHOP = loadDialog('глава-1-уровень-3')
const PRESS = loadDialog('глава-1-уровень-3-пресс')
const MISTAKES = loadDialog('глава-1-уровень-3-ошибки')

/** Сколько висит реплика после ошибки, мс */
const REPLY_MS = 2600
/** Переход между локациями: полная темнота на середине, мс */
const FADE_MS = 700

type Stage = 'shop' | 'press' | 'play'

function starsFor({ score, misses, failed }: PressResult) {
  const [goal, good, great] = PRESS_CONFIG.stars
  if (failed || score < goal) return 0
  if (score >= great && misses <= PERFECT_MISSES) return 3
  return score >= good ? 2 : 1
}

/** Третий уровень главы 1: сортировка банок по секциям пресса */
export default function PressLevel({ paused, onFinish, onPause }: LevelProps) {
  const [hud, setHud] = useState<PressHud>({ score: 0, time: PRESS_CONFIG.shift, misses: 0 })
  const [stage, setStage] = useState<Stage>(SHOP.length ? 'shop' : PRESS.length ? 'press' : 'play')
  // Этап для колбэков Phaser: игра может загрузиться позже, чем игрок пролистает реплики цеха
  const stageRef = useRef(stage)
  const [part, setPart] = useState(0)
  const [fading, setFading] = useState(false)
  const [reply, setReply] = useState<{ who: string; text: string; id: number } | null>(null)
  const sceneRef = useRef<PressScene | null>(null)
  const frozen = paused || stage !== 'play'
  const pausedRef = useRef(frozen)
  const onFinishRef = useRef(onFinish)
  const replyTimer = useRef<number>(0)
  const lastReply = useRef(-1)

  useEffect(() => {
    onFinishRef.current = onFinish
  }, [onFinish])

  useEffect(() => {
    stageRef.current = stage
  }, [stage])

  useEffect(() => () => window.clearTimeout(replyTimer.current), [])

  const gameRef = useRef<Phaser.Game | null>(null)
  const bridgeRef = useRef<PressBridge | null>(null)

  // Сцена пресса создаётся, когда начинается новая локация (или сразу, если диалога в цеху нет)
  const startPress = useCallback(() => {
    const game = gameRef.current
    if (!game || !bridgeRef.current || game.scene.getScene('press')) return
    if (game.scene.getScene('shop')) game.scene.remove('shop')
    game.scene.add('press', PressScene, true, { bridge: bridgeRef.current })
  }, [])

  const onCreate = useCallback((game: Phaser.Game) => {
    const bridge: PressBridge = {
      onReady: scene => {
        sceneRef.current = scene
        if (pausedRef.current) scene.setPaused(true)
      },
      onHud: setHud,
      onMistake: () => {
        if (!MISTAKES.length) return
        // Не повторяем одну и ту же реплику дважды подряд
        let i = Math.floor(Math.random() * MISTAKES.length)
        if (MISTAKES.length > 1 && i === lastReply.current) i = (i + 1) % MISTAKES.length
        lastReply.current = i
        setReply({ ...MISTAKES[i], id: Date.now() })
        window.clearTimeout(replyTimer.current)
        replyTimer.current = window.setTimeout(() => setReply(null), REPLY_MS)
      },
      onEnd: result => onFinishRef.current(starsFor(result)),
    }
    gameRef.current = game
    bridgeRef.current = bridge
    // Если игрок уже ушёл от цеха, пока грузился Phaser, сразу показываем пресс
    if (SHOP.length && stageRef.current === 'shop') game.scene.add('shop', ShopScene, true)
    else startPress()
  }, [startPress])

  useEffect(() => {
    pausedRef.current = frozen
    sceneRef.current?.setPaused(frozen)
  }, [frozen])

  const lines = stage === 'shop' ? SHOP : PRESS

  const next = () => {
    if (fading) return
    platform.haptic('tap')
    if (part < lines.length - 1) {
      setPart(part + 1)
      return
    }
    if (stage === 'shop' && PRESS.length) {
      // Переезд в новую локацию: затемнение, на середине меняем экран
      setFading(true)
      window.setTimeout(() => {
        startPress()
        stageRef.current = 'press'
        setStage('press')
        setPart(0)
      }, FADE_MS / 2)
      window.setTimeout(() => setFading(false), FADE_MS)
    } else {
      setStage('play')
    }
  }

  return (
    <div className="bottling">
      <PhaserGame onCreate={onCreate} backgroundColor="#23363b" pixelArt />
      <div className="bottling-hud hud-3">
        <button type="button" className="bottling-pause" onClick={onPause} disabled={paused} aria-label="Пауза">
          <PauseIcon />
        </button>
        <div className="stat">
          <span className="label">Очки</span>
          <span className="value">{hud.score}</span>
        </div>
        <div className={`stat ${hud.misses >= PRESS_CONFIG.maxMisses - 1 ? 'low' : ''}`}>
          <span className="label">Ошибки</span>
          <span className="value">
            {hud.misses}/{PRESS_CONFIG.maxMisses}
          </span>
        </div>
        <div className={`stat ${hud.time <= 10 ? 'low' : ''}`}>
          <span className="label">Время</span>
          <span className="value">{hud.time}</span>
        </div>
      </div>

      {reply && stage === 'play' && (
        <div className="press-reply" key={reply.id}>
          <small>{reply.who}</small>
          <p>{reply.text}</p>
        </div>
      )}

      {stage !== 'play' && lines.length > 0 && (
        <div className={`bottling-intro ${stage === 'shop' ? 'press-shop' : ''}`} onClick={next}>
          <div className="bottling-intro-bubble" key={`${stage}${part}`}>
            <small>{lines[part].who}</small>
            <p>{lines[part].text}</p>
            <span className="bottling-intro-hint">
              {part < lines.length - 1 ? 'Нажмите, чтобы продолжить' : stage === 'shop' ? 'Нажмите, чтобы идти' : 'Нажмите, чтобы начать'}
            </span>
          </div>
          <div className="bottling-intro-char" aria-label={lines[part].who}>
            {stage === 'shop' ? <ForemanArt /> : <MasterArt />}
          </div>
        </div>
      )}

      {fading && <div className="press-fade" style={{ animationDuration: `${FADE_MS}ms` }} />}
    </div>
  )
}
