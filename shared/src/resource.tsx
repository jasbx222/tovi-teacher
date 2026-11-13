import { useEffect, useMemo, useState } from "react"
import { api, ApiError } from "./api"
import { useI18n } from "./i18n"
import {
  DataTable, FormFields, FormModal, ConfirmDialog, PageHeader, buildPayload, valuesFromRow, useToast,
  type Field, type Column,
} from "./crud"

export type { Field, Column } from "./crud"

type Page<T> = { items: T[]; page: number; pageSize: number; total: number }

export function Resource<T extends Record<string, unknown>>({
  path, columns, fields, title, image, update, remove, multipart, createPath, createDefaults, submit, rowHref, pageSize = 20, onAdd, formTitle,
}: {
  path: string
  title: string
  columns: Column<T>[]
  fields?: Field[]
  image?: string | ((row: T) => unknown)
  update?: boolean
  remove?: boolean
  multipart?: boolean
  createPath?: string
  createDefaults?: Record<string, string>
  submit?: (args: { payload: FormData | Record<string, unknown>; mode: "create" | "edit"; row?: T; files: Record<string, File | null> }) => Promise<void>
  rowHref?: (row: T) => string
  pageSize?: number
  onAdd?: () => void
  formTitle?: (mode: "create" | "edit") => string
}) {
  const { t, lang } = useI18n()
  const toast = useToast()
  const [rows, setRows] = useState<T[]>([])
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<"create" | "edit">("create")
  const [current, setCurrent] = useState<T | undefined>()
  const [form, setForm] = useState<Record<string, string>>({})
  const [files, setFiles] = useState<Record<string, File | null>>({})
  const [formError, setFormError] = useState("")
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<T | undefined>()

  const linkedColumns = useMemo(() => {
    if (!rowHref) return columns
    return columns.map((column, index) => index === 0 ? { ...column, href: column.href ?? rowHref } : column)
  }, [columns, rowHref])

  async function load(next = page, q = query.trim()) {
    setError("")
    setLoading(true)
    try {
      const search = q ? `&q=${encodeURIComponent(q)}` : ""
      const data = await api<Page<T> | T[]>(`${path}${path.includes("?") ? "&" : "?"}page=${next}&pageSize=${pageSize}${search}`)
      if (Array.isArray(data)) {
        const needle = q.toLowerCase()
        const list = needle ? data.filter((row) => JSON.stringify(row).toLowerCase().includes(needle)) : data
        setRows(list)
        setTotal(list.length)
      } else {
        setRows(data.items ?? [])
        setTotal(data.total ?? 0)
      }
    } catch (reason) {
      setRows([])
      setError(reason instanceof ApiError ? reason.message : t.error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const handle = window.setTimeout(() => { setPage(1); void load(1, query.trim()) }, query ? 300 : 0)
    return () => window.clearTimeout(handle)
  }, [path, query, pageSize])

  function openCreate() {
    setMode("create")
    setCurrent(undefined)
    setForm({ ...valuesFromRow(fields ?? []), ...createDefaults })
    setFiles({})
    setFormError("")
    setOpen(true)
  }

  function openEdit(row: T) {
    setMode("edit")
    setCurrent(row)
    const next = valuesFromRow(fields ?? [], row)
    if (image && typeof image === "string" && row[image]) {
      const preview = String(row[image])
      next.logoPreview = preview
      for (const field of fields ?? []) if (field.type === "file") next[`${field.name}Preview`] = preview
    }
    if (row.logoFileId) next.logoPreview = String(row.logoFileId)
    if (row.coverFileId) {
      for (const field of fields ?? []) if (field.type === "file" && field.name === "cover") next.coverPreview = String(row.coverFileId)
    }
    setForm(next)
    setFiles({})
    setFormError("")
    setOpen(true)
  }

  async function onSubmit() {
    if (!fields) return
    setFormError("")
    setBusy(true)
    try {
      const payload = buildPayload(fields, form, files, Boolean(multipart))
      if (submit) await submit({ payload, mode, row: current, files })
      else if (mode === "edit" && current?.id) {
        const target = `${path.replace(/\?.*$/, "")}/${current.id}`
        if (payload instanceof FormData) await api(target, { method: "PUT", body: payload })
        else await api(target, { method: "PUT", body: JSON.stringify(payload) })
      } else {
        const target = createPath ?? path
        if (payload instanceof FormData) await api(target, { method: "POST", body: payload })
        else await api(target, { method: "POST", body: JSON.stringify(payload) })
      }
      setOpen(false)
      toast.push(t.saved)
      await load()
    } catch (reason) {
      setFormError(reason instanceof ApiError ? reason.message : t.error)
    } finally {
      setBusy(false)
    }
  }

  async function onDelete() {
    if (!pending?.id) return
    setBusy(true)
    try {
      await api(`${path.replace(/\?.*$/, "")}/${pending.id}`, { method: "DELETE" })
      setPending(undefined)
      toast.push(t.deleted, "ok")
      await load()
    } catch (reason) {
      setPending(undefined)
      setError(reason instanceof ApiError ? reason.message : t.error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="directory crud">
      <PageHeader title={title} count={total} query={query} onQuery={setQuery} onAdd={onAdd ?? (fields ? openCreate : undefined)} />
      {error ? <p className="callout" role="alert">{error}</p> : null}
      <DataTable
        columns={linkedColumns}
        rows={rows}
        loading={loading}
        total={total}
        page={page}
        pageSize={pageSize}
        onPage={(next) => { setPage(next); void load(next) }}
        onAdd={onAdd ?? (fields ? openCreate : undefined)}
        onEdit={fields && update ? openEdit : undefined}
        onDelete={remove ? (row) => setPending(row) : undefined}
        image={image}
      />
      {fields ? (
        <FormModal
          open={open}
          title={formTitle ? formTitle(mode) : (mode === "edit" ? `${t.edit} — ${title}` : title)}
          onClose={() => setOpen(false)}
          onSubmit={onSubmit}
          busy={busy}
          error={formError}
        >
          <FormFields fields={fields} form={form} setForm={setForm} mode={mode} files={files} setFiles={setFiles} />
        </FormModal>
      ) : null}
      <ConfirmDialog open={Boolean(pending)} title={t.delete} onClose={() => setPending(undefined)} onConfirm={onDelete} busy={busy} />
      <span className="sr-only">{lang}</span>
    </section>
  )
}
