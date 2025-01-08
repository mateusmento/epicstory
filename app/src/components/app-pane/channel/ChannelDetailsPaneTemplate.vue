<script lang="tsx" setup>
import { Button, Combobox, Dialog, DialogContent, DialogHeader, Form } from "@/design-system";
import type { User } from "@/domain/auth";
import { ref, type FunctionalComponent as FC } from "vue";
import ChannelMembers from "./ChannelMembers.vue";
import { IconChannel } from "@/design-system/icons";

defineProps<{
  members: (User & { role?: string; online?: boolean })[];
  users: User[];
}>();

const emit = defineEmits<{
  (e: "add-member", userId: number): void;
}>();

function addMember(userId: number) {
  emit("add-member", userId);
}

const showDialog = ref(false);

const query = defineModel<string>("query", { default: "" });
const selectedUser = defineModel<User>("selectedUser");
</script>

<script lang="tsx">
const Attribute: FC<{ label: string; value: string }> = ({ label, value }) => {
  return (
    <div class="flex:cols-auto flex:center-y py-2 [&:not(:last-child)]:border-b">
      <div class="text-xs font-semibold text-zinc-500">{label}</div>
      <div class="text-xs text-zinc-400">{value}</div>
    </div>
  );
};
</script>

<template>
  <aside class="flex:rows-xl border-zinc-300/60">
    <div class="flex:cols-lg flex:center-y whitespace-nowrap">
      <IconChannel class="overflow-visible" />
      <div class="text-lg font-semibold">Channel</div>
    </div>

    <div class="flex:rows">
      <Attribute label="Created by" value="Mateus Sarmento" />
      <Attribute label="Created at" value="Feb 2, 2024" />
      <Attribute label="Member since" value="Aug 16, 2019" />
    </div>

    <ChannelMembers :members :users @add="showDialog = true" />

    <Dialog v-model:open="showDialog">
      <DialogContent>
        <DialogHeader>Add Channel Member</DialogHeader>
        <Form @submit="selectedUser && addMember(selectedUser.id)" class="flex:cols-lg mt-xl">
          <Combobox
            v-model="selectedUser"
            v-model:searchTerm="query"
            :options="users"
            track-by="id"
            label-by="name"
            class="flex-1"
          />
          <Button type="submit" size="xs" class="h-auto">Add</Button>
        </Form>
      </DialogContent>
    </Dialog>
  </aside>
</template>
