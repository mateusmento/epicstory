<script setup lang="ts">
import { Combobox } from "@/design-system";
import { useAuth } from "@/domain/auth";
import { useUsers, type User } from "@/domain/user";
import { computed, ref, watch } from "vue";

const props = defineProps<{
  exclude?: string;
}>();

const user = defineModel<User>();

const { user: authUser } = useAuth();
const { users, fetchUsersByName } = useUsers();
const query = ref("");
watch(query, () => fetchUsersByName(query.value));

const filteredUsers = computed(() => {
  return users.value.filter((user) => !props.exclude || user.id !== authUser.value?.id);
});
</script>

<template>
  <Combobox
    v-model="user"
    v-model:searchTerm="query"
    :options="filteredUsers"
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
