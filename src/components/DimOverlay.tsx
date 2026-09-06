import { useDimStore } from "../store/useDimStore";
import { useSettingsStore } from "../store/useSettingsStore";

export function DimOverlay() {
  const isDimmed = useDimStore((s) => s.isDimmed);
  const undim = useDimStore((s) => s.undim);
  const autoDim = useSettingsStore((s) => s.settings.autoDim);

  const active = autoDim && isDimmed;

  function handleInteraction(e: React.PointerEvent | React.TouchEvent | React.MouseEvent) {
    if (!active) return;
    e.stopPropagation();
    e.preventDefault();
    undim();
  }

  return (
    <div
      data-display-dimmer
      data-active={active ? "true" : "false"}
      className={`fixed inset-0 z-[9998] bg-black transition-opacity duration-500 ${
        active ? "opacity-85 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
      onPointerDownCapture={handleInteraction}
      onClickCapture={handleInteraction}
      aria-hidden="true"
    />
  );
}
