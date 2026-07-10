/** Append-newer pagination — items stay in the parent timeline. */
export type NewerPageState = {
  hasNewer: boolean;
  loadingNewer: boolean;
};

export function toNewerPageState(input: NewerPageState): NewerPageState {
  return {
    hasNewer: input.hasNewer,
    loadingNewer: input.loadingNewer,
  };
}

export const emptyNewerPageState = (): NewerPageState => ({
  hasNewer: false,
  loadingNewer: false,
});
