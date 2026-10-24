import Phaser from 'phaser'
import { BELT, BG, BIN, FIELD, FILLER } from '../config'
import { createSprites, TEX } from '../sprites'

// Старая локация перед уровнем «Пресс»: цех розлива из первых уровней, лента пустая.
// Игры здесь нет — сцена только показывает фон, пока идёт диалог с мастером цеха.

/** Скорость ленты, px/с */
const BELT_SPEED = 18

export class ShopScene extends Phaser.Scene {
  private beltTop!: Phaser.GameObjects.TileSprite
  private shift = 0

  constructor() {
    super('shop')
  }

  create() {
    createSprites(this)

    this.add.image(BG.x, BG.y, TEX.bg).setOrigin(0)

    // Лента — как в BottlingScene: длина кратна плитке рамы, начинается внутри автомата
    const x0 = BELT.x1 - Math.ceil((BELT.x1 - FILLER.x - 4) / 16) * 16
    const len = BELT.x1 - x0
    this.beltTop = this.add.tileSprite(x0, BELT.y, len, 4, TEX.beltTop).setOrigin(0)
    this.add.tileSprite(x0, BELT.y + 4, len, BELT.h - 4, TEX.beltFrame).setOrigin(0)
    this.add.image(BELT.x1, BELT.y, TEX.beltEnd).setOrigin(0)
    this.add.image(BIN.x, BIN.y, TEX.bin).setOrigin(0)
    this.add.image(FILLER.x, FILLER.bottom - FILLER.h, TEX.filler).setOrigin(0)

    this.fit()
    this.scale.on('resize', this.fit, this)
    this.events.once('shutdown', () => this.scale.off('resize', this.fit, this))
  }

  update(_time: number, deltaMs: number) {
    this.shift += BELT_SPEED * (deltaMs / 1000)
    this.beltTop.tilePositionX = -Math.round(this.shift)
  }

  // Целое увеличение, как в BottlingScene
  private fit() {
    const cam = this.cameras.main
    cam.setZoom(Math.max(1, Math.floor(Math.min(this.scale.width / FIELD.minW, this.scale.height / FIELD.minH))))
    cam.centerOn(FIELD.w / 2, FIELD.h / 2)
  }
}
