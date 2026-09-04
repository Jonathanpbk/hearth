export interface PreventableInteraction {
  stopPropagation: () => void;
  preventDefault: () => void;
}

export function preventCardInteraction(
  event: PreventableInteraction,
  blocked: boolean
): boolean {
  if (!blocked) return false;
  event.stopPropagation();
  event.preventDefault();
  return true;
}
