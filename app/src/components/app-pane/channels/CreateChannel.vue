<script setup lang="ts">
import { UserSelect } from "@/components/user";
import { Button, Field, Form, Label, RadioGroup, RadioGroupItem } from "@/design-system";
import { useChannels } from "@/domain/channels";
import { type User } from "@/domain/user";
import { useWorkspace } from "@/domain/workspace";
import { Trash2Icon } from "lucide-vue-next";
import { ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const { workspace } = useWorkspace();

const channelType = ref("group");
const { createChannel } = useChannels();

const members = ref<User[]>([]);
const selectedUser = ref<User>();

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
          <Button
            type="button"
            size="icon"
            variant="outline"
            @click="removeMember(member.id)"
            class="ml-auto"
          >
            <Trash2Icon class="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div class="flex:col-lg">
        <UserSelect v-model="selectedUser" />
        <Button type="button" size="xs" @click="selectedUser && addMember(selectedUser)">Add</Button>
      </div>
    </template>
    <Field v-if="channelType === 'direct'" label="Email" name="username" placeholder="Email..." />
    <Button type="submit" size="xs">Create</Button>
  </Form>
</template>
