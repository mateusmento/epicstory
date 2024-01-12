<script lang="ts" setup>
import { useInjectable } from '@/core/dependency-injection';
import { InboxApi } from '@/domain/inbox/inbox.api';
import { onMounted, ref } from 'vue';
import DashboardMenu from './DashboardMenu.vue';
import type { IInbox } from '@/domain/inbox/inbox.type';
import Inbox from './Inbox.vue';

const inboxApi = useInjectable<InboxApi>(InboxApi.name);

const inbox = ref<IInbox>();

onMounted(async () => {
  inbox.value = await inboxApi.fetchInbox();
});

const isInboxOpen = ref(false);
</script>

<template>
  <main :class="{ isInboxOpen }">
    <DashboardMenu class="sidebar" v-model:is-inbox-open="isInboxOpen" />
    <Inbox :inbox="inbox" />
    <div class="page-content"></div>
  </main>
</template>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

main {
  display: grid;
  width: 100vw;
  height: 100vh;
  transition: 400ms;
}

main {
  grid-template-columns: 1fr 0.0001fr 4.7999fr;
}

main.isInboxOpen {
  grid-template-columns: 1fr 1.6fr 3.2fr;
}

.sidebar,
.inbox,
.page-content {
  border-right: 1px solid $grey-blue;
}

.sidebar {
  background-color: #f8f8f9;
}

.inbox {
  overflow: hidden;
}
</style>
