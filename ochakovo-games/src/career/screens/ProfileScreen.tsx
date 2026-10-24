import { useState } from 'react'
import { sfx } from '../../games/shared/sfx'
import { platform, useBack } from '../../platform'
import { CHAPTERS } from '../chapters'
import { COSMETICS, equippedIn, isOwned, itemsOf, SLOTS, type CosmeticSlot } from '../cosmetics'
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
  const [openSlot, setOpenSlot] = useState<CosmeticSlot | null>(null)
  const total = CHAPTERS.reduce((sum, c) => sum + maxStars(c), 0)
  const percent = total ? Math.round((totalStars(progress) / total) * 100) : 0
  const [note, setNote] = useState('')
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

  const opened = COSMETICS.filter(c => isOwned(progress, c)).length

  return (
    <div className="screen map-screen profile-screen">
      <TopBar
        subtitle="Очаково"
        title="Профиль"
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
          head={equippedIn(progress, 'head').id as HeadWear}
          body={equippedIn(progress, 'body').id as BodyWear}
          feet={equippedIn(progress, 'feet').id as FeetWear}
        />
      </div>

      <h2 className="profile-heading">
        Кастомизация <small>{opened}/{COSMETICS.length}</small>
      </h2>
      <ul className="slot-list">
        {SLOTS.map(slot => {
          const current = equippedIn(progress, slot.id)
          const expanded = openSlot === slot.id
          return (
            <li key={slot.id} className="slot">
              <button
                type="button"
                className={`slot-head${expanded ? ' open' : ''}`}
                aria-expanded={expanded}
                onClick={() => {
                  platform.haptic('tap')
                  setOpenSlot(expanded ? null : slot.id)
                }}
              >
                <span className="slot-text">
                  <small>{slot.title}</small>
                  <b>{current.title}</b>
                </span>
                <span className="slot-arrow" aria-hidden="true">
                  <BackIcon size={22} />
                </span>
              </button>
              {expanded ? (
                <ul className="cosmetic-list">
                  {itemsOf(slot.id).map(item => {
                    const open = isOwned(progress, item)
                    const canBuy = !open && item.cost <= starBalance(progress)
                    const on = item.id === current.id
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          className={`cosmetic${open || canBuy ? '' : ' locked'}${on ? ' on' : ''}`}
                          disabled={!open && !canBuy}
                          onClick={() => {
                            platform.haptic('tap')
                            if (open) {
                              equip(slot.id, item.id)
                            } else if (buyItem(item.id, item.cost)) {
                              sfx.init()
                              sfx.purchase()
                              platform.haptic('success')
                              equip(slot.id, item.id)
                            }
                          }}
                        >
                          <span className="cosmetic-icon">
                            {open ? on ? <CheckIcon size={22} /> : null : canBuy ? <StarIcon size={22} /> : <LockIcon size={22} />}
                          </span>
                          <span className="cosmetic-text">
                            <b>{item.title}</b>
                            <small>{open ? (on ? 'Надето' : 'Надеть') : canBuy ? `Купить за ${item.cost} ★` : `Нужно ${item.cost} ★`}</small>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
