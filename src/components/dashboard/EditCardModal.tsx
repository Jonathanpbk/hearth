import { useState } from "react";
import { Modal } from "./Modal";
import { useDashboardStore } from "../../store/useDashboardStore";
import type { CardConfig } from "../../types/dashboard";

interface Props {
  card: CardConfig;
  pageId: string;
  onClose: () => void;
}

export function EditCardModal({ card, pageId, onClose }: Props) {
  const [title, setTitle] = useState(card.title ?? "");
  const updateCard = useDashboardStore((s) => s.updateCard);

  function handleSave() {
    updateCard(pageId, { ...card, title: title.trim() || undefined });
    onClose();
  }

  return (
    <Modal title="Edit Card" onClose={onClose}>
      <div className="p-5 space-y-5">
        <div>
          <label
            htmlFor="card-title"
            className="block text-xs text-white/40 uppercase tracking-widest mb-2"
          >
            Custom Title
          </label>
          <input
            id="card-title"
            type="text"
            placeholder="Leave blank to use HA name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            autoFocus
            className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-surface-2)] border border-white/[0.08] text-sm text-white placeholder:text-white/30 outline-none focus:border-white/20 transition-colors"
          />
        </div>

        <div className="space-y-1">
          <p className="text-xs text-white/25">
            Type: <span className="text-white/40">{card.type}</span>
          </p>
          {card.entityId && (
            <p className="text-xs text-white/25">
              Entity: <span className="text-white/40">{card.entityId}</span>
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 active:scale-95 rounded-xl text-sm font-semibold text-white transition-all duration-200"
        >
          Save
        </button>
      </div>
    </Modal>
  );
}
