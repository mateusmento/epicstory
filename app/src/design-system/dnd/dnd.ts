import type { Directive } from "vue";

export const vDropzone: Directive<HTMLElement> = {
  mounted(el, binding, vnode, prevVNode) {
    makeDropzone(el);
  },
};

export const vDraggable: Directive<HTMLElement> = {
  mounted(el, binding, vnode, prevVNode) {
    makeDraggable(el);
  },
};

export function makeDropzone(dropzone: HTMLElement) {
  dropzone?.addEventListener("dragover", function dragOver(e) {
    e.preventDefault();
    e.stopPropagation();
  });

  dropzone?.addEventListener("drop", function drop(e) {
    e.preventDefault();
  });
}

export function makeDraggable(element: HTMLElement) {
  element.setAttribute("draggable", "true");

  function dragEnter(e: MouseEvent) {
    console.log("enter", e.target);
  }

  element.parentElement?.addEventListener("dragenter", dragEnter);

  element.addEventListener("dragstart", function dragStart(e) {
    console.log("dragstart");

    const transparentImage = new Image();
    transparentImage.src = "";
    e.dataTransfer?.setDragImage(transparentImage, 0, 0);

    const placeholder = document.createElement("div");
    placeholder.classList.add("w-96", "h-52", "border-2", "border-dashed", "border-zinc-300");

    // element.parentElement?.insertBefore(placeholder, element);

    const { x, y } = element.getBoundingClientRect();
    const { offsetX, offsetY } = e;

    function mouseMove(e: DragEvent) {
      e.preventDefault();
      e.stopPropagation();

      console.log("dragover");
      element.style.position = "fixed";
      element.style.left = e.x - offsetX + "px";
      element.style.top = e.y - offsetY + "px";
    }

    element.parentElement?.addEventListener("dragover", mouseMove);

    function dragEnd() {
      console.log("dragend");
      element.parentElement?.removeEventListener("dragover", mouseMove);
      element.removeEventListener("dragend", dragEnd);
      element.style.transition = "200ms";
      element.style.left = x + "px";
      element.style.top = y + "px";
      const transitionEnd = () => {
        element.style.transition = "";
        element.style.position = "";
        element.removeEventListener("transitionend", transitionEnd);
        // placeholder.remove();
      };
      element.addEventListener("transitionend", transitionEnd);
    }

    element.addEventListener("dragend", dragEnd);
  });
}
