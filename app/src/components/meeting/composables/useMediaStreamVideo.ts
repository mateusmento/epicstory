import type { Ref } from "vue";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

type MaybeStream = MediaStream | null | undefined;

/**
 * Attach/detach a MediaStream to a <video> element in a performant way:
 * - only assigns srcObject when needed (avoids doing it every render)
 * - detaches when the element isn't visible (IntersectionObserver), reducing decode/paint work
 * - optional `audioSinkId`: `HTMLMediaElement.setSinkId` for remote playback routing (where supported)
 */
export function useMediaStreamVideo(
  videoEl: Ref<HTMLVideoElement | null>,
  stream: Ref<MaybeStream>,
  enabled?: Ref<boolean>,
  audioSinkId?: Ref<string | null | undefined>,
) {
  const sinkRef = audioSinkId ?? ref<string | null | undefined>(undefined);
  let observer: IntersectionObserver | null = null;
  let isVisible = true;

  function detach(el: HTMLVideoElement) {
    if (el.srcObject) el.srcObject = null;
  }

  function attach(el: HTMLVideoElement, s: MediaStream) {
    if (el.srcObject !== s) el.srcObject = s;
  }

  function sync() {
    const el = videoEl.value;
    if (!el) return;

    const s = stream.value ?? null;
    const on = enabled?.value ?? true;
    const shouldAttach = !!s && on && isVisible;

    if (!shouldAttach) {
      detach(el);
      return;
    }

    attach(el, s);
    applySinkId(el);
  }

  function applySinkId(el: HTMLVideoElement) {
    const sink = sinkRef.value;
    if (!sink || typeof el.setSinkId !== "function") return;
    void el.setSinkId(sink).catch(() => {});
  }

  function observe(el: HTMLVideoElement) {
    observer?.disconnect();
    observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        isVisible = !!entry?.isIntersecting;
        sync();
      },
      { threshold: 0.01 },
    );
    observer.observe(el);
  }

  onMounted(() => {
    if (videoEl.value) observe(videoEl.value);
    sync();
  });

  watch(videoEl, (el, prev) => {
    if (prev) detach(prev);
    if (el) observe(el);
    sync();
  });

  watch([stream, enabled ?? stream, sinkRef], sync);

  onBeforeUnmount(() => {
    observer?.disconnect();
    observer = null;
    if (videoEl.value) detach(videoEl.value);
  });
}
