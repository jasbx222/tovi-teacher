const base = import.meta.env.VITE_API_URL ?? ""

export type SessionUser = {
  id: string
  ownerId: string
  portal: string
  type: string
  name: string
  phone: string
  instituteName?: string
  permissions: string[]
  subscriptionEndsAt?: string | null
  approved?: boolean
}

export class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

/** Files from the API come back as `/api/files/...`; this makes them loadable. */
export function mediaUrl(path?: string | null) {
  if (!path) return ""
  return /^https?:/.test(path) ? path : `${base}${path}`
}

export async function upload<T = unknown>(path: string, field: string, file: File): Promise<T> {
  const body = new FormData()
  body.append(field, file)
  return api<T>(path, { method: "POST", body })
}

export function token() {
  return localStorage.getItem("tovi-token") ?? ""
}

export function setToken(value: string) {
  if (value) localStorage.setItem("tovi-token", value)
  else localStorage.removeItem("tovi-token")
}

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (token()) headers.set("Authorization", `Bearer ${token()}`)
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json")
  const response = await fetch(`${base}${path}`, { ...init, headers })
  if (response.status === 204) return undefined as T
  const text = await response.text()
  const data = text ? JSON.parse(text) : null
  if (!response.ok) throw new ApiError(response.status, data?.error ?? "error", data?.message ?? "Request failed")
  return data as T
}

export async function download(path: string, filename: string) {
  const response = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${token()}` } })
  if (!response.ok) throw new ApiError(response.status, "export_failed", "Export failed")
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
