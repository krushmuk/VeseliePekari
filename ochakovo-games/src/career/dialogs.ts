// Диалоги лежат в src/career/dialogs/*.txt, формат — в dialogs/README.md

export interface DialogLine {
  who: string
  text: string
}

const files = import.meta.glob('./dialogs/*.txt', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

function parse(raw: string): DialogLine[] {
  const lines: DialogLine[] = []
  let who = ''
  for (const block of raw.replace(/\r/g, '').split(/\n\s*\n/)) {
    const rows = block
      .split('\n')
      .map(r => r.trim())
      .filter(r => r && !r.startsWith('//'))
    if (rows.length && rows[0].startsWith('# ')) who = rows.shift()!.slice(2).trim()
    if (rows.length) lines.push({ who, text: rows.join(' ') })
  }
  return lines
}

/** Реплики диалога по имени файла без расширения */
export function loadDialog(name: string): DialogLine[] {
  const raw = files[`./dialogs/${name}.txt`]
  if (raw === undefined) {
    console.warn(`Диалог не найден: ${name}`)
    return []
  }
  return parse(raw)
}
