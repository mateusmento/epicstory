<script lang="ts" setup>
import { useMeeting } from "@/domain/channels";
import Meeting from "@/components/meeting/Meeting.vue";

const { currentMeeting } = useMeeting();
</script>

<template>
  <Meeting v-if="currentMeeting" v-show="currentMeeting" :meetingId="currentMeeting.id" :key="1" />
</template>
