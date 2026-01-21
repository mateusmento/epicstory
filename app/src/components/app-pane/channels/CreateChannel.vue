<script setup lang="ts">
import { UserSelect } from "@/components/user";
import { Button, DialogClose, DialogFooter, Field, Form, Label, RadioGroup, RadioGroupItem } from "@/design-system";
import { useChannels } from "@/domain/channels";
import { type User } from "@/domain/user";
import { useWorkspace } from "@/domain/workspace";
import { Trash2Icon } from "lucide-vue-next";
import { ref, watch } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const { workspace } = useWorkspace();

const channelType = ref("group");
const { createChannel } = useChannels();

const members = ref<User[]>([]);
const selectedUser = ref<User>();

watch(selectedUser, () => {
  if (selectedUser.value) {
    addMember(selectedUser.value);
    selectedUser.value = undefined;
  }
});

function addMember(user: User) {
  if (members.value.some((m) => m.id === user.id)) return;
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
  const payload: any = { ...event, type: channelType.value };
  if (payload.type === "group") payload.members = members.value.map((m) => m.id);
  const channel = await createChannel(payload);
  router.push(`/${workspace.value.id}/channel/${channel.id}`);
}
</script>

<template>
  <Form @submit="onCreateChannel" class="flex:col-lg mt-4">
    <div class="flex:col-md">
      <div class="text-sm font-medium text-foreground">Channel type</div>
      <RadioGroup v-model="channelType" type="single" class="grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1">
        <Label
          class="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors"
          :class="channelType === 'direct' ? 'bg-background text-foreground shadow' : 'text-secondary-foreground'"
        >
          <RadioGroupItem value="direct" class="sr-only" />
          Direct
        </Label>
        <Label
          class="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors"
          :class="channelType === 'group' ? 'bg-background text-foreground shadow' : 'text-secondary-foreground'"
        >
          <RadioGroupItem value="group" class="sr-only" />
          Group
        </Label>
      </RadioGroup>
      <div class="text-xs text-secondary-foreground">
        <template v-if="channelType === 'direct'">Start a 1:1 conversation by inviting someone via email.</template>
        <template v-else>Create a channel with a name and invite members.</template>
      </div>
    </div>

    <template v-if="channelType === 'group'">
      <Field label="Name" name="name" placeholder="e.g. Design, Support..." required />

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
              <img :src="member.picture" class="h-5 w-5 rounded-full" />
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
        <UserSelect v-model="selectedUser" exclude="me" />
      </div>
    </template>

    <Field v-else label="Email" name="username" placeholder="Email..." required />

    <DialogFooter class="pt-2">
      <DialogClose as-child>
        <Button type="button" variant="outline">Cancel</Button>
      </DialogClose>
      <Button type="submit" size="xs">Create</Button>
    </DialogFooter>
  </Form>
</template>
