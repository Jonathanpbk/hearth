import { GripVertical, Pencil, X } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  editMode: boolean;
  onEdit: () => void;
  onDelete: () => void;
  children: ReactNode;
}

export function CardWrapper({ editMode, onEdit, onDelete, children }: Props) {
  if (!editMode) return <>{children}</>;

  return (
    <div className="relative h-full select-none">
      {/* Card — blocked from interaction while editing */}
      <div className="pointer-events-none h-full opacity-75">{children}</div>

      {/* Drag surface covers the whole card */}
      <div className="drag-handle absolute inset-0 cursor-grab active:cursor-grabbing" />

      {/* Control bar sits on top of the drag surface */}
      <div className="absolute top-2 inset-x-2 flex items-center justify-between z-10 pointer-events-none">
        <GripVertical className="h-4 w-4 text-white/40 drop-shadow pointer-events-none" />
        <div className="flex items-center gap-1 pointer-events-auto">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-white/60 hover:text-white hover:bg-black/70 transition-colors"
            aria-label="Edit card"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-white/60 hover:text-red-400 hover:bg-black/70 transition-colors"
            aria-label="Delete card"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
