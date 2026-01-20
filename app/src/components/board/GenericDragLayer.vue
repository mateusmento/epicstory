<script setup>
import { computed, shallowRef, watch } from 'vue';
import RenderVNode from './RenderVNode.vue';

/**
 * Generic overlay layer for @vue-dnd-kit/core.
 *
 * Goals:
 * - Avoid v-html.
 * - Match the dragged item's size (width/height) by reading the original node rect.
 * - Allow per-item overlay UI via `data.overlay.component` + `data.overlay.props`.
 */
const props = defineProps({
  id: { type: [String, Number], default: '' },
  node: { type: Object, default: null }, // HTMLElement
  data: { type: Object, default: null },
});

// Freeze the size once to avoid jitter when the source element changes styles/layout during drag.
const frozenRect = shallowRef(null);

watch(
  () => props.node,
  (el) => {
    if (frozenRect.value) return;
    if (!el || typeof el.getBoundingClientRect !== 'function') return;
    frozenRect.value = el.getBoundingClientRect();
  },
  { immediate: true, flush: 'post' }
);

const style = computed(() => {
  const r = frozenRect.value;
  if (!r) return {};
  return {
    width: `${r.width}px`,
    height: `${r.height}px`,
  };
});

const overlayComponent = computed(() => props.data?.overlay?.component ?? null);
const overlayProps = computed(() => props.data?.overlay?.props ?? {});
const overlayRender = computed(() => props.data?.overlay?.render ?? null);
const wrapperClass = computed(
  () => props.data?.overlay?.wrapperClass ?? 'vue-dnd-generic-overlay'
);
</script>

<template>
  <div :class="wrapperClass" :style="style">
    <RenderVNode v-if="overlayRender" :render="overlayRender" />
    <component v-else-if="overlayComponent" :is="overlayComponent" v-bind="overlayProps" />
    <div v-else class="vue-dnd-generic-overlay-fallback">
      {{ String(id) }}
    </div>
  </div>
</template>

<style scoped>
.vue-dnd-generic-overlay {
  /* The DragOverlay wrapper already positions this; we mainly size it. */
  display: block;
}
</style>

