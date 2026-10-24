// Правила уровня «Эталон»: параметры проб и их генерация. Графики здесь нет.

/** Параметры пробы: оттенок кваса (номер в SHADES), число пузырьков и время подъёма пузырька со дна до поверхности, с */
export interface Sample {
  shade: number
  bubbles: number
  period: number
}

/** Чем отличается неверная проба от эталона — по этому подбирается реплика лаборанта */
export type Diff = 'lighter' | 'darker' | 'bubbles' | 'faster' | 'slower'

export interface Candidate {
  sample: Sample
  /** null — проба совпадает с эталоном */
  diff: Diff | null
}

/** Оттенки кваса от светлого к тёмному */
export const SHADES = [0xe8b04a, 0xdca03c, 0xcf8f30, 0xbf7d27, 0xa86a20, 0x8f5719, 0x764614, 0x5e370f, 0x47290b, 0x321c08, 0x211205]

export const ETALON: Sample = { shade: 6, bubbles: 5, period: 2.4 }

/** Допустимые отличия неверной пробы: в оттенках, во времени подъёма (число пузырьков — в wrongSample) */
const SHADE_STEPS = [-3, -2, 2, 3]
const PERIODS = [1.5, 1.7, 3.2, 3.7]

export const RIGHT = 3
export const WRONG = 9

const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)]

function shuffle<T>(list: T[]): T[] {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}

/** Неверная проба: отличается в одном или двух из трёх свойств */
function wrongSample(): Candidate {
  const props = shuffle(['shade', 'bubbles', 'period']).slice(0, 1 + Math.floor(Math.random() * 2))
  const sample = { ...ETALON }
  let diff: Diff | null = null
  if (props.includes('shade')) {
    const step = pick(SHADE_STEPS.filter(s => SHADES[ETALON.shade + s] !== undefined))
    sample.shade = ETALON.shade + step
    diff = step < 0 ? 'lighter' : 'darker'
  }
  if (props.includes('bubbles')) {
    sample.bubbles = pick([2, 3, 7, 8])
    diff ??= 'bubbles'
  }
  if (props.includes('period')) {
    sample.period = pick(PERIODS)
    diff ??= sample.period < ETALON.period ? 'faster' : 'slower'
  }
  return { sample, diff }
}

/** Три пробы как эталон и девять неверных, перемешанные */
export function makeCandidates(): Candidate[] {
  const list: Candidate[] = []
  for (let i = 0; i < RIGHT; i++) list.push({ sample: { ...ETALON }, diff: null })
  for (let i = 0; i < WRONG; i++) list.push(wrongSample())
  return shuffle(list)
}

/** Звёзды: три — без ошибок, две — одна, одна — две; проигрыш — 0 */
export const starsFor = (won: boolean, errors: number) => (won ? Math.max(1, 3 - errors) : 0)

/** Реплики лаборанта на неверную пробу */
export const REPLIES: Record<Diff, string> = {
  lighter: 'Ты что, дальтоник? Этот же светлее! Отправляй в утиль и смотри внимательнее!',
  darker: 'Ты что, дальтоник? Этот же темнее! Отправляй в утиль и смотри внимательнее!',
  bubbles: 'Пузырьков не столько, сколько в эталоне! Считай внимательнее!',
  faster: 'Смотри, как пузырьки несутся! В эталоне они поднимаются медленнее!',
  slower: 'Смотри, как пузырьки ползут! В эталоне они поднимаются быстрее!',
}
