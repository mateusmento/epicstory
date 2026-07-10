export type WorkspaceStatus = 'active' | 'deleting';

export const WorkspaceStatus = {
  ACTIVE: 'active' as const,
  DELETING: 'deleting' as const,
};
