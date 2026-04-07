<script setup lang="ts">
import Meeting from "@/components/meeting/Meeting.vue";
import { useMeeting } from "@/domain/channels";

const { currentMeeting } = useMeeting();
</script>

<template>
  <Meeting v-if="currentMeeting" v-show="currentMeeting" :meetingId="currentMeeting.id" :key="currentMeeting.id" />
</template>

