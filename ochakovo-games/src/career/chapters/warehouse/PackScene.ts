import Phaser from 'phaser'
import { sfx } from '../../../games/shared/sfx'
import { platform } from '../../../platform'
import { BOX_COLORS, drawBackdrop, drawCart, paintBox, paintTag } from './art'
import { CART, FIELD, GRID, LABEL_LETTERS, LABEL_NUMBERS, ORDER, RACK, levelConfig, type PackLevel } from './config'
import { bounds, emptyGrid, fits, put, rotate, take, type Cell, type Grid } from './rules'

// Сцена уровня «Тележка». Графика — в art.ts, здесь рисуются только коробки, сетка и заказ.
// Состояние — сетка занятости и список коробок, графика его только показывает.

export interface PackHud {
  /** Сколько коробок из заказа уже в сетке и сколько всего в заказе */
  ordered: number
  orderTotal: number
  /** Есть что подтверждать: в сетке хоть одна коробка */
  canConfirm: boolean
  /** Сколько раз коробку ставили в сетку */
  moves: number
}

export interface PackResult {
  moves: number
  /** Неверных подтверждений */
  mistakes: number
  /** Пар «что-то стоит на хрупкой коробке» в итоговой раскладке */
  violations: number
}

/** Связь сцены с React */
export interface PackBridge {
  onReady: (scene: PackScene) => void
  onHud: (hud: PackHud) => void
  onEnd: (result: PackResult) => void
}

interface Box {
  id: number
  cells: Cell[]
  color: number
  /** Слот на стеллаже */
  slot: number
  /** Номер на коробке, например К90 */
  label: string
  /** Хрупкая: ничего не должно стоять сверху */
  fragile: boolean
  text: Phaser.GameObjects.Text
  /** Левый верхний угол в сетке; null — коробка на стеллаже или в руке */
  at: Cell | null
  /** Уехала с тележкой — на стеллаже и в игре её больше нет */
  gone: boolean
  g: Phaser.GameObjects.Graphics
}

interface Drag {
  box: Box
  fromGrid: boolean
  startX: number
  startY: number
  moved: boolean
}

/** Коробка в руке поднята над пальцем, чтобы не закрывать себя, px поля */
const LIFT = 16
/** Сдвиг указателя, после которого нажатие считается перетаскиванием, px поля */
const DRAG_FROM = 2.5
/** Насколько далеко от клетки под коробкой ещё ищем свободное место, в клетках */
const SNAP = 1.1
/** Пауза перед отъездом тележки и сам отъезд, мс */
const LEAVE_DELAY_MS = 900
const LEAVE_MS = 1500

const COLORS = { text: '#f1f2f3', ok: 0xa6f05c }

export class PackScene extends Phaser.Scene {
  private bridge!: PackBridge
  private level!: PackLevel
  private running = false
  private boxes: Box[] = []
  private grid: Grid = emptyGrid(GRID.n)
  private drag: Drag | null = null
  private ghost!: Phaser.GameObjects.Graphics
  private cartGfx!: Phaser.GameObjects.Graphics
  private moves = 0
  private lastHud = ''
  private mistakes = 0
  private violations = 0
  private round = 0
  private order: number[] = []
  private orderGfx!: Phaser.GameObjects.Graphics
  private chips: Phaser.GameObjects.Text[] = []
  private faultGfx!: Phaser.GameObjects.Graphics
  private msg!: Phaser.GameObjects.Text
  private orderTitle!: Phaser.GameObjects.Text
  private winText?: Phaser.GameObjects.Text
  private msgTimer?: Phaser.Time.TimerEvent

  constructor() {
    super('pack')
  }

  init(data: { bridge: PackBridge; levelIndex: number }) {
    this.bridge = data.bridge
    this.level = levelConfig(data.levelIndex)
    this.running = true
    this.boxes = []
    this.grid = emptyGrid(GRID.n)
    this.drag = null
    this.moves = 0
    this.mistakes = 0
    this.violations = 0
    this.round = 0
    this.winText = undefined
    this.order = []
    this.chips = []
    this.msgTimer = undefined
    this.lastHud = ''
  }

  create() {
    this.drawStatic()
    this.ghost = this.add.graphics().setDepth(5)
    // Номера: буквы могут повторяться, числа — нет
    const numbers = Phaser.Utils.Array.Shuffle([...LABEL_NUMBERS])
    // Места на стеллаже тоже вперемешку, чтобы коробки заказа не лежали подряд
    const slots = Phaser.Utils.Array.Shuffle(this.level.pieces.map((_, i) => i))
    this.level.pieces.forEach((cells, id) =>
      this.addBox(id, cells, slots[id], `${LABEL_LETTERS[Phaser.Math.Between(0, LABEL_LETTERS.length - 1)]}${numbers[id]}`, this.level.fragile.includes(id)),
    )
    this.boxes.forEach(b => this.toShelf(b))
    this.order = this.level.orders[0]
    this.createOrder()

    this.fit()
    this.scale.on('resize', this.fit, this)
    this.events.once('shutdown', () => this.scale.off('resize', this.fit, this))

    this.input.on('pointerdown', this.onDown, this)
    this.input.on('pointermove', this.onMove, this)
    this.input.on('pointerup', this.onUp, this)
    this.input.on('pointerupoutside', this.onUp, this)
    this.input.keyboard?.on('keydown-R', this.onRotateKey, this)
    this.input.keyboard?.on('keydown-SPACE', this.onRotateKey, this)

    this.emitHud()
    this.bridge.onReady(this)
  }

  /** Пауза оболочки */
  setPaused(paused: boolean) {
    if (paused) this.scene.pause()
    else this.scene.resume()
  }

  /** Все коробки обратно на стеллаж; ходы не обнуляются */
  reset() {
    if (!this.running) return
    this.drag = null
    this.ghost.clear()
    this.grid = emptyGrid(GRID.n)
    this.boxes.forEach(b => !b.gone && this.toShelf(b))
    this.emitHud()
  }

  // Камера на весь экран (стена видна и над полем), а поле сдвинуто ниже панели интерфейса:
  // иначе панель закрывает полосу заказа. Целое увеличение, при котором влезает важная часть поля
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

  // ---------- Рисование ----------

  /** Стена, пол, стеллаж, тележка и сетка над ней — то, что не меняется */
  private drawStatic() {
    const g = this.add.graphics().setDepth(0)
    drawBackdrop(g)
    // Тележка и сетка над ней — отдельным слоем: после победы уезжают вместе с коробками
    this.cartGfx = this.add.graphics().setDepth(0.2)
    drawCart(this.cartGfx)
    this.drawGrid(this.cartGfx)
  }

  /** Сетка висит в воздухе над палубой: лёгкая заливка, рамка и тень на палубе */
  private drawGrid(g: Phaser.GameObjects.Graphics) {
    const { n, cell, x, y } = GRID
    const size = n * cell
    g.fillStyle(0xffffff, 0.1)
    g.fillRect(x, y, size, size)
    g.lineStyle(1, 0xffffff, 0.45)
    for (let i = 0; i <= n; i++) {
      g.lineBetween(x, y + i * cell, x + size, y + i * cell)
      g.lineBetween(x + i * cell, y, x + i * cell, y + size)
    }
    g.fillStyle(0x000000, 0.25)
    g.fillRect(x + 2, CART.deckY - 1, size - 4, 1)
  }

  /** Коробка из клеток размера s: картон и наклейка с номером на клетке, ближайшей к центру */
  private drawBox(box: Box, s: number) {
    const g = box.g
    g.clear()
    paintBox(g, box.cells, s, box.color)
    // Наклейка — на верхнем ряду коробки, на клетке ближе к её середине
    const { cols } = bounds(box.cells)
    const topRow = Math.min(...box.cells.map(([r]) => r))
    const [lr, lc] = box.cells
      .filter(([r]) => r === topRow)
      .reduce((a, b) => (Math.abs(b[1] - (cols - 1) / 2) < Math.abs(a[1] - (cols - 1) / 2) ? b : a))
    const font = s >= 14 ? Math.round(s * 0.38) : 6
    const tag = paintTag(g, Math.round((lc + 0.5) * s), Math.round((lr + 0.5) * s), s, font, box.label.length, box.fragile)
    box.text
      .setFontSize(font)
      .setColor(box.fragile ? '#ffffff' : '#1a110a')
      .setData('off', [tag.x, tag.y])
  }

  /** Коробка и её номер двигаются вместе */
  private place(box: Box, x: number, y: number, depth: number) {
    const [ox, oy] = box.text.getData('off') as [number, number]
    box.g.setPosition(x, y).setDepth(depth)
    box.text.setPosition(x + ox, y + oy).setDepth(depth + 0.1)
  }

  /** Полоса заказа вверху: подпись и плашки с номерами коробок */
  private createOrder() {
    const { y, h, x0, x1 } = ORDER
    const g = this.add.graphics().setDepth(0.5)
    // Лист бумаги: тень, светлый лист, загнутый уголок и пара линеек
    g.fillStyle(0x000000, 0.3)
    g.fillRect(x0 + 1, y + 1, x1 - x0, h)
    g.fillStyle(0xf1ece0)
    g.fillRect(x0, y, x1 - x0, h)
    g.fillStyle(0xc9c2b0)
    g.fillRect(x0, y + h - 1, x1 - x0, 1)
    g.fillStyle(0x8a8174)
    g.fillTriangle(x1 - 5, y, x1, y, x1, y + 5)
    g.fillStyle(0xa89f8a)
    g.fillTriangle(x1 - 5, y, x1 - 5, y + 5, x1, y + 5)
    g.fillStyle(0xcd004b)
    g.fillRect(x0 + 3, y + 3, 1, h - 6)
    this.orderTitle = this.add
      .text(x0 + 6, y + h / 2, '', { fontFamily: 'monospace', fontSize: '5px', color: '#4a443b' })
      .setOrigin(0, 0.5)
      .setResolution(4)
      .setDepth(1)
    this.orderGfx = this.add.graphics().setDepth(1)
    this.faultGfx = this.add.graphics().setDepth(4)
    this.buildChips()
    this.msg = this.add
      .text(FIELD.w / 2, GRID.y - 6, '', { fontFamily: 'monospace', fontSize: '7px', color: '#ff3d7f', backgroundColor: '#14110f', padding: { x: 3, y: 2 } })
      .setOrigin(0.5, 1)
      .setResolution(4)
      .setDepth(20)
      .setVisible(false)
  }

  /** Номера коробок текущего заказа и подпись «ЗАКАЗ 1/3» */
  private buildChips() {
    this.chips.forEach(t => t.destroy())
    this.orderTitle.setText(`ЗАКАЗ\n${this.round + 1}/${this.level.orders.length}`)
    this.chips = this.order.map((id, i) => {
      const { cx, cy } = this.chipRect(i)
      return this.add
        .text(cx, cy, this.boxes[id].label, { fontFamily: 'monospace', fontSize: '7px', color: '#1a110a' })
        .setOrigin(0.5)
        .setResolution(4)
        .setDepth(1.1)
    })
  }

  private chipRect(i: number) {
    const { y, h, x1, chipsX } = ORDER
    const step = (x1 - 3 - chipsX) / this.order.length
    const x = chipsX + i * step
    return { x, y: y + 3, w: step - 2, h: h - 6, cx: x + (step - 2) / 2, cy: y + h / 2 }
  }

  /** Плашка заказа загорается зелёным, когда коробка стоит в сетке */
  private drawOrder() {
    this.orderGfx.clear()
    this.order.forEach((id, i) => {
      const r = this.chipRect(i)
      const done = !!this.boxes[id].at
      this.orderGfx.fillStyle(done ? COLORS.ok : 0xe2dccb)
      this.orderGfx.fillRect(r.x, r.y, r.w, r.h)
      this.orderGfx.fillStyle(0x1a110a, done ? 0.6 : 0.35)
      this.orderGfx.fillRect(r.x, r.y + r.h - 1, r.w, 1)
      this.chips[i].setColor('#1a110a')
    })
  }

  /** Места, где на хрупкую коробку что-то поставлено: клетка сверху и число пар коробок (верхняя, хрупкая) */
  private faults() {
    const edges: { r: number; c: number }[] = []
    const pairs = new Set<string>()
    for (let r = 0; r < GRID.n - 1; r++) {
      for (let c = 0; c < GRID.n; c++) {
        const up = this.grid[r][c]
        const down = this.grid[r + 1][c]
        if (up < 0 || down < 0 || up === down || !this.boxes[down].fragile) continue
        edges.push({ r, c })
        pairs.add(`${up}-${down}`)
      }
    }
    return { edges, count: pairs.size }
  }

  /** Красная черта между хрупкой коробкой и тем, что стоит на ней */
  private drawFaults() {
    this.faultGfx.clear()
    this.faultGfx.fillStyle(0xff3d7f)
    for (const { r, c } of this.faults().edges) {
      this.faultGfx.fillRect(GRID.x + c * GRID.cell + 1, GRID.y + (r + 1) * GRID.cell - 1, GRID.cell - 2, 3)
    }
  }

  private say(text: string, color: string) {
    this.msg.setText(text).setColor(color).setVisible(true)
    this.msgTimer?.remove()
    this.msgTimer = this.time.delayedCall(2200, () => this.msg.setVisible(false))
  }

  /**
   * Кнопка «Подтвердить»: в сетке ровно коробки заказа — раскладка фиксируется, уровень пройден.
   * Иначе ошибка, играем дальше.
   */
  confirm() {
    if (!this.running || this.drag) return
    const placed = this.boxes.filter(b => b.at)
    if (!placed.length) return
    const extra = placed.find(b => !this.order.includes(b.id))
    const missing = this.order.filter(id => !this.boxes[id].at).length
    if (extra || missing) {
      this.mistakes++
      sfx.tone(140, 0.25, 'sawtooth', 0.06)
      platform.haptic('error')
      this.cameras.main.shake(120, 0.004)
      this.say(extra ? `ЛИШНЯЯ: ${extra.label}` : `НЕ ХВАТАЕТ: ${missing}`, '#ff3d7f')
      return
    }
    this.win()
  }

  // ---------- Коробки ----------

  private addBox(id: number, base: Cell[], slot: number, label: string, fragile: boolean) {
    // Лежат на стеллаже повёрнутыми как попало — иначе решение видно сразу
    let cells = base
    for (let i = Phaser.Math.Between(0, 3); i > 0; i--) cells = rotate(cells)
    const g = this.add.graphics().setDepth(2)
    const text = this.add
      .text(0, 0, label, { fontFamily: 'monospace', fontSize: '6px', color: '#14110f' })
      .setOrigin(0.5)
      .setResolution(4)
    this.boxes.push({ id, cells, color: BOX_COLORS[id % BOX_COLORS.length], slot, label, fragile, text, at: null, gone: false, g })
  }

  /** Размер клетки коробки на стеллаже: самая длинная сторона должна влезть в ярус при любом повороте */
  private shelfCell(box: Box) {
    const { rows, cols } = bounds(box.cells)
    const slotW = (RACK.x1 - RACK.x0) / RACK.cols
    return Math.min(RACK.maxCell, Math.floor(RACK.maxExtent / Math.max(rows, cols)), Math.floor((slotW - 1) / Math.max(rows, cols)))
  }

  /** Прямоугольник коробки на стеллаже: по центру слота, снизу на доске */
  private shelfRect(box: Box) {
    const { cols: slotCols, x0, x1, boardY } = RACK
    const s = this.shelfCell(box)
    const { rows, cols } = bounds(box.cells)
    const slotW = (x1 - x0) / slotCols
    const cx = x0 + slotW * (box.slot % slotCols) + slotW / 2
    const bottom = boardY[Math.floor(box.slot / slotCols)]
    return { x: Math.round(cx - (cols * s) / 2), y: bottom - rows * s, w: cols * s, h: rows * s, s }
  }

  private toShelf(box: Box) {
    take(this.grid, box.id)
    box.at = null
    const r = this.shelfRect(box)
    this.drawBox(box, r.s)
    this.place(box, r.x, r.y, 2)
  }

  private toGrid(box: Box, r: number, c: number) {
    box.at = [r, c]
    put(this.grid, box.id, box.cells, r, c)
    this.drawBox(box, GRID.cell)
    this.place(box, GRID.x + c * GRID.cell, GRID.y + r * GRID.cell, 3)
  }

  /** Коробка под точкой: сначала в сетке, потом на стеллаже */
  private boxAt(x: number, y: number): { box: Box; fromGrid: boolean } | null {
    const c = Math.floor((x - GRID.x) / GRID.cell)
    const r = Math.floor((y - GRID.y) / GRID.cell)
    const id = this.grid[r]?.[c]
    if (id !== undefined && id >= 0) return { box: this.boxes[id], fromGrid: true }
    const pad = 2
    for (const box of this.boxes) {
      if (box.at || box.gone) continue
      const s = this.shelfRect(box)
      if (x >= s.x - pad && x <= s.x + s.w + pad && y >= s.y - pad && y <= s.y + s.h + pad) return { box, fromGrid: false }
    }
    return null
  }

  /**
   * Куда встанет коробка, центр которой в точке (x, y): ближайшее свободное место
   * не дальше SNAP клеток от точки. null — нигде не помещается.
   */
  private findSpot(box: Box, x: number, y: number): Cell | null {
    const { rows, cols } = bounds(box.cells)
    const r = (y - (rows * GRID.cell) / 2 - GRID.y) / GRID.cell
    const c = (x - (cols * GRID.cell) / 2 - GRID.x) / GRID.cell
    let best: Cell | null = null
    let bestD = SNAP * SNAP
    for (let rr = Math.floor(r); rr <= Math.ceil(r); rr++) {
      for (let cc = Math.floor(c); cc <= Math.ceil(c); cc++) {
        const d = (r - rr) ** 2 + (c - cc) ** 2
        if (d < bestD && fits(this.grid, box.cells, rr, cc)) {
          best = [rr, cc]
          bestD = d
        }
      }
    }
    return best
  }

  // ---------- Ввод ----------

  private onDown(p: Phaser.Input.Pointer) {
    if (!this.running || this.drag) return
    const hit = this.boxAt(p.worldX, p.worldY)
    if (!hit) return
    this.drag = { ...hit, startX: p.worldX, startY: p.worldY, moved: false }
  }

  private onMove(p: Phaser.Input.Pointer) {
    const d = this.drag
    if (!d) return
    if (!d.moved) {
      if (Math.hypot(p.worldX - d.startX, p.worldY - d.startY) < DRAG_FROM) return
      d.moved = true
      // Взяли коробку в руку: освобождаем клетки и рисуем в натуральную величину
      take(this.grid, d.box.id)
      d.box.at = null
      this.drawFaults()
      this.drawBox(d.box, GRID.cell)
      this.place(d.box, d.box.g.x, d.box.g.y, 10)
      platform.haptic('tap')
    }
    this.carry(p.worldX, p.worldY)
  }

  /** Коробка в руке следует за пальцем, а в сетке подсвечивается место, куда она встанет */
  private carry(x: number, y: number) {
    const d = this.drag
    if (!d?.moved) return
    const { rows, cols } = bounds(d.box.cells)
    const cy = y - LIFT
    this.place(d.box, x - (cols * GRID.cell) / 2, cy - (rows * GRID.cell) / 2, 10)
    this.ghost.clear()
    const spot = this.findSpot(d.box, x, cy)
    if (!spot) return
    this.ghost.fillStyle(COLORS.ok, 0.4)
    for (const [dr, dc] of d.box.cells) {
      this.ghost.fillRect(GRID.x + (spot[1] + dc) * GRID.cell, GRID.y + (spot[0] + dr) * GRID.cell, GRID.cell, GRID.cell)
    }
  }

  private onUp(p: Phaser.Input.Pointer) {
    const d = this.drag
    if (!d) return
    this.drag = null
    this.ghost.clear()
    const { box } = d

    if (!d.moved) {
      // Нажатие без перетаскивания: на стеллаже — повернуть, в сетке — вернуть на стеллаж
      if (d.fromGrid) {
        this.toShelf(box)
        sfx.tone(260, 0.05, 'square', 0.03)
      } else {
        box.cells = rotate(box.cells)
        this.toShelf(box)
        sfx.tone(380, 0.04, 'square', 0.03)
      }
      platform.haptic('tap')
      this.emitHud()
      return
    }

    const spot = this.findSpot(box, p.worldX, p.worldY - LIFT)
    if (!spot) {
      this.toShelf(box)
      sfx.tone(160, 0.12, 'sawtooth', 0.04)
    } else {
      this.toGrid(box, spot[0], spot[1])
      this.moves++
      sfx.tone(520, 0.07, 'triangle', 0.05)
      platform.haptic('tap')
    }
    this.emitHud()
  }

  /** R или пробел: повернуть коробку в руке (на телефоне поворачивают нажатием на стеллаже) */
  private onRotateKey() {
    const d = this.drag
    if (!d?.moved) return
    d.box.cells = rotate(d.box.cells)
    this.drawBox(d.box, GRID.cell)
    const p = this.input.activePointer
    this.carry(p.worldX, p.worldY)
  }

  // ---------- Конец уровня ----------

  private win() {
    this.running = false
    sfx.tone(523, 0.12, 'triangle', 0.06)
    sfx.tone(659, 0.12, 'triangle', 0.06, 0.12)
    sfx.tone(784, 0.2, 'triangle', 0.06, 0.24)
    platform.haptic('success')
    const violations = this.faults().count
    this.violations += violations
    const last = this.round === this.level.orders.length - 1
    const title = last ? 'ВСЕ ЗАКАЗЫ СОБРАНЫ!' : `ЗАКАЗ ${this.round + 1} СОБРАН!`
    this.winText = this.add
      .text(FIELD.w / 2, GRID.y - 6, violations ? `${title}\nХРУПКОЕ ПОД ГРУЗОМ: ${violations}` : title, { fontFamily: 'monospace', fontSize: '10px', color: '#a6f05c', align: 'center', backgroundColor: '#14110f', padding: { x: 3, y: 2 } })
      .setOrigin(0.5, 1)
      .setResolution(4)
      .setDepth(20)
    this.time.delayedCall(LEAVE_DELAY_MS, () => this.leave(last))
  }

  /** Тележка с сеткой и уложенными коробками уезжает влево за экран; потом конец уровня или приезжает следующая */
  private leave(last: boolean) {
    sfx.tone(180, 0.4, 'square', 0.03)
    this.faultGfx.clear()
    const shipped = this.boxes.filter(b => b.at)
    this.tweens.add({
      targets: [this.cartGfx, ...shipped.flatMap(b => [b.g, b.text])],
      x: '-=700',
      duration: LEAVE_MS,
      ease: 'Quad.easeIn',
      onComplete: () => {
        if (last) {
          this.bridge.onEnd({ moves: this.moves, mistakes: this.mistakes, violations: this.violations })
          return
        }
        this.nextOrder(shipped)
      },
    })
  }

  /** Отправленные коробки убираем, следом приезжает пустая тележка справа и появляется новый заказ */
  private nextOrder(shipped: Box[]) {
    for (const b of shipped) {
      take(this.grid, b.id)
      b.at = null
      b.gone = true
      b.g.destroy()
      b.text.destroy()
    }
    this.winText?.destroy()
    this.winText = undefined
    this.round++
    this.order = this.level.orders[this.round]
    this.buildChips()
    this.lastHud = ''
    this.emitHud()
    this.cartGfx.x = 700
    sfx.tone(160, 0.4, 'square', 0.03)
    this.tweens.add({
      targets: this.cartGfx,
      x: 0,
      duration: LEAVE_MS,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.running = true
      },
    })
  }

  private emitHud() {
    this.drawOrder()
    this.drawFaults()
    const hud: PackHud = {
      ordered: this.order.filter(id => this.boxes[id].at).length,
      orderTotal: this.order.length,
      canConfirm: this.boxes.some(b => b.at),
      moves: this.moves,
    }
    const key = `${hud.ordered}|${hud.canConfirm}|${hud.moves}`
    if (key === this.lastHud) return
    this.lastHud = key
    this.bridge.onHud(hud)
  }
}
