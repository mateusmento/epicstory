<script lang="tsx" setup>
import IconClose from "@/components/icons/IconClose.vue";
import { UserSelect } from "@/components/user";
import { Button, Dialog, DialogContent, DialogHeader, Form, Separator } from "@/design-system";
import { IconChannel } from "@/design-system/icons";
import type { User } from "@/domain/auth";
import { ref, type FunctionalComponent as FC } from "vue";
import ChannelMembers from "./ChannelMembers.vue";

defineProps<{
  members: (User & { role?: string; online?: boolean })[];
}>();

const emit = defineEmits<{
  (e: "add-member", userId: number): void;
  (e: "remove-member", memberId: number): void;
  (e: "close"): void;
}>();

function addMember(userId: number) {
  emit("add-member", userId);
}

const showDialog = ref(false);

const selectedUser = ref<User>();

function removeMember(memberId: number) {
  emit("remove-member", memberId);
}
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
  <!--   -->
  <aside class="flex:col h-full w-96 border-l border-zinc-300/60">

    <div class="flex:row-lg flex:center-y p-4 min-h-14 whitespace-nowrap">
      <IconChannel class="overflow-visible" />
      <div class="text-base font-semibold">Channel</div>
      <Button variant="ghost" size="icon" class="ml-auto" @click="emit('close')">
        <IconClose class="w-4 h-4" />
      </Button>
    </div>

    <Separator />

    <div class="flex:col p-xl">
      <Attribute label="Created by" value="Mateus Sarmento" />
      <Attribute label="Created at" value="Feb 2, 2024" />
      <Attribute label="Member since" value="Aug 16, 2019" />
    </div>

    <Separator />

    <ChannelMembers class="p-xl" :members @add="showDialog = true" @remove="removeMember" />

    <Dialog v-model:open="showDialog">
      <DialogContent>
        <DialogHeader>Add Channel Member</DialogHeader>
        <Form @submit="selectedUser && addMember(selectedUser.id)" class="flex:col-lg mt-xl">
          <UserSelect v-model="selectedUser" class="flex-1" />
          <Button type="submit" class="h-auto">Add</Button>

          <ChannelMembers :members />
        </Form>
      </DialogContent>
    </Dialog>
  </aside>
</template>
