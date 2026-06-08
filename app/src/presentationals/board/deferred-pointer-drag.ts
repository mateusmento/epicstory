import { onUnmounted } from "vue";

/** Pointer movement (px) required before `handleDragStart` runs — keeps click / double-click on the card usable. */
export const BOARD_DRAG_ACTIVATION_PX = 8;

/**
 * Wraps vue-dnd-kit `handleDragStart` so drag (and its overlay) only begins after the pointer moves past a small distance.
 */
export function useDeferredPointerDrag(handleDragStart: (e: PointerEvent) => void) {
  let detachDocumentListeners: (() => void) | null = null;

  function clearPending() {
    if (!detachDocumentListeners) return;
    detachDocumentListeners();
    detachDocumentListeners = null;
  }

  onUnmounted(clearPending);

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return;

    clearPending();

    const startX = e.clientX;
    const startY = e.clientY;
    const pointerId = e.pointerId;
    const activationSq = BOARD_DRAG_ACTIVATION_PX * BOARD_DRAG_ACTIVATION_PX;

    const onMove = (move: PointerEvent) => {
      if (move.pointerId !== pointerId) return;
      const dx = move.clientX - startX;
      const dy = move.clientY - startY;
      if (dx * dx + dy * dy >= activationSq) {
        clearPending();
        handleDragStart(move);
      }
    };

    const onEnd = (end: PointerEvent) => {
      if (end.pointerId !== pointerId) return;
      clearPending();
    };

    detachDocumentListeners = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onEnd);
      document.removeEventListener("pointercancel", onEnd);
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerup", onEnd);
    document.addEventListener("pointercancel", onEnd);
  }

  return { onPointerDown };
}
