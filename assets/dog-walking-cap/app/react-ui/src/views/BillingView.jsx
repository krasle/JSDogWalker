import { useState, useEffect } from 'react'
import { getBillingRecords, updateBillingRecord, getAppointments, getCustomers, getWalkers } from '../api.js'
import { useToast } from '../Toast.jsx'

export default function BillingView() {
  const toast = useToast()
  const [records, setRecords] = useState([])
  const [appts, setAppts]     = useState([])
  const [customers, setCustomers] = useState([])
  const [walkers, setWalkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [saving, setSaving] = useState(null)

  function load() {
    let cancelled = false
    setLoading(true)
    Promise.all([
      getBillingRecords({ status: statusFilter || undefined }),
      getAppointments(),
      getCustomers(),
      getWalkers(),
    ]).then(([r, a, c, w]) => {
      if (cancelled) return
      setRecords(r); setAppts(a); setCustomers(c); setWalkers(w); setLoading(false)
    }).catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }
  useEffect(load, [statusFilter])

  async function markPaid(rec) {
    setSaving(rec.ID)
    try {
      await updateBillingRecord(rec.ID, { status: 'paid', paidAt: new Date().toISOString(), method: 'card' })
      toast('Marked as paid', 'success')
      load()
    } catch (e) { toast(e.message, 'error') }
    finally { setSaving(null) }
  }

  const apptMap    = Object.fromEntries(appts.map(a => [a.ID, a]))
  const custMap    = Object.fromEntries(customers.map(c => [c.ID, `${c.firstName} ${c.lastName}`]))
  const walkerMap  = Object.fromEntries(walkers.map(w => [w.ID, `${w.firstName} ${w.lastName}`]))

  // Server-side aggregation: count from actual records returned (which are already filtered server-side)
  const totalBilled  = records.reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const totalPaid    = records.filter(r => r.status === 'paid').reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const totalPending = records.filter(r => r.status === 'pending').reduce((s, r) => s + (Number(r.amount) || 0), 0)

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">💰 Billing</h2>
        <div className="toolbar">
          <select className="select input-sm" style={{ width: 140 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Records</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="waived">Waived</option>
          </select>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">${totalBilled.toFixed(2)}</div>
          <div className="stat-label">Total Billed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#166534' }}>${totalPaid.toFixed(2)}</div>
          <div className="stat-label">Paid</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#d97706' }}>${totalPending.toFixed(2)}</div>
          <div className="stat-label">Outstanding</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{records.length}</div>
          <div className="stat-label">Records Shown</div>
        </div>
      </div>

      <div className="card">
        {loading ? <div className="loading">Loading billing records...</div> : records.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">💰</div><div className="empty-msg">No billing records found</div></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Walker</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Issued</th>
                  <th>Paid At</th>
                  <th style={{ width: 90 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => {
                  const appt = apptMap[r.appointment_ID] || {}
                  return (
                    <tr key={r.ID}>
                      <td>{appt.date || '-'}</td>
                      <td>{custMap[appt.customer_ID] || '-'}</td>
                      <td>{walkerMap[appt.walker_ID] || '-'}</td>
                      <td><strong>${Number(r.amount).toFixed(2)}</strong></td>
                      <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                      <td style={{ fontSize: 12 }}>{r.issuedAt ? new Date(r.issuedAt).toLocaleDateString() : '-'}</td>
                      <td style={{ fontSize: 12 }}>{r.paidAt ? new Date(r.paidAt).toLocaleDateString() : '-'}</td>
                      <td>
                        {r.status === 'pending' && (
                          <button className="btn btn-primary btn-sm" onClick={() => markPaid(r)} disabled={saving === r.ID}>
                            {saving === r.ID ? '...' : 'Mark Paid'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
