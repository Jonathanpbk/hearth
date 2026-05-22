import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { DashboardGrid } from "../components/dashboard/DashboardGrid";
import { AddCardModal } from "../components/dashboard/AddCardModal";
import { EditCardModal } from "../components/dashboard/EditCardModal";
import { PageDock } from "../components/dashboard/PageDock";
import { useSettingsStore } from "../store/useSettingsStore";
import { useDashboardStore } from "../store/useDashboardStore";
import type { CardConfig } from "../types/dashboard";

export function DashboardView() {
  const pages = useSettingsStore((s) => s.settings.pages);
  const removeCard = useSettingsStore((s) => s.removeCard);
  const updateLayout = useSettingsStore((s) => s.updateLayout);

  const editMode = useDashboardStore((s) => s.editMode);
  const currentPageId = useDashboardStore((s) => s.currentPageId);
  const setCurrentPageId = useDashboardStore((s) => s.setCurrentPageId);

  const [addCardOpen, setAddCardOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CardConfig | null>(null);

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
              cards={currentPage.cards}
              layout={currentPage.layout}
              editMode={editMode}
              onLayoutChange={(layout) => updateLayout(currentPage.id, layout)}
              onEditCard={setEditingCard}
              onDeleteCard={(id) => removeCard(currentPage.id, id)}
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
      </div>

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
