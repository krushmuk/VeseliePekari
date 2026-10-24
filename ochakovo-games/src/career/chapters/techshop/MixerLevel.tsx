import { useCallback, useEffect, useRef, useState } from 'react'
import type { LevelProps } from '../../chapters'
import { loadDialog, type DialogLine } from '../../dialogs'
import { platform } from '../../../platform'
import { sfx } from '../../../games/shared/sfx'
import { PauseIcon } from '../../icons'
import { LEVELS, MAX_ERRORS, randomIngredient, RIGHT_REPLY, starsFor, TIME_LIMIT, type Ingredient } from './rules'
import { ForemanPortrait, IngredientIcon, Vat } from './TechArt'
import { beltUrls, wallUrl } from './techArt'
import '../bottling/bottling.css'
import './tech.css'

const DIALOGS = LEVELS.map(l => ({ intro: loadDialog(l.intro), outro: loadDialog(l.outro) }))
const REPLY_MS = 3500
const LAMP_MS = 1200
/** Сколько секунд ингредиент горит красным после нажатия */
const BURN_S = 0.3
/** Высота плашки (обычной и тесной, для двух лент) и запас вокруг неё для нажатия, px */
const ITEM_H = 56
const ITEM_H_COMPACT = 48
const HIT_MARGIN = 24

interface Item {
  key: number
  /** Номер ленты (и смесителя) */
  line: number
  ing: Ingredient
  /** Положение на ленте: 0 — вход, 1 — смеситель */
  p: number
  /** burn — выброшен в утиль, догорает */
  burn: number | null
}

type Phase = 'intro' | 'play' | 'outro' | 'lost'

/** Диалог начальника смены: по реплике на нажатие. С портретом */
function ShiftDialog({ lines, hint, onDone }: { lines: DialogLine[]; hint: string; onDone: () => void }) {
  const [part, setPart] = useState(0)
  const last = part >= lines.length - 1
  return (
    <div
      className="bottling-intro press-shop"
      onClick={() => {
        platform.haptic('tap')
        if (last) onDone()
        else setPart(part + 1)
      }}
    >
      <div className="bottling-intro-bubble" key={part}>
        <small>{lines[part].who}</small>
        <p>{lines[part].text}</p>
        <span className="bottling-intro-hint">{last ? hint : 'Нажмите, чтобы продолжить'}</span>
      </div>
      <div className="bottling-intro-char" aria-label={lines[part].who}>
        <ForemanPortrait />
      </div>
    </div>
  )
}

/** Уровни «Смеситель» (1) и «Два смесителя» (2): по лентам к чанам едут ингредиенты, лишние по технологической карте нужно выбрасывать нажатием */
export default function MixerLevel({ levelIndex, paused, onFinish, onPause }: LevelProps) {
  const cfg = LEVELS[Math.min(levelIndex, LEVELS.length - 1)]
  const { intro: INTRO, outro: OUTRO } = DIALOGS[Math.min(levelIndex, LEVELS.length - 1)]
  const itemH = cfg.compact ? ITEM_H_COMPACT : ITEM_H
  const [wall] = useState(wallUrl)
  const [belt] = useState(beltUrls)
  const [phase, setPhase] = useState<Phase>(INTRO.length ? 'intro' : 'play')
  const [items, setItems] = useState<Item[]>([])
  const [mixed, setMixed] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT)
  const [errors, setErrors] = useState(0)
  const [lamps, setLamps] = useState<boolean[]>(() => cfg.lines.map(() => false))
  const [reply, setReply] = useState<{ text: string; id: number } | null>(null)

  const frozen = paused || phase !== 'play'
  const frozenRef = useRef(frozen)
  const onFinishRef = useRef(onFinish)
  const pipeRefs = useRef<(HTMLDivElement | null)[]>([])
  const lampTimers = useRef<number[]>([])
  const itemsRef = useRef<Item[]>([])
  const elapsedRef = useRef(0)
  const keyRef = useRef(0)
  const mixedRef = useRef(0)
  const errorsRef = useRef(0)

  useEffect(() => {
    onFinishRef.current = onFinish
  }, [onFinish])

  useEffect(() => {
    frozenRef.current = frozen
  }, [frozen])

  /** Красная лампа «Брак» над нужным смесителем гаснет сама */
  const flashLamp = useCallback((line: number) => {
    setLamps(l => l.map((on, i) => (i === line ? true : on)))
    window.clearTimeout(lampTimers.current[line])
    lampTimers.current[line] = window.setTimeout(() => setLamps(l => l.map((on, i) => (i === line ? false : on))), LAMP_MS)
  }, [])

  const say = useCallback((text: string) => setReply({ text, id: Date.now() }), [])

  const addError = useCallback((text: string) => {
    errorsRef.current += 1
    setErrors(errorsRef.current)
    say(text)
    if (errorsRef.current >= MAX_ERRORS) {
      setPhase('lost')
      platform.haptic('error')
    }
  }, [say])

  // Игровой цикл: сдвиг ингредиентов, подача новых, проверка конца
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const step = (now: number) => {
      raf = requestAnimationFrame(step)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (frozenRef.current) return

      elapsedRef.current += dt
      const progress = Math.min(1, elapsedRef.current / TIME_LIMIT)
      setTimeLeft(Math.max(0, Math.ceil(TIME_LIMIT - elapsedRef.current)))
      const speed = cfg.speedAt(progress)
      const next: Item[] = []
      for (const it of itemsRef.current) {
        if (it.burn !== null) {
          const burn = it.burn + dt
          if (burn < BURN_S) next.push({ ...it, burn })
          continue
        }
        const p = it.p + speed * dt
        if (p < 1) {
          next.push({ ...it, p })
        } else if (it.ing.right) {
          mixedRef.current += 1
          setMixed(mixedRef.current)
          sfx.tone(330, 0.08, 'triangle', 0.04)
        } else {
          sfx.tone(180, 0.5, 'sawtooth', 0.07)
          sfx.tone(240, 0.5, 'sawtooth', 0.07, 0.25)
          flashLamp(it.line)
          addError(it.ing.reply ?? 'Ты куда смотришь?! Это не по карте!')
        }
      }
      // На каждой ленте новый ингредиент выезжает, когда на входе освободилось место
      cfg.lines.forEach((line, n) => {
        const entrance = next.reduce((m, it) => (it.line === n ? Math.min(m, it.p) : m), 1)
        if (entrance >= cfg.gapAt(progress)) {
          next.push({ key: keyRef.current++, line: n, ing: randomIngredient(line.pool), p: 0, burn: null })
        }
      })
      itemsRef.current = next
      setItems(next)

      if (elapsedRef.current >= TIME_LIMIT && errorsRef.current < MAX_ERRORS) {
        frozenRef.current = true
        sfx.tone(523, 0.1, 'triangle', 0.06)
        sfx.tone(784, 0.14, 'triangle', 0.06, 0.1)
        setPhase('outro')
      }
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [addError, cfg, flashLamp])

  const throwOut = (key: number) => {
    if (frozenRef.current) return
    const it = itemsRef.current.find(i => i.key === key && i.burn === null)
    if (!it) return
    itemsRef.current = itemsRef.current.map(i => (i.key === key ? { ...i, burn: 0 } : i))
    sfx.init()
    if (it.ing.right) {
      sfx.tone(140, 0.25, 'sawtooth', 0.06)
      platform.haptic('error')
      addError(RIGHT_REPLY)
    } else {
      sfx.tone(880, 0.08, 'square', 0.06)
      platform.haptic('tap')
    }
  }

  // Нажатие ловит вся лента: берётся плашка, ближайшая к пальцу по высоте (с запасом), так в движущуюся цель попасть проще
  const onPipeDown = (line: number) => (e: React.PointerEvent) => {
    const pipe = pipeRefs.current[line]
    if (!pipe) return
    e.preventDefault()
    const rect = pipe.getBoundingClientRect()
    const y = e.clientY - rect.top
    let best: Item | null = null
    let bestDist = HIT_MARGIN
    for (const it of itemsRef.current) {
      if (it.line !== line || it.burn !== null) continue
      const center = it.p * (rect.height - itemH) + itemH / 2
      const dist = Math.max(0, Math.abs(y - center) - itemH / 2)
      if (dist <= bestDist) {
        best = it
        bestDist = dist
      }
    }
    if (best) throwOut(best.key)
  }

  // Реплика гаснет сама
  useEffect(() => {
    if (!reply) return
    const t = setTimeout(() => setReply(null), REPLY_MS)
    return () => clearTimeout(t)
  }, [reply])

  // Провал: даём прочитать реплику и отдаём результат оболочке
  useEffect(() => {
    if (phase !== 'lost') return
    const t = setTimeout(() => onFinishRef.current(0), 2000)
    return () => clearTimeout(t)
  }, [phase])

  return (
    <div className={`bottling tech${cfg.compact ? ' tech-two' : ''}${frozen ? ' frozen' : ''}`} style={{ '--wall': wall, '--belt': belt.belt, '--rail-l': belt.railL, '--rail-r': belt.railR } as React.CSSProperties}>
      <div className="bottling-hud hud-lab">
        <button type="button" className="bottling-pause" onClick={onPause} disabled={paused} aria-label="Пауза">
          <PauseIcon />
        </button>
        <div className="stat">
          <span className="label">В чане</span>
          <span className="value">{mixed}</span>
        </div>
        <div className={`stat${timeLeft <= 10 ? ' low' : ''}`}>
          <span className="label">Время</span>
          <span className="value">{timeLeft}</span>
        </div>
        <div className="stat low">
          <span className="label">Ошибки</span>
          <span className="value">
            {errors}/{MAX_ERRORS}
          </span>
        </div>
      </div>

      <div className="tech-field">
        {cfg.lines.map((line, n) => (
          <div className="tech-line" key={n}>
            <div className="tech-card">
              <small>{cfg.compact ? line.recipe : 'Технологическая карта'}</small>
              <div className="tech-card-body">
                {!cfg.compact && <b>{line.recipe}</b>}
                <ul>
                  {line.pool.filter(i => i.right).map(i => (
                    <li key={i.id}>
                      <span className="tech-icon">
                        <IngredientIcon id={i.id} />
                      </span>
                      {cfg.compact ? i.short : i.name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="tech-pipe" ref={el => { pipeRefs.current[n] = el }} onPointerDown={onPipeDown(n)}>
              {items
                .filter(it => it.line === n)
                .map(it => (
                  <div
                    key={it.key}
                    className={`tech-item${it.burn !== null ? ' burn' : ''}`}
                    style={{ top: `calc(${it.p} * (100% - ${itemH}px))` }}
                  >
                    <span className="tech-icon">
                      <IngredientIcon id={it.ing.id} />
                    </span>
                    {it.ing.name}
                  </div>
                ))}
            </div>

            <div className="tech-mixer">
              <Vat bad={lamps[n]} />
              <div className={`tech-lamp${lamps[n] ? ' on' : ''}`}>
                <i />
                <span>Брак</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {reply && phase !== 'intro' && phase !== 'outro' && (
        <div className="tech-reply" key={reply.id}>
          <small>Начальник смены</small>
          <p>{reply.text}</p>
        </div>
      )}

      {phase === 'intro' && <ShiftDialog lines={INTRO} hint="Нажмите, чтобы начать" onDone={() => setPhase('play')} />}
      {phase === 'outro' && (
        <ShiftDialog
          lines={OUTRO}
          hint="Нажмите, чтобы продолжить"
          onDone={() => onFinish(starsFor(true, errorsRef.current))}
        />
      )}
    </div>
  )
}
