import { useDimStore } from "../store/useDimStore";

const GUARD_MS = 500;

/**
 * Returns a stable isGuarded() function that returns true if the screen
 * was undimmed less than GUARD_MS ago. Reads directly from Zustand getState()
 * so it never triggers re-renders.
 */
export function useUndimGuard(): () => boolean {
  // Subscribe to nothing — read on demand via getState() in the returned fn.
  void useDimStore; // keep the import alive without subscribing
  return () => Date.now() - useDimStore.getState().lastUndimTime < GUARD_MS;
}
