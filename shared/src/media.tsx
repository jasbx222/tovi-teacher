import { useEffect, useState } from "react"
import { api, mediaUrl, upload } from "./api"
import { useI18n } from "./i18n"
import { Callout, Cover } from "./ui"

type Row = { id: string; title?: string; coverFileId?: string | null }
type Note = { tone: "ok" | "bad"; text: string } | null

const maxBytes = 15 * 1024 * 1024
const accept = "image/png,image/jpeg,image/webp"

/** Finds one course across the paged course list, since there is no single-course read. */
async function findCourse(base: string, id: string) {
  for (let page = 1; page < 100; page++) {
    const result = await api<{ items: Row[]; total: number }>(`${base}/courses?page=${page}&pageSize=50`)
    const hit = (result.items ?? []).find((row) => row.id === id)
    if (hit || page * 50 >= (result.total ?? 0)) return hit ?? null
  }
  return null
}

function useUpload(lang: string) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<Note>(null)
  async function run<T>(file: File | undefined, send: (file: File) => Promise<T>, done: string) {
    if (!file) return null
    if (file.size > maxBytes) { setNote({ tone: "bad", text: lang === "ar" ? "الصورة أكبر من 15 ميغابايت" : "The image is larger than 15 MB" }); return null }
    setBusy(true); setNote(null)
    try { const result = await send(file); setNote({ tone: "ok", text: done }); return result }
    catch (reason) { setNote({ tone: "bad", text: reason instanceof Error ? reason.message : "" }); return null }
    finally { setBusy(false) }
  }
  return { busy, note, run }
}

/** Course cover picker for the course studio. */
export function CourseCoverPicker({ base, id }: { base: string; id: string }) {
  const { lang } = useI18n()
  const [course, setCourse] = useState<Row | null>(null)
  const { busy, note, run } = useUpload(lang)
  useEffect(() => {
    let live = true
    findCourse(base, id).then((row) => { if (live) setCourse(row) }).catch(() => { if (live) setCourse(null) })
    return () => { live = false }
  }, [base, id])
  const src = course?.coverFileId ? mediaUrl(`/api/files/${course.coverFileId}`) : ""
  async function pick(file?: File) {
    const result = await run(file, (chosen) => upload<{ coverFileId: string }>(`${base}/courses/${id}/cover`, "cover", chosen), lang === "ar" ? "تم تحديث الغلاف" : "Cover updated")
    if (result) setCourse((value) => ({ ...(value ?? { id }), coverFileId: result.coverFileId }))
  }
  return (
    <section className="sheet media-pick">
      <h2>{lang === "ar" ? "غلاف الدورة" : "Course cover"}</h2>
      <div className="preview">{src ? <img src={src} alt="" /> : <Cover seed={course?.title || id} />}</div>
      <p className="lede">{lang === "ar" ? "صورة أفقية 16:9 بصيغة PNG أو JPEG أو WEBP. تظهر للطلاب على بطاقة الدورة وصفحتها." : "A 16:9 PNG, JPEG or WEBP. Students see it on the course card and page."}</p>
      <label className="btn">
        {busy ? (lang === "ar" ? "جارٍ الرفع…" : "Uploading…") : src ? (lang === "ar" ? "تغيير الغلاف" : "Change cover") : (lang === "ar" ? "رفع غلاف" : "Upload cover")}
        <input type="file" accept={accept} disabled={busy} onChange={(event) => { void pick(event.target.files?.[0]); event.target.value = "" }} />
      </label>
      {note ? <Callout tone={note.tone}>{note.text}</Callout> : null}
    </section>
  )
}

/** Teacher photo picker for the profile page. */
export function ProfilePhotoPicker({ name }: { name: string }) {
  const { lang } = useI18n()
  const [src, setSrc] = useState("")
  const { busy, note, run } = useUpload(lang)
  useEffect(() => { api<{ photoUrl?: string | null }>("/api/teacher/profile").then((user) => setSrc(mediaUrl(user.photoUrl))).catch(() => setSrc("")) }, [])
  async function pick(file?: File) {
    const result = await run(file, (chosen) => upload<{ photoUrl: string }>("/api/teacher/profile/photo", "photo", chosen), lang === "ar" ? "تم تحديث الصورة" : "Photo updated")
    if (result) setSrc(mediaUrl(result.photoUrl))
  }
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("") || "T"
  return (
    <div className="media-pick" style={{ justifyItems: "center" }}>
      <div className="preview round">{src ? <img src={src} alt="" /> : <span className="initials">{initials}</span>}</div>
      <label className="btn">
        {busy ? (lang === "ar" ? "جارٍ الرفع…" : "Uploading…") : (lang === "ar" ? "رفع صورتك" : "Upload your photo")}
        <input type="file" accept={accept} disabled={busy} onChange={(event) => { void pick(event.target.files?.[0]); event.target.value = "" }} />
      </label>
      <small className="lede">{lang === "ar" ? "تظهر للطلاب على بطاقتك وصفحتك." : "Students see it on your card and profile."}</small>
      {note ? <Callout tone={note.tone}>{note.text}</Callout> : null}
    </div>
  )
}

/** Free-lesson switch on a lesson row. */
export function FreeToggle({ base, lesson, onChange }: { base: string; lesson: { id: string; isFree?: unknown }; onChange: () => void }) {
  const { lang } = useI18n()
  const [busy, setBusy] = useState(false)
  const free = lesson.isFree === true || String(lesson.isFree) === "true"
  return (
    <button
      className="free-toggle"
      type="button"
      aria-pressed={free}
      disabled={busy}
      title={lang === "ar" ? "الدرس المجاني يشاهده أي طالب بدون كود" : "Any student can watch a free lesson without a code"}
      onClick={async () => { setBusy(true); try { await api(`${base}/lessons/${lesson.id}`, { method: "PUT", body: JSON.stringify({ isFree: !free }) }); onChange() } finally { setBusy(false) } }}
    >
      {free ? (lang === "ar" ? "مجاني ✓" : "Free ✓") : (lang === "ar" ? "اجعله مجانياً" : "Make free")}
    </button>
  )
}
