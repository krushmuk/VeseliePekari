import { PixelPortrait } from '../bottling/press/PixelPortrait'
import { LAB_PAL, labRows } from './labArt'

const ROWS = labRows()

/** Лаборант: пиксельный портрет для рамки диалога */
export function LabPortrait() {
  return <PixelPortrait rows={ROWS} palette={LAB_PAL} label="Лаборант" />
}
