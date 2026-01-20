import type { IDnDPayload, IDnDStore } from "@vue-dnd-kit/core";

export function flyToPlaceTransition(store: IDnDStore, payload: IDnDPayload): Promise<boolean> {
  // Return a Promise to keep the overlay mounted until we finish the animation.
  return new Promise((resolve) => {
    try {
      const overlayEl = document.querySelector("#vue-dnd-kit-overlay > div");
      if (!(overlayEl instanceof HTMLElement)) {
        resolve(true);
        return;
      }

      const activeId = payload?.items?.[0]?.id ?? null;

      const findNodeById = (id: string | number) => {
        // elementsMap: Map<Element, { id, node, data, ... }>
        for (const [key, entry] of store.elementsMap.value.entries()) {
          if (entry?.id !== id) continue;
          const node = (entry?.node ?? key) as Element | null;
          if (!node) continue;
          // avoid measuring detached nodes (often yield 0,0,0,0 rect)
          if ((node as any).isConnected === false) continue;
          return node;
        }
        return null;
      };

      const resolveTargetRect = () => {
        if (activeId !== null) {
          const activeNode = findNodeById(activeId);
          if (activeNode) return activeNode.getBoundingClientRect();
        }
        const hoveredEl = store.hovered?.element?.value;
        if (hoveredEl) return hoveredEl.getBoundingClientRect();
        const hoveredZone = store.hovered?.zone?.value;
        if (hoveredZone) return hoveredZone.getBoundingClientRect();
        return null;
      };

      // Animate the overlay container (position: fixed; top/left:0; transform: translate3d(...))
      overlayEl.style.willChange = "transform";
      overlayEl.style.transition = "transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)";

      // Wait a frame or two so Vue has a chance to render the dropped element in its final place.
      const maxFrames = 8;
      let frame = 0;
      const tick = () => {
        const target = resolveTargetRect();
        if (target) {
          overlayEl.style.transform = `translate3d(${target.left}px, ${target.top}px, 0)`;
          return;
        }
        frame += 1;
        if (frame >= maxFrames) return;
        requestAnimationFrame(tick);
      };

      // Next frame so transition applies
      requestAnimationFrame(tick);

      // Resolve when the transform transition finishes (more robust than setTimeout).
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        overlayEl.removeEventListener("transitionend", onEnd);
        // let dnd-kit clean up overlay after we resolve
        resolve(true);
      };

      const onEnd = (evt: TransitionEvent) => {
        if (evt.target !== overlayEl) return;
        if (evt.propertyName !== "transform") return;
        finish();
      };

      overlayEl.addEventListener("transitionend", onEnd);
      // Safety fallback in case transitionend doesn't fire (e.g. element removed early)
      window.setTimeout(finish, 400);
    } catch {
      resolve(true);
    }
  });
}
