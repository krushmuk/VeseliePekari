import { useEffect, useState, type FormEvent, type MouseEvent, type ReactNode } from 'react'
import { GAMES } from '../../games/registry'
import { Choice } from './Choice'
import photoMalt from '../../assets/landing/a1.jpg'
import photoHops from '../../assets/landing/a2.jpg'
import photoTeam from '../../assets/landing/c2.jpeg'
import photoPlant from '../../assets/landing/c3.jpeg'
import './landing.css'

interface Props {
  onPlay: (gameId: string) => void
  /** id секции, к которой прокрутить при открытии (например, после выхода из игры) */
  scrollTo?: string
}

const Icon = ({ size = 26, width = 2, children }: { size?: number; width?: number; children: ReactNode }) => (
  <svg
    aria-hidden="true"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={width}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
)

const gamepad = (
  <>
    <rect x="2" y="6" width="20" height="12" rx="4" />
    <path d="M7 12h4M9 10v4" />
    <circle cx="16" cy="11" r="1" />
    <circle cx="18" cy="13" r="1" />
  </>
)

/** Пиктограммы паттерна: сырьё, производство, продукция — одна толщина линии, без поворотов */
const PICTOS: Record<string, ReactNode> = {
  bottle: <path d="M10 2h4v4l2 3v12a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V9l2-3zM8 13h8M8 17h8" />,
  wheat: <path d="M12 21V8M12 8c-3 0-4-2-4-4 3 0 4 2 4 4zM12 8c3 0 4-2 4-4-3 0-4 2-4 4zM12 14c-3 0-4-2-4-4 3 0 4 2 4 4zM12 14c3 0 4-2 4-4-3 0-4 2-4 4z" />,
  hop: <path d="M12 3c3 2 5 5 5 9s-2 7-5 9c-3-2-5-5-5-9s2-7 5-9zM12 3v18M7 12h10" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
    </>
  ),
  can: <path d="M7 4h10l1 3v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7zM6 7h12M6 17h12" />,
  drop: <path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z" />,
  berry: (
    <>
      <circle cx="9" cy="15" r="4" />
      <circle cx="16" cy="14" r="3.5" />
      <path d="M9 11c0-3 2-5 5-6M14 10c1-2 2-3 4-4" />
    </>
  ),
  tank: <path d="M6 5h12v13a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3zM6 10h12M10 3h4v2h-4z" />,
}

/** Тон модуля: active — красный на красном, mid — красный на сером, quiet — серый на сером */
type Tone = 'active' | 'mid' | 'quiet' | 'white'
const PATTERN: { tone: Tone; icon: keyof typeof PICTOS }[] = [
  { tone: 'active', icon: 'bottle' }, { tone: 'quiet', icon: 'wheat' }, { tone: 'white', icon: 'hop' }, { tone: 'active', icon: 'can' },
  { tone: 'mid', icon: 'gear' }, { tone: 'active', icon: 'drop' }, { tone: 'quiet', icon: 'tank' }, { tone: 'mid', icon: 'berry' },
  { tone: 'white', icon: 'wheat' }, { tone: 'quiet', icon: 'can' }, { tone: 'active', icon: 'hop' }, { tone: 'active', icon: 'bottle' },
]

const Pattern = ({ className }: { className: string }) => (
  <div className={className} aria-hidden="true">
    {PATTERN.map((m, i) => (
      <div key={i} className={`mod ${m.tone}`}>
        <Icon size={40} width={1.6}>{PICTOS[m.icon]}</Icon>
      </div>
    ))}
  </div>
)

const PERKS: { title: string; text: string; icon: ReactNode; hl?: boolean }[] = [
  {
    title: 'Официально',
    text: 'Трудоустройство по ТК РФ, заработная плата 2 раза в месяц, полисы ДМС.',
    icon: <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 14l2.5 2.5L16 11" />,
  },
  {
    title: 'Учим с нуля',
    text: 'Наставник с первой смены. Опыт не нужен — нужно желание разобраться.',
    icon: <path d="M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5" />,
  },
  {
    title: 'Графики под учёбу',
    text: '2/2, 5/2, 1/3. Можно совмещать с вузом или колледжем.',
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  },
  {
    title: 'Есть куда расти',
    text: 'От оператора линии до мастера смены, из стажёра — в штат.',
    icon: <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />,
  },
  {
    title: 'Бонусы',
    text: 'Частичная компенсация питания в корпоративной столовой, льготные путёвки в санаторий.',
    icon: <path d="M3 8h18v4H3zM5 12v9h14v-9M12 8v13M12 8c-2 0-4-1-4-3s3-2 4 3zM12 8c2 0 4-1 4-3s-3-2-4 3z" />,
  },
  {
    title: 'Стажировки',
    text: 'Для студентов профильных и не очень специальностей. Принимаем молодых талантов круглогодично.',
    icon: <path d="M12 2l3 6 6 1-4.5 4.5L18 20l-6-3-6 3 1.5-6.5L3 9l6-1z" />,
    hl: true,
  },
]

const SHOTS = [
  { src: photoMalt, alt: 'Солодовня', caption: 'Здесь растёт солод' },
  { src: photoHops, alt: 'Хмель засыпают в котёл', caption: 'А это — хмель' },
  { src: photoTeam, alt: 'Команда на экскурсии по заводу', caption: 'А это — твоя будущая команда' },
]

const CONTACTS: { href: string; label: string; value: string; icon: ReactNode }[] = [
  {
    href: 'tel:+74957853930',
    label: 'Телефон HR',
    value: '+7 495 785-39-30 (доб. 1155, 2107)',
    icon: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />,
  },
  {
    href: 'mailto:rabota@ochakovo.ru',
    label: 'Почта',
    value: 'rabota@ochakovo.ru',
    icon: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 7l9 6 9-6" />
      </>
    ),
  },
  {
    href: 'https://wa.me/79031537740',
    label: 'WhatsApp',
    value: '+7 903 153-77-40',
    icon: <path d="M4 20l1.4-4.2A8 8 0 1 1 8.3 18.7zM9 9c0 3 3 6 6 6l1-1.5-2-1-1 .5c-1-.5-2-1.5-2.5-2.500l.5-1-1-2z" />,
  },
  {
    href: 'https://vk.com/ochakovo_ru',
    label: 'VK',
    value: '@ochakovo_ru',
    icon: <path d="M3 6h3c1 4 3 7 5 7V6h3v4c2 0 3-2 4-4h3c-1 3-2 5-4 6 2 1 3 3 4 6h-3c-1-2-2-3-4-3v3h-2C6 18 3 12 3 6z" />,
  },
]

/** Якорные ссылки прокручивают страницу, не трогая адрес: в VK/Telegram hash может быть занят */
function jump(e: MouseEvent<HTMLAnchorElement>) {
  const target = document.getElementById(e.currentTarget.hash.slice(1))
  if (!target) return
  e.preventDefault()
  target.scrollIntoView()
}

export function Landing({ onPlay, scrollTo }: Props) {
  // Главная игра — первая готовая в реестре
  const main = GAMES.find(g => g.component)
  const others = GAMES.filter(g => g.component && g !== main)
  const play = () => main && onPlay(main.id)
  // Форма-заглушка: подключить отправку (бэкенд / бот) на этапе разработки
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (scrollTo) document.getElementById(scrollTo)?.scrollIntoView({ behavior: 'instant' })
  }, [scrollTo])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSent(true)
  }

  return (
    <div className="landing">
      <header className="top">
        <div className="top-in">
          <a className="logo" href="#top" onClick={jump}>
            <b>ОЧАКОВО</b>
            <span>карьера</span>
          </a>
          <nav className="nav" aria-label="Разделы">
            <a href="#work" onClick={jump}>Условия</a>
            <a href="#game" onClick={jump}>Игра</a>
            <a href="#contacts" onClick={jump}>Контакты</a>
          </nav>
          <div className="top-actions">
            {main ? (
              <button type="button" className="btn btn-game" onClick={play}>
                Сыграть
              </button>
            ) : (
              <a className="btn btn-game" href="#game" onClick={jump}>
                Сыграть
              </a>
            )}
          </div>
        </div>
      </header>

      <section id="top" className="hero">
        <div className="wrap">
          <div className="hero-text">
            <h1>
              Делаем квас.
              <br />И карьеру <em>тоже.</em>
            </h1>
            <p>
              Квас, лимонады, морсы и сидр «Очаково» знает вся страна. Загляни на завод изнутри — сыграй в мини-игру
              {main ? ` «${main.title}»` : ''} прямо в браузере, а потом решай, хочешь ли к нам в команду.
            </p>
            <div className="actions">
              <a className="btn btn-amber" href="#apply" onClick={jump}>
                Откликнуться
              </a>
            </div>
            <div className="facts">
              <div>
                <b>45 лет</b>
                <span>компании «Очаково»</span>
              </div>
              <div>
                <b>30+</b>
                <span>брендов напитков</span>
              </div>
              <div>
                <b>1 мин</b>
                <span>одна смена в игре</span>
              </div>
            </div>
          </div>
          <div className="hero-media">
            <Pattern className="pattern" />
            <button
              type="button"
              className="play-card"
              disabled={!main}
              onClick={play}
              aria-label={main ? `Играть: ${main.title}` : 'Игра скоро'}
            >
              <span className="play-thumb" aria-hidden="true">
                <Icon size={30} width={2}>{gamepad}</Icon>
              </span>
              <span className="play-info">
                <small>Мини-игра</small>
                <b>{main ? main.title : 'Скоро'}</b>
                <span>Пройди путь по профессиям завода</span>
              </span>
              <span className="play-go" aria-hidden="true">
                <Icon size={22} width={2.4}>
                  <path d="M8 5l11 7-11 7z" />
                </Icon>
              </span>
            </button>
          </div>
        </div>
      </section>

      <main>
        <section id="work" className="work">
          <div className="wrap">
            <div className="sec-head">
              <h2 className="h2">
                Что по <em>условиям</em>
              </h2>
            </div>
            <div className="perks">
              {PERKS.map((perk, i) => (
                <article key={perk.title} className={perk.hl ? 'perk hl' : 'perk'}>
                  <div className="perk-top">
                    <div className="ic">
                      <Icon>{perk.icon}</Icon>
                    </div>
                    <span className="n">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <h3>{perk.title}</h3>
                  <p>{perk.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <div className="wrap gallery" role="group" aria-label="Фото с производства">
          {SHOTS.map(shot => (
            <figure key={shot.caption} className="shot">
              <div className="ph">
                <img src={shot.src} alt={shot.alt} loading="lazy" />
              </div>
              <figcaption>{shot.caption}</figcaption>
            </figure>
          ))}
        </div>

        {/* Игра — карточка-бокал: отсюда запускаются игры из реестра */}
        <section id="game" className="game">
          <div className="glass-card">
            <Pattern className="pattern pattern-game" />
            <div className="game-text">
              <span className="tag">
                <i />
                {main ? 'УЖЕ МОЖНО ИГРАТЬ' : 'СКОРО ЗАПУСК'}
              </span>
              <h2 className="h2">
                Отработай смену.
                <br />В игре.
              </h2>
              <p>
                Мини-игра прямо в браузере и на телефоне: примерь профессии завода, узнай, как он устроен и какие
                тут условия. Пара минут — и ты в теме.
              </p>
              <ol className="steps">
                <li>
                  <b>1</b>Играешь с телефона или компа
                </li>
                <li>
                  <b>2</b>Узнаёшь завод изнутри — без экскурсии
                </li>
                <li>
                  <b>3</b>Делишься прогрессом с друзьями
                </li>
              </ol>
              <div className="actions">
                {main ? (
                  <button type="button" className="btn btn-amber btn-pixel" onClick={play}>
                    Играть
                  </button>
                ) : (
                  <span className="btn btn-amber btn-pixel" aria-disabled="true">
                    Играть
                  </span>
                )}
                {others.map(game => (
                  <button key={game.id} type="button" className="btn btn-amber btn-pixel" onClick={() => onPlay(game.id)}>
                    {game.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="contacts" className="contacts">
          <div className="wrap">
            <div className="c-left">
              <h2 className="h2">
                Пиши. Звони.
                <br />
                <em>Заходи.</em>
              </h2>
              <p>Отвечаем в рабочие дни. Можно просто спросить — резюме не обязательно.</p>
              <div className="c-list">
                {CONTACTS.map(c => (
                  <a
                    key={c.label}
                    className="c-item"
                    href={c.href}
                    {...(c.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
                  >
                    <span className="ic">
                      <Icon size={20}>{c.icon}</Icon>
                    </span>
                    <span>
                      <small>{c.label}</small>
                      <strong>{c.value}</strong>
                    </span>
                  </a>
                ))}
              </div>
              <div className="ph place">
                <img src={photoPlant} alt="Здание завода Очаково" loading="lazy" />
                <div className="pin">
                  <small>Адрес</small>
                  <b>Москва, ул. Рябиновая, 44</b>
                </div>
              </div>
            </div>
            <form id="apply" className="form" onSubmit={onSubmit}>
              <h3>Не любишь звонить?</h3>
              <p>Оставь контакт — HR напишет сам и расскажет про вакансии. Без анкет на пять страниц.</p>
              <div className="field">
                <label htmlFor="e-name">Как тебя зовут</label>
                <input id="e-name" name="name" autoComplete="given-name" required />
              </div>
              <div className="field">
                <label htmlFor="e-age">Сколько тебе лет</label>
                <input
                  id="e-age"
                  name="age"
                  type="number"
                  inputMode="numeric"
                  min={18}
                  max={99}
                  placeholder="От 18 лет"
                  required
                  onInvalid={e => e.currentTarget.setCustomValidity(e.currentTarget.validity.valueMissing ? 'Укажи свой возраст' : 'Принимаем на работу только с 18 лет')}
                  onInput={e => e.currentTarget.setCustomValidity('')}
                />
              </div>
              <div className="field">
                <label htmlFor="e-contact">Телефон или Telegram</label>
                <input id="e-contact" name="contact" required />
              </div>
              <div className="field">
                <label htmlFor="e-study">Где учишься</label>
                <input id="e-study" name="study" placeholder="Название учебного заведения" autoComplete="organization" />
              </div>
              <div className="field">
                <label htmlFor="e-dir">Что интересно</label>
                <Choice
                  id="e-dir"
                  name="direction"
                  options={['Цех розлива', 'Технологический цех', 'Лаборатория', 'Склад и логистика', 'Пока не знаю — расскажите']}
                />
              </div>
              <button className="btn btn-amber" type="submit">
                {sent ? 'Готово! Скоро напишем' : 'Отправить'}
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <span>© Очаково, 2026</span>
          <span>Чрезмерное употребление алкоголя вредит вашему здоровью</span>
        </div>
      </footer>
    </div>
  )
}
