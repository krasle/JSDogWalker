import { useState, useEffect } from 'react'
import { getAppointments, createAppointment, updateAppointment, deleteAppointment,
         getAppointmentDogs, addAppointmentDog, removeAppointmentDog,
         getWalkers, getCustomers, getDogs, getAddressesByCustomer, getValidSlots } from '../api.js'
import { useToast } from '../Toast.jsx'
import Modal from '../Modal.jsx'

const EMPTY = { date: '', timeSlot: '', walker_ID: '', customer_ID: '', pickupAddress_ID: '', dropoffAddress_ID: '', status: 'scheduled', notes: '' }
const STATUSES = ['scheduled', 'confirmed', 'completed', 'cancelled']

export default function AppointmentsView() {
  const toast = useToast()
  const [appts, setAppts]     = useState([])
  const [walkers, setWalkers] = useState([])
  const [customers, setCustomers] = useState([])
  const [slots, setSlots]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [filter, setFilter]   = useState({ status: '', walker_ID: '', dateFrom: '', dateTo: '' })
  const [modal, setModal]     = useState(null)
  const [form, setForm]       = useState(EMPTY)
  const [saving, setSaving]   = useState(false)
  const [customerAddresses, setCustomerAddresses] = useState([])
  const [customerDogs, setCustomerDogs]           = useState([])
  const [selectedDogs, setSelectedDogs]           = useState([])
  const [apptDogsMap, setApptDogsMap]             = useState({}) // apptId -> dog_IDs[]

  useEffect(() => {
    let cancelled = false
    Promise.all([getWalkers(), getCustomers(), getValidSlots()])
      .then(([w, c, s]) => { if (!cancelled) { setWalkers(w); setCustomers(c); setSlots(s) } })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  function load() {
    let cancelled = false
    setLoading(true)
    getAppointments({ status: filter.status, walkerId: filter.walker_ID, dateFrom: filter.dateFrom, dateTo: filter.dateTo })
      .then(async v => {
        if (cancelled) return
        setAppts(v)
        setLoading(false)
        // Fetch dog IDs for all appointments (server-side)
        const map = {}
        await Promise.all(v.map(async a => {
          try {
            const dogs = await getAppointmentDogs(a.ID)
            map[a.ID] = dogs.map(d => d.dog_ID)
          } catch (_) { map[a.ID] = [] }
        }))
        if (!cancelled) setApptDogsMap(map)
      })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false) } })
    return () => { cancelled = true }
  }
  useEffect(load, [filter])

  async function onCustomerChange(customerId) {
    setForm(prev => ({ ...prev, customer_ID: customerId, pickupAddress_ID: '', dropoffAddress_ID: '' }))
    setSelectedDogs([])
    if (!customerId) { setCustomerAddresses([]); setCustomerDogs([]); return }
    const [addrs, dogs] = await Promise.all([
      getAddressesByCustomer(customerId).catch(() => []),
      getDogs(customerId).catch(() => []),
    ])
    setCustomerAddresses(addrs)
    setCustomerDogs(dogs)
  }

  async function openCreate() {
    setForm(EMPTY); setSelectedDogs([]); setCustomerAddresses([]); setCustomerDogs([])
    setModal({ mode: 'create' })
  }
  async function openEdit(a) {
    const [addrs, dogs, apptDogs] = await Promise.all([
      a.customer_ID ? getAddressesByCustomer(a.customer_ID).catch(() => []) : Promise.resolve([]),
      a.customer_ID ? getDogs(a.customer_ID).catch(() => []) : Promise.resolve([]),
      getAppointmentDogs(a.ID).catch(() => []),
    ])
    setCustomerAddresses(addrs)
    setCustomerDogs(dogs)
    setSelectedDogs(apptDogs.map(d => d.dog_ID))
    setForm({
      date: a.date || '', timeSlot: a.timeSlot || '', walker_ID: a.walker_ID || '',
      customer_ID: a.customer_ID || '', pickupAddress_ID: a.pickupAddress_ID || '',
      dropoffAddress_ID: a.dropoffAddress_ID || '', status: a.status || 'scheduled', notes: a.notes || '',
    })
    setModal({ mode: 'edit', id: a.ID })
  }

  async function handleSave() {
    if (!form.date || !form.timeSlot || !form.walker_ID || !form.customer_ID) {
      toast('Date, time slot, walker, and customer are required', 'error'); return
    }
    if (selectedDogs.length === 0) { toast('At least one dog must be selected', 'error'); return }
    const fee = 30 + (selectedDogs.length - 1) * 10
    setSaving(true)
    try {
      let apptId
      if (modal.mode === 'create') {
        const created = await createAppointment({ ...form, totalFee: fee })
        apptId = created.ID
        await Promise.all(selectedDogs.map(dId => addAppointmentDog(apptId, dId)))
        toast('Appointment created', 'success')
      } else {
        await updateAppointment(modal.id, { ...form, totalFee: fee })
        apptId = modal.id
        // Sync dogs
        const prev = apptDogsMap[apptId] || []
        const toAdd = selectedDogs.filter(d => !prev.includes(d))
        const toRemove = prev.filter(d => !selectedDogs.includes(d))
        await Promise.all([
          ...toAdd.map(d => addAppointmentDog(apptId, d)),
          ...toRemove.map(d => removeAppointmentDog(apptId, d)),
        ])
        toast('Appointment updated', 'success')
      }
      setModal(null); load()
    } catch (e) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete(a) {
    if (!confirm('Delete this appointment?')) return
    try { await deleteAppointment(a.ID); toast('Deleted', 'success'); load() }
    catch (e) { toast(e.message, 'error') }
  }

  function toggleDog(id) {
    setSelectedDogs(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id])
  }

  const set = k => e => setForm(prev => ({ ...prev, [k]: e.target.value }))
  const walkerMap = Object.fromEntries(walkers.map(w => [w.ID, `${w.firstName} ${w.lastName}`]))
  const custMap   = Object.fromEntries(customers.map(c => [c.ID, `${c.firstName} ${c.lastName}`]))

  const fee = 30 + Math.max(selectedDogs.length - 1, 0) * 10

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">📋 Appointments</h2>
        <button className="btn btn-primary" onClick={openCreate}>+ Book Appointment</button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ paddingTop: 12, paddingBottom: 12 }}>
          <div className="toolbar">
            <select className="select input-sm" style={{ width: 140 }} value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s}</option>)}
            </select>
            <select className="select input-sm" style={{ width: 160 }} value={filter.walker_ID} onChange={e => setFilter(f => ({ ...f, walker_ID: e.target.value }))}>
              <option value="">All Walkers</option>
              {walkers.map(w => <option key={w.ID} value={w.ID}>{w.firstName} {w.lastName}</option>)}
            </select>
            <input type="date" className="input input-sm" style={{ width: 'auto' }} value={filter.dateFrom} onChange={e => setFilter(f => ({ ...f, dateFrom: e.target.value }))} title="From date" />
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>to</span>
            <input type="date" className="input input-sm" style={{ width: 'auto' }} value={filter.dateTo} onChange={e => setFilter(f => ({ ...f, dateTo: e.target.value }))} title="To date" />
            <button className="btn btn-ghost btn-sm" onClick={() => setFilter({ status: '', walker_ID: '', dateFrom: '', dateTo: '' })}>Clear</button>
          </div>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="card">
        {loading ? <div className="loading">Loading appointments...</div> : appts.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📭</div><div className="empty-msg">No appointments found</div></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Walker</th>
                  <th>Customer</th>
                  <th>Dogs</th>
                  <th>Fee</th>
                  <th>Status</th>
                  <th style={{ width: 100 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {appts.map(a => {
                  const dogIds = apptDogsMap[a.ID] || []
                  return (
                    <tr key={a.ID}>
                      <td>{a.date}</td>
                      <td><strong>{a.timeSlot}</strong></td>
                      <td>{walkerMap[a.walker_ID] || a.walker_ID}</td>
                      <td>{custMap[a.customer_ID] || a.customer_ID}</td>
                      <td>{dogIds.length} dog{dogIds.length !== 1 ? 's' : ''}</td>
                      <td><span style={{ color: '#166534', fontWeight: 600 }}>${a.totalFee || 30}</span></td>
                      <td><span className={`badge badge-${a.status}`}>{a.status}</span></td>
                      <td>
                        <div className="td-actions">
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(a)}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(a)}>Del</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <Modal title={modal.mode === 'create' ? 'Book Appointment' : 'Edit Appointment'} onClose={() => setModal(null)} size="lg"
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button></>}>
          <div className="form-grid">
            <div className="form-field"><label>Date *</label><input type="date" className="input" value={form.date} onChange={set('date')} /></div>
            <div className="form-field"><label>Time Slot *</label>
              <select className="select" value={form.timeSlot} onChange={set('timeSlot')}>
                <option value="">Select slot...</option>
                {slots.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-field"><label>Walker *</label>
              <select className="select" value={form.walker_ID} onChange={set('walker_ID')}>
                <option value="">Select walker...</option>
                {walkers.map(w => <option key={w.ID} value={w.ID}>{w.firstName} {w.lastName}</option>)}
              </select>
            </div>
            <div className="form-field"><label>Customer *</label>
              <select className="select" value={form.customer_ID} onChange={e => onCustomerChange(e.target.value)}>
                <option value="">Select customer...</option>
                {customers.map(c => <option key={c.ID} value={c.ID}>{c.firstName} {c.lastName}</option>)}
              </select>
            </div>
            <div className="form-field"><label>Pickup Address</label>
              <select className="select" value={form.pickupAddress_ID} onChange={set('pickupAddress_ID')}>
                <option value="">Select address...</option>
                {customerAddresses.map(a => <option key={a.ID} value={a.ID}>{a.type}: {a.street}, {a.city}</option>)}
              </select>
            </div>
            <div className="form-field"><label>Dropoff Address</label>
              <select className="select" value={form.dropoffAddress_ID} onChange={set('dropoffAddress_ID')}>
                <option value="">Same as pickup</option>
                {customerAddresses.map(a => <option key={a.ID} value={a.ID}>{a.type}: {a.street}, {a.city}</option>)}
              </select>
            </div>
            <div className="form-field"><label>Status</label>
              <select className="select" value={form.status} onChange={set('status')}>
                {STATUSES.map(s => <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s}</option>)}
              </select>
            </div>
            <div className="form-field form-full"><label>Notes</label><textarea className="textarea" value={form.notes} onChange={set('notes')} /></div>
          </div>

          {/* Dog selector */}
          {form.customer_ID && (
            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Select Dogs *</label>
              {customerDogs.length === 0 ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No dogs for this customer</div> : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {customerDogs.map(d => (
                    <label key={d.ID} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', padding: '4px 10px', borderRadius: 4, border: `1px solid ${selectedDogs.includes(d.ID) ? 'var(--brand-primary)' : 'var(--border-hover)'}`, background: selectedDogs.includes(d.ID) ? 'var(--brand-light)' : 'white', fontSize: 13 }}>
                      <input type="checkbox" checked={selectedDogs.includes(d.ID)} onChange={() => toggleDog(d.ID)} style={{ marginRight: 2 }} />
                      {d.name} <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({d.breed || 'unknown'})</span>
                    </label>
                  ))}
                </div>
              )}
              {selectedDogs.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 13, color: '#166534', fontWeight: 600 }}>
                  Fee: ${fee} ({selectedDogs.length} dog{selectedDogs.length > 1 ? 's' : ''}, $30 base + ${Math.max(selectedDogs.length - 1, 0) * 10} additional)
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
