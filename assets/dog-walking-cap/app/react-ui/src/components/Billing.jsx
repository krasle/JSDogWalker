import React, { useState, useEffect } from 'react'
import { apiFetch } from '../api.js'
import { fullName, formatDateTime, fmtMoney } from '../utils.js'
import { toast } from '../Toast.jsx'

function statusBadge(s) {
  const cls = s === 'paid' ? 'green' : s === 'waived' ? 'red' : 'orange'
  return <span className={'badge badge-' + cls}>{s}</span>
}

export default function Billing() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const r = await apiFetch('/BillingRecords?$expand=appointment($expand=customer,walker)&$orderby=issuedAt desc')
      setRecords(r.value || [])
    } catch (e) { toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function markPaid(id) {
    try {
      await apiFetch('/BillingRecords/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'paid' }) })
      toast('Marked as paid!'); load()
    } catch (e) { toast(e.message, 'error') }
  }

  if (loading) return <div className="loading">Loading…</div>

  let ta = 0, pa = 0
  records.forEach(r => { ta += (r.amount || 0); if (r.status === 'paid') pa += (r.amount || 0) })

  return (
    <>
      <div className="stats-row">
        {[['Invoices', records.length], ['Total Billed', fmtMoney(ta)], ['Collected', fmtMoney(pa)], ['Outstanding', fmtMoney(ta - pa)]].map(([lbl, num]) => (
          <div className="stat-card" key={lbl}><div className="num">{num}</div><div className="lbl">{lbl}</div></div>
        ))}
      </div>
      <div className="card">
        <div className="card-header"><h2>💰 Billing Records</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Issued</th><th>Customer</th><th>Walker</th><th>Amount</th><th>Status</th><th>Method</th><th>Actions</th></tr></thead>
            <tbody>
              {records.length === 0 && <tr><td colSpan={7} className="empty">No records.</td></tr>}
              {records.map(r => (
                <tr key={r.ID}>
                  <td>{formatDateTime(r.issuedAt)}</td>
                  <td>{fullName(r.appointment && r.appointment.customer) || '—'}</td>
                  <td>{fullName(r.appointment && r.appointment.walker) || '—'}</td>
                  <td><strong>{fmtMoney(r.amount)}</strong></td>
                  <td>{statusBadge(r.status)}</td>
                  <td>{r.method || '—'}</td>
                  <td>{r.status !== 'paid' && <button className="btn btn-sm btn-primary" onClick={() => markPaid(r.ID)}>Mark Paid</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
