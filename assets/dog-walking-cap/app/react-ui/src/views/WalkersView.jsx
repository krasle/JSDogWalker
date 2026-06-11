import { useState, useEffect } from 'react'
import { getWalkers, createWalker, updateWalker, deleteWalker } from '../api.js'
import { useToast } from '../Toast.jsx'
import Modal from '../Modal.jsx'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const EMPTY = { firstName: '', lastName: '', phone: '', email: '', isActive: true }

export default function WalkersView() {
  const toast = useToast()
  const [walkers, setWalkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modal, setModal] = useState(null) // null | {mode:'create'|'edit', data}
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY)

  function load() {
    let cancelled = false
    setLoading(true)
    getWalkers()
      .then(v => { if (!cancelled) { setWalkers(v); setLoading(false) } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false) } })
    return () => { cancelled = true }
  }
  useEffect(load, [])

  function openCreate() { setForm(EMPTY); setModal({ mode: 'create' }) }
  function openEdit(w) { setForm({ firstName: w.firstName, lastName: w.lastName, phone: w.phone || '', email: w.email || '', isActive: w.isActive ?? true }); setModal({ mode: 'edit', id: w.ID }) }

  async function handleSave() {
    if (!form.firstName.trim() || !form.lastName.trim()) { toast('First and last name are required', 'error'); return }
    setSaving(true)
    try {
      if (modal.mode === 'create') {
        await createWalker(form)
        toast('Walker created', 'success')
      } else {
        await updateWalker(modal.id, form)
        toast('Walker updated', 'success')
      }
      setModal(null)
      load()
    } catch (e) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete(w) {
    if (!confirm(`Delete walker ${w.firstName} ${w.lastName}?`)) return
    try {
      await deleteWalker(w.ID)
      toast('Walker deleted', 'success')
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  const f = form
  const set = k => e => setForm(prev => ({ ...prev, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">🚶 Walkers</h2>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Walker</button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="card">
        {loading ? <div className="loading">Loading walkers...</div> : walkers.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🚶</div><div className="empty-msg">No walkers found</div></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th style={{ width: 100 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {walkers.map(w => (
                  <tr key={w.ID}>
                    <td><strong>{w.firstName} {w.lastName}</strong></td>
                    <td>{w.phone || '-'}</td>
                    <td>{w.email || '-'}</td>
                    <td><span className={`badge ${w.isActive ? 'badge-confirmed' : 'badge-cancelled'}`}>{w.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div className="td-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(w)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(w)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <Modal
          title={modal.mode === 'create' ? 'Add Walker' : 'Edit Walker'}
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </>
          }
        >
          <div className="form-grid">
            <div className="form-field">
              <label>First Name *</label>
              <input className="input" value={f.firstName} onChange={set('firstName')} placeholder="First name" />
            </div>
            <div className="form-field">
              <label>Last Name *</label>
              <input className="input" value={f.lastName} onChange={set('lastName')} placeholder="Last name" />
            </div>
            <div className="form-field">
              <label>Phone</label>
              <input className="input" value={f.phone} onChange={set('phone')} placeholder="555-0100" />
            </div>
            <div className="form-field">
              <label>Email</label>
              <input className="input" type="email" value={f.email} onChange={set('email')} placeholder="name@example.com" />
            </div>
            <div className="form-field">
              <label>
                <input type="checkbox" checked={f.isActive} onChange={set('isActive')} style={{ marginRight: 6 }} />
                Active
              </label>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
