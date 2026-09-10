const DB_NAME = 'arbeitszeit-terminal-db';
const DB_VERSION = 1;
let dbPromise;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('employees')) {
        const store = db.createObjectStore('employees', { keyPath: 'id' });
        store.createIndex('active', 'active');
        store.createIndex('sortOrder', 'sortOrder');
      }
      if (!db.objectStoreNames.contains('entries')) {
        const store = db.createObjectStore('entries', { keyPath: 'id' });
        store.createIndex('employeeId', 'employeeId');
        store.createIndex('timestamp', 'timestamp');
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
  return dbPromise;
}

async function tx(storeName, mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    let value;
    try { value = fn(store); } catch (error) { reject(error); return; }
    transaction.oncomplete = () => resolve(value);
    transaction.onerror = () => reject(transaction.error);
  });
}

function reqPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function seed() {
  const employees = await getEmployees(false);
  if (employees.length === 0) {
    const starters = ['Mareike', 'Dani', 'Doriane', 'Valeriia'];
    for (let i = 0; i < starters.length; i++) {
      await saveEmployee({ id: crypto.randomUUID(), name: starters[i], dailyTargetMinutes: 0, weeklyTargetMinutes: 0, active: true, sortOrder: i });
    }
  }
  if ((await getSetting('adminPin')) != null) await deleteSetting('adminPin');
  if ((await getSetting('resetSeconds')) == null) await setSetting('resetSeconds', 3);
  if ((await getSetting('companyName')) == null) await setSetting('companyName', 'Arbeitszeit Terminal');
}

export async function getEmployees(activeOnly = true) {
  const db = await openDb();
  const result = await reqPromise(db.transaction('employees').objectStore('employees').getAll());
  return result.filter(e => !activeOnly || e.active).sort((a,b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999) || a.name.localeCompare(b.name));
}
export async function getEmployee(id) {
  const db = await openDb();
  return reqPromise(db.transaction('employees').objectStore('employees').get(id));
}
export async function saveEmployee(employee) {
  const db = await openDb();
  return reqPromise(db.transaction('employees','readwrite').objectStore('employees').put(employee));
}
export async function deleteEmployee(id) {
  const entries = await getEntries(id);
  if (entries.length) throw new Error('Mitarbeiter hat bereits Zeitbuchungen und kann nur deaktiviert werden.');
  const db = await openDb();
  return reqPromise(db.transaction('employees','readwrite').objectStore('employees').delete(id));
}
export async function getEntries(employeeId = null) {
  const db = await openDb();
  const store = db.transaction('entries').objectStore('entries');
  let result;
  if (employeeId) result = await reqPromise(store.index('employeeId').getAll(employeeId));
  else result = await reqPromise(store.getAll());
  return result.sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
}
export async function saveEntry(entry) {
  const db = await openDb();
  return reqPromise(db.transaction('entries','readwrite').objectStore('entries').put(entry));
}
export async function deleteEntry(id) {
  const db = await openDb();
  return reqPromise(db.transaction('entries','readwrite').objectStore('entries').delete(id));
}
export async function getSetting(key) {
  const db = await openDb();
  const row = await reqPromise(db.transaction('settings').objectStore('settings').get(key));
  return row?.value;
}
export async function setSetting(key, value) {
  const db = await openDb();
  return reqPromise(db.transaction('settings','readwrite').objectStore('settings').put({ key, value }));
}

export async function deleteSetting(key) {
  const db = await openDb();
  return reqPromise(db.transaction('settings','readwrite').objectStore('settings').delete(key));
}
