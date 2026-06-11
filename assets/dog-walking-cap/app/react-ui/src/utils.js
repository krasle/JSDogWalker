export function fullName(o) { return o ? ((o.firstName || '') + ' ' + (o.lastName || '')).trim() : '' }
export function formatDate(d) {
  if (!d) return '—'
  return new Date(d + (d.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}
export function formatDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
export function fmtMoney(v) { return v != null ? '$' + Number(v).toFixed(2) : '—' }
export function dayName(n) { return ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][n] || n }
