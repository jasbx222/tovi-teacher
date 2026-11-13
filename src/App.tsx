import { useEffect, useState } from "react"
import { Link, Navigate, Route, Routes, useNavigate, useParams } from "react-router"
import { api, download, setToken, type SessionUser } from "../shared/src/api"
import { useI18n } from "../shared/src/i18n"
import { Meeting } from "../shared/src/meeting"
import { teacherPermissions } from "../shared/src/permissions"
import { Resource } from "../shared/src/resource"
import { SessionSummary } from "../shared/src/summary"
import { SessionLine, sessionPhase, type SessionRow } from "../shared/src/sessions"
import { PlanetHero } from "../shared/src/vivid"
import { StatGrid, type Stat } from "../shared/src/stats"
import { LoginCard, Shell, type NavItem } from "../shared/src/shell"
import { Area, Callout, CourseCards, Field, Mast, MetricBand, PermissionPicker, SelectField, StatusText } from "../shared/src/ui"

const nav: (NavItem & { permission?: string })[] = [
  { to: "/", ar: "الرئيسية", en: "Home", group: "الاستوديو|Studio" },
  { to: "/courses", ar: "الدورات", en: "Courses", permission: "can-view-courses" },
  { to: "/summaries", ar: "الملخصات", en: "Summaries", permission: "can-view-summaries" },
  { to: "/exams", ar: "الاختبارات", en: "Exams", permission: "can-view-exams" },
  { to: "/groups", ar: "المجموعات", en: "Groups", permission: "can-view-groups", group: "الناس|People" },
  { to: "/students", ar: "الطلاب", en: "Students", permission: "can-view-students" },
  { to: "/assistants", ar: "المساعدون", en: "Assistants", permission: "can-view-employees" },
  { to: "/classrooms", ar: "القاعات", en: "Classrooms", permission: "can-view-classrooms", group: "الحصص|Live" },
  { to: "/sessions", ar: "الجلسات", en: "Sessions", permission: "can-view-sessions" },
  { to: "/chat", ar: "المحادثة", en: "Chat", permission: "can-view-meetings" },
  { to: "/plans", ar: "الباقات", en: "Plans", permission: "can-view-plans", group: "الحساب|Account" },
  { to: "/profile", ar: "الملف", en: "Profile" },
]

type Row = Record<string, string>

export default function App() {
  return <Routes><Route path="/login" element={<Login />} /><Route path="/*" element={<Frame />} /></Routes>
}

function Login() {
  const navigate = useNavigate()
  const { lang } = useI18n()
  return <LoginCard title={lang === "ar" ? "لوحة المعلم والمساعد" : "Teacher and assistant"} onSubmit={async (phone, password) => {
    const result = await api<{ token: string }>("/api/auth/teacher/login", { method: "POST", body: JSON.stringify({ phone, password }) })
    setToken(result.token)
    navigate("/")
  }} />
}

function Frame() {
  const [me, setMe] = useState<SessionUser | null>(null)
  const navigate = useNavigate()
  const { lang } = useI18n()
  useEffect(() => { api<SessionUser>("/api/auth/me").then(setMe).catch(() => navigate("/login")) }, [navigate])
  if (!me) return <div className="boot" role="status" aria-label={lang === "ar" ? "جار التحميل" : "Loading"}><div className="skel" /><div className="skel" /><div className="skel short" /></div>
  const items = nav.filter((item) => !item.permission || me.permissions.includes(item.permission))
  return (
    <Shell title={lang === "ar" ? "المعلم" : "Teacher"} items={items}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/courses/:id" element={<CourseDesk />} />
        <Route path="/summaries" element={<Summaries />} />
        <Route path="/exams" element={<Exams />} />
        <Route path="/exams/:id" element={<ExamDesk />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/students" element={<Resource path="/api/teacher/students" title={lang === "ar" ? "الطلاب" : "Students"} columns={[{ key: "firstName", label: lang === "ar" ? "الاسم" : "Name" }, { key: "phone", label: lang === "ar" ? "الهاتف" : "Phone" }, { key: "xp", label: lang === "ar" ? "النقاط" : "XP" }, { key: "streak", label: lang === "ar" ? "السلسلة (يوم)" : "Streak (days)" }]} />} />
        <Route path="/assistants" element={<Staff />} />
        <Route path="/classrooms" element={<Classrooms />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/meetings/:id" element={<MeetingRoom />} />
        <Route path="/sessions/:id/summary" element={<SummaryRoom />} />
        <Route path="/plans" element={<Plans me={me} />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  )
}

function Home() {
  const { lang } = useI18n()
  const [data, setData] = useState<{ codeBalance: number; monthlyStudents: number; hourHours: number; subscriptionEndsAt?: string | null } | null>(null)
  const [courses, setCourses] = useState<Row[]>([])
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [error, setError] = useState("")
  useEffect(() => {
    api<NonNullable<typeof data>>("/api/teacher/home").then(setData).catch((reason) => setError(reason.message))
    api<SessionRow[]>("/api/teacher/sessions").then(setSessions).catch(() => setSessions([]))
    api<{ items: Row[] }>("/api/teacher/courses").then((page) => setCourses(page.items ?? [])).catch(() => setCourses([]))
  }, [])
  if (error) return <Callout tone="bad">{error}</Callout>
  if (!data) return <div className="panel"><div className="skel" /><div className="skel" style={{ marginTop: 12, width: "46%" }} /></div>
  return (
    <div className="page">
      <PlanetHero kicker={lang === "ar" ? "استوديو المعلم" : "Teacher studio"} title={lang === "ar" ? "رصيدك وطلاب هذا الشهر" : "Your balance and this month's students"} lede={lang === "ar" ? "هذه الأرقام من حسابك على الخادم." : "These numbers come from your account on the server."}>
        <NextLive rows={sessions} />
      </PlanetHero>
      <StatGrid items={teacherStats(lang === "ar", data, courses.length, sessions)} />
      {courses.length > 0 ? (
        <section className="stack">
          <Mast title={lang === "ar" ? "الدورات" : "Courses"} />
          <CourseCards rows={courses.map((row) => ({ id: row.id, title: row.title }))} href={(id) => `/courses/${id}`} empty="" />
        </section>
      ) : null}
    </div>
  )
}

function teacherStats(ar: boolean, data: { codeBalance: number; monthlyStudents: number; hourHours: number; subscriptionEndsAt?: string | null }, courses: number, sessions: SessionRow[]): Stat[] {
  const open = sessions.filter((row) => ["live", "lobby", "upcoming"].includes(sessionPhase(row))).sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const live = open.some((row) => sessionPhase(row) === "live")
  const next = open[0]
  const date = (value: string) => new Date(value).toLocaleDateString(ar ? "ar-IQ" : "en-GB", { day: "numeric", month: "short" })
  const time = (value: string) => new Date(value).toLocaleString(ar ? "ar-IQ" : "en-GB", { weekday: "short", hour: "numeric", minute: "2-digit" })
  return [
    { label: ar ? "رصيد الأكواد" : "Code balance", value: data.codeBalance, icon: "ticket", tone: "violet", sub: `${courses} ${ar ? "دورات" : "courses"}` },
    { label: ar ? "طلاب هذا الشهر" : "Students this month", value: data.monthlyStudents, icon: "student", tone: "sun" },
    { label: ar ? "ساعات الحصص المتبقية" : "Live hours left", value: data.hourHours, icon: "clock", tone: "mint", sub: data.subscriptionEndsAt ? `${ar ? "الاشتراك لغاية" : "Plan until"} ${date(data.subscriptionEndsAt)}` : undefined },
    { label: ar ? "الحصص القادمة" : "Upcoming sessions", value: open.length, icon: "live", tone: "coral", live, sub: live ? (ar ? "حصة مباشرة الآن" : "Live now") : next ? time(next.startsAt) : undefined },
  ]
}

function NextLive({ rows }: { rows: SessionRow[] }) {
  const { lang } = useI18n()
  const ar = lang === "ar"
  const open = rows.filter((row) => ["live", "lobby", "upcoming"].includes(sessionPhase(row))).sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const next = open[0]
  if (!next) return <span className="tv-glass-chip">{ar ? "ماكو حصص قادمة" : "No upcoming sessions"}</span>
  const phase = sessionPhase(next)
  const when = new Date(next.startsAt).toLocaleString(ar ? "ar-IQ" : "en-GB", { weekday: "short", hour: "numeric", minute: "2-digit" })
  return (
    <>
      {phase === "live" ? <span className="tv-chip live"><i className="tv-dot" />{ar ? "مباشر الآن" : "Live now"}</span> : null}
      <span className="tv-glass-chip"><strong>{next.title || (ar ? "حصة مباشرة" : "Live session")}</strong> · {when}</span>
      <Link className="btn" to={`/meetings/${next.id}`}>{phase === "live" ? (ar ? "ادخل الاستوديو" : "Enter studio") : (ar ? "جهّز الحصة" : "Prepare")}</Link>
      <span className="tv-glass-chip">{open.length} {ar ? "حصص قادمة" : "upcoming"}</span>
    </>
  )
}

function Courses() {
  const { lang } = useI18n()
  const [title, setTitle] = useState("")
  const [error, setError] = useState("")
  const [tick, setTick] = useState(0)
  return (
    <div className="page">
      <Mast title={lang === "ar" ? "الدورات" : "Courses"} lede={lang === "ar" ? "أنشئ الدورة ثم افتحها لترتيب الفصول والدروس." : "Create a course, then open it to arrange chapters and lessons."} />
      <form className="composer inline" onSubmit={async (event) => {
        event.preventDefault()
        setError("")
        try { await api("/api/teacher/courses", { method: "POST", body: JSON.stringify({ title }) }); setTitle(""); setTick((value) => value + 1) }
        catch (reason) { setError(reason instanceof Error ? reason.message : "") }
      }}>
        <Field label={lang === "ar" ? "عنوان الدورة" : "Course title"} value={title} onChange={(e) => setTitle(e.target.value)} />
        <button className="btn" type="submit">{lang === "ar" ? "إنشاء" : "Create"}</button>
      </form>
      {error ? <Callout tone="bad">{error}</Callout> : null}
      <CourseList tick={tick} />
    </div>
  )
}

function CourseList({ tick = 0 }: { tick?: number }) {
  const { lang } = useI18n()
  const [rows, setRows] = useState<Row[]>([])
  useEffect(() => { api<{ items: Row[] }>("/api/teacher/courses").then((page) => setRows(page.items ?? [])).catch(() => setRows([])) }, [tick])
  return <CourseCards rows={rows.map((row) => ({ id: row.id, title: row.title }))} href={(id) => `/courses/${id}`} empty={lang === "ar" ? "لا توجد دورات بعد" : "No courses yet"} />
}

function CourseDesk() {
  const { id = "" } = useParams()
  const { lang } = useI18n()
  const [chapters, setChapters] = useState<Row[]>([])
  const [title, setTitle] = useState("")
  const [count, setCount] = useState(1)
  const [message, setMessage] = useState("")
  const [askFormat, setAskFormat] = useState(false)
  async function load() { setChapters(await api(`/api/teacher/courses/${id}/chapters`)) }
  useEffect(() => { void load() }, [id])
  return (
    <div className="page">
      <Mast title={lang === "ar" ? "محتوى الدورة" : "Course studio"} lede={lang === "ar" ? "الفصول والدروس في الاستوديو، وتوزيع الأكواد في الجانب." : "Chapters and lessons stay in the studio. Codes sit beside them."} />
      <div className="split">
        <div className="stack">
          <form className="composer inline" onSubmit={async (event) => { event.preventDefault(); await api("/api/teacher/chapters", { method: "POST", body: JSON.stringify({ courseId: id, title }) }); setTitle(""); await load() }}>
            <Field label={lang === "ar" ? "فصل" : "Chapter"} value={title} onChange={(e) => setTitle(e.target.value)} />
            <button className="btn" type="submit">{lang === "ar" ? "إضافة فصل" : "Add chapter"}</button>
          </form>
          {chapters.map((chapter) => <Chapter key={chapter.id} chapter={chapter} />)}
        </div>
        <aside className="sheet stack">
          <h2>{lang === "ar" ? "الأكواد" : "Codes"}</h2>
          <form className="stack" onSubmit={async (event) => {
            event.preventDefault()
            const result = await api<{ remaining: number }>(`/api/teacher/codes?courseId=${id}`, { method: "POST", body: JSON.stringify({ count }) })
            setMessage(`${lang === "ar" ? "المتبقي" : "Remaining"}: ${result.remaining}`)
          }}>
            <Field type="number" label={lang === "ar" ? "عدد الأكواد، حد 100" : "Codes, max 100"} value={count} onChange={(e) => setCount(Number(e.target.value))} />
            <button className="btn" type="submit">{lang === "ar" ? "توليد" : "Generate"}</button>
          </form>
          <button className="ghost" type="button" onClick={() => download(`/api/teacher/courses/${id}/codes/export`, "tovi-codes.xlsx")}>{lang === "ar" ? "تنزيل الجدول" : "Download spreadsheet"}</button>
          {message ? <Callout tone="info">{message}</Callout> : null}
          <div className="danger-zone">
            <p>{lang === "ar" ? "تهيئة الدورة تعيد ضبط التسجيلات." : "Formatting the course resets enrollments."}</p>
            <button className="danger" type="button" onClick={() => setAskFormat(true)}>{lang === "ar" ? "تهيئة الدورة" : "Format course"}</button>
          </div>
        </aside>
      </div>
      {askFormat ? (
        <div className="modal-back" onClick={() => setAskFormat(false)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h2>{lang === "ar" ? "تهيئة الدورة" : "Format course"}</h2>
            <p className="lede">{lang === "ar" ? "سيُعاد ضبط تسجيلات هذه الدورة." : "Enrollments on this course will be reset."}</p>
            <div className="modal-actions">
              <button className="ghost" type="button" onClick={() => setAskFormat(false)}>{lang === "ar" ? "تراجع" : "Back"}</button>
              <button className="danger" type="button" onClick={async () => { await api(`/api/teacher/courses/${id}/format`, { method: "POST" }); setMessage(lang === "ar" ? "تمت إعادة ضبط التسجيلات" : "Enrollments were reset"); setAskFormat(false) }}>{lang === "ar" ? "تهيئة" : "Format"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Chapter({ chapter }: { chapter: Row }) {
  const { lang } = useI18n()
  const [lessons, setLessons] = useState<Row[]>([])
  const [title, setTitle] = useState("")
  const [video, setVideo] = useState("")
  async function load() { setLessons(await api(`/api/teacher/chapters/${chapter.id}/lessons`)) }
  useEffect(() => { void load() }, [chapter.id])
  return (
    <section className="sheet">
      <h2>{chapter.title}</h2>
      {lessons.map((lesson, index) => (
        <div key={lesson.id} className="lesson-row">
          <span>{lesson.title}{lesson.videoReference ? <small> · {lesson.videoReference}</small> : null}</span>
          <button className="ghost" type="button" disabled={index === 0} aria-label={lang === "ar" ? "تقديم" : "Move up"} onClick={async () => { const ids = lessons.map((item) => item.id); [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]]; await api(`/api/teacher/chapters/${chapter.id}/lessons/order`, { method: "PUT", body: JSON.stringify({ lessonIds: ids }) }); await load() }}>↑</button>
        </div>
      ))}
      <form className="form-grid" style={{ marginTop: 12 }} onSubmit={async (event) => { event.preventDefault(); await api("/api/teacher/lessons", { method: "POST", body: JSON.stringify({ chapterId: chapter.id, title, videoReference: video || null }) }); setTitle(""); setVideo(""); await load() }}>
        <Field label={lang === "ar" ? "درس" : "Lesson"} value={title} onChange={(e) => setTitle(e.target.value)} />
        <Field label={lang === "ar" ? "مرجع الفيديو" : "Video reference"} value={video} onChange={(e) => setVideo(e.target.value)} />
        <button className="btn" type="submit">{lang === "ar" ? "إضافة" : "Add"}</button>
      </form>
    </section>
  )
}

function Summaries() {
  const { lang } = useI18n()
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [tick, setTick] = useState(0)
  return (
    <div className="page">
      <Mast title={lang === "ar" ? "الملخصات" : "Summaries"} />
      <form className="sheet stack" onSubmit={async (event) => { event.preventDefault(); await api("/api/teacher/summaries", { method: "POST", body: JSON.stringify({ title, body }) }); setTitle(""); setBody(""); setTick((value) => value + 1) }}>
        <Field label={lang === "ar" ? "العنوان" : "Title"} value={title} onChange={(e) => setTitle(e.target.value)} />
        <Area label={lang === "ar" ? "النص" : "Body"} value={body} onChange={(e) => setBody(e.target.value)} />
        <button className="btn" type="submit">{lang === "ar" ? "حفظ الملخص" : "Save summary"}</button>
      </form>
      <Resource key={tick} path="/api/teacher/summaries" title={lang === "ar" ? "المحفوظ" : "Saved"} columns={[{ key: "title", label: lang === "ar" ? "العنوان" : "Title" }]} />
    </div>
  )
}

function Exams() {
  const { lang } = useI18n()
  const [courses, setCourses] = useState<Row[]>([])
  const [chapters, setChapters] = useState<Row[]>([])
  const [lessons, setLessons] = useState<Row[]>([])
  const [groups, setGroups] = useState<Row[]>([])
  const [courseId, setCourseId] = useState("")
  const [chapterId, setChapterId] = useState("")
  const [lessonId, setLessonId] = useState("")
  const [title, setTitle] = useState("")
  const [mark, setMark] = useState(100)
  const [endDate, setEndDate] = useState("")
  const [groupIds, setGroupIds] = useState<string[]>([])
  const [revision, setRevision] = useState(0)
  useEffect(() => { api<{ items: Row[] }>("/api/teacher/courses").then((page) => setCourses(page.items ?? [])).catch(() => setCourses([])) }, [])
  useEffect(() => {
    api<Row[] | { items: Row[] }>("/api/teacher/groups").then((data) => setGroups(Array.isArray(data) ? data : data.items ?? [])).catch(() => setGroups([]))
  }, [])
  useEffect(() => {
    if (!courseId) { setChapters([]); return }
    api<Row[]>(`/api/teacher/courses/${courseId}/chapters`).then(setChapters).catch(() => setChapters([]))
  }, [courseId])
  useEffect(() => {
    if (!chapterId) { setLessons([]); return }
    api<Row[]>(`/api/teacher/chapters/${chapterId}/lessons`).then(setLessons).catch(() => setLessons([]))
  }, [chapterId])
  const query = new URLSearchParams()
  if (courseId) query.set("courseId", courseId)
  if (chapterId) query.set("chapterId", chapterId)
  if (lessonId) query.set("lessonId", lessonId)
  return (
    <div className="page">
      <Mast title={lang === "ar" ? "الاختبارات" : "Exams"} />
      <form className="sheet form-grid" onSubmit={async (event) => {
        event.preventDefault()
        await api("/api/teacher/exams", { method: "POST", body: JSON.stringify({ title, mark, endDate: new Date(endDate).toISOString(), courseId: courseId || null, chapterId: chapterId || null, lessonId: lessonId || null, groupIds }) })
        setRevision((value) => value + 1)
      }}>
        <Field label={lang === "ar" ? "عنوان الاختبار" : "Exam title"} value={title} onChange={(e) => setTitle(e.target.value)} />
        <Field type="number" label={lang === "ar" ? "الدرجة، حد 100" : "Mark, max 100"} value={mark} onChange={(e) => setMark(Number(e.target.value))} />
        <Field type="datetime-local" label={lang === "ar" ? "تاريخ الانتهاء" : "End"} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <SelectField label={lang === "ar" ? "الدورة" : "Course"} value={courseId} onChange={(value) => { setCourseId(value); setChapterId(""); setLessonId("") }} options={[{ value: "", label: "—" }, ...courses.map((row) => ({ value: row.id, label: row.title }))]} />
        <SelectField label={lang === "ar" ? "الفصل" : "Chapter"} value={chapterId} onChange={(value) => { setChapterId(value); setLessonId("") }} options={[{ value: "", label: "—" }, ...chapters.map((row) => ({ value: row.id, label: row.title }))]} />
        <SelectField label={lang === "ar" ? "الدرس" : "Lesson"} value={lessonId} onChange={setLessonId} options={[{ value: "", label: "—" }, ...lessons.map((row) => ({ value: row.id, label: row.title }))]} />
        <div className="span-2">
          <p className="lede">{lang === "ar" ? "المجموعات" : "Groups"}</p>
          <div className="perm-grid">
            {groups.map((row) => {
              const on = groupIds.includes(row.id)
              return (
                <label key={row.id} className={on ? "perm on" : "perm"}>
                  <input type="checkbox" checked={on} onChange={() => setGroupIds(on ? groupIds.filter((item) => item !== row.id) : [...groupIds, row.id])} />
                  <span>{row.name}</span>
                </label>
              )
            })}
          </div>
        </div>
        <button className="btn" type="submit">{lang === "ar" ? "حفظ الاختبار" : "Save exam"}</button>
      </form>
      <ExamLinks query={`${query.toString()}&revision=${revision}`} />
    </div>
  )
}

function ExamLinks({ query }: { query: string }) {
  const [rows, setRows] = useState<Row[]>([])
  useEffect(() => { api<{ items: Row[] }>(`/api/teacher/exams?${query}`).then((page) => setRows(page.items ?? [])).catch(() => setRows([])) }, [query])
  return <CourseCards rows={rows.map((row) => ({ id: row.id, title: row.title, meta: `${row.status} · ${row.mark}` }))} href={(id) => `/exams/${id}`} empty="" />
}

function ExamDesk() {
  const { id = "" } = useParams()
  const { lang } = useI18n()
  const [questions, setQuestions] = useState<Row[]>([])
  const [text, setText] = useState("")
  const [mark, setMark] = useState(10)
  const [type, setType] = useState("OpenEnded")
  const [correct, setCorrect] = useState("true")
  async function load() { setQuestions(await api(`/api/teacher/exams/${id}/questions`)) }
  useEffect(() => { void load() }, [id])
  return (
    <div className="page">
      <Mast title={lang === "ar" ? "أسئلة الاختبار" : "Exam questions"} action={<button className="ghost" type="button" onClick={() => download(`/api/teacher/exams/${id}/codes/export`, "tovi-codes.xlsx")}>{lang === "ar" ? "تنزيل أكواد الاختبار" : "Download exam codes"}</button>} />
      <form className="sheet stack" onSubmit={async (event) => {
        event.preventDefault()
        const body: Record<string, unknown> = { type, text, mark }
        if (type === "TrueFalse") body.correct = correct === "true"
        if (type === "MultipleChoice") body.options = [{ text: "أ", correct: true }, { text: "ب", correct: false }]
        await api(`/api/teacher/exams/${id}/questions`, { method: "POST", body: JSON.stringify(body) })
        await load()
      }}>
        <SelectField label={lang === "ar" ? "النوع" : "Type"} value={type} onChange={setType} options={[{ value: "OpenEnded", label: "OpenEnded" }, { value: "MultipleChoice", label: "MultipleChoice" }, { value: "TrueFalse", label: "TrueFalse" }]} />
        <Area label={lang === "ar" ? "نص السؤال" : "Question"} value={text} onChange={(e) => setText(e.target.value)} />
        <Field type="number" label={lang === "ar" ? "درجة السؤال، حد 100" : "Question mark, max 100"} value={mark} onChange={(e) => setMark(Number(e.target.value))} />
        {type === "TrueFalse" ? <SelectField label={lang === "ar" ? "الصحيح" : "Correct"} value={correct} onChange={setCorrect} options={[{ value: "true", label: "true" }, { value: "false", label: "false" }]} /> : null}
        {type === "MultipleChoice" ? <p className="lede">{lang === "ar" ? "يُحفظ خياران: أ صحيح، وب غير صحيح." : "Two options are saved: أ is correct, ب is not."}</p> : null}
        <button className="btn" type="submit">{lang === "ar" ? "إضافة سؤال" : "Add question"}</button>
      </form>
      {questions.map((question) => (
        <article key={question.id} className="record">
          <span>{question.text} · {question.type} · {question.mark}</span>
          <button className="danger" type="button" onClick={async () => { await api(`/api/teacher/questions/${question.id}`, { method: "DELETE" }); await load() }}>{lang === "ar" ? "حذف" : "Delete"}</button>
        </article>
      ))}
    </div>
  )
}

function Groups() {
  const { lang } = useI18n()
  const [name, setName] = useState("")
  const [tick, setTick] = useState(0)
  return (
    <div className="page">
      <Mast title={lang === "ar" ? "المجموعات" : "Groups"} />
      <form className="composer inline" onSubmit={async (event) => { event.preventDefault(); await api("/api/teacher/groups", { method: "POST", body: JSON.stringify({ name }) }); setName(""); setTick((value) => value + 1) }}>
        <Field label={lang === "ar" ? "اسم المجموعة" : "Group"} value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn" type="submit">{lang === "ar" ? "إنشاء" : "Create"}</button>
      </form>
      <Resource key={tick} path="/api/teacher/groups" title={lang === "ar" ? "المجموعات" : "Groups"} columns={[{ key: "name", label: lang === "ar" ? "الاسم" : "Name" }]} />
    </div>
  )
}

function Staff() {
  const { lang } = useI18n()
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", password: "", style: "Assistant", groupName: "" })
  const [selected, setSelected] = useState<string[]>([])
  const [message, setMessage] = useState("")
  const [tick, setTick] = useState(0)
  return (
    <div className="page">
      <Mast title={lang === "ar" ? "المساعدون والموظفون" : "Assistants and staff"} />
      <form className="sheet stack" onSubmit={async (event) => {
        event.preventDefault()
        let groupId: string | undefined
        if (form.style === "Staff") {
          const group = await api<{ id: string }>("/api/teacher/permission-groups", { method: "POST", body: JSON.stringify({ name: form.groupName || form.firstName, permissions: selected }) })
          groupId = group.id
        }
        await api("/api/teacher/employees", { method: "POST", body: JSON.stringify({ ...form, style: form.style, permissions: form.style === "Assistant" ? selected : [], groupId }) })
        setMessage(lang === "ar" ? "تم إنشاء الحساب والصلاحيات على الخادم" : "Account and permissions were saved on the server")
        setTick((value) => value + 1)
      }}>
        <div className="form-grid">
          <Field label={lang === "ar" ? "الاسم" : "First"} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          <Field label={lang === "ar" ? "اللقب" : "Last"} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          <Field label={lang === "ar" ? "الهاتف" : "Phone"} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Field type="password" label={lang === "ar" ? "كلمة المرور" : "Password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
          <SelectField label={lang === "ar" ? "النوع" : "Style"} value={form.style} onChange={(value) => setForm({ ...form, style: value })} options={[{ value: "Assistant", label: lang === "ar" ? "مساعد" : "Assistant" }, { value: "Staff", label: lang === "ar" ? "موظف" : "Employee" }]} />
          {form.style === "Staff" ? <Field label={lang === "ar" ? "اسم مجموعة الصلاحيات" : "Permission group"} value={form.groupName} onChange={(e) => setForm({ ...form, groupName: e.target.value })} /> : null}
        </div>
        <PermissionPicker slugs={teacherPermissions} selected={selected} onChange={setSelected} lang={lang} />
        <button className="btn" type="submit">{lang === "ar" ? "حفظ" : "Save"}</button>
        {message ? <Callout tone="ok">{message}</Callout> : null}
      </form>
      <Resource key={tick} path="/api/teacher/employees" title={lang === "ar" ? "الموظفون" : "Employees"} columns={[{ key: "firstName", label: lang === "ar" ? "الاسم" : "Name" }, { key: "phone", label: lang === "ar" ? "الهاتف" : "Phone" }, { key: "employeeStyle", label: lang === "ar" ? "النوع" : "Style" }]} />
    </div>
  )
}

function Classrooms() {
  const { lang } = useI18n()
  const [title, setTitle] = useState("")
  const [code, setCode] = useState("")
  const [message, setMessage] = useState("")
  const [tick, setTick] = useState(0)
  return (
    <div className="page">
      <Mast title={lang === "ar" ? "القاعات" : "Classrooms"} />
      <div className="split">
        <form className="sheet stack" onSubmit={async (event) => { event.preventDefault(); await api("/api/teacher/classrooms", { method: "POST", body: JSON.stringify({ title }) }); setTitle(""); setTick((value) => value + 1) }}>
          <h2>{lang === "ar" ? "قاعة جديدة" : "New classroom"}</h2>
          <Field label={lang === "ar" ? "العنوان" : "Title"} value={title} onChange={(e) => setTitle(e.target.value)} />
          <button className="btn" type="submit">{lang === "ar" ? "فتح" : "Open"}</button>
        </form>
        <form className="sheet stack" onSubmit={async (event) => { event.preventDefault(); await api("/api/teacher/hour-packages/redeem", { method: "POST", body: JSON.stringify({ code }) }); setMessage(lang === "ar" ? "تم تفعيل باقة الساعات" : "Hour package activated") }}>
          <h2>{lang === "ar" ? "باقة الساعات" : "Hour package"}</h2>
          <Field label={lang === "ar" ? "كود باقة الساعات" : "Hour package code"} value={code} onChange={(e) => setCode(e.target.value)} />
          <button className="btn" type="submit">{lang === "ar" ? "تفعيل" : "Redeem"}</button>
          {message ? <Callout tone="ok">{message}</Callout> : null}
        </form>
      </div>
      <Resource key={tick} path="/api/teacher/classrooms" title={lang === "ar" ? "القاعات" : "Classrooms"} columns={[{ key: "title", label: lang === "ar" ? "العنوان" : "Title" }, { key: "status", label: lang === "ar" ? "الحالة" : "Status" }]} />
    </div>
  )
}

function Sessions() {
  const { lang } = useI18n()
  const ar = lang === "ar"
  const [classrooms, setClassrooms] = useState<Row[]>([])
  const [classroomId, setClassroomId] = useState("")
  const [title, setTitle] = useState("")
  const [startsAt, setStartsAt] = useState("")
  const [duration, setDuration] = useState(60)
  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState("")
  async function load() { setRows(await api("/api/teacher/sessions")) }
  useEffect(() => { void load() }, [])
  useEffect(() => { api<Row[] | { items: Row[] }>("/api/teacher/classrooms").then((data) => setClassrooms(Array.isArray(data) ? data : data.items ?? [])).catch(() => setClassrooms([])) }, [])
  const roomTitle = (id: string) => classrooms.find((row) => row.id === id)?.title ?? ""
  return (
    <div className="page">
      <Mast title={ar ? "الجلسات" : "Sessions"} lede={ar ? "الجدولة تخصم المدة كاملة، والإلغاء لا يعيد الرصيد. غرفة الانتظار تفتح قبل البداية بعشر دقائق." : "Scheduling deducts the full duration. Cancelling does not refund it. The waiting room opens ten minutes early."} />
      <form className="sheet form-grid" onSubmit={async (event) => {
        event.preventDefault()
        setError("")
        try {
          await api("/api/teacher/sessions", { method: "POST", body: JSON.stringify({ classroomId, startsAt: new Date(startsAt).toISOString(), durationMinutes: duration, title: title.trim() || null }) })
          setTitle("")
          await load()
        } catch (reason) { setError(reason instanceof Error ? reason.message : "") }
      }}>
        <Field className="span-2" label={ar ? "عنوان الحصة (اختياري)" : "Session title (optional)"} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder={ar ? "مثلاً: قوانين نيوتن" : "e.g. Newton's laws"} />
        <SelectField label={ar ? "القاعة" : "Classroom"} value={classroomId} onChange={setClassroomId} options={[{ value: "", label: "—" }, ...classrooms.map((row) => ({ value: row.id, label: row.title || row.id }))]} />
        <Field type="datetime-local" label={ar ? "البداية" : "Starts"} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        <SelectField label={ar ? "المدة" : "Duration"} value={String(duration)} onChange={(value) => setDuration(Number(value))} options={[30, 45, 60, 90, 120].map((minutes) => ({ value: String(minutes), label: `${minutes} ${ar ? "دقيقة" : "min"}` }))} />
        <button className="btn" type="submit">{ar ? "جدولة وخصم المدة كاملة" : "Schedule and deduct the full duration"}</button>
        {error ? <Callout tone="bad">{error}</Callout> : null}
      </form>
      <section className="sheet">
        {rows.length === 0 ? <p className="lede">{ar ? "ماكو جلسات مجدولة." : "No sessions scheduled."}</p> : null}
        {rows.map((row) => <SessionLine key={row.id} row={row as unknown as SessionRow} room={roomTitle(row.classroomId)} studio={`/meetings/${row.id}`} summary={`/sessions/${row.id}/summary`} onCancel={async () => { await api(`/api/teacher/sessions/${row.id}/cancel`, { method: "POST" }); await load() }} />)}
      </section>
    </div>
  )
}

function MeetingRoom() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  return <Meeting sessionId={id} role="teacher" onLeave={() => navigate(`/sessions/${id}/summary`)} />
}

function SummaryRoom() {
  const { id = "" } = useParams()
  return <SessionSummary sessionId={id} base="/api/teacher" />
}

function Plans({ me }: { me: SessionUser }) {
  const { lang } = useI18n()
  const [plans, setPlans] = useState<Row[]>([])
  const [url, setUrl] = useState("")
  useEffect(() => { api<Row[]>("/api/teacher/plans").then(setPlans).catch(() => setPlans([])) }, [])
  return (
    <div className="page">
      <Mast title={lang === "ar" ? "الباقات" : "Plans"} />
      {plans.map((plan) => (
        <article key={plan.id} className="sheet" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            <h2>{plan.title}</h2>
            <p className="lede">{plan.priceYearly} IQD · {plan.codesCount}</p>
          </div>
          <button className="btn" type="button" onClick={async () => {
            const result = await api<{ paymentUrl: string }>("/api/teacher/subscriptions", { method: "POST", body: JSON.stringify({ userId: me.ownerId, planId: plan.id }) })
            setUrl(result.paymentUrl)
          }}>{lang === "ar" ? "الدفع عبر البوابة" : "Pay through the gateway"}</button>
        </article>
      ))}
      {url ? <a className="auth-link" href={url}>{url}</a> : null}
      <Resource path="/api/teacher/subscriptions" title={lang === "ar" ? "اشتراكاتي" : "My subscriptions"} columns={[{ key: "status", label: lang === "ar" ? "الحالة" : "Status" }, { key: "codesIssued", label: lang === "ar" ? "المصدر" : "Issued" }, { key: "planCodesCount", label: lang === "ar" ? "الحد" : "Allowance" }, { key: "endsAt", label: lang === "ar" ? "النهاية" : "Ends" }]} />
    </div>
  )
}

function Chat() {
  const { lang } = useI18n()
  const [rows, setRows] = useState<Row[]>([])
  useEffect(() => { api<Row[]>("/api/teacher/sessions").then(setRows).catch(() => setRows([])) }, [])
  return (
    <section className="sheet">
      <Mast title={lang === "ar" ? "غرف المحادثة" : "Chat rooms"} lede={lang === "ar" ? "كل غرفة مربوطة بالجلسة وبيئة التشغيل. بناء التطوير لا يكتب في غرف الإنتاج." : "Each room is bound to its session and environment. A development build does not write into production rooms."} />
      {rows.map((row) => (
        <Link key={row.id} className="record" to={`/meetings/${row.id}`}>
          <span>{row.startsAt || row.id}{row.durationMinutes ? ` · ${row.durationMinutes}` : ""}</span>
          <StatusText value={String(row.status ?? "")} lang={lang} />
        </Link>
      ))}
    </section>
  )
}

function Profile() {
  const { lang } = useI18n()
  const [form, setForm] = useState({ firstName: "", lastName: "", address: "", description: "" })
  const [message, setMessage] = useState("")
  useEffect(() => { api<typeof form>("/api/teacher/profile").then((user) => setForm({ firstName: user.firstName ?? "", lastName: user.lastName ?? "", address: user.address ?? "", description: user.description ?? "" })) }, [])
  return (
    <form className="sheet stack" style={{ maxWidth: 640 }} onSubmit={async (event) => { event.preventDefault(); await api("/api/teacher/profile", { method: "PUT", body: JSON.stringify(form) }); setMessage(lang === "ar" ? "تم الحفظ" : "Saved") }}>
      <Mast title={lang === "ar" ? "الملف" : "Profile"} />
      <Field label={lang === "ar" ? "الاسم" : "First"} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
      <Field label={lang === "ar" ? "اللقب" : "Last"} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
      <Field label={lang === "ar" ? "العنوان" : "Address"} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      <Area label={lang === "ar" ? "الوصف" : "Description"} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <button className="btn" type="submit">{lang === "ar" ? "حفظ" : "Save"}</button>
      {message ? <Callout tone="ok">{message}</Callout> : null}
    </form>
  )
}
