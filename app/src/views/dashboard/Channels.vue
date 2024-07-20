<script setup lang="ts">
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/design-system";
</script>

<template>
  <div>
    <Tabs class="mx-auto block w-fit pt-2">
      <TabsList>
        <TabsTrigger value="messages">Messages</TabsTrigger>
        <TabsTrigger value="mentions">Mentions</TabsTrigger>
        <TabsTrigger value="threads">Threads</TabsTrigger>
      </TabsList>
      <TabsContent value="messages"></TabsContent>
      <TabsContent value="mentions"></TabsContent>
      <TabsContent value="threads"></TabsContent>
    </Tabs>
  </div>
</template>
