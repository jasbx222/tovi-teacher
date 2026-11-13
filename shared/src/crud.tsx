import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react"
import { Link } from "react-router"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { token } from "./api"
import { useI18n } from "./i18n"

export type Field = {
  name: string
  label: string
  type?: "text" | "number" | "password" | "select" | "textarea" | "file" | "tel" | "date" | "datetime-local"
  options?: string[] | { value: string; label: string }[]
  value?: string
  required?: boolean
  optionalOnEdit?: boolean
  accept?: string
  hint?: string
}

export type Column<T extends Record<string, unknown> = Record<string, unknown>> = {
  key: string
  label: string
  value?: (row: T) => unknown
  image?: boolean
  href?: (row: T) => string
}

const statusClass: Record<string, string> = {
  active: "ok", approved: "ok", true: "ok", completed: "ok", scheduled: "info",
  waiting: "wait", new: "wait", undercorrection: "wait", under_correction: "wait",
  false: "bad", inactive: "bad", disabled: "bad", expired: "bad", canceled: "bad", cancelled: "bad", failed: "bad",
}

const statusAr: Record<string, string> = {
  true: "نعم", false: "لا", active: "فعّال", inactive: "متوقف", disabled: "متوقف", scheduled: "مجدول",
  waiting: "بانتظار", completed: "مكتمل", expired: "منتهٍ", canceled: "ملغى", cancelled: "ملغى",
  new: "جديد", assistant: "مساعد", staff: "موظف", internal: "داخلي", external: "خارجي",
}

export function optionText(option: string, lang: string) {
  return lang === "ar" && statusAr[option.toLowerCase()] ? statusAr[option.toLowerCase()] : option
}

export function present(value: unknown, lang: string) {
  if (value == null || value === "") return { text: "—", kind: "" }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime()) && date.getFullYear() > 1900) {
      return { text: date.toLocaleDateString(lang === "ar" ? "ar-IQ" : "en-GB"), kind: "" }
    }
  }
  const text = String(value)
  const key = text.toLowerCase()
  if (lang === "ar" && statusAr[key]) return { text: statusAr[key], kind: statusClass[key] ?? "" }
  if (statusClass[key]) return { text, kind: statusClass[key] }
  return { text, kind: "" }
}

export function apiBase() {
  return (import.meta.env.VITE_API_URL as string | undefined) ?? ""
}

type ToastItem = { id: number; text: string; tone: "ok" | "bad" | "info" }
type ToastApi = { push: (text: string, tone?: ToastItem["tone"]) => void }

const ToastCtx = createContext<ToastApi | null>(null)

export function useToast() {
  return useContext(ToastCtx) ?? { push: () => {} }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const push = useCallback((text: string, tone: ToastItem["tone"] = "ok") => {
    const id = Date.now() + Math.random()
    setItems((list) => [...list, { id, text, tone }])
    window.setTimeout(() => setItems((list) => list.filter((item) => item.id !== id)), 3200)
  }, [])
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="toast-stack" aria-live="polite">
        <AnimatePresence>
          {items.map((item) => (
            <motion.div
              key={item.id}
              className={`toast ${item.tone}`}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.22 }}
            >
              {item.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}

export function AuthImage({ fileId, alt, className }: { fileId?: unknown; alt?: string; className?: string }) {
  const [src, setSrc] = useState("")
  useEffect(() => {
    const id = String(fileId ?? "")
    if (!id || id === "undefined" || id === "null") { setSrc(""); return }
    const url = id.startsWith("http") || id.startsWith("blob:") || id.startsWith("/")
      ? (id.startsWith("/") ? `${apiBase()}${id}` : id)
      : `${apiBase()}/api/files/${id}`
    let objectUrl = ""
    let cancelled = false
    fetch(url, { headers: token() ? { Authorization: `Bearer ${token()}` } : {} })
      .then((response) => { if (!response.ok) throw new Error("img"); return response.blob() })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob)
        if (!cancelled) setSrc(objectUrl)
        else URL.revokeObjectURL(objectUrl)
      })
      .catch(() => { if (!cancelled) setSrc("") })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [fileId])
  if (!src) return <span className={className ? `avatar-fallback ${className}` : "avatar-fallback"}>{(alt ?? "?").slice(0, 1)}</span>
  return <img src={src} alt={alt ?? ""} className={className} />
}

export function Avatar({ fileId, name, className }: { fileId?: unknown; name?: string; className?: string }) {
  return (
    <span className={className ? `avatar ${className}` : "avatar"}>
      <AuthImage fileId={fileId} alt={name} />
    </span>
  )
}

export function FileDrop({ name, label, accept, valueUrl, hint, required }: {
  name: string; label: string; accept?: string; valueUrl?: string; hint?: string; required?: boolean
}) {
  const { lang } = useI18n()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState(valueUrl ?? "")
  useEffect(() => { if (!file) setPreview(valueUrl ?? "") }, [valueUrl, file])
  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  return (
    <label className="dropzone">
      <span className="dropzone-label">{label}{required ? " *" : ""}</span>
      <input className="sr-only" type="file" name={name} accept={accept ?? "image/png,image/jpeg,image/webp"} required={required && !file && !valueUrl} onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
      <span className="dropzone-box">
        {preview ? <img src={preview} alt="" /> : <i className="dropzone-plus" />}
        <span>
          <strong>{file ? file.name : (lang === "ar" ? "اسحب الصورة أو اضغط للاختيار" : "Drop an image or click to choose")}</strong>
          <small>{hint ?? (lang === "ar" ? "PNG أو JPEG أو WEBP" : "PNG, JPEG or WEBP")}</small>
        </span>
      </span>
    </label>
  )
}

function fieldRequired(field: Field, mode: "create" | "edit") {
  if (field.optionalOnEdit && mode === "edit") return false
  if (field.type === "file" && mode === "edit") return false
  if (field.type === "password" && mode === "edit") return false
  return field.required !== false && (field.required === true || field.type === "password" && mode === "create" || field.type === "file" && mode === "create")
}

export function FormFields({ fields, form, setForm, mode, files, setFiles }: {
  fields: Field[]
  form: Record<string, string>
  setForm: (next: Record<string, string>) => void
  mode: "create" | "edit"
  files: Record<string, File | null>
  setFiles: (next: Record<string, File | null>) => void
}) {
  const { lang } = useI18n()
  return (
    <>
      {fields.map((field) => {
        const required = fieldRequired(field, mode)
        if (field.type === "file") {
          const chosen = files[field.name]
          const preview = chosen ? URL.createObjectURL(chosen) : (form[`${field.name}Preview`] || "")
          return (
            <label key={field.name} className="dropzone">
              <span className="dropzone-label">{field.label}{required ? " *" : ""}</span>
              <input className="sr-only" type="file" accept={field.accept ?? "image/png,image/jpeg,image/webp"} required={required} onChange={(event) => setFiles({ ...files, [field.name]: event.target.files?.[0] ?? null })} />
              <span className="dropzone-box">
                {preview ? <img src={preview} alt="" /> : <i className="dropzone-plus" />}
                <span>
                  <strong>{chosen ? chosen.name : (lang === "ar" ? "اسحب الصورة أو اضغط للاختيار" : "Drop an image or click to choose")}</strong>
                  <small>{field.hint ?? (lang === "ar" ? "PNG أو JPEG أو WEBP" : "PNG, JPEG or WEBP")}</small>
                </span>
              </span>
            </label>
          )
        }
        const options = (field.options ?? []).map((option) => typeof option === "string" ? { value: option, label: optionText(option, lang) } : option)
        return (
          <label key={field.name} className={form[field.name] ? "field floating filled" : "field floating"}>
            <span>{field.label}{required ? " *" : ""}</span>
            {field.type === "select" ? (
              <select required={required} value={form[field.name] ?? ""} onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}>
                <option value="" />
                {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            ) : field.type === "textarea" ? (
              <textarea required={required} rows={4} value={form[field.name] ?? ""} onChange={(event) => setForm({ ...form, [field.name]: event.target.value })} />
            ) : (
              <input type={field.type ?? "text"} required={required} minLength={field.type === "password" && required ? 8 : undefined} value={form[field.name] ?? ""} onChange={(event) => setForm({ ...form, [field.name]: event.target.value })} autoComplete={field.type === "password" ? "new-password" : "off"} />
            )}
            {field.hint ? <small className="field-hint">{field.hint}</small> : null}
          </label>
        )
      })}
    </>
  )
}

export function FormModal({ open, title, children, onClose, onSubmit, busy, error, submitLabel, size }: {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  onSubmit: () => Promise<void> | void
  busy?: boolean
  error?: string
  submitLabel?: string
  size?: "sm" | "md" | "lg"
}) {
  const { t, dir } = useI18n()
  const reduce = useReducedMotion()
  const ref = useRef<HTMLFormElement>(null)
  const titleId = useId()
  useEffect(() => {
    if (!open) return
    const root = ref.current
    const pick = () => Array.from(root?.querySelectorAll<HTMLElement>("button, [href], input, select, textarea") ?? []).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1)
    const first = pick().find((el) => el !== root?.querySelector(".modal-x"))
    first?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); return }
      if (event.key !== "Tab") return
      const list = pick()
      if (list.length === 0) return
      const index = list.indexOf(document.activeElement as HTMLElement)
      if (event.shiftKey && index <= 0) { event.preventDefault(); list[list.length - 1].focus() }
      else if (!event.shiftKey && index === list.length - 1) { event.preventDefault(); list[0].focus() }
    }
    document.addEventListener("keydown", onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = previous }
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="modal-back glass-back" onClick={onClose} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduce ? undefined : { opacity: 0 }}>
          <motion.form
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={`modal modal-center modal-${size ?? "md"}`}
            dir={dir}
            initial={reduce ? false : { opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={(event) => event.stopPropagation()}
            onSubmit={async (event) => {
              event.preventDefault()
              await onSubmit()
            }}
          >
            <header className="modal-head">
              <h2 id={titleId}>{title}</h2>
              <button type="button" className="modal-x ghost" onClick={onClose} aria-label={t.close}>×</button>
            </header>
            <div className="modal-body">
              {error ? <p className="form-error" role="alert">{error}</p> : null}
              {children}
            </div>
            <div className="modal-actions">
              <button type="button" className="ghost" onClick={onClose} disabled={busy}>{t.cancel}</button>
              <button className="btn" type="submit" disabled={busy}>{busy ? t.saving : (submitLabel ?? t.save)}</button>
            </div>
          </motion.form>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export function ConfirmDialog({ open, title, body, onClose, onConfirm, busy }: {
  open: boolean; title: string; body?: string; onClose: () => void; onConfirm: () => Promise<void> | void; busy?: boolean
}) {
  const { t } = useI18n()
  return (
    <FormModal open={open} title={title} onClose={onClose} onSubmit={onConfirm} busy={busy} submitLabel={t.delete} size="sm">
      <p className="lede">{body ?? t.confirmDelete}</p>
    </FormModal>
  )
}

export function PageHeader({ title, count, query, onQuery, onAdd, addLabel, extra }: {
  title: string
  count?: number
  query?: string
  onQuery?: (value: string) => void
  onAdd?: () => void
  addLabel?: string
  extra?: ReactNode
}) {
  const { t, lang } = useI18n()
  return (
    <div className="crud-head">
      <div>
        <h2>{title}</h2>
        {count != null ? <p className="crud-count">{lang === "ar" ? `${count} سجل` : `${count} records`}</p> : null}
      </div>
      <div className="crud-tools">
        {onQuery ? <input className="search" value={query} placeholder={t.search} onChange={(event) => onQuery(event.target.value)} aria-label={t.search} /> : null}
        {extra}
        {onAdd ? <button className="btn" type="button" onClick={onAdd}>{addLabel ?? t.create}</button> : null}
      </div>
    </div>
  )
}

export function DataTable<T extends Record<string, unknown>>({
  columns, rows, loading, total, page, pageSize = 20, onPage, empty, onAdd, onEdit, onDelete, image, rowHref,
}: {
  columns: Column<T>[]
  rows: T[]
  loading?: boolean
  total: number
  page: number
  pageSize?: number
  onPage: (page: number) => void
  empty?: string
  onAdd?: () => void
  onEdit?: (row: T) => void
  onDelete?: (row: T) => void
  image?: string | ((row: T) => unknown)
  rowHref?: (row: T) => string
}) {
  const { t, lang } = useI18n()
  const hasActions = Boolean(onEdit || onDelete)
  const fileOf = (row: T) => (typeof image === "function" ? image(row) : image ? row[image] : undefined)
  const nameOf = (row: T) => String(row.name ?? row.title ?? row.instituteName ?? row.firstName ?? row.question ?? "")
  return (
    <div className="directory-card crud-card">
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              {image ? <th className="col-avatar">{lang === "ar" ? "الصورة" : "Photo"}</th> : null}
              {columns.map((column) => <th key={column.key}>{column.label}</th>)}
              {hasActions ? <th className="col-actions">{t.actions}</th> : null}
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 6 }).map((_, index) => (
              <tr key={index}>
                {image ? <td><div className="skel avatar-skel" /></td> : null}
                {columns.map((column) => <td key={column.key}><div className="skel" /></td>)}
                {hasActions ? <td><div className="skel" /></td> : null}
              </tr>
            )) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (image ? 1 : 0) + (hasActions ? 1 : 0)}>
                  <div className="empty">
                    <i />
                    <strong>{empty ?? t.empty}</strong>
                    <p>{t.emptyHint}</p>
                    {onAdd ? <button className="btn" type="button" onClick={onAdd}>{t.create}</button> : null}
                  </div>
                </td>
              </tr>
            ) : rows.map((row, index) => {
              const href = rowHref?.(row)
              const cells = (
                <>
                  {image ? <td className="col-avatar"><Avatar fileId={fileOf(row)} name={nameOf(row)} /></td> : null}
                  {columns.map((column) => {
                    const raw = column.image ? null : (column.value ? column.value(row) : row[column.key])
                    const cell = present(raw, lang)
                    const inner = column.image ? <Avatar fileId={column.value ? column.value(row) : row[column.key]} name={nameOf(row)} /> : cell.kind ? <span className={`pill ${cell.kind}`}>{cell.text}</span> : cell.text
                    const link = column.href?.(row)
                    return <td key={column.key} data-label={column.label}>{link ? <Link to={link}>{inner}</Link> : inner}</td>
                  })}
                  {hasActions ? (
                    <td className="col-actions">
                      <span className="row-actions">
                        {onEdit ? <button type="button" className="ghost icon-btn" onClick={(event) => { event.preventDefault(); onEdit(row) }}>{t.edit}</button> : null}
                        {onDelete ? <button type="button" className="ghost icon-btn danger" onClick={(event) => { event.preventDefault(); onDelete(row) }}>{t.delete}</button> : null}
                      </span>
                    </td>
                  ) : null}
                </>
              )
              return href ? (
                <tr key={String(row.id ?? index)} className="row-link">
                  <td colSpan={columns.length + (image ? 1 : 0) + (hasActions ? 1 : 0)} style={{ padding: 0 }}>
                    <Link className="row-link-inner" to={href}>{cells}</Link>
                  </td>
                </tr>
              ) : <tr key={String(row.id ?? index)}>{cells}</tr>
            })}
          </tbody>
        </table>
      </div>
      <div className="pager">
        <span>{lang === "ar" ? `صفحة ${page} من ${Math.max(1, Math.ceil(total / pageSize))}` : `Page ${page} of ${Math.max(1, Math.ceil(total / pageSize))}`}</span>
        <span className="pager-btns">
          <button className="ghost" type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>{t.previous}</button>
          <button className="ghost" type="button" disabled={page * pageSize >= total} onClick={() => onPage(page + 1)}>{t.next}</button>
        </span>
      </div>
    </div>
  )
}

export function buildPayload(fields: Field[], form: Record<string, string>, files: Record<string, File | null>, multipart: boolean) {
  if (multipart || Object.values(files).some(Boolean)) {
    const data = new FormData()
    for (const field of fields) {
      if (field.type === "file") {
        const file = files[field.name]
        if (file) data.append(field.name, file)
        continue
      }
      const raw = form[field.name] ?? ""
      if (raw === "") continue
      data.append(field.name, raw)
    }
    return data
  }
  const payload: Record<string, unknown> = {}
  for (const field of fields) {
    if (field.type === "file") continue
    const raw = form[field.name] ?? ""
    if (raw === "") continue
    payload[field.name] = field.type === "number" ? Number(raw) : raw === "true" ? true : raw === "false" ? false : raw
  }
  return payload
}

export function valuesFromRow(fields: Field[], row?: Record<string, unknown> | null) {
  const form: Record<string, string> = {}
  for (const field of fields) {
    if (field.type === "password" || field.type === "file") { form[field.name] = field.value ?? ""; continue }
    const raw = row ? row[field.name] : field.value
    form[field.name] = raw == null ? (field.value ?? "") : String(raw)
  }
  if (row?.logoFileId) form.logoPreview = String(row.logoFileId)
  return form
}

export function useFormState(fields: Field[] | undefined, row?: Record<string, unknown> | null) {
  const initial = useMemo(() => valuesFromRow(fields ?? [], row), [fields, row])
  const [form, setForm] = useState(initial)
  const [files, setFiles] = useState<Record<string, File | null>>({})
  useEffect(() => { setForm(initial); setFiles({}) }, [initial])
  return { form, setForm, files, setFiles }
}
