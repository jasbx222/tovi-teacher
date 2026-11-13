import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react"
import { api, ApiError } from "./api"
import { useI18n } from "./i18n"

export type LookupRow = Record<string, unknown>

export type LookupConfig = {
  path: string
  queryParam?: string | false
  labelOf: (row: LookupRow) => string
  hintOf?: (row: LookupRow) => string
  filter?: (row: LookupRow) => boolean
  pageSize?: number
  placeholder?: string
  searchHint?: string
}

type Page<T> = { items: T[]; page: number; pageSize: number; total: number }

export function rowId(row: LookupRow) {
  return String(row.id ?? "")
}

export async function fetchLookupPage(path: string, page: number, pageSize: number, query?: string, queryParam: string | false = "q"): Promise<Page<LookupRow>> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (query && queryParam) params.set(queryParam, query)
  const sep = path.includes("?") ? "&" : "?"
  const data = await api<Page<LookupRow> | LookupRow[]>(`${path}${sep}${params}`)
  if (Array.isArray(data)) return { items: data, page: 1, pageSize: data.length, total: data.length }
  return { items: data.items ?? [], page: data.page ?? page, pageSize: data.pageSize ?? pageSize, total: data.total ?? 0 }
}

export function useLookupLabels(path: string, labelOf: (row: LookupRow) => string, filter?: (row: LookupRow) => boolean) {
  const [labels, setLabels] = useState<Record<string, string>>({})
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const next: Record<string, string> = {}
      let page = 1
      const pageSize = 100
      for (;;) {
        const data = await fetchLookupPage(path, page, pageSize)
        for (const row of data.items) {
          if (filter && !filter(row)) continue
          const id = rowId(row)
          if (id) next[id] = labelOf(row)
        }
        if (data.items.length < pageSize || page * pageSize >= data.total || page >= 20) break
        page += 1
      }
      if (!cancelled) { setLabels(next); setReady(true) }
    })().catch(() => { if (!cancelled) setReady(true) })
    return () => { cancelled = true }
  }, [path])
  return (value: unknown) => {
    if (value == null || value === "") return "—"
    const key = String(value)
    if (labels[key]) return labels[key]
    return ready ? "—" : "…"
  }
}

function initials(label: string) {
  const parts = label.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "•"
  if (parts.length === 1) return parts[0].slice(0, 2)
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`
}

export function LookupSelect({
  value, onChange, lookup, required, label,
}: {
  value: string
  onChange: (value: string) => void
  lookup: LookupConfig
  required?: boolean
  label: string
}) {
  const { lang, t } = useI18n()
  const listId = useId()
  const root = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [debounced, setDebounced] = useState("")
  const [items, setItems] = useState<LookupRow[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [picked, setPicked] = useState<LookupRow | null>(null)
  const [active, setActive] = useState(0)
  const pageSize = lookup.pageSize ?? 20
  const serverSearch = lookup.queryParam !== false

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(query.trim()), 250)
    return () => window.clearTimeout(handle)
  }, [query])

  useEffect(() => {
    if (!value) { setPicked(null); return }
    if (picked && rowId(picked) === value) return
    const found = items.find((row) => rowId(row) === value)
    if (found) setPicked(found)
  }, [value, items, picked])

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [open])

  useEffect(() => {
    if (open) {
      setQuery("")
      setDebounced("")
      window.setTimeout(() => searchRef.current?.focus(), 20)
    }
  }, [open])

  useEffect(() => {
    let cancelled = false
    if (!open && !value) return
    setLoading(true)
    setError("")
    const q = serverSearch ? debounced : ""
    fetchLookupPage(lookup.path, 1, pageSize, q || undefined, lookup.queryParam)
      .then((data) => {
        if (cancelled) return
        const rows = lookup.filter ? data.items.filter(lookup.filter) : data.items
        setItems(rows)
        setPage(1)
        setTotal(data.total)
        setActive(0)
      })
      .catch((reason) => {
        if (cancelled) return
        setItems([])
        setError(reason instanceof ApiError ? reason.message : t.error)
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, debounced, lookup.path, pageSize, serverSearch])

  const visible = useMemo(() => {
    if (serverSearch || !debounced) return items
    const needle = debounced.toLowerCase()
    return items.filter((row) => {
      const text = `${lookup.labelOf(row)} ${lookup.hintOf?.(row) ?? ""}`.toLowerCase()
      return text.includes(needle)
    })
  }, [items, debounced, serverSearch, lookup])

  const chosen = picked && rowId(picked) === value ? picked : items.find((row) => rowId(row) === value)
  const chosenLabel = chosen ? lookup.labelOf(chosen) : ""
  const chosenHint = chosen && lookup.hintOf ? lookup.hintOf(chosen) : ""
  const hasMore = serverSearch && items.length < total && !lookup.filter

  async function loadMore() {
    if (loading || !hasMore) return
    setLoading(true)
    try {
      const data = await fetchLookupPage(lookup.path, page + 1, pageSize, debounced || undefined, lookup.queryParam)
      setItems((current) => {
        const seen = new Set(current.map(rowId))
        return [...current, ...data.items.filter((row) => !seen.has(rowId(row)))]
      })
      setPage(page + 1)
      setTotal(data.total)
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : t.error)
    } finally {
      setLoading(false)
    }
  }

  function pick(row: LookupRow) {
    setPicked(row)
    onChange(rowId(row))
    setOpen(false)
  }

  function onKey(event: KeyboardEvent) {
    if (!open) {
      if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        event.preventDefault()
        setOpen(true)
      }
      return
    }
    if (event.key === "Escape") { event.preventDefault(); setOpen(false); return }
    if (event.key === "ArrowDown") { event.preventDefault(); setActive((index) => Math.min(index + 1, Math.max(0, visible.length - 1))); return }
    if (event.key === "ArrowUp") { event.preventDefault(); setActive((index) => Math.max(index - 1, 0)); return }
    if (event.key === "Enter") {
      event.preventDefault()
      const row = visible[active]
      if (row) pick(row)
    }
  }

  return (
    <div className="lookup field floating" ref={root}>
      <span className="lookup-label">{label}{required ? " *" : ""}</span>
      <input type="hidden" value={value} required={required} readOnly />
      <button
        type="button"
        className={value ? "lookup-trigger filled" : "lookup-trigger"}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((next) => !next)}
        onKeyDown={onKey}
      >
        {chosenLabel ? (
          <>
            <i className="lookup-avatar" aria-hidden="true">{initials(chosenLabel)}</i>
            <span className="lookup-copy">
              <strong>{chosenLabel}</strong>
              {chosenHint ? <small>{chosenHint}</small> : null}
            </span>
          </>
        ) : (
          <span className="lookup-placeholder">{lookup.placeholder ?? (lang === "ar" ? "اختر" : "Choose")}</span>
        )}
        <i className="lookup-caret" aria-hidden="true" />
      </button>
      {open ? (
        <div className="lookup-panel">
          <input
            ref={searchRef}
            className="lookup-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKey}
            placeholder={lookup.searchHint ?? (lang === "ar" ? "ابحث…" : "Search…")}
            aria-label={lookup.searchHint ?? t.search}
          />
          {error ? <p className="lookup-empty" role="alert">{error}</p> : null}
          <ul id={listId} className="lookup-list" role="listbox">
            {visible.map((row, index) => {
              const id = rowId(row)
              const text = lookup.labelOf(row)
              const hint = lookup.hintOf?.(row)
              const selected = id === value
              return (
                <li key={id || index}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={`lookup-option${selected || index === active ? " active" : ""}`}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => pick(row)}
                  >
                    <i className="lookup-avatar" aria-hidden="true">{initials(text)}</i>
                    <span className="lookup-copy">
                      <strong>{text}</strong>
                      {hint ? <small>{hint}</small> : null}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          {loading ? <p className="lookup-empty">{t.loading}</p> : null}
          {!loading && visible.length === 0 ? <p className="lookup-empty">{t.noResults}</p> : null}
          {hasMore && !loading ? (
            <button type="button" className="lookup-more ghost" onClick={() => void loadMore()}>
              {lang === "ar" ? "المزيد" : "Load more"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function catalogLookup(path: string, lang: string, noun: { ar: string; en: string }): LookupConfig {
  return {
    path,
    queryParam: false,
    labelOf: (row) => String(row.name ?? ""),
    placeholder: lang === "ar" ? `اختر ${noun.ar}` : `Choose a ${noun.en}`,
    searchHint: lang === "ar" ? `ابحث عن ${noun.ar}` : `Search ${noun.en}s`,
    pageSize: 100,
  }
}

export function personLookup(path: string, lang: string, noun: { ar: string; en: string }): LookupConfig {
  return {
    path,
    labelOf: (row) => [row.firstName, row.lastName, row.instituteName].filter(Boolean).join(" ").trim() || String(row.phone ?? ""),
    hintOf: (row) => String(row.phone ?? ""),
    placeholder: lang === "ar" ? `اختر ${noun.ar}` : `Choose a ${noun.en}`,
    searchHint: lang === "ar" ? `ابحث بالاسم أو الهاتف` : "Search by name or phone",
    pageSize: 20,
  }
}

export async function saveCourse(base: string, payload: Record<string, unknown>, files: Record<string, File | null>, mode: "create" | "edit", row?: { id?: unknown }) {
  const body = { ...payload }
  delete body.cover
  const id = row?.id
  const path = mode === "edit" && id ? `${base}/courses/${id}` : `${base}/courses`
  const course = await api<{ id: string }>(path, { method: mode === "edit" && id ? "PUT" : "POST", body: JSON.stringify(body) })
  const cover = files.cover
  const courseId = course?.id ?? id
  if (cover && courseId) {
    const data = new FormData()
    data.append("cover", cover)
    await api(`${base}/courses/${courseId}/cover`, { method: "POST", body: data })
  }
}
