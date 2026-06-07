<script setup lang="ts">
import { cn } from "@/design-system/utils";
import { computed, type HTMLAttributes } from "vue";
import {
  DEFAULT_DOT_PATTERN_COLS,
  DEFAULT_DOT_PATTERN_ROWS,
  dotPatternGrid,
  mirrorDotPatternGrid,
  type DotPatternId,
} from "./dot-patterns";

const props = withDefaults(
  defineProps<{
    pattern?: DotPatternId;
    rows?: number;
    cols?: number;
    dotSize?: number;
    gap?: number;
    mirrored?: boolean;
    rounded?: boolean;
    class?: HTMLAttributes["class"];
  }>(),
  {
    pattern: "scatter",
    rows: DEFAULT_DOT_PATTERN_ROWS,
    cols: DEFAULT_DOT_PATTERN_COLS,
    dotSize: 2,
    gap: 3,
    mirrored: false,
    rounded: true,
  },
);

const gridData = computed(() => {
  const base = dotPatternGrid(props.pattern, props.rows, props.cols);
  return props.mirrored ? mirrorDotPatternGrid(base) : base;
});

const gridStyle = computed(() => ({
  "--dot-size": `${props.dotSize}px`,
  "--dot-gap": `${props.gap}px`,
  "--dot-cols": props.cols,
  "--dot-rows": props.rows,
}));
</script>

<template>
  <div :class="cn('dot-pattern', props.class)" :style="gridStyle" aria-hidden="true">
    <span
      v-for="(tone, index) in gridData.flat()"
      :key="index"
      :class="
        cn('dot-pattern__dot', `dot-pattern__dot--${tone}`, !props.rounded && 'dot-pattern__dot--square')
      "
    />
  </div>
</template>

<style scoped lang="scss">
.dot-pattern {
  display: grid;
  grid-template-columns: repeat(var(--dot-cols), var(--dot-size));
  grid-template-rows: repeat(var(--dot-rows), var(--dot-size));
  gap: var(--dot-gap);
  flex-shrink: 0;
  width: calc(var(--dot-cols) * var(--dot-size) + (var(--dot-cols) - 1) * var(--dot-gap));
  height: calc(var(--dot-rows) * var(--dot-size) + (var(--dot-rows) - 1) * var(--dot-gap));
}

.dot-pattern__dot {
  width: var(--dot-size);
  height: var(--dot-size);
  border-radius: 9999px;

  &--square {
    border-radius: 0;
  }

  &--light {
    background: #e2e8f0;
  }

  &--mid {
    background: #94a3b8;
  }

  &--dark {
    background: #475569;
  }
}
</style>
