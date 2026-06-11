import React, { useState } from 'react'
import Toast from './Toast.jsx'
import Schedule from './components/Schedule.jsx'
import Appointments from './components/Appointments.jsx'
import Walkers from './components/Walkers.jsx'
import Customers from './components/Customers.jsx'
import Dogs from './components/Dogs.jsx'
import Billing from './components/Billing.jsx'
import Confirmations from './components/Confirmations.jsx'

const VIEWS = [
  { id: 'schedule',      label: '📅 Schedule',      Component: Schedule },
  { id: 'appointments',  label: '📋 Appointments',  Component: Appointments },
  { id: 'walkers',       label: '🚶 Walkers',       Component: Walkers },
  { id: 'customers',     label: '👥 Customers',     Component: Customers },
  { id: 'dogs',          label: '🐕 Dogs',          Component: Dogs },
  { id: 'billing',       label: '💰 Billing',       Component: Billing },
  { id: 'confirmations', label: '✅ Confirmations', Component: Confirmations },
]

export default function App() {
  const [current, setCurrent] = useState('schedule')
  const { Component } = VIEWS.find(v => v.id === current)

  return (
    <div id="app">
      <header>
        <h1>🐾 Paw &amp; Go</h1>
        <nav>
          {VIEWS.map(v => (
            <button key={v.id} className={v.id === current ? 'active' : ''} onClick={() => setCurrent(v.id)}>
              {v.label}
            </button>
          ))}
        </nav>
      </header>
      <main>
        <Component key={current} />
      </main>
      <Toast />
    </div>
  )
}
