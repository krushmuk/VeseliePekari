import { PixelPortrait } from '../bottling/press/PixelPortrait'
import { FOREMAN_PAL, foremanRows, ICON_PAL, iconRows, VAT_H, VAT_PAL, VAT_W, VAT_WINDOW, vatRows } from './techArt'

const FOREMAN = foremanRows()
const VAT = vatRows()
const ICONS: Record<string, string[]> = {}

/** Начальник смены: пиксельный портрет для рамки диалога */
export function ForemanPortrait() {
  return <PixelPortrait rows={FOREMAN} palette={FOREMAN_PAL} label="Начальник смены" />
}

/** Иконка ингредиента */
export function IngredientIcon({ id }: { id: string }) {
  const rows = (ICONS[id] ??= iconRows(id))
  return <PixelPortrait rows={rows} palette={ICON_PAL} label="" />
}

const win = (v: number, total: number) => `${(v / total) * 100}%`

/** Смеситель: стальной чан, в окне булькает смесь. `bad` — красная подсветка при браке */
export function Vat({ bad }: { bad: boolean }) {
  return (
    <div className={`tech-vat${bad ? ' bad' : ''}`} style={{ aspectRatio: `${VAT_W} / ${VAT_H}` }}>
      <div
        className="tech-vat-window"
        style={{
          left: win(VAT_WINDOW.x, VAT_W),
          top: win(VAT_WINDOW.y, VAT_H),
          width: win(VAT_WINDOW.w, VAT_W),
          height: win(VAT_WINDOW.h, VAT_H),
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
          <i key={i} style={{ left: `${6 + i * 12}%`, animationDelay: `${(i * 0.37) % 1.6}s` }} />
        ))}
      </div>
      <PixelPortrait rows={VAT} palette={VAT_PAL} label="Смеситель" />
    </div>
  )
}
