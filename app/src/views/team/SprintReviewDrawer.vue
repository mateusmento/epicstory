<script setup lang="ts">
import {
  Button,
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/design-system";
import SprintReviewContent from "@/containers/sprint/SprintReviewContent.vue";
import { ExternalLinkIcon } from "lucide-vue-next";
import { useRouter } from "vue-router";

const props = defineProps<{
  open: boolean;
  sprintId: number;
  workspaceId: string;
  teamId: string;
}>();

const emit = defineEmits<{ "update:open": [value: boolean] }>();

const router = useRouter();

function viewFullSummary() {
  emit("update:open", false);
  router.push(`/${props.workspaceId}/team/${props.teamId}/sprint/${props.sprintId}/summary`);
}
</script>

<template>
  <Drawer :open="open" direction="right" @update:open="emit('update:open', $event)">
    <DrawerContent class="h-full max-w-lg">
      <DrawerHeader>
        <DrawerTitle>Sprint review</DrawerTitle>
      </DrawerHeader>

      <div class="overflow-auto px-4">
        <SprintReviewContent :sprint-id="sprintId" :team-id="+teamId" />
      </div>

      <DrawerFooter class="flex:row justify-between">
        <Button variant="outline" size="sm" @click="viewFullSummary">
          View full summary
          <ExternalLinkIcon class="ml-1 size-4" />
        </Button>
        <DrawerClose as-child>
          <Button size="sm">Done</Button>
        </DrawerClose>
      </DrawerFooter>
    </DrawerContent>
  </Drawer>
</template>
