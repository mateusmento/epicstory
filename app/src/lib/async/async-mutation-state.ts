/** Command in flight (create branch, vote, upload). */
export type AsyncMutationState = {
  busy: boolean;
  error?: string | null;
};
