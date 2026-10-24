import type { LevelProps } from '../../chapters'
import MixerLevel from './MixerLevel'

/** Уровни главы «Оператор технологического цеха»: 1 — «Смеситель», 2 — «Два смесителя» */
export default function TechLevels(props: LevelProps) {
  return <MixerLevel {...props} />
}
