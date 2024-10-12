<script lang="ts" setup>
import { useDependency } from "@/core/dependency-injection";
import { Button } from "@/design-system";
import { Axios } from "axios";
import { useRouter } from "vue-router";

const props = defineProps<{
  inviteId: number;
}>();

const router = useRouter();

const axios = useDependency(Axios);

async function acceptInvite() {
  await axios.put(`/workspace-member-invites/${props.inviteId}/accepted`);
  router.push("/");
}
</script>

<template>
  <main class="h-full content-center">
    <Button variant="default" @click="acceptInvite">Accept Invite</Button>
  </main>
</template>
