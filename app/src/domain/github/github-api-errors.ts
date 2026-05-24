import type { IGithubIntegrationApiErrorCode } from "@epicstory/contracts";

/**
 * Axios-style error body from Epicstory APIs (Nest global exception payload).
 */
export type IGithubParsedApiError = {
  message: string;
  githubErrorCode?: IGithubIntegrationApiErrorCode | string;
};

export function githubApiParseError(e: unknown, fallbackMessage: string): IGithubParsedApiError {
  const ax = e as {
    response?: { data?: unknown };
    message?: string;
  };
  const raw = ax.response?.data;
  let codeFromBody: IGithubParsedApiError["githubErrorCode"];
  if (raw !== null && raw !== undefined && typeof raw === "object" && !Array.isArray(raw)) {
    const d = raw as Record<string, unknown>;
    const gh = d.githubErrorCode;
    codeFromBody = typeof gh === "string" ? gh : undefined;
  }

  const msgField =
    raw !== null && raw !== undefined && typeof raw === "object" && !Array.isArray(raw) && "message" in raw
      ? (raw as { message?: unknown }).message
      : undefined;

  let message =
    typeof msgField === "string"
      ? msgField
      : Array.isArray(msgField)
        ? msgField.map(String).join(", ")
        : typeof ax.response?.data === "string"
          ? ax.response.data
          : typeof ax.message === "string" && ax.message.trim()
            ? ax.message
            : e instanceof Error && e.message
              ? e.message
              : fallbackMessage;

  if (typeof message !== "string" || !message.trim()) {
    message = fallbackMessage;
  }

  return { message, githubErrorCode: codeFromBody };
}

/** Readable string for sidebar / forms (backward compatible). */
export function githubApiErrorMessage(e: unknown, fallback: string): string {
  return githubApiParseError(e, fallback).message;
}
