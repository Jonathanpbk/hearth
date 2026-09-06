import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "./Modal";
import { DynamicIcon } from "../DynamicIcon";
import type { Page } from "../../types/dashboard";

interface Props {
  page: Page;
  canDelete: boolean;
  onSave: (name: string, icon: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

const inputClass =
  "w-full px-3 py-2 rounded-lg bg-[var(--color-surface-2)] border border-white/[0.08] text-sm text-white placeholder:text-white/30 outline-none focus:border-white/20 transition-colors";

const labelClass = "block text-[10px] uppercase tracking-widest text-white/40 mb-1.5";

export function PageSettingsModal({ page, canDelete, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(page.name);
  const [icon, setIcon] = useState(page.icon);

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed, icon.trim() || "LayoutDashboard");
  }

  function handleDelete() {
    onDelete();
  }

  return (
    <Modal title="Page Settings" onClose={onClose}>
      <div className="p-4 space-y-4">

        {/* Name */}
        <div>
          <label className={labelClass}>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            autoFocus
            className={inputClass}
            placeholder="Page name"
          />
        </div>

        {/* Icon picker */}
        <div>
          <label className={labelClass}>Icon</label>
          <div className="flex items-center gap-3">
            {/* Live preview */}
            <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04]">
              <DynamicIcon name={icon} className="h-5 w-5 text-white/60" />
            </div>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className={inputClass}
              placeholder="e.g. Home, Star, Zap, sofa"
            />
          </div>
          <p className="text-[10px] text-white/25 mt-1.5 leading-snug">
            Lucide icon name — PascalCase or kebab-case.{" "}
            <span className="text-white/40">HelpCircle shown if not found.</span>
          </p>
        </div>

        {/* Save / Cancel */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-white/[0.1] text-sm text-white/50 hover:text-white hover:border-white/20 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 rounded-xl bg-[#ffc174]/15 border border-[#ffc174]/30 text-sm font-medium text-[#ffc174] hover:bg-[#ffc174]/25 transition-colors"
          >
            Save
          </button>
        </div>

        {/* Delete */}
        {canDelete && (
          <div className="border-t border-white/[0.06] pt-3">
            <button
              onClick={handleDelete}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm text-red-400/70 hover:text-red-400 hover:bg-red-400/10 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete page
            </button>
          </div>
        )}

      </div>
    </Modal>
  );
}
