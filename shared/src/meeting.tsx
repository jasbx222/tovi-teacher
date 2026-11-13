import { useEffect, useMemo, useRef, useState } from "react"
import { LiveKitRoom, RoomAudioRenderer, useLocalParticipant, useParticipants, useRoomContext } from "@livekit/components-react"
import { RoomEvent, Track, type TrackPublication } from "livekit-client"
import "@livekit/components-styles"
import { api, ApiError } from "./api"
import { useI18n } from "./i18n"

type TokenResponse = { url: string; token: string; room: string; identity: string }
type ChatResponse = { environment: string; path: string }

export function Meeting({ sessionId, role }: { sessionId: string; role: "teacher" | "student" }) {
  const [token, setToken] = useState<TokenResponse | null>(null)
  const [chat, setChat] = useState<ChatResponse | null>(null)
  const [error, setError] = useState("")
  const { t } = useI18n()
  const base = role === "teacher" ? "/api/teacher" : "/api/student"

  useEffect(() => {
    let gone = false
    api<TokenResponse>(`${base}/sessions/${sessionId}/token`, { method: "POST" })
      .then((value) => { if (!gone) setToken(value) })
      .catch((reason) => { if (!gone) setError(reason instanceof ApiError ? reason.message : "LiveKit") })
    api<ChatResponse>(`${base}/sessions/${sessionId}/chat`).then((value) => {
      if (gone) return
      if (value.environment === "production" && import.meta.env.DEV) {
        setError("This development build cannot enter a production meeting.")
        return
      }
      setChat(value)
    }).catch(() => setChat(null))
    return () => { gone = true }
  }, [sessionId, base])

  if (error) return <p className="callout">{error}</p>
  if (!token) return <div className="panel"><div className="skel" /><div className="skel" style={{ marginTop: 10, width: "40%" }} /><p className="lede">{t.loading}</p></div>
  return (
    <LiveKitRoom serverUrl={token.url} token={token.token} connect audio={role === "teacher"} video={role === "teacher"} onError={(reason) => setError(reason.message)}>
      <RoomAudioRenderer />
      <Stage sessionId={sessionId} role={role} chat={chat} />
    </LiveKitRoom>
  )
}

function Stage({ sessionId, role, chat }: { sessionId: string; role: "teacher" | "student"; chat: ChatResponse | null }) {
  const room = useRoomContext()
  const { localParticipant } = useLocalParticipant()
  const people = useParticipants()
  const { lang } = useI18n()
  const [hands, setHands] = useState<string[]>([])
  const [announcements, setAnnouncements] = useState<string[]>([])
  const [note, setNote] = useState("")
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<string[]>([])
  const [started] = useState(Date.now())
  const [elapsed, setElapsed] = useState(0)
  const [rail, setRail] = useState<"people" | "hands" | "chat">("people")
  const ar = lang === "ar"

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000)
    const onData = (payload: Uint8Array) => {
      const data = JSON.parse(new TextDecoder().decode(payload)) as { type: string; from?: string; text?: string; raised?: boolean }
      if (data.type === "hand" && data.from) setHands((list) => data.raised ? Array.from(new Set([...list, data.from!])) : list.filter((item) => item !== data.from))
      if (data.type === "announcement" && data.text) setAnnouncements((list) => [data.text!, ...list].slice(0, 8))
      if (data.type === "chat" && data.text) setMessages((list) => [...list, data.text!].slice(-40))
    }
    room.on(RoomEvent.DataReceived, onData)
    return () => { window.clearInterval(timer); room.off(RoomEvent.DataReceived, onData) }
  }, [room, started])

  const tiles = useMemo(() => people.flatMap((person) => {
    const camera = person.getTrackPublication(Track.Source.Camera)
    const screen = person.getTrackPublication(Track.Source.ScreenShare)
    return [camera, screen].flatMap((publication) => publication?.track ? [{ key: person.identity + publication.source, track: publication.track, name: person.identity }] : [])
  }), [people])

  function send(payload: object) {
    const bytes = new TextEncoder().encode(JSON.stringify(payload))
    void localParticipant.publishData(bytes, { reliable: true })
  }

  const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0")
  const seconds = String(elapsed % 60).padStart(2, "0")
  const qualityClass = (value: string) => value === "excellent" || value === "good" ? "ok" : value === "poor" ? "wait" : value === "lost" ? "bad" : "info"

  return (
    <div className="meet">
      <section className="stage">
        <div className="stage-top">
          <span className="pill live">{ar ? "مباشر" : "Live"}</span>
          <span className="pill info">{room.state}</span>
          <span className="pill">{minutes}:{seconds}</span>
          <span className="pill">{localParticipant.isMicrophoneEnabled ? (ar ? "المايك مفتوح" : "Mic on") : (ar ? "المايك مغلق" : "Mic off")}</span>
        </div>
        <div className="stage-grid">
          {tiles.length === 0 ? <div className="waiting">{ar ? "بانتظار أن يفتح أحد الكاميرا" : "Waiting for a camera"}</div> : tiles.map((tile) => (
            <Tile key={tile.key} track={tile.track} name={tile.name} />
          ))}
        </div>
        <div className="dock">
          <button type="button" className={localParticipant.isMicrophoneEnabled ? "on" : ""} onClick={() => localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled)}><MicIcon />{ar ? "المايك" : "Mic"}</button>
          <button type="button" className={localParticipant.isCameraEnabled ? "on" : ""} onClick={() => localParticipant.setCameraEnabled(!localParticipant.isCameraEnabled)}><CamIcon />{ar ? "الكاميرا" : "Camera"}</button>
          <button type="button" className={localParticipant.isScreenShareEnabled ? "on" : ""} onClick={() => localParticipant.setScreenShareEnabled(!localParticipant.isScreenShareEnabled)}><ShareIcon />{ar ? "الشاشة" : "Share"}</button>
          {role === "teacher" ? <button type="button" onClick={() => api(`/api/teacher/sessions/${sessionId}/participants/mute`, { method: "POST", body: JSON.stringify({ allStudents: true }) })}><MicIcon />{ar ? "كتم الطلاب" : "Mute students"}</button> : null}
          {role === "student" ? <button type="button" onClick={() => send({ type: "hand", from: localParticipant.identity, raised: true })}><HandIcon />{ar ? "رفع اليد" : "Raise hand"}</button> : null}
          <button type="button" className="leave" onClick={() => room.disconnect()}><LeaveIcon />{ar ? "مغادرة" : "Leave"}</button>
        </div>
      </section>
      <aside className="rail">
        <div className="rail-tabs" role="tablist">
          <button type="button" className={rail === "people" ? "on" : ""} onClick={() => setRail("people")}>{ar ? "الحضور" : "People"}</button>
          <button type="button" className={rail === "hands" ? "on" : ""} onClick={() => setRail("hands")}>{ar ? "الأيدي" : "Hands"}{hands.length ? ` ${hands.length}` : ""}</button>
          <button type="button" className={rail === "chat" ? "on" : ""} onClick={() => setRail("chat")}>{ar ? "المحادثة" : "Chat"}</button>
        </div>
        <div className="rail-body" role="tabpanel">
          {rail === "people" ? people.map((person) => (
            <div key={person.identity} className="person">
              <span>{person.identity}</span>
              <span className={`pill ${qualityClass(person.connectionQuality)}`}>{person.connectionQuality}</span>
              {role === "teacher" && person.identity.startsWith("student:") ? <button type="button" className="quiet" onClick={() => api(`/api/teacher/sessions/${sessionId}/participants/remove`, { method: "POST", body: JSON.stringify({ identity: person.identity }) })} aria-label={ar ? "إخراج" : "Remove"}>×</button> : null}
            </div>
          )) : null}
          {rail === "hands" ? (
            <>
              {hands.length === 0 ? <p className="lede">{ar ? "لا توجد أيدٍ مرفوعة" : "No raised hands"}</p> : hands.map((hand) => <p key={hand} className="bubble">{hand}</p>)}
              {role === "teacher" ? (
                <form className="composer-row" onSubmit={(event) => { event.preventDefault(); if (!note.trim()) return; send({ type: "announcement", text: note }); setAnnouncements((list) => [note, ...list]); setNote("") }}>
                  <input className="bare" value={note} onChange={(e) => setNote(e.target.value)} placeholder={ar ? "إعلان للطلاب" : "Announcement"} />
                  <button className="btn" type="submit">{ar ? "إرسال" : "Send"}</button>
                </form>
              ) : null}
              {announcements.map((item, index) => <p key={index} className="bubble">{item}</p>)}
            </>
          ) : null}
          {rail === "chat" ? (
            <>
              <p className="lede">{chat ? `${chat.environment} · ${chat.path}` : (ar ? "فايرستور غير مهيأ، القناة المباشرة تبقى متاحة" : "Firestore is not configured. The live channel stays available.")}</p>
              <div className="chat-log">{messages.map((item, index) => <p key={index} className="bubble">{item}</p>)}</div>
              <form className="composer-row" onSubmit={(event) => {
                event.preventDefault()
                if (!message.trim()) return
                if (chat?.environment === "production" && import.meta.env.DEV) return
                send({ type: "chat", text: message })
                setMessages((list) => [...list, message])
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

function Icon({ d }: { d: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={d} strokeLinecap="round" strokeLinejoin="round" /></svg>
}
function MicIcon() { return <Icon d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM6 11a6 6 0 0 0 12 0M12 17v4" /> }
function CamIcon() { return <Icon d="M4 7h10v10H4zM14 10.5 20 7v10l-6-3.5" /> }
function ShareIcon() { return <Icon d="M8 12h8M12 8v8M5 19h14" /> }
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
