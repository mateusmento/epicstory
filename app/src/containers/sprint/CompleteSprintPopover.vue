<script setup lang="ts">
import { Button, Popover, PopoverContent, PopoverTrigger, Separator } from "@/design-system";
import { useSprint } from "@/domain/sprint";
import type { CompleteSprintResult, ISprint } from "@epicstory/contracts";
import { computed, ref } from "vue";
import { CheckIcon, PlayIcon } from "lucide-vue-next";

const props = defineProps<{
  sprint: ISprint;
  action: "start" | "complete";
}>();

const emit = defineEmits<{
  started: [sprint: ISprint];
  completed: [result: CompleteSprintResult];
}>();

const open = ref(false);
const loading = ref(false);
const { startSprint, completeSprint, fetchSprintItems, sprintItems } = useSprint();

const items = computed(() => sprintItems.value.get(props.sprint.id) ?? []);
const doneCount = computed(() => items.value.filter((i) => i.issue?.status === "done").length);
const doingCount = computed(() => items.value.filter((i) => i.issue?.status === "doing").length);
const todoCount = computed(
  () => items.value.filter((i) => !["done", "doing"].includes(i.issue?.status ?? "")).length,
);

async function loadStats() {
  if (props.action === "complete" && !sprintItems.value.get(props.sprint.id)) {
    await fetchSprintItems(props.sprint.id);
  }
}

async function handleStart() {
  loading.value = true;
  try {
    const updated = await startSprint(props.sprint.id);
    open.value = false;
    emit("started", updated!);
  } finally {
    loading.value = false;
  }
}

async function handleComplete() {
  loading.value = true;
  try {
    const result = await completeSprint(props.sprint.id);
    open.value = false;
    emit("completed", result);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <Popover v-model:open="open" @update:open="(v) => v && loadStats()">
    <PopoverTrigger as-child>
      <Button v-if="action === 'start'" variant="outline" size="sm" class="text-xs h-7">
        <PlayIcon class="size-3 mr-1" />
        Start
      </Button>
      <Button v-else size="sm" variant="outline" class="text-xs h-7">
        <CheckIcon class="size-3 mr-1" />
        Complete
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-72 p-4" align="end">
      <div class="flex:col gap-3">
        <div class="text-sm font-medium">
          {{ action === "start" ? "Start" : "Complete" }} "{{ sprint.name }}"?
        </div>

        <template v-if="action === 'complete'">
          <Separator />
          <div class="flex:row gap-4 text-xs text-muted-foreground">
            <span
              ><span class="font-medium text-foreground">{{ doneCount }}</span> done</span
            >
            <span
              ><span class="font-medium text-foreground">{{ doingCount }}</span> in-progress</span
            >
            <span
              ><span class="font-medium text-foreground">{{ todoCount }}</span> todo</span
            >
          </div>
          <div class="text-xs text-muted-foreground">
            <div v-if="doingCount > 0">In-progress → Next sprint (auto)</div>
            <div v-if="todoCount > 0">Todo → Backlog (auto)</div>
          </div>
          <Separator />
        </template>

        <div class="flex:row-md justify-end">
          <Button variant="ghost" size="sm" @click="open = false">Cancel</Button>
          <Button v-if="action === 'start'" size="sm" :disabled="loading" @click="handleStart">
            Start sprint
          </Button>
          <Button v-else size="sm" :disabled="loading" @click="handleComplete"> Complete sprint </Button>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>
