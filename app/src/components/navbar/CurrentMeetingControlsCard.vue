<script setup lang="ts">
import { Button } from "@/design-system";
import { Icon } from "@/design-system/icons";
import { useAuth } from "@/domain/auth";
import { useMeeting } from "@/domain/channels";
import { compact, take, uniqBy } from "lodash";
import { computed } from "vue";

const { user } = useAuth();
const { attendees, isCameraOn, isMicrophoneOn, leaveMeeting, stopCamera, stopMicrophone } = useMeeting();

const people = computed(() => {
  const me = user.value as any | null | undefined;
  const attendeeUsers = (attendees.value ?? []).map((a) => a.user);
  const candidates = compact([me, ...attendeeUsers]);
  return take(uniqBy(candidates, "id"), 4);
});
</script>

<template>
  <div class="rounded-xl border w-fit max-w-full bg-white mx-auto p-2 flex:col-md flex:center-x gap-2">
    <div class="flex:row-md flex:center-y gap-2">
      <div class="flex -space-x-4">
        <div
          v-for="p in people"
          :key="p.id"
          class="w-14 h-14 rounded-full border-2 border-white overflow-hidden bg-gray-200 flex items-center justify-center"
          :title="p.name"
        >
          <img v-if="p.picture" :src="p.picture" class="w-full h-full object-cover" />
          <div v-else class="text-[10px] font-semibold text-gray-700">
            {{ p.name?.charAt(0)?.toUpperCase() || "?" }}
          </div>
        </div>
      </div>

      <!-- <div class="flex:row-md flex:center-y gap-2">
        <div class="min-w-0 flex-1">
          <div class="text-sm font-medium truncate">In a meeting</div>
          <div class="text-xs text-secondary-foreground truncate">
            {{ people.length }} attendee{{ people.length === 1 ? "" : "s" }}
          </div>
        </div>
      </div> -->
    </div>

    <div class="flex:row-xl flex:center self-stretch">
      <Button variant="outline" size="icon" class="p-2" @click="stopCamera">
        <Icon
          :name="isCameraOn ? 'bi-camera-video' : 'bi-camera-video-off'"
          class="w-6 h-6 text-muted-foreground"
        />
      </Button>

      <Button variant="outline" size="icon" class="p-2" @click="stopMicrophone">
        <Icon :name="isMicrophoneOn ? 'bi-mic' : 'bi-mic-mute'" class="w-6 h-6 text-muted-foreground" />
      </Button>

      <Button variant="destructive" size="icon" class="p-2" @click="leaveMeeting">
        <Icon name="bi-telephone-x" class="w-6 h-6" />
      </Button>
    </div>
  </div>
</template>
