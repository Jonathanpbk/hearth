import { useState } from "react";
import { Sun, ToggleLeft, Sunset, Play, Activity, Cloud, Clock, Wind, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Modal } from "./Modal";
import { useEntityStore } from "../../store/useEntityStore";
import { useDashboardStore } from "../../store/useDashboardStore";
import { CARD_DEFAULTS, CARD_DOMAIN, nextRowY, type CardType } from "../../types/dashboard";

const CARD_TYPE_META: { type: CardType; label: string; Icon: LucideIcon; description: string }[] = [
  { type: "clock-weather", label: "Clock & Weather", Icon: Clock,      description: "Clock + live weather widget" },
  { type: "dreo-fan",      label: "Dreo Fan",        Icon: Wind,       description: "Fan controls + position presets" },
  { type: "scenes",        label: "Scenes",          Icon: Sparkles,   description: "Quick scene launcher" },
  { type: "light",         label: "Light",           Icon: Sun,        description: "Control brightness & colour" },
  { type: "switch",        label: "Switch",          Icon: ToggleLeft, description: "Toggle on / off" },
  { type: "scene",         label: "Scene",           Icon: Sunset,     description: "Activate a scene" },
  { type: "script",        label: "Script",          Icon: Play,       description: "Run a script" },
  { type: "sensor",        label: "Sensor",          Icon: Activity,   description: "Show a sensor value" },
  { type: "weather",       label: "Weather",         Icon: Cloud,      description: "Current weather & forecast" },
];

// Card types that don't require an entity — added to the grid immediately.
const ENTITY_FREE: CardType[] = ["weather", "clock-weather", "dreo-fan", "scenes"];

interface Props {
  pageId: string;
  currentLayout: import("../../types/dashboard").StoredLayoutItem[];
  onClose: () => void;
}

export function AddCardModal({ pageId, currentLayout, onClose }: Props) {
  const [selectedType, setSelectedType] = useState<CardType | null>(null);
  const [search, setSearch] = useState("");

  const entities = useEntityStore((s) => s.entities);
  const addCard = useDashboardStore((s) => s.addCard);

  function handleAdd(type: CardType, entityId: string) {
    const defaults = CARD_DEFAULTS[type];
    const id = crypto.randomUUID();
    addCard(
      pageId,
      { id, type, entityId },
      { i: id, x: 0, y: nextRowY(currentLayout), ...defaults }
    );
    onClose();
  }

  const filteredEntities =
    selectedType && !ENTITY_FREE.includes(selectedType)
      ? Object.entries(entities)
          .filter(([id]) => id.startsWith(CARD_DOMAIN[selectedType] + "."))
          .filter(([id, e]) => {
            const name = (e.attributes.friendly_name as string | undefined) ?? id;
            const q = search.toLowerCase();
            return name.toLowerCase().includes(q) || id.toLowerCase().includes(q);
          })
          .sort(([, a], [, b]) => {
            const na = (a.attributes.friendly_name as string | undefined) ?? "";
            const nb = (b.attributes.friendly_name as string | undefined) ?? "";
            return na.localeCompare(nb);
          })
      : [];

  if (!selectedType) {
    return (
      <Modal title="Add Card" onClose={onClose}>
        <div className="p-4 grid grid-cols-2 gap-2">
          {CARD_TYPE_META.map(({ type, label, Icon, description }) => (
            <button
              key={type}
              onClick={() =>
                ENTITY_FREE.includes(type) ? handleAdd(type, "") : setSelectedType(type)
              }
              className="flex flex-col items-start gap-1.5 p-3 rounded-xl border border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.04] transition-colors text-left"
            >
              <Icon className="h-5 w-5 text-white/50" />
              <span className="text-sm font-medium text-white">{label}</span>
              <span className="text-xs text-white/30 leading-tight">{description}</span>
            </button>
          ))}
        </div>
      </Modal>
    );
  }

  const meta = CARD_TYPE_META.find((m) => m.type === selectedType)!;

  return (
    <Modal title={`Add ${meta.label}`} onClose={onClose}>
      <div className="p-4 space-y-3">
        <input
          type="text"
          placeholder="Search entities…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface-2)] border border-white/[0.08] text-sm text-white placeholder:text-white/30 outline-none focus:border-white/20 transition-colors"
        />

        <div className="space-y-0.5 max-h-72 overflow-y-auto">
          {Object.keys(entities).length === 0 ? (
            <p className="text-sm text-white/30 text-center py-8">Not connected to HA</p>
          ) : filteredEntities.length === 0 ? (
            <p className="text-sm text-white/30 text-center py-8">No matching entities</p>
          ) : (
            filteredEntities.map(([id, entity]) => {
              const name = (entity.attributes.friendly_name as string | undefined) ?? id;
              return (
                <button
                  key={id}
                  onClick={() => handleAdd(selectedType, id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.06] transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{name}</p>
                    <p className="text-xs text-white/30 truncate">{id}</p>
                  </div>
                  <span
                    className={`text-xs shrink-0 tabular-nums ${
                      entity.state === "on"
                        ? "text-[#ffc174]"
                        : entity.state === "off"
                        ? "text-white/25"
                        : "text-white/40"
                    }`}
                  >
                    {entity.state}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <button
          onClick={() => { setSelectedType(null); setSearch(""); }}
          className="text-xs text-white/30 hover:text-white/50 transition-colors"
        >
          ← Back to card types
        </button>
      </div>
    </Modal>
  );
}
