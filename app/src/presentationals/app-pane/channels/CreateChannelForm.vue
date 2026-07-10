<script setup lang="ts">
import {
  Button,
  DialogClose,
  DialogFooter,
  Field,
  Form,
  Label,
  RadioGroup,
  RadioGroupItem,
} from "@/design-system";
import type { IUser } from "@epicstory/contracts";
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    showTypeSelector?: boolean;
    submitLabel?: string;
    peopleLabel?: string;
    submitting?: boolean;
  }>(),
  {
    showTypeSelector: true,
    submitLabel: "Create",
    submitting: false,
  },
);

const channelType = defineModel<"group" | "meeting" | "direct">("channelType", { required: true });
const members = defineModel<IUser[]>("members", { default: () => [] });

const emit = defineEmits<{
  (e: "submit", values: Record<string, unknown>): void;
}>();

const resolvedPeopleLabel = computed(() => {
  if (props.peopleLabel) return props.peopleLabel;
  return channelType.value === "direct" ? "People" : "Members";
});

const typeHint = computed(() => {
  switch (channelType.value) {
    case "direct":
      return "Send direct messages to one or more people";
    case "meeting":
      return "Quickly join a meeting with one or more people.";
    default:
      return "Create focused conversations with one or more people.";
  }
});

const needsName = computed(() => channelType.value === "group" || channelType.value === "meeting");

const submitDisabled = computed(
  () => props.submitting || (channelType.value === "direct" && members.value.length < 1),
);

function onSubmit(values: Record<string, unknown>) {
  if (submitDisabled.value) return;
  emit("submit", values);
}
</script>

<template>
  <Form @submit="onSubmit" class="flex:col-lg mt-4">
    <div v-if="showTypeSelector" class="flex:col-md">
      <div class="text-sm font-medium text-foreground">Channel type</div>

      <RadioGroup
        v-model="channelType"
        type="single"
        class="grid grid-cols-3 gap-1 rounded-lg bg-secondary p-1"
        :disabled="submitting"
      >
        <Label
          class="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors"
          :class="channelType === 'direct' ? 'bg-card text-foreground shadow' : 'text-secondary-foreground'"
        >
          <RadioGroupItem value="direct" class="sr-only" />
          Direct
        </Label>
        <Label
          class="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors"
          :class="channelType === 'group' ? 'bg-card text-foreground shadow' : 'text-secondary-foreground'"
        >
          <RadioGroupItem value="group" class="sr-only" />
          Group
        </Label>
        <Label
          class="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors"
          :class="channelType === 'meeting' ? 'bg-card text-foreground shadow' : 'text-secondary-foreground'"
        >
          <RadioGroupItem value="meeting" class="sr-only" />
          Meeting
        </Label>
      </RadioGroup>
    </div>

    <p class="text-xs text-muted-foreground">{{ typeHint }}</p>

    <Field
      v-if="needsName"
      label="Name"
      name="name"
      :placeholder="channelType === 'meeting' ? 'e.g. Daily Standup' : 'e.g. Design, Support…'"
      required
      autofocus
      :disabled="submitting"
    />

    <div class="flex:col-md">
      <div class="flex:row-md flex:center-y justify-between">
        <div class="text-sm font-medium text-foreground">{{ resolvedPeopleLabel }}</div>
        <div class="text-xs text-muted-foreground">{{ members.length }} selected</div>
      </div>
      <slot name="add-member" />
    </div>

    <DialogFooter class="pt-2">
      <DialogClose as-child>
        <Button type="button" variant="outline" intent="secondary" :disabled="submitting"> Cancel </Button>
      </DialogClose>
      <Button type="submit" variant="flat" intent="primary" :disabled="submitDisabled">
        {{ submitting ? "Creating…" : submitLabel }}
      </Button>
    </DialogFooter>
  </Form>
</template>
