<script setup lang="ts">
import { Button } from "@/design-system";
import SprintReviewContent from "@/containers/sprint/SprintReviewContent.vue";
import { useSprint } from "@/domain/sprint";
import { computed } from "vue";
import { useRouter } from "vue-router";
import { ArrowLeftIcon } from "lucide-vue-next";

const props = defineProps<{
  workspaceId: string;
  teamId: string;
  sprintId: string;
}>();

const router = useRouter();
const { sprints } = useSprint();

const sprint = computed(() => sprints.value.find((s) => s.id === +props.sprintId));
</script>

<template>
  <div class="flex:col h-full min-h-0">
    <!-- Header -->
    <div class="flex:row-md flex:center-y px-6 py-4 border-b border-border">
      <Button variant="ghost" size="icon" @click="router.push(`/${workspaceId}/team/${teamId}`)">
        <ArrowLeftIcon class="size-4" />
      </Button>
      <div class="flex:col ml-2">
        <h1 class="text-base font-semibold">{{ sprint?.name ?? "Sprint" }} — completed</h1>
      </div>
    </div>

    <div class="flex:col flex-1 min-h-0 overflow-auto px-6 py-6 max-w-3xl mx-auto w-full">
      <SprintReviewContent :sprint-id="+sprintId" :team-id="+teamId" />
    </div>
  </div>
</template>
