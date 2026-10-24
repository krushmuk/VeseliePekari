// Правила укладки: коробки — наборы клеток, сетка — занятость клеток. Графики здесь нет.

/** [строка, столбец] */
export type Cell = [number, number]

/** Сдвиг к началу координат: верхняя левая клетка охватывающего прямоугольника — [0, 0] */
export function normalize(cells: Cell[]): Cell[] {
  const r0 = Math.min(...cells.map(c => c[0]))
  const c0 = Math.min(...cells.map(c => c[1]))
  return cells.map(([r, c]) => [r - r0, c - c0] as Cell)
}

/** Поворот на 90° по часовой стрелке */
export const rotate = (cells: Cell[]): Cell[] => normalize(cells.map(([r, c]) => [c, -r] as Cell))

/** Размер охватывающего прямоугольника в клетках */
export function bounds(cells: Cell[]) {
  return { rows: Math.max(...cells.map(c => c[0])) + 1, cols: Math.max(...cells.map(c => c[1])) + 1 }
}

/** Сетка: в клетке — номер коробки или -1 */
export type Grid = number[][]

export const emptyGrid = (n: number): Grid => Array.from({ length: n }, () => Array<number>(n).fill(-1))

/** Коробка с левым верхним углом в (r, c) помещается: всё внутри сетки и клетки свободны */
export function fits(grid: Grid, cells: Cell[], r: number, c: number) {
  return cells.every(([dr, dc]) => grid[r + dr]?.[c + dc] === -1)
}

export function put(grid: Grid, id: number, cells: Cell[], r: number, c: number) {
  for (const [dr, dc] of cells) grid[r + dr][c + dc] = id
}

export function take(grid: Grid, id: number) {
  for (const row of grid) row.forEach((v, i) => v === id && (row[i] = -1))
}
