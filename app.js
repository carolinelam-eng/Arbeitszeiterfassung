import { seed, getEmployees, getEmployee, saveEmployee, deleteEmployee, getEntries, saveEntry, deleteEntry, getSetting, setSetting } from './db.js';
import { TYPES, deriveStatus, availableActions, entriesByDay, calculateDay, formatMinutes, formatClock, formatDate, weekStart, escapeCsv, dayKey } from './time.js';

const app = document.querySelector('#app');
let adminUnlocked = false;

const icon = (name) => ({
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4.3 3.4-6.5 8-6.5s7.2 2.2 8 6.5"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  admin: '<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>',
  chart: '<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>'
}[name] || '');

function shell(content, {back=null, admin=true}={}) {
  return `<div class="page-shell">
    <header class="topbar">
      <div class="brand"><div class="brand-mark">${icon('clock')}</div><div><strong>Arbeitszeit</strong><span>Terminal</span></div></div>
      <div class="top-actions">
        ${back ? `<button class="icon-btn" data-nav="${back}" aria-label="Zurück">${icon('back')}</button>` : ''}
        ${admin ? `<button class="admin-link" data-nav="#/admin">${icon('admin')} Admin</button>` : ''}
      </div>
    </header>
    <main>${content}</main>
  </div>`;
}

function toast(message) {
  const old = document.querySelector('.toast'); if (old) old.remove();
  const el = document.createElement('div'); el.className='toast'; el.textContent=message; document.body.appendChild(el);
  setTimeout(()=>el.classList.add('show'),10); setTimeout(()=>{el.classList.remove('show'); setTimeout(()=>el.remove(),250)},2200);
}

async function home() {
  const employees = await getEmployees(true);
  app.innerHTML = shell(`<section class="hero">
      <p class="eyebrow">Mitarbeiterauswahl</p>
      <h1>Wer stempelt gerade?</h1>
      <p>Wähle deinen Namen aus.</p>
    </section>
    <section class="employee-grid">
      ${employees.map(e=>`<button class="employee-card" data-nav="#/employee/${e.id}">
        <span class="avatar">${e.name.trim().split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase()}</span>
        <span class="employee-name">${escapeHtml(e.name)}</span>
        <span class="employee-sub">Arbeitszeit erfassen</span>
      </button>`).join('') || `<div class="empty-card">Noch keine aktiven Mitarbeiter. Öffne den Adminbereich, um Mitarbeiter anzulegen.</div>`}
    </section>`);
  bindNav();
}

async function employeePanel(id) {
  const employee = await getEmployee(id); if (!employee) return navigate('#/');
  const all = await getEntries(id);
  const today = all.filter(e=>dayKey(e.timestamp)===dayKey(new Date()));
  const status = deriveStatus(today);
  const actions = availableActions(status);
  const statusText = status==='working' ? 'Arbeitet gerade' : status==='break' ? 'In Pause' : 'Nicht eingestempelt';
  const statusClass = status==='working' ? 'working' : status==='break' ? 'pause' : 'off';
  app.innerHTML = shell(`<section class="person-head">
    <div><p class="eyebrow">${escapeHtml(employee.name)}</p><h1>Zeit erfassen</h1></div>
    <span class="status-pill ${statusClass}"><i></i>${statusText}</span>
  </section>
  <section class="action-card">
    <div class="current-time"><span>Aktuelle Uhrzeit</span><strong id="liveClock">${currentClock()}</strong></div>
    <div class="action-grid ${actions.length===1?'single':''}">
      ${actions.map(type=>`<button class="stamp-btn ${type}" data-stamp="${type}" data-id="${id}"><span>${TYPES[type]}</span><small>${actionHint(type)}</small></button>`).join('')}
    </div>
  </section>
  <button class="overview-link" data-nav="#/overview/${id}">${icon('chart')} Meine Arbeitsübersicht ansehen</button>`, {back:'#/'});
  bindNav();
  document.querySelectorAll('[data-stamp]').forEach(b=>b.addEventListener('click', stamp));
  const timer=setInterval(()=>{const el=document.querySelector('#liveClock'); if(el) el.textContent=currentClock(); else clearInterval(timer)},1000);
}

async function stamp(ev) {
  const btn=ev.currentTarget; btn.disabled=true;
  const type=btn.dataset.stamp, employeeId=btn.dataset.id;
  await saveEntry({id:crypto.randomUUID(),employeeId,type,timestamp:new Date().toISOString(),edited:false,editedAt:null});
  toast(`${TYPES[type]} erfasst – ${currentClock()}`);
  const seconds = Number(await getSetting('resetSeconds')) || 3;
  setTimeout(()=>navigate('#/'), seconds*1000);
}

async function overview(id) {
  const employee=await getEmployee(id); if(!employee) return navigate('#/');
  const entries=await getEntries(id); const byDay=entriesByDay(entries); const todayKey=dayKey(new Date());
  const todayCalc=calculateDay(byDay.get(todayKey)||[]);
  const ws=weekStart(); const we=new Date(ws); we.setDate(we.getDate()+7);
  let weekMinutes=0;
  [...byDay].forEach(([key,list])=>{const d=new Date(key+'T12:00:00'); if(d>=ws&&d<we) weekMinutes += calculateDay(list).workMinutes;});
  const dailyTarget=Number(employee.dailyTargetMinutes)||0, weeklyTarget=Number(employee.weeklyTargetMinutes)||0;
  const recent=[...byDay.entries()].sort((a,b)=>b[0].localeCompare(a[0])).slice(0,14);
  app.innerHTML=shell(`<section class="person-head"><div><p class="eyebrow">${escapeHtml(employee.name)}</p><h1>Arbeitsübersicht</h1></div></section>
  <section class="stats-grid">
    ${statCard('Heute',todayCalc.workMinutes,dailyTarget)}
    ${statCard('Diese Woche',weekMinutes,weeklyTarget)}
  </section>
  <section class="table-card"><div class="section-title"><div><p class="eyebrow">Letzte Tage</p><h2>Arbeitszeiten</h2></div></div>
    <div class="responsive-table"><table><thead><tr><th>Datum</th><th>Beginn</th><th>Pause</th><th>Ende</th><th>Arbeitszeit</th></tr></thead><tbody>
    ${recent.map(([key,list])=>{const calc=calculateDay(list); const first=list.find(x=>x.type==='clock_in'); const last=[...list].reverse().find(x=>x.type==='clock_out'); return `<tr><td>${formatDate(key+'T12:00:00')}</td><td>${first?formatClock(first.timestamp):'–'}</td><td>${formatMinutes(calc.breakMinutes)}</td><td>${last?formatClock(last.timestamp):'–'}</td><td><strong>${formatMinutes(calc.workMinutes)}</strong></td></tr>`}).join('') || `<tr><td colspan="5" class="muted">Noch keine Arbeitszeiten erfasst.</td></tr>`}
    </tbody></table></div></section>`,{back:`#/employee/${id}`});
  bindNav();
}

function statCard(label, actual, target) {
  const diff=actual-target;
  return `<div class="stat-card"><span>${label}</span><strong>${formatMinutes(actual)}</strong><div class="stat-row"><small>Soll</small><b>${target ? formatMinutes(target) : 'nicht festgelegt'}</b></div>${target?`<div class="stat-row"><small>Differenz</small><b class="${diff<0?'negative':'positive'}">${formatMinutes(diff,true)}</b></div>`:''}</div>`;
}

async function admin() {
  if(!adminUnlocked) return adminLogin();
  const employees=await getEmployees(false);
  const entries=await getEntries();
  app.innerHTML=shell(`<section class="admin-head"><div><p class="eyebrow">Geschützter Bereich</p><h1>Admin-Dashboard</h1></div><button class="secondary-btn" id="lockAdmin">Sperren</button></section>
  <nav class="tabs"><button class="tab active" data-tab="times">Arbeitszeiten</button><button class="tab" data-tab="employees">Mitarbeiter</button><button class="tab" data-tab="export">CSV-Export</button><button class="tab" data-tab="settings">Einstellungen</button></nav>
  <section id="adminContent"></section>`,{back:'#/',admin:false});
  bindNav();
  document.querySelector('#lockAdmin').onclick=()=>{adminUnlocked=false;admin();};
  document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>switchAdminTab(t.dataset.tab, employees, entries));
  await renderTimes(employees,entries);
}

function adminLogin() {
  app.innerHTML=shell(`<section class="login-wrap"><div class="login-card"><div class="lock-circle">${icon('admin')}</div><p class="eyebrow">Admin</p><h1>PIN eingeben</h1><p>Der Adminbereich ist geschützt.</p><form id="pinForm"><input id="pin" class="pin-input" type="password" inputmode="numeric" maxlength="12" autocomplete="off" placeholder="••••" autofocus><button class="primary-btn" type="submit">Entsperren</button><p id="pinError" class="form-error"></p></form><small>Standard-PIN bei der ersten Nutzung: 2468</small></div></section>`,{back:'#/',admin:false});
  bindNav();
  document.querySelector('#pinForm').onsubmit=async e=>{e.preventDefault(); const ok=document.querySelector('#pin').value===String(await getSetting('adminPin')); if(ok){adminUnlocked=true;admin();}else document.querySelector('#pinError').textContent='PIN ist nicht korrekt.';};
}

async function switchAdminTab(tab, employees, entries) {
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===tab));
  if(tab==='times') return renderTimes(employees,await getEntries());
  if(tab==='employees') return renderEmployees(await getEmployees(false));
  if(tab==='export') return renderExport(await getEmployees(false));
  if(tab==='settings') return renderSettings();
}

async function renderTimes(employees, entries) {
  const content=document.querySelector('#adminContent'); if(!content) return;
  const now=new Date();
  content.innerHTML=`<div class="filter-card"><div class="field"><label>Mitarbeiter</label><select id="timeEmployee"><option value="all">Alle Mitarbeiter</option>${employees.map(e=>`<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('')}</select></div><div class="field"><label>Monat</label><input id="timeMonth" type="month" value="${now.toISOString().slice(0,7)}"></div><button class="primary-btn compact" id="addEntry">+ Buchung ergänzen</button></div><div id="timeTable"></div>`;
  const refresh=async()=>{
    const emp=document.querySelector('#timeEmployee').value, month=document.querySelector('#timeMonth').value;
    const rows=(await getEntries()).filter(e=>(emp==='all'||e.employeeId===emp)&&e.timestamp.slice(0,7)===month).sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
    document.querySelector('#timeTable').innerHTML=`<section class="table-card"><div class="responsive-table"><table><thead><tr><th>Mitarbeiter</th><th>Datum</th><th>Aktion</th><th>Uhrzeit</th><th></th></tr></thead><tbody>${rows.map(e=>{const employee=employees.find(x=>x.id===e.employeeId);return `<tr><td>${escapeHtml(employee?.name||'Unbekannt')}</td><td>${formatDate(e.timestamp)}</td><td>${TYPES[e.type]}</td><td>${formatClock(e.timestamp)}${e.edited?' <span class="edited">korrigiert</span>':''}</td><td class="row-actions"><button class="text-btn" data-edit-entry="${e.id}">Bearbeiten</button><button class="text-btn danger" data-delete-entry="${e.id}">Löschen</button></td></tr>`}).join('')||`<tr><td colspan="5" class="muted">Keine Buchungen für diesen Filter.</td></tr>`}</tbody></table></div></section>`;
    document.querySelectorAll('[data-edit-entry]').forEach(b=>b.onclick=()=>entryModal(b.dataset.editEntry,employees,refresh));
    document.querySelectorAll('[data-delete-entry]').forEach(b=>b.onclick=async()=>{if(confirm('Diese Zeitbuchung wirklich löschen?')){await deleteEntry(b.dataset.deleteEntry);refresh();}});
  };
  document.querySelector('#timeEmployee').onchange=refresh; document.querySelector('#timeMonth').onchange=refresh; document.querySelector('#addEntry').onclick=()=>entryModal(null,employees,refresh); refresh();
}

async function entryModal(id,employees,onDone) {
  const all=await getEntries(); const entry=id?all.find(x=>x.id===id):null; const now=new Date();
  const local = entry ? toLocalInput(entry.timestamp) : toLocalInput(now.toISOString());
  modal(`<h2>${entry?'Buchung bearbeiten':'Buchung ergänzen'}</h2><form id="entryForm" class="form-grid"><div class="field"><label>Mitarbeiter</label><select id="entryEmployee">${employees.filter(e=>e.active||e.id===entry?.employeeId).map(e=>`<option value="${e.id}" ${e.id===entry?.employeeId?'selected':''}>${escapeHtml(e.name)}</option>`).join('')}</select></div><div class="field"><label>Aktion</label><select id="entryType">${Object.entries(TYPES).map(([k,v])=>`<option value="${k}" ${k===entry?.type?'selected':''}>${v}</option>`).join('')}</select></div><div class="field full"><label>Datum & Uhrzeit</label><input id="entryTime" type="datetime-local" value="${local}" required></div><div class="modal-actions full"><button type="button" class="secondary-btn" data-close-modal>Abbrechen</button><button class="primary-btn">Speichern</button></div></form>`);
  document.querySelector('#entryForm').onsubmit=async e=>{e.preventDefault(); await saveEntry({id:entry?.id||crypto.randomUUID(),employeeId:document.querySelector('#entryEmployee').value,type:document.querySelector('#entryType').value,timestamp:new Date(document.querySelector('#entryTime').value).toISOString(),edited:Boolean(entry),editedAt:entry?new Date().toISOString():null}); closeModal(); toast('Buchung gespeichert.'); await onDone();};
}

function renderEmployees(employees) {
  const content=document.querySelector('#adminContent');
  content.innerHTML=`<div class="section-toolbar"><div><p class="eyebrow">Team</p><h2>Mitarbeiter verwalten</h2></div><button class="primary-btn compact" id="newEmployee">+ Mitarbeiter</button></div><section class="employee-admin-grid">${employees.map(e=>`<div class="employee-admin-card ${e.active?'':'inactive'}"><div class="avatar small">${e.name.trim().split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase()}</div><div class="grow"><strong>${escapeHtml(e.name)}</strong><span>${e.active?'Aktiv':'Deaktiviert'}</span><small>Soll/Tag: ${e.dailyTargetMinutes?formatMinutes(e.dailyTargetMinutes):'–'} · Soll/Woche: ${e.weeklyTargetMinutes?formatMinutes(e.weeklyTargetMinutes):'–'}</small></div><button class="text-btn" data-edit-employee="${e.id}">Bearbeiten</button></div>`).join('')}</section>`;
  document.querySelector('#newEmployee').onclick=()=>employeeModal(null,employees);
  document.querySelectorAll('[data-edit-employee]').forEach(b=>b.onclick=()=>employeeModal(employees.find(e=>e.id===b.dataset.editEmployee),employees));
}

function employeeModal(employee,employees) {
  modal(`<h2>${employee?'Mitarbeiter bearbeiten':'Mitarbeiter anlegen'}</h2><form id="employeeForm" class="form-grid"><div class="field full"><label>Name</label><input id="employeeName" value="${escapeAttr(employee?.name||'')}" required></div><div class="field"><label>Sollzeit pro Tag</label><input id="dailyTarget" type="time" value="${minutesToTime(employee?.dailyTargetMinutes||0)}"></div><div class="field"><label>Sollzeit pro Woche</label><input id="weeklyTarget" type="time" value="${minutesToTime(employee?.weeklyTargetMinutes||0)}"></div><label class="check-row full"><input id="employeeActive" type="checkbox" ${employee?.active!==false?'checked':''}><span>Aktiv und auf dem Terminal sichtbar</span></label><div class="modal-actions full">${employee?`<button type="button" class="text-btn danger" id="deleteEmployee">Löschen</button>`:''}<span class="grow"></span><button type="button" class="secondary-btn" data-close-modal>Abbrechen</button><button class="primary-btn">Speichern</button></div></form>`);
  document.querySelector('#employeeForm').onsubmit=async e=>{e.preventDefault();const name=document.querySelector('#employeeName').value.trim(); if(!name)return; await saveEmployee({id:employee?.id||crypto.randomUUID(),name,dailyTargetMinutes:timeToMinutes(document.querySelector('#dailyTarget').value),weeklyTargetMinutes:timeToMinutes(document.querySelector('#weeklyTarget').value),active:document.querySelector('#employeeActive').checked,sortOrder:employee?.sortOrder??employees.length}); closeModal(); toast('Mitarbeiter gespeichert.'); renderEmployees(await getEmployees(false));};
  const del=document.querySelector('#deleteEmployee'); if(del) del.onclick=async()=>{try{if(confirm('Mitarbeiter wirklich löschen?')){await deleteEmployee(employee.id);closeModal();renderEmployees(await getEmployees(false));}}catch(err){alert(err.message)}};
}

function renderExport(employees) {
  const content=document.querySelector('#adminContent'), now=new Date();
  content.innerHTML=`<section class="export-card"><div><p class="eyebrow">Monatsübersicht</p><h2>CSV exportieren</h2><p>Erstelle eine Monatsübersicht für einen Mitarbeiter mit Arbeitsbeginn, Pausen, Arbeitsende, Ist, Soll und Differenz.</p></div><div class="form-grid"><div class="field"><label>Mitarbeiter</label><select id="exportEmployee">${employees.filter(e=>e.active).map(e=>`<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('')}</select></div><div class="field"><label>Monat</label><input id="exportMonth" type="month" value="${now.toISOString().slice(0,7)}"></div><div class="full"><button class="primary-btn" id="downloadCsv">Monatsübersicht herunterladen</button></div></div></section>`;
  document.querySelector('#downloadCsv').onclick=downloadCsv;
}

async function downloadCsv() {
  const employee=await getEmployee(document.querySelector('#exportEmployee').value); const month=document.querySelector('#exportMonth').value; if(!employee)return;
  const entries=(await getEntries(employee.id)).filter(e=>e.timestamp.slice(0,7)===month); const map=entriesByDay(entries);
  let actualTotal=0,targetTotal=0; const lines=[['Mitarbeiter','Datum','Arbeitsbeginn','Pausen','Arbeitsende','Pausenzeit','Arbeitszeit','Sollzeit','Differenz']];
  for(const [key,list] of [...map.entries()].sort((a,b)=>a[0].localeCompare(b[0]))) {
    const calc=calculateDay(list), first=list.find(e=>e.type==='clock_in'), last=[...list].reverse().find(e=>e.type==='clock_out'); const breaks=buildBreakRanges(list); const target=isWeekday(key)?Number(employee.dailyTargetMinutes)||0:0; actualTotal+=calc.workMinutes;targetTotal+=target;
    lines.push([employee.name,formatDate(key+'T12:00:00'),first?formatClock(first.timestamp):'',breaks,last?formatClock(last.timestamp):'',formatMinutes(calc.breakMinutes),formatMinutes(calc.workMinutes),target?formatMinutes(target):'',target?formatMinutes(calc.workMinutes-target,true):'']);
  }
  lines.push([]);lines.push(['Monatssumme','','','','','',formatMinutes(actualTotal),formatMinutes(targetTotal),formatMinutes(actualTotal-targetTotal,true)]);
  const csv='\uFEFF'+lines.map(r=>r.map(escapeCsv).join(';')).join('\r\n'); const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}); const url=URL.createObjectURL(blob); const a=document.createElement('a');a.href=url;a.download=`Arbeitszeit_${safeFile(employee.name)}_${month}.csv`;a.click();URL.revokeObjectURL(url);toast('CSV wurde erstellt.');
}

async function renderSettings() {
  const content=document.querySelector('#adminContent'); const reset=await getSetting('resetSeconds'), pin=await getSetting('adminPin');
  content.innerHTML=`<section class="settings-card"><div><p class="eyebrow">Terminal</p><h2>Einstellungen</h2></div><form id="settingsForm" class="form-grid"><div class="field"><label>Admin-PIN</label><input id="settingsPin" type="password" inputmode="numeric" value="${escapeAttr(String(pin||''))}" required></div><div class="field"><label>Rücksprung nach Buchung</label><select id="resetSeconds">${[2,3,4,5,8,10].map(x=>`<option value="${x}" ${Number(reset)===x?'selected':''}>${x} Sekunden</option>`).join('')}</select></div><div class="full"><button class="primary-btn">Einstellungen speichern</button></div></form></section>`;
  document.querySelector('#settingsForm').onsubmit=async e=>{e.preventDefault();await setSetting('adminPin',document.querySelector('#settingsPin').value);await setSetting('resetSeconds',Number(document.querySelector('#resetSeconds').value));toast('Einstellungen gespeichert.');};
}

function modal(html) { const el=document.createElement('div');el.className='modal-backdrop';el.innerHTML=`<div class="modal">${html}</div>`;document.body.appendChild(el);el.querySelectorAll('[data-close-modal]').forEach(b=>b.onclick=closeModal);el.addEventListener('click',e=>{if(e.target===el)closeModal()}); }
function closeModal(){document.querySelector('.modal-backdrop')?.remove();}
function bindNav(){document.querySelectorAll('[data-nav]').forEach(el=>el.onclick=()=>navigate(el.dataset.nav));}
function navigate(hash){ if(location.hash===hash){route()} else location.hash=hash; }
function currentClock(){return new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date());}
function actionHint(type){return ({clock_in:'Jetzt einstempeln',break_start:'Arbeitszeit pausieren',break_end:'Weiterarbeiten',clock_out:'Für heute ausstempeln'})[type]||'';}
function minutesToTime(m){m=Number(m)||0;return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;}
function timeToMinutes(s){if(!s)return 0;const[h,m]=s.split(':').map(Number);return h*60+m;}
function toLocalInput(iso){const d=new Date(iso),off=d.getTimezoneOffset();return new Date(d.getTime()-off*60000).toISOString().slice(0,16);}
function isWeekday(key){const day=new Date(key+'T12:00:00').getDay();return day>=1&&day<=5;}
function buildBreakRanges(list){const out=[];let start=null;for(const e of list){if(e.type==='break_start')start=e.timestamp;if(e.type==='break_end'&&start){out.push(`${formatClock(start)}–${formatClock(e.timestamp)}`);start=null;}}if(start)out.push(`${formatClock(start)}–offen`);return out.join(', ');}
function safeFile(s){return s.replace(/[^a-zA-Z0-9äöüÄÖÜß_-]+/g,'_');}
function escapeHtml(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function escapeAttr(s=''){return escapeHtml(s);}

async function route(){const h=location.hash||'#/';const parts=h.replace('#/','').split('/'); if(parts[0]==='employee'&&parts[1])return employeePanel(parts[1]); if(parts[0]==='overview'&&parts[1])return overview(parts[1]); if(parts[0]==='admin')return admin(); return home();}

await seed();
window.addEventListener('hashchange',route);
if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
route();
