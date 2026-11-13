import { useState } from "react"
import { NavLink, useLocation, useNavigate } from "react-router"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { setToken } from "./api"
import { useI18n } from "./i18n"

export type NavItem = { to: string; ar: string; en: string; group?: string }

const strokes: Record<string, string> = {
  home: "M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-5H10v5H5a1 1 0 0 1-1-1z",
  people: "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 1a2.5 2.5 0 1 0 0-5M3 19c.5-2.5 2.4-4 5-4s4.5 1.5 5 4M14 15c2.2 0 3.8 1.2 4.3 3",
  book: "M5 5.5A2.5 2.5 0 0 1 7.5 3H19v16H7.5A2.5 2.5 0 0 0 5 21.5zM5 5.5V21",
  live: "M4 7h10v10H4zM14 10.5 20 7v10l-6-3.5",
  coins: "M12 4c4 0 7 1.2 7 3s-3 3-7 3-7-1.2-7-3 3-3 7-3Zm7 6c0 1.8-3 3-7 3s-7-1.2-7-3M5 15c0 1.8 3 3 7 3s7-1.2 7-3",
  note: "M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm7 0v5h5",
  gear: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM4 12h2M18 12h2M12 4v2M12 18v2M6.4 6.4l1.4 1.4M16.2 16.2l1.4 1.4M17.6 6.4l-1.4 1.4M7.8 16.2l-1.4 1.4",
}

function iconFor(to: string) {
  if (to === "/" || to.endsWith("home")) return "home"
  if (/teacher|student|employee|assistant|group/.test(to)) return "people"
  if (/course|summar|exam|subject|grade|section|domain|guide|faq|ad/.test(to)) return "book"
  if (/session|classroom|meeting|chat|hour|pool/.test(to)) return "live"
  if (/plan|subscription|invoice|code|report/.test(to)) return "coins"
  if (/setting|parameter|profile|notif/.test(to)) return "gear"
  return "note"
}

function Glyph({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={strokes[name] ?? strokes.note} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Mark() {
  return (
    <svg className="mark-svg" viewBox="0 0 36 36" aria-hidden="true">
      <rect width="36" height="36" rx="11" fill="#3d45c6" />
      <path d="M10 12h16M18 12v14" stroke="#f5f7fb" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="26" cy="26" r="2.4" fill="#e7b089" />
    </svg>
  )
}

export function Shell({ title, items, children }: { title: string; items: NavItem[]; children: React.ReactNode }) {
  const { t, lang, toggle } = useI18n()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const reduce = useReducedMotion()
  const room = location.pathname.includes("/meetings/")
  let lastGroup = ""
  return (
    <div className="tovi-app">
      {open ? <button className="scrim" aria-label={t.close} onClick={() => setOpen(false)} /> : null}
      <aside className={open ? "tovi-side open" : "tovi-side"}>
        <div className="brand">
          <Mark />
          <div><strong>{t.brand}</strong><span>{title}</span></div>
        </div>
        <div className="side-scroll">
          {items.map((item) => {
            const groupLabel = item.group?.includes("|") ? (lang === "ar" ? item.group.split("|")[0] : item.group.split("|")[1]) : item.group
            const group = groupLabel && item.group !== lastGroup ? groupLabel : ""
            if (item.group) lastGroup = item.group
            const label = lang === "ar" ? item.ar : item.en
            return (
              <div key={item.to}>
                {group ? <div className="nav-group">{group}</div> : null}
                <NavLink className={({ isActive }) => isActive ? "nav-link active" : "nav-link"} to={item.to} end={item.to === "/"} onClick={() => setOpen(false)}>
                  <Glyph name={iconFor(item.to)} />
                  {label}
                </NavLink>
              </div>
            )
          })}
        </div>
        <div className="side-foot">
          <button className="lang" type="button" onClick={toggle}>{t.language}</button>
          <button className="ghost" type="button" onClick={() => { setToken(""); navigate("/login") }}>{t.logout}</button>
        </div>
      </aside>
      <div className="tovi-main">
        <header className="tovi-top">
          <button className="menu-btn ghost" type="button" onClick={() => setOpen(true)}>{t.menu}</button>
          <span className="top-kicker">{title}</span>
          <div className="top-actions">
            <button className="lang" type="button" onClick={toggle}>{t.language}</button>
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
  const [error, setError] = useState("")
  return (
    <AuthLayout title={title}>
      <form onSubmit={async (event) => {
        event.preventDefault()
        setError("")
        try { await onSubmit(phone, password) } catch (reason) { setError(reason instanceof Error ? reason.message : t.error) }
      }}>
        <label className="field">{t.phone}
          <input value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="username" inputMode="tel" />
        </label>
        <label className="field">{t.password}
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </label>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <button className="btn" type="submit">{t.login}</button>
        {extra}
      </form>
    </AuthLayout>
  )
}
