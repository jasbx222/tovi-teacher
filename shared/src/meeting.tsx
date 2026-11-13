import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { LiveKitRoom, RoomAudioRenderer, useLocalParticipant, useParticipants, useRoomContext } from "@livekit/components-react"
import { DisconnectReason, RoomEvent, Track, type TrackPublication } from "livekit-client"
import "@livekit/components-styles"
import { api, ApiError } from "./api"
import { useI18n } from "./i18n"

type TokenResponse = { url: string; token: string; room: string; identity: string; title?: string }
type ChatResponse = { environment: string; path: string }
export type LiveState = {
  session: { id: string; title?: string | null; classroomTitle: string; teacherName: string; startsAt: string; durationMinutes: number; endsAt: string }
  phase: "upcoming" | "lobby" | "live" | "ended" | "cancelled"
  serverNow: string
  opensAt: string
  lobbyMinutes: number
  present: number
  hostPresent: boolean
  host: boolean
  reactions: string[]
  recordingEnabled: boolean
  recording: string
}
type Question = { id: string; text: string; authorName: string; mine: boolean; createdAt: string; answered: boolean; hidden: boolean; votes: number; voted: boolean }
type PollOption = { index: number; text: string; votes: number }
type Poll = { id: string; question: string; options: PollOption[]; total: number; open: boolean; createdAt: string; closedAt?: string | null; myOption?: number | null }

export const reactionGlyphs: Record<string, string> = { clap: "👏", heart: "❤️", idea: "💡", laugh: "😄", wow: "😮" }

export function sessionTitle(state: Pick<LiveState, "session">) {
  return state.session.title || state.session.classroomTitle
}

function clock(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds))
  const h = Math.floor(safe / 3600)
  const m = String(Math.floor((safe % 3600) / 60)).padStart(2, "0")
  const s = String(safe % 60).padStart(2, "0")
  return h > 0 ? `${String(h).padStart(2, "0")}:${m}:${s}` : `${m}:${s}`
}

function problem(reason: unknown, ar: boolean) {
  if (reason instanceof ApiError) {
    const map: Record<string, string> = {
      recording_disabled: ar ? "التسجيل غير مفعّل على الخادم (LiveKit Egress)." : "Recording is not enabled on the server (LiveKit Egress).",
      outside_window: ar ? "الحصة خارج وقتها المسموح." : "The session is outside its time window.",
      poll_options_count: ar ? "التصويت يحتاج من 2 إلى 5 خيارات." : "A poll needs 2 to 5 options.",
      poll_option_duplicate: ar ? "الخيارات مكررة." : "Options repeat.",
      poll_question_length: ar ? "سؤال التصويت لازم يكون بين 1 و200 حرف." : "The poll question must be 1 to 200 characters.",
      poll_option_length: ar ? "كل خيار من 1 إلى 80 حرف." : "Each option must be 1 to 80 characters.",
      recording_running: ar ? "التسجيل شغّال من قبل." : "Recording is already running.",
    }
    return map[reason.code] ?? reason.message
  }
  return ar ? "تعذر إكمال الطلب" : "Request failed"
}

/** Countdown, waiting room and studio entry for a live session. */
export function Meeting({ sessionId, role, base: baseOverride, onLeave }: { sessionId: string; role: "teacher" | "student"; base?: string; onLeave?: () => void }) {
  const base = baseOverride ?? (role === "teacher" ? "/api/teacher" : "/api/student")
  const { lang } = useI18n()
  const ar = lang === "ar"
  const [state, setState] = useState<LiveState | null>(null)
  const [skew, setSkew] = useState(0)
  const [now, setNow] = useState(Date.now())
  const [entered, setEntered] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    try {
      const value = await api<LiveState>(`${base}/sessions/${sessionId}/live`)
      setSkew(new Date(value.serverNow).getTime() - Date.now())
      setState(value)
      setError("")
    } catch (reason) {
      setError(problem(reason, ar))
    }
  }, [base, sessionId, ar])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  useEffect(() => {
    if (!state || entered || (state.phase !== "lobby" && state.phase !== "upcoming")) return
    const timer = window.setInterval(() => { void load() }, 15000)
    return () => window.clearInterval(timer)
  }, [state, entered, load])
  useEffect(() => {
    if (!state || entered || (state.phase !== "lobby" && state.phase !== "live")) return
    const beat = () => { void api(`${base}/sessions/${sessionId}/presence`, { method: "POST" }).catch(() => undefined) }
    beat()
    const timer = window.setInterval(beat, 30000)
    return () => window.clearInterval(timer)
  }, [state, entered, base, sessionId])

  const serverNow = now + skew
  useEffect(() => {
    if (!state) return
    const opens = new Date(state.opensAt).getTime()
    const starts = new Date(state.session.startsAt).getTime()
    if ((state.phase === "upcoming" && serverNow >= opens) || (state.phase === "lobby" && serverNow >= starts)) void load()
  }, [serverNow, state, load])

  if (error && !state) return <p className="callout">{error}</p>
  if (!state) return <div className="panel"><div className="skel" /><div className="skel short" style={{ marginTop: 10 }} /></div>
  if (entered) return <Room sessionId={sessionId} role={role} base={base} state={state} onLeave={() => { setEntered(false); void load(); onLeave?.() }} />
  return <PreLive state={state} serverNow={serverNow} role={role} ar={ar} onEnter={() => setEntered(true)} />
}

function PreLive({ state, serverNow, role, ar, onEnter }: { state: LiveState; serverNow: number; role: "teacher" | "student"; ar: boolean; onEnter: () => void }) {
  const starts = new Date(state.session.startsAt).getTime()
  const opens = new Date(state.opensAt).getTime()
  const host = role === "teacher"
  const canEnter = state.phase === "live" || (host && state.phase === "lobby")
  const target = state.phase === "upcoming" ? opens : starts
  const when = new Date(state.session.startsAt).toLocaleString(ar ? "ar-IQ" : "en-GB", { weekday: "long", hour: "numeric", minute: "2-digit" })
  const tone = state.phase === "live" ? "coral" : state.phase === "lobby" ? "" : "ink"
  const eyebrow = {
    upcoming: ar ? "حصة قادمة" : "Upcoming",
    lobby: ar ? "غرفة الانتظار مفتوحة" : "Waiting room is open",
    live: ar ? "مباشر الآن" : "Live now",
    ended: ar ? "انتهت الحصة" : "Ended",
    cancelled: ar ? "ملغاة" : "Cancelled",
  }[state.phase]
  return (
    <div className="page">
      <section className={`tv-hero ${tone}`}>
        <span className={state.phase === "live" ? "tv-chip" : "tv-chip"} style={{ background: "rgba(255,255,255,0.18)", color: "#fff" }}>
          {state.phase === "live" ? <i className="tv-dot" /> : null}{eyebrow}
        </span>
        <h2>{sessionTitle(state)}</h2>
        <p>{[state.session.title ? state.session.classroomTitle : "", state.session.teacherName, when, `${state.session.durationMinutes} ${ar ? "دقيقة" : "min"}`].filter(Boolean).join(" · ")}</p>
        {state.phase === "upcoming" || state.phase === "lobby" ? (
          <div style={{ marginTop: 18 }}>
            <small style={{ opacity: 0.8 }}>{state.phase === "upcoming" ? (host ? (ar ? "يفتح الاستوديو بعد" : "Studio opens in") : (ar ? "تفتح الغرفة بعد" : "Room opens in")) : (ar ? "يبدأ البث بعد" : "Live starts in")}</small>
            <div className="tv-big" dir="ltr" style={{ textAlign: "start" }}>{clock((target - serverNow) / 1000)}</div>
          </div>
        ) : null}
      </section>
      <div className="tv-stats">
        <div className="tv-stat"><span>{ar ? "طلاب بالانتظار" : "Students waiting"}</span><strong>{state.present}</strong></div>
        <div className="tv-stat"><span>{ar ? "المعلم" : "Teacher"}</span><strong style={{ fontSize: 16 }}>{state.hostPresent ? <span className="tv-chip ok">{ar ? "موجود" : "Here"}</span> : <span className="tv-chip">{ar ? "لم يدخل" : "Not in yet"}</span>}</strong></div>
        <div className="tv-stat"><span>{ar ? "التسجيل" : "Recording"}</span><strong style={{ fontSize: 16 }}>{state.recordingEnabled ? <span className="tv-chip violet">{ar ? "متاح" : "Available"}</span> : <span className="tv-chip">{ar ? "غير مفعّل" : "Not enabled"}</span>}</strong></div>
        <div className="tv-stat"><span>{ar ? "غرفة الانتظار" : "Waiting room"}</span><strong style={{ fontSize: 16 }}>{ar ? `قبل ${state.lobbyMinutes} دقائق` : `${state.lobbyMinutes} min before`}</strong></div>
      </div>
      {host && (state.phase === "upcoming" || state.phase === "lobby") ? (
        <section className="panel">
          <div className="panel-head"><h2>{ar ? "جاهزية البث" : "Before you go live"}</h2></div>
          <ul className="tv-list">
            <li className="tv-row"><span className="grow">{ar ? "تدخل الاستوديو قبل البداية حتى تجرب الكاميرا والمايك، والطلاب يشوفون إنك موجود." : "Enter the studio early to test camera and mic; students see that you are here."}</span></li>
            <li className="tv-row"><span className="grow">{ar ? "الطلاب يدخلون البث من وقت البداية، وقبلها يبقون بغرفة الانتظار." : "Students join at the start time and wait in the lobby before it."}</span></li>
            <li className="tv-row"><span className="grow">{ar ? "التصويت والأسئلة والإعلانات تلكاها بلوحة الاستوديو الجانبية." : "Polls, questions and announcements live in the studio side panel."}</span></li>
          </ul>
        </section>
      ) : null}
      {state.phase === "ended" || state.phase === "cancelled" ? null : (
        <div><button className="btn" type="button" disabled={!canEnter} onClick={onEnter} style={{ minWidth: 220, minHeight: 48 }}>
          {host ? (state.phase === "live" ? (ar ? "ادخل الاستوديو" : "Enter the studio") : (ar ? "افتح الاستوديو" : "Open the studio")) : (ar ? "ادخل البث" : "Join the live")}
        </button></div>
      )}
    </div>
  )
}

function Room({ sessionId, role, base, state, onLeave }: { sessionId: string; role: "teacher" | "student"; base: string; state: LiveState; onLeave: () => void }) {
  const [token, setToken] = useState<TokenResponse | null>(null)
  const [chat, setChat] = useState<ChatResponse | null>(null)
  const [error, setError] = useState("")
  const [dropped, setDropped] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const failed = useRef(false)
  const { t, lang } = useI18n()
  const ar = lang === "ar"

  useEffect(() => {
    let gone = false
    setToken(null)
    api<TokenResponse>(`${base}/sessions/${sessionId}/token`, { method: "POST" })
      .then((value) => { if (!gone) setToken(value) })
      .catch((reason) => { if (!gone) setError(problem(reason, ar)) })
    api<ChatResponse>(`${base}/sessions/${sessionId}/chat`).then((value) => {
      if (gone) return
      if (value.environment === "production" && import.meta.env.DEV) {
        setError("This development build cannot enter a production meeting.")
        return
      }
      setChat(value)
    }).catch(() => setChat(null))
    return () => { gone = true }
  }, [sessionId, base, ar, attempt])

  if (error) return <p className="callout">{error}</p>
  if (dropped) {
    return (
      <section className="panel stack" style={{ alignItems: "flex-start" }}>
        <h2>{ar ? "انقطع الاتصال بالبث" : "The connection to the live dropped"}</h2>
        <p className="lede">{ar ? "تأكد من الشبكة ثم أعد المحاولة. وقت حضورك محفوظ." : "Check the network and try again. Your attendance time is kept."}</p>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" type="button" onClick={() => { failed.current = false; setDropped(false); setAttempt((value) => value + 1) }}>{ar ? "أعد الاتصال" : "Reconnect"}</button>
          <button className="ghost" type="button" onClick={onLeave}>{ar ? "مغادرة" : "Leave"}</button>
        </div>
      </section>
    )
  }
  if (!token) return <div className="panel"><div className="skel" /><div className="skel" style={{ marginTop: 10, width: "40%" }} /><p className="lede">{t.loading}</p></div>
  return (
    <LiveKitRoom key={attempt} serverUrl={token.url} token={token.token} connect audio={role === "teacher"} video={role === "teacher"} onError={() => { failed.current = true; setDropped(true) }} onDisconnected={(reason) => {
      // A deliberate leave (the user's own button or the host ending the room) closes the studio; anything else offers a reconnect.
      if (failed.current) setDropped(true)
      else if (reason === undefined || reason === DisconnectReason.CLIENT_INITIATED || reason === DisconnectReason.ROOM_DELETED || reason === DisconnectReason.PARTICIPANT_REMOVED) onLeave()
      else setDropped(true)
    }}>
      <RoomAudioRenderer />
      <Stage sessionId={sessionId} role={role} base={base} chat={chat} state={state} />
    </LiveKitRoom>
  )
}

type RailTab = "people" | "hands" | "questions" | "polls" | "chat"
type Float = { id: number; kind: string; left: number }

function Stage({ sessionId, role, base, chat, state }: { sessionId: string; role: "teacher" | "student"; base: string; chat: ChatResponse | null; state: LiveState }) {
  const room = useRoomContext()
  const { localParticipant } = useLocalParticipant()
  const people = useParticipants()
  const { lang } = useI18n()
  const ar = lang === "ar"
  const host = role === "teacher"
  const path = `${base}/sessions/${sessionId}`
  const [hands, setHands] = useState<string[]>([])
  const [announcements, setAnnouncements] = useState<string[]>([])
  const [note, setNote] = useState("")
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<{ name: string; text: string }[]>([])
  const [now, setNow] = useState(Date.now())
  const [rail, setRail] = useState<RailTab>("people")
  const [questions, setQuestions] = useState<Question[]>([])
  const [polls, setPolls] = useState<Poll[]>([])
  const [floats, setFloats] = useState<Float[]>([])
  const [reactionCount, setReactionCount] = useState<Record<string, number>>({})
  const [recording, setRecording] = useState(state.recording)
  const [notice, setNotice] = useState("")
  const seq = useRef(0)
  const startsAt = new Date(state.session.startsAt).getTime()

  const names = useMemo(() => Object.fromEntries(people.map((p) => [p.identity, p.name || p.identity])), [people])

  const pull = useCallback(async () => {
    try {
      const [q, p] = await Promise.all([api<Question[]>(`${path}/questions`), api<Poll[]>(`${path}/polls`)])
      setQuestions(q)
      setPolls(p)
    } catch { /* keep the last lists */ }
  }, [path])

  const float = useCallback((kind: string) => {
    if (!reactionGlyphs[kind]) return
    const id = seq.current++
    setFloats((list) => [...list.slice(-14), { id, kind, left: 10 + ((id * 37) % 60) }])
    setReactionCount((count) => ({ ...count, [kind]: (count[kind] ?? 0) + 1 }))
    window.setTimeout(() => setFloats((list) => list.filter((item) => item.id !== id)), 1700)
  }, [])

  const send = useCallback((payload: object) => {
    void localParticipant.publishData(new TextEncoder().encode(JSON.stringify(payload)), { reliable: true })
  }, [localParticipant])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    const beat = () => { void api(`${path}/presence`, { method: "POST" }).catch(() => undefined) }
    beat()
    const heart = window.setInterval(beat, 30000)
    void pull()
    const sync = window.setInterval(() => { void pull() }, 10000)
    const onData = (payload: Uint8Array, participant?: { identity: string; name?: string }) => {
      let data: { type?: string; from?: string; text?: string; raised?: boolean; kind?: string }
      try { data = JSON.parse(new TextDecoder().decode(payload)) } catch { return }
      if (data.type === "hand" && data.from) setHands((list) => data.raised ? Array.from(new Set([...list, data.from!])) : list.filter((item) => item !== data.from))
      if (data.type === "announcement" && data.text) setAnnouncements((list) => [data.text!, ...list].slice(0, 8))
      if (data.type === "chat" && data.text) setMessages((list) => [...list, { name: participant?.name || participant?.identity || "", text: data.text! }].slice(-60))
      if (data.type === "reaction" && data.kind) float(data.kind)
      if (data.type === "poll" || data.type === "questions") void pull()
    }
    room.on(RoomEvent.DataReceived, onData)
    return () => { window.clearInterval(timer); window.clearInterval(heart); window.clearInterval(sync); room.off(RoomEvent.DataReceived, onData) }
  }, [room, path, pull, float])

  const tiles = useMemo(() => people.flatMap((person) => {
    const camera = person.getTrackPublication(Track.Source.Camera)
    const screen = person.getTrackPublication(Track.Source.ScreenShare)
    return [screen, camera].flatMap((publication) => publication?.track ? [{ key: person.identity + publication.source, track: publication.track, name: person.name || person.identity, screen: publication.source === Track.Source.ScreenShare }] : [])
  }), [people])

  async function act(run: () => Promise<unknown>, ok?: string) {
    setNotice("")
    try { await run(); if (ok) setNotice(ok) } catch (reason) { setNotice(problem(reason, ar)) }
  }

  async function toggleRecording() {
    if (recording === "recording" || recording === "starting") {
      await act(async () => { const result = await api<{ status: string }>(`${path}/recording/stop`, { method: "POST" }); setRecording(result.status) })
    } else {
      await act(async () => { const result = await api<{ status: string }>(`${path}/recording`, { method: "POST" }); setRecording(result.status) })
    }
  }

  const elapsed = (now - startsAt) / 1000
  const left = state.session.durationMinutes * 60 - elapsed
  const qualityClass = (value: string) => value === "excellent" || value === "good" ? "ok" : value === "poor" ? "wait" : value === "lost" ? "bad" : "info"
  const qualityText = (value: string) => ar ? ({ excellent: "ممتاز", good: "جيد", poor: "ضعيف", lost: "منقطع" } as Record<string, string>)[value] ?? "—" : value
  const students = people.filter((p) => p.identity.startsWith("student:"))
  const visible = questions.filter((q) => !q.hidden)
  const openQuestions = visible.filter((q) => !q.answered).length
  const recordingOn = recording === "recording" || recording === "starting"
  const tabs: { key: RailTab; label: string; count?: number }[] = [
    { key: "people", label: ar ? "الحضور" : "People", count: students.length },
    { key: "hands", label: ar ? "الأيدي" : "Hands", count: hands.length },
    { key: "questions", label: ar ? "الأسئلة" : "Q&A", count: openQuestions },
    { key: "polls", label: ar ? "التصويت" : "Polls" },
    { key: "chat", label: ar ? "المحادثة" : "Chat" },
  ]

  return (
    <div className="meet">
      <section className="stage">
        <div className="stage-top">
          <span className="tv-chip live"><i className="tv-dot" />{ar ? "مباشر" : "Live"} · <span dir="ltr">{clock(elapsed)}</span></span>
          <strong style={{ fontSize: 15 }}>{sessionTitle(state)}</strong>
          <span className="tv-chip" style={{ background: "rgba(255,255,255,0.08)", color: "#d8d5e8" }}>{ar ? `متبقي ${Math.max(0, Math.ceil(left / 60))} د` : `${Math.max(0, Math.ceil(left / 60))} min left`}</span>
          <span className="tv-chip" style={{ background: "rgba(255,255,255,0.08)", color: "#d8d5e8" }}>{ar ? `${students.length} طالب` : `${students.length} students`}</span>
          {recordingOn ? <span className="tv-chip live"><i className="tv-dot" />{ar ? "يسجّل" : "Recording"}</span> : null}
          <span style={{ marginInlineStart: "auto", display: "flex", gap: 6 }}>
            {Object.entries(reactionCount).map(([kind, count]) => <span key={kind} className="tv-chip" style={{ background: "rgba(255,255,255,0.08)", color: "#fff" }}>{reactionGlyphs[kind]} {count}</span>)}
          </span>
        </div>
        {announcements[0] ? <p className="bubble" style={{ marginTop: 10, background: "rgba(255,194,61,0.14)", color: "#ffd98a" }}>{announcements[0]}</p> : null}
        <div className="stage-grid">
          {tiles.length === 0 ? <div className="waiting">{ar ? "افتح الكاميرا أو شارك الشاشة حتى يشوفك الطلاب" : "Turn on your camera or share your screen"}</div> : tiles.map((tile) => (
            <Tile key={tile.key} track={tile.track} name={tile.name} />
          ))}
        </div>
        <div className="floats" aria-hidden="true">
          {floats.map((item) => <span key={item.id} className="float" style={{ insetInlineEnd: `${item.left}px` }}>{reactionGlyphs[item.kind]}</span>)}
        </div>
        <div className="dock">
          <button type="button" className={localParticipant.isMicrophoneEnabled ? "on" : ""} onClick={() => localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled)}><MicIcon />{ar ? "المايك" : "Mic"}</button>
          <button type="button" className={localParticipant.isCameraEnabled ? "on" : ""} onClick={() => localParticipant.setCameraEnabled(!localParticipant.isCameraEnabled)}><CamIcon />{ar ? "الكاميرا" : "Camera"}</button>
          <button type="button" className={localParticipant.isScreenShareEnabled ? "on" : ""} onClick={() => localParticipant.setScreenShareEnabled(!localParticipant.isScreenShareEnabled)}><ShareIcon />{ar ? "الشاشة" : "Share"}</button>
          {host ? <button type="button" onClick={() => act(() => api(`${path}/participants/mute`, { method: "POST", body: JSON.stringify({ allStudents: true }) }), ar ? "انكتم الطلاب" : "Students muted")}><MuteIcon />{ar ? "كتم الطلاب" : "Mute students"}</button> : null}
          {host ? (
            <button type="button" className={recordingOn ? "on" : ""} disabled={!state.recordingEnabled} title={state.recordingEnabled ? "" : (ar ? "التسجيل يحتاج تفعيل LiveKit Egress على الخادم" : "Recording needs LiveKit Egress on the server")} onClick={toggleRecording}>
              <RecIcon />{!state.recordingEnabled ? (ar ? "التسجيل غير مفعّل" : "Recording off") : recordingOn ? (ar ? "إيقاف التسجيل" : "Stop recording") : (ar ? "تسجيل" : "Record")}
            </button>
          ) : null}
          {!host ? <button type="button" onClick={() => send({ type: "hand", from: localParticipant.identity, raised: true })}><HandIcon />{ar ? "رفع اليد" : "Raise hand"}</button> : null}
          <button type="button" className="leave" onClick={() => room.disconnect()}><LeaveIcon />{host ? (ar ? "إنهاء ومغادرة" : "Leave studio") : (ar ? "مغادرة" : "Leave")}</button>
        </div>
      </section>
      <aside className="rail">
        <div className="rail-tabs studio" role="tablist">
          {tabs.map((tab) => (
            <button key={tab.key} type="button" role="tab" aria-selected={rail === tab.key} className={rail === tab.key ? "on" : ""} onClick={() => setRail(tab.key)}>
              {tab.label}{tab.count ? <b className="count">{tab.count}</b> : null}
            </button>
          ))}
        </div>
        {notice ? <p className="callout info" style={{ margin: "0 12px" }}>{notice}</p> : null}
        <div className="rail-body" role="tabpanel">
          {rail === "people" ? people.map((person) => (
            <div key={person.identity} className="person">
              <span>{person.name || person.identity}{person.identity.startsWith("teacher:") ? <small className="tv-muted"> · {ar ? "المعلم" : "Teacher"}</small> : null}</span>
              <span className={`pill ${qualityClass(person.connectionQuality)}`}>{qualityText(person.connectionQuality)}</span>
              {host && person.identity.startsWith("student:") ? <button type="button" className="quiet" onClick={() => act(() => api(`${path}/participants/remove`, { method: "POST", body: JSON.stringify({ identity: person.identity }) }))} aria-label={ar ? "إخراج" : "Remove"}>×</button> : null}
            </div>
          )) : null}
          {rail === "hands" ? (
            <>
              {hands.length === 0 ? <p className="lede">{ar ? "لا توجد أيدٍ مرفوعة" : "No raised hands"}</p> : hands.map((hand, index) => (
                <div key={hand} className="tv-row">
                  <b>{index + 1}</b>
                  <span className="grow">{names[hand] ?? hand}</span>
                  {host ? <button type="button" className="quiet" onClick={() => { send({ type: "hand", from: hand, raised: false }); setHands((list) => list.filter((item) => item !== hand)) }}>{ar ? "إنزال" : "Lower"}</button> : null}
                </div>
              ))}
              {host ? (
                <form className="composer-row" onSubmit={(event) => { event.preventDefault(); if (!note.trim()) return; send({ type: "announcement", text: note }); setAnnouncements((list) => [note, ...list]); setNote("") }}>
                  <input className="bare" value={note} onChange={(e) => setNote(e.target.value)} placeholder={ar ? "إعلان للطلاب" : "Announcement"} />
                  <button className="btn" type="submit">{ar ? "إرسال" : "Send"}</button>
                </form>
              ) : null}
              {announcements.map((item, index) => <p key={index} className="bubble">{item}</p>)}
            </>
          ) : null}
          {rail === "questions" ? (
            <Questions rows={visible} host={host} ar={ar}
              onAnswered={(id) => act(async () => { await api(`${path}/questions/${id}/answered`, { method: "POST" }); send({ type: "questions" }); await pull() })}
              onHide={(id) => act(async () => { await api(`${path}/questions/${id}/hide`, { method: "POST" }); send({ type: "questions" }); await pull() })} />
          ) : null}
          {rail === "polls" ? (
            <Polls rows={polls} host={host} ar={ar}
              onCreate={(question, options) => act(async () => { await api(`${path}/polls`, { method: "POST", body: JSON.stringify({ question, options }) }); send({ type: "poll" }); await pull() })}
              onClose={(id) => act(async () => { await api(`${path}/polls/${id}/close`, { method: "POST" }); send({ type: "poll" }); await pull() })} />
          ) : null}
          {rail === "chat" ? (
            <>
              {!chat ? <p className="lede">{ar ? "فايرستور غير مهيأ، والمحادثة تمر عبر قناة البث المباشر." : "Firestore is not configured. Chat goes through the live channel."}</p> : null}
              <div className="chat-log">{messages.map((item, index) => <p key={index} className="bubble"><b>{item.name}</b> {item.text}</p>)}</div>
              <form className="composer-row" onSubmit={(event) => {
                event.preventDefault()
                if (!message.trim()) return
                if (chat?.environment === "production" && import.meta.env.DEV) return
                send({ type: "chat", text: message })
                setMessages((list) => [...list, { name: localParticipant.name || (ar ? "أنا" : "Me"), text: message }])
                setMessage("")
              }}>
                <input className="bare" value={message} onChange={(e) => setMessage(e.target.value)} placeholder={ar ? "رسالة" : "Message"} />
                <button className="btn" type="submit">{ar ? "إرسال" : "Send"}</button>
              </form>
            </>
          ) : null}
        </div>
      </aside>
    </div>
  )
}

function Questions({ rows, host, ar, onAnswered, onHide }: { rows: Question[]; host: boolean; ar: boolean; onAnswered: (id: string) => void; onHide: (id: string) => void }) {
  if (rows.length === 0) return <p className="lede">{ar ? "ماكو أسئلة بعد. الطلاب يكدرون يسألون ويرفعون أسئلة زملائهم." : "No questions yet. Students can ask and upvote."}</p>
  const sorted = [...rows].sort((a, b) => Number(a.answered) - Number(b.answered) || b.votes - a.votes)
  return (
    <ul className="tv-list">
      {sorted.map((row) => (
        <li key={row.id} className={row.answered ? "tv-row answered" : "tv-row"} style={{ alignItems: "flex-start" }}>
          <span className="tv-chip violet" title={ar ? "التصويتات" : "Votes"}>▲ {row.votes}</span>
          <span className="grow">
            <span style={{ display: "block", fontWeight: 600 }}>{row.text}</span>
            <small>{row.authorName}{row.answered ? ` · ${ar ? "تمت الإجابة" : "Answered"}` : ""}</small>
          </span>
          {host && !row.answered ? <button type="button" className="quiet" onClick={() => onAnswered(row.id)}>{ar ? "تمت" : "Done"}</button> : null}
          {host ? <button type="button" className="quiet" onClick={() => onHide(row.id)} aria-label={ar ? "إخفاء" : "Hide"}>×</button> : null}
        </li>
      ))}
    </ul>
  )
}

function Polls({ rows, host, ar, onCreate, onClose }: { rows: Poll[]; host: boolean; ar: boolean; onCreate: (question: string, options: string[]) => Promise<void>; onClose: (id: string) => void }) {
  const [question, setQuestion] = useState("")
  const [options, setOptions] = useState(["", ""])
  return (
    <>
      {host ? (
        <form className="stack" style={{ gap: 8 }} onSubmit={async (event) => {
          event.preventDefault()
          await onCreate(question.trim(), options.map((item) => item.trim()).filter(Boolean))
          setQuestion("")
          setOptions(["", ""])
        }}>
          <input className="bare" value={question} maxLength={200} onChange={(e) => setQuestion(e.target.value)} placeholder={ar ? "سؤال التصويت" : "Poll question"} />
          {options.map((option, index) => (
            <input key={index} className="bare" value={option} maxLength={80} onChange={(e) => setOptions((list) => list.map((item, i) => i === index ? e.target.value : item))} placeholder={ar ? `الخيار ${index + 1}` : `Option ${index + 1}`} />
          ))}
          <div style={{ display: "flex", gap: 8 }}>
            {options.length < 5 ? <button type="button" className="ghost" onClick={() => setOptions((list) => [...list, ""])}>{ar ? "خيار آخر" : "Add option"}</button> : null}
            <button type="submit" className="btn" disabled={!question.trim() || options.filter((item) => item.trim()).length < 2}>{ar ? "اطرح التصويت" : "Start poll"}</button>
          </div>
        </form>
      ) : null}
      {rows.length === 0 ? <p className="lede">{ar ? "ماكو تصويت بعد." : "No polls yet."}</p> : rows.map((poll) => (
        <section key={poll.id} className="stack" style={{ gap: 6, marginTop: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className={poll.open ? "tv-chip wait" : "tv-chip"}>{poll.open ? (ar ? "مفتوح" : "Open") : (ar ? "مغلق" : "Closed")}</span>
            <strong className="grow" style={{ flex: 1 }}>{poll.question}</strong>
            <small className="tv-muted">{poll.total} {ar ? "صوت" : "votes"}</small>
          </div>
          {poll.options.map((option) => {
            const share = poll.total ? Math.round((option.votes / poll.total) * 100) : 0
            return <div key={option.index} className="tv-option"><i style={{ width: `${share}%` }} /><span>{option.text}</span><strong>{share}%</strong></div>
          })}
          {host && poll.open ? <button type="button" className="ghost" onClick={() => onClose(poll.id)}>{ar ? "أغلق التصويت" : "Close poll"}</button> : null}
        </section>
      ))}
    </>
  )
}

function Icon({ d }: { d: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={d} strokeLinecap="round" strokeLinejoin="round" /></svg>
}
function MicIcon() { return <Icon d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM6 11a6 6 0 0 0 12 0M12 17v4" /> }
function MuteIcon() { return <Icon d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM6 11a6 6 0 0 0 12 0M12 17v4M4 4l16 16" /> }
function CamIcon() { return <Icon d="M4 7h10v10H4zM14 10.5 20 7v10l-6-3.5" /> }
function ShareIcon() { return <Icon d="M4 5h16v11H4zM9 20h6M12 16v4M12 13V8M9.5 10.5 12 8l2.5 2.5" /> }
function RecIcon() { return <Icon d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" /> }
function HandIcon() { return <Icon d="M8 11V6a1.5 1.5 0 0 1 3 0v5M11 8V5.5a1.5 1.5 0 0 1 3 0V11M14 9V7a1.5 1.5 0 0 1 3 0v8a5 5 0 0 1-5 5H9a4 4 0 0 1-4-4v-4a1.5 1.5 0 0 1 3 0" /> }
function LeaveIcon() { return <Icon d="M10 7V5H5v14h5v-2M10 12h9M16 9l3 3-3 3" /> }

function Tile({ track, name }: { track: NonNullable<TrackPublication["track"]>; name: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    track.attach(element)
    return () => { track.detach(element) }
  }, [track])
  return (
    <div className="tile">
      <video ref={ref} />
      <span>{name}</span>
    </div>
  )
}
