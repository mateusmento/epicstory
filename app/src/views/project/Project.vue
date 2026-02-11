<script lang="ts" setup>
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
  Dialog,
  DialogContent,
  DialogTrigger,
  Separator,
} from "@/design-system";
import { IconSearch } from "@/design-system/icons";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/design-system/ui/breadcrumb";
import ToggleGroup from "@/design-system/ui/toggle-group/ToggleGroup.vue";
import ToggleGroupItem from "@/design-system/ui/toggle-group/ToggleGroupItem.vue";
import { useMagicKeys, whenever } from "@vueuse/core";
import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  Calendar,
  CreditCard,
  Settings,
  Smile,
  User,
} from "lucide-vue-next";
import { ref } from "vue";
import { RouterLink, useRoute } from "vue-router";

const open = ref(false);
const { meta_j } = useMagicKeys();
whenever(meta_j, () => {
  open.value = true;
});

defineProps<{ workspaceId: string; projectId: string; issueId: string }>();

const route = useRoute();

function routeId(route: string) {
  return route.split("/").pop();
}
</script>

<template>
  <div class="w-full h-full flex:col">
    <div class="flex:row flex:center-y px-4 py-1.5 h-10">
      <div class="flex:row flex:center-y flex-1">
        <div class="flex:row-md flex:center-y">
          <Button variant="outline" size="icon">
            <ArrowLeft class="w-4 h-4 text-secondary-foreground" />
          </Button>
          <Button variant="outline" size="icon">
            <ArrowRight class="w-4 h-4 text-secondary-foreground" />
          </Button>
        </div>

        <Breadcrumb class="px-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <RouterLink :to="`/${workspaceId}/project/${projectId}`"> Project </RouterLink>
            </BreadcrumbItem>

            <BreadcrumbSeparator />

            <BreadcrumbItem>
              <RouterLink :to="`/${workspaceId}/project/${projectId}/board`"> Board </RouterLink>
            </BreadcrumbItem>

            <BreadcrumbSeparator />

            <BreadcrumbItem>
              <RouterLink :to="`/${workspaceId}/project/${projectId}/issue/${issueId}`"> Issue </RouterLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

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
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Suggestions">
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
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>

      <div class="flex-1"></div>
    </div>

    <Separator />

    <div class="flex:row-md flex:center-y px-4 py-1.5 h-10">
      <ToggleGroup as="nav" type="single" :value="routeId(route.path)" class="flex:row-lg bg-transparent">
        <ToggleGroupItem value="backlog" variant="outline" size="sm" as-child>
          <RouterLink :to="`/${workspaceId}/project/${projectId}/backlog`">
            <!-- <Button :variant="isActive('backlog') ? 'outline' : 'ghost'" size="xs"></Button> -->
            Backlog
          </RouterLink>
        </ToggleGroupItem>
        <ToggleGroupItem value="board" variant="outline" size="sm" as-child>
          <RouterLink :to="`/${workspaceId}/project/${projectId}/board`">
            <!-- <Button :variant="isActive('board') ? 'outline' : 'ghost'" size="xs"></Button> -->
            Board
          </RouterLink>
        </ToggleGroupItem>
      </ToggleGroup>
    </div>

    <Separator />
    <section class="flex-1 min-h-0 overflow-auto">
      <RouterView />
    </section>
  </div>
</template>
