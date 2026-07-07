<script lang="ts" setup>
import { useDependency } from "@/core/dependency-injection";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbList,
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
  Menu,
  MenuContent,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
  OverflowContainer,
  OverflowEllipsis,
  OverflowItem,
  Separator,
  ToggleGroup,
  ToggleGroupItem,
} from "@/design-system";
import { Icon, IconSearch } from "@/design-system/icons";
import { NavTrigger } from "@/design-system";
import { IssueApi } from "@epicstory/api-client";
import type { IIssue } from "@epicstory/contracts";
import { useProjectScreen } from "@/domain/project";
import { useMagicKeys, useStorage, whenever } from "@vueuse/core";
import {
  Calculator,
  Calendar,
  ChevronRight,
  CreditCard,
  Layers2Icon,
  Rows3Icon,
  Settings,
  Smile,
  SquareKanbanIcon,
  SquarePen,
  TimerIcon,
  User,
} from "lucide-vue-next";
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import NewIssueModal from "@/containers/views/project/NewIssueModal.vue";
import ProjectTeamTabs from "@/containers/project/ProjectTeamTabs.vue";
import ProjectFilterDropdown from "@/containers/views/project/filters/ProjectFilterDropdown.vue";
import ProjectFiltersBar from "@/containers/views/project/filters/ProjectFiltersBar.vue";

const props = defineProps<{ workspaceId: string; projectId: string; issueId?: string }>();

const open = ref(false);
const { meta_j } = useMagicKeys();
whenever(meta_j, () => {
  open.value = true;
});

const route = useRoute();

const routeName = computed(() => {
  switch (route.name) {
    case "project-backlog":
      return "backlog";
    case "project-board":
      return "board";
    case "project-sprint":
      return "sprint";
    default:
      return undefined;
  }
});

const showProjectTeamTabs = computed(
  () =>
    teamId.value != null &&
    (routeName.value === "backlog" || routeName.value === "board" || routeName.value === "sprint"),
);

const projectIdNum = computed(() => +props.projectId);
const { project, teamId } = useProjectScreen(projectIdNum);

const issueApi = useDependency(IssueApi);
const issue = ref<IIssue | null>(null);
onMounted(async () => {
  if (props.issueId) {
    issue.value = await issueApi.fetchIssue(+props.issueId);
  }
});
watch(
  () => props.issueId,
  async (issueId) => {
    if (issueId) {
      issue.value = await issueApi.fetchIssue(+issueId);
    }
  },
);

const groupBy = useStorage<GroupBy>("backlog.groupBy", "status", localStorage, {
  listenToStorageChanges: true,
});

const GROUP_BY_OPTIONS = {
  none: "No grouping",
  status: "Status",
  priority: "Priority",
} as const;

type GroupBy = keyof typeof GROUP_BY_OPTIONS;

type ProjectCrumb = {
  key: string;
  label: string;
  to?: string;
  pinned?: boolean;
};

const crumbs = computed<ProjectCrumb[]>(() => {
  const items: ProjectCrumb[] = [
    { key: "projects", label: "Project" },
    {
      key: "project",
      label: project.value?.name ?? "Project",
      to: `/${props.workspaceId}/project/${props.projectId}/backlog`,
    },
  ];

  if (route.name === "project-board") {
    items.push({
      key: "board",
      label: "Board",
      to: `/${props.workspaceId}/project/${props.projectId}/board`,
    });
  } else if (route.name === "project-backlog") {
    items.push({
      key: "backlog",
      label: "Backlog",
      to: `/${props.workspaceId}/project/${props.projectId}/backlog`,
    });
  } else if (route.name === "project-issue" && props.issueId) {
    items.push({
      key: "issue",
      label: issue.value?.title ?? "Issue",
      to: `/${props.workspaceId}/project/${props.projectId}/issue/${props.issueId}`,
    });
  }

  if (items.length > 0) {
    items[0].pinned = true;
    items[items.length - 1].pinned = true;
  }

  return items;
});

const headCrumb = computed(() => crumbs.value[0]);
const tailCrumbs = computed(() => crumbs.value.slice(1));

function crumbByKey(key: string): ProjectCrumb | undefined {
  return crumbs.value.find((crumb) => crumb.key === key);
}
</script>

<template>
  <div class="flex:col h-full min-h-0 w-full">
    <div class="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-1.5 h-10">
      <div class="min-w-0">
        <Breadcrumb class="min-w-0">
          <OverflowContainer
            :as="BreadcrumbList"
            :gap="6"
            class="flex-nowrap items-center break-words text-sm text-muted-foreground"
          >
            <OverflowItem v-if="headCrumb" as="li" :segment-key="headCrumb.key" :pinned="headCrumb.pinned">
              <BreadcrumbItem>{{ headCrumb.label }}</BreadcrumbItem>
            </OverflowItem>

            <OverflowEllipsis v-if="tailCrumbs.length > 0" v-slot="{ collapsed, hiddenSegmentKeys }">
              <BreadcrumbItem>
                <ChevronRight v-if="collapsed" class="size-3.5" aria-hidden="true" />
                <Menu v-if="collapsed">
                  <MenuTrigger as-child>
                    <button
                      type="button"
                      class="inline-flex items-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      :aria-label="`${hiddenSegmentKeys.length} hidden breadcrumb items`"
                    >
                      <BreadcrumbEllipsis class="size-5" />
                    </button>
                  </MenuTrigger>
                  <MenuContent align="start">
                    <MenuItem v-for="key in hiddenSegmentKeys" :key="key" as-child>
                      <RouterLink :to="crumbByKey(key)?.to ?? '#'" class="w-full cursor-pointer text-xs">
                        {{ crumbByKey(key)?.label }}
                      </RouterLink>
                    </MenuItem>
                  </MenuContent>
                </Menu>
              </BreadcrumbItem>
            </OverflowEllipsis>

            <OverflowItem
              v-for="crumb in tailCrumbs"
              :key="crumb.key"
              :segment-key="crumb.key"
              :pinned="crumb.pinned"
            >
              <BreadcrumbItem>
                <ChevronRight class="size-3.5" aria-hidden="true" />
                <RouterLink v-if="crumb.to" :to="crumb.to" class="truncate max-w-60">
                  {{ crumb.label }}
                </RouterLink>
                <span v-else class="truncate max-w-60">{{ crumb.label }}</span>
              </BreadcrumbItem>
            </OverflowItem>
          </OverflowContainer>
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

      <div class="flex:row flex:center-y justify-end flex-1 gap-2">
        <NavTrigger v-if="teamId" view="app-pane" content="sprint-panel" :props="{ teamId }">
          <Button variant="outline" size="icon" title="Sprint planning">
            <TimerIcon class="size-4 text-muted-foreground" />
          </Button>
        </NavTrigger>
        <Dialog>
          <DialogTrigger as-child>
            <Button variant="outline" size="icon">
              <SquarePen class="size-4 text-muted-foreground" />
              <span class="ml-1 text-xs">New issue</span>
            </Button>
          </DialogTrigger>
          <DialogContent as-child>
            <NewIssueModal :project-id="+projectId" />
          </DialogContent>
        </Dialog>
      </div>
    </div>

    <Separator />

    <div class="grid grid-cols-[1fr_auto_1fr] gap-md items-center px-4 py-1.5 min-h-10">
      <div class="flex items-center gap-2 min-w-0 overflow-x-auto">
        <ToggleGroup
          as="nav"
          type="single"
          :model-value="routeName"
          class="flex:row-lg shrink-0 bg-transparent"
        >
          <ToggleGroupItem value="backlog" variant="outline" size="sm" as-child>
            <RouterLink
              :to="`/${workspaceId}/project/${projectId}/backlog`"
              class="flex:row-md flex:center-y"
            >
              <Rows3Icon class="size-4 text-muted-foreground" />
              Backlog
            </RouterLink>
          </ToggleGroupItem>
          <ToggleGroupItem value="board" variant="outline" size="sm" as-child>
            <RouterLink :to="`/${workspaceId}/project/${projectId}/board`" class="flex:row-md flex:center-y">
              <SquareKanbanIcon class="size-4 text-muted-foreground" />
              Board
            </RouterLink>
          </ToggleGroupItem>
          <ToggleGroupItem value="sprint" variant="outline" size="sm" as-child>
            <RouterLink :to="`/${workspaceId}/project/${projectId}/sprint`" class="flex:row-md flex:center-y">
              <TimerIcon class="size-4 text-muted-foreground" />
              Sprint
            </RouterLink>
          </ToggleGroupItem>
        </ToggleGroup>

        <Separator v-if="showProjectTeamTabs && teamId" orientation="vertical" class="h-6 shrink-0" />

        <ProjectTeamTabs
          v-if="showProjectTeamTabs && teamId"
          :workspace-id="+workspaceId"
          :project-id="+projectId"
          :team-id="teamId"
          :view="routeName"
        />
      </div>

      <ProjectFiltersBar :project-id="+projectId" />

      <div v-if="routeName === 'backlog'" class="flex:row-md flex:center-y justify-end">
        <ProjectFilterDropdown :project-id="+projectId">
          <Button variant="outline" size="icon" class="flex:row-sm flex:center-y" title="Add filter">
            <Icon name="bi-filter" />
          </Button>
        </ProjectFilterDropdown>

        <Menu>
          <MenuTrigger as-child>
            <Button variant="outline" size="icon" class="flex:row-md flex:center-y h-fit">
              <Layers2Icon class="size-4 text-muted-foreground" />
              <div class="text-xs">{{ GROUP_BY_OPTIONS[groupBy ?? "none"] }}</div>
              <Icon name="oi-chevron-down" class="ml-auto text-muted-foreground" />
            </Button>
          </MenuTrigger>
          <MenuContent align="end" class="w-56">
            <div class="p-1 text-xs text-muted-foreground">Group by:</div>
            <MenuRadioGroup v-model="groupBy">
              <MenuRadioItem v-for="(label, option) in GROUP_BY_OPTIONS" :key="option" :value="option">
                {{ label }}
              </MenuRadioItem>
            </MenuRadioGroup>
          </MenuContent>
        </Menu>
      </div>
    </div>

    <Separator />
    <section class="flex-1 min-h-0 overflow-auto">
      <RouterView />
    </section>
  </div>
</template>
