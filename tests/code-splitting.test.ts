import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("startup code splitting", () => {
  it("loads application routes on demand", () => {
    const app = source("src/App.tsx");

    expect(app).toContain('lazy(() =>\n  import("./views/DashboardView")');
    expect(app).toContain('lazy(() =>\n  import("./views/SettingsView")');
    expect(app).not.toContain('import { DashboardView } from "./views/DashboardView"');
    expect(app).not.toContain('import { SettingsView } from "./views/SettingsView"');
  });

  it("shows loading and recovery UI for lazy route failures", () => {
    const app = source("src/App.tsx");
    const main = source("src/main.tsx");

    expect(app).toContain("<Suspense fallback={<RuntimeLoading />}>");
    expect(main).toContain("<AppErrorBoundary>");
    expect(main).toContain("</AppErrorBoundary>");
  });

  it("keeps edit modals out of the dashboard startup path", () => {
    const dashboard = source("src/views/DashboardView.tsx");
    const pageDock = source("src/components/dashboard/PageDock.tsx");

    expect(dashboard).toContain('import("../components/dashboard/AddCardModal")');
    expect(dashboard).toContain('import("../components/dashboard/EditCardModal")');
    expect(dashboard).not.toContain(
      'import { AddCardModal } from "../components/dashboard/AddCardModal"'
    );
    expect(dashboard).not.toContain(
      'import { EditCardModal } from "../components/dashboard/EditCardModal"'
    );
    expect(pageDock).toContain('import("./PageSettingsModal")');
    expect(pageDock).not.toContain(
      'import { PageSettingsModal } from "./PageSettingsModal"'
    );
  });

  it("loads the draggable grid only after edit mode starts", () => {
    const dashboard = source("src/views/DashboardView.tsx");
    const viewGrid = source("src/components/dashboard/DashboardGrid.tsx");
    const editGrid = source(
      "src/components/dashboard/EditableDashboardGrid.tsx"
    );

    expect(dashboard).toContain(
      'import("../components/dashboard/EditableDashboardGrid")'
    );
    expect(dashboard).toContain("editMode ? (");
    expect(viewGrid).not.toContain('from "react-grid-layout"');
    expect(viewGrid).not.toContain("react-grid-layout/css/styles.css");
    expect(editGrid).toContain('from "react-grid-layout"');
    expect(editGrid).toContain("react-grid-layout/css/styles.css");
  });

  it("loads only the widget types used on the current dashboard", () => {
    const dashboardCard = source(
      "src/components/dashboard/DashboardCard.tsx"
    );

    for (const widget of [
      "LightCard",
      "SwitchCard",
      "SceneCard",
      "ScriptCard",
      "SensorCard",
      "WeatherWidget",
      "ClockWeatherCard",
      "DreoFanCard",
      "ScenesCard",
    ]) {
      expect(dashboardCard).toContain(`import("../widgets/${widget}")`);
      expect(dashboardCard).not.toContain(
        `import { ${widget} } from "../widgets/${widget}"`
      );
    }
  });

  it("keeps the full Lucide catalogue out of the dashboard bundle", () => {
    const dynamicIcon = source("src/components/DynamicIcon.tsx");

    expect(dynamicIcon).toContain("const PAGE_ICONS");
    expect(dynamicIcon).not.toContain('import * as LucideIcons from "lucide-react"');
    expect(dynamicIcon).not.toContain("Record<string, unknown>");
  });

  it("loads the Recharts sensor graph only after a sensor card is flipped", () => {
    const sensorCard = source("src/components/widgets/SensorCard.tsx");
    const sensorChart = source("src/components/widgets/SensorHistoryChart.tsx");

    expect(sensorCard).toContain('lazy(() => import("./SensorHistoryChart"))');
    expect(sensorCard).toContain("!stateUnavailable && flipped && history.length > 1");
    expect(sensorCard).not.toContain('from "recharts"');
    expect(sensorChart).toContain('from "recharts"');
  });

  it("blocks grid collisions without compacting placed cards", () => {
    const dashboardGrid = source(
      "src/components/dashboard/EditableDashboardGrid.tsx"
    );

    expect(dashboardGrid).toContain("getCompactor(null, false, true)");
    expect(dashboardGrid).toContain("compactor={fixedPositionCompactor}");
    expect(dashboardGrid).not.toContain("allowOverlap");
  });
});
