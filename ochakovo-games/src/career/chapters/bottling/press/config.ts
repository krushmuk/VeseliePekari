// Числа третьего уровня главы 1 — «Пресс». Серый прототип без графики.
// Координаты — в логических пикселях поля FIELD (камера масштабирует поле под экран, как в розливе).

/** Номер уровня (с нуля), который играется на прессе, а не на конвейере */
export const PRESS_LEVEL = 2

export const FIELD = { w: 150, h: 240, minW: 144, minH: 236 }

/** Материал банки; номер совпадает с номером секции пресса слева направо */
export const MATERIALS = ['plastic', 'glass', 'metal'] as const
export type Material = (typeof MATERIALS)[number]

export const MATERIAL_NAMES = ['Пластик', 'Стекло', 'Металл']

/**
 * V-образный жёлоб: две ветки сходятся в вершину vertex. Банки появляются в верхних концах
 * (startY — высота верха, startX — отступ от края поля) и скатываются к вершине
 */
export const CHUTE = { startX: 4, startY: 14, vertexX: 75, vertexY: 98 }

/** Заслонка под вершиной: ось, высота кончика и насколько кончик сдвигается к своей секции (доля) */
export const FLAP = { pivotY: 106, tipY: 124, reach: 0.35 }

/** Пресс: верх секций (куда падают банки), низ, ширина секции и шаг между ними */
export const PRESS = { top: 146, bottom: 232, x0: 5, w: 44, step: 47 }

export const TIMING = {
  /** Падение банки с заслонки в секцию, с */
  drop: 0.28,
  /** Пауза перед первой банкой, с */
  start: 0.7,
}

export interface PressConfig {
  /** Скорость банок по жёлобу в начале и в конце смены, px/с — сложность растёт только ею */
  speed: [from: number, to: number]
  /** Интервал между банками в начале и в конце смены, с */
  interval: [from: number, to: number]
  /** Очки за правильно отправленную банку */
  points: number
  /** После стольких ошибок смена сорвана */
  maxMisses: number
  /** Длина смены, с */
  shift: number
  /** Очки для 1, 2 и 3 звёзд */
  stars: [number, number, number]
}

export const PRESS_CONFIG: PressConfig = {
  speed: [30, 60],
  interval: [2.5, 1.3],
  points: 25,
  maxMisses: 5,
  shift: 70,
  stars: [350, 550, 700],
}

/** Для 3 звёзд ошибок должно быть не больше */
export const PERFECT_MISSES = 1

/** Центр секции i по горизонтали */
export const sectionX = (i: number) => PRESS.x0 + i * PRESS.step + PRESS.w / 2
