import { useState } from 'react'
import { loadDialog } from '../dialogs'
import { platform, useBack } from '../../platform'

// Реплики лежат в dialogs/пролог.txt
const LINES = loadDialog('пролог')

interface Props {
  /** Вступительная миссия пройдена — открываем главы */
  onDone: () => void
  onExit?: () => void
}

/** Вступительная миссия: сначала диалог (персонаж сверху, реплики в облачке снизу), затем сама миссия */
export function PrologueScreen({ onDone, onExit }: Props) {
  const [step, setStep] = useState(0)
  const talking = step < LINES.length
  useBack(onExit ?? null)

  return talking ? (
    <div className="screen dialog-screen">
      <div className="dialog-stage">
        {/* Заглушка персонажа */}
        <div className="dialog-char" aria-label={LINES[step].who} />
      </div>
      <div className="dialog-bubble">
        <small>{LINES[step].who}</small>
        <p>{LINES[step].text}</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            platform.haptic('tap')
            setStep(step + 1)
          }}
        >
          {step === LINES.length - 1 ? 'К миссии' : 'Дальше'}
        </button>
      </div>
    </div>
  ) : (
    <div className="screen dialog-screen">
      <div className="dialog-mission">
        <h2>Вступительная миссия</h2>
        <p>Здесь будет сама миссия. (заглушка)</p>
        <button type="button" className="btn btn-primary" onClick={onDone}>
          Завершить миссию
        </button>
      </div>
    </div>
  )
}
