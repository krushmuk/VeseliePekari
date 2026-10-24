// Простые синтезированные звуки на WebAudio — без звуковых файлов.
// init() нужно вызвать из обработчика нажатия: мобильные браузеры
// разрешают звук только после действия пользователя.

class Sfx {
  private ctx: AudioContext | null = null
  private engine: OscillatorNode | null = null
  private engineGain: GainNode | null = null
  muted = false

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      return
    }
    try {
      this.ctx = new AudioContext()
      const osc = this.ctx.createOscillator()
      const filter = this.ctx.createBiquadFilter()
      this.engineGain = this.ctx.createGain()
      osc.type = 'sawtooth'
      filter.type = 'lowpass'
      filter.frequency.value = 400
      this.engineGain.gain.value = 0
      osc.connect(filter).connect(this.engineGain).connect(this.ctx.destination)
      osc.start()
      this.engine = osc
    } catch {
      this.ctx = null
    }
  }

  setEngine(speed: number, on: boolean) {
    if (!this.ctx || !this.engine || !this.engineGain) return
    const t = this.ctx.currentTime
    this.engine.frequency.setTargetAtTime(45 + Math.abs(speed) * 0.22, t, 0.05)
    this.engineGain.gain.setTargetAtTime(on && !this.muted ? 0.035 : 0, t, 0.1)
  }

  tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.08, delay = 0) {
    if (!this.ctx || this.muted) return
    const t = this.ctx.currentTime + delay
    const o = this.ctx.createOscillator()
    const gn = this.ctx.createGain()
    o.type = type
    o.frequency.value = freq
    gn.gain.setValueAtTime(vol, t)
    gn.gain.exponentialRampToValueAtTime(0.001, t + dur)
    o.connect(gn).connect(this.ctx.destination)
    o.start(t)
    o.stop(t + dur)
  }

  /** Покупка: монетка «дзынь» — две высокие ноты подряд и звон на хвосте */
  purchase() {
    this.tone(988, 0.08, 'square', 0.06)
    this.tone(1319, 0.3, 'square', 0.06, 0.08)
    this.tone(2637, 0.25, 'triangle', 0.03, 0.08)
  }

  toggleMute() {
    this.muted = !this.muted
    if (this.muted) this.setEngine(0, false)
    return this.muted
  }
}

export const sfx = new Sfx()
