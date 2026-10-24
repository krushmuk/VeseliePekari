import { useCallback, useEffect, useRef, useState } from 'react'
import type Phaser from 'phaser'
import { PhaserGame } from '../../../games/shared/PhaserGame'
import type { LevelProps } from '../../chapters'
import { loadDialog } from '../../dialogs'
import { platform } from '../../../platform'
import { PauseIcon } from '../../icons'
import { KeeperPortrait } from '../../screens/StorageArt'
import { PackScene, type PackBridge, type PackHud, type PackResult } from './PackScene'
import { levelConfig } from './config'
import '../bottling/bottling.css'
import './warehouse.css'

/** Вступительные диалоги уровней — dialogs/склад-уровень-N.txt, по одной реплике на нажатие */
const INTROS = [loadDialog('склад-уровень-1')]

/** Звёзды: заказ собран — 1; без неверных подтверждений и груза на хрупком — 3, не больше одного такого промаха — 2. Ходы не считаются */
function starsFor({ mistakes, violations }: PackResult) {
  if (mistakes === 0 && violations === 0) return 3
  return mistakes <= 2 && violations <= 2 ? 2 : 1
}

/** Уровни главы «Склад»: собрать три заказа по очереди — уложить в сетку 4×4 над тележкой нужные коробки по номерам (коробок больше, чем в заказе; сетка может остаться не полной) и подтвердить, без времени */
export default function WarehouseLevels({ levelIndex, paused, onFinish, onPause }: LevelProps) {
  const level = levelConfig(levelIndex)
  const intro = INTROS[Math.min(levelIndex, INTROS.length - 1)] ?? []
  const [hud, setHud] = useState<PackHud>({ ordered: 0, orderTotal: level.orders[0].length, canConfirm: false, moves: 0 })
  const [talking, setTalking] = useState(intro.length > 0)
  const [part, setPart] = useState(0)
  const sceneRef = useRef<PackScene | null>(null)
  // Пока идёт диалог, сцена стоит так же, как на паузе
  const frozen = paused || talking
  const frozenRef = useRef(frozen)
  const onFinishRef = useRef(onFinish)

  useEffect(() => {
    onFinishRef.current = onFinish
  }, [onFinish])

  const onCreate = useCallback((game: Phaser.Game) => {
    const bridge: PackBridge = {
      onReady: scene => {
        sceneRef.current = scene
        if (frozenRef.current) scene.setPaused(true)
      },
      onHud: setHud,
      onEnd: result => onFinishRef.current(starsFor(result)),
    }
    game.scene.add('pack', PackScene, true, { bridge, levelIndex })
  }, [levelIndex])

  useEffect(() => {
    frozenRef.current = frozen
    sceneRef.current?.setPaused(frozen)
  }, [frozen])

  return (
    <div className="bottling">
      <PhaserGame onCreate={onCreate} backgroundColor="#3a4448" pixelArt />
      <div className="bottling-hud hud-pack">
        <button type="button" className="bottling-pause" onClick={onPause} disabled={paused} aria-label="Пауза">
          <PauseIcon />
        </button>
        <div className="stat">
          <span className="label">Заказ</span>
          <span className="value">
            {hud.ordered}/{hud.orderTotal}
          </span>
        </div>
        <div className="stat">
          <span className="label">Ходы</span>
          <span className="value">{hud.moves}</span>
        </div>
        <button
          type="button"
          className="bottling-pause"
          onClick={() => {
            platform.haptic('tap')
            sceneRef.current?.reset()
          }}
          disabled={frozen}
          aria-label="Убрать все коробки на стеллаж"
        >
          ↺
        </button>
      </div>

      <button
        type="button"
        className="warehouse-confirm"
        onClick={() => {
          platform.haptic('select')
          sceneRef.current?.confirm()
        }}
        disabled={frozen || !hud.canConfirm}
      >
        Подтвердить
      </button>

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
            <KeeperPortrait />
          </div>
        </div>
      )}
    </div>
  )
}
