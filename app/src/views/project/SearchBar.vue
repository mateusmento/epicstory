<script lang="ts" setup>
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
  Dialog,
  DialogContent,
  DialogTrigger,
  Input,
} from "@/design-system";
import { IconSearch } from "@/design-system/icons";
import { useSearch } from "@/domain/search/search";
import type { SearchResult } from "@/domain/search/types";
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const workspaceId = computed(() => +route.params.workspaceId);

const { search } = useSearch();

const results = ref<SearchResult[]>([]);
const query = ref("");

watch(query, async () => {
  if (query.value.length === 0) {
    results.value = [];
    return;
  }
  results.value = await search(workspaceId.value, { query: query.value });
});
</script>

<template>
  <Dialog>
    <DialogTrigger as-child>
      <div
        class="flex:row-md flex:center w-96 h-7 mx-auto rounded-lg bg-secondary text-xs text-secondary-foreground"
      >
        <IconSearch /> Search
      </div>
    </DialogTrigger>
    <DialogContent as-child>
      <Command class="rounded-lg border shadow-md p-0 top-80 h-fit md:min-w-[450px]">
        <Input v-model="query" placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup v-for="(result, index) in results" :key="result.resource" :heading="result.resource">
            <CommandItem v-for="item in result.data.content" :key="item.id" :value="item.id">
              <template v-if="result.resource === 'channels'">
                <span>{{ item.name }}</span>
              </template>
            </CommandItem>
            <CommandSeparator v-if="index < results.length - 1" />
          </CommandGroup>

          <!-- <CommandGroup heading="Suggestions">
            <CommandItem value="calendar">
              <Calendar />
              <span>Calendar</span>
            </CommandItem>
            <CommandItem value="emoji">
              <Smile />
              <span>Search Emoji</span>
            </CommandItem>
            <CommandItem disabled value="calculator">
              <Calculator />
              <span>Calculator</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Settings">
            <CommandItem value="profile">
              <User />
              <span>Profile</span>
              <CommandShortcut>⌘P</CommandShortcut>
            </CommandItem>
            <CommandItem value="billing">
              <CreditCard />
              <span>Billing</span>
              <CommandShortcut>⌘B</CommandShortcut>
            </CommandItem>
            <CommandItem value="settings">
              <Settings />
              <span>Settings</span>
              <CommandShortcut>⌘S</CommandShortcut>
            </CommandItem>
          </CommandGroup> -->
        </CommandList>
      </Command>
    </DialogContent>
  </Dialog>
</template>
