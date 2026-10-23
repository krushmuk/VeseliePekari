// Правила коробок — чистые функции без Phaser: сцена только показывает их результат.

export interface BoxState {
  /** Типы бутылок в коробке по порядку мест (включая ещё летящие). Типы можно смешивать */
  types: number[]
  /** ready — принимает бутылки; closing — закрывается и уезжает; away — места нет, ждём новую */
  phase: 'ready' | 'closing' | 'away'
}

export const emptyBox = (): BoxState => ({ types: [], phase: 'ready' })

export type PutResult = 'ok' | 'busy'

/** Можно ли положить бутылку: busy — коробки нет или она полна. Тип не важен */
export function canPut(box: BoxState, capacity: number): PutResult {
  return box.phase === 'ready' && box.types.length < capacity ? 'ok' : 'busy'
}

/** Кладёт бутылку (проверка — canPut) и возвращает её место */
export function put(box: BoxState, type: number): number {
  box.types.push(type)
  return box.types.length - 1
}

/** Достаёт бутылку с места slot */
export function take(box: BoxState, slot: number): number {
  return box.types.splice(slot, 1)[0]
}

/** Тип коробки: все бутылки одного типа; null — пустая или смешанная */
export function boxType(box: BoxState): number | null {
  const [first] = box.types
  return first !== undefined && box.types.every(t => t === first) ? first : null
}

/** Коробку можно закрыть: полная и все бутылки одного типа */
export const isComplete = (box: BoxState, capacity: number) =>
  box.types.length >= capacity && boxType(box) !== null

/** Полная, но смешанная — пока из неё не достанут бутылку, она не примет и не закроется */
export const isJammed = (box: BoxState, capacity: number) =>
  box.types.length >= capacity && boxType(box) === null

/** Типы, которые уже лежат в неполных коробках — для подсказки генератора */
export function wantedTypes(boxes: readonly BoxState[], capacity: number): number[] {
  return boxes.filter(b => b.phase === 'ready' && b.types.length < capacity).flatMap(b => b.types)
}

/** Очки за закрытую коробку */
export const boxScore = (base: number, capacity: number) => Math.round((base * capacity) / 3)
