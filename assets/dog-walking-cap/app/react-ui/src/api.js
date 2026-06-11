// OData fetch helpers - per react-cap-shared.md §2
// NEVER use URLSearchParams for OData $ parameter names (encodes $ as %24, causes HTTP 400)

const BASE = '/api'

/** Throw if response is not ok - always check r.ok before .json() */
async function checkOk(r) {
  if (!r.ok) {
    let msg = `HTTP ${r.status}`
    try {
      const body = await r.json()
      msg = body?.error?.message || msg
    } catch (_) {}
    throw new Error(msg)
  }
  return r
}

// ── Walkers ──────────────────────────────────────────────────────────────────
export async function getWalkers() {
  const r = await fetch(`${BASE}/Walkers?$orderby=lastName asc`).then(checkOk)
  const { value } = await r.json()
  return value
}
export async function createWalker(data) {
  const r = await fetch(`${BASE}/Walkers`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(checkOk)
  return r.json()
}
export async function updateWalker(id, data) {
  await fetch(`${BASE}/Walkers(ID='${encodeURIComponent(id)}')`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(checkOk)
}
export async function deleteWalker(id) {
  await fetch(`${BASE}/Walkers(ID='${encodeURIComponent(id)}')`, { method: 'DELETE' }).then(checkOk)
}

// ── Customers ─────────────────────────────────────────────────────────────────
export async function getCustomers(search = '') {
  let url = `${BASE}/Customers?$orderby=lastName asc`
  if (search) {
    const f = encodeURIComponent(`contains(tolower(lastName),'${search.toLowerCase().replace(/'/g,"''")}') or contains(tolower(firstName),'${search.toLowerCase().replace(/'/g,"''")}')`)
    url = `${BASE}/Customers?$filter=${f}&$orderby=lastName asc`
  }
  const r = await fetch(url).then(checkOk)
  const { value } = await r.json()
  return value
}
export async function createCustomer(data) {
  const r = await fetch(`${BASE}/Customers`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(checkOk)
  return r.json()
}
export async function updateCustomer(id, data) {
  await fetch(`${BASE}/Customers(ID='${encodeURIComponent(id)}')`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(checkOk)
}
export async function deleteCustomer(id) {
  await fetch(`${BASE}/Customers(ID='${encodeURIComponent(id)}')`, { method: 'DELETE' }).then(checkOk)
}

// ── Addresses ─────────────────────────────────────────────────────────────────
export async function getAddressesByCustomer(customerId) {
  const f = encodeURIComponent(`customer_ID eq '${customerId}'`)
  const r = await fetch(`${BASE}/Addresses?$filter=${f}`).then(checkOk)
  const { value } = await r.json()
  return value
}
export async function createAddress(data) {
  const r = await fetch(`${BASE}/Addresses`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(checkOk)
  return r.json()
}
export async function updateAddress(id, data) {
  await fetch(`${BASE}/Addresses(ID='${encodeURIComponent(id)}')`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(checkOk)
}
export async function deleteAddress(id) {
  await fetch(`${BASE}/Addresses(ID='${encodeURIComponent(id)}')`, { method: 'DELETE' }).then(checkOk)
}

// ── Dogs ───────────────────────────────────────────────────────────────────────
export async function getDogs(customerId = null) {
  let url = `${BASE}/Dogs?$orderby=name asc`
  if (customerId) {
    const f = encodeURIComponent(`owner_ID eq '${customerId}'`)
    url = `${BASE}/Dogs?$filter=${f}&$orderby=name asc`
  }
  const r = await fetch(url).then(checkOk)
  const { value } = await r.json()
  return value
}
export async function createDog(data) {
  const r = await fetch(`${BASE}/Dogs`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(checkOk)
  return r.json()
}
export async function updateDog(id, data) {
  await fetch(`${BASE}/Dogs(ID='${encodeURIComponent(id)}')`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(checkOk)
}
export async function deleteDog(id) {
  await fetch(`${BASE}/Dogs(ID='${encodeURIComponent(id)}')`, { method: 'DELETE' }).then(checkOk)
}

// ── Appointments ──────────────────────────────────────────────────────────────
export async function getAppointments({ status, walkerId, customerId, dateFrom, dateTo } = {}) {
  const filters = []
  if (status)     filters.push(`status eq '${status}'`)
  if (walkerId)   filters.push(`walker_ID eq '${walkerId}'`)
  if (customerId) filters.push(`customer_ID eq '${customerId}'`)
  if (dateFrom)   filters.push(`date ge ${dateFrom}`)
  if (dateTo)     filters.push(`date le ${dateTo}`)
  const base = `${BASE}/Appointments?$orderby=date asc,timeSlot asc`
  const url = filters.length
    ? `${base}&$filter=${encodeURIComponent(filters.join(' and '))}`
    : base
  const r = await fetch(url).then(checkOk)
  const { value } = await r.json()
  return value
}
export async function createAppointment(data) {
  const r = await fetch(`${BASE}/Appointments`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(checkOk)
  return r.json()
}
export async function updateAppointment(id, data) {
  await fetch(`${BASE}/Appointments(ID='${encodeURIComponent(id)}')`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(checkOk)
}
export async function deleteAppointment(id) {
  await fetch(`${BASE}/Appointments(ID='${encodeURIComponent(id)}')`, { method: 'DELETE' }).then(checkOk)
}

// ── AppointmentDogs ────────────────────────────────────────────────────────────
export async function getAppointmentDogs(appointmentId) {
  const f = encodeURIComponent(`appointment_ID eq '${appointmentId}'`)
  const r = await fetch(`${BASE}/AppointmentDogs?$filter=${f}`).then(checkOk)
  const { value } = await r.json()
  return value
}
export async function addAppointmentDog(appointmentId, dogId) {
  const r = await fetch(`${BASE}/AppointmentDogs`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appointment_ID: appointmentId, dog_ID: dogId }),
  }).then(checkOk)
  return r.json()
}
export async function removeAppointmentDog(appointmentId, dogId) {
  await fetch(
    `${BASE}/AppointmentDogs(appointment_ID='${encodeURIComponent(appointmentId)}',dog_ID='${encodeURIComponent(dogId)}')`,
    { method: 'DELETE' }
  ).then(checkOk)
}

// ── Confirmations ─────────────────────────────────────────────────────────────
export async function getConfirmations() {
  const r = await fetch(`${BASE}/Confirmations?$orderby=confirmedAt desc`).then(checkOk)
  const { value } = await r.json()
  return value
}
export async function createConfirmation(data) {
  const r = await fetch(`${BASE}/Confirmations`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(checkOk)
  return r.json()
}

// ── Billing ───────────────────────────────────────────────────────────────────
export async function getBillingRecords({ status } = {}) {
  let url = `${BASE}/BillingRecords?$orderby=issuedAt desc`
  if (status) {
    const f = encodeURIComponent(`status eq '${status}'`)
    url = `${BASE}/BillingRecords?$filter=${f}&$orderby=issuedAt desc`
  }
  const r = await fetch(url).then(checkOk)
  const { value } = await r.json()
  return value
}
export async function updateBillingRecord(id, data) {
  await fetch(`${BASE}/BillingRecords(ID='${encodeURIComponent(id)}')`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(checkOk)
}

// ── Functions ─────────────────────────────────────────────────────────────────
export async function getValidSlots() {
  const r = await fetch(`${BASE}/getValidSlots()`).then(checkOk)
  const { value } = await r.json()
  return value
}
export async function getDailySchedule(date) {
  const r = await fetch(`${BASE}/getDailySchedule(date=${date})`).then(checkOk)
  const { value } = await r.json()
  return value
}
