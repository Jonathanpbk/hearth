import * as LucideIcons from "lucide-react";
import { HelpCircle } from "lucide-react";
import type { LucideProps } from "lucide-react";

function toIconName(name: string): string {
  return name
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

export function DynamicIcon({ name, ...props }: { name: string } & LucideProps) {
  const iconName = name ? toIconName(name) : "";
  const entry = iconName ? (LucideIcons as Record<string, unknown>)[iconName] : undefined;
  const isValid =
    entry != null &&
    (typeof entry === "function" ||
      (typeof entry === "object" && "render" in (entry as object)));
  const Icon = isValid ? (entry as React.ComponentType<LucideProps>) : undefined;

  if (!Icon) return <HelpCircle {...props} />;
  return <Icon {...props} />;
}
