import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'

interface Props {
  id: string
  name: string
  options: string[]
}

/**
 * Выпадающий список в стиле лендинга. Меню системного <select> оформить нельзя —
 * на телефоне и ПК оно выглядит по-своему, поэтому список свой (роль listbox, управление с клавиатуры).
 * Значение уходит в форму через скрытое поле name.
 */
export function Choice({ id, name, options }: Props) {
  const [value, setValue] = useState(options[0])
  const [open, setOpen] = useState(false)
  // Подсвеченный пункт при управлении стрелками
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listId = useId()

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const show = () => {
    setActive(options.indexOf(value))
    setOpen(true)
  }

  const pick = (i: number) => {
    setValue(options[i])
    setOpen(false)
    buttonRef.current?.focus()
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const last = options.length - 1
    const move = (i: number) => {
      e.preventDefault()
      if (open) setActive(i)
      else show()
    }
    switch (e.key) {
      case 'ArrowDown':
        return move(Math.min(active + 1, last))
      case 'ArrowUp':
        return move(Math.max(active - 1, 0))
      case 'Home':
        return move(0)
      case 'End':
        return move(last)
      case 'Enter':
      case ' ':
        e.preventDefault()
        return open ? pick(active) : show()
      case 'Escape':
        if (open) {
          // Не даём Escape уйти дальше — иначе сработает «назад» (useBack)
          e.preventDefault()
          e.stopPropagation()
          setOpen(false)
        }
        return
      case 'Tab':
        setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className={'choice' + (open ? ' open' : '')}>
      <input type="hidden" name={name} value={value} />
      <button
        ref={buttonRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
      >
        <span>{value}</span>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul id={listId} role="listbox" aria-labelledby={id} tabIndex={-1}>
          {options.map((o, i) => (
            <li
              key={o}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={o === value}
              className={i === active ? 'active' : undefined}
              onPointerEnter={() => setActive(i)}
              onClick={() => pick(i)}
            >
              {o}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
