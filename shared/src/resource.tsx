import { useEffect, useMemo, useState } from "react"
import { api, ApiError } from "./api"
import { useI18n } from "./i18n"

export type Field = { name: string; label: string; type?: "text" | "number" | "password" | "select"; options?: string[]; value?: string }

type Page<T> = { items: T[]; page: number; pageSize: number; total: number }

const statusClass: Record<string, string> = {
  active: "ok", approved: "ok", true: "ok", completed: "ok", scheduled: "info",
  waiting: "wait", new: "wait", undercorrection: "wait", under_correction: "wait",
  false: "bad", inactive: "bad", expired: "bad", canceled: "bad", cancelled: "bad", failed: "bad",
}

function optionText(option: string, lang: string) {
  const ar: Record<string, string> = { true: "نعم", false: "لا" }
  return lang === "ar" && ar[option.toLowerCase()] ? ar[option.toLowerCase()] : option
}

function present(value: unknown, lang: string) {
  if (value == null || value === "") return { text: "—", kind: "" }
  const text = String(value)
  const key = text.toLowerCase()
  const ar: Record<string, string> = {
    true: "نعم", false: "لا", active: "فعّال", inactive: "متوقف", scheduled: "مجدول",
    waiting: "بانتظار", completed: "مكتمل", expired: "منتهٍ", canceled: "ملغى", cancelled: "ملغى",
    new: "جديد", assistant: "مساعد", staff: "موظف", internal: "داخلي", external: "خارجي",
  }
  if (lang === "ar" && ar[key]) return { text: ar[key], kind: statusClass[key] }
  if (statusClass[key]) return { text, kind: statusClass[key] }
  return { text, kind: "" }
}

export function Resource<T extends Record<string, unknown>>({
  path, columns, fields, title,
}: {
  path: string
  title: string
  columns: { key: string; label: string }[]
  fields?: Field[]
}) {
  const { t, lang } = useI18n()
  const [rows, setRows] = useState<T[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")

  async function load(next = page) {
    setError("")
    setLoading(true)
    try {
      const data = await api<Page<T> | T[]>(`${path}${path.includes("?") ? "&" : "?"}page=${next}&pageSize=20`)
      if (Array.isArray(data)) { setRows(data); setTotal(data.length) }
      else { setRows(data.items ?? []); setTotal(data.total ?? 0) }
    } catch (reason) {
      setRows([])
      setError(reason instanceof ApiError ? reason.message : t.error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load(1) }, [path])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(needle))
  }, [rows, query])

  const [formError, setFormError] = useState("")

  return (
    <section className="panel">
      <div className="toolbar">
        <div>
          <h2>{title}</h2>
          <p className="lede">{lang === "ar" ? `${total} سجل من الخادم` : `${total} records from the server`}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input className="search" value={query} placeholder={t.search} onChange={(e) => setQuery(e.target.value)} aria-label={t.search} />
          {fields ? <button className="btn" type="button" onClick={() => { setForm(Object.fromEntries((fields ?? []).map((field) => [field.name, field.value ?? ""]))); setFormError(""); setOpen(true) }}>{t.create}</button> : null}
        </div>
      </div>
      {error ? <p className="callout" role="alert">{error}</p> : null}
      <div className="table-wrap">
        <table className="data">
          <thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
          <tbody>
            {loading ? Array.from({ length: 5 }).map((_, index) => (
              <tr key={index}>{columns.map((column) => <td key={column.key}><div className="skel" /></td>)}</tr>
            )) : visible.length === 0 ? (
              <tr><td colSpan={columns.length}><div className="empty"><i /><strong>{t.empty}</strong></div></td></tr>
            ) : visible.map((row, index) => (
              <tr key={String(row.id ?? index)}>
                {columns.map((column) => {
                  const cell = present(row[column.key], lang)
                  return <td key={column.key} data-label={column.label}>{cell.kind ? <span className={`pill ${cell.kind}`}>{cell.text}</span> : cell.text}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pager">
        <span>{lang === "ar" ? `صفحة ${page}` : `Page ${page}`}</span>
        <span style={{ display: "flex", gap: 8 }}>
          <button className="ghost" type="button" disabled={page <= 1} onClick={() => { const next = page - 1; setPage(next); void load(next) }}>{lang === "ar" ? "السابق" : "Previous"}</button>
          <button className="ghost" type="button" disabled={page * 20 >= total} onClick={() => { const next = page + 1; setPage(next); void load(next) }}>{lang === "ar" ? "التالي" : "Next"}</button>
        </span>
      </div>
      {open ? (
        <div className="modal-back" onClick={() => setOpen(false)}>
          <form className="modal" role="dialog" aria-modal="true" aria-labelledby="resource-dialog-title" onClick={(event) => event.stopPropagation()} onSubmit={async (event) => {
            event.preventDefault()
            setFormError("")
            const payload: Record<string, unknown> = {}
            for (const field of fields ?? []) {
              const raw = form[field.name] ?? ""
              if (raw === "") continue
              payload[field.name] = field.type === "number" ? Number(raw) : raw === "true" ? true : raw === "false" ? false : raw
            }
            try {
              await api(path, { method: "POST", body: JSON.stringify(payload) })
              setOpen(false)
              await load()
            } catch (reason) {
              setFormError(reason instanceof ApiError ? reason.message : t.error)
            }
          }} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false) }}>
            <h2 id="resource-dialog-title">{title}</h2>
            {formError ? <p className="form-error" role="alert">{formError}</p> : null}
            {fields?.map((field) => (
              <label key={field.name} className="field">{field.label}
                {field.type === "select" ? (
                  <select value={form[field.name] ?? ""} onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}>
                    <option value="" />
                    {field.options?.map((option) => <option key={option} value={option}>{optionText(option, lang)}</option>)}
                  </select>
                ) : (
                  <input type={field.type ?? "text"} value={form[field.name] ?? ""} onChange={(e) => setForm({ ...form, [field.name]: e.target.value })} />
                )}
              </label>
            ))}
            <div className="modal-actions">
              <button type="button" className="ghost" onClick={() => setOpen(false)}>{t.cancel}</button>
              <button className="btn" type="submit">{t.save}</button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  )
}
