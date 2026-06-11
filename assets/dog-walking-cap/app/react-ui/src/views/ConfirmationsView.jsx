import { useState, useEffect } from 'react'
import { getConfirmations, createConfirmation, getAppointments, getWalkers, getCustomers } from '../api.js'
import { useToast } from '../Toast.jsx'
import Modal from '../Modal.jsx'

export default function ConfirmationsView() {
  const toast = useToast()
  const [confirmations, setConfirmations] = useState([])
  const [unconfirmed, setUnconfirmed]     = useState([])
  const [walkers, setWalkers]             = useState([])
  const [customers, setCustomers]         = useState([])
  const [loading, setLoading]             = useState(true)
  const [modal, setModal]                 = useState(null)
  const [form, setForm]                   = useState({ appointment_ID: '', confirmedBy: '', method: 'email', notes: '' })
  const [saving, setSaving]               = useState(false)

  function load() {
    let cancelled = false
    setLoading(true)
    Promise.all([
      getConfirmations(),
      getAppointments({ status: 'scheduled' }),
      getWalkers(),
      getCustomers(),
    ]).then(([confs, appts, w, c]) => {
      if (cancelled) return
      setConfirmations(confs)
      // Confirmed appointment IDs
      const confirmedIds = new Set(confs.map(c => c.appointment_ID))
      setUnconfirmed(appts.filter(a => !confirmedIds.has(a.ID)))
      setWalkers(w)
      setCustomers(c)
      setLoading(false)
    }).catch(e => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }
  useEffect(load, [])

  async function handleConfirm() {
    if (!form.appointment_ID) { toast('Select an appointment', 'error'); return }
    if (!form.confirmedBy.trim()) { toast('Confirmed by is required', 'error'); return }
    setSaving(true)
    try {
      await createConfirmation({ ...form, confirmedAt: new Date().toISOString() })
      // Also update appointment status to confirmed
      const { updateAppointment } = await import('../api.js')
      await updateAppointment(form.appointment_ID, { status: 'confirmed' })
      toast('Appointment confirmed', 'success')
      setModal(null)
      load()
    } catch (e) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const walkerMap = Object.fromEntries(walkers.map(w => [w.ID, `${w.firstName} ${w.lastName}`]))
  const custMap   = Object.fromEntries(customers.map(c => [c.ID, `${c.firstName} ${c.lastName}`]))
  const set = k => e => setForm(prev => ({ ...prev, [k]: e.target.value }))

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">✅ Confirmations</h2>
        <button className="btn btn-primary" onClick={() => { setForm({ appointment_ID: '', confirmedBy: '', method: 'email', notes: '' }); setModal(true) }}>+ Confirm Appointment</button>
      </div>

      {/* Unconfirmed queue */}
      {unconfirmed.length > 0 && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid var(--status-scheduled)' }}>
          <div className="card-header">
            <span className="card-title">⏳ Awaiting Confirmation ({unconfirmed.length})</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Time</th><th>Walker</th><th>Customer</th><th>Fee</th><th></th></tr></thead>
              <tbody>
                {unconfirmed.slice(0, 10).map(a => (
                  <tr key={a.ID}>
                    <td>{a.date}</td>
                    <td>{a.timeSlot}</td>
                    <td>{walkerMap[a.walker_ID] || '-'}</td>
                    <td>{custMap[a.customer_ID] || '-'}</td>
                    <td>${a.totalFee || 30}</td>
                    <td>
                      <button className="btn btn-primary btn-sm" onClick={() => {
                        setForm({ appointment_ID: a.ID, confirmedBy: custMap[a.customer_ID] || '', method: 'email', notes: '' })
                        setModal(true)
                      }}>Confirm</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation log */}
      <div className="card">
        <div className="card-header"><span className="card-title">Confirmation Log</span></div>
        {loading ? <div className="loading">Loading...</div> : confirmations.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">✅</div><div className="empty-msg">No confirmations yet</div></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Appointment ID</th><th>Confirmed At</th><th>Confirmed By</th><th>Method</th><th>Notes</th></tr></thead>
              <tbody>
                {confirmations.map(c => (
                  <tr key={c.ID}>
                    <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{c.appointment_ID?.slice(0,8)}...</td>
                    <td>{c.confirmedAt ? new Date(c.confirmedAt).toLocaleString() : '-'}</td>
                    <td>{c.confirmedBy}</td>
                    <td><span className="badge badge-confirmed">{c.method}</span></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{c.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <Modal title="Confirm Appointment" onClose={() => setModal(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={handleConfirm} disabled={saving}>{saving ? 'Saving...' : 'Confirm'}</button></>}>
          <div className="form-grid">
            <div className="form-field form-full"><label>Appointment *</label>
              <select className="select" value={form.appointment_ID} onChange={set('appointment_ID')}>
                <option value="">Select appointment...</option>
                {unconfirmed.map(a => <option key={a.ID} value={a.ID}>{a.date} {a.timeSlot} - {custMap[a.customer_ID] || 'Unknown'}</option>)}
              </select>
            </div>
            <div className="form-field"><label>Confirmed By *</label><input className="input" value={form.confirmedBy} onChange={set('confirmedBy')} /></div>
            <div className="form-field"><label>Method</label>
              <select className="select" value={form.method} onChange={set('method')}>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="phone">Phone</option>
              </select>
            </div>
            <div className="form-field form-full"><label>Notes</label><textarea className="textarea" value={form.notes} onChange={set('notes')} /></div>
          </div>
        </Modal>
      )}
    </div>
  )
}
