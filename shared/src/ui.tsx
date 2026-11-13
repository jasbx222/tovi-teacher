import type { ReactNode } from "react"
import { Link } from "react-router"

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
  return (
    <section className="metric-band">
      {items.map((item) => (
        <article key={item.label} className={item.lead ? "metric lead" : "metric"}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.hint ? <small>{item.hint}</small> : null}
        </article>
      ))}
    </section>
  )
}

const swatches = ["#1F6B4A", "#2F5F73", "#C4623A", "#8A6232", "#3E4C3A", "#6B4A62"]

export function CourseCards({ rows, href, empty }: { rows: { id: string; title: string; meta?: string }[]; href: (id: string) => string; empty: string }) {
  if (rows.length === 0) return <div className="panel"><div className="empty"><i /><div>{empty}</div></div></div>
  return (
    <div className="course-grid">
      {rows.map((row, index) => (
        <Link key={row.id} className="course-card" to={href(row.id)}>
          <div className="course-swatch" style={{ background: swatches[index % swatches.length] }}>{row.title.slice(0, 1)}</div>
          <h3>{row.title}</h3>
          {row.meta ? <p>{row.meta}</p> : null}
        </Link>
      ))}
    </div>
  )
}

export function Callout({ tone = "info", children }: { tone?: "info" | "ok" | "bad"; children: ReactNode }) {
  return <p className={tone === "bad" ? "callout" : tone === "ok" ? "callout ok" : "callout info"}>{children}</p>
}
