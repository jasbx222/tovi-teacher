import type { ReactNode } from "react"
import { CountUp } from "./vivid"

export type StatTone = "violet" | "sun" | "coral" | "mint" | "sky"
export type StatIcon = "people" | "student" | "book" | "ticket" | "clock" | "live" | "building" | "calendar"

const icons: Record<StatIcon, string> = {
  people: "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M21 19v-1a4 4 0 0 0-3-3.87M16 3.13a3.5 3.5 0 0 1 0 6.75",
  student: "M2 9l10-5 10 5-10 5zM6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5M22 9v6",
  book: "M4 19.5V5a2 2 0 0 1 2-2h14v16H6.5A2.5 2.5 0 0 0 4 21.5zM4 19.5A2.5 2.5 0 0 1 6.5 17H20",
  ticket: "M3 8a2 2 0 0 0 0 4v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0 0-4V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2zM14 4v14",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2",
  live: "M15 10l5-3v10l-5-3M3 7h12v10H3z",
  building: "M3 21h18M5 21V5l7-3 7 3v16M9 9h1M14 9h1M9 13h1M14 13h1M10 21v-4h4v4",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
}

export type Stat = { label: string; value: string | number; icon: StatIcon; tone?: StatTone; sub?: ReactNode; live?: boolean }

/** Home figures as an even grid: icon in a soft circle, a large number, a clear label and an optional real sub-line. */
export function StatGrid({ items }: { items: Stat[] }) {
  if (items.length === 0) return null
  return (
    <section className="tv-statgrid">
      {items.map((item) => (
        <article key={item.label} className={`tv-statcard tilt tone-${item.tone ?? "violet"}`}>
          <span className="tv-statcard-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d={icons[item.icon]} /></svg>
            {item.live ? <i className="tv-statcard-live" /> : null}
          </span>
          <strong className="tv-statcard-value"><CountUp value={item.value} /></strong>
          <span className="tv-statcard-label">{item.label}</span>
          {item.sub ? <small className="tv-statcard-sub">{item.sub}</small> : null}
        </article>
      ))}
    </section>
  )
}
