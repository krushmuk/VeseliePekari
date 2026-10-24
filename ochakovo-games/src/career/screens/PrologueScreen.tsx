import { useEffect, useMemo, useRef, useState } from 'react'
import { loadDialog } from '../dialogs'
import { CHAPTERS } from '../chapters'
import { platform, useBack } from '../../platform'
import { PlantArt } from './PlantArt'
import { ItemIcon } from './ItemIcon'
import { KeeperAvatar, StorageArt } from './StorageArt'

// Мысли героя и вступление кладовщика лежат в dialogs/пролог.txt
const LINES = loadDialog('пролог')
const THOUGHTS = LINES.filter(l => l.who === 'Мысли')
const INTRO = LINES.filter(l => l.who !== 'Мысли')

const LIMIT = 8

type Category = 'warehouse' | 'bottling' | 'techshop' | 'lab' | 'junk'

interface Item {
  id: string
  name: string
  cat: Category
}

const ITEMS: Item[] = [
  { id: 'tsd', name: 'Сканер (ТСД)', cat: 'warehouse' },
  { id: 'radio', name: 'Рация', cat: 'warehouse' },
  { id: 'thermos', name: 'Термос', cat: 'warehouse' },
  { id: 'notebook', name: 'Блокнот', cat: 'warehouse' },

  { id: 'helmet', name: 'Каска', cat: 'bottling' },
  { id: 'kvass', name: 'Бутылка кваса', cat: 'bottling' },
  { id: 'goggles', name: 'Защитные очки', cat: 'bottling' },
  { id: 'plugs', name: 'Беруши', cat: 'bottling' },

  { id: 'gear', name: 'Шестерёнка-талисман', cat: 'techshop' },
  { id: 'tablet', name: 'Планшет', cat: 'techshop' },
  { id: 'recipes', name: 'Книга рецептов', cat: 'techshop' },
  { id: 'wheat', name: 'Колосья зерна', cat: 'techshop' },

  { id: 'tube', name: 'Пробирка', cat: 'lab' },
  { id: 'microscope', name: 'Карманный микроскоп', cat: 'lab' },
  { id: 'coat', name: 'Белый халат', cat: 'lab' },
  { id: 'glasses', name: 'Очки', cat: 'lab' },

  { id: 'teddy', name: 'Плюшевый мишка', cat: 'junk' },
  { id: 'car', name: 'Игрушечная машинка', cat: 'junk' },
  { id: 'sleeping', name: 'Спальный мешок', cat: 'junk' },
  { id: 'guitar', name: 'Гитара', cat: 'junk' },
]

const CHAPTER_CATS = ['warehouse', 'bottling', 'techshop', 'lab'] as const

type ChapterCat = (typeof CHAPTER_CATS)[number]

/** «Сканер (ТСД)» → «сканер (ТСД)», аббревиатуры не трогаем */
const lower = (name: string) => (/^.[А-ЯЁ]/.test(name) ? name : name[0].toLowerCase() + name.slice(1))
const cap = (text: string) => text[0].toUpperCase() + text.slice(1)
const list = (items: Item[], sep = ', ') => items.map(i => lower(i.name)).join(sep)

// Вердикты называют вещи, которые игрок выбрал в этой категории (до трёх)
const VERDICTS: Record<ChapterCat, (mine: Item[]) => string> = {
  warehouse: m => `${cap(list(m))} — да ты у нас прирождённый кладовщик! Тебе на склад. Там нужны те, кто любит порядок.`,
  bottling: m => `${cap(list(m))} — да ты у нас настоящий розливщик! Тебе в цех розлива, там без этого никуда. И квас бери, он тебе там понадобится.`,
  techshop: m => `${cap(list(m))} — да ты у нас прирождённый инженер! По тебе техпроцессы плачут. Пошли туда.`,
  lab: m => `${cap(list(m))} — да ты у нас будущий учёный! В лаборатории такие нужны. Ну что, пошли?`,
}

const mixedVerdict = (a: Item, b: Item) =>
  `${cap(list([a, b]))} — да ты у нас парень непростой! Универсал. Сам выбирай, куда пойдёшь.`
const junkVerdict = (m: Item[]) =>
  `${cap(list(m))} — да ты у нас на дачу собрался! Ты на завод пришёл или отдыхать? Ладно, иди выбирай, куда тебя такого пристроить.`

const JUNK_REPLY = 'Ты куда, это мои вещи, я тут живу!'
const SAME_REPLY = 'Ого! Да ты у нас целеустремлённый. Всё под одну гребёнку берёшь. Ну, допустим.'

type Phase = 'phone' | 'plant' | 'thoughts' | 'intro' | 'pick' | 'verdict' | 'offer'

interface Props {
  /** Пролог пройден: открываем главы; если игрок согласился на рекомендацию — сразу эту главу */
  onDone: (chapterId?: string) => void
  onExit?: () => void
}

function shuffled<T>(list: T[]): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const DAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота']
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

/** Экран блокировки смартфона: статус-бар, часы, уведомление, свайп вверх (или нажатие) — дальше */
function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [now, setNow] = useState(() => new Date())
  const startY = useRef<number | null>(null)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')

  return (
    <div
      className="screen prologue prologue-dark prologue-px lock"
      onPointerDown={e => { startY.current = e.clientY }}
      onPointerUp={e => {
        if (startY.current !== null && startY.current - e.clientY > 40) onUnlock()
        startY.current = null
      }}
      onClick={onUnlock}
    >
      <div className="lock-status" aria-hidden="true">
        <span>{hh}:{mm}</span>
        <span className="lock-icons">
          <svg viewBox="0 0 12 10" width="18" height="15" shapeRendering="crispEdges" fill="currentColor">
            <rect x="0" y="7" width="2" height="3" /><rect x="3" y="5" width="2" height="5" />
            <rect x="6" y="3" width="2" height="7" /><rect x="9" y="0" width="2" height="10" />
          </svg>
          <svg viewBox="0 0 12 10" width="18" height="15" shapeRendering="crispEdges" fill="currentColor">
            <rect x="4" y="8" width="4" height="2" /><rect x="2" y="5" width="8" height="2" />
            <rect x="0" y="2" width="12" height="2" />
          </svg>
          <svg viewBox="0 0 16 8" width="26" height="13" shapeRendering="crispEdges" fill="currentColor">
            <path d="M0 0h14v8H0z M1 1v6h12V1z" fillRule="evenodd" />
            <rect x="2" y="2" width="8" height="4" /><rect x="14" y="2" width="2" height="4" />
          </svg>
        </span>
      </div>

      <div className="lock-clock">
        <div className="lock-date">{DAYS[now.getDay()]}, {now.getDate()} {MONTHS[now.getMonth()]}</div>
        <div className="lock-time">{hh}:{mm}</div>
      </div>

      <div className="prologue-phone">
        <small>Сообщение</small>
        <p>Вы приняты на стажировку в Очаково. Завтра в 9:00. Не опаздывайте!</p>
      </div>

      <div className="lock-swipe" aria-label="Смахните вверх">
        <span className="lock-arrow" />
        <span className="lock-arrow" />
        <span className="lock-hint">Смахни вверх</span>
      </div>
    </div>
  )
}

/** Пролог: уведомление → завод → кладовщик → выбор 8 вещей → вердикт, затем открывается выбор глав */
export function PrologueScreen({ onDone, onExit }: Props) {
  const [phase, setPhase] = useState<Phase>('phone')
  const [step, setStep] = useState(0)
  const [picked, setPicked] = useState<string[]>([])
  const [reply, setReply] = useState('')
  const [grid, setGrid] = useState(() => shuffled(ITEMS))
  useBack(onExit ?? null)

  const tap = () => platform.haptic('tap')

  const counts = useMemo(() => {
    const c: Record<Category, number> = { warehouse: 0, bottling: 0, techshop: 0, lab: 0, junk: 0 }
    for (const id of picked) c[ITEMS.find(i => i.id === id)!.cat]++
    return c
  }, [picked])

  function toggle(item: Item) {
    tap()
    if (picked.includes(item.id)) {
      setPicked(picked.filter(id => id !== item.id))
      return
    }
    if (picked.length >= LIMIT) return
    const next = [...picked, item.id]
    setPicked(next)
    const n = { ...counts, [item.cat]: counts[item.cat] + 1 }
    if (item.cat === 'junk') setReply(JUNK_REPLY)
    else if (n[item.cat] === 4) setReply(SAME_REPLY)
    else if (next.length === LIMIT && CHAPTER_CATS.every(c => n[c] > 0)) {
      const each = CHAPTER_CATS.map(c => lower(next.map(id => ITEMS.find(i => i.id === id)!).find(i => i.cat === c)!.name))
      setReply(`${cap(each.slice(0, 3).join(', '))} — да ты у нас за всех отдуваться собрался? Ладно, универсал, посмотрим на тебя.`)
    }
  }

  const mine = (cat: Category) => picked.map(id => ITEMS.find(i => i.id === id)!).filter(i => i.cat === cat)

  /** Профессия, которую рекомендуем: больше всего вещей; null — ничья или перевес бесполезного */
  const maxCount = Math.max(...CHAPTER_CATS.map(c => counts[c]))
  const top = CHAPTER_CATS.filter(c => counts[c] === maxCount)
  const best = top.length === 1 && counts.junk <= maxCount ? top[0] : null

  function verdict(): string {
    if (counts.junk > maxCount) return junkVerdict(mine('junk').slice(0, 2))
    if (best) return VERDICTS[best](mine(best).slice(0, 2))
    // Ничья: по одному выбранному предмету от двух лидирующих категорий
    return mixedVerdict(mine(top[0])[0], mine(top[1])[0])
  }

  if (phase === 'phone') {
    return <LockScreen onUnlock={() => { tap(); setPhase('plant') }} />
  }

  if (phase === 'plant' || phase === 'thoughts') {
    const line = phase === 'thoughts' ? THOUGHTS[step] : null
    return (
      <div
        className="screen prologue prologue-dark prologue-px prologue-plantscene"
        onClick={() => {
          tap()
          if (phase === 'plant') setPhase('thoughts')
          else if (step < THOUGHTS.length - 1) setStep(step + 1)
          else { setStep(0); setPhase('intro') }
        }}
      >
        <PlantArt />
        <div className="plant-caption">
          {line && <p className="prologue-thought">{line.text}</p>}
          <span className="prologue-tap">Нажми, чтобы продолжить</span>
        </div>
      </div>
    )
  }

  if (phase === 'intro') {
    const line = INTRO[step]
    return (
      <div className="screen dialog-screen prologue-px">
        <div className="dialog-stage">
          <StorageArt />
        </div>
        <div className="dialog-bubble">
          <small>{line.who}</small>
          <p>{line.text}</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              tap()
              if (step < INTRO.length - 1) setStep(step + 1)
              else {
                setGrid(shuffled(ITEMS))
                setPhase('pick')
              }
            }}
          >
            {step === INTRO.length - 1 ? 'К шкафу' : 'Дальше'}
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'pick') {
    return (
      <div className="screen prologue prologue-pick prologue-px">
        <div className="prologue-keeper">
          <KeeperAvatar />
          <div className="prologue-keeper-text">
            <small>Кладовщик</small>
            <p>{reply || 'Выбирай с умом. Не больше 8 вещей.'}</p>
          </div>
        </div>
        <div className="prologue-grid">
          {grid.map(item => (
            <button
              key={item.id}
              type="button"
              className={`prologue-item${picked.includes(item.id) ? ' on' : ''}`}
              onClick={() => toggle(item)}
              aria-pressed={picked.includes(item.id)}
            >
              <span className="prologue-item-icon"><ItemIcon id={item.id} /></span>
              <span className="prologue-item-name">{item.name}</span>
            </button>
          ))}
        </div>
        <div className="prologue-footer">
          <b>
            Выбрано: {picked.length}/{LIMIT}
          </b>
          <button
            type="button"
            className="btn btn-primary"
            disabled={picked.length !== LIMIT}
            onClick={() => {
              tap()
              setPhase('verdict')
            }}
          >
            Готово
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'offer' && best) {
    const chapter = CHAPTERS.find(c => c.id === best)!
    return (
      <div className="screen prologue prologue-px">
        <div className="prologue-offer">
          <small>Совет кладовщика</small>
          <h2>Попробуй себя в роли «{chapter.title}»</h2>
          <button type="button" className="btn btn-primary" onClick={() => onDone(best)}>
            Продолжить
          </button>
          <button type="button" className="btn-text" onClick={() => onDone()}>
            Выбрать самому
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen dialog-screen prologue-px">
      <div className="dialog-stage">
        <StorageArt />
      </div>
      <div className="dialog-bubble">
        <small>Кладовщик</small>
        <p>{verdict()}</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            tap()
            if (best) setPhase('offer')
            else onDone()
          }}
        >
          {best ? 'Дальше' : 'Выбрать профессию'}
        </button>
      </div>
    </div>
  )
}