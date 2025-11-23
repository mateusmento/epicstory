<script setup lang="ts">
import { Combobox } from "@/design-system";
import { useUsers, type User } from "@/domain/user";
import { ref, watch } from "vue";

const user = defineModel<User>();

const { users, fetchUsersByName } = useUsers();
const query = ref("");
watch(query, () => fetchUsersByName(query.value));
</script>

<template>
  <Combobox
    v-model="user"
    v-model:searchTerm="query"
    :options="users"
    track-by="id"
    label-by="name"
    name="user"
  >
    <template v-if="$slots.trigger" #trigger>
      <slot name="trigger" />
    </template>

    <template #option="{ option }">
      <div class="flex:row-auto flex:center-y">
        <img :src="option.picture" class="w-4 h-4 rounded-full mr-2" />
        <div class="text-sm font-medium">{{ option.name }}</div>
      </div>
    </template>
  </Combobox>
</template>
