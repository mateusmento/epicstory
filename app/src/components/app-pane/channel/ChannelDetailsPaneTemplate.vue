<script lang="tsx" setup>
import IconClose from "@/components/icons/IconClose.vue";
import { Button, Combobox, Dialog, DialogContent, DialogHeader, Form, Separator } from "@/design-system";
import { IconChannel } from "@/design-system/icons";
import type { User } from "@/domain/auth";
import { ref, type FunctionalComponent as FC } from "vue";
import ChannelMembers from "./ChannelMembers.vue";

defineProps<{
  members: (User & { role?: string; online?: boolean })[];
  users: User[];
}>();

const emit = defineEmits<{
  (e: "add-member", userId: number): void;
  (e: "close"): void;
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
    <div class="flex:row-auto flex:center-y py-2">
      <div class="text-xs font-medium text-secondary-foreground">{label}</div>
      <div class="text-xs font-medium text-foreground">{value}</div>
    </div>
  );
};
</script>

<template>
  <aside class="flex:col-xl border-zinc-300/60">
    <div class="flex:row-lg flex:center-y whitespace-nowrap">
      <IconChannel class="overflow-visible" />
      <div class="text-lg font-semibold">Channel</div>
      <Button variant="ghost" size="icon" class="ml-auto" @click="emit('close')">
        <IconClose class="w-4 h-4" />
      </Button>
    </div>

    <Separator />

    <div class="flex:col">
      <Attribute label="Created by" value="Mateus Sarmento" />
      <Attribute label="Created at" value="Feb 2, 2024" />
      <Attribute label="Member since" value="Aug 16, 2019" />
    </div>

    <Separator />

    <ChannelMembers :members :users @add="showDialog = true" />

    <Dialog v-model:open="showDialog">
      <DialogContent>
        <DialogHeader>Add Channel Member</DialogHeader>
        <Form @submit="selectedUser && addMember(selectedUser.id)" class="flex:row-lg mt-xl">
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
