import { useEffect, useState } from "react"
import { Link, Navigate, Route, Routes, useNavigate, useParams } from "react-router"
import { Alert, Button, TextField } from "@mui/material"
import { api, download, setToken, type SessionUser } from "../shared/src/api"
import { useI18n } from "../shared/src/i18n"
import { Meeting } from "../shared/src/meeting"
import { teacherPermissions } from "../shared/src/permissions"
import { Resource } from "../shared/src/resource"
import { LoginCard, Shell, type NavItem } from "../shared/src/shell"
import { Callout, CourseCards, Mast, MetricBand } from "../shared/src/ui"

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
  if (!me) return null
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
        <Route path="/students" element={<Resource path="/api/teacher/students" title={lang === "ar" ? "الطلاب" : "Students"} columns={[{ key: "firstName", label: lang === "ar" ? "الاسم" : "Name" }, { key: "phone", label: lang === "ar" ? "الهاتف" : "Phone" }]} />} />
        <Route path="/assistants" element={<Staff />} />
        <Route path="/classrooms" element={<Classrooms />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/meetings/:id" element={<MeetingRoom />} />
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
  const [error, setError] = useState("")
  useEffect(() => { api<NonNullable<typeof data>>("/api/teacher/home").then(setData).catch((reason) => setError(reason.message)) }, [])
  if (error) return <Callout tone="bad">{error}</Callout>
  if (!data) return <div className="panel"><div className="skel" /><div className="skel" style={{ marginTop: 12, width: "46%" }} /></div>
  return (
    <div className="stack">
      <Mast kicker={lang === "ar" ? "استوديو المعلم" : "Teacher studio"} title={lang === "ar" ? "رصيدك وطلاب هذا الشهر" : "Your balance and this month's students"} lede={lang === "ar" ? "هذه الأرقام من حسابك على الخادم، وليست تقديراً." : "These numbers come from your account on the server."} />
      <MetricBand items={[
        { label: lang === "ar" ? "رصيد الأكواد" : "Code balance", value: data.codeBalance, lead: true },
        { label: lang === "ar" ? "طلاب هذا الشهر" : "Students this month", value: data.monthlyStudents },
        { label: lang === "ar" ? "ساعات الحصة المتبقية" : "Remaining hours", value: data.hourHours },
        { label: lang === "ar" ? "نهاية الاشتراك" : "Subscription end", value: data.subscriptionEndsAt ? new Date(data.subscriptionEndsAt).toLocaleDateString(lang === "ar" ? "ar-IQ" : "en") : "—" },
      ]} />
    </div>
  )
}

function Courses() {
  const { lang } = useI18n()
  const [title, setTitle] = useState("")
  const [error, setError] = useState("")
  return (
    <div className="space-y-4">
      <form className="composer" onSubmit={async (event) => {
        event.preventDefault()
        setError("")
        try { await api("/api/teacher/courses", { method: "POST", body: JSON.stringify({ title }) }); setTitle(""); location.reload() }
        catch (reason) { setError(reason instanceof Error ? reason.message : "") }
      }}>
        <TextField label={lang === "ar" ? "عنوان الدورة" : "Course title"} value={title} onChange={(e) => setTitle(e.target.value)} />
        <Button type="submit" variant="contained">{lang === "ar" ? "إنشاء" : "Create"}</Button>
        {error ? <Alert severity="error">{error}</Alert> : null}
      </form>
      <CourseList />
    </div>
  )
}

function CourseList() {
  const { lang } = useI18n()
  const [rows, setRows] = useState<Row[]>([])
  useEffect(() => { api<{ items: Row[] }>("/api/teacher/courses").then((page) => setRows(page.items ?? [])).catch(() => setRows([])) }, [])
  return <CourseCards rows={rows.map((row) => ({ id: row.id, title: row.title }))} href={(id) => `/courses/${id}`} empty={lang === "ar" ? "لا توجد دورات بعد" : "No courses yet"} />
}

function CourseDesk() {
  const { id = "" } = useParams()
  const { lang } = useI18n()
  const [chapters, setChapters] = useState<Row[]>([])
  const [title, setTitle] = useState("")
  const [count, setCount] = useState(1)
  const [message, setMessage] = useState("")
  async function load() { setChapters(await api(`/api/teacher/courses/${id}/chapters`)) }
  useEffect(() => { void load() }, [id])
  return (
    <div className="space-y-4">
      <form className="flex gap-2" onSubmit={async (event) => { event.preventDefault(); await api("/api/teacher/chapters", { method: "POST", body: JSON.stringify({ courseId: id, title }) }); setTitle(""); await load() }}>
        <TextField label={lang === "ar" ? "فصل" : "Chapter"} value={title} onChange={(e) => setTitle(e.target.value)} />
        <Button type="submit" variant="contained">{lang === "ar" ? "إضافة فصل" : "Add chapter"}</Button>
      </form>
      {chapters.map((chapter) => <Chapter key={chapter.id} chapter={chapter} />)}
      <form className="flex flex-wrap items-end gap-2 panel p-4" onSubmit={async (event) => {
        event.preventDefault()
        const result = await api<{ remaining: number }>(`/api/teacher/codes?courseId=${id}`, { method: "POST", body: JSON.stringify({ count }) })
        setMessage(`${lang === "ar" ? "المتبقي" : "Remaining"}: ${result.remaining}`)
      }}>
        <TextField type="number" label={lang === "ar" ? "عدد الأكواد، حد 100" : "Codes, max 100"} value={count} onChange={(e) => setCount(Number(e.target.value))} />
        <Button type="submit" variant="contained">{lang === "ar" ? "توليد" : "Generate"}</Button>
        <Button onClick={() => download(`/api/teacher/courses/${id}/codes/export`, "tovi-codes.xlsx")}>{lang === "ar" ? "تنزيل الجدول" : "Download spreadsheet"}</Button>
        <Button color="warning" onClick={async () => { await api(`/api/teacher/courses/${id}/format`, { method: "POST" }); setMessage(lang === "ar" ? "تمت إعادة ضبط التسجيلات" : "Enrollments were reset") }}>{lang === "ar" ? "تهيئة الدورة" : "Format course"}</Button>
        {message ? <Alert severity="info">{message}</Alert> : null}
      </form>
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
    <section className="panel p-4">
      <h2 className="font-bold">{chapter.title}</h2>
      {lessons.map((lesson, index) => (
        <div key={lesson.id} className="flex items-center justify-between border-b py-2 text-sm">
          <span>{lesson.title}{lesson.videoReference ? ` · ${lesson.videoReference}` : ""}</span>
          <span className="flex gap-2">
            <button disabled={index === 0} onClick={async () => { const ids = lessons.map((item) => item.id); [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]]; await api(`/api/teacher/chapters/${chapter.id}/lessons/order`, { method: "PUT", body: JSON.stringify({ lessonIds: ids }) }); await load() }}>↑</button>
          </span>
        </div>
      ))}
      <form className="mt-3 flex flex-wrap gap-2" onSubmit={async (event) => { event.preventDefault(); await api("/api/teacher/lessons", { method: "POST", body: JSON.stringify({ chapterId: chapter.id, title, videoReference: video || null }) }); setTitle(""); setVideo(""); await load() }}>
        <TextField size="small" label={lang === "ar" ? "درس" : "Lesson"} value={title} onChange={(e) => setTitle(e.target.value)} />
        <TextField size="small" label={lang === "ar" ? "مرجع الفيديو" : "Video reference"} value={video} onChange={(e) => setVideo(e.target.value)} />
        <Button type="submit">{lang === "ar" ? "إضافة" : "Add"}</Button>
      </form>
    </section>
  )
}

function Summaries() {
  const { lang } = useI18n()
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  return (
    <div className="space-y-4">
      <form className="grid gap-2 panel p-4" onSubmit={async (event) => { event.preventDefault(); await api("/api/teacher/summaries", { method: "POST", body: JSON.stringify({ title, body }) }); setTitle(""); setBody("") }}>
        <TextField label={lang === "ar" ? "العنوان" : "Title"} value={title} onChange={(e) => setTitle(e.target.value)} />
        <TextField label={lang === "ar" ? "النص" : "Body"} value={body} onChange={(e) => setBody(e.target.value)} />
        <Button type="submit" variant="contained">{lang === "ar" ? "حفظ الملخص" : "Save summary"}</Button>
      </form>
      <Resource path="/api/teacher/summaries" title={lang === "ar" ? "الملخصات" : "Summaries"} columns={[{ key: "title", label: lang === "ar" ? "العنوان" : "Title" }]} />
    </div>
  )
}

function Exams() {
  const { lang } = useI18n()
  const [courseId, setCourseId] = useState("")
  const [chapterId, setChapterId] = useState("")
  const [lessonId, setLessonId] = useState("")
  const [title, setTitle] = useState("")
  const [mark, setMark] = useState(100)
  const [endDate, setEndDate] = useState("")
  const [groupIds, setGroupIds] = useState("")
  const [revision, setRevision] = useState(0)
  const query = new URLSearchParams()
  if (courseId) query.set("courseId", courseId)
  if (chapterId) query.set("chapterId", chapterId)
  if (lessonId) query.set("lessonId", lessonId)
  return (
    <div className="space-y-4">
      <form className="grid gap-2 panel p-4 md:grid-cols-2" onSubmit={async (event) => {
        event.preventDefault()
        await api("/api/teacher/exams", { method: "POST", body: JSON.stringify({ title, mark, endDate: new Date(endDate).toISOString(), courseId: courseId || null, chapterId: chapterId || null, lessonId: lessonId || null, groupIds: groupIds.split(",").map((item) => item.trim()).filter(Boolean) }) })
        setRevision((value) => value + 1)
      }}>
        <TextField label={lang === "ar" ? "عنوان الاختبار" : "Exam title"} value={title} onChange={(e) => setTitle(e.target.value)} />
        <TextField type="number" label={lang === "ar" ? "الدرجة، حد 100" : "Mark, max 100"} value={mark} onChange={(e) => setMark(Number(e.target.value))} />
        <TextField type="datetime-local" label={lang === "ar" ? "تاريخ الانتهاء" : "End"} value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField label={lang === "ar" ? "معرف الدورة" : "Course id"} value={courseId} onChange={(e) => setCourseId(e.target.value)} />
        <TextField label={lang === "ar" ? "معرف الفصل" : "Chapter id"} value={chapterId} onChange={(e) => setChapterId(e.target.value)} />
        <TextField label={lang === "ar" ? "معرف الدرس" : "Lesson id"} value={lessonId} onChange={(e) => setLessonId(e.target.value)} />
        <TextField label={lang === "ar" ? "المجموعات، مفصولة بفاصلة" : "Group ids, comma separated"} value={groupIds} onChange={(e) => setGroupIds(e.target.value)} />
        <Button type="submit" variant="contained">{lang === "ar" ? "حفظ الاختبار" : "Save exam"}</Button>
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
    <div className="space-y-4">
      <Button onClick={() => download(`/api/teacher/exams/${id}/codes/export`, "tovi-codes.xlsx")}>{lang === "ar" ? "تنزيل أكواد الاختبار" : "Download exam codes"}</Button>
      <form className="grid gap-2 panel p-4" onSubmit={async (event) => {
        event.preventDefault()
        const body: Record<string, unknown> = { type, text, mark }
        if (type === "TrueFalse") body.correct = correct === "true"
        if (type === "MultipleChoice") body.options = [{ text: "أ", correct: true }, { text: "ب", correct: false }]
        await api(`/api/teacher/exams/${id}/questions`, { method: "POST", body: JSON.stringify(body) })
        await load()
      }}>
        <TextField select label={lang === "ar" ? "النوع" : "Type"} value={type} onChange={(e) => setType(e.target.value)} SelectProps={{ native: true }}>
          <option value="OpenEnded">OpenEnded</option>
          <option value="MultipleChoice">MultipleChoice</option>
          <option value="TrueFalse">TrueFalse</option>
        </TextField>
        <TextField label={lang === "ar" ? "نص السؤال" : "Question"} value={text} onChange={(e) => setText(e.target.value)} />
        <TextField type="number" label={lang === "ar" ? "درجة السؤال، حد 100" : "Question mark, max 100"} value={mark} onChange={(e) => setMark(Number(e.target.value))} />
        {type === "TrueFalse" ? <TextField select label={lang === "ar" ? "الصحيح" : "Correct"} value={correct} onChange={(e) => setCorrect(e.target.value)} SelectProps={{ native: true }}><option value="true">true</option><option value="false">false</option></TextField> : null}
        <Button type="submit" variant="contained">{lang === "ar" ? "إضافة سؤال" : "Add question"}</Button>
      </form>
      {questions.map((question) => (
        <article key={question.id} className="record">
          <span>{question.text} · {question.type} · {question.mark}</span>
          <Button color="error" onClick={async () => { await api(`/api/teacher/questions/${question.id}`, { method: "DELETE" }); await load() }}>{lang === "ar" ? "حذف" : "Delete"}</Button>
        </article>
      ))}
    </div>
  )
}

function Groups() {
  const { lang } = useI18n()
  const [name, setName] = useState("")
  return (
    <div className="space-y-4">
      <form className="flex gap-2" onSubmit={async (event) => { event.preventDefault(); await api("/api/teacher/groups", { method: "POST", body: JSON.stringify({ name }) }) }}>
        <TextField label={lang === "ar" ? "اسم المجموعة" : "Group"} value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" variant="contained">{lang === "ar" ? "إنشاء" : "Create"}</Button>
      </form>
      <Resource path="/api/teacher/groups" title={lang === "ar" ? "المجموعات" : "Groups"} columns={[{ key: "name", label: lang === "ar" ? "الاسم" : "Name" }]} />
    </div>
  )
}

function Staff() {
  const { lang } = useI18n()
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", password: "", style: "Assistant", groupName: "" })
  const [selected, setSelected] = useState<string[]>([])
  const [message, setMessage] = useState("")
  return (
    <div className="space-y-4">
      <form className="grid gap-3 panel p-4" onSubmit={async (event) => {
        event.preventDefault()
        let groupId: string | undefined
        if (form.style === "Staff") {
          const group = await api<{ id: string }>("/api/teacher/permission-groups", { method: "POST", body: JSON.stringify({ name: form.groupName || form.firstName, permissions: selected }) })
          groupId = group.id
        }
        await api("/api/teacher/employees", { method: "POST", body: JSON.stringify({ ...form, style: form.style, permissions: form.style === "Assistant" ? selected : [], groupId }) })
        setMessage(lang === "ar" ? "تم إنشاء الحساب والصلاحيات على الخادم" : "Account and permissions were saved on the server")
      }}>
        <div className="grid gap-2 md:grid-cols-2">
          <TextField label={lang === "ar" ? "الاسم" : "First"} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          <TextField label={lang === "ar" ? "اللقب" : "Last"} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          <TextField label={lang === "ar" ? "الهاتف" : "Phone"} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <TextField type="password" label={lang === "ar" ? "كلمة المرور" : "Password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <TextField select label={lang === "ar" ? "النوع" : "Style"} value={form.style} onChange={(e) => setForm({ ...form, style: e.target.value })} SelectProps={{ native: true }}>
            <option value="Assistant">{lang === "ar" ? "مساعد" : "Assistant"}</option>
            <option value="Staff">{lang === "ar" ? "موظف" : "Employee"}</option>
          </TextField>
          {form.style === "Staff" ? <TextField label={lang === "ar" ? "اسم مجموعة الصلاحيات" : "Permission group"} value={form.groupName} onChange={(e) => setForm({ ...form, groupName: e.target.value })} /> : null}
        </div>
        <div className="grid max-h-64 gap-1 overflow-auto sm:grid-cols-2">
          {teacherPermissions.map((slug) => (
            <label key={slug} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={selected.includes(slug)} onChange={() => setSelected((list) => list.includes(slug) ? list.filter((item) => item !== slug) : [...list, slug])} />
              {slug}
            </label>
          ))}
        </div>
        <Button type="submit" variant="contained">{lang === "ar" ? "حفظ" : "Save"}</Button>
        {message ? <Alert severity="success">{message}</Alert> : null}
      </form>
      <Resource path="/api/teacher/employees" title={lang === "ar" ? "الموظفون" : "Employees"} columns={[{ key: "firstName", label: lang === "ar" ? "الاسم" : "Name" }, { key: "phone", label: lang === "ar" ? "الهاتف" : "Phone" }, { key: "employeeStyle", label: lang === "ar" ? "النوع" : "Style" }]} />
    </div>
  )
}

function Classrooms() {
  const { lang } = useI18n()
  const [title, setTitle] = useState("")
  const [code, setCode] = useState("")
  const [message, setMessage] = useState("")
  return (
    <div className="space-y-4">
      <form className="flex gap-2" onSubmit={async (event) => { event.preventDefault(); await api("/api/teacher/classrooms", { method: "POST", body: JSON.stringify({ title }) }) }}>
        <TextField label={lang === "ar" ? "قاعة جديدة" : "New classroom"} value={title} onChange={(e) => setTitle(e.target.value)} />
        <Button type="submit" variant="contained">{lang === "ar" ? "فتح" : "Open"}</Button>
      </form>
      <form className="flex gap-2" onSubmit={async (event) => { event.preventDefault(); await api("/api/teacher/hour-packages/redeem", { method: "POST", body: JSON.stringify({ code }) }); setMessage(lang === "ar" ? "تم تفعيل باقة الساعات" : "Hour package activated") }}>
        <TextField label={lang === "ar" ? "كود باقة الساعات" : "Hour package code"} value={code} onChange={(e) => setCode(e.target.value)} />
        <Button type="submit">{lang === "ar" ? "تفعيل" : "Redeem"}</Button>
        {message ? <Alert severity="success">{message}</Alert> : null}
      </form>
      <Resource path="/api/teacher/classrooms" title={lang === "ar" ? "القاعات" : "Classrooms"} columns={[{ key: "title", label: lang === "ar" ? "العنوان" : "Title" }, { key: "status", label: lang === "ar" ? "الحالة" : "Status" }]} />
    </div>
  )
}

function Sessions() {
  const { lang } = useI18n()
  const [classroomId, setClassroomId] = useState("")
  const [startsAt, setStartsAt] = useState("")
  const [duration, setDuration] = useState(60)
  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState("")
  async function load() { setRows(await api("/api/teacher/sessions")) }
  useEffect(() => { void load() }, [])
  return (
    <div className="space-y-4">
      <form className="grid gap-2 panel p-4 md:grid-cols-2" onSubmit={async (event) => {
        event.preventDefault()
        setError("")
        try {
          await api("/api/teacher/sessions", { method: "POST", body: JSON.stringify({ classroomId, startsAt: new Date(startsAt).toISOString(), durationMinutes: duration }) })
          await load()
        } catch (reason) { setError(reason instanceof Error ? reason.message : "") }
      }}>
        <TextField label={lang === "ar" ? "معرف القاعة" : "Classroom id"} value={classroomId} onChange={(e) => setClassroomId(e.target.value)} />
        <TextField type="datetime-local" label={lang === "ar" ? "البداية" : "Starts"} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField select label={lang === "ar" ? "المدة" : "Duration"} value={duration} onChange={(e) => setDuration(Number(e.target.value))} SelectProps={{ native: true }}>
          {[30, 45, 60, 90, 120].map((minutes) => <option key={minutes} value={minutes}>{minutes}</option>)}
        </TextField>
        <Button type="submit" variant="contained">{lang === "ar" ? "جدولة وخصم المدة كاملة" : "Schedule and deduct the full duration"}</Button>
        {error ? <Alert severity="error">{error}</Alert> : null}
      </form>
      {rows.map((row) => (
        <article key={row.id} className="record">
          <span>{row.startsAt} · {row.durationMinutes} · {row.status}</span>
          <span className="flex gap-2">
            <Link className="btn" to={`/meetings/${row.id}`}>{lang === "ar" ? "دخول الحصة" : "Enter meeting"}</Link>
            <Button onClick={async () => { await api(`/api/teacher/sessions/${row.id}/cancel`, { method: "POST" }); await load() }}>{lang === "ar" ? "إلغاء بلا استرجاع" : "Cancel, no refund"}</Button>
          </span>
        </article>
      ))}
    </div>
  )
}

function MeetingRoom() {
  const { id = "" } = useParams()
  return <Meeting sessionId={id} role="teacher" />
}

function Plans({ me }: { me: SessionUser }) {
  const { lang } = useI18n()
  const [plans, setPlans] = useState<Row[]>([])
  const [url, setUrl] = useState("")
  useEffect(() => { api<Row[]>("/api/teacher/plans").then(setPlans).catch(() => setPlans([])) }, [])
  return (
    <div className="space-y-3">
      {plans.map((plan) => (
        <article key={plan.id} className="flex flex-wrap items-center justify-between gap-3 panel p-4">
          <div>
            <h2 className="font-bold">{plan.title}</h2>
            <p className="lede">{plan.priceYearly} IQD · {plan.codesCount}</p>
          </div>
          <Button variant="contained" onClick={async () => {
            const result = await api<{ paymentUrl: string }>("/api/teacher/subscriptions", { method: "POST", body: JSON.stringify({ userId: me.ownerId, planId: plan.id }) })
            setUrl(result.paymentUrl)
          }}>{lang === "ar" ? "الدفع عبر البوابة" : "Pay through the gateway"}</Button>
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
    <section className="panel p-4">
      <Mast title={lang === "ar" ? "غرف المحادثة" : "Chat rooms"} lede={lang === "ar" ? "كل غرفة مربوطة بالجلسة وبيئة التشغيل. بناء التطوير لا يكتب في غرف الإنتاج." : "Each room is bound to its session and environment. A development build does not write into production rooms."} />
      {rows.map((row) => <Link key={row.id} className="block border-b py-3" to={`/meetings/${row.id}`}>{row.id}</Link>)}
    </section>
  )
}

function Profile() {
  const { lang } = useI18n()
  const [form, setForm] = useState({ firstName: "", lastName: "", address: "", description: "" })
  const [message, setMessage] = useState("")
  useEffect(() => { api<typeof form>("/api/teacher/profile").then((user) => setForm({ firstName: user.firstName ?? "", lastName: user.lastName ?? "", address: user.address ?? "", description: user.description ?? "" })) }, [])
  return (
    <form className="grid max-w-xl gap-3 panel p-4" onSubmit={async (event) => { event.preventDefault(); await api("/api/teacher/profile", { method: "PUT", body: JSON.stringify(form) }); setMessage(lang === "ar" ? "تم الحفظ" : "Saved") }}>
      <TextField label={lang === "ar" ? "الاسم" : "First"} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
      <TextField label={lang === "ar" ? "اللقب" : "Last"} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
      <TextField label={lang === "ar" ? "العنوان" : "Address"} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      <TextField label={lang === "ar" ? "الوصف" : "Description"} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <Button type="submit" variant="contained">{lang === "ar" ? "حفظ" : "Save"}</Button>
      {message ? <Alert severity="success">{message}</Alert> : null}
    </form>
  )
}
