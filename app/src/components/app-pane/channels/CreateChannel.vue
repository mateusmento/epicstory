<script setup lang="ts">
import { Form, Field, Label, RadioGroup, RadioGroupItem, Button, Combobox } from "@/design-system";
import { UserApi, type User } from "@/domain/user";
import { useChannels } from "@/domain/channels";
import { ref, watch } from "vue";
import { useDependency } from "@/core/dependency-injection";
import { Trash2Icon } from "lucide-vue-next";
import { useRouter } from "vue-router";
import { useWorkspace } from "@/domain/workspace";

const router = useRouter();
const { workspace } = useWorkspace();

const channelType = ref("group");
const { createChannel } = useChannels();

const userApi = useDependency(UserApi);
const users = ref<User[]>([]);
const query = ref("");
const selectedUser = ref<User>();

async function fetchUsersByName(name: string) {
  users.value = await userApi.findUsersByName(name);
}

watch(query, () => fetchUsersByName(query.value));

const members = ref<User[]>([]);

function addMember(user: User) {
  members.value.push({
    id: user.id,
    name: user.name,
    email: user.email,
    picture: user.picture,
  });
}

function removeMember(userId: number) {
  members.value = members.value.filter((member) => member.id !== userId);
}

async function onCreateChannel(event: any) {
  if (event.type === "group") event.members = members.value.map((m) => m.id);
  const channel = await createChannel(event);
  router.push(`/${workspace.value.id}/channel/${channel.id}`);
}
</script>

<template>
  <Form @submit="onCreateChannel" class="flex:col-lg">
    <RadioGroup v-model="channelType" type="single" class="grid-cols-[auto_auto] gap-4 place-content-center">
      <Label><RadioGroupItem value="direct" /> Direct</Label>
      <Label><RadioGroupItem value="group" /> Group</Label>
    </RadioGroup>
    <Field v-model="channelType" name="type" type="hidden" />
    <template v-if="channelType === 'group'">
      <Field label="Name" name="name" placeholder="Enter a name..." />

      <div class="flex:col-lg w-64">
        <div v-for="member in members" :key="member.id" class="flex:row-lg flex:center-y w-full">
          <img :src="member.picture" class="w-4 h-4 rounded-full" />
          <div class="text-sm font-medium">{{ member.name }}</div>
          <Button size="icon" variant="outline" @click="removeMember(member.id)" class="ml-auto">
            <Trash2Icon class="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div class="flex:col-lg">
        <Combobox
          v-model="selectedUser"
          v-model:searchTerm="query"
          :options="users"
          track-by="id"
          label-by="name"
          name="user"
        >
          <template #option="{ option }">
            <div class="flex:row-auto flex:center-y">
              <img :src="option.picture" class="w-4 h-4 rounded-full mr-2" />
              <div class="text-sm font-medium">{{ option.name }}</div>
            </div>
          </template>
        </Combobox>
        <Button size="xs" @click="selectedUser && addMember(selectedUser)">Add</Button>
      </div>
    </template>
    <Field v-if="channelType === 'direct'" label="Email" name="username" placeholder="Email..." />
    <Button size="xs">Create</Button>
  </Form>
</template>
