import { supabase } from "./supabase";

const OFFLINE_QUEUE_KEY = "notyx_offline_queue";

/**
 * Get current pending offline changes queue
 */
export function getOfflineQueue() {
  try {
    const data = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Error reading offline queue:", e);
    return [];
  }
}

/**
 * Queue a grade or attendance update when offline
 */
export function queueOfflineUpdate(type, payload) {
  const queue = getOfflineQueue();
  queue.push({
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type, // 'grade' | 'attendance'
    payload,
    createdAt: new Date().toISOString()
  });
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Clear the offline queue
 */
export function clearOfflineQueue() {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
}

/**
 * Sync queued offline updates to Supabase
 */
export async function syncOfflineQueue() {
  const queue = getOfflineQueue();
  if (queue.length === 0) return { success: true, count: 0 };

  let syncedCount = 0;
  const remainingQueue = [];

  for (const item of queue) {
    try {
      if (item.type === "grade") {
        const { student_id, criteria_id, score } = item.payload;
        const { error } = await supabase.from("grades").upsert({
          class_student_id: student_id,
          criteria_id,
          score,
          updated_at: new Date().toISOString()
        }, { onConflict: "class_student_id,criteria_id" });

        if (error) throw error;
        syncedCount++;
      } else if (item.type === "attendance") {
        const { session_id, student_id, is_present } = item.payload;
        const { error } = await supabase.from("attendance").upsert({
          session_id,
          class_student_id: student_id,
          is_present,
          updated_at: new Date().toISOString()
        }, { onConflict: "session_id,class_student_id" });

        if (error) throw error;
        syncedCount++;
      }
    } catch (err) {
      console.error("Failed to sync item:", item, err);
      remainingQueue.push(item);
    }
  }

  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));
  return { success: true, count: syncedCount, remaining: remainingQueue.length };
}

/**
 * Setup auto-sync listeners when internet connection restores
 */
export function setupOfflineSyncListeners(onSyncComplete) {
  const handleOnline = async () => {
    console.log("Conexión restablecida. Sincronizando datos offline...");
    const result = await syncOfflineQueue();
    if (result.count > 0 && onSyncComplete) {
      onSyncComplete(result);
    }
  };

  window.addEventListener("online", handleOnline);
  return () => window.removeEventListener("online", handleOnline);
}
