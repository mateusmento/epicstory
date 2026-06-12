<script setup lang="ts">
import { UserAvatarStack } from "@/presentationals/user";
import { WorkspaceMemberDropdown } from "@/containers/workspace-members";
import { CreateChannelForm } from "@/presentationals/app-pane/channels";
import { Button } from "@/design-system";
import { useAuth } from "@/domain/auth";
import { useChannels } from "@/domain/channels";
import type { IUser } from "@epicstory/contracts";
import { useWorkspace } from "@/domain/workspace";
import { ChevronsUpDown } from "lucide-vue-next";
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

const props = withDefaults(
  defineProps<{
    initialType?: "group" | "meeting" | "direct";
    showTypeSelector?: boolean;
  }>(),
  {
    initialType: "group",
    showTypeSelector: true,
  },
);

const emit = defineEmits<{
  (e: "created"): void;
}>();

const router = useRouter();
const { user: authUser } = useAuth();
const { workspace } = useWorkspace();
const { createChannel } = useChannels();

const channelType = ref<"group" | "meeting" | "direct">(props.initialType);
const members = ref<IUser[]>([]);

const excludeUserIds = computed(() => (authUser.value ? [authUser.value.id] : []));

async function onCreateChannel(values: Record<string, unknown>) {
  const payload: Record<string, unknown> = { ...values, type: channelType.value };

  if (channelType.value === "direct") {
    if (members.value.length === 1) {
      payload.peerId = members.value[0]!.id;
    } else {
      payload.peers = members.value.map((member) => member.id);
    }
  } else {
    payload.members = members.value.map((member) => member.id);
  }

  const channel = await createChannel(payload as Parameters<typeof createChannel>[0]);
  router.push(`/${workspace.value.id}/channel/${channel.id}`);
  emit("created");
}
</script>

<template>
  <CreateChannelForm
    v-model:channel-type="channelType"
    v-model:members="members"
    :show-type-selector="showTypeSelector"
    @submit="onCreateChannel"
  >
    <template #add-member>
      <WorkspaceMemberDropdown v-model:users="members" :exclude-user-ids="excludeUserIds">
        <Button variant="ghost" class="h-auto w-full min-w-0 flex items-center justify-start gap-2 px-2">
          <UserAvatarStack v-if="members.length" :users="members" size="sm" />
          <div v-else class="text-xs text-muted-foreground">Choose workspace members</div>
          <ChevronsUpDown class="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </WorkspaceMemberDropdown>
    </template>
  </CreateChannelForm>
</template>
