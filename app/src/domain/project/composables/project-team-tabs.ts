import { useDependency } from "@/core/dependency-injection";
import { useRecentProjects } from "@/domain/workspace";
import { toProjectTeamTab, type ProjectTeamView } from "@/lib/project";
import { WorkspaceApi } from "@epicstory/api-client";
import type { Project } from "@epicstory/contracts";
import { computed, ref, watch, type Ref } from "vue";
import { useProjectContext } from "./project-context";

export type { ProjectTeamView } from "@/lib/project";

const RECENT_TAB_LIMIT = 5;
const OVERFLOW_FETCH_COUNT = 50;

export type UseProjectTeamTabsArgs = {
  workspaceId: Ref<number>;
  projectId: Ref<number>;
  teamId: Ref<number | undefined>;
  view: Ref<ProjectTeamView | undefined>;
};

function projectsForTeam(recent: Project[], teamId: number) {
  return recent.filter((project) => project.teamId === teamId);
}

function visibleTeamProjects(recent: Project[], teamId: number, current: Project | null) {
  const teamRecent = projectsForTeam(recent, teamId).slice(0, RECENT_TAB_LIMIT);

  if (current?.teamId !== teamId) {
    return teamRecent;
  }

  if (teamRecent.some((project) => project.id === current.id)) {
    return teamRecent;
  }

  return [...teamRecent, current].slice(0, RECENT_TAB_LIMIT);
}

async function resolveCurrentProject(
  ensureProjectContext: (projectId: number) => Promise<Project>,
  recent: Project[],
  activeProjectId: number,
) {
  const recentMatch = recent.find((project) => project.id === activeProjectId);
  if (recentMatch) return recentMatch;
  return ensureProjectContext(activeProjectId);
}

export function useProjectTeamTabs({ workspaceId, projectId, teamId, view }: UseProjectTeamTabsArgs) {
  const workspaceApi = useDependency(WorkspaceApi);
  const { ensureProjectContext } = useProjectContext();
  const { recentProjects } = useRecentProjects();

  const currentProject = ref<Project | null>(null);
  const teamProjectTotal = ref(0);
  const overflowProjects = ref<Project[]>([]);
  const overflowLoading = ref(false);
  const overflowLoaded = ref(false);

  const resolvedView = computed<ProjectTeamView>(() => view.value ?? "backlog");

  watch(
    [workspaceId, teamId],
    async ([wsId, id]) => {
      overflowLoaded.value = false;
      overflowProjects.value = [];
      currentProject.value = null;
      teamProjectTotal.value = 0;

      if (id == null) return;

      const page = await workspaceApi.findProjects(wsId, {
        teamId: id,
        page: 0,
        count: 1,
      });
      teamProjectTotal.value = page.total;
    },
    { immediate: true },
  );

  watch(
    [projectId, recentProjects],
    async ([activeProjectId]) => {
      if (teamId.value == null) {
        currentProject.value = null;
        return;
      }

      currentProject.value = await resolveCurrentProject(
        ensureProjectContext,
        recentProjects.value,
        activeProjectId,
      );
    },
    { immediate: true },
  );

  const visibleProjects = computed(() => {
    const id = teamId.value;
    if (id == null) return [];
    return visibleTeamProjects(recentProjects.value, id, currentProject.value);
  });

  const activeProjectId = computed(() => projectId.value);

  const showTabs = computed(() => teamProjectTotal.value > 1);

  const tabs = computed(() =>
    visibleProjects.value.map((project) => toProjectTeamTab(project, workspaceId.value, resolvedView.value)),
  );

  const showMoreMenu = computed(() => {
    const visibleIds = new Set(visibleProjects.value.map((project) => project.id));
    if (overflowLoaded.value) {
      return overflowProjects.value.length > 0;
    }
    return teamProjectTotal.value > visibleIds.size;
  });

  const overflowTabs = computed(() =>
    overflowProjects.value.map((project) => toProjectTeamTab(project, workspaceId.value, resolvedView.value)),
  );

  async function loadOverflowProjects() {
    const id = teamId.value;
    if (id == null || overflowLoaded.value || overflowLoading.value) return;

    overflowLoading.value = true;
    try {
      const page = await workspaceApi.findProjects(workspaceId.value, {
        teamId: id,
        page: 0,
        count: OVERFLOW_FETCH_COUNT,
        orderBy: "name",
        order: "asc",
      });
      const visibleIds = new Set(visibleProjects.value.map((project) => project.id));
      overflowProjects.value = page.content.filter((project) => !visibleIds.has(project.id));
      overflowLoaded.value = true;
    } finally {
      overflowLoading.value = false;
    }
  }

  function onMoreMenuOpen(open: boolean) {
    if (open) {
      loadOverflowProjects();
    }
  }

  return {
    loading: overflowLoading,
    activeProjectId,
    showTabs,
    tabs,
    showMoreMenu,
    overflowTabs,
    onMoreMenuOpen,
  };
}
