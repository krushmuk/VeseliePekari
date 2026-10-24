import Phaser from 'phaser'
import { drawBackdrop, drawText, textWidth } from './art'
import { APPLE_SLOT_X, APPLE_SLOT_Y, FIELD, MACHINE, ORDER_NOTE, TAG } from './config'
import { appleColor, drawApple, drawButton, drawMachine, drawNote, drawSad, drawTag } from './crossArt'
import { fmt, type Apple, type Order, type Verdict } from './crossRules'

// Сцена уровня «Скрещивание»: только рисует то, что ей дали (render), и сообщает о нажатиях.
// Правила и состояние живут в CrossLevel (React).

/** Всё, что нужно показать на сцене */
export interface CrossView {
  order: Order
  pool: Apple[]
  slots: [Apple | null, Apple | null]
  result: { apple: Apple; verdict: Verdict } | null
  canCross: boolean
}

export interface CrossBridge {
  onReady: (scene: CrossScene) => void
  onPick: (apple: Apple) => void
  onClearSlot: (i: 0 | 1) => void
  onCross: () => void
}

const FONT = { fontFamily: 'monospace', fontSize: '7px' }
const GOLD = 0xffd24a
const INK = 0x2b3236

export class CrossScene extends Phaser.Scene {
  private bridge!: CrossBridge
  private dyn?: Phaser.GameObjects.Container
  private view: CrossView | null = null
  private known = new Set<string>()
  private ready = false
  private sig = ''

  constructor() {
    super('cross')
  }

  init(data: { bridge: CrossBridge }) {
    this.bridge = data.bridge
    this.dyn = undefined
    this.view = null
    this.known = new Set()
    this.ready = false
    this.sig = ''
  }

  create() {
    drawBackdrop(this.add.graphics())
    drawMachine(this.add.graphics())
    this.fit()
    this.scale.on('resize', this.fit, this)
    this.events.once('shutdown', () => this.scale.off('resize', this.fit, this))
    this.ready = true
    this.bridge.onReady(this)
    if (this.view) this.render(this.view)
  }

  // Камера на весь экран, поле сдвинуто ниже шапки интерфейса — как на первом уровне
  /** Строка на бирке: если шире бирки — сжимается, чтобы не вылезать за границы */
  private tagText(cx: number, y: number, str: string, color: string) {
    const t = this.add.text(cx, y, str, { ...FONT, color }).setOrigin(0.5, 0).setResolution(4)
    const max = TAG.w - 12
    if (t.width > max) t.setScale(max / t.width)
    return t
  }

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

  /** Перерисовать подвижную часть: кнопку, яблоки в чашах, результат и яблоки на столе */
  render(view: CrossView) {
    this.view = view
    if (!this.ready) return
    const sig = JSON.stringify([view.order, view.pool.map(a => a.id), view.slots.map(a => a?.id), view.result && [view.result.apple.id, view.result.verdict], view.canCross])
    if (sig === this.sig) return
    this.sig = sig
    this.tweens.killAll()
    this.dyn?.destroy()
    const dyn = (this.dyn = this.add.container(0, 0))
    const { slot, bowlL, bowlR, bowlY, button } = MACHINE
    const zone = (cx: number, cy: number, w: number, h: number, fn: () => void) => {
      const z = this.add.zone(cx, cy, w, h).setInteractive({ useHandCursor: true })
      z.on('pointerdown', fn)
      dyn.add(z)
    }

    // кнопка
    const bg = this.add.graphics()
    drawButton(bg, view.canCross)
    dyn.add(bg)
    zone(button.cx, button.cy, 52, 18, () => this.bridge.onCross())

    // яблоки в чашах: полного размера, лежат поверх кромки; нажатие вынимает яблоко
    ;([bowlL, bowlR] as const).forEach((cx, i) => {
      zone(cx, bowlY - 6, 40, 28, () => this.bridge.onClearSlot(i as 0 | 1))
      const a = view.slots[i]
      if (!a) return
      const g = this.add.graphics()
      drawApple(g, cx, bowlY - 9, appleColor(a.sweet, a.sour))
      // подпись показателей на тёмной плашке перед чашей
      const label = `С${fmt(a.sweet)} К${fmt(a.sour)}`
      const lw = textWidth(label)
      g.fillStyle(0x2f373c, 0.9)
      g.fillRect(Math.round(cx - lw / 2) - 2, bowlY - 2, lw + 4, 9)
      drawText(g, label, Math.round(cx - lw / 2), bowlY, 0xf6f3ea)
      dyn.add(g)
    })

    // результат в нише
    if (view.result) this.drawResult(dyn, view.result, slot)

    // листок с заказом на корпусе машины
    const note = ORDER_NOTE
    const ng = this.add.graphics()
    drawNote(ng)
    dyn.add(ng)
    const text = (x: number, y: number, str: string, color: string) =>
      dyn.add(this.add.text(x, y, str, { ...FONT, fontSize: '8px', color }).setOrigin(0, 0).setResolution(4))
    text(note.x + 7, note.y + 3, 'ЗАКАЗ', '#cd004b')
    text(note.x + 7, note.y + 12, `С ${fmt(view.order.sweet)}`, '#4a443b')
    text(note.x + 7, note.y + 20, `К ${fmt(view.order.sour)}`, '#4a443b')

    // яблоки на столе с бирками
    view.pool.forEach((a, n) => {
      const cx = APPLE_SLOT_X[n % 3]
      const top = APPLE_SLOT_Y[Math.floor(n / 3)]
      const g = this.add.graphics()
      g.fillStyle(0x6f8590, 0.35)
      g.fillRect(cx - 7, top + 15, 16, 2)
      drawApple(g, cx, top + 8, appleColor(a.sweet, a.sour), false, true)
      drawTag(g, cx, top + 17)
      dyn.add(g)
      const label = [
        this.tagText(cx, top + 18, a.name, '#2b3236'),
        this.tagText(cx, top + 25, `С ${fmt(a.sweet)}`, '#a8541c'),
        this.tagText(cx, top + 32, `К ${fmt(a.sour)}`, '#3f7f2c'),
      ]
      dyn.add(label)
      zone(cx, top + 20, TAG.w, 42, () => this.bridge.onPick(a))
      // новый гибрид появляется «с хлопком»
      if (!this.known.has(a.id)) {
        this.known.add(a.id)
        this.tweens.add({ targets: [g, ...label], alpha: { from: 0, to: 1 }, duration: 250 })
      }
    })
  }

  private drawResult(dyn: Phaser.GameObjects.Container, r: NonNullable<CrossView['result']>, slot: typeof MACHINE.slot) {
    const { apple, verdict } = r
    const perfect = verdict === 'perfect'
    const g = this.add.graphics()
    const ax = slot.cx
    const cy = slot.y + 16
    const lx = slot.x + 3
    if (perfect) {
      g.fillStyle(GOLD, 0.35)
      g.fillRect(ax - 12, cy - 12, 24, 24)
      g.fillRect(ax - 10, cy - 10, 20, 20)
      drawText(g, 'ШЕДЕВР!', lx, slot.y + 2, 0xa87f14)
      this.tweens.add({ targets: g, alpha: 0.75, duration: 450, yoyo: true, repeat: -1 })
    }
    drawApple(g, ax, cy, appleColor(apple.sweet, apple.sour), !perfect, true)
    if (!perfect) drawSad(g, lx, slot.y + 3)
    const fmtN = (n: number) => String(n).replace('.', ',')
    drawText(g, `С${fmtN(apple.sweet)}`, lx, slot.y + 14, INK)
    drawText(g, `К${fmtN(apple.sour)}`, lx, slot.y + 22, INK)
    dyn.add(g)
  }
}
