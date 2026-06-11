#!/usr/bin/env node
'use strict';
const fs = require('fs'), path = require('path');

const dest = path.join(__dirname, '..', 'app', 'react-ui', 'index.html');

// ── CSS / HTML shell (keep as-is from the well-formed earlier version) ──────
const SHELL = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Paw &amp; Go &ndash; Dog Walking Service</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --primary: #2e7d32; --primary-dark: #1b5e20; --primary-light: #e8f5e9;
      --accent: #ff8f00; --accent-light: #fff8e1;
      --danger: #c62828; --danger-light: #ffebee;
      --text: #212121; --text-muted: #757575;
      --border: #e0e0e0; --bg: #f5f5f5; --white: #ffffff;
      --radius: 8px; --shadow: 0 2px 8px rgba(0,0,0,.12);
    }
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: var(--bg); color: var(--text); }
    #app  { display: flex; flex-direction: column; min-height: 100vh; }
    header { background: var(--primary); color: #fff; padding: 0 24px; display: flex; align-items: center; height: 56px; gap: 32px; box-shadow: var(--shadow); }
    header h1 { font-size: 1.2rem; font-weight: 600; white-space: nowrap; }
    nav { display: flex; gap: 4px; flex: 1; overflow-x: auto; }
    nav button { background: none; border: none; color: rgba(255,255,255,.8); padding: 8px 14px; border-radius: var(--radius); cursor: pointer; font-size: .9rem; white-space: nowrap; transition: background .15s, color .15s; }
    nav button:hover  { background: rgba(255,255,255,.15); color: #fff; }
    nav button.active { background: rgba(255,255,255,.25); color: #fff; font-weight: 600; }
    main { flex: 1; padding: 24px; max-width: 1200px; margin: 0 auto; width: 100%; }
    .card { background: var(--white); border-radius: var(--radius); box-shadow: var(--shadow); padding: 20px; margin-bottom: 20px; }
    .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; gap: 12px; flex-wrap: wrap; }
    .card-header h2 { font-size: 1.1rem; font-weight: 600; }
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border: none; border-radius: var(--radius); cursor: pointer; font-size: .875rem; font-weight: 500; transition: filter .15s; }
    .btn:hover    { filter: brightness(.9); }
    .btn-primary  { background: var(--primary); color: #fff; }
    .btn-success  { background: #1565c0; color: #fff; }
    .btn-danger   { background: var(--danger); color: #fff; }
    .btn-ghost    { background: transparent; color: var(--primary); border: 1px solid var(--primary); }
    .btn-sm       { padding: 4px 10px; font-size: .8rem; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: .875rem; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--border); }
    th { background: var(--primary-light); color: var(--primary-dark); font-weight: 600; }
    tr:hover td { background: #fafafa; }
    td:last-child { white-space: nowrap; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: .75rem; font-weight: 600; }
    .badge-green  { background: var(--primary-light); color: var(--primary-dark); }
    .badge-orange { background: var(--accent-light);  color: #e65100; }
    .badge-red    { background: var(--danger-light);  color: var(--danger); }
    .badge-gray   { background: #f5f5f5; color: var(--text-muted); }
    .badge-blue   { background: #e3f2fd; color: #1565c0; }
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
    .modal { background: var(--white); border-radius: var(--radius); box-shadow: 0 8px 32px rgba(0,0,0,.2); padding: 24px; width: 100%; max-width: 560px; max-height: 92vh; overflow-y: auto; }
    .modal h3 { margin-bottom: 20px; font-size: 1.1rem; }
    .form-group { margin-bottom: 14px; }
    .form-group label { display: block; font-size: .85rem; color: var(--text-muted); margin-bottom: 4px; }
    .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 8px 10px; border: 1px solid var(--border); border-radius: var(--radius); font-size: .9rem; background: var(--white); }
    .form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 2px rgba(46,125,50,.15); }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
    #toast { position: fixed; bottom: 24px; right: 24px; z-index: 2000; display: flex; flex-direction: column; gap: 8px; }
    .toast-item { padding: 12px 18px; border-radius: var(--radius); color: #fff; font-size: .875rem; box-shadow: var(--shadow); animation: slideIn .2s ease; max-width: 340px; }
    .toast-success { background: var(--primary); }
    .toast-error   { background: var(--danger); }
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: none; opacity: 1; } }
    .empty   { text-align: center; color: var(--text-muted); padding: 40px 0; }
    .loading { text-align: center; color: var(--text-muted); padding: 40px 0; }
    .search-bar { padding: 7px 12px; border: 1px solid var(--border); border-radius: var(--radius); font-size: .9rem; width: 220px; }
    .sub-section { margin-top: 20px; border-top: 1px solid var(--border); padding-top: 14px; }
    .sub-section h4 { font-size: .9rem; font-weight: 600; margin-bottom: 10px; color: var(--primary-dark); }
    .avail-row { display: flex; gap: 6px; align-items: center; margin-bottom: 6px; flex-wrap: wrap; }
    .avail-row select, .avail-row input[type=time] { padding: 6px 8px; border: 1px solid var(--border); border-radius: var(--radius); font-size: .85rem; }
    .addr-block { background: var(--primary-light); border-radius: var(--radius); padding: 10px 12px; margin-bottom: 8px; }
    .addr-block .addr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .addr-block .addr-grid input { padding: 5px 8px; border: 1px solid var(--border); border-radius: 4px; font-size: .85rem; width: 100%; }
    .addr-block .addr-foot { display: flex; gap: 12px; align-items: center; margin-top: 6px; }
    .addr-block .addr-foot label { font-size: .82rem; display: flex; gap: 4px; align-items: center; }
    .friend-chip { display: inline-flex; align-items: center; gap: 4px; background: var(--accent-light); border-radius: 12px; padding: 2px 10px; font-size: .8rem; margin: 2px; }
    .friend-chip button { background: none; border: none; cursor: pointer; color: var(--danger); font-size: 1rem; line-height: 1; padding: 0; }
    .schedule-card { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 16px; display: grid; grid-template-columns: 68px 1fr; gap: 12px; align-items: start; margin-bottom: 8px; }
    .schedule-time { background: var(--primary); color: #fff; border-radius: var(--radius); padding: 6px 8px; font-weight: 700; font-size: .9rem; text-align: center; }
    .schedule-info strong { display: block; font-size: .95rem; margin-bottom: 2px; }
    .schedule-info .meta  { color: var(--text-muted); font-size: .8rem; line-height: 1.6; }
    .schedule-info .addr  { font-size: .8rem; color: #555; margin-top: 3px; }
    .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .stat-card { background: var(--white); border-radius: var(--radius); box-shadow: var(--shadow); padding: 16px; text-align: center; }
    .stat-card .num { font-size: 2rem; font-weight: 700; color: var(--primary); }
    .stat-card .lbl { font-size: .8rem; color: var(--text-muted); margin-top: 4px; }
    .conf-num { font-family: monospace; font-size: .78rem; color: var(--text-muted); letter-spacing: .04em; }
    @media print {
      header, nav, #toast, .btn, .search-bar { display: none !important; }
      body { background: #fff; }
      main { max-width: 100%; padding: 0; }
      .card { box-shadow: none; border: 1px solid #ccc; break-inside: avoid; }
      .schedule-card { border: 1px solid #999; break-inside: avoid; }
      .schedule-time { background: #333 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .stats-row, .card-header > button { display: none !important; }
    }
  </style>
</head>
<body>
<div id="app">
  <header>
    <h1>&#x1F43E; Paw &amp; Go</h1>
    <nav id="nav"></nav>
  </header>
  <main id="main"><div class="loading">Loading&hellip;</div></main>
</div>
<div id="toast"></div>
<script>
'use strict';
`;

// ── JavaScript body ──────────────────────────────────────────────────────────
const JS = `
// ─────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────
const API = '/api';
async function apiFetch(path, opts) {
  const res = await fetch(API + path, opts || {});
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error((b.error && b.error.message) || b.message || res.statusText);
  }
  const t = await res.text();
  return t ? JSON.parse(t) : {};
}
function toast(msg, type) {
  const el = document.createElement('div');
  el.className = 'toast-item toast-' + (type || 'success');
  el.textContent = msg;
  document.getElementById('toast').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}
function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fullName(o) { return o ? ((o.firstName||'')+' '+(o.lastName||'')).trim() : ''; }
function formatDate(d) {
  if (!d) return '\\u2014';
  return new Date(d+(d.length===10?'T00:00:00':'')).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'});
}
function formatDateTime(d) {
  if (!d) return '\\u2014';
  return new Date(d).toLocaleString('en-US',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
}
function fmtMoney(v) { return v != null ? '$' + Number(v).toFixed(2) : '\\u2014'; }
function badge(t, c) { return '<span class="badge badge-'+(c||'gray')+'">'+esc(t)+'</span>'; }
function statusBadge(s) {
  return badge(s, s==='confirmed'?'blue': s==='completed'||s==='paid'?'green': s==='cancelled'||s==='waived'?'red':'orange');
}
function dayName(n) { return ['','Mon','Tue','Wed','Thu','Fri','Sat','Sun'][n] || n; }
function closeModal(id) { const el=document.getElementById(id); if (el) el.remove(); }

// ─────────────────────────────────────────────────────────────────
//  ROUTER
// ─────────────────────────────────────────────────────────────────
const VIEWS = [
  {id:'schedule',      label:'&#x1F4C5; Schedule',      fn:renderSchedule},
  {id:'appointments',  label:'&#x1F4CB; Appointments',  fn:renderAppointments},
  {id:'walkers',       label:'&#x1F6B6; Walkers',       fn:renderWalkers},
  {id:'customers',     label:'&#x1F465; Customers',     fn:renderCustomers},
  {id:'dogs',          label:'&#x1F436; Dogs',          fn:renderDogs},
  {id:'billing',       label:'&#x1F4B0; Billing',       fn:renderBilling},
  {id:'confirmations', label:'&#x2705; Confirmations',  fn:renderConfirmations},
];
let currentView = 'schedule';
function buildNav() {
  document.getElementById('nav').innerHTML = VIEWS.map(v =>
    '<button class="'+(v.id===currentView?'active':'')+'" onclick="navigate(\\''+v.id+'\\')">'+v.label+'</button>'
  ).join('');
}
function navigate(id) {
  currentView = id; buildNav();
  const v = VIEWS.find(x => x.id===id);
  if (v) v.fn();
}

// ─────────────────────────────────────────────────────────────────
//  SCHEDULE VIEW  [D-11 fixed: show pickup/dropoff addresses]
// ─────────────────────────────────────────────────────────────────
function renderSchedule() {
  const today = new Date().toISOString().slice(0,10);
  document.getElementById('main').innerHTML =
    '<div class="card">'+
    '  <div class="card-header">'+
    '    <h2>&#x1F4C5; Daily Schedule</h2>'+
    '    <div style="display:flex;gap:8px;align-items:center">'+
    '      <button class="btn btn-ghost btn-sm" onclick="setSchedDate(0)">Today</button>'+
    '      <input type="date" id="sched-date" value="'+today+'" class="search-bar" style="width:160px">'+
    '      <button class="btn btn-primary" onclick="loadSchedule()">Load</button>'+
    '      <button class="btn btn-ghost" onclick="window.print()">&#x1F5A8; Print</button>'+
    '    </div>'+
    '  </div>'+
    '  <div id="sched-body"><div class="loading">Select a date and click Load.</div></div>'+
    '</div>';
  loadSchedule();
}
function setSchedDate(offset) {
  const d = new Date(); d.setDate(d.getDate()+offset);
  const el = document.getElementById('sched-date');
  if (el) { el.value = d.toISOString().slice(0,10); loadSchedule(); }
}
async function loadSchedule() {
  const dateEl = document.getElementById('sched-date');
  const body   = document.getElementById('sched-body');
  if (!dateEl||!body) return;
  body.innerHTML = '<div class="loading">Loading&hellip;</div>';
  const date = dateEl.value;
  try {
    const data = await apiFetch('/getDailySchedule(date=\\''+date+'\\')');
    const rows = data.value || [];
    if (!rows.length) { body.innerHTML='<div class="empty">No appointments for '+formatDate(date)+'.</div>'; return; }
    const byWalker = {};
    rows.forEach(r => {
      const wk = ((r.walkerFirstName||'')+' '+(r.walkerLastName||'')).trim()||'Unknown';
      if (!byWalker[wk]) byWalker[wk] = [];
      byWalker[wk].push(r);
    });
    let html = '';
    Object.keys(byWalker).forEach(walker => {
      html += '<h3 style="margin:16px 0 8px;color:var(--primary)">&#x1F6B6; '+esc(walker)+'</h3>';
      byWalker[walker].forEach(a => {
        const cName = ((a.customerFirstName||'')+' '+(a.customerLastName||'')).trim();
        let addrHtml = '';
        if (a.pickupStreet||a.pickupCity)
          addrHtml += '<div class="addr">&#x1F4CD; Pickup: '+esc(a.pickupStreet||'')+(a.pickupCity?', '+esc(a.pickupCity):'')+'</div>';
        if ((a.dropoffStreet||a.dropoffCity)&&(a.dropoffStreet!==a.pickupStreet||a.dropoffCity!==a.pickupCity))
          addrHtml += '<div class="addr">&#x1F3C1; Drop-off: '+esc(a.dropoffStreet||'')+(a.dropoffCity?', '+esc(a.dropoffCity):'')+'</div>';
        html += '<div class="schedule-card">'+
          '<div class="schedule-time">'+esc(a.timeSlot||'')+'</div>'+
          '<div class="schedule-info">'+
          '<strong>'+esc(cName)+' &ndash; '+esc(a.dogNames||'(no dogs)')+'</strong>'+
          '<div class="meta">Fee: '+fmtMoney(a.totalFee)+'  '+statusBadge(a.status)+'</div>'+
          addrHtml+'</div></div>';
      });
    });
    body.innerHTML = html;
  } catch(e) { body.innerHTML='<div class="empty" style="color:var(--danger)">'+esc(e.message)+'</div>'; }
}

// ─────────────────────────────────────────────────────────────────
//  APPOINTMENTS  [D-12 fixed: Complete button]
// ─────────────────────────────────────────────────────────────────
var apptCache = {appointments:[],walkers:[],customers:[],dogs:[],slots:[]};
async function renderAppointments() {
  const main = document.getElementById('main');
  main.innerHTML = '<div class="loading">Loading&hellip;</div>';
  try {
    const [a,w,c,d,s] = await Promise.all([
      apiFetch('/Appointments?$expand=walker,customer,dogs($expand=dog)&$orderby=date,timeSlot'),
      apiFetch('/Walkers?$orderby=firstName,lastName'),
      apiFetch('/Customers?$orderby=firstName,lastName'),
      apiFetch('/Dogs?$orderby=name'),
      apiFetch('/getValidSlots()'),
    ]);
    apptCache.appointments = a.value||[];
    apptCache.walkers      = w.value||[];
    apptCache.customers    = c.value||[];
    apptCache.dogs         = d.value||[];
    apptCache.slots        = s.value||[];
    drawApptTable('');
  } catch(e) { main.innerHTML='<div class="card"><div class="empty" style="color:var(--danger)">'+esc(e.message)+'</div></div>'; }
}
function drawApptTable(filter) {
  const lf = (filter||'').toLowerCase();
  const rows = apptCache.appointments.filter(a =>
    !lf || [fullName(a.walker),fullName(a.customer),a.date,a.timeSlot,a.status].some(v=>String(v||'').toLowerCase().includes(lf))
  );
  const st = {scheduled:0,confirmed:0,cancelled:0,completed:0};
  apptCache.appointments.forEach(a => { if (a.status in st) st[a.status]++; });
  let html =
    '<div class="stats-row">'+
    '<div class="stat-card"><div class="num">'+apptCache.appointments.length+'</div><div class="lbl">Total</div></div>'+
    '<div class="stat-card"><div class="num">'+st.scheduled+'</div><div class="lbl">Scheduled</div></div>'+
    '<div class="stat-card"><div class="num">'+st.confirmed+'</div><div class="lbl">Confirmed</div></div>'+
    '<div class="stat-card"><div class="num">'+st.completed+'</div><div class="lbl">Completed</div></div>'+
    '</div>'+
    '<div class="card">'+
    '<div class="card-header"><h2>&#x1F4CB; Appointments</h2>'+
    '<div style="display:flex;gap:8px">'+
    '<input class="search-bar" placeholder="Search&hellip;" oninput="drawApptTable(this.value)" value="'+esc(filter)+'">'+
    '<button class="btn btn-primary" onclick="openApptModal()">+ Book</button>'+
    '</div></div>'+
    '<div class="table-wrap"><table>'+
    '<thead><tr><th>Date</th><th>Time</th><th>Walker</th><th>Customer</th><th>Dogs</th><th>Fee</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
  rows.forEach(a => {
    const dn = (a.dogs||[]).map(ad=>ad.dog?ad.dog.name:'?').join(', ')||'\\u2014';
    let acts = '';
    if (a.status==='scheduled')
      acts += '<button class="btn btn-sm btn-primary" onclick="patchAppt(\\''+a.ID+'\\',\\'confirmed\\')">Confirm</button> ';
    if (a.status==='confirmed')
      acts += '<button class="btn btn-sm btn-success" onclick="patchAppt(\\''+a.ID+'\\',\\'completed\\')">&#x2714; Complete</button> ';
    if (a.status!=='cancelled'&&a.status!=='completed')
      acts += '<button class="btn btn-sm btn-danger" onclick="cancelApptConfirm(\\''+a.ID+'\\')">Cancel</button>';
    html += '<tr><td>'+esc(a.date)+'</td><td>'+esc(a.timeSlot)+'</td>'+
      '<td>'+esc(fullName(a.walker))+'</td><td>'+esc(fullName(a.customer))+'</td>'+
      '<td>'+esc(dn)+'</td><td>'+fmtMoney(a.totalFee)+'</td>'+
      '<td>'+statusBadge(a.status)+'</td><td>'+acts+'</td></tr>';
  });
  if (!rows.length) html += '<tr><td colspan="8" class="empty">No appointments found.</td></tr>';
  html += '</tbody></table></div></div>';
  document.getElementById('main').innerHTML = html;
}
function openApptModal() {
  const today = new Date().toISOString().slice(0,10);
  const sOpts = apptCache.slots.map(s=>{const sv=typeof s==='string'?s:(s.slot||''); return '<option value="'+esc(sv)+'">'+esc(sv)+'</option>';}).join('');
  const wOpts = apptCache.walkers.map(w=>'<option value="'+esc(w.ID)+'">'+esc(fullName(w))+'</option>').join('');
  const cOpts = apptCache.customers.map(c=>'<option value="'+esc(c.ID)+'">'+esc(fullName(c))+'</option>').join('');
  document.body.insertAdjacentHTML('beforeend',
    '<div class="modal-backdrop" id="appt-modal" onclick="closeModal(\\'appt-modal\\')">'+
    '<div class="modal" onclick="event.stopPropagation()"><h3>Book Appointment</h3>'+
    '<div class="form-group"><label>Date</label><input type="date" id="af-date" value="'+today+'"></div>'+
    '<div class="form-group"><label>Time Slot</label><select id="af-slot">'+sOpts+'</select></div>'+
    '<div class="form-group"><label>Walker</label><select id="af-walker"><option value="">\\u2014 Select \\u2014</option>'+wOpts+'</select></div>'+
    '<div class="form-group"><label>Customer</label><select id="af-customer" onchange="filterApptDogs(this.value)"><option value="">\\u2014 Select \\u2014</option>'+cOpts+'</select></div>'+
    '<div class="form-group"><label>Dogs (Ctrl/Cmd = multi)</label><select id="af-dogs" multiple size="5" style="height:110px"><option disabled>Select a customer first</option></select></div>'+
    '<div class="form-group"><label>Notes</label><textarea id="af-notes" rows="2"></textarea></div>'+
    '<div class="form-actions">'+
    '<button class="btn btn-ghost" onclick="closeModal(\\'appt-modal\\')">Cancel</button>'+
    '<button class="btn btn-primary" onclick="saveAppt()">Book</button>'+
    '</div></div></div>');
}
async function saveAppt() {
  const date=document.getElementById('af-date').value;
  const slot=document.getElementById('af-slot').value;
  const wid=document.getElementById('af-walker').value;
  const cid=document.getElementById('af-customer').value;
  const notes=document.getElementById('af-notes').value.trim();
  const dogIds=Array.from(document.getElementById('af-dogs').selectedOptions).map(o=>o.value);
  if (!date||!slot||!wid||!cid||!dogIds.length) return toast('Fill all fields and select \\u22651 dog.','error');
  try {
    await apiFetch('/Appointments',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({date,timeSlot:slot,walker_ID:wid,customer_ID:cid,notes:notes||null,dogs:dogIds.map(id=>({dog_ID:id}))})});
    closeModal('appt-modal');
    toast('Appointment booked \\u2014 confirmation auto-created!');
    renderAppointments();
  } catch(e) { toast(e.message,'error'); }
}
function filterApptDogs(custId) {
  const sel=document.getElementById('af-dogs'); if (!sel) return;
  const list=custId?apptCache.dogs.filter(d=>d.owner_ID===custId):[];
  if (!list.length) { sel.innerHTML='<option disabled>No dogs for this customer</option>'; return; }
  sel.innerHTML='';
  list.forEach(d=>{const o=document.createElement('option');o.value=d.ID;o.textContent=d.name+' ('+(d.breed||'?')+')';sel.appendChild(o);});
}
async function patchAppt(id, status) {
  try {
    await apiFetch('/Appointments/'+id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});
    toast('Appointment '+status+'.');
    renderAppointments();
  } catch(e) { toast(e.message,'error'); }
}
function cancelApptConfirm(id) { if (confirm('Cancel this appointment?')) patchAppt(id,'cancelled'); }

// ─────────────────────────────────────────────────────────────────
//  WALKERS  [D-08 fixed: availability management]
// ─────────────────────────────────────────────────────────────────
async function renderWalkers() {
  const main=document.getElementById('main');
  main.innerHTML='<div class="loading">Loading&hellip;</div>';
  try {
    const res=await apiFetch('/Walkers?$expand=availability&$orderby=firstName,lastName');
    const walkers=res.value||[];
    let rows='';
    walkers.forEach(w=>{
      const avail=(w.availability||[]).sort((a,b)=>a.dayOfWeek-b.dayOfWeek)
        .map(a=>dayName(a.dayOfWeek)+' '+a.startTime+'\\u2013'+a.endTime).join(', ')||'\\u2014';
      const enc=encodeURIComponent(JSON.stringify(w));
      rows+='<tr><td><strong>'+esc(fullName(w))+'</strong></td>'+
        '<td>'+esc(w.phone||'\\u2014')+'</td><td>'+esc(w.email||'\\u2014')+'</td>'+
        '<td>'+(w.isActive?badge('Active','green'):badge('Inactive','gray'))+'</td>'+
        '<td><small>'+avail+'</small></td>'+
        '<td><button class="btn btn-sm btn-ghost" onclick="openWalkerModal(\\''+enc+'\\')">Edit</button></td></tr>';
    });
    main.innerHTML=
      '<div class="card"><div class="card-header"><h2>&#x1F6B6; Walkers ('+walkers.length+')</h2>'+
      '<button class="btn btn-primary" onclick="openWalkerModal()">+ Add Walker</button></div>'+
      '<div class="table-wrap"><table><thead><tr>'+
      '<th>Name</th><th>Phone</th><th>Email</th><th>Active</th><th>Availability</th><th>Actions</th></tr></thead>'+
      '<tbody>'+(rows||'<tr><td colspan="6" class="empty">No walkers.</td></tr>')+'</tbody></table></div></div>';
  } catch(e) { document.getElementById('main').innerHTML='<div class="card"><div class="empty" style="color:var(--danger)">'+esc(e.message)+'</div></div>'; }
}
var _walkerAvailEdits = [];
function openWalkerModal(encoded) {
  const w = encoded?JSON.parse(decodeURIComponent(encoded)):null;
  _walkerAvailEdits = w?JSON.parse(JSON.stringify(w.availability||[])):[];
  document.body.insertAdjacentHTML('beforeend',
    '<div class="modal-backdrop" id="walker-modal" onclick="closeModal(\\'walker-modal\\')">'+
    '<div class="modal" onclick="event.stopPropagation()"><h3>'+(w?'Edit Walker':'Add Walker')+'</h3>'+
    '<div class="form-row">'+
    '<div class="form-group"><label>First Name *</label><input id="wf-first" value="'+esc(w?w.firstName:'')+'"></div>'+
    '<div class="form-group"><label>Last Name *</label><input id="wf-last" value="'+esc(w?w.lastName:'')+'"></div>'+
    '</div>'+
    '<div class="form-row">'+
    '<div class="form-group"><label>Phone</label><input id="wf-phone" value="'+esc(w?w.phone||'':'')+'"></div>'+
    '<div class="form-group"><label>Email</label><input type="email" id="wf-email" value="'+esc(w?w.email||'':'')+'"></div>'+
    '</div>'+
    '<div class="form-group"><label>Bio</label><textarea id="wf-bio" rows="2">'+esc(w?w.bio||'':'')+'</textarea></div>'+
    '<div class="form-group"><label>Active</label><select id="wf-active">'+
    '<option value="true"'+(!w||w.isActive!==false?' selected':'')+'>Yes</option>'+
    '<option value="false"'+(w&&w.isActive===false?' selected':'')+'>No</option>'+
    '</select></div>'+
    '<div class="sub-section"><h4>&#x1F4C5; Availability Slots</h4>'+
    '<div id="wf-avail-list"></div>'+
    '<button class="btn btn-ghost btn-sm" style="margin-top:6px" onclick="addAvailRow()">+ Add Slot</button>'+
    '</div>'+
    '<div class="form-actions">'+
    '<button class="btn btn-ghost" onclick="closeModal(\\'walker-modal\\')">Cancel</button>'+
    '<button class="btn btn-primary" onclick="saveWalker(\\''+esc(w?w.ID:'')+'\\')">Save</button>'+
    '</div></div></div>');
  renderAvailList();
}
function renderAvailList() {
  const c=document.getElementById('wf-avail-list'); if (!c) return;
  if (!_walkerAvailEdits.length) { c.innerHTML='<div style="color:var(--text-muted);font-size:.85rem;margin-bottom:6px">No slots set.</div>'; return; }
  c.innerHTML=_walkerAvailEdits.map((av,i)=>{
    const dayOpts=[1,2,3,4,5,6,7].map(d=>'<option value="'+d+'"'+(av.dayOfWeek==d?' selected':'')+'>'+dayName(d)+'</option>').join('');
    return '<div class="avail-row">'+
      '<select onchange="updateAvail('+i+',\\'dayOfWeek\\',this.value)">'+dayOpts+'</select>'+
      '<input type="time" value="'+esc(av.startTime||'07:00')+'" onchange="updateAvail('+i+',\\'startTime\\',this.value)">'+
      '<span style="font-size:.8rem;color:var(--text-muted)">to</span>'+
      '<input type="time" value="'+esc(av.endTime||'12:00')+'" onchange="updateAvail('+i+',\\'endTime\\',this.value)">'+
      '<button class="btn btn-sm btn-danger" onclick="removeAvail('+i+')">&#x2715;</button>'+
      '</div>';
  }).join('');
}
function addAvailRow()     { _walkerAvailEdits.push({dayOfWeek:1,startTime:'07:00',endTime:'12:00'}); renderAvailList(); }
function removeAvail(i)    { _walkerAvailEdits.splice(i,1); renderAvailList(); }
function updateAvail(i,f,v){ _walkerAvailEdits[i][f]=f==='dayOfWeek'?parseInt(v):v; }
async function saveWalker(id) {
  const fn=document.getElementById('wf-first').value.trim();
  const ln=document.getElementById('wf-last').value.trim();
  if (!fn||!ln) return toast('First and last name required','error');
  const body={firstName:fn,lastName:ln,
    phone:document.getElementById('wf-phone').value.trim()||null,
    email:document.getElementById('wf-email').value.trim()||null,
    bio:document.getElementById('wf-bio').value.trim()||null,
    isActive:document.getElementById('wf-active').value==='true'};
  try {
    let wid=id;
    if (id) {
      await apiFetch('/Walkers/'+id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      toast('Walker updated!');
    } else {
      const cr=await apiFetch('/Walkers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      wid=cr.ID; toast('Walker added!');
    }
    if (wid) {
      if (id) {
        const ex=await apiFetch('/WalkerAvailability?$filter=walker_ID eq '+wid);
        for (const av of (ex.value||[])) await apiFetch('/WalkerAvailability/'+av.ID,{method:'DELETE'});
      }
      for (const av of _walkerAvailEdits) {
        await apiFetch('/WalkerAvailability',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({walker_ID:wid,dayOfWeek:av.dayOfWeek,startTime:av.startTime,endTime:av.endTime})});
      }
    }
    closeModal('walker-modal'); renderWalkers();
  } catch(e) { toast(e.message,'error'); }
}

// ─────────────────────────────────────────────────────────────────
//  CUSTOMERS  [D-10 fixed: address sub-section]
// ─────────────────────────────────────────────────────────────────
async function renderCustomers() {
  const main=document.getElementById('main');
  main.innerHTML='<div class="loading">Loading&hellip;</div>';
  try {
    const res=await apiFetch('/Customers?$expand=dogs,addresses&$orderby=firstName,lastName');
    const custs=res.value||[];
    let rows='';
    custs.forEach(c=>{
      const dogBadges=(c.dogs||[]).map(d=>'<span class="badge badge-green">'+esc(d.name)+'</span>').join(' ')||'\\u2014';
      const ac=(c.addresses||[]).length;
      const enc=encodeURIComponent(JSON.stringify(c));
      rows+='<tr><td><strong>'+esc(fullName(c))+'</strong></td>'+
        '<td>'+esc(c.phone||'\\u2014')+'</td><td>'+esc(c.email||'\\u2014')+'</td>'+
        '<td>'+formatDate(c.memberSince)+'</td><td>'+dogBadges+'</td>'+
        '<td>'+badge(ac,'blue')+'</td>'+
        '<td><button class="btn btn-sm btn-ghost" onclick="openCustModal(\\''+enc+'\\')">Edit</button></td></tr>';
    });
    main.innerHTML=
      '<div class="card"><div class="card-header"><h2>&#x1F465; Customers ('+custs.length+')</h2>'+
      '<button class="btn btn-primary" onclick="openCustModal()">+ Add Customer</button></div>'+
      '<div class="table-wrap"><table><thead><tr>'+
      '<th>Name</th><th>Phone</th><th>Email</th><th>Member Since</th><th>Dogs</th><th>Addrs</th><th>Actions</th></tr></thead>'+
      '<tbody>'+(rows||'<tr><td colspan="7" class="empty">No customers.</td></tr>')+'</tbody></table></div></div>';
  } catch(e) { document.getElementById('main').innerHTML='<div class="card"><div class="empty" style="color:var(--danger)">'+esc(e.message)+'</div></div>'; }
}
var _custAddrEdits=[];
function openCustModal(encoded) {
  const c=encoded?JSON.parse(decodeURIComponent(encoded)):null;
  _custAddrEdits=c?JSON.parse(JSON.stringify(c.addresses||[])):[];
  document.body.insertAdjacentHTML('beforeend',
    '<div class="modal-backdrop" id="cust-modal" onclick="closeModal(\\'cust-modal\\')">'+
    '<div class="modal" onclick="event.stopPropagation()"><h3>'+(c?'Edit Customer':'Add Customer')+'</h3>'+
    '<div class="form-row">'+
    '<div class="form-group"><label>First Name *</label><input id="cf-first" value="'+esc(c?c.firstName:'')+'"></div>'+
    '<div class="form-group"><label>Last Name *</label><input id="cf-last" value="'+esc(c?c.lastName:'')+'"></div>'+
    '</div>'+
    '<div class="form-row">'+
    '<div class="form-group"><label>Phone</label><input id="cf-phone" value="'+esc(c?c.phone||'':'')+'"></div>'+
    '<div class="form-group"><label>Email</label><input type="email" id="cf-email" value="'+esc(c?c.email||'':'')+'"></div>'+
    '</div>'+
    '<div class="form-group"><label>Member Since</label><input type="date" id="cf-since" value="'+esc(c?c.memberSince||'':'')+'"></div>'+
    '<div class="sub-section"><h4>&#x1F3E0; Addresses</h4>'+
    '<div id="cf-addr-list"></div>'+
    '<button class="btn btn-ghost btn-sm" style="margin-top:6px" onclick="addAddrRow()">+ Add Address</button>'+
    '</div>'+
    '<div class="form-actions">'+
    '<button class="btn btn-ghost" onclick="closeModal(\\'cust-modal\\')">Cancel</button>'+
    '<button class="btn btn-primary" onclick="saveCust(\\''+esc(c?c.ID:'')+'\\')">Save</button>'+
    '</div></div></div>');
  renderAddrList();
}
function renderAddrList() {
  const c=document.getElementById('cf-addr-list'); if (!c) return;
  if (!_custAddrEdits.length) { c.innerHTML='<div style="color:var(--text-muted);font-size:.85rem">No addresses.</div>'; return; }
  c.innerHTML=_custAddrEdits.map((a,i)=>
    '<div class="addr-block">'+
    '<div class="addr-grid">'+
    '<input placeholder="Street" value="'+esc(a.street||'')+'" oninput="updateAddr('+i+',\\'street\\',this.value)">'+
    '<input placeholder="City"   value="'+esc(a.city||'')+'"   oninput="updateAddr('+i+',\\'city\\',this.value)">'+
    '<input placeholder="State"  value="'+esc(a.state||'')+'"  oninput="updateAddr('+i+',\\'state\\',this.value)">'+
    '<input placeholder="ZIP"    value="'+esc(a.zip||'')+'"    oninput="updateAddr('+i+',\\'zip\\',this.value)">'+
    '</div>'+
    '<div class="addr-foot">'+
    '<label><input type="checkbox"'+(a.isPickup?' checked':'')+' onchange="updateAddr('+i+',\\'isPickup\\',this.checked)"> Pickup</label>'+
    '<label><input type="checkbox"'+(a.isDropoff?' checked':'')+' onchange="updateAddr('+i+',\\'isDropoff\\',this.checked)"> Dropoff</label>'+
    '<button class="btn btn-sm btn-danger" onclick="removeAddr('+i+')">Remove</button>'+
    '</div></div>'
  ).join('');
}
function addAddrRow()     { _custAddrEdits.push({street:'',city:'',state:'',zip:'',isPickup:true,isDropoff:true}); renderAddrList(); }
function removeAddr(i)    { _custAddrEdits.splice(i,1); renderAddrList(); }
function updateAddr(i,f,v){ _custAddrEdits[i][f]=v; }
async function saveCust(id) {
  const fn=document.getElementById('cf-first').value.trim();
  const ln=document.getElementById('cf-last').value.trim();
  if (!fn||!ln) return toast('First and last name required','error');
  const body={firstName:fn,lastName:ln,
    phone:document.getElementById('cf-phone').value.trim()||null,
    email:document.getElementById('cf-email').value.trim()||null,
    memberSince:document.getElementById('cf-since').value||null};
  try {
    let cid=id;
    if (id) {
      await apiFetch('/Customers/'+id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      toast('Customer updated!');
    } else {
      const cr=await apiFetch('/Customers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      cid=cr.ID; toast('Customer added!');
    }
    if (cid) {
      if (id) {
        const ex=await apiFetch('/Addresses?$filter=customer_ID eq '+cid);
        for (const a of (ex.value||[])) await apiFetch('/Addresses/'+a.ID,{method:'DELETE'});
      }
      for (const a of _custAddrEdits) {
        await apiFetch('/Addresses',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({customer_ID:cid,street:a.street||null,city:a.city||null,
            state:a.state||null,zip:a.zip||null,isPickup:!!a.isPickup,isDropoff:!!a.isDropoff})});
      }
    }
    closeModal('cust-modal'); renderCustomers();
  } catch(e) { toast(e.message,'error'); }
}

// ─────────────────────────────────────────────────────────────────
//  DOGS  [D-09 fixed: dog-friend pairs management]
// ─────────────────────────────────────────────────────────────────
var _dogCusts=[], _allDogs=[];
async function renderDogs() {
  const main=document.getElementById('main');
  main.innerHTML='<div class="loading">Loading&hellip;</div>';
  try {
    const [dr,cr]=await Promise.all([
      apiFetch('/Dogs?$expand=owner&$orderby=name'),
      apiFetch('/Customers?$orderby=firstName,lastName'),
    ]);
    _allDogs=dr.value||[];
    _dogCusts=cr.value||[];
    let rows='';
    _allDogs.forEach(d=>{
      const enc=encodeURIComponent(JSON.stringify(d));
      rows+='<tr><td><strong>'+esc(d.name)+'</strong></td><td>'+esc(d.breed||'\\u2014')+'</td>'+
        '<td>'+esc(d.color||'\\u2014')+'</td>'+
        '<td>'+(d.weight!=null?d.weight+' lb':'\\u2014')+'</td>'+
        '<td>'+formatDate(d.dateOfBirth)+'</td><td>'+esc(fullName(d.owner)||'\\u2014')+'</td>'+
        '<td><small>'+esc(d.notes||'\\u2014')+'</small></td>'+
        '<td>'+
        '<button class="btn btn-sm btn-ghost" onclick="openDogModal(\\''+enc+'\\')">Edit</button> '+
        '<button class="btn btn-sm btn-ghost" onclick="openFriendsModal(\\''+enc+'\\')">&#x1F43E; Friends</button>'+
        '</td></tr>';
    });
    main.innerHTML=
      '<div class="card"><div class="card-header"><h2>&#x1F436; Dogs ('+_allDogs.length+')</h2>'+
      '<button class="btn btn-primary" onclick="openDogModal()">+ Add Dog</button></div>'+
      '<div class="table-wrap"><table><thead><tr>'+
      '<th>Name</th><th>Breed</th><th>Color</th><th>Weight</th><th>Born</th><th>Owner</th><th>Notes</th><th>Actions</th>'+
      '</tr></thead><tbody>'+(rows||'<tr><td colspan="8" class="empty">No dogs.</td></tr>')+'</tbody></table></div></div>';
  } catch(e) { document.getElementById('main').innerHTML='<div class="card"><div class="empty" style="color:var(--danger)">'+esc(e.message)+'</div></div>'; }
}
function openDogModal(encoded) {
  const d=encoded?JSON.parse(decodeURIComponent(encoded)):null;
  const cOpts=_dogCusts.map(c=>'<option value="'+esc(c.ID)+'"'+(d&&d.owner_ID===c.ID?' selected':'')+'>'+esc(fullName(c))+'</option>').join('');
  document.body.insertAdjacentHTML('beforeend',
    '<div class="modal-backdrop" id="dog-modal" onclick="closeModal(\\'dog-modal\\')">'+
    '<div class="modal" onclick="event.stopPropagation()"><h3>'+(d?'Edit Dog':'Add Dog')+'</h3>'+
    '<div class="form-row">'+
    '<div class="form-group"><label>Name *</label><input id="df-name" value="'+esc(d?d.name:'')+'"></div>'+
    '<div class="form-group"><label>Breed</label><input id="df-breed" value="'+esc(d?d.breed||'':'')+'"></div>'+
    '</div>'+
    '<div class="form-row">'+
    '<div class="form-group"><label>Color</label><input id="df-color" value="'+esc(d?d.color||'':'')+'"></div>'+
    '<div class="form-group"><label>Weight (lb)</label><input id="df-weight" type="number" min="0" step="0.1" value="'+esc(d&&d.weight!=null?d.weight:'')+'"></div>'+
    '</div>'+
    '<div class="form-row">'+
    '<div class="form-group"><label>Date of Birth</label><input type="date" id="df-dob" value="'+esc(d?d.dateOfBirth||'':'')+'"></div>'+
    '<div class="form-group"><label>License No.</label><input id="df-lic" value="'+esc(d?d.licenseNo||'':'')+'"></div>'+
    '</div>'+
    '<div class="form-group"><label>Owner</label><select id="df-owner"><option value="">\\u2014 Select Owner \\u2014</option>'+cOpts+'</select></div>'+
    '<div class="form-group"><label>Notes</label><textarea id="df-notes" rows="2">'+esc(d?d.notes||'':'')+'</textarea></div>'+
    '<div class="form-actions">'+
    '<button class="btn btn-ghost" onclick="closeModal(\\'dog-modal\\')">Cancel</button>'+
    '<button class="btn btn-primary" onclick="saveDog(\\''+esc(d?d.ID:'')+'\\')">Save</button>'+
    '</div></div></div>');
}
async function saveDog(id) {
  const name=document.getElementById('df-name').value.trim();
  if (!name) return toast('Name required','error');
  const wt=parseFloat(document.getElementById('df-weight').value);
  const body={name,
    breed:document.getElementById('df-breed').value.trim()||null,
    color:document.getElementById('df-color').value.trim()||null,
    weight:isNaN(wt)?null:wt,
    dateOfBirth:document.getElementById('df-dob').value||null,
    licenseNo:document.getElementById('df-lic').value.trim()||null,
    owner_ID:document.getElementById('df-owner').value||null,
    notes:document.getElementById('df-notes').value.trim()||null};
  try {
    if (id) { await apiFetch('/Dogs/'+id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); toast('Dog updated!'); }
    else     { await apiFetch('/Dogs',    {method:'POST', headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); toast('Dog added!'); }
    closeModal('dog-modal'); renderDogs();
  } catch(e) { toast(e.message,'error'); }
}
async function openFriendsModal(encoded) {
  const dog=JSON.parse(decodeURIComponent(encoded));
  let friends=[];
  try { const r=await apiFetch('/DogFriends?$filter=dog_ID eq '+dog.ID+'&$expand=friend'); friends=r.value||[]; } catch(_){}
  const friendIds=new Set(friends.map(f=>f.friend_ID||(f.friend&&f.friend.ID)).filter(Boolean));
  const otherDogs=_allDogs.filter(d=>d.ID!==dog.ID&&!friendIds.has(d.ID));
  const dogOpts=otherDogs.map(d=>'<option value="'+esc(d.ID)+'">'+esc(d.name)+' ('+esc(fullName(d.owner))+')</option>').join('');
  const chips=friends.map(f=>{
    const fn=f.friend?f.friend.name:(f.friend_ID||'?');
    return '<span class="friend-chip">'+esc(fn)+'<button onclick="removeFriend(\\''+f.ID+'\\',\\''+dog.ID+'\\',\\''+encodeURIComponent(dog.name)+'\\')">&#x2715;</button></span>';
  }).join('');
  document.body.insertAdjacentHTML('beforeend',
    '<div class="modal-backdrop" id="friends-modal" onclick="closeModal(\\'friends-modal\\')">'+
    '<div class="modal" onclick="event.stopPropagation()">'+
    '<h3>&#x1F43E; Friends of '+esc(dog.name)+'</h3>'+
    '<div style="margin-bottom:12px"><div style="font-size:.85rem;color:var(--text-muted);margin-bottom:6px">Current friends:</div>'+
    '<div id="friends-chips">'+(chips||'<span style="color:var(--text-muted);font-size:.85rem">No friends yet.</span>')+'</div></div>'+
    '<div class="form-group"><label>Add Friend</label><select id="ff-dog"><option value="">\\u2014 Select dog \\u2014</option>'+dogOpts+'</select></div>'+
    '<div class="form-actions">'+
    '<button class="btn btn-ghost" onclick="closeModal(\\'friends-modal\\')">Close</button>'+
    '<button class="btn btn-primary" onclick="addFriend(\\''+esc(dog.ID)+'\\',\\''+encodeURIComponent(JSON.stringify(dog))+'\\')">Add Friend</button>'+
    '</div></div></div>');
}
async function addFriend(dogId, dogEncoded) {
  const fid=document.getElementById('ff-dog').value;
  if (!fid) return toast('Select a dog first','error');
  try {
    await apiFetch('/DogFriends',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({dog_ID:dogId,friend_ID:fid})});
    toast('Friend added!');
    closeModal('friends-modal');
    const freshDog=_allDogs.find(d=>d.ID===dogId)||JSON.parse(decodeURIComponent(dogEncoded));
    openFriendsModal(encodeURIComponent(JSON.stringify(freshDog)));
  } catch(e) { toast(e.message,'error'); }
}
async function removeFriend(rowId, dogId, dogNameEnc) {
  if (!confirm('Remove this friend pair?')) return;
  try {
    await apiFetch('/DogFriends/'+rowId,{method:'DELETE'});
    toast('Friend removed.');
    closeModal('friends-modal');
    const freshDog=_allDogs.find(d=>d.ID===dogId)||{ID:dogId,name:decodeURIComponent(dogNameEnc)};
    openFriendsModal(encodeURIComponent(JSON.stringify(freshDog)));
  } catch(e) { toast(e.message,'error'); }
}

// ─────────────────────────────────────────────────────────────────
//  BILLING
// ─────────────────────────────────────────────────────────────────
async function renderBilling() {
  const main=document.getElementById('main');
  main.innerHTML='<div class="loading">Loading&hellip;</div>';
  try {
    const res=await apiFetch('/BillingRecords?$expand=appointment($expand=customer,walker)&$orderby=issuedAt desc');
    const recs=res.value||[];
    let ta=0, pa=0;
    recs.forEach(r=>{ ta+=(r.amount||0); if(r.status==='paid') pa+=(r.amount||0); });
    let rows='';
    recs.forEach(r=>{
      const cn=fullName(r.appointment&&r.appointment.customer);
      const wn=fullName(r.appointment&&r.appointment.walker);
      const btn=r.status!=='paid'?'<button class="btn btn-sm btn-primary" onclick="markPaid(\\''+r.ID+'\\')">Mark Paid</button>':'';
      rows+='<tr><td>'+formatDateTime(r.issuedAt)+'</td>'+
        '<td>'+esc(cn||'\\u2014')+'</td><td>'+esc(wn||'\\u2014')+'</td>'+
        '<td><strong>'+fmtMoney(r.amount)+'</strong></td>'+
        '<td>'+statusBadge(r.status)+'</td><td>'+esc(r.method||'\\u2014')+'</td>'+
        '<td>'+btn+'</td></tr>';
    });
    main.innerHTML=
      '<div class="stats-row">'+
      '<div class="stat-card"><div class="num">'+recs.length+'</div><div class="lbl">Invoices</div></div>'+
      '<div class="stat-card"><div class="num">'+fmtMoney(ta)+'</div><div class="lbl">Total Billed</div></div>'+
      '<div class="stat-card"><div class="num">'+fmtMoney(pa)+'</div><div class="lbl">Collected</div></div>'+
      '<div class="stat-card"><div class="num">'+fmtMoney(ta-pa)+'</div><div class="lbl">Outstanding</div></div>'+
      '</div>'+
      '<div class="card"><div class="card-header"><h2>&#x1F4B0; Billing Records</h2></div>'+
      '<div class="table-wrap"><table><thead><tr>'+
      '<th>Issued</th><th>Customer</th><th>Walker</th><th>Amount</th><th>Status</th><th>Method</th><th>Actions</th>'+
      '</tr></thead><tbody>'+(rows||'<tr><td colspan="7" class="empty">No records.</td></tr>')+'</tbody></table></div></div>';
  } catch(e) { document.getElementById('main').innerHTML='<div class="card"><div class="empty" style="color:var(--danger)">'+esc(e
__exit=$?
echo "__cwd_cmd-1781198869659-osb9ycn8ox__=$(pwd)"
exit $__exit.message)+'</div></div>'; }
}
async function markPaid(id) {
  try {
    await apiFetch('/BillingRecords/'+id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'paid'})});
    toast('Marked as paid!'); renderBilling();
  } catch(e) { toast(e.message,'error'); }
}

// ─────────────────────────────────────────────────────────────────
//  CONFIRMATIONS  [D-16 fixed: show conf ID + appointment date]
// ─────────────────────────────────────────────────────────────────
async function renderConfirmations() {
  const main=document.getElementById('main');
  main.innerHTML='<div class="loading">Loading&hellip;</div>';
  try {
    const res=await apiFetch('/Confirmations?$expand=appointment($expand=customer,walker)&$orderby=confirmedAt desc');
    const confs=res.value||[];
    let rows='';
    confs.forEach(c=>{
      const cn=fullName(c.appointment&&c.appointment.customer);
      const wn=fullName(c.appointment&&c.appointment.walker);
      const apptDate=c.appointment?c.appointment.date:'';
      const confNum=c.ID?c.ID.slice(0,8).toUpperCase():'';
      rows+='<tr>'+
        '<td class="conf-num">'+esc(confNum)+'</td>'+
        '<td>'+formatDateTime(c.confirmedAt)+'</td>'+
        '<td>'+esc(cn||'\\u2014')+'</td>'+
        '<td>'+esc(wn||'\\u2014')+'</td>'+
        '<td>'+formatDate(apptDate)+'</td>'+
        '<td>'+badge(c.method||'email','gray')+'</td>'+
        '<td>'+badge('Confirmed','green')+'</td>'+
        '</tr>';
    });
    main.innerHTML=
      '<div class="card"><div class="card-header"><h2>&#x2705; Confirmations ('+confs.length+')</h2></div>'+
      '<div class="table-wrap"><table><thead><tr>'+
      '<th>Conf #</th><th>Confirmed At</th><th>Customer</th><th>Walker</th><th>Appt Date</th><th>Method</th><th>Status</th>'+
      '</tr></thead><tbody>'+(rows||'<tr><td colspan="7" class="empty">No confirmations yet.</td></tr>')+'</tbody></table></div></div>';
  } catch(e) { document.getElementById('main').innerHTML='<div class="card"><div class="empty" style="color:var(--danger)">'+esc(e.message)+'</div></div>'; }
}

// ─────────────────────────────────────────────────────────────────
//  BOOT
// ─────────────────────────────────────────────────────────────────
buildNav();
navigate('schedule');
`;

const FOOTER = `
</script>
</body>
</html>
`;

const full = SHELL + JS + FOOTER;
fs.writeFileSync(dest, full, 'utf8');
console.log('Written:', dest, '—', full.length, 'bytes');
