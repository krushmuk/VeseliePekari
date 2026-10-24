import type Phaser from 'phaser'
import { Grid, PAL, cylinderShade, pixelTexture } from '../pixel'

// Банки на прессе — бракованные версии упаковок из bottleTypes.ts: смятый ПЭТ iNice,
// разбитая стеклянная бутылка и помятая банка Cool Cola. Рисунок без контура, как в bottleTypes.

/** Ключ текстуры банки: номер совпадает с материалом (0 пластик, 1 стекло, 2 металл) */
export const canTexture = (type: number) => `scrap-${type}`

const canBottom = (w: number) => ['S'.repeat(w), '.' + 's'.repeat(w - 2) + '.']

interface Art {
  art: string[]
  colors: Record<string, string>
}

const ARTS: Art[] = [
  {
    // Смятый ПЭТ: перекошенный колпачок, талия сдавлена складками, этикетка порвана
    art: [
      '..GGGG.G..',
      '..GgGgGg..',
      '..gggggg..',
      '.cccccccc.',
      '..cccccc..',
      '..cccccc..',
      '.cccccccc.',
      'cccccccccc',
      'tttttttttt',
      'llllllllll',
      'oDDDDDoLoo',
      'oDwwwDoooo',
      'oDDDDDLLo.',
      '.qoLooLLlo',
      '..qqooolo.',
      '...qqqoo..',
      '..qooooLL.',
      'ocooooLLlo',
      'tttttttttt',
      'tttctttttt',
      'TTTTTTTTTT',
      '.TTTTTTTT.',
    ],
    colors: {
      G: '#5ccc3c', g: '#2f8f2a', c: '#cfe3e6', t: '#c0601c', T: '#8a3a12',
      o: '#f28c28', D: '#1f5a50', w: '#ffffff', L: '#f6d23a', l: '#8ccf3a', q: '#7f9aa0',
    },
  },
  {
    // Разбитая бутылка: зубчатое горло, трещина через всю бутылку, выбитый кусок снизу
    art: [
      '...g..g...',
      '..ggg.gg..',
      '..gGgggg..',
      '..gggggg..',
      '..gGgxgg..',
      '.ggGggxggg',
      'ggGgggxggg',
      'ggGgggxxgg',
      'llllllxlll',
      'lrrrrrxrrl',
      'lrwwwrxrrl',
      'lrrrrrxlll',
      'llllllxxl.',
      'gGgggggxg.',
      'ggGggggxg.',
      'ggGgggg...',
      'ggGgggg..g',
      'gGgggggggg',
      'hhhhhhhhhh',
      '.hhhhhhhh.',
    ],
    colors: { g: '#3f8f5a', G: '#7fd0a0', h: '#256a40', x: '#0e1a14', l: '#e9dfc4', r: '#b0303a', w: '#ffffff' },
  },
  {
    // Помятая банка: заломленный край, вмятина с обеих сторон, ржавчина и потёртая краска
    art: [
      '.SSSSS..',
      'WWWWWWWW',
      'ssssssss',
      'uuuuuuur',
      'uuwwwwur',
      'uwwuuurr',
      'uwwuurrr',
      'qqwuurr.',
      '.qquurr.',
      '..qqrr..',
      '..nqrr..',
      '.nqqrrr.',
      'urwqrwwr',
      'urrnrrrr',
      'rwwrwwrr',
      'rrrrrrnr',
      'rrrrrrrr',
      ...canBottom(8),
    ],
    colors: { u: '#2f8fd8', r: '#e0303a', w: '#ffffff', q: '#1d4f80', n: '#8a4a22' },
  },
]

export function createCanSprites(scene: Phaser.Scene) {
  ARTS.forEach((a, type) => {
    const w = Math.max(...a.art.map(r => r.length))
    const rows = new Grid(w + 2, a.art.length + 2).stamp(a.art, 1, 1).outline().rows()
    const pal = { ...PAL, ...a.colors }
    pixelTexture(scene, canTexture(type), rows, pal, cylinderShade(rows, pal))
  })
}
