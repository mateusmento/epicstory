<script lang="ts" setup>
import { Button, Field, Form } from "@/design-system";
import UserPictureUpload from "./UserPictureUpload.vue";
import { useUser } from "@/domain/user";

const { user, updateUser } = useUser();
</script>

<template>
  <div v-if="user" class="flex:rows-xl w-96 mx-auto px-4 mt-12">
    <UserPictureUpload />
    <Form @submit="updateUser($event)" :initial-values="user" class="flex:rows-lg">
      <Field name="name" label="Name" />
      <Button size="xs" class="ml-auto">Save</Button>
    </Form>
  </div>
</template>
