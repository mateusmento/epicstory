/** Prepend-older pagination — items stay in the parent timeline. */
export type OlderPageState = {
  hasOlder: boolean;
  loadingOlder: boolean;
};

export function toOlderPageState(input: OlderPageState): OlderPageState {
  return {
    hasOlder: input.hasOlder,
    loadingOlder: input.loadingOlder,
  };
}

export const emptyOlderPageState = (): OlderPageState => ({
  hasOlder: false,
  loadingOlder: false,
});
