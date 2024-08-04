<script setup lang="ts">
import { useAuth } from "@/domain/auth";
import { useChannel, useChannels } from "@/domain/channels";
import { ref } from "vue";
import IconSearch from "../icons/IconSearch.vue";
import Contact from "./Contact.vue";
import Tabs from "./Tabs.vue";

const emit = defineEmits(["join-meeting", "create-channel"]);

const { user: authUser } = useAuth();
const { channels, createChannel } = useChannels();
const { channel: openChannel, openChannel: showChannel } = useChannel();

const username = ref("");
const usernameInputEl = ref<HTMLInputElement | null>(null);

async function onCreateChannel() {
  const data = await createChannel({ type: "direct", username: username.value });
  username.value = "";
  emit("create-channel", data);
}
</script>

<template>
  <aside class="aside">
    <header class="top-menu inset-shadow">
      <div class="user-profile">
        <div class="user-photo"></div>
        <div class="user-name">{{ authUser?.name }}</div>
      </div>
      <Tabs />
      <form class="search-channels" @submit.prevent="onCreateChannel" @click="usernameInputEl?.focus()">
        <input v-model="username" placeholder="Add a channel (enter username)" ref="usernameInputEl" />
        <button class="add-channel-btn" type="submit">
          <IconSearch />
        </button>
      </form>
    </header>
    <ul class="channels">
      <template v-for="(channel, i) of channels" :key="channel.id">
        <li @click="showChannel(channel)">
          <Contact
            :channel="channel"
            :open="!!openChannel && openChannel.id === channel.id"
            :unread-messages="i === 0"
            @join-meeting="emit('join-meeting', channel)"
          />
        </li>
        <div v-if="i !== channels.length - 1" class="divider"></div>
      </template>
    </ul>
  </aside>
</template>

<style scoped src="@/views/derbel/styles/main.css"></style>

<style scoped>
aside {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 360px;
  padding: 10px;
  background-color: #fff;
  border-radius: 40px;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.1);
}

header {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background-color: #f0f0f0;
  border-radius: 30px 30px 20px 20px;
}

.user-profile {
  display: flex;
  gap: 15px;
  padding: 20px;
}

.user-photo {
  width: 40px;
  height: 40px;
  background-color: #919891;
  border-radius: 40px;
}

.user-name {
  font-weight: 500;
  font-size: 20px;
}

.search-channels {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding: 15px 20px;
  border-radius: 10px 10px 20px 20px;
  background-color: #e0e6e4;
}

.search-channels input {
  background-color: transparent;
  border: none;
  font-size: 16px;
  padding: 0;
  outline: none;
}

.search-channels:focus-within {
  background-color: #d2d8d6;
}

.search-channels input::placeholder {
  color: #464646;
}

.add-channel-btn {
  background-color: transparent;
  padding: 0;
  border: none;
}

.channels {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 0 10px;
}

.divider {
  width: 200px;
  border-top: 1px solid #ccc;
  margin: 0 auto;
}
</style>
