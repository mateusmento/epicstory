export function channelComposerDraftKey(workspaceId: number, channelId: number) {
  return `channelComposerDraft:${workspaceId}:${channelId}`;
}

export type ChannelComposerDraft = {
  content: Record<string, unknown>;
};

export function loadChannelDraft(workspaceId: number, channelId: number): ChannelComposerDraft | null {
  try {
    const raw = localStorage.getItem(channelComposerDraftKey(workspaceId, channelId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChannelComposerDraft & { contentRich?: Record<string, unknown> };
    if (parsed?.content && typeof parsed.content === "object") return parsed;
    if (parsed?.contentRich && typeof parsed.contentRich === "object") {
      return { content: parsed.contentRich };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function saveChannelDraft(
  workspaceId: number,
  channelId: number,
  content: Record<string, unknown>,
) {
  try {
    const payload: ChannelComposerDraft = { content };
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
