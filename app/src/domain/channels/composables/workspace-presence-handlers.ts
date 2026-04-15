import { useWebSockets } from "@/core/websockets";
import { useAuth } from "@/domain/auth";
import { useWorkspace } from "@/domain/workspace";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import {
  WORKSPACE_PRESENCE_PRUNE_INTERVAL_MS,
  WORKSPACE_PRESENCE_PULSE_MS,
  pruneStalePresence,
} from "./workspace-presence";

/** Shared presence map: userId -> last pulse timestamp */
const presenceActivity = ref(new Map<number, number>());
let presencePruneTimer: ReturnType<typeof setInterval> | null = null;
let presencePulseTimer: ReturnType<typeof setInterval> | null = null;

const onlineUserIds = computed(() => new Set(presenceActivity.value.keys()));

function isUserOnline(userId: number | undefined | null): boolean {
  if (userId == null) return false;
  return presenceActivity.value.has(userId);
}

/**
 * Read-only: online peers for any component under the workspace shell.
 * Lifecycle is owned by `useWorkspacePresence()` (Dashboard).
 */
export function useWorkspaceOnline() {
  return { onlineUserIds, isUserOnline };
}

/**
 * Call once from the workspace layout (e.g. Dashboard) while the user is in the app.
 */
export function useWorkspacePresence() {
  const { websocket } = useWebSockets();
  const { workspace } = useWorkspace();
  const { user } = useAuth();

  function onUserPresence({ workspaceId, userId }: { workspaceId: number; userId: number }) {
    if (workspaceId !== workspace.value.id) return;
    const me = user.value?.id;
    if (me != null && userId === me) return;
    const next = new Map(presenceActivity.value);
    next.set(userId, Date.now());
    presenceActivity.value = next;
  }

  function onUserPresenceStopped({ workspaceId, userId }: { workspaceId: number; userId: number }) {
    if (workspaceId !== workspace.value.id) return;
    const next = new Map(presenceActivity.value);
    next.delete(userId);
    presenceActivity.value = next;
  }

  function tickPresencePrune() {
    const m = new Map(presenceActivity.value);
    pruneStalePresence(m);
    presenceActivity.value = m;
  }

  /** HTTP snapshot from find-workspace; merges like a pulse so TTL pruning stays consistent */
  function mergeOnlineUsersSnapshot(snapshot: number[] | undefined) {
    if (snapshot == null || snapshot.length === 0) return;
    const me = user.value?.id;
    const now = Date.now();
    const next = new Map(presenceActivity.value);
    for (const id of snapshot.filter((id) => id !== me)) {
      next.set(id, now);
    }
    presenceActivity.value = next;
  }

  function emitPresencePulse() {
    websocket?.emit("workspace-presence-pulse", { workspaceId: workspace.value.id });
  }

  function emitPresenceStop() {
    websocket?.emit("workspace-presence-stop", { workspaceId: workspace.value.id });
  }

  function clearPulseTimer() {
    if (presencePulseTimer) {
      clearInterval(presencePulseTimer);
      presencePulseTimer = null;
    }
  }

  function startPulseLoop() {
    clearPulseTimer();
    emitPresencePulse();
    presencePulseTimer = setInterval(emitPresencePulse, WORKSPACE_PRESENCE_PULSE_MS);
  }

  /** Runs before the snapshot watcher so we never merge HTTP snapshot into a stale workspace map */
  watch(
    () => workspace.value?.id,
    (workspaceId, oldId) => {
      presenceActivity.value = new Map();
      clearPulseTimer();
      if (oldId !== undefined) {
        websocket?.emit("workspace-presence-stop", { workspaceId: oldId });
      }
      if (workspaceId != null) {
        websocket?.emit("subscribe-workspace-presence", { workspaceId });
        mergeOnlineUsersSnapshot(workspace.value?.onlineUsersSnapshot);
        startPulseLoop();
      }
    },
  );

  watch(
    () => workspace.value?.onlineUsersSnapshot,
    (snap) => {
      if (workspace.value?.id == null) return;
      mergeOnlineUsersSnapshot(snap);
    },
  );

  onMounted(() => {
    const wid = workspace.value?.id;
    if (wid != null) {
      websocket?.emit("subscribe-workspace-presence", { workspaceId: wid });
    }
    mergeOnlineUsersSnapshot(workspace.value?.onlineUsersSnapshot);

    websocket?.off("user-presence", onUserPresence);
    websocket?.on("user-presence", onUserPresence);

    websocket?.off("user-presence-stopped", onUserPresenceStopped);
    websocket?.on("user-presence-stopped", onUserPresenceStopped);

    if (!presencePruneTimer) {
      presencePruneTimer = setInterval(tickPresencePrune, WORKSPACE_PRESENCE_PRUNE_INTERVAL_MS);
    }

    startPulseLoop();
  });

  onUnmounted(() => {
    clearPulseTimer();
    emitPresenceStop();

    const wid = workspace.value?.id;
    if (wid != null) {
      websocket?.emit("unsubscribe-workspace-presence", { workspaceId: wid });
    }

    websocket?.off("user-presence", onUserPresence);
    websocket?.off("user-presence-stopped", onUserPresenceStopped);

    if (presencePruneTimer) {
      clearInterval(presencePruneTimer);
      presencePruneTimer = null;
    }
    presenceActivity.value = new Map();
  });

  return { onlineUserIds, isUserOnline };
}
