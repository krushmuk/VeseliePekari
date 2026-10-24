import { FOREMAN_PAL, foremanRows } from './foremanArt'
import { PixelPortrait } from './PixelPortrait'

const ROWS = foremanRows()

/** Мастер цеха: пиксельный портрет для рамки диалога */
export function ForemanArt() {
  return <PixelPortrait rows={ROWS} palette={FOREMAN_PAL} label="Мастер цеха" />
}
