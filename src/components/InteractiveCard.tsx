import type { HTMLAttributes, SyntheticEvent } from "react";
import { useUndimGuard } from "../hooks/useUndimGuard";
import { preventCardInteraction } from "../lib/interaction-guard";

type Props = HTMLAttributes<HTMLDivElement> & {
  interactionDisabled?: boolean;
};

/**
 * Drop-in replacement for a card root <div>. Intercepts click and pointer
 * events in the capture phase when the card is disabled or the screen was
 * recently undimmed (within the guard window). All other props,
 * including className, style, and onClick, pass through unchanged.
 */
export function InteractiveCard({
  children,
  interactionDisabled = false,
  onClickCapture,
  onPointerDownCapture,
  onTouchStartCapture,
  ...props
}: Props) {
  const isGuarded = useUndimGuard();

  function block(e: SyntheticEvent): boolean {
    return preventCardInteraction(e, interactionDisabled || isGuarded());
  }

  return (
    <div
      {...props}
      aria-disabled={interactionDisabled || props["aria-disabled"]}
      onClickCapture={(e) => {
        if (!block(e)) onClickCapture?.(e);
      }}
      onPointerDownCapture={(e) => {
        if (!block(e)) onPointerDownCapture?.(e);
      }}
      onTouchStartCapture={(e) => {
        if (!block(e)) onTouchStartCapture?.(e);
      }}
    >
      {children}
    </div>
  );
}
