import React, { useState, useEffect } from 'react'
import { apiFetch } from '../api.js'
import { fullName, formatDate, formatDateTime } from '../utils.js'
import { toast } from '../Toast.jsx'

export default function Confirmations() {
  const [confs, setConfs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/Confirmations?$expand=appointment($expand=customer,walker)&$orderby=confirmedAt desc')
      .then(r => setConfs(r.value || []))
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading">Loading…</div>

  return (
    <div className="card">
      <div className="card-header"><h2>✅ Confirmations ({confs.length})</h2></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Conf #</th><th>Confirmed At</th><th>Customer</th><th>Walker</th><th>Appt Date</th><th>Method</th><th>Status</th></tr></thead>
          <tbody>
            {confs.length === 0 && <tr><td colSpan={7} className="empty">No confirmations yet.</td></tr>}
            {confs.map(c => (
              <tr key={c.ID}>
                <td className="conf-num">{c.ID ? c.ID.slice(0, 8).toUpperCase() : ''}</td>
                <td>{formatDateTime(c.confirmedAt)}</td>
                <td>{fullName(c.appointment && c.appointment.customer) || '—'}</td>
                <td>{fullName(c.appointment && c.appointment.walker) || '—'}</td>
                <td>{formatDate(c.appointment && c.appointment.date)}</td>
                <td><span className="badge badge-gray">{c.method || 'email'}</span></td>
                <td><span className="badge badge-green">Confirmed</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
