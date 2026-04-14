export function channelComposerDraftKey(workspaceId: number, channelId: number) {
  return `channelComposerDraft:${workspaceId}:${channelId}`;
}

export type ChannelComposerDraft = {
  contentRich: Record<string, unknown>;
};

export function loadChannelDraft(workspaceId: number, channelId: number): ChannelComposerDraft | null {
  try {
    const raw = localStorage.getItem(channelComposerDraftKey(workspaceId, channelId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChannelComposerDraft;
    if (parsed?.contentRich && typeof parsed.contentRich === "object") return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

export function saveChannelDraft(
  workspaceId: number,
  channelId: number,
  contentRich: Record<string, unknown>,
) {
  try {
    const payload: ChannelComposerDraft = { contentRich };
    localStorage.setItem(channelComposerDraftKey(workspaceId, channelId), JSON.stringify(payload));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearChannelDraft(workspaceId: number, channelId: number) {
  try {
    localStorage.removeItem(channelComposerDraftKey(workspaceId, channelId));
  } catch {
    /* ignore */
  }
}
