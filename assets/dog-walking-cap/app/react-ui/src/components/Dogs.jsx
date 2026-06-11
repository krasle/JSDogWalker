import React, { useState, useEffect } from 'react'
import { apiFetch } from '../api.js'
import { fullName, formatDate } from '../utils.js'
import { toast } from '../Toast.jsx'

export default function Dogs() {
  const [dogs, setDogs] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [friendsModal, setFriendsModal] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const [dr, cr] = await Promise.all([
        apiFetch('/Dogs?$expand=owner&$orderby=name'),
        apiFetch('/Customers?$orderby=firstName,lastName'),
      ])
      setDogs(dr.value || [])
      setCustomers(cr.value || [])
    } catch (e) { toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  if (loading) return <div className="loading">Loading…</div>

  return (
    <>
      <div className="card">
        <div className="card-header">
          <h2>🐕 Dogs ({dogs.length})</h2>
          <button className="btn btn-primary" onClick={() => setModal({ name: '', breed: '', color: '', weight: '', dateOfBirth: '', licenseNo: '', owner_ID: '', notes: '' })}>+ Add Dog</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Breed</th><th>Color</th><th>Weight</th><th>Born</th><th>Owner</th><th>Notes</th><th>Actions</th></tr></thead>
            <tbody>
              {dogs.length === 0 && <tr><td colSpan={8} className="empty">No dogs.</td></tr>}
              {dogs.map(d => (
                <tr key={d.ID}>
                  <td><strong>{d.name}</strong></td>
                  <td>{d.breed || '—'}</td><td>{d.color || '—'}</td>
                  <td>{d.weight != null ? d.weight + ' lb' : '—'}</td>
                  <td>{formatDate(d.dateOfBirth)}</td>
                  <td>{fullName(d.owner) || '—'}</td>
                  <td><small>{d.notes || '—'}</small></td>
                  <td>
                    <button className="btn btn-sm btn-ghost" onClick={() => setModal(JSON.parse(JSON.stringify(d)))}>Edit</button>{' '}
                    <button className="btn btn-sm btn-ghost" onClick={() => setFriendsModal(d)}>🐾 Friends</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && <DogModal dog={modal} customers={customers} onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }} />}
      {friendsModal && <FriendsModal dog={friendsModal} allDogs={dogs} onClose={() => { setFriendsModal(null); load() }} />}
    </>
  )
}

function DogModal({ dog, customers, onClose, onSaved }) {
  const isNew = !dog.ID
  const [form, setForm] = useState({ name: dog.name || '', breed: dog.breed || '', color: dog.color || '', weight: dog.weight != null ? String(dog.weight) : '', dateOfBirth: dog.dateOfBirth || '', licenseNo: dog.licenseNo || '', owner_ID: dog.owner_ID || '', notes: dog.notes || '' })

  async function save() {
    if (!form.name) return toast('Name required', 'error')
    const wt = parseFloat(form.weight)
    const body = { name: form.name, breed: form.breed || null, color: form.color || null, weight: isNaN(wt) ? null : wt, dateOfBirth: form.dateOfBirth || null, licenseNo: form.licenseNo || null, owner_ID: form.owner_ID || null, notes: form.notes || null }
    try {
      if (!isNew) { await apiFetch('/Dogs/' + dog.ID, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); toast('Dog updated!') }
      else { await apiFetch('/Dogs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); toast('Dog added!') }
      onSaved()
    } catch (e) { toast(e.message, 'error') }
  }

  const f = (key) => ({ value: form[key], onChange: e => setForm(p => ({ ...p, [key]: e.target.value })) })

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>{isNew ? 'Add Dog' : 'Edit Dog'}</h3>
        <div className="form-row">
          <div className="form-group"><label>Name *</label><input {...f('name')} /></div>
          <div className="form-group"><label>Breed</label><input {...f('breed')} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Color</label><input {...f('color')} /></div>
          <div className="form-group"><label>Weight (lb)</label><input type="number" min="0" step="0.1" {...f('weight')} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Date of Birth</label><input type="date" {...f('dateOfBirth')} /></div>
          <div className="form-group"><label>License No.</label><input {...f('licenseNo')} /></div>
        </div>
        <div className="form-group"><label>Owner</label>
          <select {...f('owner_ID')}>
            <option value="">— Select Owner —</option>
            {customers.map(c => <option key={c.ID} value={c.ID}>{fullName(c)}</option>)}
          </select>
        </div>
        <div className="form-group"><label>Notes</label><textarea rows={2} {...f('notes')} /></div>
        <div className="form-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  )
}

function FriendsModal({ dog, allDogs, onClose }) {
  const [friends, setFriends] = useState([])
  const [selectedFriend, setSelectedFriend] = useState('')

  async function loadFriends() {
    try {
      const r = await apiFetch('/DogFriends?$filter=dog_ID eq ' + dog.ID + '&$expand=friend')
      setFriends(r.value || [])
    } catch (_) { }
  }

  useEffect(() => { loadFriends() }, [])

  const friendIds = new Set(friends.map(f => f.friend_ID || (f.friend && f.friend.ID)).filter(Boolean))
  const available = allDogs.filter(d => d.ID !== dog.ID && !friendIds.has(d.ID))

  async function addFriend() {
    if (!selectedFriend) return toast('Select a dog first', 'error')
    try {
      await apiFetch('/DogFriends', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dog_ID: dog.ID, friend_ID: selectedFriend }) })
      toast('Friend added!'); setSelectedFriend(''); loadFriends()
    } catch (e) { toast(e.message, 'error') }
  }

  async function removeFriend(rowId) {
    if (!confirm('Remove this friend pair?')) return
    try {
      await apiFetch('/DogFriends/' + rowId, { method: 'DELETE' })
      toast('Friend removed.'); loadFriends()
    } catch (e) { toast(e.message, 'error') }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>🐾 Friends of {dog.name}</h3>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>Current friends:</div>
          <div>
            {friends.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>No friends yet.</span>}
            {friends.map(f => (
              <span key={f.ID} className="friend-chip">
                {f.friend ? f.friend.name : '?'}
                <button onClick={() => removeFriend(f.ID)}>✕</button>
              </span>
            ))}
          </div>
        </div>
        <div className="form-group"><label>Add Friend</label>
          <select value={selectedFriend} onChange={e => setSelectedFriend(e.target.value)}>
            <option value="">— Select dog —</option>
            {available.map(d => <option key={d.ID} value={d.ID}>{d.name} ({fullName(d.owner)})</option>)}
          </select>
        </div>
        <div className="form-actions">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={addFriend}>Add Friend</button>
        </div>
      </div>
    </div>
  )
}
