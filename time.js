export const TYPES = {
  clock_in: 'Arbeitsbeginn',
  break_start: 'Pause gestartet',
  break_end: 'Pause beendet',
  clock_out: 'Arbeitsende'
};

export function deriveStatus(entries) {
  if (!entries.length) return 'off';
  const last = [...entries].sort((a,b) => new Date(a.timestamp)-new Date(b.timestamp)).at(-1);
  if (last.type === 'clock_in' || last.type === 'break_end') return 'working';
  if (last.type === 'break_start') return 'break';
  return 'off';
}

export function availableActions(status) {
  if (status === 'working') return ['break_start','clock_out'];
  if (status === 'break') return ['break_end'];
  return ['clock_in'];
}

export function dayKey(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

export function entriesByDay(entries) {
  const map = new Map();
  for (const e of entries) {
    const key = dayKey(e.timestamp);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(e);
  }
  for (const list of map.values()) list.sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));
  return map;
}

export function calculateDay(entries, now = new Date()) {
  const sorted = [...entries].sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));
  let workMs = 0, breakMs = 0, workStart = null, breakStart = null;
  for (const e of sorted) {
    const t = new Date(e.timestamp).getTime();
    if (e.type === 'clock_in') { if (workStart == null) workStart = t; }
    if (e.type === 'break_start') {
      if (workStart != null) { workMs += Math.max(0, t-workStart); workStart = null; }
      if (breakStart == null) breakStart = t;
    }
    if (e.type === 'break_end') {
      if (breakStart != null) { breakMs += Math.max(0, t-breakStart); breakStart = null; }
      if (workStart == null) workStart = t;
    }
    if (e.type === 'clock_out') {
      if (workStart != null) { workMs += Math.max(0, t-workStart); workStart = null; }
      if (breakStart != null) { breakMs += Math.max(0, t-breakStart); breakStart = null; }
    }
  }
  const status = deriveStatus(sorted);
  const sameDay = sorted.length ? dayKey(sorted[0].timestamp) === dayKey(now) : false;
  if (sameDay && status === 'working' && workStart != null) workMs += Math.max(0, now.getTime()-workStart);
  if (sameDay && status === 'break' && breakStart != null) breakMs += Math.max(0, now.getTime()-breakStart);
  return { workMinutes: Math.floor(workMs/60000), breakMinutes: Math.floor(breakMs/60000), status };
}

export function formatMinutes(minutes, signed=false) {
  const n = Math.round(minutes || 0);
  const sign = n < 0 ? '−' : signed && n > 0 ? '+' : '';
  const abs = Math.abs(n);
  return `${sign}${Math.floor(abs/60)}:${String(abs%60).padStart(2,'0')} h`;
}
export function formatClock(ts) { return new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit'}).format(new Date(ts)); }
export function formatDate(ts) { return new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(ts)); }
export function weekStart(date = new Date()) {
  const d = new Date(date); const day = d.getDay() || 7; d.setHours(0,0,0,0); d.setDate(d.getDate()-day+1); return d;
}
export function escapeCsv(v) { const s=String(v??''); return /[;"\n]/.test(s) ? `"${s.replaceAll('"','""')}"` : s; }
