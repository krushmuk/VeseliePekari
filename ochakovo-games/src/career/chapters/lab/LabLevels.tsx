import { useCallback, useEffect, useRef, useState } from 'react'
import type Phaser from 'phaser'
import { PhaserGame } from '../../../games/shared/PhaserGame'
import type { LevelProps } from '../../chapters'
import { loadDialog } from '../../dialogs'
import { platform } from '../../../platform'
import { PauseIcon } from '../../icons'
import { SampleScene, type SampleBridge, type SampleHud } from './SampleScene'
import { MAX_ERRORS, TIME_LIMIT } from './config'
import { RIGHT, starsFor } from './rules'
import CrossLevel from './CrossLevel'
import { LabPortrait } from './LabPortrait'
import '../bottling/bottling.css'
import './lab.css'

/** Вступительные диалоги уровней — dialogs/лаб-уровень-N.txt, по одной реплике на нажатие */
const INTROS = [loadDialog('лаб-уровень-1')]
const REPLY_MS = 3500

/** Уровни главы «Лаборант». Первый — «Эталон»: найти среди двенадцати стаканов (часть закрыта этикетками) три, совпадающих с эталоном по цвету, пузырькам и их скорости, за 30 секунд и не больше двух ошибок */
function EtalonLevel({ levelIndex, paused, onFinish, onPause }: LevelProps) {
  const intro = INTROS[Math.min(levelIndex, INTROS.length - 1)] ?? []
  const [hud, setHud] = useState<SampleHud>({ found: 0, errors: 0, timeLeft: TIME_LIMIT })
  const [talking, setTalking] = useState(intro.length > 0)
  const [part, setPart] = useState(0)
  const [reply, setReply] = useState<{ text: string; id: number } | null>(null)
  const sceneRef = useRef<SampleScene | null>(null)
  // Пока идёт диалог, сцена стоит так же, как на паузе
  const frozen = paused || talking
  const frozenRef = useRef(frozen)
  const onFinishRef = useRef(onFinish)

  useEffect(() => {
    onFinishRef.current = onFinish
  }, [onFinish])

  const onCreate = useCallback((game: Phaser.Game) => {
    const bridge: SampleBridge = {
      onReady: scene => {
        sceneRef.current = scene
        if (frozenRef.current) scene.setPaused(true)
      },
      onHud: setHud,
      onReply: text => setReply({ text, id: Date.now() }),
      onEnd: ({ won, errors }) => onFinishRef.current(starsFor(won, errors)),
    }
    game.scene.add('sample', SampleScene, true, { bridge })
  }, [])

  useEffect(() => {
    frozenRef.current = frozen
    sceneRef.current?.setPaused(frozen)
  }, [frozen])

  // Реплика гаснет сама; на паузе таймер идёт, это не страшно
  useEffect(() => {
    if (!reply) return
    const t = setTimeout(() => setReply(null), REPLY_MS)
    return () => clearTimeout(t)
  }, [reply])

  return (
    <div className="bottling">
      <PhaserGame onCreate={onCreate} backgroundColor="#dfe6e9" pixelArt />
      <div className="bottling-hud hud-lab">
        <button type="button" className="bottling-pause" onClick={onPause} disabled={paused} aria-label="Пауза">
          <PauseIcon />
        </button>
        <div className="stat">
          <span className="label">Найдено</span>
          <span className="value">
            {hud.found}/{RIGHT}
          </span>
        </div>
        <div className={`stat${hud.timeLeft <= 10 ? ' low' : ''}`}>
          <span className="label">Время</span>
          <span className="value">{hud.timeLeft}</span>
        </div>
        <div className="stat low">
          <span className="label">Ошибки</span>
          <span className="value">
            {hud.errors}/{MAX_ERRORS}
          </span>
        </div>
      </div>

      {reply && !talking && (
        <div className="lab-reply" key={reply.id}>
          <small>Лаборант</small>
          <p>{reply.text}</p>
        </div>
      )}

      {talking && (
        <div
          className="bottling-intro press-shop"
          onClick={() => {
            platform.haptic('tap')
            if (part < intro.length - 1) setPart(part + 1)
            else setTalking(false)
          }}
        >
          <div className="bottling-intro-bubble" key={part}>
            <small>{intro[part].who}</small>
            <p>{intro[part].text}</p>
            <span className="bottling-intro-hint">
              {part < intro.length - 1 ? 'Нажмите, чтобы продолжить' : 'Нажмите, чтобы начать'}
            </span>
          </div>
          <div className="bottling-intro-char" aria-label={intro[part].who}>
            <LabPortrait />
          </div>
        </div>
      )}
    </div>
  )
}

/** Уровни главы «Лаборант»: 1 — «Эталон», 2 — «Скрещивание» */
export default function LabLevels(props: LevelProps) {
  return props.levelIndex === 1 ? <CrossLevel {...props} /> : <EtalonLevel {...props} />
}
