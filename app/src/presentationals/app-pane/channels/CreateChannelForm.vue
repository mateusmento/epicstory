<script setup lang="ts">
import { UserAvatar } from "@/presentationals/user";
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
import { Trash2Icon } from "lucide-vue-next";

withDefaults(
  defineProps<{
    showTypeSelector?: boolean;
  }>(),
  {
    showTypeSelector: true,
  },
);

const channelType = defineModel<"group" | "meeting" | "direct">("channelType", { required: true });
const members = defineModel<IUser[]>("members", { default: () => [] });

const emit = defineEmits<{
  (e: "submit", values: Record<string, unknown>): void;
}>();

function removeMember(userId: number) {
  members.value = members.value.filter((member) => member.id !== userId);
}

function onSubmit(values: Record<string, unknown>) {
  emit("submit", values);
}
</script>

<template>
  <Form @submit="onSubmit" class="flex:col-lg mt-4">
    <div class="flex:col-md">
      <div v-if="showTypeSelector" class="text-sm font-medium text-foreground">Channel type</div>

      <RadioGroup
        v-if="showTypeSelector"
        v-model="channelType"
        type="single"
        class="grid grid-cols-3 gap-1 rounded-lg bg-secondary p-1"
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

      <div v-if="showTypeSelector" class="text-xs text-secondary-foreground">
        <template v-if="channelType === 'direct'">
          Start a direct message by selecting one or more people (2+ creates a multi-direct).
        </template>
        <template v-else-if="channelType === 'meeting'">
          Create a persistent meeting room channel that people can join anytime.
        </template>
        <template v-else> Create a channel with a name and optionally invite members. </template>
      </div>
    </div>

    <template v-if="channelType === 'group' || channelType === 'meeting'">
      <Field
        label="Name"
        name="name"
        :placeholder="channelType === 'meeting' ? 'e.g. Daily Standup' : 'e.g. Design, Support...'"
        required
      />

      <div class="flex:col-md">
        <div class="flex:row-md flex:center-y justify-between">
          <div class="text-sm font-medium text-foreground">Members</div>
          <div class="text-xs text-secondary-foreground">{{ members.length }} selected</div>
        </div>

        <div class="rounded-md border bg-background p-2">
          <div v-if="members.length === 0" class="text-xs text-secondary-foreground px-1 py-1.5">
            No members added yet. Use the selector below to invite people.
          </div>

          <div v-else class="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
            <div
              v-for="member in members"
              :key="member.id"
              class="inline-flex items-center gap-2 rounded-md border bg-secondary/40 px-2 py-1"
            >
              <UserAvatar :name="member.name" :picture="member.picture" size="sm" class="flex-shrink-0" />
              <div class="text-xs font-medium text-foreground">{{ member.name }}</div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                class="h-6 w-6"
                @click="removeMember(member.id)"
                title="Remove"
              >
                <Trash2Icon class="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div class="flex:col-md">
        <div class="text-sm font-medium text-foreground">Add people</div>
        <slot name="add-member" />
      </div>
    </template>

    <template v-else>
      <div class="flex:col-md">
        <div class="flex:row-md flex:center-y justify-between">
          <div class="text-sm font-medium text-foreground">People</div>
          <div class="text-xs text-secondary-foreground">{{ members.length }} selected</div>
        </div>

        <div class="rounded-md border bg-background p-2">
          <div v-if="members.length === 0" class="text-xs text-secondary-foreground px-1 py-1.5">
            Pick at least one person to start a direct message. Add 2+ to create a multi-direct.
          </div>

          <div v-else class="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
            <div
              v-for="member in members"
              :key="member.id"
              class="inline-flex items-center gap-2 rounded-md border bg-secondary/40 px-2 py-1"
            >
              <UserAvatar :name="member.name" :picture="member.picture" size="sm" class="flex-shrink-0" />
              <div class="text-xs font-medium text-foreground">{{ member.name }}</div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                class="h-6 w-6"
                @click="removeMember(member.id)"
                title="Remove"
              >
                <Trash2Icon class="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div class="flex:col-md">
        <div class="text-sm font-medium text-foreground">Add people</div>
        <slot name="add-member" />
      </div>
    </template>

    <DialogFooter class="pt-2">
      <DialogClose as-child>
        <Button type="button" variant="brand" color="secondary">Cancel</Button>
      </DialogClose>
      <Button
        type="submit"
        variant="brand"
        color="primary"
        :disabled="channelType === 'direct' && members.length < 1"
        >Create</Button
      >
    </DialogFooter>
  </Form>
</template>
