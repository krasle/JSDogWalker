import { useState, useEffect } from 'react'
import { getDogs, createDog, updateDog, deleteDog, getCustomers } from '../api.js'
import { useToast } from '../Toast.jsx'
import Modal from '../Modal.jsx'

const EMPTY = { name: '', breed: '', weight: '', color: '', dateOfBirth: '', licenseNo: '', notes: '', owner_ID: '' }

export default function DogsView() {
  const toast = useToast()
  const [dogs, setDogs] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterOwner, setFilterOwner] = useState('')
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY)

  useEffect(() => {
    let cancelled = false
    getCustomers().then(v => { if (!cancelled) setCustomers(v) }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  function load() {
    let cancelled = false
    setLoading(true)
    getDogs(filterOwner || null)
      .then(v => { if (!cancelled) { setDogs(v); setLoading(false) } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false) } })
    return () => { cancelled = true }
  }
  useEffect(load, [filterOwner])

  function openCreate() { setForm(EMPTY); setModal({ mode: 'create' }) }
  function openEdit(d) {
    setForm({ name: d.name, breed: d.breed || '', weight: d.weight != null ? String(d.weight) : '', color: d.color || '', dateOfBirth: d.dateOfBirth || '', licenseNo: d.licenseNo || '', notes: d.notes || '', owner_ID: d.owner_ID || '' })
    setModal({ mode: 'edit', id: d.ID })
  }

  async function handleSave() {
    if (!form.name.trim()) { toast('Dog name is required', 'error'); return }
    if (!form.owner_ID) { toast('Owner is required', 'error'); return }
    const payload = { ...form, weight: form.weight ? parseFloat(form.weight.replace(',', '.')) : null }
    if (form.weight && isNaN(payload.weight)) { toast('Weight must be a number', 'error'); return }
    setSaving(true)
    try {
      if (modal.mode === 'create') { await createDog(payload); toast('Dog created', 'success') }
      else { await updateDog(modal.id, payload); toast('Dog updated', 'success') }
      setModal(null); load()
    } catch (e) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete(d) {
    if (!confirm(`Delete dog ${d.name}?`)) return
    try { await deleteDog(d.ID); toast('Dog deleted', 'success'); load() }
    catch (e) { toast(e.message, 'error') }
  }

  const set = k => e => setForm(prev => ({ ...prev, [k]: e.target.value }))
  const custMap = Object.fromEntries(customers.map(c => [c.ID, `${c.firstName} ${c.lastName}`]))

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">🐕 Dogs</h2>
        <div className="toolbar">
          <select className="select input-sm" style={{ width: 180 }} value={filterOwner} onChange={e => setFilterOwner(e.target.value)}>
            <option value="">All Customers</option>
            {customers.map(c => <option key={c.ID} value={c.ID}>{c.firstName} {c.lastName}</option>)}
          </select>
          <button className="btn btn-primary" onClick={openCreate}>+ Add Dog</button>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="card">
        {loading ? <div className="loading">Loading dogs...</div> : dogs.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🐕</div><div className="empty-msg">No dogs found</div></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Owner</th>
                  <th>Breed</th>
                  <th>Color</th>
                  <th>Weight</th>
                  <th>License</th>
                  <th style={{ width: 100 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dogs.map(d => (
                  <tr key={d.ID}>
                    <td><strong>{d.name}</strong></td>
                    <td>{custMap[d.owner_ID] || d.owner_ID}</td>
                    <td>{d.breed || '-'}</td>
                    <td>{d.color || '-'}</td>
                    <td>{d.weight != null ? `${d.weight} kg` : '-'}</td>
                    <td>{d.licenseNo || '-'}</td>
                    <td>
                      <div className="td-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(d)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(d)}>Del</button>
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
        <Modal title={modal.mode === 'create' ? 'Add Dog' : 'Edit Dog'} onClose={() => setModal(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button></>}>
          <div className="form-grid">
            <div className="form-field"><label>Owner *</label>
              <select className="select" value={form.owner_ID} onChange={set('owner_ID')}>
                <option value="">Select owner...</option>
                {customers.map(c => <option key={c.ID} value={c.ID}>{c.firstName} {c.lastName}</option>)}
              </select>
            </div>
            <div className="form-field"><label>Name *</label><input className="input" value={form.name} onChange={set('name')} /></div>
            <div className="form-field"><label>Breed</label><input className="input" value={form.breed} onChange={set('breed')} /></div>
            <div className="form-field"><label>Color</label><input className="input" value={form.color} onChange={set('color')} /></div>
            <div className="form-field"><label>Weight (kg)</label><input className="input" inputMode="decimal" value={form.weight} onChange={set('weight')} placeholder="e.g. 12.5" /></div>
            <div className="form-field"><label>Date of Birth</label><input className="input" type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} /></div>
            <div className="form-field"><label>License No.</label><input className="input" value={form.licenseNo} onChange={set('licenseNo')} /></div>
            <div className="form-field form-full"><label>Notes</label><textarea className="textarea" value={form.notes} onChange={set('notes')} /></div>
          </div>
        </Modal>
      )}
    </div>
  )
}
