import Phaser from 'phaser'
import { sfx } from '../../../games/shared/sfx'
import { platform } from '../../../platform'
import { BELT, BG, BIN, BOTTLE, BOX, BOX_POINTS, DRAG, FIELD, FILLER, LEVEL, MISS_X, RAMP, SPAWN_X, TIMING } from './config'
import { boxScore, boxType, canPut, emptyBox, isComplete, isJammed, put, take, wantedTypes, type BoxState } from './rules'
import { Spawner } from './spawner'
import { createSprites, TEX } from './sprites'

// Сцена главы «Сортировка на конвейере». Состояние — массивы бутылок и коробок,
// спрайты только показывают его. Пиксель-арт: целое увеличение камеры, координаты целые.

export interface HudState {
  score: number
  /** Оставшиеся секунды смены */
  time: number
  misses: number
  boxes: number
}

export interface ShiftResult {
  score: number
  misses: number
  boxes: number
  /** Смена сорвана: слишком много промахов */
  failed: boolean
}

/** Связь сцены с React */
export interface BottlingBridge {
  onReady: (scene: BottlingScene) => void
  onHud: (hud: HudState) => void
  onEnd: (result: ShiftResult) => void
}

/** belt, return — на ленте и возвращается на неё; fly, box — летит в коробку и лежит в ней */
type BottleState = 'belt' | 'drag' | 'return' | 'fly' | 'box'

interface Bottle {
  type: number
  /** Место на ленте относительно её сдвига: лента и бутылки двигаются одним целым шагом */
  offset: number
  /** x, y — низ бутылки в координатах мира (и у бутылки в коробке) */
  x: number
  y: number
  state: BottleState
  img: Phaser.GameObjects.Image
  /** Коробка, в которой бутылка лежит или из которой её достали; null — бутылка с ленты */
  home: Box | null
}

interface Box {
  state: BoxState
  x: number
  view: Phaser.GameObjects.Container
  back: Phaser.GameObjects.Image
  front: Phaser.GameObjects.Image
  lid: Phaser.GameObjects.Image
  sticker: Phaser.GameObjects.Image
  /** Бутылки в том же порядке, что state.types, включая летящие */
  inside: Bottle[]
}

/** Нажатие на бутылку: станет перетаскиванием, если палец сдвинется, иначе — выбором */
interface Press {
  bottle: Bottle
  pointerId: number
  x: number
  y: number
}

// Слои отрисовки
// bin — ящик возврата и автомат: стоят перед бутылками на ленте
const D = { bg: 0, belt: 1, box: 2, bottle: 3, bin: 4, top: 5, text: 6 }

/** Верх передней стенки коробки относительно линии пола */
const FRONT_TOP = -(BOX.h + 2)

export class BottlingScene extends Phaser.Scene {
  private bridge!: BottlingBridge
  private running = false

  private spawner!: Spawner
  private bottles: Bottle[] = []
  private boxes: Box[] = []
  private press: Press | null = null
  private selected: Bottle | null = null

  private beltTop!: Phaser.GameObjects.TileSprite
  private selectGfx!: Phaser.GameObjects.Graphics
  private beltShift = 0
  private spawnIn = 0
  private elapsed = 0

  private score = 0
  private misses = 0
  private boxesDone = 0
  private timeLeft = LEVEL.shift
  private lastHud = ''

  constructor() {
    super('bottling')
  }

  init(data: { bridge: BottlingBridge }) {
    this.bridge = data.bridge
    this.running = true
    this.spawner = new Spawner(LEVEL.types, LEVEL.capacity, LEVEL.assist, LEVEL.startTypes, LEVEL.newTypeEvery)
    this.bottles = []
    this.boxes = []
    this.press = null
    this.selected = null
    this.beltShift = 0
    this.spawnIn = 0
    this.score = 0
    this.misses = 0
    this.boxesDone = 0
    this.timeLeft = LEVEL.shift
    this.elapsed = 0
    this.lastHud = ''
  }

  create() {
    createSprites(this)

    this.add.image(BG.x, BG.y, TEX.bg).setOrigin(0).setDepth(D.bg)

    // Лента: полотно едет (сдвиг плитки), рама с роликами стоит. Начинается внутри автомата
    // Длина кратна плитке рамы (16), чтобы у скруглённого конца ролик не обрезался
    const x0 = BELT.x1 - Math.ceil((BELT.x1 - FILLER.x - 4) / 16) * 16
    const len = BELT.x1 - x0
    this.beltTop = this.add.tileSprite(x0, BELT.y, len, 4, TEX.beltTop).setOrigin(0).setDepth(D.belt)
    this.add.tileSprite(x0, BELT.y + 4, len, BELT.h - 4, TEX.beltFrame).setOrigin(0).setDepth(D.belt)
    this.add.image(BELT.x1, BELT.y, TEX.beltEnd).setOrigin(0).setDepth(D.belt)
    this.add.image(BIN.x, BIN.y, TEX.bin).setOrigin(0).setDepth(D.bin)
    this.add.image(FILLER.x, FILLER.bottom - FILLER.h, TEX.filler).setOrigin(0).setDepth(D.bin)

    this.selectGfx = this.add.graphics().setDepth(D.top)

    for (let i = 0; i < LEVEL.boxes; i++) this.boxes.push(this.createBox(Math.round(((i + 0.5) * FIELD.w) / LEVEL.boxes)))

    this.fit()
    this.scale.on('resize', this.fit, this)
    this.events.once('shutdown', () => this.scale.off('resize', this.fit, this))

    this.input.on('pointerdown', this.onDown, this)
    this.input.on('pointermove', this.onMove, this)
    this.input.on('pointerup', this.onUp, this)
    this.input.on('pointerupoutside', this.onUp, this)
    this.input.keyboard?.on('keydown', this.onKey, this)

    this.emitHud()
    this.bridge.onReady(this)
  }

  /** Пауза оболочки. Бутылку, которую тащили, возвращаем на ленту */
  setPaused(paused: boolean) {
    if (paused) {
      this.cancelPress()
      this.scene.pause()
    } else {
      this.scene.resume()
    }
  }

  // Целое увеличение, при котором влезает важная часть поля; поле по центру
  private fit() {
    const cam = this.cameras.main
    const zoom = Math.max(1, Math.floor(Math.min(this.scale.width / FIELD.minW, this.scale.height / FIELD.minH)))
    cam.setZoom(zoom)
    cam.centerOn(FIELD.w / 2, FIELD.h / 2)
  }

  update(_time: number, deltaMs: number) {
    if (!this.running) return
    const dt = Math.min(0.1, deltaMs / 1000)

    this.timeLeft -= dt
    if (this.timeLeft <= 0) {
      this.timeLeft = 0
      this.end(false)
      return
    }

    // Начало смены медленнее: лента и бутылки плавно разгоняются до обычного темпа
    this.elapsed += dt
    const pace = RAMP.from + (1 - RAMP.from) * Math.min(1, this.elapsed / RAMP.time)
    this.beltShift += LEVEL.speed * pace * dt
    const shift = Math.round(this.beltShift)
    this.beltTop.tilePositionX = -shift

    this.spawnIn -= dt * pace
    if (this.spawnIn <= 0) {
      this.spawnIn += LEVEL.interval
      this.spawn()
    }

    for (const b of [...this.bottles]) {
      const slotX = shift + b.offset
      if (b.state === 'belt') {
        b.x = slotX
        b.y = BELT.y
        if (b.x > MISS_X) {
          this.miss(b)
          continue
        }
      } else if (b.state === 'return') {
        // Место на ленте уже ушло за её конец — бутылка падает в ящик возврата
        if (slotX > MISS_X) {
          this.miss(b)
          continue
        }
        // Плавно, но не медленнее returnMinSpeed: место едет вместе с лентой,
        // и при чисто плавном догоне бутылка никогда бы до него не добралась
        const dx = slotX - b.x
        const dy = BELT.y - b.y
        const dist = Math.hypot(dx, dy)
        const step = Math.max(dist * Math.min(1, TIMING.returnRate * dt), TIMING.returnMinSpeed * dt)
        if (step >= dist) {
          b.x = slotX
          b.y = BELT.y
          b.state = 'belt'
          b.img.setDepth(D.bottle)
        } else {
          b.x += (dx / dist) * step
          b.y += (dy / dist) * step
        }
      }
      b.img.setPosition(Math.round(b.x), Math.round(b.y))
    }

    this.drawSelection()
    this.emitHud()
  }

  // ---------- Бутылки ----------

  private spawn() {
    const type = this.spawner.next(wantedTypes(this.boxes.map(b => b.state), LEVEL.capacity))
    const img = this.add.image(SPAWN_X, BELT.y, TEX.bottle(type)).setOrigin(0.5, 1).setDepth(D.bottle)
    const offset = SPAWN_X - Math.round(this.beltShift)
    this.bottles.push({ type, offset, x: SPAWN_X, y: BELT.y, state: 'belt', img, home: null })
  }

  private removeBottle(b: Bottle) {
    const i = this.bottles.indexOf(b)
    if (i >= 0) this.bottles.splice(i, 1)
    if (this.selected === b) this.selected = null
    if (this.press?.bottle === b) this.press = null
  }

  /** Бутылка доехала до конца ленты и упала в ящик возврата */
  private miss(b: Bottle) {
    this.removeBottle(b)
    this.tweens.add({
      targets: b.img,
      x: BIN.x + 9,
      y: BIN.y + 22,
      duration: 260,
      ease: 'Quad.easeIn',
      onComplete: () => b.img.destroy(),
    })
    this.misses++
    sfx.tone(140, 0.25, 'sawtooth', 0.06)
    platform.haptic('error')
    this.cameras.main.shake(120, 0.004)
    if (this.misses >= LEVEL.maxMisses) this.end(true)
  }

  /** Бутылка на ленте под точкой (с запасом под палец); ближайшая к точке */
  private bottleAt(x: number, y: number): Bottle | null {
    let best: Bottle | null = null
    let bestD = Infinity
    for (const b of this.bottles) {
      if (b.state !== 'belt') continue
      const dx = Math.abs(x - b.x)
      if (dx > BOTTLE.hitHalfW || y < b.y - BOTTLE.hitTop || y > b.y + BOTTLE.hitBottom) continue
      if (dx < bestD) {
        best = b
        bestD = dx
      }
    }
    return best
  }

  /** Бутылка в коробке под точкой: тянуть можно за выглядывающий верх и за стенку коробки */
  private boxBottleAt(x: number, y: number): Bottle | null {
    if (y < BOX.y + FRONT_TOP - BOX.peek - 4 || y > BOX.y) return null
    let best: Bottle | null = null
    let bestD = Infinity
    for (const box of this.boxes) {
      if (box.state.phase !== 'ready') continue
      for (const b of box.inside) {
        const dx = Math.abs(x - b.x)
        if (b.state === 'box' && dx <= 6 && dx < bestD) {
          best = b
          bestD = dx
        }
      }
    }
    return best
  }

  // ---------- Ввод ----------

  private onDown(p: Phaser.Input.Pointer) {
    if (!this.running || this.press) return
    const x = p.worldX
    const y = p.worldY
    const hit = this.bottleAt(x, y)
    if (hit) {
      this.press = { bottle: hit, pointerId: p.id, x, y }
      return
    }
    // Тап-тап: выбрана бутылка, теперь тап по коробке
    if (this.selected && y >= BOX.zoneY) {
      const b = this.selected
      this.selected = null
      this.send(b, this.boxIndexAt(x))
      return
    }
    this.selected = null
    const inBox = this.boxBottleAt(x, y)
    if (inBox) this.press = { bottle: inBox, pointerId: p.id, x, y }
  }

  private onMove(p: Phaser.Input.Pointer) {
    const press = this.press
    if (!press || p.id !== press.pointerId) return
    const b = press.bottle
    if (b.state === 'belt' || b.state === 'box') {
      if (Math.hypot(p.worldX - press.x, p.worldY - press.y) < DRAG.threshold) return
      if (b.state === 'box') {
        // Коробка тем временем закрылась — бутылку уже не достать
        if (b.home?.state.phase !== 'ready') {
          this.press = null
          return
        }
        this.takeOut(b)
      }
      b.state = 'drag'
      b.img.setDepth(D.top)
      this.selected = null
      sfx.tone(520, 0.06, 'square', 0.04)
      platform.haptic('select')
    }
    if (b.state === 'drag') {
      // Бутылка над пальцем, чтобы её было видно
      b.x = p.worldX
      b.y = p.worldY - DRAG.lift + b.img.height / 2
      b.img.setPosition(Math.round(b.x), Math.round(b.y))
    }
  }

  private onUp(p: Phaser.Input.Pointer) {
    const press = this.press
    if (!press || p.id !== press.pointerId) return
    this.press = null
    const b = press.bottle
    if (b.state === 'drag') {
      if (p.worldY >= BOX.zoneY - DRAG.lift) this.send(b, this.boxIndexAt(p.worldX))
      else this.dropBack(b)
    } else if (b.state === 'belt' || b.state === 'box') {
      this.selected = this.selected === b ? null : b
      if (this.selected) platform.haptic('select')
    }
  }

  /** Клавиши 1…N: в коробку уходит бутылка, ближайшая к концу ленты */
  private onKey(e: KeyboardEvent) {
    if (!this.running) return
    const i = Number(e.key) - 1
    if (!(i >= 0 && i < this.boxes.length)) return
    let first: Bottle | null = null
    for (const b of this.bottles) if (b.state === 'belt' && (!first || b.x > first.x)) first = b
    if (first) this.send(first, i)
  }

  private cancelPress() {
    const b = this.press?.bottle
    this.press = null
    if (b?.state === 'drag') this.dropBack(b)
  }

  /** Бутылку отпустили не над коробкой: с ленты — обратно на ленту, из коробки — в свою коробку */
  private dropBack(b: Bottle) {
    if (b.home) this.send(b, this.boxes.indexOf(b.home))
    else this.returnToBelt(b)
  }

  private returnToBelt(b: Bottle) {
    b.state = 'return'
    b.img.setDepth(D.top)
  }

  private boxIndexAt(x: number) {
    return Phaser.Math.Clamp(Math.floor((x / FIELD.w) * this.boxes.length), 0, this.boxes.length - 1)
  }

  // ---------- Коробки ----------

  /**
   * Коробка — контейнер с началом на линии пола: сзади клапаны и тёмная внутренность,
   * потом бутылки внутри, спереди стенка, наклейка и (у готовой коробки) крышка
   */
  private createBox(x: number): Box {
    const back = this.add.image(0, FRONT_TOP + 3, TEX.boxBack).setOrigin(0.5, 1)
    const front = this.add.image(0, 0, TEX.boxFront).setOrigin(0.5, 1)
    const lid = this.add.image(0, FRONT_TOP + 2, TEX.boxLid).setOrigin(0.5, 1).setVisible(false)
    const sticker = this.add.image(0, FRONT_TOP + 4, TEX.stickerEmpty).setOrigin(0.5, 0)
    const view = this.add.container(x, BOX.y, [back, front, lid, sticker]).setDepth(D.box)
    return { state: emptyBox(), x, view, back, front, lid, sticker, inside: [] }
  }

  private send(b: Bottle, boxIndex: number) {
    const box = this.boxes[boxIndex]
    if (b.state === 'box') {
      // Тап-тап из коробки: в ту же коробку — просто снять выбор
      if (b.home === box) return
      this.takeOut(b)
    }
    if (canPut(box.state, LEVEL.capacity) === 'ok') {
      this.fly(b, box)
      return
    }
    if (box.state.phase === 'ready') this.shakeBox(box)
    if (!b.home) {
      this.returnToBelt(b)
      return
    }
    // Бутылка из коробки: назад в свою, если её место заняли — в любую свободную, иначе в ящик возврата
    const spare = [b.home, ...this.boxes].find(o => o !== box && canPut(o.state, LEVEL.capacity) === 'ok')
    if (spare) this.fly(b, spare)
    else this.miss(b)
  }

  /** Достать бутылку из коробки: она переходит из контейнера коробки в мир */
  private takeOut(b: Bottle) {
    const box = b.home!
    const i = box.inside.indexOf(b)
    take(box.state, i)
    box.inside.splice(i, 1)
    box.view.remove(b.img)
    b.img.setPosition(Math.round(b.x), Math.round(b.y)).setDepth(D.top)
    b.state = 'drag'
    this.layoutBox(box)
    this.updateSticker(box)
  }

  /** Полная коробка или коробки нет: короткая тряска */
  private shakeBox(box: Box) {
    this.tweens.add({
      targets: box.view,
      x: box.x + 2,
      duration: 40,
      yoyo: true,
      repeat: 2,
      onComplete: () => box.view.setX(box.x),
    })
    sfx.tone(110, 0.18, 'square', 0.06)
    platform.haptic('warning')
  }

  /** Сдвинуть лежащие бутылки по местам, когда одну достали */
  private layoutBox(box: Box) {
    box.inside.forEach((b, i) => {
      if (b.state !== 'box') return
      const sx = slotX(i)
      b.x = box.x + sx
      this.tweens.add({ targets: b.img, x: sx, duration: 100, ease: 'Quad.easeOut' })
    })
  }

  /** Наклейка — тип, если все бутылки в коробке одного типа; пустая или смешанная — без типа */
  private updateSticker(box: Box) {
    const t = boxType(box.state)
    box.sticker.setTexture(t === null ? TEX.stickerEmpty : TEX.sticker(t))
  }

  /** Бутылка подлетает к коробке сверху и опускается внутрь, за переднюю стенку */
  private fly(b: Bottle, box: Box) {
    this.removeBottle(b)
    put(box.state, b.type)
    box.inside.push(b)
    b.home = box
    b.state = 'fly'
    this.updateSticker(box)
    // низ бутылки внутри: так, чтобы над стенкой выглядывало BOX.peek пикселей
    const insideY = FRONT_TOP - BOX.peek + b.img.height
    const drop = 10
    b.img.setDepth(D.top)
    this.tweens.add({
      targets: b.img,
      x: box.x + slotX(box.inside.indexOf(b)),
      y: BOX.y + insideY - drop,
      duration: TIMING.fly * 1000,
      ease: 'Quad.easeOut',
      onComplete: () => {
        // Пока летела, из коробки могли достать бутылку — место берём заново
        const slot = box.inside.indexOf(b)
        const sx = slotX(slot)
        box.view.addAt(b.img, box.view.getIndex(box.front))
        b.img.setPosition(sx, insideY - drop)
        this.tweens.add({
          targets: b.img,
          y: insideY,
          duration: 90,
          ease: 'Quad.easeIn',
          onComplete: () => {
            b.state = 'box'
            b.img.x = slotX(box.inside.indexOf(b))
            b.x = box.x + b.img.x
            b.y = BOX.y + insideY
            sfx.tone(880 + slot * 120, 0.08, 'triangle', 0.07)
            platform.haptic('tap')
            if (box.inside.some(o => o.state !== 'box')) return
            if (isComplete(box.state, LEVEL.capacity)) this.closeBox(box)
            else if (isJammed(box.state, LEVEL.capacity)) this.shakeBox(box)
          },
        })
      },
    })
  }

  private closeBox(box: Box) {
    box.state.phase = 'closing'
    if (this.selected?.home === box) this.selected = null
    if (this.press?.bottle.home === box && this.press.bottle.state === 'box') this.press = null
    const points = boxScore(BOX_POINTS, LEVEL.capacity)
    this.score += points
    this.boxesDone++
    sfx.tone(660, 0.12, 'triangle', 0.08)
    sfx.tone(990, 0.18, 'triangle', 0.08, 0.1)
    platform.haptic('success')

    const half = (TIMING.away * 1000) / 2
    this.time.delayedCall(TIMING.close * 1000, () => {
      // Клапаны закрыты: прячем бутылки и внутренность, показываем крышку
      box.back.setVisible(false)
      for (const b of box.inside) b.img.setVisible(false)
      box.lid.setVisible(true)
      this.floatText(`+${points}`, box.x, BOX.y + FRONT_TOP - 8)
      this.tweens.add({
        targets: box.view,
        y: BOX.y + 70,
        alpha: 0,
        delay: 120,
        duration: half,
        ease: 'Quad.easeIn',
        onComplete: () => {
          for (const b of box.inside) b.img.destroy()
          box.inside = []
          box.state = { ...emptyBox(), phase: 'away' }
          box.back.setVisible(true)
          box.lid.setVisible(false)
          box.sticker.setTexture(TEX.stickerEmpty)
          this.tweens.add({
            targets: box.view,
            y: BOX.y,
            alpha: 1,
            duration: half,
            ease: 'Quad.easeOut',
            onComplete: () => {
              box.state.phase = 'ready'
            },
          })
        },
      })
    })
  }

  // ---------- Конец смены, HUD ----------

  private end(failed: boolean) {
    if (!this.running) return
    this.running = false
    this.cancelPress()
    this.selected = null
    this.selectGfx.clear()
    this.emitHud()
    this.bridge.onEnd({ score: this.score, misses: this.misses, boxes: this.boxesDone, failed })
  }

  private emitHud() {
    const hud: HudState = {
      score: this.score,
      time: Math.ceil(this.timeLeft),
      misses: this.misses,
      boxes: this.boxesDone,
    }
    const key = `${hud.score}|${hud.time}|${hud.misses}|${hud.boxes}`
    if (key === this.lastHud) return
    this.lastHud = key
    this.bridge.onHud(hud)
  }

  private floatText(text: string, x: number, y: number) {
    const t = this.add
      .text(x, y, text, { fontFamily: 'monospace', fontSize: '9px', fontStyle: 'bold', color: '#fff3b0' })
      .setOrigin(0.5)
      .setStroke('#1b1f2e', 3)
      .setResolution(this.cameras.main.zoom)
      .setDepth(D.text)
    this.tweens.add({ targets: t, y: y - 14, alpha: 0, duration: 800, onComplete: () => t.destroy() })
  }

  // ---------- Отрисовка ----------

  /** Рамка-уголки вокруг выбранной бутылки — прямоугольниками, чтобы линии были в целый пиксель */
  private drawSelection() {
    const g = this.selectGfx
    g.clear()
    const b = this.selected
    if (!b) return
    const w = b.img.width + 4
    const h = b.img.height + 4
    const x = Math.round(b.x) - w / 2
    const y = Math.round(b.y) - h + 2
    g.fillStyle(0xfff3b0)
    for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
      g.fillRect(sx > 0 ? cx : cx - 4, sy > 0 ? cy : cy - 1, 4, 1)
      g.fillRect(sx > 0 ? cx : cx - 1, sy > 0 ? cy : cy - 4, 1, 4)
    }
  }
}

/** Смещение места k от центра коробки */
const slotX = (k: number) => Math.round((k - (LEVEL.capacity - 1) / 2) * (LEVEL.capacity > 3 ? 10 : 12))
