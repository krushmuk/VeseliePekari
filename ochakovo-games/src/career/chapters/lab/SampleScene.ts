import Phaser from 'phaser'
import { sfx } from '../../../games/shared/sfx'
import { platform } from '../../../platform'
import { drawBackdrop, drawGlass, drawLabel, drawPlate, type LabelTag } from './art'
import { ETALON_BOX, FIELD, LABEL, MAX_ERRORS, SAMPLE_BOX, SLOT_X, SLOT_Y, TIME_LIMIT } from './config'
import { ETALON, REPLIES, RIGHT, SHADES, makeCandidates, type Candidate, type Sample } from './rules'

// Сцена уровня «Эталон». Рисунки стакана, этикетки, подставки и стола — в art.ts, здесь только поведение.
// Состояние (найдено, ошибки, время) живёт здесь, React только показывает его в шапке.

export interface SampleHud {
  found: number
  errors: number
  /** Осталось секунд, округлено вверх */
  timeLeft: number
}

export interface SampleResult {
  won: boolean
  errors: number
}

/** Связь сцены с React */
export interface SampleBridge {
  onReady: (scene: SampleScene) => void
  onHud: (hud: SampleHud) => void
  /** Реплика лаборанта после ошибки */
  onReply: (text: string) => void
  onEnd: (result: SampleResult) => void
}

interface Glass {
  box: Phaser.GameObjects.Container
  outline: Phaser.GameObjects.Rectangle
  bubbles: Phaser.GameObjects.Rectangle[]
  sample: Sample
  w: number
  h: number
  /** Сдвиг фазы пузырьков, чтобы стаканы не всплывали в такт */
  offset: number
  candidate?: Candidate
  done: boolean
}

const GREEN = 0xa6f05c
const RED = 0xff3d7f
/** Пауза после последнего действия до конца уровня, мс */
const END_DELAY_MS = 900

export class SampleScene extends Phaser.Scene {
  private bridge!: SampleBridge
  private running = false
  private glasses: Glass[] = []
  private etalon!: Glass
  private time_ = 0
  private left = TIME_LIMIT
  private found = 0
  private errors = 0
  private lastHud = ''

  constructor() {
    super('sample')
  }

  init(data: { bridge: SampleBridge }) {
    this.bridge = data.bridge
    this.running = true
    this.glasses = []
    this.time_ = 0
    this.left = TIME_LIMIT
    this.found = 0
    this.errors = 0
    this.lastHud = ''
  }

  create() {
    const { cx, y, w, h } = ETALON_BOX
    drawBackdrop(this.add.graphics(), y + h + 10)
    drawPlate(this.add.graphics(), cx, y + h)
    this.etalon = this.addGlass(ETALON, cx, y + h / 2, w, h)

    const slots = Phaser.Utils.Array.Shuffle(SLOT_Y.flatMap(sy => SLOT_X.map(sx => [sx, sy])))
    // у каждой пробы свой номер на этикетке, партия — из экспериментального цеха
    const nums = Phaser.Utils.Array.Shuffle(Array.from({ length: slots.length }, (_, i) => i + 1))
    makeCandidates().forEach((c, i) => {
      const [sx, sy] = slots[i]
      const tag = { num: nums[i], batch: Phaser.Math.Between(1, 9) }
      const g = this.addGlass(c.sample, sx, sy + SAMPLE_BOX.h / 2, SAMPLE_BOX.w, SAMPLE_BOX.h, tag)
      g.candidate = c
      g.box.setSize(SAMPLE_BOX.w, SAMPLE_BOX.h).setInteractive({ useHandCursor: true })
      g.box.on('pointerdown', () => this.pick(g))
      this.glasses.push(g)
    })

    this.fit()
    this.scale.on('resize', this.fit, this)
    this.events.once('shutdown', () => this.scale.off('resize', this.fit, this))

    this.emitHud()
    this.bridge.onReady(this)
  }

  /** Пауза оболочки */
  setPaused(paused: boolean) {
    if (paused) this.scene.pause()
    else this.scene.resume()
  }

  update(_: number, delta: number) {
    const dt = delta / 1000
    this.time_ += dt
    this.moveBubbles(this.etalon)
    this.glasses.forEach(g => !g.done && this.moveBubbles(g))
    if (!this.running) return
    this.left = Math.max(0, this.left - dt)
    this.emitHud()
    if (this.left === 0) this.end(false)
  }

  // Камера на весь экран, поле сдвинуто ниже шапки интерфейса — как в других уровнях с шапкой
  private fit() {
    const cam = this.cameras.main
    const canvas = this.game.canvas
    const rect = canvas.getBoundingClientRect()
    const hud = canvas.parentElement?.parentElement?.querySelector('.bottling-hud')
    const k = rect.height > 0 ? canvas.height / rect.height : 1
    const top = hud ? Math.max(0, Math.ceil((hud.getBoundingClientRect().bottom - rect.top + 6) * k)) : 0
    const zoom = Math.max(1, Math.floor(Math.min(this.scale.width / FIELD.minW, (this.scale.height - top) / FIELD.minH)))
    cam.setZoom(zoom)
    cam.centerOn(FIELD.w / 2, FIELD.h / 2 - top / (2 * zoom))
  }

  private addGlass(sample: Sample, cx: number, cy: number, w: number, h: number, tag?: LabelTag): Glass {
    const body = drawGlass(this.add.graphics(), w, h, SHADES[sample.shade])
    const bubbles = Array.from({ length: sample.bubbles }, () => this.add.rectangle(0, 0, 2, 2, 0xffffff))
    // контур невидим, пока проба не выбрана: зелёный — верно, красный — ошибка
    const outline = this.add.rectangle(0, 0, w, h)
    const parts: Phaser.GameObjects.GameObject[] = [body, ...bubbles]
    if (tag) parts.push(this.addLabel(w, h, tag))
    const box = this.add.container(cx, cy, [...parts, outline])
    return { box, outline, bubbles, sample, w, h, offset: Math.random(), done: false }
  }

  /** Этикетка перекрывает часть стакана: прижата к левому или правому краю, высота места случайная */
  private addLabel(w: number, h: number, tag: LabelTag) {
    const x = Math.random() < 0.5 ? -w / 2 : w / 2 - LABEL.w
    const y = Phaser.Math.Between(-h / 2 + 2, h / 2 - 3 - LABEL.h)
    return drawLabel(this.add.graphics().setPosition(x, y), LABEL.w, LABEL.h, tag)
  }

  /** Пузырёк поднимается ото дна до поверхности за period секунд; как всплыл, снизу сразу идёт следующий */
  private moveBubbles(g: Glass) {
    const { bubbles, sample, w, h } = g
    const n = bubbles.length
    const inner = h - 6
    bubbles.forEach((b, i) => {
      const p = (this.time_ / sample.period + g.offset + i / n) % 1
      const lane = ((i * 5) % (n + 2)) / (n + 1)
      b.setPosition(Math.round(-w / 2 + 3 + lane * (w - 6)), Math.round(h / 2 - 3 - p * inner))
    })
  }

  // ---------- Выбор пробы ----------

  private pick(g: Glass) {
    if (!this.running || g.done || !g.candidate) return
    if (g.candidate.diff === null) this.right(g)
    else this.wrong(g, g.candidate.diff)
  }

  private right(g: Glass) {
    g.done = true
    g.box.disableInteractive()
    g.outline.setStrokeStyle(2, GREEN)
    this.found++
    sfx.tone(523, 0.1, 'triangle', 0.06)
    sfx.tone(784, 0.14, 'triangle', 0.06, 0.1)
    platform.haptic('success')
    this.tweens.add({ targets: g.box, alpha: 0, delay: 600, duration: 250, onComplete: () => g.box.setVisible(false) })
    this.emitHud()
    if (this.found === RIGHT) this.end(true)
  }

  private wrong(g: Glass, diff: NonNullable<Candidate['diff']>) {
    this.errors++
    sfx.tone(140, 0.25, 'sawtooth', 0.06)
    platform.haptic('error')
    g.outline.setStrokeStyle(2, RED).setFillStyle(RED, 0.3)
    const x = g.box.x
    this.tweens.add({
      targets: g.box,
      x: x + 2,
      duration: 40,
      yoyo: true,
      repeat: 5,
      onComplete: () => {
        g.box.x = x
        if (!g.done) g.outline.setStrokeStyle().setFillStyle()
      },
    })
    this.bridge.onReply(REPLIES[diff])
    this.emitHud()
    if (this.errors >= MAX_ERRORS) this.end(false)
  }

  private end(won: boolean) {
    if (!this.running) return
    this.running = false
    this.time.delayedCall(END_DELAY_MS, () => this.bridge.onEnd({ won, errors: this.errors }))
  }

  private emitHud() {
    const hud: SampleHud = { found: this.found, errors: this.errors, timeLeft: Math.ceil(this.left) }
    const key = `${hud.found}|${hud.errors}|${hud.timeLeft}`
    if (key === this.lastHud) return
    this.lastHud = key
    this.bridge.onHud(hud)
  }
}
