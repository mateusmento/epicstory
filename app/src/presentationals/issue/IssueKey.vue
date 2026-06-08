<script setup lang="ts">
import { Button } from "@/design-system";
import { cn } from "@/design-system/utils";
import { CheckIcon, CopyIcon } from "lucide-vue-next";
import { ref } from "vue";

const props = withDefaults(
  defineProps<{
    issueKey: string;
    /** Show a copy button (issue detail, etc.). */
    copyable?: boolean;
    size?: "xs" | "sm";
  }>(),
  { copyable: false, size: "xs" },
);

const copied = ref(false);

const sizeClass = props.size === "sm" ? "text-sm" : "text-xs";

async function onCopy(): Promise<void> {
  if (!props.copyable) return;
  try {
    await navigator.clipboard.writeText(props.issueKey);
    copied.value = true;
    window.setTimeout(() => {
      copied.value = false;
    }, 1500);
  } catch {
    /* clipboard unavailable */
  }
}
</script>

<template>
  <span
    :class="
      cn('inline-flex items-center gap-1 font-mono tabular-nums text-muted-foreground shrink-0', sizeClass)
    "
  >
    <span :title="issueKey">{{ issueKey }}</span>
    <Button
      v-if="copyable"
      type="button"
      variant="ghost"
      size="icon"
      class="h-6 w-6 text-muted-foreground hover:text-foreground"
      :title="copied ? 'Copied' : 'Copy issue key'"
      @click.stop="onCopy"
    >
      <CheckIcon v-if="copied" class="h-3.5 w-3.5" />
      <CopyIcon v-else class="h-3.5 w-3.5" />
    </Button>
  </span>
</template>
