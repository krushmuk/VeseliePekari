import { useCallback, useEffect, useRef, useState } from 'react'
import type Phaser from 'phaser'
import { PhaserGame } from '../../../games/shared/PhaserGame'
import { sfx } from '../../../games/shared/sfx'
import type { LevelProps } from '../../chapters'
import { loadDialog } from '../../dialogs'
import { platform } from '../../../platform'
import { PauseIcon } from '../../icons'
import { LabDialog } from './LabDialog'
import { CrossScene, type CrossBridge, type CrossView } from './CrossScene'
import {
  BASE_APPLES, MAX_FAILS, ORDERS, REPLIES, cross, crossLimit, judge, sameApple, starsFor,
  type Apple, type Verdict,
} from './crossRules'
import '../bottling/bottling.css'
import './lab.css'

const INTRO = loadDialog('лаб-уровень-2')
const OUTRO = loadDialog('лаб-уровень-2-финал')
const REPLY_MS = 3500

type Phase = 'intro' | 'play' | 'done' | 'failed' | 'outro'
type Slots = [Apple | null, Apple | null]

/** Уровень «Скрещивание» (без графики): вывести три сорта яблок — результат скрещивания есть среднее родителей. Скрещиваний на заказ ограниченное число */
export default function CrossLevel({ paused, onFinish, onPause }: LevelProps) {
  const [phase, setPhase] = useState<Phase>(INTRO.length ? 'intro' : 'play')
  const [stage, setStage] = useState(0)
  const [fails, setFails] = useState(0)
  const [pool, setPool] = useState<Apple[]>(BASE_APPLES)
  const [slots, setSlots] = useState<Slots>([null, null])
  const [used, setUsed] = useState(0)
  const [result, setResult] = useState<{ apple: Apple; verdict: Verdict } | null>(null)
  const [reply, setReply] = useState<{ text: string; id: number } | null>(null)
  const sceneRef = useRef<CrossScene | null>(null)
  const [, setSceneReady] = useState(false)
  const actions = useRef<{ pick?: (a: Apple) => void; clear?: (i: 0 | 1) => void; cross?: () => void }>({})

  const order = ORDERS[stage]
  const limit = crossLimit(order)
  const playing = phase === 'play' && !paused

  const say = (text: string) => setReply({ text, id: Date.now() })

  const resetStage = () => {
    setPool(BASE_APPLES)
    setSlots([null, null])
    setUsed(0)
    setResult(null)
    setReply(null)
  }

  const pickApple = (apple: Apple) => {
    if (!playing) return
    if (slots[0] && slots[1]) return
    platform.haptic('tap')
    sfx.tone(440, 0.06, 'triangle', 0.05)
    setSlots(slots[0] ? [slots[0], apple] : [apple, slots[1]])
    setResult(null)
  }

  const clearSlot = (i: 0 | 1) => {
    if (!playing || !slots[i]) return
    const next: Slots = [...slots]
    next[i] = null
    setSlots(next)
  }

  const doCross = () => {
    const [a, b] = slots
    if (!playing || !a || !b) return
    if (a.id === b.id) {
      platform.haptic('error')
      say(REPLIES.clone)
      return
    }
    const child = cross(a, b, String(pool.length - BASE_APPLES.length + 1))
    const known = pool.find(p => sameApple(p, child))
    if (known) {
      say(REPLIES.dup)
      setResult({ apple: known, verdict: judge(known, order) })
      setSlots([null, null])
      return
    }
    const verdict = judge(child, order)
    const count = used + 1
    setPool([...pool, child])
    setUsed(count)
    setResult({ apple: child, verdict })
    setSlots([null, null])
    say(REPLIES[verdict])
    if (verdict === 'perfect') {
      platform.haptic('success')
      sfx.tone(523, 0.1, 'triangle', 0.06)
      sfx.tone(784, 0.14, 'triangle', 0.06, 0.1)
      setPhase('done')
    } else if (count >= limit) {
      platform.haptic('error')
      setFails(fails + 1)
      say(`${REPLIES[verdict]} ${REPLIES.fail}`)
      setPhase('failed')
    } else {
      platform.haptic('error')
      sfx.tone(140, 0.25, 'sawtooth', 0.06)
    }
  }

  const next = () => {
    if (phase === 'done') {
      if (stage + 1 >= ORDERS.length) {
        setPhase(OUTRO.length ? 'outro' : 'play')
        if (!OUTRO.length) onFinish(starsFor(fails))
        return
      }
      setStage(stage + 1)
    } else if (fails >= MAX_FAILS) {
      onFinish(0)
      return
    }
    resetStage()
    setPhase('play')
  }

  const onCreate = useCallback((game: Phaser.Game) => {
    const bridge: CrossBridge = {
      onReady: scene => {
        sceneRef.current = scene
        setSceneReady(true)
      },
      onPick: a => actions.current.pick?.(a),
      onClearSlot: i => actions.current.clear?.(i),
      onCross: () => actions.current.cross?.(),
    }
    game.scene.add('cross', CrossScene, true, { bridge })
  }, [])

  const view: CrossView = { order, pool, slots, result, canCross: playing && !!slots[0] && !!slots[1] }
  useEffect(() => {
    actions.current = { pick: pickApple, clear: clearSlot, cross: doCross }
    sceneRef.current?.render(view)
  })

  // Реплика гаснет сама, но при итоге заказа остаётся вместе с кнопкой
  const [hidden, setHidden] = useState<number | null>(null)
  useEffect(() => {
    if (!reply) return
    const t = setTimeout(() => setHidden(reply.id), REPLY_MS)
    return () => clearTimeout(t)
  }, [reply])
  const shownReply = reply && (hidden !== reply.id || phase === 'done' || phase === 'failed') ? reply : null

  return (
    <div className="bottling">
      <PhaserGame onCreate={onCreate} backgroundColor="#dfe6e9" pixelArt />
      <div className="bottling-hud hud-lab">
        <button type="button" className="bottling-pause" onClick={onPause} disabled={paused} aria-label="Пауза">
          <PauseIcon />
        </button>
        <div className="stat">
          <span className="label">Сорт</span>
          <span className="value">{stage + 1}/{ORDERS.length}</span>
        </div>
        <div className={`stat${limit - used <= 1 ? ' low' : ''}`}>
          <span className="label">Скрещиваний</span>
          <span className="value">{limit - used}</span>
        </div>
        <div className="stat low">
          <span className="label">Провалы</span>
          <span className="value">{fails}/{MAX_FAILS}</span>
        </div>
      </div>

      {(shownReply || phase === 'done' || phase === 'failed') && phase !== 'intro' && phase !== 'outro' && (
        <div className="cross-bottom">
          {shownReply && (
            <div className="lab-reply cross-reply" key={reply!.id}>
              <small>Лаборант</small>
              <p>{reply!.text}</p>
            </div>
          )}
          {(phase === 'done' || phase === 'failed') && (
            <button type="button" className="cross-go" onClick={next}>
              {phase === 'done' ? 'Дальше' : fails >= MAX_FAILS ? 'Закончить' : 'Заново'}
            </button>
          )}
        </div>
      )}

      {phase === 'intro' && <LabDialog lines={INTRO} onDone={() => setPhase('play')} />}
      {phase === 'outro' && <LabDialog lines={OUTRO} startHint="Нажмите, чтобы продолжить" onDone={() => onFinish(starsFor(fails))} />}
    </div>
  )
}
