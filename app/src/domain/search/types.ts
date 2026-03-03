import type { Page } from "@/core/types";

export type SearchScope = {
  resourceType: string;
  resourceId: number;
};

export type SearchQuery = {
  query: string;
  scope?: SearchScope[];
};

export type SearchResult = {
  resource: string;
  data: Page<any>;
};
