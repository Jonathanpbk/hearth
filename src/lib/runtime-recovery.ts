export const RUNTIME_RECOVERY_STORAGE_KEY = "hearth-runtime-recovery-at";
export const RUNTIME_RECOVERY_COOLDOWN_MS = 5 * 60 * 1000;

const CHUNK_ERROR_PATTERNS = [
  /chunkloaderror/i,
  /loading chunk [\w-]+ failed/i,
  /failed to fetch dynamically imported module/i,
  /importing a module script failed/i,
  /failed to load module script/i,
];

interface RecoveryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function isChunkLoadError(error: unknown): boolean {
  const message =
    error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

export function claimAutomaticRuntimeRecovery(
  error: unknown,
  storage: RecoveryStorage,
  now = Date.now(),
  online = true
): boolean {
  if (!online || !isChunkLoadError(error)) return false;

  try {
    const lastAttempt = Number(storage.getItem(RUNTIME_RECOVERY_STORAGE_KEY));
    if (
      Number.isFinite(lastAttempt) &&
      lastAttempt > 0 &&
      now - lastAttempt < RUNTIME_RECOVERY_COOLDOWN_MS
    ) {
      return false;
    }

    storage.setItem(RUNTIME_RECOVERY_STORAGE_KEY, String(now));
    return true;
  } catch {
    return false;
  }
}

export function getRuntimeRecoveryUrl(now = Date.now()): string {
  return `/api/pwa-update.html?runtime-recovery=${now}`;
}
