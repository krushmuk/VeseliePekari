import { useCallback, useEffect, useRef, useState } from 'react'
import type Phaser from 'phaser'
import { PhaserGame } from '../../../games/shared/PhaserGame'
import type { LevelProps } from '../../chapters'
import { loadDialog } from '../../dialogs'
import { PauseIcon } from '../../icons'
import { KeeperPortrait } from '../../screens/StorageArt'
import { platform } from '../../../platform'
import { MemoryScene, type MemoryBridge, type MemoryHud } from './MemoryScene'
import { MEMORY, starsFor } from './memoryRules'
import '../bottling/bottling.css'
import './warehouse.css'

const INTRO = loadDialog('склад-уровень-2')

/** Уровень «Сверка»: стеллаж 5×5 закрытых коробок; нажатием открывают две и сравнивают коды — пара снимается, при разных кодах коробки закрываются снова. Найти нужно все восемь пар; звёзды — за время, ограничения нет */
export default function MemoryLevel({ paused, onFinish, onPause }: LevelProps) {
  const [hud, setHud] = useState<MemoryHud>({ pairs: 0, mistakes: 0, seconds: 0 })
  const [talking, setTalking] = useState(INTRO.length > 0)
  const [part, setPart] = useState(0)
  const sceneRef = useRef<MemoryScene | null>(null)
  // Пока идёт диалог, сцена стоит так же, как на паузе
  const frozen = paused || talking
  const frozenRef = useRef(frozen)
  const onFinishRef = useRef(onFinish)

  useEffect(() => {
    onFinishRef.current = onFinish
  }, [onFinish])

  const onCreate = useCallback((game: Phaser.Game) => {
    const bridge: MemoryBridge = {
      onReady: scene => {
        sceneRef.current = scene
        if (frozenRef.current) scene.setPaused(true)
      },
      onHud: setHud,
      onEnd: ({ seconds }) => onFinishRef.current(starsFor(seconds)),
    }
    game.scene.add('memory', MemoryScene, true, { bridge })
  }, [])

  useEffect(() => {
    frozenRef.current = frozen
    sceneRef.current?.setPaused(frozen)
  }, [frozen])

  return (
    <div className="bottling">
      <PhaserGame onCreate={onCreate} backgroundColor="#3a4448" pixelArt />
      <div className="bottling-hud hud-memory">
        <button type="button" className="bottling-pause" onClick={onPause} disabled={paused} aria-label="Пауза">
          <PauseIcon />
        </button>
        <div className="stat">
          <span className="label">Пары</span>
          <span className="value">
            {hud.pairs}/{MEMORY.pairs}
          </span>
        </div>
        <div className="stat low">
          <span className="label">Ошибки</span>
          <span className="value">{hud.mistakes}</span>
        </div>
        <div className="stat">
          <span className="label">Время</span>
          <span className="value">{hud.seconds}</span>
        </div>
      </div>

      {talking && (
        <div
          className="bottling-intro press-shop"
          onClick={() => {
            platform.haptic('tap')
            if (part < INTRO.length - 1) setPart(part + 1)
            else setTalking(false)
          }}
        >
          <div className="bottling-intro-bubble" key={part}>
            <small>{INTRO[part].who}</small>
            <p>{INTRO[part].text}</p>
            <span className="bottling-intro-hint">{part < INTRO.length - 1 ? 'Нажмите, чтобы продолжить' : 'Нажмите, чтобы начать'}</span>
          </div>
          <div className="bottling-intro-char" aria-label={INTRO[part].who}>
            <KeeperPortrait />
          </div>
        </div>
      )}
    </div>
  )
}
