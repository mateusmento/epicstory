<script lang="ts" setup>
import { useMeeting } from "@/domain/channels";
import Meeting from "@/components/meeting/Meeting.vue";

const { ongoingMeeting, leaveOngoingMeeting, endMeeting } = useMeeting();
</script>

<template>
  <Meeting
    v-if="ongoingMeeting"
    v-show="ongoingMeeting"
    :meetingId="ongoingMeeting.id"
    @meeting-ended="endMeeting"
    @left-meeting="leaveOngoingMeeting"
    :key="1"
  />
</template>
