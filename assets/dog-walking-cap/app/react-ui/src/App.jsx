import { useState } from 'react'
import { ToastProvider } from './Toast.jsx'
import ScheduleView      from './views/ScheduleView.jsx'
import WalkersView       from './views/WalkersView.jsx'
import CustomersView     from './views/CustomersView.jsx'
import DogsView          from './views/DogsView.jsx'
import AppointmentsView  from './views/AppointmentsView.jsx'
import ConfirmationsView from './views/ConfirmationsView.jsx'
import BillingView       from './views/BillingView.jsx'

const VIEWS = [
  { id: 'schedule',      label: '📅 Schedule',      component: ScheduleView      },
  { id: 'appointments',  label: '📋 Appointments',  component: AppointmentsView  },
  { id: 'confirmations', label: '✅ Confirmations', component: ConfirmationsView },
  { id: 'customers',     label: '👥 Customers',     component: CustomersView     },
  { id: 'dogs',          label: '🐕 Dogs',          component: DogsView          },
  { id: 'walkers',       label: '🚶 Walkers',       component: WalkersView       },
  { id: 'billing',       label: '💰 Billing',       component: BillingView       },
]

export default function App() {
  const [view, setView] = useState('schedule')
  const Active = VIEWS.find(v => v.id === view)?.component || ScheduleView

  return (
    <ToastProvider>
      <div className="app">
        <header className="app-header">
          <span style={{ fontSize: 24 }}>🐾</span>
          <h1>Paw &amp; Go</h1>
          <span className="tagline">Dog Walking Service</span>
        </header>
        <nav className="app-nav">
          {VIEWS.map(v => (
            <button
              key={v.id}
              className={view === v.id ? 'active' : ''}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </nav>
        <main className="page-content">
          <Active />
        </main>
      </div>
    </ToastProvider>
  )
}
