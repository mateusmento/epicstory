/** Shared body for all workspace presence client → server events. */
export type WorkspacePresenceWorkspaceBody = {
  workspaceId: number;
};

export type SubscribeWorkspacePresenceBody = WorkspacePresenceWorkspaceBody;
export type UnsubscribeWorkspacePresenceBody = WorkspacePresenceWorkspaceBody;
export type WorkspacePresencePulseBody = WorkspacePresenceWorkspaceBody;
export type WorkspacePresenceStopBody = WorkspacePresenceWorkspaceBody;

export type UserPresenceEvent = {
  workspaceId: number;
  userId: number;
};

export type UserPresenceStoppedEvent = UserPresenceEvent;
