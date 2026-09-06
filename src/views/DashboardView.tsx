import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Plus, Undo2 } from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { DashboardGrid } from "../components/dashboard/DashboardGrid";
import { PageDock } from "../components/dashboard/PageDock";
import { useSettingsStore } from "../store/useSettingsStore";
import { useDashboardStore } from "../store/useDashboardStore";
import type { CardConfig } from "../types/dashboard";
import type { DeletedCardSnapshot } from "../lib/dashboard-edit";

const AddCardModal = lazy(() =>
  import("../components/dashboard/AddCardModal").then((module) => ({
    default: module.AddCardModal,
  }))
);
const EditCardModal = lazy(() =>
  import("../components/dashboard/EditCardModal").then((module) => ({
    default: module.EditCardModal,
  }))
);

export function DashboardView() {
  const persistedPages = useSettingsStore((s) => s.settings.pages);

  const editMode = useDashboardStore((s) => s.editMode);
  const draftPages = useDashboardStore((s) => s.draftPages);
  const currentPageId = useDashboardStore((s) => s.currentPageId);
  const setCurrentPageId = useDashboardStore((s) => s.setCurrentPageId);
  const deleteCard = useDashboardStore((s) => s.deleteCard);
  const restoreCard = useDashboardStore((s) => s.restoreCard);
  const updateLayout = useDashboardStore((s) => s.updateLayout);
  const pages = editMode && draftPages ? draftPages : persistedPages;

  const [addCardOpen, setAddCardOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CardConfig | null>(null);
  const [pendingDeletion, setPendingDeletion] =
    useState<DeletedCardSnapshot | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearPendingDeletion() {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = null;
    setPendingDeletion(null);
  }

  function handleDeleteCard(cardId: string) {
    if (!currentPage) return;
    const card = currentPage.cards.find((candidate) => candidate.id === cardId);
    if (!card) return;
    const label = card.title || card.entityId || card.type;
    if (!confirm(`Delete "${label}"?`)) return;

    const deletion = deleteCard(currentPage.id, cardId);
    if (!deletion) return;
    clearPendingDeletion();
    setPendingDeletion(deletion);
    undoTimerRef.current = setTimeout(() => {
      undoTimerRef.current = null;
      setPendingDeletion(null);
    }, 8000);
  }

  function undoDeleteCard() {
    if (!pendingDeletion) return;
    restoreCard(pendingDeletion);
    clearPendingDeletion();
  }

  // Initialise / repair the current page pointer
  useEffect(() => {
    if (!currentPageId && pages.length > 0) {
      setCurrentPageId(pages[0].id);
      return;
    }
    if (currentPageId && !pages.find((p) => p.id === currentPageId) && pages.length > 0) {
      setCurrentPageId(pages[0].id);
    }
  }, [currentPageId, pages, setCurrentPageId]);

  useEffect(() => {
    if (!editMode) clearPendingDeletion();
  }, [editMode]);

  useEffect(
    () => () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    },
    []
  );

  const currentPage = pages.find((p) => p.id === currentPageId) ?? pages[0];

  return (
    <DashboardLayout>
      <div className="relative h-full">
        {/* Scrollable content area — leaves room for dock at bottom */}
        <div className="h-full overflow-y-auto pb-16">
          {!currentPage || currentPage.cards.length === 0 ? (
            <EmptyPage editMode={editMode} onAddCard={() => setAddCardOpen(true)} />
          ) : (
            <DashboardGrid
              key={`${currentPage.id}:${editMode ? "edit" : "view"}`}
              cards={currentPage.cards}
              layout={currentPage.layout}
              editMode={editMode}
              onLayoutChange={(layout) => updateLayout(currentPage.id, layout)}
              onEditCard={setEditingCard}
              onDeleteCard={handleDeleteCard}
            />
          )}
        </div>

        {/* Add Card FAB — visible in edit mode */}
        {editMode && currentPage && (
          <button
            onClick={() => setAddCardOpen(true)}
            className="absolute bottom-20 right-4 flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium shadow-lg transition-colors z-10"
          >
            <Plus className="h-4 w-4" />
            Add Card
          </button>
        )}

        <PageDock />

        {editMode && pendingDeletion && (
          <div
            role="status"
            className="absolute bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-xl border border-white/[0.1] bg-[var(--color-surface-2)] px-4 py-3 text-sm text-white shadow-xl"
          >
            <span>Card removed.</span>
            <button
              type="button"
              onClick={undoDeleteCard}
              className="flex items-center gap-1.5 font-medium text-[#ffc174] hover:text-white"
            >
              <Undo2 className="h-4 w-4" />
              Undo
            </button>
          </div>
        )}
      </div>

      <Suspense fallback={null}>
        {addCardOpen && currentPage && (
          <AddCardModal
            pageId={currentPage.id}
            currentLayout={currentPage.layout}
            onClose={() => setAddCardOpen(false)}
          />
        )}
        {editingCard && currentPage && (
          <EditCardModal
            card={editingCard}
            pageId={currentPage.id}
            onClose={() => setEditingCard(null)}
          />
        )}
      </Suspense>
    </DashboardLayout>
  );
}

function EmptyPage({
  editMode,
  onAddCard,
}: {
  editMode: boolean;
  onAddCard: () => void;
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 text-center p-8">
      {editMode ? (
        <>
          <p className="text-sm text-white/30">No cards on this page yet</p>
          <button
            onClick={onAddCard}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add your first card
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-white/30">This page is empty</p>
          <p className="text-xs text-white/20">
            Tap the pencil icon in the header to add cards
          </p>
        </>
      )}
    </div>
  );
}
