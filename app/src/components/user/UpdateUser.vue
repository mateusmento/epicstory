<script lang="ts" setup>
import { Button, Field, Form } from "@/design-system";
import { useAuth } from "@/domain/auth";
import { useUser } from "@/domain/user";

const { user, updateUserPicture } = useUser();
const { signOut } = useAuth();
</script>

<template>
  <div>
    <Form :initial-values="user" @submit="updateUserPicture($event as any)" class="flex:rows-lg">
      <Field label="Picture" name="picture" placeholder="Enter an image url..." />
      <Button type="submit" size="xs">Save</Button>
      <Button @click="signOut">Sign out</Button>
    </Form>
  </div>
</template>
