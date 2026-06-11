import React, { useState, useEffect } from 'react'
import { apiFetch } from '../api.js'
import { fullName, formatDate } from '../utils.js'
import { toast } from '../Toast.jsx'

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const r = await apiFetch('/Customers?$expand=dogs,addresses&$orderby=firstName,lastName')
      setCustomers(r.value || [])
    } catch (e) { toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  if (loading) return <div className="loading">Loading…</div>

  return (
    <>
      <div className="card">
        <div className="card-header">
          <h2>👥 Customers ({customers.length})</h2>
          <button className="btn btn-primary" onClick={() => setModal({ firstName: '', lastName: '', phone: '', email: '', memberSince: '', addresses: [] })}>+ Add Customer</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Member Since</th><th>Dogs</th><th>Addrs</th><th>Actions</th></tr></thead>
            <tbody>
              {customers.length === 0 && <tr><td colSpan={7} className="empty">No customers.</td></tr>}
              {customers.map(c => (
                <tr key={c.ID}>
                  <td><strong>{fullName(c)}</strong></td>
                  <td>{c.phone || '—'}</td><td>{c.email || '—'}</td>
                  <td>{formatDate(c.memberSince)}</td>
                  <td>{(c.dogs || []).map(d => <span key={d.ID} className="badge badge-green" style={{ marginRight: 2 }}>{d.name}</span>)}</td>
                  <td><span className="badge badge-blue">{(c.addresses || []).length}</span></td>
                  <td><button className="btn btn-sm btn-ghost" onClick={() => setModal(JSON.parse(JSON.stringify(c)))}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {modal && <CustomerModal customer={modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }} />}
    </>
  )
}

function CustomerModal({ customer, onClose, onSaved }) {
  const isNew = !customer.ID
  const [form, setForm] = useState({ firstName: customer.firstName || '', lastName: customer.lastName || '', phone: customer.phone || '', email: customer.email || '', memberSince: customer.memberSince || '' })
  const [addrs, setAddrs] = useState(JSON.parse(JSON.stringify(customer.addresses || [])))

  async function save() {
    if (!form.firstName || !form.lastName) return toast('First and last name required', 'error')
    const body = { ...form, phone: form.phone || null, email: form.email || null, memberSince: form.memberSince || null }
    try {
      let cid = customer.ID
      if (!isNew) {
        await apiFetch('/Customers/' + customer.ID, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        toast('Customer updated!')
      } else {
        const cr = await apiFetch('/Customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        cid = cr.ID; toast('Customer added!')
      }
      if (cid) {
        if (!isNew) {
          const ex = await apiFetch('/Addresses?$filter=customer_ID eq ' + cid)
          for (const a of (ex.value || [])) await apiFetch('/Addresses/' + a.ID, { method: 'DELETE' })
        }
        for (const a of addrs) {
          await apiFetch('/Addresses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customer_ID: cid, street: a.street || null, city: a.city || null, state: a.state || null, zip: a.zip || null, isPickup: !!a.isPickup, isDropoff: !!a.isDropoff }) })
        }
      }
      onSaved()
    } catch (e) { toast(e.message, 'error') }
  }

  const updateAddr = (i, f, v) => setAddrs(a => a.map((x, j) => j === i ? { ...x, [f]: v } : x))

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>{isNew ? 'Add Customer' : 'Edit Customer'}</h3>
        <div className="form-row">
          <div className="form-group"><label>First Name *</label><input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} /></div>
          <div className="form-group"><label>Last Name *</label><input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Phone</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
        </div>
        <div className="form-group"><label>Member Since</label><input type="date" value={form.memberSince} onChange={e => setForm(f => ({ ...f, memberSince: e.target.value }))} /></div>
        <div className="sub-section">
          <h4>🏠 Addresses</h4>
          {addrs.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>No addresses.</div>}
          {addrs.map((a, i) => (
            <div className="addr-block" key={i}>
              <div className="addr-grid">
                <input placeholder="Street" value={a.street || ''} onChange={e => updateAddr(i, 'street', e.target.value)} />
                <input placeholder="City" value={a.city || ''} onChange={e => updateAddr(i, 'city', e.target.value)} />
                <input placeholder="State" value={a.state || ''} onChange={e => updateAddr(i, 'state', e.target.value)} />
                <input placeholder="ZIP" value={a.zip || ''} onChange={e => updateAddr(i, 'zip', e.target.value)} />
              </div>
              <div className="addr-foot">
                <label><input type="checkbox" checked={!!a.isPickup} onChange={e => updateAddr(i, 'isPickup', e.target.checked)} /> Pickup</label>
                <label><input type="checkbox" checked={!!a.isDropoff} onChange={e => updateAddr(i, 'isDropoff', e.target.checked)} /> Dropoff</label>
                <button className="btn btn-sm btn-danger" onClick={() => setAddrs(a => a.filter((_, j) => j !== i))}>Remove</button>
              </div>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 6 }} onClick={() => setAddrs(a => [...a, { street: '', city: '', state: '', zip: '', isPickup: true, isDropoff: true }])}>+ Add Address</button>
        </div>
        <div className="form-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  )
}
