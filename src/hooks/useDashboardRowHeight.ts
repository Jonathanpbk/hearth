import { useEffect, useState } from "react";
import { computeDashboardRowHeight } from "../lib/dashboard-grid";

export function useDashboardRowHeight(): number {
  const [rowHeight, setRowHeight] = useState(() =>
    computeDashboardRowHeight(window.innerHeight)
  );

  useEffect(() => {
    const update = () =>
      setRowHeight(computeDashboardRowHeight(window.innerHeight));
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return rowHeight;
}
