// Browser-only: sightings saved while offline wait here (in the phone's IndexedDB storage)
// until there's signal again. Photos are too big for localStorage, so IndexedDB is used.
import type { SightingInput } from "@/app/actions/sightings";

const DB = "sighted";
const STORE = "pending-sightings";
export const QUEUE_EVENT = "sighted:offline-queue";

type Pending = { key: number; input: SightingInput; savedAt: string };

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "key", autoIncrement: true });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = work(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function queueSighting(input: SightingInput) {
  await run("readwrite", (s) => s.add({ input, savedAt: new Date().toISOString() }));
  window.dispatchEvent(new Event(QUEUE_EVENT));
}

export const pendingSightings = () => run<Pending[]>("readonly", (s) => s.getAll() as IDBRequest<Pending[]>);

export async function removePending(key: number) {
  await run("readwrite", (s) => s.delete(key));
  window.dispatchEvent(new Event(QUEUE_EVENT));
}

/** True for "no connection" failures (not for validation errors from the server). */
export function isNetworkError(error: unknown) {
  return !navigator.onLine || error instanceof TypeError;
}
