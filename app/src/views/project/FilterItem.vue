<script setup lang="ts">
import {
  ButtonGroup,
  Button,
  Menu,
  MenuContent,
  MenuItem,
  MenuInput,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from "@/design-system";
import { Icon } from "@/design-system/icons";
import { IssueDueDateMenu, IssueLabelsDropdown, IssueStatusMenu } from "@/components/issue";
import { formatDate, isThisYear, isToday } from "date-fns";
import { computed, ref, watch } from "vue";
import {
  FIELD_ALLOWED_OPERATORS,
  FILTER_FIELDS,
  FILTER_OPERATORS,
  type ProjectFilter,
  type ProjectFilterOperator,
} from "./filters/project-filters.types";
import { IssuePickerMenu } from "@/components/issue";
import { useIssues } from "@/domain/issues";

defineEmits<{
  (e: "remove"): void;
}>();

const props = defineProps<{
  projectId: number;
}>();

const modelValue = defineModel<ProjectFilter>({ required: true });

const operatorOptions = computed(() => FIELD_ALLOWED_OPERATORS[modelValue.value.field]);

function setOperator(op: ProjectFilterOperator) {
  modelValue.value = { ...modelValue.value, operator: op };
}

function setValue(value: any) {
  modelValue.value = { ...modelValue.value, value };
}

function formatDueDate(date: Date) {
  if (isToday(date)) return "Today";
  if (isThisYear(date)) return formatDate(date, "MMM d");
  return formatDate(date, "MMM d, yyyy");
}

const STATUS_LABEL: Record<string, string> = {
  backlog: "Backlog",
  todo: "Todo",
  doing: "In progress",
  done: "Done",
};

const PRIORITY_LABEL: Record<number, string> = {
  0: "No priority",
  1: "Low",
  2: "Medium",
  3: "High",
  4: "Urgent",
};

const titleDraft = ref("");
watch(
  () => modelValue.value,
  (f) => {
    if (f.field === "title") titleDraft.value = String(f.value ?? "");
  },
  { immediate: true, deep: true },
);

const titlePreview = computed(() => {
  const v = String(modelValue.value.value ?? "").trim();
  return v ? v : "Any";
});

const dueDatePreview = computed(() => {
  const v = modelValue.value.value;
  if (!v) return "Any";
  try {
    const d = new Date(String(v));
    if (Number.isNaN(d.getTime())) return "Any";
    return formatDueDate(d);
  } catch {
    return "Any";
  }
});

const statusPreview = computed(() => {
  const v = modelValue.value.value;
  if (!v) return "Any";
  return STATUS_LABEL[String(v)] ?? String(v);
});

const priorityPreview = computed(() => {
  const v = modelValue.value.value;
  if (v === null || v === undefined || v === "") return "Any";
  const n = typeof v === "number" ? v : Number(v);
  return PRIORITY_LABEL[n] ?? `Priority ${n}`;
});

const { issues } = useIssues();

const parentIssue = computed(() => {
  const v = modelValue.value.value as any;
  if (!v) return null;
  return issues.value.find((i) => i.id === v);
});

const parentPreview = computed(() => {
  return parentIssue.value ? `EP-${parentIssue.value.id}` : "Any";
});
</script>

<template>
  <ButtonGroup>
    <Button variant="outline" size="badge" class="flex:row-sm flex:center-y">
      <Icon name="oi-filter" class="w-4 h-4 text-muted-foreground" />
      {{ FILTER_FIELDS[modelValue.field] }}
    </Button>

    <Menu>
      <MenuTrigger as-child>
        <Button variant="outline" size="badge">{{ FILTER_OPERATORS[modelValue.operator] }}</Button>
      </MenuTrigger>
      <MenuContent class="w-56">
        <MenuRadioGroup
          :model-value="modelValue.operator"
          @update:model-value="setOperator($event as ProjectFilterOperator)"
        >
          <MenuRadioItem v-for="op in operatorOptions" :key="op" :value="op">
            {{ FILTER_OPERATORS[op] }}
          </MenuRadioItem>
        </MenuRadioGroup>
      </MenuContent>
    </Menu>

    <!-- Value selector -->
    <template v-if="modelValue.field === 'labels'">
      <IssueLabelsDropdown
        :model-value="Array.isArray(modelValue.value) ? modelValue.value : []"
        @update:model-value="setValue($event)"
        v-slot="{ selectedLabels }"
      >
        <Button variant="outline" size="badge" class="flex:row-sm flex:center-y text-muted-foreground">
          <template v-if="selectedLabels.length === 0">Any</template>
          <span
            v-for="label in selectedLabels"
            :key="label.id"
            class="h-2 w-2 rounded-full ring-1 ring-border"
            :style="{ backgroundColor: label.color }"
          />
        </Button>
      </IssueLabelsDropdown>
    </template>

    <template v-else-if="modelValue.field === 'status'">
      <Menu>
        <MenuTrigger as-child>
          <Button variant="outline" size="badge" class="text-muted-foreground">{{ statusPreview }}</Button>
        </MenuTrigger>
        <MenuContent as-child align="start" side="bottom">
          <IssueStatusMenu :value="(modelValue.value as any) ?? null" @select="setValue($event)" />
        </MenuContent>
      </Menu>
    </template>

    <template v-else-if="modelValue.field === 'dueDate'">
      <Menu>
        <MenuTrigger as-child>
          <Button variant="outline" size="badge" class="text-muted-foreground">{{ dueDatePreview }}</Button>
        </MenuTrigger>
        <MenuContent class="p-0" align="start" side="bottom">
          <IssueDueDateMenu :due-date="(modelValue.value as any) ?? null" @change="setValue($event)" />
        </MenuContent>
      </Menu>
    </template>

    <template v-else-if="modelValue.field === 'priority'">
      <Menu>
        <MenuTrigger as-child>
          <Button variant="outline" size="badge" class="text-muted-foreground">{{ priorityPreview }}</Button>
        </MenuTrigger>
        <MenuContent align="start" class="w-56">
          <MenuItem class="text-xs text-muted-foreground" @select.prevent="setValue(undefined)">Any</MenuItem>
          <MenuSeparator />
          <MenuItem v-for="p in [0, 1, 2, 3, 4]" :key="p" @select.prevent="setValue(p)">
            {{ PRIORITY_LABEL[p] }}
          </MenuItem>
        </MenuContent>
      </Menu>
    </template>

    <template v-else-if="modelValue.field === 'title'">
      <Menu>
        <MenuTrigger as-child>
          <Button variant="outline" size="badge" class="max-w-56 truncate text-muted-foreground">{{
            titlePreview
          }}</Button>
        </MenuTrigger>
        <MenuContent class="w-72">
          <MenuInput v-model="titleDraft" placeholder="Search title…" auto-focus />
          <MenuSeparator />
          <MenuItem
            class="text-xs text-muted-foreground"
            @select.prevent="
              setValue(titleDraft.trim() || undefined);
              titleDraft = titleDraft.trim();
            "
          >
            Apply
          </MenuItem>
          <MenuItem
            class="text-xs text-muted-foreground"
            @select.prevent="
              titleDraft = '';
              setValue(undefined);
            "
          >
            Clear
          </MenuItem>
        </MenuContent>
      </Menu>
    </template>

    <template v-else-if="modelValue.field === 'parentIssueId'">
      <Menu>
        <MenuTrigger as-child>
          <Button variant="outline" size="badge" class="text-muted-foreground">{{ parentPreview }}</Button>
        </MenuTrigger>
        <MenuContent as-child align="start" side="bottom" class="w-80 min-h-14">
          <IssuePickerMenu
            :model-issue="modelValue.value"
            :project-id="props.projectId"
            @select="setValue($event.id)"
            @clear="setValue(undefined)"
          />
        </MenuContent>
      </Menu>
    </template>

    <Button variant="outline" size="badge" title="Remove filter" @click="$emit('remove')">
      <!-- <Icon name="io-close" /> -->
      <Icon name="io-close" class="w-4 h-4 text-muted-foreground hover:text-foreground" />
    </Button>
  </ButtonGroup>
</template>
