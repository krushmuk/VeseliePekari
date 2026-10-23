import { useEffect, useRef } from 'react'
import Phaser from 'phaser'

// Плотность пикселей ограничиваем двойкой: на телефонах с dpr=3 разницу почти
// не видно, а нагрузка на видеокарту растёт в 2,25 раза.
const getDpr = () => Math.min(2, window.devicePixelRatio || 1)

interface Props {
  /** Вызывается один раз после создания игры: здесь добавляют сцены */
  onCreate: (game: Phaser.Game) => void
  backgroundColor?: string
  /** Пиксель-арт: текстуры без сглаживания, координаты округляются до пикселя */
  pixelArt?: boolean
}

/**
 * Встраивает игру Phaser в React-компонент. Canvas занимает весь родительский
 * блок и рендерится в полном разрешении экрана (чётко на retina-дисплеях).
 * Сцены получают dpr через game.registry.get('dpr').
 */
export function PhaserGame({ onCreate, backgroundColor = '#1d1f24', pixelArt = false }: Props) {
  const parentRef = useRef<HTMLDivElement>(null)
  const onCreateRef = useRef(onCreate)

  useEffect(() => {
    const parent = parentRef.current!
    const dpr = getDpr()
    const size = () => ({
      w: Math.max(1, Math.round(parent.clientWidth * dpr)),
      h: Math.max(1, Math.round(parent.clientHeight * dpr)),
    })
    const { w, h } = size()

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      backgroundColor,
      pixelArt,
      scale: { mode: Phaser.Scale.NONE, width: w, height: h, zoom: 1 / dpr },
      banner: false,
      scene: [],
    })
    game.registry.set('dpr', dpr)
    onCreateRef.current(game)

    const ro = new ResizeObserver(() => {
      const s = size()
      game.scale.resize(s.w, s.h)
      game.scale.setZoom(1 / dpr)
    })
    ro.observe(parent)

    return () => {
      ro.disconnect()
      game.destroy(true)
    }
  }, [backgroundColor, pixelArt])

  return <div ref={parentRef} className="phaser-parent" />
}
