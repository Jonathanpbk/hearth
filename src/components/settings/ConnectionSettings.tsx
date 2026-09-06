import { useState } from "react";
import { CheckCircle, XCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { verifyHomeAssistantConnection } from "../../lib/ha-connection-test";
import type { SettingsErrors } from "../../lib/settings-validation";

type TestState = "idle" | "loading" | "ok" | "error";

interface Props {
  haUrl: string;
  haToken: string;
  weatherEntityId: string;
  errors: SettingsErrors;
  onUrlChange: (v: string) => void;
  onTokenChange: (v: string) => void;
  onWeatherEntityChange: (v: string) => void;
}

function TestIcon({ state }: { state: TestState }) {
  if (state === "loading")
    return <Loader2 className="h-4 w-4 animate-spin text-white/40 shrink-0" />;
  if (state === "ok")
    return <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />;
  if (state === "error")
    return <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
  return null;
}

const inputClass =
  "flex-1 bg-[#1a1a1a] border border-white/10 aria-[invalid=true]:border-red-500/60 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-blue-500/50 transition-colors min-w-0";
const labelClass = "block text-xs uppercase tracking-widest text-white/40 mb-1.5";
const testBtnClass =
  "px-3 py-2.5 text-xs uppercase tracking-widest text-white/50 border border-white/10 rounded-lg hover:border-white/20 hover:text-white/80 transition-colors disabled:opacity-40 shrink-0";

export function ConnectionSettings({
  haUrl,
  haToken,
  weatherEntityId,
  errors,
  onUrlChange,
  onTokenChange,
  onWeatherEntityChange,
}: Props) {
  const [urlTest, setUrlTest] = useState<TestState>("idle");
  const [testMessage, setTestMessage] = useState("");
  const [showToken, setShowToken] = useState(false);

  function resetTest() {
    setUrlTest("idle");
    setTestMessage("");
  }

  async function testUrl() {
    setUrlTest("loading");
    setTestMessage("Testing the Home Assistant connection.");
    try {
      await verifyHomeAssistantConnection(haUrl, haToken);
      setUrlTest("ok");
      setTestMessage("Connected to Home Assistant.");
    } catch (error) {
      setUrlTest("error");
      setTestMessage(
        error instanceof Error ? error.message : "The connection test failed."
      );
    }
  }

  return (
    <div className="bg-[#111111] border border-white/[0.08] rounded-2xl p-6 space-y-5">
      <h2 className={labelClass}>Connection</h2>

      <div>
        <label htmlFor="ha-url" className={labelClass}>Home Assistant URL</label>
        <div className="flex items-center gap-2">
          <input
            id="ha-url"
            type="url"
            value={haUrl}
            onChange={(e) => {
              onUrlChange(e.target.value);
              resetTest();
            }}
            placeholder="https://ha.yourdomain.com"
            className={inputClass}
            aria-invalid={Boolean(errors.haUrl)}
            aria-describedby={errors.haUrl ? "ha-url-error" : undefined}
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => void testUrl()}
            disabled={urlTest === "loading"}
            className={testBtnClass}
          >
            Test
          </button>
          <TestIcon state={urlTest} />
        </div>
        {errors.haUrl && (
          <p id="ha-url-error" className="text-xs text-red-400 mt-1.5">
            {errors.haUrl}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="ha-token" className={labelClass}>Long-Lived Access Token</label>
        <div className="flex items-center gap-2">
          <input
            id="ha-token"
            type={showToken ? "text" : "password"}
            value={haToken}
            onChange={(e) => {
              onTokenChange(e.target.value);
              resetTest();
            }}
            placeholder="eyJ..."
            className={inputClass}
            aria-invalid={Boolean(errors.haToken)}
            aria-describedby={errors.haToken ? "ha-token-error" : undefined}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => setShowToken((v) => !v)}
            className="px-3 py-2.5 border border-white/10 rounded-lg hover:border-white/20 transition-colors text-white/40 hover:text-white/70 shrink-0"
            aria-label={showToken ? "Hide token" : "Show token"}
          >
            {showToken ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {errors.haToken && (
          <p id="ha-token-error" className="text-xs text-red-400 mt-1.5">
            {errors.haToken}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="weather-entity" className={labelClass}>Weather Entity ID</label>
        <input
          id="weather-entity"
          type="text"
          value={weatherEntityId}
          onChange={(e) => onWeatherEntityChange(e.target.value)}
          placeholder="weather.home"
          className="w-full bg-[#1a1a1a] border border-white/10 aria-[invalid=true]:border-red-500/60 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-blue-500/50 transition-colors"
          aria-invalid={Boolean(errors.weatherEntityId)}
          aria-describedby={errors.weatherEntityId ? "weather-entity-error" : undefined}
          spellCheck={false}
        />
        {errors.weatherEntityId && (
          <p id="weather-entity-error" className="text-xs text-red-400 mt-1.5">
            {errors.weatherEntityId}
          </p>
        )}
      </div>

      {testMessage && (
        <p
          role={urlTest === "error" ? "alert" : "status"}
          className={`text-xs ${urlTest === "error" ? "text-red-400" : "text-white/50"}`}
        >
          {testMessage}
        </p>
      )}
    </div>
  );
}
