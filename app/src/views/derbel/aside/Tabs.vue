<script lang="ts" setup>
import { ref } from "vue";
import IconCalendar from "../icons/IconCalendar.vue";
import IconChats from "../icons/IconChats.vue";

const activeTab = ref("channels");
</script>

<template>
  <div class="menu-tabs">
    <div class="tab line-fit" :class="{ active: activeTab === 'channels' }" @click="activeTab = 'channels'">
      <IconChats /> Channels
    </div>
    <div class="tab line-fit" :class="{ active: activeTab === 'calendar' }" @click="activeTab = 'calendar'">
      <IconCalendar /> Calendar
    </div>
  </div>
</template>

<style scoped src="@/views/derbel/styles/main.css"></style>

<style scoped>
.menu-tabs {
  display: flex;
  background-color: white;
  border-radius: 20px;
  padding: 5px;
  width: 300px;
  margin: auto;
}

.tab {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 30px;
  height: 40px;
  border-radius: 15px;
  font-size: 14px;
  font-weight: 500;
}

.tab.active {
  background-color: #252525;
  color: white;
}
</style>
