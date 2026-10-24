import Phaser from 'phaser'
import { sfx } from '../../../games/shared/sfx'
import { platform } from '../../../platform'
import { drawRoom, BOX_COLORS } from './art'
import { FIELD } from './config'
import { MEMORY, dealCodes } from './memoryRules'
import { SHELF, boxPos, drawShelf, paintMemoryBox, randomBars } from './memoryArt'

// Сцена уровня «Сверка». Графика — в memoryArt.ts, здесь только коробки и порядок открытия.
// Состояние — у каждой коробки: закрыта, открыта (показан код) или снята со стеллажа.

export interface MemoryHud {
  /** Найдено пар и сколько всего */
  pairs: number
  /** Сколько раз открыли две коробки с разными кодами */
  mistakes: number
  /** Сколько секунд идёт сверка (без пауз и диалога) */
  seconds: number
}

export interface MemoryResult {
  seconds: number
}

/** Связь сцены с React */
export interface MemoryBridge {
  onReady: (scene: MemoryScene) => void
  onHud: (hud: MemoryHud) => void
  onEnd: (result: MemoryResult) => void
}

interface Card {
  code: string
  color: number
  /** Штрихкод на закрытой коробке: на код не влияет */
  bars: boolean[]
  open: boolean
  gone: boolean
  g: Phaser.GameObjects.Graphics
  text: Phaser.GameObjects.Text
  zone: Phaser.GameObjects.Zone
}

/** Сколько видны две открытые коробки с разными кодами и с одинаковыми, мс */
const MISS_MS = 1000
const MATCH_MS = 350
/** Пауза после последней пары перед концом уровня, мс */
const WIN_DELAY_MS = 1000

export class MemoryScene extends Phaser.Scene {
  private bridge!: MemoryBridge
  private running = false
  private cards: Card[] = []
  private first: Card | null = null
  /** Две коробки открыты и ждут решения: нажатия не принимаются */
  private busy = false
  private pairs = 0
  private mistakes = 0
  /** Прошедшее время, мс: считается в update, поэтому на паузе стоит */
  private elapsed = 0
  private msg!: Phaser.GameObjects.Text
  private msgTimer?: Phaser.Time.TimerEvent

  constructor() {
    super('memory')
  }

  init(data: { bridge: MemoryBridge }) {
    this.bridge = data.bridge
    this.running = true
    this.cards = []
    this.first = null
    this.busy = false
    this.pairs = 0
    this.mistakes = 0
    this.elapsed = 0
    this.msgTimer = undefined
  }

  create() {
    const g = this.add.graphics().setDepth(0)
    drawRoom(g)
    drawShelf(g)
    const colors = Phaser.Utils.Array.Shuffle([...BOX_COLORS])
    dealCodes().forEach((code, i) => this.addCard(code, i, colors[i % colors.length]))
    this.msg = this.add
      .text(FIELD.w / 2, 7, '', { fontFamily: 'monospace', fontSize: '7px', color: '#ff3d7f', backgroundColor: '#14110f', padding: { x: 3, y: 2 } })
      .setOrigin(0.5)
      .setResolution(4)
      .setDepth(20)
      .setVisible(false)

    this.fit()
    this.scale.on('resize', this.fit, this)
    this.events.once('shutdown', () => this.scale.off('resize', this.fit, this))

    this.emitHud()
    this.bridge.onReady(this)
  }

  update(_time: number, delta: number) {
    if (!this.running) return
    const before = Math.floor(this.elapsed / 1000)
    this.elapsed += delta
    if (Math.floor(this.elapsed / 1000) !== before) this.emitHud()
  }

  /** Пауза оболочки */
  setPaused(paused: boolean) {
    if (paused) this.scene.pause()
    else this.scene.resume()
  }

  // Как в «Тележке»: камера на весь экран, поле сдвинуто ниже панели интерфейса, увеличение целое
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

  private addCard(code: string, slot: number, color: number) {
    const { x, y } = boxPos(Math.floor(slot / MEMORY.cols), slot % MEMORY.cols)
    const g = this.add.graphics().setPosition(x, y).setDepth(1)
    const text = this.add.text(0, 0, code, { fontFamily: 'monospace', fontSize: '7px', color: '#1a110a' }).setOrigin(0.5).setResolution(4).setDepth(1.1)
    const zone = this.add.zone(x + SHELF.boxW / 2, y + SHELF.boxH / 2, SHELF.boxW + 2, SHELF.boxH + 2).setInteractive()
    const card: Card = { code, color, bars: randomBars(), open: false, gone: false, g, text, zone }
    zone.on('pointerdown', () => this.onTap(card))
    this.cards.push(card)
    this.draw(card, x, y)
  }

  /** Закрытая коробка показывает штрихкод, открытая — код */
  private draw(card: Card, x = card.g.x, y = card.g.y) {
    const tag = paintMemoryBox(card.g, card.color, card.code.length, card.open, card.bars)
    card.text.setVisible(card.open).setPosition(x + tag.x, y + tag.y)
  }

  private setOpen(card: Card, open: boolean) {
    card.open = open
    this.draw(card)
  }

  private onTap(card: Card) {
    if (!this.running || this.busy || card.gone) return
    if (card === this.first) {
      // Нажали на открытую ещё раз — закрыли, ничего не потеряно
      this.setOpen(card, false)
      this.first = null
      sfx.tone(300, 0.04, 'square', 0.03)
      platform.haptic('tap')
      return
    }
    this.setOpen(card, true)
    // Писк сканера штрихкодов: короткий скачок вверх и ровный сигнал
    sfx.tone(1400, 0.03, 'square', 0.025)
    sfx.tone(2600, 0.09, 'square', 0.03, 0.03)
    platform.haptic('tap')
    if (!this.first) {
      this.first = card
      return
    }
    const a = this.first
    this.first = null
    this.busy = true
    if (a.code === card.code) {
      this.time.delayedCall(MATCH_MS, () => this.match(a, card))
      return
    }
    // Ошибка засчитывается сразу, а коробки ещё немного остаются открытыми — чтобы запомнить коды
    this.mistakes++
    this.say('КОДЫ РАЗНЫЕ')
    sfx.tone(140, 0.25, 'sawtooth', 0.06)
    platform.haptic('error')
    this.emitHud()
    this.time.delayedCall(MISS_MS, () => {
      this.setOpen(a, false)
      this.setOpen(card, false)
      this.busy = false
    })
  }

  private match(a: Card, b: Card) {
    this.pairs++
    sfx.tone(660, 0.08, 'triangle', 0.05)
    platform.haptic('success')
    for (const c of [a, b]) {
      c.gone = true
      c.zone.disableInteractive()
      this.tweens.add({
        targets: [c.g, c.text],
        alpha: 0,
        y: '-=4',
        duration: 250,
        onComplete: () => {
          c.g.destroy()
          c.text.destroy()
        },
      })
    }
    this.emitHud()
    this.busy = false
    if (this.pairs === MEMORY.pairs) this.win()
  }

  private win() {
    this.running = false
    sfx.tone(523, 0.12, 'triangle', 0.06)
    sfx.tone(659, 0.12, 'triangle', 0.06, 0.12)
    sfx.tone(784, 0.2, 'triangle', 0.06, 0.24)
    this.say('ВСЕ ПАРЫ НАЙДЕНЫ!', '#a6f05c')
    this.msgTimer?.remove()
    this.time.delayedCall(WIN_DELAY_MS, () => this.bridge.onEnd({ seconds: Math.floor(this.elapsed / 1000) }))
  }

  private say(text: string, color = '#ff3d7f') {
    this.msg.setText(text).setColor(color).setVisible(true)
    this.msgTimer?.remove()
    this.msgTimer = this.time.delayedCall(MISS_MS, () => this.msg.setVisible(false))
  }

  private emitHud() {
    this.bridge.onHud({ pairs: this.pairs, mistakes: this.mistakes, seconds: Math.floor(this.elapsed / 1000) })
  }
}
