const API = '/api'

export async function apiFetch(path, opts) {
  const res = await fetch(API + path, opts || {})
  if (!res.ok) {
    const b = await res.json().catch(() => ({}))
    throw new Error((b.error && b.error.message) || b.message || res.statusText)
  }
  const t = await res.text()
  return t ? JSON.parse(t) : {}
}
