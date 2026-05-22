import { useState, useRef, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { useSettingsStore } from "../../store/useSettingsStore";
import { useDashboardStore } from "../../store/useDashboardStore";

export function PageDock() {
  const pages = useSettingsStore((s) => s.settings.pages);
  const addPage = useSettingsStore((s) => s.addPage);
  const deletePage = useSettingsStore((s) => s.deletePage);
  const renamePage = useSettingsStore((s) => s.renamePage);
  const currentPageId = useDashboardStore((s) => s.currentPageId);
  const setCurrentPageId = useDashboardStore((s) => s.setCurrentPageId);
  const editMode = useDashboardStore((s) => s.editMode);

  const [addingPage, setAddingPage] = useState(false);
  const [newPageName, setNewPageName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addingPage) addInputRef.current?.focus();
  }, [addingPage]);

  // Hide dock when only one page and not in edit mode
  if (pages.length <= 1 && !editMode) return null;

  function handleAddPage() {
    const name = newPageName.trim() || "New Page";
    const id = crypto.randomUUID();
    addPage(name, id);
    setCurrentPageId(id);
    setAddingPage(false);
    setNewPageName("");
  }

  function handleDeletePage(pageId: string, pageName: string) {
    if (!confirm(`Delete page "${pageName}"? This removes all its cards.`)) return;
    const other = pages.find((p) => p.id !== pageId);
    if (other) setCurrentPageId(other.id);
    deletePage(pageId);
  }

  function handleRenameStart(pageId: string, name: string) {
    setRenamingId(pageId);
    setRenameValue(name);
  }

  function handleRenameCommit() {
    if (renamingId) {
      const name = renameValue.trim();
      if (name) renamePage(renamingId, name);
    }
    setRenamingId(null);
    setRenameValue("");
  }

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
      <div className="flex items-center gap-1 px-2 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/[0.1] shadow-xl pointer-events-auto">
        {pages.map((page) => (
          <div key={page.id} className="relative flex items-center">
            {renamingId === page.id ? (
              <input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleRenameCommit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameCommit();
                  if (e.key === "Escape") { setRenamingId(null); }
                }}
                autoFocus
                className="w-24 px-3 py-1.5 rounded-full bg-white text-black text-sm font-medium outline-none text-center"
              />
            ) : (
              <button
                onClick={() => setCurrentPageId(page.id)}
                onDoubleClick={() => editMode && handleRenameStart(page.id, page.name)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  currentPageId === page.id
                    ? "bg-white text-black"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {page.name}
              </button>
            )}

            {/* Delete badge — only in edit mode when multiple pages exist */}
            {editMode && pages.length > 1 && renamingId !== page.id && (
              <button
                onClick={(e) => { e.stopPropagation(); handleDeletePage(page.id, page.name); }}
                className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center transition-colors"
                aria-label={`Delete ${page.name}`}
              >
                <X className="h-2.5 w-2.5 text-white" />
              </button>
            )}
          </div>
        ))}

        {/* Add page — only in edit mode */}
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
                onClick={handleAddPage}
                className="text-xs text-white/60 hover:text-white transition-colors shrink-0"
              >
                Add
              </button>
            </div>
          ) : (
            <button
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
  );
}
