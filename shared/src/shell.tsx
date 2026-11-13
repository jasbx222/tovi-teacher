import { useEffect, useMemo, useRef, useState } from "react"
import { NavLink, useLocation, useNavigate } from "react-router"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { TiltLayer } from "./vivid"
import { setToken } from "./api"
import { applyTheme, currentTheme, useI18n } from "./i18n"

export type NavItem = { to: string; ar: string; en: string; group?: string }

export type ShellUser = { name?: string; phone?: string; instituteName?: string }

const glyphs: Record<string, string> = {
  home: "M4.5 11.2 12 4.5l7.5 6.7V20a1 1 0 0 1-1 1h-4.2v-5.2h-4.6V21H5.5a1 1 0 0 1-1-1z",
  person: "M12 12.2a3.1 3.1 0 1 0 0-6.2 3.1 3.1 0 0 0 0 6.2ZM5.8 19.4c.55-2.7 2.9-4.1 6.2-4.1s5.65 1.4 6.2 4.1",
  people: "M9 11.6a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2ZM4.2 18.6c.4-2.2 2.1-3.4 4.8-3.4s4.4 1.2 4.8 3.4M16.2 11.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4M14.2 18.6c.3-1.6 1.5-2.6 3.2-2.6 1.4 0 2.4.7 2.8 2",
  building: "M4.5 20.2V7.2L12 3.8l7.5 3.4v13H4.5zM9 20.2v-3.2h2.4V20M12.8 20.2v-3.2H15V20M9 12.2h2.2M12.8 12.2H15M9 9h2.2M12.8 9H15",
  grid: "M4.5 4.5h6.2v6.2H4.5zM13.3 4.5h6.2v6.2h-6.2zM4.5 13.3h6.2v6.2H4.5zM13.3 13.3h6.2v6.2h-6.2z",
  layers: "M12 3.8 4 8.2 12 12.6l8-4.4L12 3.8zM6.2 12.4 12 15.6l5.8-3.2M6.2 16 12 19.2l5.8-3.2",
  book: "M5 6.2A1.8 1.8 0 0 1 6.8 4.4H11v15.2H6.8A1.8 1.8 0 0 0 5 21.4V6.2zM13 4.4h4.2A1.8 1.8 0 0 1 19 6.2v15.2a1.8 1.8 0 0 0-1.8-1.8H13V4.4z",
  pin: "M12 21s6-5.1 6-9.3A6 6 0 0 0 6 11.7C6 15.9 12 21 12 21zM12 13.2a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4z",
  calendar: "M5 6.2h14v13.2H5zM5 10.2h14M8.2 4.2v3.2M15.8 4.2v3.2",
  card: "M4.2 7.2h15.6v9.6H4.2zM4.2 10.6h15.6",
  receipt: "M6.2 3.6h11.6v16.6l-1.9-1.1-1.9 1.1-2 1.1-2-1.1-1.9-1.1-1.9 1.1V3.6zM8.6 8.2h6.8M8.6 11.6h6.8",
  ticket: "M4.2 8h15.6v2.2a1.7 1.7 0 0 0 0 3.2V16H4.2v-2.6a1.7 1.7 0 0 0 0-3.2V8z",
  clock: "M12 20.4a8.4 8.4 0 1 0 0-16.8 8.4 8.4 0 0 0 0 16.8zM12 8.2V12l2.6 1.7",
  video: "M4.2 7.6h9.2v8.8H4.2zM13.4 10.4 19.4 7.8v8.4l-6-2.6z",
  megaphone: "M4.2 10.2v3.6h2.4l5.8 3V7.2l-5.8 3H4.2zM15.6 9.2a3.4 3.4 0 0 1 0 5.6",
  help: "M12 20.4a8.4 8.4 0 1 0 0-16.8 8.4 8.4 0 0 0 0 16.8zM9.5 9.5a2.5 2.5 0 1 1 3.3 2.4c-.7.3-1.3.9-1.3 1.8M12 16.8h.01",
  bell: "M6.4 16.4h11.2l-1.2-1.5V11a4.4 4.4 0 0 0-8.8 0v3.9l-1.2 1.5zM10 18.2a2 2 0 0 0 4 0",
  chart: "M4.5 19.2h15M7.2 16.4V12M12 16.4V7.8M16.8 16.4V10",
  gear: "M12 15.3a3.3 3.3 0 1 0 0-6.6 3.3 3.3 0 0 0 0 6.6zM12 3.6v2.2M12 18.2v2.2M5.1 6.6l1.6 1.3M17.3 16.1l1.6 1.3M5.1 17.4l1.6-1.3M17.3 7.9l1.6-1.3M3.6 12h2.2M18.2 12h2.2",
  note: "M7 3.6h7.2L19 8.4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.6a1 1 0 0 1 1-1zM14.2 3.8V8.6H19M9 12.2h6M9 15.4h4.2",
  cap: "M3.4 10.4 12 6.4l8.6 4L12 14.4 3.4 10.4zM7.2 12.2v3.1c0 .3 2.1 2.1 4.8 2.1s4.8-1.8 4.8-2.1v-3.1",
  sun: "M12 16.4a4.4 4.4 0 1 0 0-8.8 4.4 4.4 0 0 0 0 8.8zM12 3.4v1.8M12 18.8v1.8M4.8 4.8l1.3 1.3M17.9 17.9l1.3 1.3M3.4 12h1.8M18.8 12h1.8M4.8 19.2l1.3-1.3M17.9 6.1l1.3-1.3",
  moon: "M16.2 14.6A6.2 6.2 0 0 1 9.4 7.8 6.4 6.4 0 1 0 16.2 14.6z",
  chevron: "M14.5 6.5 9 12l5.5 5.5",
}

function iconFor(to: string) {
  if (to === "/" || to.endsWith("home")) return "home"
  if (/governorate/.test(to)) return "pin"
  if (/notif/.test(to)) return "bell"
  if (/setting|parameter|profile/.test(to)) return "gear"
  if (/hour|pool/.test(to)) return "clock"
  if (/session|classroom|meeting|chat/.test(to)) return "video"
  if (/report/.test(to)) return "chart"
  if (/invoice/.test(to)) return "receipt"
  if (/code/.test(to)) return "ticket"
  if (/subscription/.test(to)) return "card"
  if (/plan/.test(to)) return "calendar"
  if (/faq/.test(to)) return "help"
  if (/ad/.test(to)) return "megaphone"
  if (/grade/.test(to)) return "layers"
  if (/section/.test(to)) return "grid"
  if (/domain/.test(to)) return "pin"
  if (/institute/.test(to)) return "building"
  if (/employee/.test(to)) return "person"
  if (/student/.test(to)) return "cap"
  if (/teacher|assistant|group/.test(to)) return "people"
  if (/course|summar|exam|subject|guide/.test(to)) return "book"
  return "note"
}

function Glyph({ name }: { name: string }) {
  return (
    <span className="nav-ico">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d={glyphs[name] ?? glyphs.note} />
      </svg>
    </span>
  )
}

export function Mark() {
  return (
    <svg className="mark-svg" viewBox="0 0 36 36" aria-hidden="true">
      <circle cx="18" cy="18" r="16" fill="#6A4CFF" />
      <path d="M11.5 13h13M18 13v12" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="29" cy="7" r="3.4" fill="#FFC23D" />
    </svg>
  )
}

export function Shell({ title, items, children, user, notifyTo }: {
  title: string
  items: NavItem[]
  children: React.ReactNode
  user?: ShellUser
  notifyTo?: string
}) {
  const { t, lang, toggle } = useI18n()
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(localStorage.getItem("tovi-side") === "1")
  const [menu, setMenu] = useState(false)
  const [jump, setJump] = useState("")
  const [theme, setTheme] = useState<"light" | "dark">(currentTheme)
  const navigate = useNavigate()
  const location = useLocation()
  const reduce = useReducedMotion()
  const room = location.pathname.includes("/meetings/")
  const exact = items.find((item) => item.to === location.pathname)
  const nested = items.filter((item) => item.to !== "/" && location.pathname.startsWith(item.to)).sort((a, b) => b.to.length - a.to.length)[0]
  const current = exact ?? nested
  const pageLabel = current ? (lang === "ar" ? current.ar : current.en) : title
  const sideRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [thumb, setThumb] = useState({ top: 0, height: 0 })
  const who = user?.instituteName || user?.name || title
  const initial = who.trim().slice(0, 1)
  const matches = useMemo(() => {
    const needle = jump.trim().toLowerCase()
    if (!needle) return []
    return items.filter((item) => `${item.ar} ${item.en} ${item.to}`.toLowerCase().includes(needle)).slice(0, 6)
  }, [items, jump])

  useEffect(() => { applyTheme(theme) }, [theme])
  useEffect(() => { localStorage.setItem("tovi-side", collapsed ? "1" : "0") }, [collapsed])
  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenu(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])
  useEffect(() => {
    const el = sideRef.current
    if (!el) return
    const sync = () => {
      const { scrollTop, scrollHeight, clientHeight } = el
      if (scrollHeight <= clientHeight + 1) { setThumb({ top: 0, height: 0 }); return }
      const height = Math.max(36, (clientHeight / scrollHeight) * clientHeight)
      const top = (scrollTop / (scrollHeight - clientHeight)) * (clientHeight - height)
      setThumb({ top, height })
    }
    sync()
    el.addEventListener("scroll", sync, { passive: true })
    const observer = new ResizeObserver(sync)
    observer.observe(el)
    return () => { el.removeEventListener("scroll", sync); observer.disconnect() }
  }, [items.length, open, collapsed])

  let lastGroup = ""
  return (
    <div className={collapsed ? "tovi-app is-collapsed" : "tovi-app"}>
      <TiltLayer />
      {open ? <button className="scrim" aria-label={t.close} onClick={() => setOpen(false)} /> : null}
      <aside className={open ? "tovi-side open" : "tovi-side"}>
        <div className="brand">
          <Mark />
          <div><strong>{t.brand}</strong><span>{title}</span></div>
          <button className="collapse-btn ghost" type="button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? t.menu : t.close}>
            <Glyph name="chevron" />
          </button>
        </div>
        <div className="side-scroll-wrap">
          <div className="side-scroll" ref={sideRef}>
            {items.map((item) => {
              const groupLabel = item.group?.includes("|") ? (lang === "ar" ? item.group.split("|")[0] : item.group.split("|")[1]) : item.group
              const group = groupLabel && item.group !== lastGroup ? groupLabel : ""
              if (item.group) lastGroup = item.group
              const label = lang === "ar" ? item.ar : item.en
              return (
                <div key={item.to}>
                  {group ? <div className="nav-group">{group}</div> : null}
                  <NavLink className={({ isActive }) => isActive ? "nav-link active" : "nav-link"} to={item.to} end={item.to === "/"} onClick={() => setOpen(false)} title={label}>
                    <Glyph name={iconFor(item.to)} />
                    <span className="nav-text">{label}</span>
                  </NavLink>
                </div>
              )
            })}
          </div>
          {thumb.height > 0 ? <span className="side-thumb" style={{ height: thumb.height, transform: `translateY(${thumb.top}px)` }} /> : null}
        </div>
        <div className="side-foot">
          <div className="side-user">
            <span className="who" aria-hidden="true">{initial}</span>
            <span className="who-copy"><strong>{who}</strong><small>{user?.phone || t.brand}</small></span>
          </div>
        </div>
      </aside>
      <div className="tovi-main">
        <header className="tovi-top">
          <button className="menu-btn ghost" type="button" onClick={() => setOpen(true)}>{t.menu}</button>
          <button className="collapse-btn desk-only ghost" type="button" onClick={() => setCollapsed((value) => !value)} aria-label={t.menu}>
            <Glyph name="chevron" />
          </button>
          <div className="top-title">
            <span className="top-kicker">{title}</span>
            {room ? null : <h1>{pageLabel}</h1>}
          </div>
          <form className="top-search" onSubmit={(event) => {
            event.preventDefault()
            if (matches[0]) { navigate(matches[0].to); setJump("") }
          }}>
            <input value={jump} onChange={(event) => setJump(event.target.value)} placeholder={t.searchPages} aria-label={t.searchPages} />
            {matches.length > 0 ? (
              <ul className="jump-list">
                {matches.map((item) => (
                  <li key={item.to}>
                    <button type="button" onClick={() => { navigate(item.to); setJump("") }}>{lang === "ar" ? item.ar : item.en}</button>
                  </li>
                ))}
              </ul>
            ) : jump.trim() ? <div className="jump-list empty-jump">{t.noResults}</div> : null}
          </form>
          <div className="top-actions">
            <button className="icon-chip ghost" type="button" onClick={() => { const next = theme === "dark" ? "light" : "dark"; setTheme(next); applyTheme(next) }} aria-label={t.theme}>
              <Glyph name={theme === "dark" ? "sun" : "moon"} />
            </button>
            {notifyTo ? (
              <button className="icon-chip ghost" type="button" onClick={() => navigate(notifyTo)} aria-label={t.notifications}>
                <Glyph name="bell" />
              </button>
            ) : null}
            <div className="who-chip" ref={menuRef}>
              <button className="who-btn" type="button" onClick={() => setMenu((value) => !value)}>
                <span className="who-copy"><strong>{who}</strong><small>{t.brand}</small></span>
                <span className="who" aria-hidden="true">{initial}</span>
              </button>
              {menu ? (
                <div className="user-menu">
                  <p className="user-menu-name">{who}</p>
                  {user?.phone ? <p className="user-menu-meta">{user.phone}</p> : null}
                  <button type="button" onClick={() => { toggle(); setMenu(false) }}>{t.language}</button>
                  <button type="button" onClick={() => { const next = theme === "dark" ? "light" : "dark"; setTheme(next); applyTheme(next) }}>{theme === "dark" ? t.light : t.dark}</button>
                  <button type="button" className="danger" onClick={() => { setToken(""); navigate("/login") }}>{t.logout}</button>
                </div>
              ) : null}
            </div>
          </div>
        </header>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            className={room ? "tovi-content room" : "tovi-content"}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

export function AuthLayout({ title, children }: { title: string; children: React.ReactNode }) {
  const { t, toggle } = useI18n()
  return (
    <div className="auth">
      <div className="auth-orbs" aria-hidden="true">
        <span className="orb orb-a" />
        <span className="orb orb-b" />
        <span className="orb orb-c" />
      </div>
      <div className="auth-stage">
        <main className="auth-card">
          <div className="auth-head">
            <Mark />
            <button className="lang" type="button" onClick={toggle}>{t.language}</button>
          </div>
          <p className="auth-brand">{t.brand}</p>
          <h1>{title}</h1>
          <p className="lede">{t.tagline}</p>
          {children}
        </main>
      </div>
    </div>
  )
}

export function LoginCard({ title, onSubmit, extra }: { title: string; onSubmit: (phone: string, password: string) => Promise<void>; extra?: React.ReactNode }) {
  const { t } = useI18n()
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [show, setShow] = useState(false)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  return (
    <AuthLayout title={title}>
      <form onSubmit={async (event) => {
        event.preventDefault()
        setError("")
        setBusy(true)
        try { await onSubmit(phone, password) } catch (reason) { setError(reason instanceof Error ? reason.message : t.error) }
        finally { setBusy(false) }
      }}>
        <label className={phone ? "field floating filled" : "field floating"}>
          <span>{t.phone}</span>
          <input value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="username" inputMode="tel" required />
          <small className="field-hint">{t.phoneHint}</small>
        </label>
        <label className={password ? "field floating filled" : "field floating"}>
          <span>{t.password}</span>
          <input type={show ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required minLength={8} />
          <button className="eye" type="button" onClick={() => setShow((value) => !value)} aria-label={show ? t.hidePassword : t.showPassword}>{show ? "◉" : "○"}</button>
        </label>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <button className="btn" type="submit" disabled={busy}>{busy ? t.saving : t.login}</button>
        {extra}
      </form>
    </AuthLayout>
  )
}
