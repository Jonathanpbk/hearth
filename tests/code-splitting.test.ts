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

    expect(dashboard).toContain('import("../components/dashboard/AddCardModal")');
    expect(dashboard).toContain('import("../components/dashboard/EditCardModal")');
    expect(dashboard).not.toContain(
      'import { AddCardModal } from "../components/dashboard/AddCardModal"'
    );
    expect(dashboard).not.toContain(
      'import { EditCardModal } from "../components/dashboard/EditCardModal"'
    );
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
    const dashboardGrid = source("src/components/dashboard/DashboardGrid.tsx");

    expect(dashboardGrid).toContain("getCompactor(null, false, true)");
    expect(dashboardGrid).toContain("compactor={fixedPositionCompactor}");
    expect(dashboardGrid).not.toContain("allowOverlap");
  });
});
