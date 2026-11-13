import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react"
import { Link } from "react-router"
import { CountUp, Planet } from "./vivid"

export function Mast({ kicker, title, lede, action }: { kicker?: string; title: string; lede?: string; action?: ReactNode }) {
  return (
    <header className="mast">
      <div>
        {kicker ? <p className="eyebrow">{kicker}</p> : null}
        <h2 className="display">{title}</h2>
        {lede ? <p className="lede">{lede}</p> : null}
      </div>
      {action}
    </header>
  )
}

export function MetricBand({ items }: { items: { label: string; value: string | number; hint?: string; lead?: boolean }[] }) {
  if (items.length === 0) return null
  const lead = items.find((item) => item.lead) ?? items[0]
  const rest = items.filter((item) => item !== lead)
  return (
    <section className="ledger">
      <div className="ledger-main tilt">
        <span>{lead.label}</span>
        <strong><CountUp value={lead.value} /></strong>
        {lead.hint ? <small>{lead.hint}</small> : null}
      </div>
      {rest.length > 0 ? (
        <ul className="ledger-side">
          {rest.map((item) => (
            <li key={item.label} className="tilt">
              <span>{item.label}</span>
              <strong><CountUp value={item.value} /></strong>
              {item.hint ? <small>{item.hint}</small> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

const palettes = [
  ["#6A4CFF", "#B7A8FF", "#EEEAFF"],
  ["#2F7DF6", "#9CC2FF", "#E5F0FF"],
  ["#F06A4F", "#FFB3A6", "#FFE9E5"],
  ["#0F9A78", "#8FD9C4", "#E2F6EF"],
  ["#B5468F", "#E6A8D2", "#FAE8F4"],
  ["#C98A00", "#FFD978", "#FFF4D6"],
]

export function Cover({ seed }: { seed: string }) {
  let hash = 0
  for (const char of seed) hash = (hash * 33 + char.charCodeAt(0)) >>> 0
  const [ink, mid, wash] = palettes[hash % palettes.length]
  const x = 18 + (hash % 36)
  const y = 16 + ((hash >> 3) % 20)
  return (
    <svg className="cover" viewBox="0 0 320 150" aria-hidden="true">
      <rect width="320" height="150" fill={wash} />
      <rect x={x} y={y} width="132" height="84" rx="22" fill={mid} />
      <rect x={x + 46} y={y + 26} width="118" height="72" rx="18" fill={ink} />
      <circle cx={280 - (hash % 24)} cy={28 + (hash % 12)} r="10" fill={ink} opacity="0.35" />
    </svg>
  )
}

export function CourseCards({ rows, href, empty }: { rows: { id: string; title: string; meta?: string; image?: string; badge?: string }[]; href: (id: string) => string; empty: string }) {
  if (rows.length === 0) return <div className="panel"><div className="empty"><i /><strong>{empty}</strong></div></div>
  return (
    <div className="course-grid">
      {rows.map((row) => (
        <Link key={row.id} className="course-card" to={href(row.id)}>
          <div className={row.image ? "cover-wrap has-image" : "cover-wrap"}>
            {row.image ? <img className="cover" src={row.image} alt="" loading="lazy" /> : <Cover seed={row.title || row.id} />}
            {row.badge ? <span className="cover-badge">{row.badge}</span> : null}
          </div>
          <h3>{row.title}</h3>
          {row.meta ? <p>{row.meta}</p> : null}
        </Link>
      ))}
    </div>
  )
}

export function CountBars({ title, items }: { title: string; items: { label: string; value: number }[] }) {
  const max = Math.max(1, ...items.map((item) => item.value))
  return (
    <section className="sheet">
      <h2>{title}</h2>
      <ul className="bars">
        {items.map((item) => (
          <li key={item.label}>
            <span>{item.label}</span>
            <span className="bar" aria-hidden="true"><i style={{ width: `${Math.round((item.value / max) * 100)}%` }} /></span>
            <strong>{item.value}</strong>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function Callout({ tone = "info", children }: { tone?: "info" | "ok" | "bad"; children: ReactNode }) {
  return <p className={tone === "bad" ? "callout" : tone === "ok" ? "callout ok" : "callout info"} role={tone === "bad" ? "alert" : "status"}>{children}</p>
}

export function Field({ label, className, ...props }: { label: string; className?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={className ? `field ${className}` : "field"}>{label}
      <input {...props} />
    </label>
  )
}

export function Area({ label, className, ...props }: { label: string; className?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className={className ? `field ${className}` : "field"}>{label}
      <textarea {...props} />
    </label>
  )
}

export function SelectField({ label, value, onChange, options, className }: { label: string; value: string | number; onChange: (value: string) => void; options: { value: string; label: string }[]; className?: string }) {
  return (
    <label className={className ? `field ${className}` : "field"}>{label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}

const words: Record<string, [string, string]> = {
  view: ["عرض", "View"],
  create: ["إنشاء", "Create"],
  update: ["تعديل", "Edit"],
  delete: ["حذف", "Delete"],
  format: ["تهيئة", "Format"],
  correct: ["تصحيح", "Correct"],
  manage: ["إدارة", "Manage"],
  courses: ["الدورات", "courses"],
  chapters: ["الفصول", "chapters"],
  lessons: ["الدروس", "lessons"],
  summaries: ["الملخصات", "summaries"],
  exams: ["الاختبارات", "exams"],
  questions: ["الأسئلة", "questions"],
  groups: ["المجموعات", "groups"],
  classrooms: ["القاعات", "classrooms"],
  sessions: ["الجلسات", "sessions"],
  codes: ["الأكواد", "codes"],
  meetings: ["الحصص", "meetings"],
  employees: ["الموظفين", "staff"],
  students: ["الطلاب", "students"],
  reports: ["التقارير", "reports"],
  plans: ["الباقات", "plans"],
  subscriptions: ["الاشتراكات", "subscriptions"],
  course: ["الدورة", "course"],
  summary: ["الملخص", "summary"],
  meeting: ["الحصة", "meeting"],
  teachers: ["المعلمين", "teachers"],
  schools: ["المدارس", "schools"],
  advertisements: ["الإعلانات", "ads"],
  faq: ["الأسئلة الشائعة", "FAQ"],
  hour: ["الساعات", "hours"],
  pool: ["الرصيد", "pool"],
}

export function permissionLabel(slug: string, lang: string) {
  return slug.replace(/^can-/, "").split("-").map((token) => {
    const pair = words[token]
    return pair ? (lang === "ar" ? pair[0] : pair[1]) : token
  }).join(" ")
}

export function PermissionPicker({ slugs, selected, onChange, lang }: { slugs: string[]; selected: string[]; onChange: (next: string[]) => void; lang: string }) {
  return (
    <div className="perm-grid">
      {slugs.map((slug) => {
        const on = selected.includes(slug)
        return (
          <label key={slug} className={on ? "perm on" : "perm"}>
            <input type="checkbox" checked={on} onChange={() => onChange(on ? selected.filter((item) => item !== slug) : [...selected, slug])} />
            <span>{permissionLabel(slug, lang)}</span>
            <small>{slug}</small>
          </label>
        )
      })}
    </div>
  )
}

const statusKind: Record<string, string> = {
  active: "ok", approved: "ok", true: "ok", completed: "ok", scheduled: "info",
  waiting: "wait", new: "wait", undercorrection: "wait", under_correction: "wait",
  false: "bad", inactive: "bad", expired: "bad", canceled: "bad", cancelled: "bad", failed: "bad",
}

const statusAr: Record<string, string> = {
  true: "نعم", false: "لا", active: "فعّال", inactive: "متوقف", scheduled: "مجدول",
  waiting: "بانتظار", completed: "مكتمل", expired: "منتهٍ", canceled: "ملغى", cancelled: "ملغى",
  new: "جديد", assistant: "مساعد", staff: "موظف",
}

export function StatusText({ value, lang }: { value: string; lang: string }) {
  const key = value.toLowerCase()
  const text = lang === "ar" && statusAr[key] ? statusAr[key] : value
  const kind = statusKind[key]
  return kind ? <span className={`pill ${kind}`}>{text}</span> : <span>{text}</span>
}
