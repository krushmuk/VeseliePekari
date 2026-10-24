import { useState } from 'react'
import { sfx } from '../../games/shared/sfx'
import { platform, useBack } from '../../platform'
import { CHAPTERS } from '../chapters'
import { COSMETICS, equippedIn, type Cosmetic, isOwned, itemsOf, SLOTS, type CosmeticSlot } from '../cosmetics'
import { BackIcon, CheckIcon, LockIcon, ShareIcon, StarIcon } from '../icons'
import { buyItem, equip, maxStars, starBalance, totalStars, useProgress } from '../progress'
import { MascotArt } from './MascotArt'
import type { BodyWear, FeetWear, HeadWear } from './mascotPixels'
import { TopBar } from './TopBar'

interface Props {
  onBack: () => void
}

/** Профиль: звёзды, место для маскота и элементы кастомизации */
export function ProfileScreen({ onBack }: Props) {
  const progress = useProgress()
  const [slotIndex, setSlotIndex] = useState(0)
  const total = CHAPTERS.reduce((sum, c) => sum + maxStars(c), 0)
  const percent = total ? Math.round((totalStars(progress) / total) * 100) : 0
  const [note, setNote] = useState('')
  /** Примерка: элемент показывается на маскоте до покупки или надевания */
  const [preview, setPreview] = useState<Cosmetic | null>(null)
  useBack(onBack)

  const share = async () => {
    platform.haptic('tap')
    const text = `Я играю в «Профессии» от ОЧАКОВО и набрал ${totalStars(progress)} ★ из ${total}!`
    const result = await platform.share(text, location.origin + location.pathname)
    if (result === 'copied') setNote('Ссылка скопирована')
    else if (result === 'failed') setNote('Не получилось поделиться')
    else return
    window.setTimeout(() => setNote(''), 2500)
  }

  const wearing = (slot: CosmeticSlot) => (preview?.slot === slot ? preview : equippedIn(progress, slot))

  const apply = () => {
    if (!preview) return
    platform.haptic('tap')
    if (isOwned(progress, preview)) {
      equip(preview.slot, preview.id)
    } else if (buyItem(preview.id, preview.cost)) {
      sfx.init()
      sfx.purchase()
      platform.haptic('success')
      equip(preview.slot, preview.id)
    } else return
    setPreview(null)
  }

  const slot = SLOTS[slotIndex]
  const current = equippedIn(progress, slot.id)

  const go = (step: number) => {
    platform.haptic('tap')
    setPreview(null)
    setSlotIndex((slotIndex + step + SLOTS.length) % SLOTS.length)
  }

  const opened = COSMETICS.filter(c => isOwned(progress, c)).length

  return (
    <div className="screen map-screen profile-screen">
      <TopBar
        subtitle="Очаково"
        onBack={onBack}
        right={
          <button type="button" className="icon-btn share-btn" onClick={share} aria-label="Поделиться">
            <ShareIcon size={26} />
          </button>
        }
      />
      {note ? (
        <p className="share-note" role="status">
          {note}
        </p>
      ) : null}
      {platform.user ? <p className="greeting">{platform.user.name}</p> : null}

      <div className="profile-stats">
        <div className="profile-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
          <div className="profile-progress-head">
            <span>Прогресс</span>
            <b>{percent}%</b>
          </div>
          <div className="profile-bar">
            <div className="profile-bar-fill" style={{ width: `${percent}%` }} />
          </div>
        </div>
        <div className="profile-balance" aria-label={`Баланс: ${starBalance(progress)} звёзд`}>
          <span>Баланс</span>
          <b>
            <StarIcon size={20} /> {starBalance(progress)}
          </b>
        </div>
      </div>

      <div className="mascot-slot" role="img" aria-label="Маскот">
        <MascotArt
          head={wearing('head').id as HeadWear}
          body={wearing('body').id as BodyWear}
          feet={wearing('feet').id as FeetWear}
        />
      </div>
      {preview ? (
        <div className="preview-bar" role="status">
          <b>Примерка: {preview.title}</b>
          <div className="preview-actions">
            <button type="button" className="btn btn-ghost btn-small" onClick={() => setPreview(null)}>
              Отмена
            </button>
            <button
              type="button"
              className="btn btn-primary btn-small"
              disabled={!isOwned(progress, preview) && preview.cost > starBalance(progress)}
              onClick={apply}
            >
              {isOwned(progress, preview)
                ? 'Надеть'
                : preview.cost > starBalance(progress)
                  ? `Нужно ${preview.cost} ★`
                  : `Купить за ${preview.cost} ★`}
            </button>
          </div>
        </div>
      ) : null}

      <h2 className="profile-heading">
        Кастомизация <small>{opened}/{COSMETICS.length}</small>
      </h2>
      <div className="slot-picker">
        <button type="button" className="icon-btn slot-prev" onClick={() => go(-1)} aria-label="Предыдущая категория">
          <BackIcon size={26} />
        </button>
        <div className="slot-text" aria-live="polite">
          <b>{slot.title}</b>
        </div>
        <button type="button" className="icon-btn slot-next" onClick={() => go(1)} aria-label="Следующая категория">
          <BackIcon size={26} />
        </button>
      </div>
        <ul className="cosmetic-list">
          {itemsOf(slot.id).map(item => {
            const open = isOwned(progress, item)
            const canBuy = !open && item.cost <= starBalance(progress)
            const on = item.id === current.id
            const trying = preview?.id === item.id
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`cosmetic${open || canBuy ? '' : ' locked'}${on ? ' on' : ''}${trying ? ' trying' : ''}`}
                  onClick={() => {
                    platform.haptic('tap')
                    setPreview(on || trying ? null : item)
                  }}
                >
                  <span className="cosmetic-icon">
                    {open ? on ? <CheckIcon size={22} /> : null : canBuy ? <StarIcon size={22} /> : <LockIcon size={22} />}
                  </span>
                  <span className="cosmetic-text">
                    <b>{item.title}</b>
                    <small>{open ? (on ? 'Надето' : 'Примерить') : canBuy ? `Примерить · ${item.cost} ★` : `Примерить · нужно ${item.cost} ★`}</small>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
    </div>
  )
}
