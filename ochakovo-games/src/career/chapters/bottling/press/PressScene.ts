import Phaser from 'phaser'
import { sfx } from '../../../../games/shared/sfx'
import { platform } from '../../../../platform'
import { drawBackdrop } from './backdrop'
import { canTexture, createCanSprites } from './canSprites'
import {
  CHUTE,
  FIELD,
  FLAP,
  MATERIALS,
  MATERIAL_NAMES,
  PRESS,
  PRESS_CONFIG,
  TIMING,
  sectionX,
  type Material,
  type PressConfig,
} from './config'

// Сцена уровня «Пресс». Серый прототип: всё рисуется примитивами, без картинок.
// Состояние — массив банок и счётчики, графика его только показывает.

export interface PressHud {
  score: number
  /** Оставшиеся секунды смены */
  time: number
  misses: number
}

export interface PressResult {
  score: number
  misses: number
  /** Смена сорвана: слишком много ошибок */
  failed: boolean
}

/** Связь сцены с React */
export interface PressBridge {
  onReady: (scene: PressScene) => void
  onHud: (hud: PressHud) => void
  /** Банка попала не в свою секцию — повод для реплики мастера */
  onMistake: () => void
  onEnd: (result: PressResult) => void
}

interface Can {
  type: number
  /** Ветка жёлоба: -1 левая, 1 правая */
  side: -1 | 1
  /** Пройденный путь по ветке */
  s: number
  g: Phaser.GameObjects.Image
}

/** Длина ветки жёлоба */
const RAIL_LEN = Math.hypot(CHUTE.vertexX - CHUTE.startX, CHUTE.vertexY - CHUTE.startY)
const RAIL_DIR = { x: (CHUTE.vertexX - CHUTE.startX) / RAIL_LEN, y: (CHUTE.vertexY - CHUTE.startY) / RAIL_LEN }

const COLORS = {
  flap: 0xcd004b,
  select: 0xa6f05c,
  selectText: '#a6f05c',
  text: '#f1f2f3',
}

/** Смесь двух цветов: t — доля второго */
const mix = (a: number, b: number, t: number) => {
  const ch = (shift: number) => Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t)
  return (ch(16) << 16) | (ch(8) << 8) | ch(0)
}

const lerp = (pair: [number, number], t: number) => pair[0] + (pair[1] - pair[0]) * t

export class PressScene extends Phaser.Scene {
  private bridge!: PressBridge
  private cfg: PressConfig = PRESS_CONFIG
  private running = false

  private cans: Can[] = []
  /** Куда сейчас смотрит заслонка: номер секции */
  private flap = 1
  private flapGfx!: Phaser.GameObjects.Graphics
  private hatchGfx!: Phaser.GameObjects.Graphics
  private selectGfx!: Phaser.GameObjects.Graphics
  private labels: Phaser.GameObjects.Text[] = []
  private hint?: Phaser.GameObjects.Text

  private elapsed = 0
  private spawnIn = 0
  private lastTypes: number[] = []

  private score = 0
  private misses = 0
  private timeLeft = 0
  private lastHud = ''

  constructor() {
    super('press')
  }

  init(data: { bridge: PressBridge }) {
    this.bridge = data.bridge
    this.cfg = PRESS_CONFIG
    this.running = true
    this.cans = []
    this.flap = 1
    this.labels = []
    this.hint = undefined
    this.elapsed = 0
    this.spawnIn = TIMING.start
    this.lastTypes = []
    this.score = 0
    this.misses = 0
    this.timeLeft = this.cfg.shift
    this.lastHud = ''
  }

  create() {
    createCanSprites(this)
    this.drawStatic()
    this.flapGfx = this.add.graphics().setDepth(3)
    this.hatchGfx = this.add.graphics().setDepth(1.5)
    this.selectGfx = this.add.graphics().setDepth(4)
    this.drawFlap()
    this.hint = this.add
      .text(FIELD.w / 2, PRESS.top + 40, 'НАЖМИ НА СЕКЦИЮ,\nКУДА НАПРАВИТЬ БАНКУ', {
        fontFamily: 'monospace',
        fontSize: '7px',
        color: '#a6f05c',
        align: 'center',
      })
      .setOrigin(0.5, 0)
      .setResolution(4)
      .setDepth(6)
    this.time.delayedCall(9000, () => this.hideHint())

    this.fit()
    this.scale.on('resize', this.fit, this)
    this.events.once('shutdown', () => this.scale.off('resize', this.fit, this))

    this.input.on('pointerdown', this.onDown, this)
    this.input.keyboard?.on('keydown', this.onKey, this)

    this.emitHud()
    this.bridge.onReady(this)
  }

  /** Пауза оболочки */
  setPaused(paused: boolean) {
    if (paused) this.scene.pause()
    else this.scene.resume()
  }

  // Целое увеличение, при котором влезает важная часть поля; поле по центру
  private fit() {
    const cam = this.cameras.main
    const zoom = Math.max(1, Math.floor(Math.min(this.scale.width / FIELD.minW, this.scale.height / FIELD.minH)))
    cam.setZoom(zoom)
    cam.centerOn(FIELD.w / 2, FIELD.h / 2)
  }

  // ---------- Рисование ----------

  /** Жёлоб, пресс и подписи секций — то, что не меняется */
  private drawStatic() {
    drawBackdrop(this.add.graphics().setDepth(0))
    const g = this.add.graphics().setDepth(1)

    this.drawChute(g)

    // Три секции пресса (корпус и стена нарисованы в backdrop.ts)
    // Секции — стальные створки, покрашенные в приглушённый цвет своего материала
    for (let i = 0; i < 3; i++) this.drawSection(g, i)

    for (let i = 0; i < 3; i++) {
      this.labels.push(
        this.add
          .text(sectionX(i), PRESS.bottom - 12, MATERIAL_NAMES[i].toUpperCase(), { fontFamily: 'monospace', fontSize: '7px', color: COLORS.text })
          .setOrigin(0.5)
          .setResolution(4)
          .setDepth(5),
      )
    }
  }

  /** Жёлоб: два стальных лотка с задней стенкой, кронштейнами и заклёпками, внизу — горловина */
  private drawChute(g: Phaser.GameObjects.Graphics) {
    const { startX, startY, vertexX, vertexY } = CHUTE
    for (const side of [-1, 1]) {
      const x0 = side < 0 ? startX : FIELD.w - startX
      const dx = vertexX - x0
      const dy = vertexY - startY
      const at = (t: number) => ({ x: x0 + dx * t, y: startY + dy * t })
      // Продолжение ветки за верхним концом: на широком экране жёлоб доходит до верха, а не обрывается
      const ext = (startY + 80) / dy
      const xs = x0 - dx * ext
      const ys = startY - dy * ext

      // Задняя стенка лотка за банками
      g.fillStyle(0x2a312e)
      g.fillPoints(
        [new Phaser.Math.Vector2(xs, ys - 18), new Phaser.Math.Vector2(vertexX, vertexY - 18), new Phaser.Math.Vector2(vertexX, vertexY), new Phaser.Math.Vector2(xs, ys)],
        true,
      )
      g.lineStyle(1, 0x14110f)
      g.lineBetween(xs, ys - 18, vertexX, vertexY - 18)
      // Кронштейны под лотком
      g.lineStyle(2, 0x1d2420)
      for (const t of [0.15, 0.5, 0.85, -0.35, -0.85, -1.35, -1.85]) {
        const p = at(t)
        g.lineBetween(p.x, p.y + 4, p.x + side * -5, p.y + 14)
      }
      // Дно лотка: тёмный низ, сталь, светлая кромка
      g.lineStyle(1, 0x14110f)
      g.lineBetween(xs, ys + 5, vertexX, vertexY + 5)
      g.lineStyle(3, 0x4b5a52)
      g.lineBetween(xs, ys + 2.5, vertexX, vertexY + 2.5)
      g.lineStyle(1, 0xc9d3d6)
      g.lineBetween(xs, ys, vertexX, vertexY)
      // Заклёпки по дну
      g.fillStyle(0x1d2420)
      for (const t of [0.08, 0.25, 0.42, 0.59, 0.76, 0.93, -0.1, -0.27, -0.44, -0.61, -0.78, -0.95, -1.12, -1.29, -1.46, -1.63, -1.8]) {
        const p = at(t)
        g.fillRect(Math.round(p.x), Math.round(p.y) + 2, 1, 1)
      }
    }

    // Горловина под вершиной: стальная труба до заслонки
    const top = vertexY
    const bottom = FLAP.pivotY + 2
    g.fillStyle(0x14110f)
    g.fillRect(vertexX - 10, top - 1, 20, bottom - top + 2)
    g.fillStyle(0x4b5a52)
    g.fillRect(vertexX - 9, top, 18, bottom - top)
    g.fillStyle(0x65776c)
    g.fillRect(vertexX - 9, top, 2, bottom - top)
    g.fillStyle(0x2f3a35)
    g.fillRect(vertexX + 7, top, 2, bottom - top)
    g.fillStyle(0x14110f)
    g.fillRect(vertexX - 7, top + 1, 14, bottom - top - 1)
  }

  /** Створка секции: крашеная сталь с кромкой, швом, заклёпками и потёртостями */
  private drawSection(g: Phaser.GameObjects.Graphics, i: number) {
    const x = PRESS.x0 + i * PRESS.step
    const { top, bottom, w } = PRESS
    const h = bottom - top
    const base = mix(this.materialColor(i), 0x555d5a, 0.55)
    const light = mix(base, 0xffffff, 0.22)
    const dark = mix(base, 0x000000, 0.35)

    g.fillStyle(base)
    g.fillRect(x, top, w, h)
    // Объём: свет сверху и слева, тень снизу и справа
    g.fillStyle(light)
    g.fillRect(x, top, w, 2)
    g.fillRect(x, top, 2, h)
    g.fillStyle(dark)
    g.fillRect(x, bottom - 2, w, 2)
    g.fillRect(x + w - 2, top, 2, h)
    // Вмятая панель посередине и горизонтальные рёбра жёсткости
    g.lineStyle(1, dark)
    g.strokeRect(x + 5.5, top + 8.5, w - 11, h - 33)
    g.fillStyle(dark)
    for (const k of [0.2, 0.4, 0.6]) g.fillRect(x + 6, Math.round(top + h * k), w - 12, 1)
    // Табличка с названием материала внизу створки
    g.fillStyle(0x14110f)
    g.fillRect(x + 3, bottom - 20, w - 6, 14)
    g.fillStyle(0x2f3a35)
    g.fillRect(x + 4, bottom - 19, w - 8, 12)
    g.fillStyle(0x1d2420)
    g.fillRect(x + 5, bottom - 18, 1, 1)
    g.fillRect(x + w - 6, bottom - 18, 1, 1)
    g.fillRect(x + 5, bottom - 9, 1, 1)
    g.fillRect(x + w - 6, bottom - 9, 1, 1)
    // Заклёпки по углам
    g.fillStyle(0x1d2420)
    for (const [dx, dy] of [[3, 3], [w - 5, 3], [3, h - 4], [w - 5, h - 4]]) g.fillRect(x + dx, top + dy, 2, 2)
    // Потёртости: светлые царапины и ржавые потёки
    for (let k = 0; k < 7; k++) {
      const sx = x + 4 + ((k * 13 + i * 5) % (w - 8))
      const sy = top + 6 + ((k * 29 + i * 11) % (h - 20))
      g.fillStyle(k % 2 ? 0x8a4a22 : light, 0.55)
      g.fillRect(sx, sy, 1, 3 + (k % 4) * 2)
    }
  }

  /** Разделитель-заслонка под горловиной и люки: открыт только люк выбранной секции */
  private drawFlap() {
    const tipX = CHUTE.vertexX + (sectionX(this.flap) - CHUTE.vertexX) * FLAP.reach
    const f = this.flapGfx
    f.clear()
    // Створка разделителя: тёмный контур, выцветшая краска (приглушена к стали), потёртая кромка
    const paint = mix(COLORS.flap, 0x555d5a, 0.55)
    const dx = tipX - CHUTE.vertexX
    const dy = FLAP.tipY - FLAP.pivotY
    const at = (t: number) => ({ x: Math.round(CHUTE.vertexX + dx * t), y: Math.round(FLAP.pivotY + dy * t) })
    f.lineStyle(7, 0x14110f)
    f.lineBetween(CHUTE.vertexX, FLAP.pivotY, tipX, FLAP.tipY)
    f.lineStyle(5, paint)
    f.lineBetween(CHUTE.vertexX, FLAP.pivotY, tipX, FLAP.tipY)
    f.lineStyle(1, mix(paint, 0xffffff, 0.2))
    f.lineBetween(CHUTE.vertexX - 1, FLAP.pivotY, tipX - 1, FLAP.tipY)
    // Следы старости: облупившаяся краска до металла, пятна ржавчины, тёмная копоть
    for (const [t, dark] of [[0.3, false], [0.55, true], [0.8, false]] as const) {
      const p = at(t)
      f.fillStyle(dark ? 0x8a4a22 : 0x7f909c, 0.8)
      f.fillRect(p.x - 1, p.y, 2, 1)
    }
    f.fillStyle(0x14110f, 0.3)
    f.fillRect(at(0.65).x, at(0.65).y - 1, 1, 2)
    // Ось с болтом: матовая сталь, ржавый ободок
    f.fillStyle(0x14110f)
    f.fillCircle(CHUTE.vertexX, FLAP.pivotY, 4.5)
    f.fillStyle(0x65776c)
    f.fillCircle(CHUTE.vertexX, FLAP.pivotY, 3.5)
    f.fillStyle(0x8a4a22, 0.7)
    f.fillRect(CHUTE.vertexX + 1, FLAP.pivotY + 1, 2, 2)
    f.fillStyle(0xa9b4b8)
    f.fillRect(CHUTE.vertexX - 2, FLAP.pivotY - 2, 2, 1)
    f.fillStyle(0x14110f)
    f.fillRect(CHUTE.vertexX - 1, FLAP.pivotY, 3, 1)

    // Люки над секциями
    const h = this.hatchGfx
    h.clear()
    this.selectGfx.clear()
    for (let i = 0; i < 3; i++) {
      this.drawHatch(h, i, i === this.flap)
      if (i !== this.flap) {
        // Закрытая секция притушена
        this.selectGfx.fillStyle(0x000000, 0.3)
        this.selectGfx.fillRect(PRESS.x0 + i * PRESS.step - 2, PRESS.top - 14, PRESS.w + 4, PRESS.bottom - PRESS.top + 16)
      }
      this.labels[i]?.setColor(i === this.flap ? COLORS.selectText : '#c9d3d6')
    }
  }

  /** Двустворчатый люк: закрыт — створки сомкнуты, открыт — тёмный проём с зелёным светом */
  private drawHatch(g: Phaser.GameObjects.Graphics, i: number, open: boolean) {
    const x = PRESS.x0 + i * PRESS.step
    const y = PRESS.top - 14
    const w = PRESS.w
    const hh = 12
    g.fillStyle(0x14110f)
    g.fillRect(x, y, w, hh)
    // Рама люка
    g.fillStyle(0x2f3a35)
    g.fillRect(x + 1, y + 1, w - 2, hh - 2)
    if (open) {
      // Проём и свет изнутри
      g.fillStyle(0x0a0a09)
      g.fillRect(x + 5, y + 2, w - 10, hh - 3)
      g.fillStyle(COLORS.select, 0.35)
      g.fillRect(x + 5, y + hh - 3, w - 10, 2)
      g.fillStyle(COLORS.select)
      g.fillRect(x + 5, y + hh - 2, w - 10, 1)
      // Створки откинуты на стороны ребром
      g.fillStyle(0x65776c)
      g.fillRect(x + 1, y + 1, 4, hh - 2)
      g.fillRect(x + w - 5, y + 1, 4, hh - 2)
      g.fillStyle(0x2f3a35)
      g.fillRect(x + 4, y + 1, 1, hh - 2)
      g.fillRect(x + w - 2, y + 1, 1, hh - 2)
      // Лампа горит зелёным
      g.fillStyle(COLORS.select)
      g.fillRect(x + w / 2 - 1, y - 1, 3, 2)
    } else {
      const half = (w - 4) / 2
      for (const lx of [x + 2, x + 2 + half]) {
        g.fillStyle(0x7f909c)
        g.fillRect(lx, y + 2, half, hh - 4)
        g.fillStyle(0xb7c5cf)
        g.fillRect(lx, y + 2, half, 1)
        g.fillStyle(0x4f5d6a)
        g.fillRect(lx, y + hh - 3, half, 1)
      }
      // Шов, ручки и заклёпки
      g.fillStyle(0x14110f)
      g.fillRect(x + w / 2 - 1, y + 2, 2, hh - 4)
      g.fillRect(x + w / 2 - 5, y + 5, 2, 3)
      g.fillRect(x + w / 2 + 3, y + 5, 2, 3)
      g.fillRect(x + 4, y + 3, 1, 1)
      g.fillRect(x + w - 5, y + 3, 1, 1)
      g.fillRect(x + 4, y + hh - 4, 1, 1)
      g.fillRect(x + w - 5, y + hh - 4, 1, 1)
      // Лампа не горит
      g.fillStyle(0x7a2a2a)
      g.fillRect(x + w / 2 - 1, y - 1, 3, 2)
    }
  }

  private hideHint() {
    if (!this.hint) return
    const h = this.hint
    this.hint = undefined
    this.tweens.add({ targets: h, alpha: 0, duration: 300, onComplete: () => h.destroy() })
  }

  private materialColor(type: number) {
    const m: Material = MATERIALS[type]
    return m === 'plastic' ? 0x6ec6ff : m === 'glass' ? 0x5fd38d : 0xb8bfc4
  }

  // ---------- Ход игры ----------

  update(_time: number, deltaMs: number) {
    if (!this.running) return
    const dt = Math.min(0.1, deltaMs / 1000)

    this.timeLeft -= dt
    if (this.timeLeft <= 0) {
      this.timeLeft = 0
      this.end(false)
      return
    }

    this.elapsed += dt
    const t = Math.min(1, this.elapsed / this.cfg.shift)
    const speed = lerp(this.cfg.speed, t)

    this.spawnIn -= dt
    if (this.spawnIn <= 0) {
      this.spawnIn += lerp(this.cfg.interval, t)
      this.spawn()
    }

    // Скорость общая для всех банок: обогнать друг друга они не могут
    for (const can of [...this.cans]) {
      can.s += speed * dt
      if (can.s >= RAIL_LEN) {
        this.reachVertex(can)
        continue
      }
      this.place(can)
    }

    this.emitHud()
  }

  private spawn() {
    // Один материал подряд не больше трёх раз
    const [a, b, c] = this.lastTypes.slice(-3)
    let type = Phaser.Math.Between(0, 2)
    if (a === b && b === c && type === a) type = (type + Phaser.Math.Between(1, 2)) % 3
    this.lastTypes.push(type)

    const g = this.add.image(0, 0, canTexture(type)).setOrigin(0.5, 1).setDepth(2)
    const can: Can = { type, side: Math.random() < 0.5 ? -1 : 1, s: 0, g }
    this.cans.push(can)
    this.place(can)
  }

  /** Банка едет по ветке: сидит на рейке */
  private place(can: Can) {
    const x = can.side < 0 ? CHUTE.startX + RAIL_DIR.x * can.s : FIELD.w - CHUTE.startX - RAIL_DIR.x * can.s
    can.g.setPosition(Math.round(x), Math.round(CHUTE.startY + RAIL_DIR.y * can.s - 1))
  }

  /** Банка у вершины: куда смотрит заслонка, туда и упадёт */
  private reachVertex(can: Can) {
    const i = this.cans.indexOf(can)
    if (i >= 0) this.cans.splice(i, 1)
    const section = this.flap
    const img = can.g
    const hatchY = PRESS.top - 6
    img.setPosition(CHUTE.vertexX, FLAP.pivotY + 8)
    this.tweens.add({
      targets: img,
      x: sectionX(section),
      y: hatchY + img.height,
      duration: TIMING.drop * 1000,
      ease: 'Quad.easeIn',
      // Ниже края люка банка скрыта: она уходит внутрь пресса
      onUpdate: () => img.setCrop(0, 0, img.width, Math.max(0, Math.min(img.height, hatchY - (img.y - img.height)))),
      onComplete: () => {
        can.g.destroy()
        this.land(can.type, section)
      },
    })
  }

  /** Банка упала в секцию: подходит — очки, нет — ошибка */
  private land(type: number, section: number) {
    if (!this.running) return
    if (type !== section) {
      this.mistake(section)
      return
    }
    this.score += this.cfg.points
    sfx.tone(520 + section * 120, 0.08, 'triangle', 0.05)
    this.emitHud()
  }

  private mistake(section: number) {
    // Неподходящая банка вылетает из секции обратно
    const g = this.add.graphics().setDepth(5)
    g.fillStyle(0xcd004b, 0.8)
    g.fillRect(PRESS.x0 + section * PRESS.step, PRESS.top, PRESS.w, 10)
    this.tweens.add({ targets: g, alpha: 0, duration: 350, onComplete: () => g.destroy() })

    this.misses++
    sfx.tone(140, 0.25, 'sawtooth', 0.06)
    platform.haptic('error')
    this.cameras.main.shake(120, 0.004)
    this.bridge.onMistake()
    this.emitHud()
    if (this.misses >= this.cfg.maxMisses) this.end(true)
  }

  private end(failed: boolean) {
    if (!this.running) return
    this.running = false
    this.bridge.onEnd({ score: this.score, misses: this.misses, failed })
  }

  private emitHud() {
    const hud: PressHud = { score: this.score, time: Math.ceil(this.timeLeft), misses: this.misses }
    const key = `${hud.score}|${hud.time}|${hud.misses}`
    if (key === this.lastHud) return
    this.lastHud = key
    this.bridge.onHud(hud)
  }

  // ---------- Ввод ----------

  private setFlap(section: number) {
    const next = Phaser.Math.Clamp(section, 0, 2)
    if (next === this.flap) return
    this.flap = next
    this.hideHint()
    platform.haptic('tap')
    sfx.tone(300 + next * 60, 0.04, 'square', 0.03)
    this.drawFlap()
  }

  /** Нажатие в любом месте: поле делится на три вертикальные полосы по секциям */
  private onDown(p: Phaser.Input.Pointer) {
    if (!this.running) return
    this.setFlap(Math.floor((p.worldX / FIELD.w) * 3))
  }

  private onKey(e: KeyboardEvent) {
    if (!this.running) return
    if (e.key === '1' || e.key === '2' || e.key === '3') this.setFlap(Number(e.key) - 1)
    else if (e.key === 'ArrowLeft' || e.key === 'a') this.setFlap(this.flap - 1)
    else if (e.key === 'ArrowRight' || e.key === 'd') this.setFlap(this.flap + 1)
  }
}
