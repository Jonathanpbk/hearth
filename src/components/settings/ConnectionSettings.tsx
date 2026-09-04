import { useState } from "react";
import { CheckCircle, XCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { CONNECTION_TEST_TIMEOUT_MS } from "../../config/defaults";

type TestState = "idle" | "loading" | "ok" | "error";

interface Props {
  haUrl: string;
  haToken: string;
  weatherEntityId: string;
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
  "flex-1 bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-blue-500/50 transition-colors min-w-0";
const labelClass = "block text-xs uppercase tracking-widest text-white/40 mb-1.5";
const testBtnClass =
  "px-3 py-2.5 text-xs uppercase tracking-widest text-white/50 border border-white/10 rounded-lg hover:border-white/20 hover:text-white/80 transition-colors disabled:opacity-40 shrink-0";

export function ConnectionSettings({
  haUrl,
  haToken,
  weatherEntityId,
  onUrlChange,
  onTokenChange,
  onWeatherEntityChange,
}: Props) {
  const [urlTest, setUrlTest] = useState<TestState>("idle");
  const [showToken, setShowToken] = useState(false);

  async function testUrl(url: string, setTest: (s: TestState) => void) {
    if (!url) {
      setTest("error");
      return;
    }
    setTest("loading");
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), CONNECTION_TEST_TIMEOUT_MS);
      await fetch(`${url}/api/`, {
        headers: haToken ? { Authorization: `Bearer ${haToken}` } : {},
        signal: controller.signal,
      });
      clearTimeout(id);
      setTest("ok");
    } catch {
      setTest("error");
    }
  }

  return (
    <div className="bg-[#111111] border border-white/[0.08] rounded-2xl p-6 space-y-5">
      <h2 className={labelClass}>Connection</h2>

      <div>
        <label className={labelClass}>Home Assistant URL</label>
        <div className="flex items-center gap-2">
          <input
            type="url"
            value={haUrl}
            onChange={(e) => {
              onUrlChange(e.target.value);
              setUrlTest("idle");
            }}
            placeholder="https://ha.yourdomain.com"
            className={inputClass}
            spellCheck={false}
          />
          <button
            onClick={() => testUrl(haUrl, setUrlTest)}
            disabled={urlTest === "loading"}
            className={testBtnClass}
          >
            Test
          </button>
          <TestIcon state={urlTest} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Long-Lived Access Token</label>
        <div className="flex items-center gap-2">
          <input
            type={showToken ? "text" : "password"}
            value={haToken}
            onChange={(e) => onTokenChange(e.target.value)}
            placeholder="eyJ..."
            className={inputClass}
            autoComplete="off"
            spellCheck={false}
          />
          <button
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
      </div>

      <div>
        <label className={labelClass}>Weather Entity ID</label>
        <input
          type="text"
          value={weatherEntityId}
          onChange={(e) => onWeatherEntityChange(e.target.value)}
          placeholder="weather.home"
          className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-blue-500/50 transition-colors"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
