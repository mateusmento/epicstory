<script lang="ts" setup>
import { enumerateNames } from "@/utils";
import type { IUser } from "@epicstory/contracts";
import { computed } from "vue";

const props = defineProps<{
  typingUserIds: number[];
  peers: IUser[];
  meId: number;
}>();

const typingPeerNames = computed(() => {
  const ids = props.typingUserIds.filter((id) => id !== props.meId);
  return ids.map((id) => props.peers.find((p) => p.id === id)?.name).filter((n): n is string => Boolean(n));
});

const typingBannerText = computed(() => {
  const names = enumerateNames(typingPeerNames.value);
  if (typingPeerNames.value.length > 1) return `${names} are typing…`;
  if (typingPeerNames.value.length === 1) return `${names} is typing…`;
  return "";
});
</script>

<template>
  <div v-if="typingPeerNames.length" class="absolute bottom-0 left-0 right-0 mx-7 z-[10]">
    <div
      class="px-2 py-1 border border-b-0 border-muted rounded-lg rounded-b-none text-xs bg-muted text-muted-foreground"
    >
      {{ typingBannerText }}
    </div>
  </div>
</template>
