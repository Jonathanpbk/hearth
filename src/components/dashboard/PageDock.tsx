import { useState, useRef, useEffect, Fragment } from "react";
import { Plus, X, Pencil } from "lucide-react";
import { useSettingsStore } from "../../store/useSettingsStore";
import { useDashboardStore } from "../../store/useDashboardStore";
import { DynamicIcon } from "../DynamicIcon";
import { PageSettingsModal } from "./PageSettingsModal";

export function PageDock() {
  const persistedPages = useSettingsStore((s) => s.settings.pages);
  const showDock       = useSettingsStore((s) => s.settings.showDock);
  const currentPageId  = useDashboardStore((s) => s.currentPageId);
  const setCurrentPageId = useDashboardStore((s) => s.setCurrentPageId);
  const editMode       = useDashboardStore((s) => s.editMode);
  const draftPages     = useDashboardStore((s) => s.draftPages);
  const addPage        = useDashboardStore((s) => s.addPage);
  const deletePage     = useDashboardStore((s) => s.deletePage);
  const updatePageMeta = useDashboardStore((s) => s.updatePageMeta);
  const reorderPages   = useDashboardStore((s) => s.reorderPages);
  const pages = editMode && draftPages ? draftPages : persistedPages;

  const [addingPage, setAddingPage]   = useState(false);
  const [newPageName, setNewPageName] = useState("");
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  // Drag-to-reorder state
  const [draggedId, setDraggedId]   = useState<string | null>(null);
  const [insertIndex, setInsertIndex] = useState<number | null>(null);
  const tabRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    if (addingPage) addInputRef.current?.focus();
  }, [addingPage]);

  useEffect(() => {
    if (editMode) return;
    setAddingPage(false);
    setNewPageName("");
    setEditingPageId(null);
    setDraggedId(null);
    setInsertIndex(null);
  }, [editMode]);

  if (!showDock) return null;
  if (pages.length <= 1 && !editMode) return null;

  // ── Page CRUD ──────────────────────────────────────────────────────────────

  function handleAddPage() {
    const name = newPageName.trim() || "New Page";
    const id = crypto.randomUUID();
    addPage(name, id);
    setCurrentPageId(id);
    setAddingPage(false);
    setNewPageName("");
  }

  function handleSavePageMeta(id: string, name: string, icon: string) {
    updatePageMeta(id, name, icon);
    setEditingPageId(null);
  }

  function handleDeletePage(pageId: string) {
    const page = pages.find((candidate) => candidate.id === pageId);
    if (!page || !confirm(`Delete "${page.name}"? This removes all its cards.`)) {
      return;
    }
    const other = pages.find((p) => p.id !== pageId);
    if (other) setCurrentPageId(other.id);
    deletePage(pageId);
    setEditingPageId(null);
  }

  // ── Drag-to-reorder helpers ────────────────────────────────────────────────

  function getInsertIndex(clientX: number): number {
    for (let i = 0; i < pages.length; i++) {
      const el = tabRefs.current.get(pages[i].id);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (clientX < rect.left + rect.width / 2) return i;
    }
    return pages.length;
  }

  function commitReorder(id: string, idx: number) {
    const oldIdx = pages.findIndex((p) => p.id === id);
    if (oldIdx === -1 || oldIdx === idx || oldIdx === idx - 1) return;
    const reordered = [...pages];
    reordered.splice(oldIdx, 1);
    const adjusted = idx > oldIdx ? idx - 1 : idx;
    reordered.splice(adjusted, 0, pages[oldIdx]);
    reorderPages(reordered.map((p) => p.id));
  }

  function handleContainerDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setInsertIndex(getInsertIndex(e.clientX));
  }

  function handleContainerDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setInsertIndex(null);
    }
  }

  function handleContainerDrop(e: React.DragEvent) {
    e.preventDefault();
    if (draggedId !== null && insertIndex !== null) {
      commitReorder(draggedId, insertIndex);
    }
    setDraggedId(null);
    setInsertIndex(null);
  }

  const editingPage = editingPageId ? pages.find((p) => p.id === editingPageId) : null;

  return (
    <>
      {/* Page settings modal */}
      {editingPage && (
        <PageSettingsModal
          page={editingPage}
          canDelete={pages.length > 1}
          onSave={(name, icon) => handleSavePageMeta(editingPage.id, name, icon)}
          onDelete={() => handleDeletePage(editingPage.id)}
          onClose={() => setEditingPageId(null)}
        />
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
        <div
          className="flex items-center gap-1 px-3 py-2 rounded-full bg-[var(--color-surface)] border border-white/[0.06] shadow-xl pointer-events-auto"
          onDragOver={editMode ? handleContainerDragOver : undefined}
          onDragLeave={editMode ? handleContainerDragLeave : undefined}
          onDrop={editMode ? handleContainerDrop : undefined}
        >
          {pages.map((page, i) => (
            <Fragment key={page.id}>
              {/* Insertion marker */}
              {draggedId !== null && insertIndex === i && (
                <div className="w-0.5 h-6 bg-[#ffc174] rounded-full mx-0.5 shrink-0" />
              )}

              <div
                ref={(el) => {
                  if (el) tabRefs.current.set(page.id, el);
                  else tabRefs.current.delete(page.id);
                }}
                className="relative flex items-center"
                draggable={editMode}
                onDragStart={(e) => {
                  setDraggedId(page.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={() => {
                  setDraggedId(null);
                  setInsertIndex(null);
                }}
              >
                <button
                  type="button"
                  onClick={() => setCurrentPageId(page.id)}
                  className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl font-medium
                    transition-all duration-200 select-none min-w-[56px]
                    ${currentPageId === page.id
                      ? "bg-[#ffc174] text-black"
                      : "text-white/50 hover:text-white hover:bg-white/[0.08]"}
                    ${draggedId === page.id ? "opacity-40" : ""}`}
                >
                  <DynamicIcon name={page.icon ?? "LayoutDashboard"} className="h-[22px] w-[22px] shrink-0" />
                  <span className="text-xs leading-none">{page.name}</span>
                </button>

                {/* Pencil badge — edit mode: opens page settings */}
                {editMode && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setEditingPageId(page.id); }}
                    className="absolute -top-1 -left-1 h-4 w-4 rounded-full bg-[var(--color-surface-2)] border border-white/20 hover:bg-white/20 flex items-center justify-center transition-colors"
                    aria-label={`Edit ${page.name}`}
                  >
                    <Pencil className="h-2.5 w-2.5 text-white/60" />
                  </button>
                )}

                {/* Delete badge — edit mode, multiple pages */}
                {editMode && pages.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDeletePage(page.id); }}
                    className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center transition-colors"
                    aria-label={`Delete ${page.name}`}
                  >
                    <X className="h-2.5 w-2.5 text-white" />
                  </button>
                )}
              </div>
            </Fragment>
          ))}

          {/* Trailing insertion marker */}
          {draggedId !== null && insertIndex === pages.length && (
            <div className="w-0.5 h-6 bg-[#ffc174] rounded-full mx-0.5 shrink-0" />
          )}

          {/* Add page */}
          {editMode && (
            addingPage ? (
              <div className="flex items-center gap-1.5 pl-1 pr-2">
                <input
                  ref={addInputRef}
                  value={newPageName}
                  onChange={(e) => setNewPageName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddPage();
                    if (e.key === "Escape") { setAddingPage(false); setNewPageName(""); }
                  }}
                  placeholder="Page name"
                  className="w-24 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                />
                <button
                  type="button"
                  onClick={handleAddPage}
                  className="text-xs text-white/60 hover:text-white transition-colors shrink-0"
                >
                  Add
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingPage(true)}
                className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Add page"
              >
                <Plus className="h-4 w-4" />
              </button>
            )
          )}
        </div>
      </div>
    </>
  );
}
