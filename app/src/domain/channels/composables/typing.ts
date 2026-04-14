/** Receiver: drop typing user if no pulse within this window */
export const CHANNEL_TYPING_TTL_MS = 5500;

/** How often we prune stale typing users */
export const CHANNEL_TYPING_PRUNE_INTERVAL_MS = 500;

/** Sender: emit channel-typing-pulse at this interval while composing */
export const CHANNEL_TYPING_PULSE_MS = 2500;

export function pruneStaleTyping(activity: Map<number, number>, now = Date.now()) {
  for (const [userId, at] of activity) {
    if (now - at > CHANNEL_TYPING_TTL_MS) activity.delete(userId);
  }
}
