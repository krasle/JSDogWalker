import React, { useState, useEffect } from 'react'
import { apiFetch } from '../api.js'
import { fullName, dayName } from '../utils.js'
import { toast } from '../Toast.jsx'

export default function Walkers() {
  const [walkers, setWalkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | walker object | {}

  async function load() {
    setLoading(true)
    try {
      const r = await apiFetch('/Walkers?$expand=availability&$orderby=firstName,lastName')
      setWalkers(r.value || [])
    } catch (e) { toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  if (loading) return <div className="loading">Loading…</div>

  return (
    <>
      <div className="card">
        <div className="card-header">
          <h2>🚶 Walkers ({walkers.length})</h2>
          <button className="btn btn-primary" onClick={() => setModal({ firstName: '', lastName: '', phone: '', email: '', bio: '', isActive: true, availability: [] })}>+ Add Walker</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Active</th><th>Availability</th><th>Actions</th></tr></thead>
            <tbody>
              {walkers.length === 0 && <tr><td colSpan={6} className="empty">No walkers.</td></tr>}
              {walkers.map(w => {
                const avail = (w.availability || []).sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                  .map(a => dayName(a.dayOfWeek) + ' ' + a.startTime + '–' + a.endTime).join(', ') || '—'
                return (
                  <tr key={w.ID}>
                    <td><strong>{fullName(w)}</strong></td>
                    <td>{w.phone || '—'}</td><td>{w.email || '—'}</td>
                    <td>{w.isActive ? <span className="badge badge-green">Active</span> : <span className="badge badge-gray">Inactive</span>}</td>
                    <td><small>{avail}</small></td>
                    <td><button className="btn btn-sm btn-ghost" onClick={() => setModal(JSON.parse(JSON.stringify(w)))}>Edit</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal && <WalkerModal walker={modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }} />}
    </>
  )
}

function WalkerModal({ walker, onClose, onSaved }) {
  const isNew = !walker.ID
  const [form, setForm] = useState({ firstName: walker.firstName || '', lastName: walker.lastName || '', phone: walker.phone || '', email: walker.email || '', bio: walker.bio || '', isActive: walker.isActive !== false })
  const [avail, setAvail] = useState(JSON.parse(JSON.stringify(walker.availability || [])))

  async function save() {
    if (!form.firstName || !form.lastName) return toast('First and last name required', 'error')
    const body = { ...form, phone: form.phone || null, email: form.email || null, bio: form.bio || null }
    try {
      let wid = walker.ID
      if (!isNew) {
        await apiFetch('/Walkers/' + walker.ID, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        toast('Walker updated!')
      } else {
        const cr = await apiFetch('/Walkers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        wid = cr.ID; toast('Walker added!')
      }
      if (wid) {
        if (!isNew) {
          const ex = await apiFetch('/WalkerAvailability?$filter=walker_ID eq ' + wid)
          for (const av of (ex.value || [])) await apiFetch('/WalkerAvailability/' + av.ID, { method: 'DELETE' })
        }
        for (const av of avail) {
          await apiFetch('/WalkerAvailability', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ walker_ID: wid, dayOfWeek: av.dayOfWeek, startTime: av.startTime, endTime: av.endTime }) })
        }
      }
      onSaved()
    } catch (e) { toast(e.message, 'error') }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>{isNew ? 'Add Walker' : 'Edit Walker'}</h3>
        <div className="form-row">
          <div className="form-group"><label>First Name *</label><input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} /></div>
          <div className="form-group"><label>Last Name *</label><input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Phone</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
        </div>
        <div className="form-group"><label>Bio</label><textarea rows={2} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} /></div>
        <div className="form-group"><label>Active</label>
          <select value={form.isActive ? 'true' : 'false'} onChange={e => setForm(f => ({ ...f, isActive: e.target.value === 'true' }))}>
            <option value="true">Yes</option><option value="false">No</option>
          </select>
        </div>
        <div className="sub-section">
          <h4>📅 Availability Slots</h4>
          {avail.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '.85rem', marginBottom: 6 }}>No slots set.</div>}
          {avail.map((av, i) => (
            <div className="avail-row" key={i}>
              <select value={av.dayOfWeek} onChange={e => setAvail(a => a.map((x, j) => j === i ? { ...x, dayOfWeek: parseInt(e.target.value) } : x))}>
                {[1, 2, 3, 4, 5, 6, 7].map(d => <option key={d} value={d}>{dayName(d)}</option>)}
              </select>
              <input type="time" value={av.startTime || '07:00'} onChange={e => setAvail(a => a.map((x, j) => j === i ? { ...x, startTime: e.target.value } : x))} />
              <span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>to</span>
              <input type="time" value={av.endTime || '12:00'} onChange={e => setAvail(a => a.map((x, j) => j === i ? { ...x, endTime: e.target.value } : x))} />
              <button className="btn btn-sm btn-danger" onClick={() => setAvail(a => a.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 6 }} onClick={() => setAvail(a => [...a, { dayOfWeek: 1, startTime: '07:00', endTime: '12:00' }])}>+ Add Slot</button>
        </div>
        <div className="form-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  )
}
