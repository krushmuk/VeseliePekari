import { MASTER_PAL, masterRows } from './masterArt'
import { PixelPortrait } from './PixelPortrait'

const ROWS = masterRows()

/** Мастер пресса: пиксельный портрет для рамки диалога */
export function MasterArt() {
  return <PixelPortrait rows={ROWS} palette={MASTER_PAL} label="Мастер пресса" />
}
