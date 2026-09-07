import { useEffect, useState, useCallback } from "react";
import { submitFieldReport } from "./data-client";
import { toast } from "sonner";

export interface QueuedFieldReport {
  id: string;
  queued_at: string;
  tag_id?: string | undefined;
  species: string;
  affected_count: number;
  mortality_count: number;
  symptoms: string[];
  notes?: string | undefined;
  voice_transcript?: string | undefined;
  language: string;
  village: string;
  block?: string | undefined;
  district?: string | undefined;
  lat?: number | undefined;
  lon?: number | undefined;
  channel?: string | undefined;
}

const DB_NAME = "HerdSentinelOfflineDB";
const STORE_NAME = "offline_reports";
const DB_VERSION = 1;
const FALLBACK_STORAGE_KEY = "herdsentinel_offline_field_reports_queue";

// In-memory cache for fast synchronous reads
let memoryQueue: QueuedFieldReport[] = [];

/**
 * Open or upgrade native browser IndexedDB.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB not available"));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Fetch all queued offline records from IndexedDB (with LocalStorage fallback).
 */
export async function loadQueueFromStorage(): Promise<QueuedFieldReport[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        memoryQueue = req.result || [];
        resolve(memoryQueue);
      };
      req.onerror = () => {
        resolve(fallbackReadLocalStorage());
      };
    });
  } catch {
    return fallbackReadLocalStorage();
  }
}

function fallbackReadLocalStorage(): QueuedFieldReport[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(FALLBACK_STORAGE_KEY);
    memoryQueue = raw ? JSON.parse(raw) : [];
    return memoryQueue;
  } catch {
    return [];
  }
}

function fallbackWriteLocalStorage(queue: QueuedFieldReport[]): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(queue));
  } catch {}
}

/**
 * Synchronous read of current memory queue.
 */
export function getQueuedReports(): QueuedFieldReport[] {
  if (memoryQueue.length === 0 && typeof window !== "undefined") {
    fallbackReadLocalStorage();
  }
  return [...memoryQueue];
}

/**
 * Save a new grassroots report to IndexedDB.
 */
export async function enqueueReport(
  report: Omit<QueuedFieldReport, "id" | "queued_at">
): Promise<QueuedFieldReport> {
  const item: QueuedFieldReport = {
    ...report,
    id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    queued_at: new Date().toISOString(),
  };

  memoryQueue.push(item);
  fallbackWriteLocalStorage(memoryQueue);

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(item);
  } catch (err) {
    console.warn("IndexedDB put failed, using LocalStorage fallback:", err);
  }

  return item;
}

/**
 * Remove a report from IndexedDB after successful upload.
 */
export async function removeQueuedReport(id: string): Promise<void> {
  memoryQueue = memoryQueue.filter((r) => r.id !== id);
  fallbackWriteLocalStorage(memoryQueue);

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
  } catch {}
}

/**
 * Bulk flush all offline records to the server database.
 */
export async function drainOfflineQueue(
  onProgress?: (synced: number, total: number) => void
): Promise<{ synced: number; failed: number }> {
  const queue = await loadQueueFromStorage();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      await submitFieldReport({
        tag_id: item.tag_id,
        species: item.species,
        village: item.village,
        symptoms: item.symptoms,
        affected_count: item.affected_count,
        mortality_count: item.mortality_count,
        notes: item.notes,
        voice_transcript: item.voice_transcript,
        language: item.language,
        block: item.block,
        district: item.district,
        lat: item.lat,
        lon: item.lon,
        channel: "offline_pwa",
      });
      await removeQueuedReport(item.id);
      synced++;
      if (onProgress) onProgress(synced, queue.length);
    } catch (err) {
      console.error("Failed to sync offline item:", item.id, err);
      failed++;
    }
  }

  return { synced, failed };
}

/**
 * Hook providing live offline state, IndexedDB counts, and auto-sync triggers.
 */
export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [queue, setQueue] = useState<QueuedFieldReport[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [storageEngine, setStorageEngine] = useState<"IndexedDB" | "localStorage">("IndexedDB");

  const refreshQueue = useCallback(async () => {
    const loaded = await loadQueueFromStorage();
    setQueue(loaded);
    if (typeof window !== "undefined" && window.indexedDB) {
      setStorageEngine("IndexedDB");
    } else {
      setStorageEngine("localStorage");
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (isSyncing) return;
    const currentQueue = await loadQueueFromStorage();
    if (currentQueue.length === 0) return;

    setIsSyncing(true);
    toast.info(`Flushing ${currentQueue.length} offline report(s) from IndexedDB to server...`);

    const result = await drainOfflineQueue();
    await refreshQueue();
    setIsSyncing(false);

    if (result.synced > 0) {
      toast.success(`Successfully uploaded ${result.synced} offline report(s) to district surveillance database.`);
    }
    if (result.failed > 0) {
      toast.error(`${result.failed} report(s) could not be uploaded. Will retry when connection stabilizes.`);
    }
  }, [isSyncing, refreshQueue]);

  useEffect(() => {
    refreshQueue();

    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Network connection restored! Auto-syncing IndexedDB offline queue...");
      syncNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("Network connection lost. Operating in Low-Connectivity Offline PWA Mode.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const interval = setInterval(async () => {
      if (navigator.onLine) {
        const q = await loadQueueFromStorage();
        if (q.length > 0 && !isSyncing) {
          syncNow();
        }
      }
    }, 15000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [refreshQueue, syncNow, isSyncing]);

  return {
    isOnline,
    queue,
    pendingCount: queue.length,
    isSyncing,
    syncNow,
    refreshQueue,
    storageEngine,
  };
}
