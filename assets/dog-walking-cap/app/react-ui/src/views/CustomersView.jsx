import { useState, useEffect } from 'react'
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, getAddressesByCustomer, createAddress, updateAddress, deleteAddress } from '../api.js'
import { useToast } from '../Toast.jsx'
import Modal from '../Modal.jsx'

const EMPTY_CUSTOMER = { firstName: '', lastName: '', phone: '', email: '' }
const EMPTY_ADDR = { type: 'billing', street: '', city: '', state: '', zip: '' }

export default function CustomersView() {
  const toast = useToast()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_CUSTOMER)
  const [addrModal, setAddrModal] = useState(null)
  const [addresses, setAddresses] = useState([])
  const [addrForm, setAddrForm] = useState(EMPTY_ADDR)

  function load() {
    let cancelled = false
    setLoading(true)
    getCustomers(search)
      .then(v => { if (!cancelled) { setCustomers(v); setLoading(false) } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false) } })
    return () => { cancelled = true }
  }
  useEffect(load, [search])

  function openCreate() { setForm(EMPTY_CUSTOMER); setModal({ mode: 'create' }) }
  function openEdit(c) { setForm({ firstName: c.firstName, lastName: c.lastName, phone: c.phone || '', email: c.email || '' }); setModal({ mode: 'edit', id: c.ID }) }

  async function handleSave() {
    if (!form.firstName.trim() || !form.lastName.trim()) { toast('First and last name are required', 'error'); return }
    setSaving(true)
    try {
      if (modal.mode === 'create') { await createCustomer(form); toast('Customer created', 'success') }
      else { await updateCustomer(modal.id, form); toast('Customer updated', 'success') }
      setModal(null); load()
    } catch (e) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete(c) {
    if (!confirm(`Delete ${c.firstName} ${c.lastName}?`)) return
    try { await deleteCustomer(c.ID); toast('Customer deleted', 'success'); load() }
    catch (e) { toast(e.message, 'error') }
  }

  async function openAddresses(c) {
    const addrs = await getAddressesByCustomer(c.ID).catch(() => [])
    setAddresses(addrs)
    setAddrModal({ customer: c })
    setAddrForm({ ...EMPTY_ADDR })
  }

  async function handleAddAddr() {
    if (!addrForm.street) { toast('Street is required', 'error'); return }
    try {
      await createAddress({ ...addrForm, customer_ID: addrModal.customer.ID })
      toast('Address added', 'success')
      const addrs = await getAddressesByCustomer(addrModal.customer.ID)
      setAddresses(addrs)
      setAddrForm(EMPTY_ADDR)
    } catch (e) { toast(e.message, 'error') }
  }

  async function handleDelAddr(id) {
    try {
      await deleteAddress(id)
      setAddresses(prev => prev.filter(a => a.ID !== id))
      toast('Address deleted', 'success')
    } catch (e) { toast(e.message, 'error') }
  }

  const set = k => e => setForm(prev => ({ ...prev, [k]: e.target.value }))
  const setA = k => e => setAddrForm(prev => ({ ...prev, [k]: e.target.value }))

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">👥 Customers</h2>
        <div className="toolbar">
          <input className="input input-sm" style={{ width: 200 }} placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} />
          <button className="btn btn-primary" onClick={openCreate}>+ Add Customer</button>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="card">
        {loading ? <div className="loading">Loading customers...</div> : customers.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">👥</div><div className="empty-msg">No customers found</div></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th style={{ width: 140 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c.ID}>
                    <td><strong>{c.firstName} {c.lastName}</strong></td>
                    <td>{c.phone || '-'}</td>
                    <td>{c.email || '-'}</td>
                    <td>
                      <div className="td-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>Edit</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => openAddresses(c)}>Addr</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c)}>Del</button>
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
        <Modal title={modal.mode === 'create' ? 'Add Customer' : 'Edit Customer'} onClose={() => setModal(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button></>}>
          <div className="form-grid">
            <div className="form-field"><label>First Name *</label><input className="input" value={form.firstName} onChange={set('firstName')} /></div>
            <div className="form-field"><label>Last Name *</label><input className="input" value={form.lastName} onChange={set('lastName')} /></div>
            <div className="form-field"><label>Phone</label><input className="input" value={form.phone} onChange={set('phone')} /></div>
            <div className="form-field"><label>Email</label><input className="input" type="email" value={form.email} onChange={set('email')} /></div>
          </div>
        </Modal>
      )}

      {addrModal && (
        <Modal title={`Addresses - ${addrModal.customer.firstName} ${addrModal.customer.lastName}`} onClose={() => setAddrModal(null)} size="lg"
          footer={<button className="btn btn-secondary" onClick={() => setAddrModal(null)}>Close</button>}>
          <div style={{ marginBottom: 16 }}>
            <div className="form-grid">
              <div className="form-field">
                <label>Type</label>
                <select className="select" value={addrForm.type} onChange={setA('type')}>
                  <option value="billing">Billing</option>
                  <option value="pickup">Pickup</option>
                  <option value="dropoff">Dropoff</option>
                </select>
              </div>
              <div className="form-field"><label>Street *</label><input className="input" value={addrForm.street} onChange={setA('street')} /></div>
              <div className="form-field"><label>City</label><input className="input" value={addrForm.city} onChange={setA('city')} /></div>
              <div className="form-field"><label>State</label><input className="input" value={addrForm.state} onChange={setA('state')} /></div>
              <div className="form-field"><label>Zip</label><input className="input" value={addrForm.zip} onChange={setA('zip')} /></div>
            </div>
            <div style={{ marginTop: 10, textAlign: 'right' }}>
              <button className="btn btn-primary btn-sm" onClick={handleAddAddr}>Add Address</button>
            </div>
          </div>
          {addresses.length === 0 ? <div className="empty-state"><div className="empty-msg">No addresses yet</div></div> : (
            <table>
              <thead><tr><th>Type</th><th>Street</th><th>City</th><th>State</th><th>Zip</th><th></th></tr></thead>
              <tbody>
                {addresses.map(a => (
                  <tr key={a.ID}>
                    <td><span className="badge badge-scheduled" style={{ textTransform: 'capitalize' }}>{a.type}</span></td>
                    <td>{a.street}</td><td>{a.city}</td><td>{a.state}</td><td>{a.zip}</td>
                    <td><button className="btn btn-danger btn-sm" onClick={() => handleDelAddr(a.ID)}>Del</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Modal>
      )}
    </div>
  )
}
