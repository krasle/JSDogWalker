import React, { useState, useEffect } from 'react'
import { apiFetch } from '../api.js'
import { fullName, fmtMoney } from '../utils.js'
import { toast } from '../Toast.jsx'

function statusBadge(s) {
  const cls = s === 'confirmed' ? 'blue' : s === 'completed' || s === 'paid' ? 'green' : s === 'cancelled' ? 'red' : 'orange'
  return <span className={'badge badge-' + cls}>{s}</span>
}

export default function Appointments() {
  const [appointments, setAppointments] = useState([])
  const [walkers, setWalkers] = useState([])
  const [customers, setCustomers] = useState([])
  const [dogs, setDogs] = useState([])
  const [slots, setSlots] = useState([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), slot: '', walkerId: '', customerId: '', dogIds: [], notes: '' })
  const [filteredDogs, setFilteredDogs] = useState([])

  async function load() {
    setLoading(true)
    try {
      const [a, w, c, d, s] = await Promise.all([
        apiFetch('/Appointments?$expand=walker,customer,dogs($expand=dog)&$orderby=date,timeSlot'),
        apiFetch('/Walkers?$orderby=firstName,lastName'),
        apiFetch('/Customers?$orderby=firstName,lastName'),
        apiFetch('/Dogs?$orderby=name'),
        apiFetch('/getValidSlots()'),
      ])
      setAppointments(a.value || [])
      setWalkers(w.value || [])
      setCustomers(c.value || [])
      setDogs(d.value || [])
      setSlots((s.value || []).map(x => typeof x === 'string' ? x : (x.slot || '')))
    } catch (e) { toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const lf = filter.toLowerCase()
  const filtered = appointments.filter(a =>
    !lf || [fullName(a.walker), fullName(a.customer), a.date, a.timeSlot, a.status].some(v => String(v || '').toLowerCase().includes(lf))
  )

  const stats = { scheduled: 0, confirmed: 0, cancelled: 0, completed: 0 }
  appointments.forEach(a => { if (a.status in stats) stats[a.status]++ })

  async function patchAppt(id, status) {
    try {
      await apiFetch('/Appointments/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
      toast('Appointment ' + status + '.')
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  function onCustomerChange(cid) {
    setForm(f => ({ ...f, customerId: cid, dogIds: [] }))
    setFilteredDogs(cid ? dogs.filter(d => d.owner_ID === cid) : [])
  }

  async function saveAppt() {
    const { date, slot, walkerId, customerId, dogIds, notes } = form
    if (!date || !slot || !walkerId || !customerId || !dogIds.length) return toast('Fill all fields and select ≥1 dog.', 'error')
    try {
      await apiFetch('/Appointments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, timeSlot: slot, walker_ID: walkerId, customer_ID: customerId, notes: notes || null, dogs: dogIds.map(id => ({ dog_ID: id })) })
      })
      setShowModal(false)
      toast('Appointment booked — confirmation auto-created!')
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  if (loading) return <div className="loading">Loading…</div>

  return (
    <>
      <div className="stats-row">
        {[['Total', appointments.length], ['Scheduled', stats.scheduled], ['Confirmed', stats.confirmed], ['Completed', stats.completed]].map(([lbl, num]) => (
          <div className="stat-card" key={lbl}><div className="num">{num}</div><div className="lbl">{lbl}</div></div>
        ))}
      </div>
      <div className="card">
        <div className="card-header">
          <h2>📋 Appointments</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="search-bar" placeholder="Search…" value={filter} onChange={e => setFilter(e.target.value)} />
            <button className="btn btn-primary" onClick={() => { setForm({ date: new Date().toISOString().slice(0, 10), slot: slots[0] || '', walkerId: '', customerId: '', dogIds: [], notes: '' }); setFilteredDogs([]); setShowModal(true) }}>+ Book</button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Time</th><th>Walker</th><th>Customer</th><th>Dogs</th><th>Fee</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={8} className="empty">No appointments found.</td></tr>}
              {filtered.map(a => {
                const dn = (a.dogs || []).map(ad => ad.dog ? ad.dog.name : '?').join(', ') || '—'
                return (
                  <tr key={a.ID}>
                    <td>{a.date}</td><td>{a.timeSlot}</td>
                    <td>{fullName(a.walker)}</td><td>{fullName(a.customer)}</td>
                    <td>{dn}</td><td>{fmtMoney(a.totalFee)}</td>
                    <td>{statusBadge(a.status)}</td>
                    <td>
                      {a.status === 'scheduled' && <button className="btn btn-sm btn-primary" onClick={() => patchAppt(a.ID, 'confirmed')}>Confirm</button>}
                      {a.status === 'confirmed' && <button className="btn btn-sm btn-success" onClick={() => patchAppt(a.ID, 'completed')}>✔ Complete</button>}
                      {a.status !== 'cancelled' && a.status !== 'completed' && <button className="btn btn-sm btn-danger" style={{ marginLeft: 4 }} onClick={() => { if (confirm('Cancel this appointment?')) patchAppt(a.ID, 'cancelled') }}>Cancel</button>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Book Appointment</h3>
            <div className="form-group"><label>Date</label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div className="form-group"><label>Time Slot</label>
              <select value={form.slot} onChange={e => setForm(f => ({ ...f, slot: e.target.value }))}>
                {slots.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Walker</label>
              <select value={form.walkerId} onChange={e => setForm(f => ({ ...f, walkerId: e.target.value }))}>
                <option value="">— Select —</option>
                {walkers.map(w => <option key={w.ID} value={w.ID}>{fullName(w)}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Customer</label>
              <select value={form.customerId} onChange={e => onCustomerChange(e.target.value)}>
                <option value="">— Select —</option>
                {customers.map(c => <option key={c.ID} value={c.ID}>{fullName(c)}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Dogs (Ctrl/Cmd = multi)</label>
              <select multiple size={5} style={{ height: 110, width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
                value={form.dogIds}
                onChange={e => setForm(f => ({ ...f, dogIds: Array.from(e.target.selectedOptions).map(o => o.value) }))}>
                {filteredDogs.length === 0 && <option disabled>Select a customer first</option>}
                {filteredDogs.map(d => <option key={d.ID} value={d.ID}>{d.name} ({d.breed || '?'})</option>)}
              </select>
            </div>
            <div className="form-group"><label>Notes</label><textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <div className="form-actions">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveAppt}>Book</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
