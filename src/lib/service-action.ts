import { useServiceErrorStore } from "../store/useServiceErrorStore";

const DISCONNECTED_ERROR = "No active HA connection";

export function serviceFailureMessage(label: string, error: unknown): string {
  if (error instanceof Error && error.message === DISCONNECTED_ERROR) {
    return "Home Assistant is disconnected";
  }
  return `${label} failed`;
}

export async function executeServiceAction(
  label: string,
  action: () => Promise<unknown>
): Promise<boolean> {
  try {
    await action();
    return true;
  } catch (error) {
    console.error(`[Hearth] ${label} failed`, error);
    useServiceErrorStore.getState().showError(serviceFailureMessage(label, error));
    return false;
  }
}
