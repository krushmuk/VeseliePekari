// Генератор бутылок без Phaser. Чистый рандом даёт обидные серии, поэтому бутылки
// берутся из «мешка»: в нём по `capacity` штук каждого типа, так что любой тип
// гарантированно приходит в количестве, достаточном для коробки.

export class Spawner {
  private bag: number[] = []
  private types: number
  private capacity: number
  /** Доля бутылок, которые подбираются под уже начатые коробки */
  private assist: number

  constructor(types: number, capacity: number, assist: number) {
    this.types = types
    this.capacity = capacity
    this.assist = assist
  }

  /** wanted — типы, которые сейчас ждут коробки (подсказка генератора) */
  next(wanted: readonly number[]): number {
    if (this.bag.length === 0) this.refill()
    let i = this.bag.length - 1
    if (wanted.length > 0 && Math.random() < this.assist) {
      const j = this.bag.findLastIndex(t => wanted.includes(t))
      if (j >= 0) i = j
    }
    return this.bag.splice(i, 1)[0]
  }

  private refill() {
    for (let t = 0; t < this.types; t++) for (let k = 0; k < this.capacity; k++) this.bag.push(t)
    // Тасование Фишера — Йетса
    for (let i = this.bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]]
    }
  }
}
