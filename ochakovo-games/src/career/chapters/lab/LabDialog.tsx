import { useState } from 'react'
import type { DialogLine } from '../../dialogs'
import { platform } from '../../../platform'
import { LabPortrait } from './LabPortrait'

/** Диалог лаборанта поверх уровня: по реплике на нажатие, в конце вызывает onDone */
export function LabDialog({ lines, startHint = 'Нажмите, чтобы начать', onDone }: {
  lines: DialogLine[]
  startHint?: string
  onDone: () => void
}) {
  const [part, setPart] = useState(0)
  const last = part >= lines.length - 1
  return (
    <div
      className="bottling-intro press-shop"
      onClick={() => {
        platform.haptic('tap')
        if (last) onDone()
        else setPart(part + 1)
      }}
    >
      <div className="bottling-intro-bubble" key={part}>
        <small>{lines[part].who}</small>
        <p>{lines[part].text}</p>
        <span className="bottling-intro-hint">{last ? startHint : 'Нажмите, чтобы продолжить'}</span>
      </div>
      <div className="bottling-intro-char" aria-label={lines[part].who}>
        <LabPortrait />
      </div>
    </div>
  )
}
