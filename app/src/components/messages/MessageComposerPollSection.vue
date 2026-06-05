<script lang="ts" setup>
import { Button, Input, Label } from "@/design-system";
import type { MessagePollBody } from "@epicstory/contracts";
import { Plus, Trash2 } from "lucide-vue-next";

const props = defineProps<{
  modelValue: MessagePollBody | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [MessagePollBody | null];
}>();

function updateQuestion(q: string) {
  const v = props.modelValue;
  if (!v) return;
  emit("update:modelValue", { ...v, question: q });
}

function updateOption(i: number, label: string) {
  const v = props.modelValue;
  if (!v) return;
  const options = v.options.map((o, j) => (j === i ? { ...o, label } : o));
  emit("update:modelValue", { ...v, options });
}

function addOption() {
  const v = props.modelValue;
  if (!v || v.options.length >= 10) return;
  emit("update:modelValue", {
    ...v,
    options: [...v.options, { id: crypto.randomUUID(), label: "" }],
  });
}

function removeOption(i: number) {
  const v = props.modelValue;
  if (!v || v.options.length <= 2) return;
  emit("update:modelValue", {
    ...v,
    options: v.options.filter((_, j) => j !== i),
  });
}
</script>

<template>
  <div v-if="modelValue" class="flex flex-col gap-2 border-t border-border/80 pt-2 mt-1 shrink-0" @click.stop>
    <div class="flex flex-col gap-1.5 w-96">
      <Label for="composer-poll-question" class="text-xs text-muted-foreground">Poll Question</Label>
      <Input
        id="composer-poll-question"
        maxlength="500"
        placeholder="Ask something…"
        class="text-sm"
        :model-value="modelValue.question"
        @update:model-value="updateQuestion($event ?? '')"
      />
    </div>
    <div class="flex flex-col gap-1.5 w-fit">
      <span class="text-xs text-muted-foreground">Poll Options (2–10)</span>
      <div v-for="(opt, i) in modelValue.options" :key="opt.id" class="flex items-center gap-1.5">
        <Input
          maxlength="200"
          :placeholder="`Option ${i + 1}`"
          class="text-sm min-w-0 w-96"
          :model-value="opt.label"
          @update:model-value="updateOption(i, $event ?? '')"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          class="h-8 w-8 shrink-0 text-muted-foreground"
          :disabled="modelValue.options.length <= 2"
          title="Remove option"
          aria-label="Remove option"
          @click="removeOption(i)"
        >
          <Trash2 class="size-4" />
        </Button>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        class="w-fit text-xs"
        :disabled="modelValue.options.length >= 10"
        @click="addOption"
      >
        <Plus class="size-3.5 mr-1" />
        Add option
      </Button>
    </div>
  </div>
</template>
