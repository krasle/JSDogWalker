import React, { useState, useEffect } from 'react'
import { apiFetch } from '../api.js'
import { fullName, formatDate, fmtMoney } from '../utils.js'
import { toast } from '../Toast.jsx'

function statusBadge(s) {
  const cls = s === 'confirmed' ? 'blue' : s === 'completed' || s === 'paid' ? 'green' : s === 'cancelled' || s === 'waived' ? 'red' : 'orange'
  return <span className={'badge badge-' + cls}>{s}</span>
}

export default function Schedule() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [rows, setRows] = useState(null)
  const [loading, setLoading] = useState(false)

  async function load(d) {
    setLoading(true)
    try {
      const data = await apiFetch("/getDailySchedule(date='" + d + "')")
      setRows(data.value || [])
    } catch (e) {
      toast(e.message, 'error')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(date) }, [])

  function setToday() {
    const d = new Date().toISOString().slice(0, 10)
    setDate(d); load(d)
  }

  const byWalker = {}
  if (rows) rows.forEach(r => {
    const wk = ((r.walkerFirstName || '') + ' ' + (r.walkerLastName || '')).trim() || 'Unknown'
    if (!byWalker[wk]) byWalker[wk] = []
    byWalker[wk].push(r)
  })

  return (
    <div className="card">
      <div className="card-header">
        <h2>📅 Daily Schedule</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={setToday}>Today</button>
          <input type="date" className="search-bar" style={{ width: 160 }} value={date}
            onChange={e => setDate(e.target.value)} />
          <button className="btn btn-primary" onClick={() => load(date)}>Load</button>
          <button className="btn btn-ghost" onClick={() => window.print()}>🖨 Print</button>
        </div>
      </div>
      <div id="sched-body">
        {loading && <div className="loading">Loading…</div>}
        {!loading && rows && rows.length === 0 && <div className="empty">No appointments for {formatDate(date)}.</div>}
        {!loading && rows && Object.keys(byWalker).map(walker => (
          <div key={walker}>
            <h3 style={{ margin: '16px 0 8px', color: 'var(--primary)' }}>🚶 {walker}</h3>
            {byWalker[walker].map((a, i) => {
              const cName = ((a.customerFirstName || '') + ' ' + (a.customerLastName || '')).trim()
              return (
                <div className="schedule-card" key={i}>
                  <div className="schedule-time">{a.timeSlot || ''}</div>
                  <div className="schedule-info">
                    <strong>{cName} – {a.dogNames || '(no dogs)'}</strong>
                    <div className="meta">Fee: {fmtMoney(a.totalFee)}  {statusBadge(a.status)}</div>
                    {(a.pickupStreet || a.pickupCity) && <div className="addr">📍 Pickup: {a.pickupStreet || ''}{a.pickupCity ? ', ' + a.pickupCity : ''}</div>}
                    {(a.dropoffStreet || a.dropoffCity) && (a.dropoffStreet !== a.pickupStreet || a.dropoffCity !== a.pickupCity) &&
                      <div className="addr">🏁 Drop-off: {a.dropoffStreet || ''}{a.dropoffCity ? ', ' + a.dropoffCity : ''}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
