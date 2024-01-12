<script lang="ts" setup>
import { OhVueIcon } from 'oh-vue-icons';
import VMenu from './Menu.vue';
import VMenuItem from './MenuItem.vue';

defineProps<{
  isInboxOpen: boolean;
}>();

defineEmits(['update:isInboxOpen']);
</script>

<template>
  <v-menu>
    <v-menu-item name="home">
      <OhVueIcon name="ri-home-5-line" />
      Home
    </v-menu-item>
    <v-menu-item
      class="menu-item"
      name="inbox"
      secondary
      @click="$emit('update:isInboxOpen', !isInboxOpen)"
    >
      <OhVueIcon name="hi-inbox" />
      Inbox
    </v-menu-item>
    <v-menu-item name="roadmap">
      <OhVueIcon name="bi-bar-chart-steps" />
      Roadmap
    </v-menu-item>
    <v-menu-item name="user-stories">
      <OhVueIcon name="pr-map" />
      User Stories
    </v-menu-item>
    <v-menu-item name="board">
      <OhVueIcon name="hi-view-boards" />
      Board
    </v-menu-item>
    <v-menu-item name="calendar">
      <OhVueIcon name="bi-calendar-range" />
      Calendar
    </v-menu-item>
  </v-menu>
</template>
