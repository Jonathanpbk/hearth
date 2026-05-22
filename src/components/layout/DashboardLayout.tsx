import type { ReactNode } from "react";
import { Header } from "./Header";

interface Props {
  children: ReactNode;
}

export function DashboardLayout({ children }: Props) {
  return (
    <div className="flex flex-col h-full overflow-hidden bg-[var(--color-bg)]">
      <Header />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
