/** Normalizes Axios / fetch-style errors into a readable string for GitHub sidebar UI. */
export function githubApiErrorMessage(e: unknown, fallback: string): string {
  const ax = e as {
    response?: { data?: { message?: unknown } };
    message?: string;
  };
  const m = ax.response?.data?.message;
  if (typeof m === "string" && m.trim()) return m;
  if (Array.isArray(m)) return m.map(String).join(", ");
  if (typeof ax.message === "string" && ax.message.trim()) return ax.message;
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}
