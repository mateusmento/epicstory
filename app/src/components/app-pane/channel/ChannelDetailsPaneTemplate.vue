<script lang="ts" setup>
import { Button, Combobox, Dialog, DialogContent, Form, Tabs, TabsList, TabsTrigger } from "@/design-system";
import TabsContent from "@/design-system/ui/tabs/TabsContent.vue";
import type { User } from "@/domain/auth";
import { ref } from "vue";
import ChannelMembers from "./ChannelMembers.vue";

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

<template>
  <aside class="flex:rows-4xl border-zinc-300/60">
    <Tabs default-value="members" as-child>
      <TabsList class="mx-auto">
        <TabsTrigger value="members">Members</TabsTrigger>
        <TabsTrigger value="details">Details</TabsTrigger>
      </TabsList>

      <TabsContent value="members" class="flex:rows-2xl mt-0">
        <ChannelMembers :members :users @add="showDialog = true" />

        <Dialog v-model:open="showDialog">
          <DialogContent>
            <Form @submit="selectedUser && addMember(selectedUser.id)" class="flex:rows-lg mt-xl">
              {{ query }}
              <Combobox
                v-model="selectedUser"
                v-model:searchTerm="query"
                :options="users"
                track-by="id"
                label-by="name"
              />
              <Button type="submit" size="xs">Add</Button>
            </Form>
          </DialogContent>
        </Dialog>
      </TabsContent>
    </Tabs>
  </aside>
</template>
