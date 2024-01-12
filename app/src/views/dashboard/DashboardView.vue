<script lang="ts" setup>
import { useInjectable } from '@/core/dependency-injection';
import { InboxApi } from '@/domain/inbox/inbox.api';
import type { IMessage } from '@/domain/inbox/inbox.type';
import { onMounted, ref } from 'vue';
import { OhVueIcon } from 'oh-vue-icons';
import VMenu from './Menu.vue';

const inboxApi = useInjectable<InboxApi>(InboxApi.name);

const messages = ref<IMessage[]>([]);

onMounted(async () => {
  const inbox = await inboxApi.fetchInbox();
  messages.value = inbox.messages;
});

const isInboxOpen = ref(false);

const activeMenuItem = ref<string>();
</script>

<template>
  <main :class="{ isInboxOpen }">
    <v-menu class="sidebar">
      <div
        class="menu-item"
        :class="{ active: activeMenuItem === 'home' }"
        @click="activeMenuItem = 'home'"
      >
        <OhVueIcon name="ri-home-5-line" />
        Home
      </div>
      <div class="menu-item" @click="isInboxOpen = !isInboxOpen" :class="{ isInboxOpen }">
        <OhVueIcon name="hi-inbox" :class="{ active: activeMenuItem === 'inbox' }" />
        Inbox
      </div>
      <div
        class="menu-item"
        :class="{ active: activeMenuItem === 'roadmap' }"
        @click="activeMenuItem = 'roadmap'"
      >
        <OhVueIcon name="bi-bar-chart-steps" />
        Roadmap
      </div>
      <div
        class="menu-item"
        :class="{ active: activeMenuItem === 'user-stories' }"
        @click="activeMenuItem = 'user-stories'"
      >
        <OhVueIcon name="pr-map" />
        User Stories
      </div>
      <div
        class="menu-item"
        :class="{ active: activeMenuItem === 'board' }"
        @click="activeMenuItem = 'board'"
      >
        <OhVueIcon name="hi-view-boards" />
        Board
      </div>
      <div
        class="menu-item"
        :class="{ active: activeMenuItem === 'calendar' }"
        @click="activeMenuItem = 'calendar'"
      >
        <OhVueIcon name="bi-calendar-range" />
        Calendar
      </div>
    </v-menu>

    <div class="inbox" :class="{ isInboxOpen }">
      <div class="flex:rows-md p-md">
        <div class="flex:cols-th flex:center-y">
          <h2>Inbox</h2>
          <OhVueIcon name="hi-inbox" />
        </div>

        <div v-for="message of messages" :key="message.id" class="card flex:rows-md">
          <div class="card-header flex:cols-md">
            <div class="circle"></div>
            <div class="user-input">{{ message.author.name }}</div>
          </div>
          <div class="card-content user-input">{{ message.text }}</div>
        </div>
      </div>
    </div>

    <div class="page-content"></div>

    <div class="flex:rows-md flex:center-x p-md">
      <div class="circle"></div>
      <div class="circle"></div>
      <div class="circle"></div>
      <div class="circle"></div>
      <div class="flex:space"></div>
      <div class="circle"></div>
    </div>
  </main>
</template>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

main {
  display: grid;
  width: 100vw;
  height: 100vh;
  transition: 400ms;

  grid-template-columns: 1fr 0.0001fr 4.7999fr auto;
  &.isInboxOpen {
    grid-template-columns: 1fr 1.6fr 3.2fr auto;
  }
}

.sidebar {
  background-color: #f8f8f9;
}

.inbox {
  overflow: hidden;

  @keyframes identifier {
    50% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }

  &.isInboxOpen > div {
    /* animation: opacity 100ms; */
  }
}

.sidebar,
.inbox,
.page-content {
  border-right: 1px solid $grey-blue;
}

.circle {
  background-color: #aaa;
  border-radius: 100%;
  width: 40px;
  height: 40px;
}

.flex\:space {
  flex: 1;
}

.card {
  border: 1px solid #ccc;
  border-radius: 10px;
  padding: 10px;
}

.text,
.user-input {
  font-family: 'Lato', 'Inter';
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;

  border-radius: 8px;
  padding: 6px 8px;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 1.1rem;
  color: #57575e;
  transition: 100ms;

  &:is(:hover, .active):not(.isInboxOpen) {
    background-color: white;
    border-color: #dadada;
    box-shadow: 0 1px 1px #ddd;
    color: #000;
  }

  &.isInboxOpen {
    color: #000;
    &:not(:hover) {
      background-color: #e5e5e5;
      border-color: #e5e5e5;
    }
  }
}
</style>
