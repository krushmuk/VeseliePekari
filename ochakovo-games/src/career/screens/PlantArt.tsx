import type { ReactNode } from 'react'

// Пиксельный завод: рисуем прямоугольниками на сетке 120×240, одна клетка = один «пиксель»
const W = 120
const H = 240
const GROUND = 214

/** Детерминированный «шум» для окон и звёзд, чтобы картинка не мерцала между рендерами */
const rnd = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

const R = (x: number, y: number, w: number, h: number, fill: string, key?: string | number) => (
  <rect key={key ?? `${x}-${y}-${w}-${h}-${fill}`} x={x} y={y} width={w} height={h} fill={fill} />
)

/** Сетка окон внутри прямоугольника; часть горит жёлтым */
function windows(x0: number, y0: number, cols: number, rows: number, stepX: number, stepY: number, seed: number) {
  const out: ReactNode[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lit = rnd(seed + r * 13 + c * 7) > 0.45
      out.push(R(x0 + c * stepX, y0 + r * stepY, 2, 3, lit ? '#bfe3f5' : '#4a5f7a', `${seed}-${r}-${c}`))
    }
  }
  return out
}

/** Башня: корпус, кирпичные пояса, окна и шатёр сверху */
function tower(x: number, top: number, w: number, roof: number, seed: number) {
  const body = '#8c3b2e'
  const dark = '#5e2a22'
  const light = '#b5523f'
  const cols = Math.max(1, Math.floor((w - 2) / 4))
  const rows = Math.floor((GROUND - top - 12) / 9)
  return (
    <g key={`tower-${x}`}>
      {R(x, top, w, GROUND - top, body)}
      {R(x, top, 2, GROUND - top, light)}
      {R(x + w - 3, top, 3, GROUND - top, dark)}
      {/* пояса */}
      {Array.from({ length: Math.floor((GROUND - top) / 24) }, (_, i) => R(x - 1, top + 12 + i * 24, w + 2, 2, dark, `b${x}-${i}`))}
      {windows(x + 3, top + 8, cols, rows, 4, 9, seed)}
      {/* карниз и шатёр */}
      {R(x - 2, top - 2, w + 4, 3, dark)}
      {Array.from({ length: roof }, (_, i) => {
        const inset = 1 + i * Math.min(2, (w / 2 - 1) / roof)
        return R(x + Math.round(inset), top - 3 - i * 2, w - Math.round(inset) * 2, 2, i % 2 ? '#2e6f4e' : '#3a8a62', `r${x}-${i}`)
      })}
      {R(x + w / 2 - 0.5, top - 4 - roof * 2 - 8, 1, 8 + 2, '#cfd8dc')}
    </g>
  )
}

function chimney(x: number, top: number, seed: number) {
  return (
    <g key={`ch-${x}`}>
      {R(x, top, 6, GROUND - top, '#6b4a3a')}
      {R(x, top, 2, GROUND - top, '#8a644f')}
      {R(x - 1, top - 2, 8, 3, '#3e2b22')}
      {Array.from({ length: Math.floor((GROUND - top) / 14) }, (_, i) => R(x, top + 6 + i * 14, 6, 2, i % 2 ? '#fff' : '#d32f2f', `s${x}-${i}`))}
      {/* дым */}
      {[0, 1, 2, 3].map(i => (
        <rect
          key={`smoke${x}-${i}`}
          className="plant-smoke"
          style={{ animationDelay: `${i * 0.7 + seed}s` }}
          x={x + 1 + (i % 2) * 2 - i}
          y={top - 7 - i * 6}
          width={4 + i * 2}
          height={4 + i}
          fill="#cfd3dc"
        />
      ))}
    </g>
  )
}

/** Большой и очень высокий завод с башнями на фоне утреннего неба */
export function PlantArt() {
  const sky = ['#6fb4e8', '#8cc5ee', '#a9d4f2', '#c9e2f2', '#f6dcc0', '#ffc9a0']
  return (
    <svg
      className="plant-art"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMax slice"
      shapeRendering="crispEdges"
      role="img"
      aria-label="Завод Очаково"
    >
      {/* небо ступенчатыми полосами */}
      {sky.map((c, i) => R(0, (i * GROUND) / sky.length, W, GROUND / sky.length + 1, c, `sky${i}`))}
      {/* солнце над горизонтом и облака */}
      {R(14, 118, 16, 16, '#ffe9a8')}
      {R(12, 120, 20, 12, '#ffe9a8')}
      {R(16, 116, 12, 20, '#ffe9a8')}
      {R(17, 121, 10, 10, '#fff6d6')}
      {[[78, 22, 22], [96, 34, 18], [10, 52, 20], [48, 70, 26], [84, 88, 20]].map(([x, y, w], i) => (
        <g key={`cloud${i}`} className="plant-cloud" style={{ animationDelay: `${i * -2}s` }}>
          {R(x, y, w, 4, '#fff')}
          {R(x + 3, y - 3, w - 8, 3, '#fff')}
          {R(x + 2, y + 4, w - 4, 2, '#dcebf7')}
        </g>
      ))}

      {/* дальний план: силуэты построек */}
      {R(0, 150, 20, 64, '#7f9cc4')}
      {R(22, 130, 14, 84, '#7f9cc4')}
      {R(84, 140, 16, 74, '#7f9cc4')}
      {R(102, 160, 18, 54, '#7f9cc4')}

      {/* трубы */}
      {chimney(2, 60, 0)}
      {chimney(112, 84, 0.3)}

      {/* башни: боковые и главная — самая высокая */}
      {tower(12, 70, 14, 5, 3)}
      {tower(94, 56, 14, 5, 8)}
      {tower(30, 40, 16, 6, 21)}
      {tower(74, 30, 16, 6, 34)}
      {tower(50, 8, 20, 9, 55)}

      {/* часы на главной башне */}
      {R(56, 48, 8, 8, '#e8e0c8')}
      {R(57, 49, 6, 6, '#fff')}
      {R(59, 50, 1, 3, '#222')}
      {R(59, 52, 3, 1, '#222')}

      {/* главный корпус */}
      {R(8, 150, 104, GROUND - 150, '#a04534')}
      {R(8, 150, 104, 3, '#c25c48')}
      {R(8, 150, 104, 1, '#d97a63')}
      {R(8, GROUND - 4, 104, 4, '#5e2a22')}
      {/* зубчатая кровля */}
      {Array.from({ length: 13 }, (_, i) => R(8 + i * 8, 146, 4, 4, '#a04534', `zub${i}`))}
      {/* два ряда окон */}
      {windows(14, 158, 12, 1, 8, 0, 70)}
      {windows(14, 170, 12, 1, 8, 0, 90)}
      {windows(14, 182, 12, 1, 8, 0, 110)}

      {/* вывеска */}
      {R(32, 192, 56, 12, '#111')}
      {R(33, 193, 54, 10, '#d32f2f')}
      <text
        x={60}
        y={201}
        textAnchor="middle"
        fontSize={7}
        fill="#fff"
        style={{ fontFamily: 'var(--pixel, monospace)' }}
        shapeRendering="auto"
      >
        ОЧАКОВО
      </text>

      {/* ворота и входная дверь */}
      {R(14, 192, 14, 22, '#2a2a33')}
      {R(14, 192, 14, 2, '#444')}
      {R(92, 192, 14, 22, '#2a2a33')}
      {R(92, 192, 14, 2, '#444')}
      {[0, 1, 2, 3].map(i => R(15, 196 + i * 4, 12, 1, '#444', `g1${i}`))}
      {[0, 1, 2, 3].map(i => R(93, 196 + i * 4, 12, 1, '#444', `g2${i}`))}

      {/* земля, дорога, фонари */}
      {R(0, GROUND, W, H - GROUND, '#2b2f3a')}
      {R(0, GROUND, W, 2, '#3d4352')}
      {R(0, GROUND + 14, W, 3, '#555c6e')}
    </svg>
  )
}
