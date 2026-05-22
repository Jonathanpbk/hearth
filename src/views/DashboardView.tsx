import type { ReactNode } from "react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { WeatherWidget } from "../components/widgets/WeatherWidget";

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-xs uppercase tracking-widest text-white/40 mb-3 px-1">
      {children}
    </h2>
  );
}

function DashboardGrid({ children }: { children?: ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      {children}
    </div>
  );
}

export function DashboardView() {
  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-8 pb-8">

        {/* ── At a Glance ─────────────────────────────────────────── */}
        <section>
          <SectionLabel>At a Glance</SectionLabel>
          <DashboardGrid>
            <WeatherWidget />
          </DashboardGrid>
        </section>

        {/* ── Lights ──────────────────────────────────────────────── */}
        <section>
          <SectionLabel>Lights</SectionLabel>
          <DashboardGrid>
            {/* LightCards → Step 8 */}
          </DashboardGrid>
        </section>

        {/* ── Switches ────────────────────────────────────────────── */}
        <section>
          <SectionLabel>Switches</SectionLabel>
          <DashboardGrid>
            {/* SwitchCards → Step 8 */}
          </DashboardGrid>
        </section>

        {/* ── Scenes ──────────────────────────────────────────────── */}
        <section>
          <SectionLabel>Scenes</SectionLabel>
          <DashboardGrid>
            {/* SceneCards → Step 9 */}
          </DashboardGrid>
        </section>

        {/* ── Sensors ─────────────────────────────────────────────── */}
        <section>
          <SectionLabel>Sensors</SectionLabel>
          <DashboardGrid>
            {/* SensorCards → Step 10 */}
          </DashboardGrid>
        </section>

      </div>
    </DashboardLayout>
  );
}
