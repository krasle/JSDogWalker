import { useState, useEffect } from 'react'
import { getDailySchedule, getWalkers } from '../api.js'
import { useToast } from '../Toast.jsx'

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function ScheduleView() {
  const toast = useToast()
  const [date, setDate] = useState(today())
  const [schedule, setSchedule] = useState([])
  const [walkers, setWalkers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    getWalkers().then(v => { if (!cancelled) setWalkers(v) }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!date) return
    setLoading(true)
    setError(null)
    getDailySchedule(date)
      .then(v => { if (!cancelled) { setSchedule(v); setLoading(false) } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false) } })
    return () => { cancelled = true }
  }, [date])

  // Build slot x walker grid
  const walkerIds = walkers.map(w => w.ID)
  const slotMap = {}
  for (const appt of schedule) {
    const key = `${appt.timeSlot}::${appt.walkerFirstName} ${appt.walkerLastName}`
    slotMap[key] = appt
  }

  // Collect all unique time slots in order
  const slots = [...new Set(schedule.map(a => a.timeSlot))].sort()

  function handlePrint() { window.print() }

  const dateFormatted = date
    ? new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : ''

  return (
    <div>
      <div className="page-header no-print">
        <h2 className="page-title">📅 Daily Schedule</h2>
        <div className="toolbar">
          <input
            type="date"
            className="input"
            style={{ width: 'auto' }}
            value={date}
            onChange={e => setDate(e.target.value)}
          />
          <button className="btn btn-secondary" onClick={handlePrint}>🖨 Print</button>
        </div>
      </div>

      <div className="print-title">Paw &amp; Go - Daily Schedule: {dateFormatted}</div>

      {error && <div className="error-msg">{error}</div>}

      {loading ? (
        <div className="loading">Loading schedule...</div>
      ) : schedule.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <div className="empty-msg">No appointments on {dateFormatted || date}</div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header no-print">
            <span className="card-title">{dateFormatted}</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{schedule.length} appointment{schedule.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="schedule-grid">
            <table className="schedule-table">
              <thead>
                <tr>
                  <th style={{ width: 70 }}>Time</th>
                  <th>Walker</th>
                  <th>Customer</th>
                  <th>Dogs</th>
                  <th>Pickup</th>
                  <th>Fee</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map(appt => (
                  <tr key={appt.appointmentId}>
                    <td><strong>{appt.timeSlot}</strong></td>
                    <td>{appt.walkerFirstName} {appt.walkerLastName}</td>
                    <td>{appt.customerFirstName} {appt.customerLastName}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{appt.dogNames || '-'}</td>
                    <td style={{ fontSize: 12 }}>{appt.pickupStreet}{appt.pickupCity ? `, ${appt.pickupCity}` : ''}</td>
                    <td><span style={{ color: '#166534', fontWeight: 600 }}>${appt.totalFee}</span></td>
                    <td><span className={`badge badge-${appt.status}`}>{appt.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Print summary */}
      {schedule.length > 0 && (
        <div style={{ marginTop: 12, textAlign: 'right', fontSize: 13 }} className="no-print">
          <strong>Total revenue: </strong>
          <span style={{ color: '#166534', fontWeight: 700 }}>
            ${schedule.filter(a => a.status !== 'cancelled').reduce((s, a) => s + (Number(a.totalFee) || 0), 0).toFixed(2)}
          </span>
        </div>
      )}
    </div>
  )
}
