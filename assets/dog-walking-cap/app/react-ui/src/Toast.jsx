import React, { useState, useCallback, useEffect, useRef } from 'react'

let _addToast = null
export function toast(msg, type) { _addToast && _addToast(msg, type || 'success') }

export default function Toast() {
  const [items, setItems] = useState([])
  const counter = useRef(0)

  useEffect(() => {
    _addToast = (msg, type) => {
      const id = ++counter.current
      setItems(prev => [...prev, { id, msg, type }])
      setTimeout(() => setItems(prev => prev.filter(i => i.id !== id)), 3500)
    }
    return () => { _addToast = null }
  }, [])

  return (
    <div id="toast">
      {items.map(i => (
        <div key={i.id} className={'toast-item toast-' + i.type}>{i.msg}</div>
      ))}
    </div>
  )
}
