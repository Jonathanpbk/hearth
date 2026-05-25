import { useState } from "react";
import { InteractiveCard } from "../InteractiveCard";
import { Sun, Sofa, Sparkles, Film, Palette, PowerOff } from "lucide-react";
import { getConnection } from "../../lib/ha-connection";
import { runScript } from "../../lib/ha-service";

const SCENES = [
  { id: "script.day_lights",         label: "Day",    Icon: Sun,      color: "amber",  css: "bg-amber-400/10 hover:bg-amber-400/20 border-amber-400/20 text-amber-300"   },
  { id: "script.chill_lights",       label: "Chill",  Icon: Sofa,     color: "blue",   css: "bg-blue-400/10 hover:bg-blue-400/20 border-blue-400/20 text-blue-300"      },
  { id: "script.mood_lights",        label: "Mood",   Icon: Sparkles, color: "violet", css: "bg-violet-400/10 hover:bg-violet-400/20 border-violet-400/20 text-violet-300" },
  { id: "script.cinema_lights",      label: "Cinema", Icon: Film,     color: "red",    css: "bg-red-400/10 hover:bg-red-400/20 border-red-400/20 text-red-300"          },
  { id: "script.purple_back_lights", label: "Purple", Icon: Palette,  color: "purple", css: "bg-purple-400/10 hover:bg-purple-400/20 border-purple-400/20 text-purple-300" },
  { id: "script.lights_out",         label: "Off",    Icon: PowerOff, color: "grey",   css: "bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] text-white/40"   },
] as const;

export function ScenesCard() {
  const [active, setActive] = useState<string | null>(null);

  function handleScene(scriptId: string) {
    try { void runScript(getConnection(), scriptId); } catch { /* disconnected */ }
    setActive(scriptId);
    setTimeout(() => setActive(null), 600);
  }

  return (
    <InteractiveCard className="h-full flex flex-col bg-[var(--color-surface)] rounded-2xl border border-white/[0.08] p-2 gap-1.5">
      <p className="text-[10px] font-medium uppercase tracking-widest text-white/40 px-0.5 shrink-0">Scenes</p>

      <div className="flex-1 grid grid-cols-3 grid-rows-2 gap-1.5 min-h-0">
        {SCENES.map(({ id, label, Icon, css }) => (
          <button
            key={id}
            onClick={() => handleScene(id)}
            aria-label={label}
            className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border
              transition-all duration-150 active:scale-95
              ${active === id ? "opacity-100 scale-95" : ""}
              ${css}`}
          >
            <Icon className="h-6 w-6" />
            <span className="text-xs font-medium tracking-wide">{label}</span>
          </button>
        ))}
      </div>
    </InteractiveCard>
  );
}
