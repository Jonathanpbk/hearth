import { useState, useEffect } from "react";
import { useSettingsStore } from "../../store/useSettingsStore";

export function ClockWidget() {
  const clockFormat = useSettingsStore((s) => s.settings.clockFormat);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const h = now.getHours();
  const displayHour =
    clockFormat === "12h"
      ? String(h % 12 || 12).padStart(2, "0")
      : String(h).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const ampm = clockFormat === "12h" ? (h >= 12 ? "PM" : "AM") : null;

  const dayName = now.toLocaleDateString("en-GB", { weekday: "long" });
  const day = now.getDate();
  const month = now.toLocaleDateString("en-GB", { month: "long" });

  return (
    <div className="text-center leading-none select-none">
      <div className="flex items-baseline justify-center gap-0.5">
        <span className="text-xl font-semibold tabular-nums text-white">
          {displayHour}:{minutes}
        </span>
        <span className="text-sm tabular-nums text-white/30 ml-0.5">
          :{seconds}
        </span>
        {ampm && (
          <span className="text-[11px] font-medium text-white/40 ml-1 tracking-wide">
            {ampm}
          </span>
        )}
      </div>
      <div className="text-[11px] text-white/30 tracking-wide mt-0.5">
        {dayName}, {day} {month}
      </div>
    </div>
  );
}
