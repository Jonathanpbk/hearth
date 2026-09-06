import { CONNECTION_TEST_TIMEOUT_MS } from "../config/defaults";
import { normalizeHttpUrl } from "./settings-validation";

interface HomeAssistantStatus {
  message?: unknown;
}

export async function verifyHomeAssistantConnection(
  rawUrl: string,
  rawToken: string,
  fetchImpl: typeof fetch = fetch
): Promise<void> {
  const url = normalizeHttpUrl(rawUrl);
  const token = rawToken.trim();
  if (!url) throw new Error("Enter a valid Home Assistant URL.");
  if (!token) throw new Error("Enter a Home Assistant access token.");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONNECTION_TEST_TIMEOUT_MS);

  try {
    const response = await fetchImpl(`${url}/api/`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Home Assistant returned HTTP ${response.status}.`);
    }

    let payload: HomeAssistantStatus;
    try {
      payload = await response.json() as HomeAssistantStatus;
    } catch {
      throw new Error("The server did not return a Home Assistant response.");
    }
    if (payload.message !== "API running.") {
      throw new Error("The server did not return a Home Assistant response.");
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("The connection test timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
