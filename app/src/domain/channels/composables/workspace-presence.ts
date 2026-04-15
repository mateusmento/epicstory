/** Receiver: drop user if no presence pulse within this window */
export const WORKSPACE_PRESENCE_TTL_MS = 45000;

export const WORKSPACE_PRESENCE_PRUNE_INTERVAL_MS = 5000;

/** Sender: emit workspace-presence-pulse at this interval while active */
export const WORKSPACE_PRESENCE_PULSE_MS = 15000;

export function pruneStalePresence(activity: Map<number, number>, now = Date.now()) {
  for (const [userId, at] of activity) {
    if (now - at > WORKSPACE_PRESENCE_TTL_MS) activity.delete(userId);
  }
}
