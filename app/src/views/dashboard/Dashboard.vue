<script setup lang="ts">
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/design-system";
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from "radix-vue";
import IconArrowDown from "./IconArrowDown.vue";
import IconLeftCollapise from "./IconLeftCollapise.vue";

const currentWorkspace = "Epicstory";
</script>

<template>
  <TabsRoot as-child default-value="channels">
    <Collapsible class="absolute inset-0">
      <div class="flex:cols w-full h-full bg-zinc-100">
        <!-- Navigation sidebar -->
        <aside class="flex:rows-xl p-2 w-64 text-xs text-neutral-700">
          <TabsList as-child>
            <div class="flex:cols-auto flex:center-y">
              <CollapsibleTrigger as-child>
                <TabsTrigger as-child value="workspaces">
                  <div
                    class="flex:cols-4xl flex:center-y p-2 pr-4 w-fit rounded-md hover:bg-zinc-200/60 cursor-pointer"
                  >
                    <div class="flex:rows-sm">
                      <div class="text-xs text-zinc-500">Workspace</div>
                      <div class="text-lg text-neutral-800">{{ currentWorkspace }}</div>
                    </div>
                    <IconArrowDown />
                  </div>
                </TabsTrigger>
              </CollapsibleTrigger>

              <div class="flex flex:center mx-2 p-2 rounded-md hover:bg-zinc-200/60 cursor-pointer">
                <IconLeftCollapise />
              </div>
            </div>
            <nav class="flex:rows-md font-semibold">
              <Collapsible class="flex:rows-md">
                <CollapsibleTrigger as-child>
                  <div class="px-2 py-1 rounded-sm text-zinc-500 hover:bg-zinc-200/60 cursor-pointer">
                    Projects
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div class="flex:rows-sm px-1 rounded-sm font-normal">
                    <div class="px-2 py-1 w-fit rounded-sm text-zinc-500 hover:font-semibold cursor-pointer">
                      Clients
                    </div>
                    <div class="px-2 py-1 w-fit rounded-sm text-zinc-500 hover:font-semibold cursor-pointer">
                      Designers
                    </div>
                    <div class="px-2 py-1 w-fit rounded-sm text-zinc-500 hover:font-semibold cursor-pointer">
                      Developers
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <TabsTrigger as-child value="channels">
                <CollapsibleTrigger as-child>
                  <div class="px-2 py-1 rounded-sm text-zinc-500 hover:bg-zinc-200/60 cursor-pointer">
                    Channels
                  </div>
                </CollapsibleTrigger>
              </TabsTrigger>
            </nav>
          </TabsList>
        </aside>
        <main
          class="self:fill bg-white mt-2 rounded-tl-md border border-zinc-300/60 shadow-md shadow-zinc-300/60"
        >
          <!-- Application sidebar -->
          <CollapsibleContent
            as="aside"
            transition="fade"
            class="h-full w-96 p-2 border-r border-r-zinc-300/60"
          >
            <TabsContent value="workspaces">My workspaces</TabsContent>
            <TabsContent value="channels">
              My channels
              <nav class="flex:rows-md font-semibold">
                <div class="px-2 py-1 rounded-sm text-zinc-500 hover:bg-zinc-200/60 cursor-pointer">
                  Projects
                </div>
                <div class="flex:rows-sm px-1 rounded-sm font-normal">
                  <div class="px-2 py-1 w-fit rounded-sm text-zinc-500 hover:font-semibold cursor-pointer">
                    Clients
                  </div>
                  <div class="px-2 py-1 w-fit rounded-sm text-zinc-500 hover:font-semibold cursor-pointer">
                    Designers
                  </div>
                  <div class="px-2 py-1 w-fit rounded-sm text-zinc-500 hover:font-semibold cursor-pointer">
                    Developers
                  </div>
                </div>

                <div class="px-2 py-1 rounded-sm text-zinc-500 hover:bg-zinc-200/60 cursor-pointer">
                  Channels
                </div>
              </nav>
            </TabsContent>
          </CollapsibleContent>
        </main>
      </div>
    </Collapsible>
  </TabsRoot>
</template>

<style lang="scss" scoped></style>
