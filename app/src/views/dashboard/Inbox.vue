<script lang="ts" setup>
import type { IInbox } from '@/domain/inbox/inbox.type';

withDefaults(
  defineProps<{
    inbox?: IInbox;
  }>(),
  {
    inbox: () => ({ messages: [] }),
  }
);
</script>

<template>
  <div class="inbox">
    <div class="flex:rows-md">
      <div class="flex:cols-th flex:center-y p-md">
        <h2>Inbox</h2>
        <OhVueIcon name="hi-inbox" />
      </div>

      <div class="messages flex:rows">
        <div v-for="message of inbox.messages" :key="message.id" class="message flex:rows-md p-md">
          <div class="card-header flex:cols-md">
            <div class="circle"></div>
            <div class="user-input">{{ message.author.name }}</div>
          </div>
          <div class="card-content user-input">{{ message.text }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.user-input {
  font-family: 'Lato', 'Inter';
}

.circle {
  background-color: #aaa;
  border-radius: 100%;
  width: 40px;
  height: 40px;
}

.messages {
  border-top: 1px solid #ccc;
}
.message {
  border-bottom: 1px solid #ccc;
}
</style>
