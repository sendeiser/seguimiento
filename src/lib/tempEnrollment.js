/**
 * Utilities for Temporary Student Enrollment Links
 * Handles token generation, expiration timestamps, and status parsing.
 */

export function generateTempToken() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let token = "";
  for (let i = 0; i < 6; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export function createTempEnrollCode(token, durationMinutes) {
  const cleanToken = (token || generateTempToken()).toUpperCase().trim();
  const expiresAtMs = Date.now() + Math.max(1, durationMinutes) * 60 * 1000;
  return `TEMP:${cleanToken}:${expiresAtMs}`;
}

export function parseTempEnrollCode(joinCode) {
  if (!joinCode || typeof joinCode !== "string") {
    return {
      isTemp: false,
      token: null,
      expiresAtMs: null,
      isExpired: true,
      remainingMs: 0,
      active: false
    };
  }

  // Format: TEMP:TOKEN:EXPIRES_AT_MS
  if (joinCode.startsWith("TEMP:")) {
    const parts = joinCode.split(":");
    if (parts.length >= 3) {
      const token = parts[1];
      const expiresAtMs = Number(parts[2]);
      const remainingMs = Math.max(0, expiresAtMs - Date.now());
      const isExpired = remainingMs <= 0;

      return {
        isTemp: true,
        token,
        expiresAtMs,
        isExpired,
        remainingMs,
        active: !isExpired
      };
    }
  }

  return {
    isTemp: false,
    token: null,
    expiresAtMs: null,
    isExpired: true,
    remainingMs: 0,
    active: false
  };
}

export function formatRemainingTime(ms) {
  if (!ms || ms <= 0) return "Expirado";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")} min`;
}
