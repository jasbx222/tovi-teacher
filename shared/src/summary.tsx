import { useEffect, useState } from "react"
import { api, ApiError } from "./api"
import { useI18n } from "./i18n"
import { reactionGlyphs } from "./meeting"

type Summary = {
  session: { id: string; title?: string | null; startsAt: string; durationMinutes: number }
  phase: string
  enrolled: number
  joined: number
  attended: number
  averageMinutes: number
  attendanceMinutes: number
  attendance: { name: string; identity: string; minutes: number; attended: boolean; firstSeenAt: string; joinedLiveAt?: string | null }[]
  reactions: { kind: string; count: number }[]
  questions: { total: number; answered: number; top: { id: string; text: string; authorName: string; votes: number; answered: boolean }[] }
  polls: { id: string; question: string; total: number; options: { index: number; text: string; votes: number }[] }[]
  recordings: { id: string; status: string; playbackPath?: string | null; createdAt: string }[]
}

/** Post-live report: attendance, engagement, questions, polls and recordings. */
export function SessionSummary({ sessionId, base }: { sessionId: string; base: string }) {
  const { lang } = useI18n()
  const ar = lang === "ar"
  const [data, setData] = useState<Summary | null>(null)
  const [error, setError] = useState("")
  useEffect(() => {
    api<Summary>(`${base}/sessions/${sessionId}/summary`).then(setData).catch((reason) => setError(reason instanceof ApiError ? reason.message : (ar ? "تعذر التحميل" : "Could not load")))
  }, [sessionId, base, ar])
  if (error) return <p className="callout">{error}</p>
  if (!data) return <div className="panel"><div className="skel" /><div className="skel short" style={{ marginTop: 10 }} /></div>
  const rate = data.enrolled ? Math.round((data.attended / data.enrolled) * 100) : 0
  const totalReactions = data.reactions.reduce((sum, row) => sum + row.count, 0)
  const when = new Date(data.session.startsAt).toLocaleString(ar ? "ar-IQ" : "en-GB", { dateStyle: "medium", timeStyle: "short" })
  const phase = data.phase === "ended" ? (ar ? "انتهت" : "Ended") : data.phase === "live" ? (ar ? "مباشر الآن" : "Live now") : (ar ? "لم تبدأ" : "Not started")
  return (
    <div className="page">
      <section className="tv-hero">
        <span className="tv-chip" style={{ background: "rgba(255,255,255,0.18)", color: "#fff" }}>{ar ? "ملخص الحصة" : "Session summary"} · {phase}</span>
        <h2>{data.session.title || (ar ? "حصة مباشرة" : "Live session")}</h2>
        <p>{when} · {data.session.durationMinutes} {ar ? "دقيقة" : "min"}</p>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginTop: 16 }}>
          <span className="tv-big">{rate}%</span>
          <span style={{ opacity: 0.85, paddingBottom: 6 }}>{ar ? `نسبة الحضور · ${data.attended} من ${data.enrolled} طالب` : `attendance · ${data.attended} of ${data.enrolled} students`}</span>
        </div>
      </section>
      <div className="tv-stats">
        <div className="tv-stat"><span>{ar ? "دخلوا البث" : "Joined live"}</span><strong>{data.joined}</strong></div>
        <div className="tv-stat"><span>{ar ? "متوسط الحضور" : "Average time"}</span><strong>{data.averageMinutes} <small className="tv-muted">{ar ? "د" : "min"}</small></strong></div>
        <div className="tv-stat"><span>{ar ? "حد الحضور" : "Attendance threshold"}</span><strong>{data.attendanceMinutes} <small className="tv-muted">{ar ? "د" : "min"}</small></strong></div>
        <div className="tv-stat"><span>{ar ? "الأسئلة" : "Questions"}</span><strong>{data.questions.answered}/{data.questions.total}</strong></div>
        <div className="tv-stat"><span>{ar ? "التفاعلات" : "Reactions"}</span><strong>{totalReactions}</strong></div>
      </div>
      <div className="split">
        <section className="panel">
          <div className="panel-head"><h2>{ar ? "الحضور" : "Attendance"}</h2></div>
          {data.attendance.length === 0 ? <p className="lede">{ar ? "ما دخل أحد بعد." : "Nobody joined yet."}</p> : (
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>{ar ? "الطالب" : "Student"}</th><th>{ar ? "الدقائق" : "Minutes"}</th><th>{ar ? "الحالة" : "Status"}</th></tr></thead>
                <tbody>
                  {data.attendance.map((row) => (
                    <tr key={row.identity}>
                      <td data-label={ar ? "الطالب" : "Student"}>{row.name}</td>
                      <td data-label={ar ? "الدقائق" : "Minutes"}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div className="tv-meter" style={{ width: 90 }}><i style={{ width: `${Math.min(100, data.attendanceMinutes ? (row.minutes / data.attendanceMinutes) * 100 : 0)}%` }} /></div>
                          {row.minutes}
                        </div>
                      </td>
                      <td data-label={ar ? "الحالة" : "Status"}>{row.attended ? <span className="tv-chip ok">{ar ? "حاضر" : "Present"}</span> : row.joinedLiveAt ? <span className="tv-chip wait">{ar ? "جزئي" : "Partial"}</span> : <span className="tv-chip">{ar ? "انتظار فقط" : "Lobby only"}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <div className="stack">
          <section className="panel">
            <div className="panel-head"><h2>{ar ? "التفاعلات" : "Reactions"}</h2></div>
            {data.reactions.length === 0 ? <p className="lede">{ar ? "ماكو تفاعلات." : "No reactions."}</p> : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{data.reactions.map((row) => <span key={row.kind} className="tv-chip violet" style={{ fontSize: 14 }}>{reactionGlyphs[row.kind] ?? row.kind} {row.count}</span>)}</div>
            )}
          </section>
          <section className="panel">
            <div className="panel-head"><h2>{ar ? "أكثر الأسئلة تصويتاً" : "Top questions"}</h2></div>
            {data.questions.top.length === 0 ? <p className="lede">{ar ? "ماكو أسئلة." : "No questions."}</p> : (
              <ul className="tv-list">{data.questions.top.map((row) => (
                <li key={row.id} className={row.answered ? "tv-row answered" : "tv-row"}><span className="tv-chip violet">▲ {row.votes}</span><span className="grow">{row.text}<br /><small>{row.authorName}</small></span></li>
              ))}</ul>
            )}
          </section>
          <section className="panel">
            <div className="panel-head"><h2>{ar ? "التصويت" : "Polls"}</h2></div>
            {data.polls.length === 0 ? <p className="lede">{ar ? "ما انطرح تصويت." : "No polls."}</p> : data.polls.map((poll) => (
              <div key={poll.id} className="stack" style={{ gap: 6, marginBottom: 12 }}>
                <strong>{poll.question} <small className="tv-muted">· {poll.total} {ar ? "صوت" : "votes"}</small></strong>
                {poll.options.map((option) => {
                  const share = poll.total ? Math.round((option.votes / poll.total) * 100) : 0
                  return <div key={option.index} className="tv-option"><i style={{ width: `${share}%` }} /><span>{option.text}</span><strong>{share}%</strong></div>
                })}
              </div>
            ))}
          </section>
          <section className="panel">
            <div className="panel-head"><h2>{ar ? "التسجيلات" : "Recordings"}</h2></div>
            {data.recordings.length === 0 ? <p className="lede">{ar ? "ماكو تسجيل لهاي الحصة." : "No recording for this session."}</p> : (
              <ul className="tv-list">{data.recordings.map((row) => (
                <li key={row.id} className="tv-row"><span className="grow">{new Date(row.createdAt).toLocaleString(ar ? "ar-IQ" : "en-GB")}</span><span className={row.status === "ready" ? "tv-chip ok" : "tv-chip wait"}>{row.status}</span></li>
              ))}</ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
