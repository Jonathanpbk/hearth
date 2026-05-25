import type { HTMLAttributes } from "react";
import { useUndimGuard } from "../hooks/useUndimGuard";

type Props = HTMLAttributes<HTMLDivElement>;

/**
 * Drop-in replacement for a card root <div>. Intercepts all click and
 * touch events in the capture phase and silently drops them if the screen
 * was recently undimmed (within the guard window). All other props,
 * including className, style, and onClick, pass through unchanged.
 */
export function InteractiveCard({ children, onClickCapture, onTouchStartCapture, ...props }: Props) {
  const isGuarded = useUndimGuard();

  function block(e: React.SyntheticEvent) {
    if (isGuarded()) {
      e.stopPropagation();
      e.preventDefault();
    }
  }

  return (
    <div
      {...props}
      onClickCapture={(e) => { block(e); onClickCapture?.(e); }}
      onTouchStartCapture={(e) => { block(e); onTouchStartCapture?.(e); }}
    >
      {children}
    </div>
  );
}
