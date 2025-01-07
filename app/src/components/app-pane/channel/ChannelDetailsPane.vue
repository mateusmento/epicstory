<script lang="ts" setup>
import {
  Button,
  Combobox,
  Dialog,
  DialogContent,
  DialogTrigger,
  Form,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/design-system";
import { Icon } from "@/design-system/icons";
import TabsContent from "@/design-system/ui/tabs/TabsContent.vue";
import type { User } from "@/domain/auth";
import { useChannel } from "@/domain/channels";
import { useUsers } from "@/domain/user";
import { ref, watch } from "vue";

const { members, addMember } = useChannel();

const { users, fetchUsers } = useUsers();
const query = ref("");
const selectedUser = ref<User>();
watch(query, () => fetchUsers(query.value));
</script>

<template>
  <aside class="flex:rows-4xl h-full w-96 border-l p-4 border-zinc-300/60">
    <Tabs default-value="members" as-child>
      <TabsList class="mx-auto">
        <TabsTrigger value="members">Members</TabsTrigger>
        <TabsTrigger value="details">Details</TabsTrigger>
      </TabsList>

      <TabsContent value="members" class="flex:rows-2xl mt-0">
        <div class="flex:cols-auto flex:center-y">
          <h1 class="flex:cols-md flex:center-y text-lg font-medium whitespace-nowrap">
            <Icon name="bi-people-fill" />
            Members
          </h1>

          <Dialog>
            <DialogTrigger>
              <Button variant="outline" size="badge" class="block">Add member</Button>
            </DialogTrigger>
            <DialogContent>
              <Form @submit="selectedUser && addMember(selectedUser.id)" class="flex:rows-lg mt-xl">
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
        </div>

        <div class="flex:rows-xl">
          <div
            v-for="member in members"
            :key="member.id"
            class="flex:cols-lg hover:bg-zinc-200/60 cursor-pointer"
          >
            <img :src="member.picture" class="w-10 h-10 rounded-full" />
            <div class="flex:rows-md">
              <div class="text-base font-medium font-dmSans whitespace-nowrap">{{ member.name }}</div>
              <div class="text-xs text-zinc-500 whitespace-nowrap">{{ member.email }}</div>
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  </aside>
</template>
