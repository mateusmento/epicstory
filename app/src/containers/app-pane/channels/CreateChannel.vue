<script setup lang="ts">
import { WorkspaceMemberDropdown } from "@/containers/workspace-members";
import { Button } from "@/design-system";
import { useAuth } from "@/domain/auth";
import { useChannels } from "@/domain/channels";
import { useWorkspace } from "@/domain/workspace";
import { CreateChannelForm } from "@/presentationals/app-pane/channels";
import { UserAvatarStack } from "@/presentationals/user";
import type { IUser } from "@epicstory/contracts";
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
const isSubmitting = ref(false);

const excludeUserIds = computed(() => (authUser.value ? [authUser.value.id] : []));

const submitLabel = computed(() => {
  switch (channelType.value) {
    case "meeting":
      return "Create meeting";
    case "direct":
      return "Message";
    default:
      return "Create channel";
  }
});

async function onCreateChannel(values: Record<string, unknown>) {
  if (isSubmitting.value) return;
  isSubmitting.value = true;
  try {
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
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <CreateChannelForm
    v-model:channel-type="channelType"
    v-model:members="members"
    :show-type-selector="showTypeSelector"
    :submit-label="submitLabel"
    :submitting="isSubmitting"
    @submit="onCreateChannel"
  >
    <template #add-member>
      <WorkspaceMemberDropdown
        v-model:users="members"
        :exclude-user-ids="excludeUserIds"
        density="compact"
        :disabled="isSubmitting"
      >
        <Button
          type="button"
          variant="outline"
          class="h-auto w-full min-w-0 flex items-center justify-start gap-2 px-3 py-2 font-normal"
          :disabled="isSubmitting"
        >
          <UserAvatarStack v-if="members.length" :users="members" size="sm" class="min-w-0 shrink" />
          <span v-else class="text-sm text-muted-foreground">Add people…</span>
          <ChevronsUpDown class="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </WorkspaceMemberDropdown>
    </template>
  </CreateChannelForm>
</template>
