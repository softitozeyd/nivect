// IndexedDB transactions preserve queued events across reloads and concurrent tabs.
const open = () =>
  new Promise((resolve, reject) => {
    const r = indexedDB.open("nivect-events", 1);
    r.onupgradeneeded = () =>
      r.result.createObjectStore("events", { keyPath: "eventId" });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
async function transaction(mode, action) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("events", mode);
    let result;
    const request = action(tx.objectStore("events"));
    request.onsuccess = () => (result = request.result);
    tx.oncomplete = () => {
      db.close();
      resolve(result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error || Error("Yerel kayıt tamamlanamadı."));
    };
  });
}
export const pendingEvents = () =>
  transaction("readonly", (store) => store.getAll());
export const enqueueEvent = (event) =>
  transaction("readwrite", (store) => store.add(event));
export const acknowledgeEvent = (id) =>
  transaction("readwrite", (store) => store.delete(id));
