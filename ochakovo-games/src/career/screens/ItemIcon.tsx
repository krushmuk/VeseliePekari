// Пиксельные иконки предметов пролога: спрайты 10×10, каждый символ — один «пиксель»
const PALETTE: Record<string, string> = {
  k: '#1a1a1a', w: '#f4f0e4', g: '#9aa0a6', G: '#5a6068',
  r: '#c8321e', R: '#8c1f12', y: '#f0b820', Y: '#b88410',
  o: '#e87a20', b: '#3f7fc0', B: '#27508a', c: '#8fd0e8',
  n: '#8b5a2b', N: '#5a3517', l: '#3f9a4a', L: '#2a6a30',
  m: '#8a4aa8', M: '#5e2f78', t: '#d9c08a',
}

const SPRITES: Record<string, string[]> = {
  // сканер (ТСД)
  tsd: [
    '..kkkkkk..', '.kGGGGGGk.', '.kGcccGGk.', '.kGcccGGk.', '.kGGGGGGk.',
    '.kGyGrGgk.', '.kGGGGGGk.', '.kGgGgGgk.', '.kGGGGGGk.', '..kkkkkk..',
  ],
  radio: [
    '......k...', '.....kg...', '....kkk...', '.kkkkkkkk.', '.kGGGGGGk.',
    '.kGcGgggk.', '.kGGGGGGk.', '.kGgGgGgk.', '.kGGGGGGk.', '..kkkkkk..',
  ],
  thermos: [
    '...kkkk...', '...krrk...', '..kkkkkk..', '..kbbbbk..', '..kbwbbk..',
    '..kbwbbk..', '..kbbbbk..', '..kbbBBk..', '..kBBBBk..', '..kkkkkk..',
  ],
  notebook: [
    '.kkkkkkkk.', '.kRRRRRRk.', '.kRwwwwRk.', '.kRwkkwRk.', '.kRwwwwRk.',
    '.kRRRRRRk.', '.kRRRRRRk.', '.kRRRRRRk.', '.kRRRRRRk.', '.kkkkkkkk.',
  ],
  helmet: [
    '....kk....', '...kyyk...', '..kyyyyk..', '.kyyywyyk.', '.kyyyyyyk.',
    '.kyyyyyyk.', 'kkkkkkkkkk', 'kYYYYYYYYk', '.kkkkkkkk.', '..........',
  ],
  // банка кваса «Очаковский»
  kvass: [
    '..kkkkkk..', '.kggggggk.', '.kyyyyyyk.', '.kyrrryyk.', '.kyrnnryk.',
    '.klllllyk.', '.kyrnnryk.', '.kyyrrryk.', '.kggggggk.', '..kkkkkk..',
  ],
  goggles: [
    '..........', '..........', '..........', 'kkkkkkkkkk', 'kcwckkcwck',
    'kccckkccck', '.kkk..kkk.', '..........', '..........', '..........',
  ],
  plugs: [
    '..........', '.kkk..kkk.', '.kok..kok.', '.kok..kok.', '.kok..kok.',
    '.kok..kok.', '.kok..kok.', '..kk..kk..', '..k....k..', '..kkkkkk..',
  ],
  gear: [
    '....kk....', '.kk.yy.kk.', '.kyyyyyyk.', '..kyYYyk..', 'kyyyYYyyyk',
    'kyyyYYyyyk', '..kyYYyk..', '.kyyyyyyk.', '.kk.yy.kk.', '....kk....',
  ],
  tablet: [
    '.kkkkkkkk.', '.kGGGGGGk.', '.kGbbbbGk.', '.kGbcbbGk.', '.kGbbrbGk.',
    '.kGbbbbGk.', '.kGbbbbGk.', '.kGGGGGGk.', '.kGGggGGk.', '.kkkkkkkk.',
  ],
  recipes: [
    '.kkkkkkkk.', '.kLlllllk.', '.kLlyyllk.', '.kLlllllk.', '.kLlyyllk.',
    '.kLlllllk.', '.kLlllllk.', '.kkkkkkkk.', '.kwwwwwwk.', '.kkkkkkkk.',
  ],
  wheat: [
    '...y..y...', '..yyyyyy..', '..yYyyYy..', '...yyyy...', '...yYYy...',
    '....yy....', '....nn....', '....nn....', '....nn....', '....nn....',
  ],
  tube: [
    '..kkkkkk..', '...kwwk...', '...kwwk...', '...kcck...', '...kcck...',
    '...kllk...', '...kllk...', '...kllk...', '...kLLk...', '....kk....',
  ],
  microscope: [
    '...kkk....', '..kGGGk...', '..kGGGk...', '..kgggk...', '...kGkkk..',
    '...kGkGGk.', '...kGkGGk.', '.kkkGkkkk.', '.kGGGGGGGk', '.kkkkkkkkk',
  ],
  coat: [
    '.kk....kk.', 'kwwk..kwwk', 'kwwwkkwwwk', 'kwwwwwwwwk', 'kwgwwwwgwk',
    '.kwwwwwwk.', '.kwwwwwwk.', '.kwgwwgwk.', '.kwwwwwwk.', '.kkkkkkkk.',
  ],
  glasses: [
    '..........', '..........', '..........', 'kkkkkkkkkk', 'kcwckkcwck',
    'kccckkccck', '.kkk..kkk.', '..........', '..........', '..........',
  ],
  teddy: [
    '.kk....kk.', 'knnkkkknnk', '.knnnnnnk.', '.knknnknk.', '.knttttnk.',
    '.kntkktnk.', '..knnnnk..', '.knnnnnnk.', '.knnnnnnk.', '.kkk..kkk.',
  ],
  car: [
    '..........', '..........', '...kkkk...', '..kcckcck.', '.kkrrrrrkk',
    'krrryyrrrk', 'krrrrrrrrk', '.kGGkkGGk.', '.kGGkkGGk.', '..kk..kk..',
  ],
  sleeping: [
    '..kkkkkk..', '.kBBBBBBk.', '.kBNNNNBk.', '.kBBNNBBk.', '.kbbgybbk.',
    '.kbbgbbbk.', '.koogoook.', '.kbbgbbbk.', '..kbbbbk..', '...kkkk...',
  ],
  guitar: [
    '......kgNN', '......kkNk', '.....kkNkk', '...kkkNkk.', '..kkoNkk..',
    '.kkoook...', 'kkoNook...', 'koooook...', 'koBBokk...', 'kkkkkk....',
  ],
}

export function ItemIcon({ id }: { id: string }) {
  const rows = SPRITES[id] ?? []
  return (
    <svg className="item-icon" viewBox="0 0 10 10" shapeRendering="crispEdges" aria-hidden="true">
      {rows.flatMap((row, y) =>
        [...row].map((ch, x) =>
          PALETTE[ch] ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={PALETTE[ch]} /> : null,
        ),
      )}
    </svg>
  )
}
