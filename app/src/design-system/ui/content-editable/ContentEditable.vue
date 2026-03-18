<script setup lang="ts">
import { cn } from "@/design-system/utils";
import { computed, nextTick, ref, watch } from "vue";

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(
  defineProps<{
    as?: string;
    placeholder?: string;
    /**
     * If true, newlines are stripped and Enter submits.
     */
    singleLine?: boolean;
    /**
     * If true, stops propagation for key events so parent shortcuts don't hijack editing.
     */
    stopKeyPropagation?: boolean;
    /**
     * Select all text when entering edit mode.
     */
    selectOnFocus?: boolean;
    class?: any;
  }>(),
  {
    as: "div",
    placeholder: "",
    singleLine: true,
    stopKeyPropagation: true,
    selectOnFocus: true,
  },
);

const modelValue = defineModel<string>({ default: "" });
const editable = defineModel<boolean>("editable", { default: false });

const emit = defineEmits<{
  (e: "submit", value: string): void;
  (e: "cancel"): void;
}>();

const el = ref<HTMLElement | null>(null);
const snapshot = ref<string>("");

function syncDomFromModel() {
  if (!el.value) return;
  const text = modelValue.value ?? "";
  // Use textContent to preserve spaces exactly as typed.
  if (el.value.textContent !== text) el.value.textContent = text;
}

function selectAll() {
  if (!el.value) return;
  if (typeof document === "undefined" || typeof window === "undefined") return;
  try {
    const range = document.createRange();
    range.selectNodeContents(el.value);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  } catch {
    // ignore selection errors
  }
}

watch(
  editable,
  async (isEditing) => {
    if (!isEditing) return;
    snapshot.value = modelValue.value ?? "";
    await nextTick();
    syncDomFromModel();
    el.value?.focus?.();
    if (props.selectOnFocus) selectAll();
  },
  // Important: when the component mounts already editable=true (common when toggling v-if branches),
  // we still need to sync + focus/select.
  { immediate: true },
);

watch(
  modelValue,
  () => {
    if (editable.value) return;
    syncDomFromModel();
  },
  { immediate: true },
);

function normalizeText(text: string) {
  if (!props.singleLine) return text;
  return text.replace(/\n/g, "");
}

function onInput(e: Event) {
  const target = e.target as HTMLElement | null;
  if (!target) return;
  modelValue.value = normalizeText(target.innerText ?? "");
}

function onKeydown(e: KeyboardEvent) {
  if (props.stopKeyPropagation) e.stopPropagation();

  if (props.singleLine && e.key === "Enter") {
    e.preventDefault();
    emit("submit", (modelValue.value ?? "").trim());
    editable.value = false;
    return;
  }

  if (e.key === "Escape") {
    e.preventDefault();
    modelValue.value = snapshot.value;
    emit("cancel");
    editable.value = false;
  }
}

function stop(e: KeyboardEvent) {
  if (props.stopKeyPropagation) e.stopPropagation();
}

const placeholderAttr = computed(() => props.placeholder ?? "");
</script>

<template>
  <component
    :is="as"
    ref="el"
    v-bind="$attrs"
    :contenteditable="editable"
    role="textbox"
    :aria-label="placeholderAttr || 'Editable text'"
    :data-placeholder="placeholderAttr"
    :class="
      cn(
        'bg-transparent outline-none',
        editable &&
          'empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none',
        props.class,
      )
    "
    @input="onInput"
    @keydown="onKeydown"
    @keyup="stop"
    @keypress="stop"
  />
</template>
