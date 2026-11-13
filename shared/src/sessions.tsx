import { Link } from "react-router"
import { useI18n } from "./i18n"

export type SessionRow = { id: string; title?: string | null; classroomId: string; startsAt: string; durationMinutes: number; status: string | number }

export type SessionPhase = "cancelled" | "ended" | "live" | "lobby" | "upcoming"

/** Same windows as the backend MeetingRules: the lobby opens ten minutes before the start. */
export function sessionPhase(row: SessionRow, now = Date.now()): SessionPhase {
  const start = new Date(row.startsAt).getTime()
  const end = start + Number(row.durationMinutes) * 60000
  if (String(row.status).toLowerCase().startsWith("cancel") || row.status === 1) return "cancelled"
  if (now >= end) return "ended"
  if (now >= start) return "live"
  return now >= start - 10 * 60000 ? "lobby" : "upcoming"
}

export function PhaseChip({ phase }: { phase: SessionPhase }) {
  const { lang } = useI18n()
  const ar = lang === "ar"
  if (phase === "live") return <span className="tv-chip live"><i className="tv-dot" />{ar ? "مباشر" : "Live"}</span>
  if (phase === "lobby") return <span className="tv-chip violet">{ar ? "غرفة الانتظار" : "Lobby"}</span>
  if (phase === "upcoming") return <span className="tv-chip ok">{ar ? "قادمة" : "Upcoming"}</span>
  return <span className="tv-chip">{phase === "ended" ? (ar ? "انتهت" : "Ended") : (ar ? "ملغاة" : "Cancelled")}</span>
}

/** One scheduled session with its state and the actions that fit it. */
export function SessionLine({ row, room, studio, summary, onCancel }: { row: SessionRow; room?: string; studio?: string; summary?: string; onCancel?: () => void }) {
  const { lang } = useI18n()
  const ar = lang === "ar"
  const phase = sessionPhase(row)
  const when = new Date(row.startsAt).toLocaleString(ar ? "ar-IQ" : "en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
  const open = phase === "live" || phase === "lobby" || phase === "upcoming"
  return (
    <article className="record" style={{ alignItems: "center" }}>
      <span style={{ display: "grid", gap: 2 }}>
        <strong>{row.title || room || (ar ? "حصة مباشرة" : "Live session")}</strong>
        <small className="tv-muted">{[row.title ? room : "", when, `${row.durationMinutes} ${ar ? "دقيقة" : "min"}`].filter(Boolean).join(" · ")}</small>
      </span>
      <span style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <PhaseChip phase={phase} />
        {studio && open ? <Link className="btn" to={studio}>{phase === "live" ? (ar ? "ادخل الاستوديو" : "Enter studio") : (ar ? "التجهيز" : "Prepare")}</Link> : null}
        {summary && (phase === "live" || phase === "ended") ? <Link className="ghost" to={summary}>{ar ? "الملخص" : "Summary"}</Link> : null}
        {onCancel && (phase === "upcoming" || phase === "lobby") ? <button className="ghost" type="button" onClick={onCancel}>{ar ? "إلغاء بلا استرجاع" : "Cancel, no refund"}</button> : null}
      </span>
    </article>
  )
}
