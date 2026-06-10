import type {
  SubscribeWorkspacePresenceBody,
  UnsubscribeWorkspacePresenceBody,
  UserPresenceEvent,
  UserPresenceStoppedEvent,
  WorkspacePresencePulseBody,
  WorkspacePresenceStopBody,
} from '@epicstory/contracts';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { uniq } from 'lodash';
import { Server } from 'socket.io';
import { AuthenticatedSocket } from 'src/core';
import { WorkspaceMemberRepository } from 'src/workspace/infrastructure/repositories/workspace-member.repository';

const workspacePresenceRoom = (workspaceId: number) =>
  `workspace:${workspaceId}:presence` as const;

export interface WorkspacePresenceSocket extends AuthenticatedSocket {
  data: AuthenticatedSocket['data'] & {
    presenceWorkspaceId?: number;
  };
}

@WebSocketGateway()
export class WorkspaceGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly workspaceMemberRepo: WorkspaceMemberRepository,
  ) {}

  /**
   * Emit presence-stopped when this socket disconnects and no other socket in the
   * workspace presence room is still associated with the same userId. (avoids cleaning
   * up presence when a user has multiple tabs open)
   */
  async handleDisconnect(socket: WorkspacePresenceSocket) {
    const userId = socket.data.userId;
    const workspaceId = socket.data.presenceWorkspaceId;
    if (
      !Number.isFinite(userId) ||
      workspaceId == null ||
      !Number.isFinite(workspaceId)
    ) {
      return;
    }

    const room = workspacePresenceRoom(workspaceId);
    const sockets = await this.server.in(room).fetchSockets();
    const hasAnotherSocketForSameUser = sockets.some(
      (s) => s.id !== socket.id && s.data.userId === userId,
    );
    if (hasAnotherSocketForSameUser) return;

    const payload: UserPresenceStoppedEvent = { workspaceId, userId };
    this.server.to(room).emit('user-presence-stopped', payload);
  }

  private async isUserInWorkspace(
    userId: number,
    workspaceId: number,
  ): Promise<boolean> {
    const count = await this.workspaceMemberRepo.count({
      where: { userId, workspaceId },
    });
    return count > 0;
  }

  @SubscribeMessage('subscribe-workspace-presence')
  async subscribeWorkspacePresence(
    @MessageBody() body: SubscribeWorkspacePresenceBody,
    @ConnectedSocket() socket: WorkspacePresenceSocket,
  ) {
    const { userId } = socket.data;
    const workspaceId = Number(body?.workspaceId);
    if (!Number.isFinite(userId) || !Number.isFinite(workspaceId)) {
      return { ok: false };
    }

    const ok = await this.isUserInWorkspace(userId, workspaceId);
    if (!ok) return { ok: false };

    const prev = socket.data.presenceWorkspaceId;
    if (prev != null && prev !== workspaceId) {
      socket.leave(workspacePresenceRoom(prev));
    }

    socket.leave(workspacePresenceRoom(workspaceId));
    socket.join(workspacePresenceRoom(workspaceId));
    socket.data.presenceWorkspaceId = workspaceId;

    return { ok: true };
  }

  async getConnectedUserIds(workspaceId: number): Promise<number[]> {
    const sockets = await this.server
      .in(workspacePresenceRoom(workspaceId))
      .fetchSockets();

    const userIds = sockets
      .map((socket) => socket.data.userId)
      .filter(Number.isFinite);

    return uniq(userIds);
  }

  @SubscribeMessage('unsubscribe-workspace-presence')
  async unsubscribeWorkspacePresence(
    @MessageBody() body: UnsubscribeWorkspacePresenceBody,
    @ConnectedSocket() socket: WorkspacePresenceSocket,
  ) {
    const userId = socket.data.userId;
    const workspaceId = Number(body?.workspaceId);
    if (!Number.isFinite(userId) || !Number.isFinite(workspaceId)) {
      return { ok: false };
    }

    socket.leave(workspacePresenceRoom(workspaceId));
    if (socket.data.presenceWorkspaceId === workspaceId) {
      delete socket.data.presenceWorkspaceId;
    }

    return { ok: true };
  }

  @SubscribeMessage('workspace-presence-pulse')
  async workspacePresencePulse(
    @MessageBody() body: WorkspacePresencePulseBody,
    @ConnectedSocket() socket: WorkspacePresenceSocket,
  ) {
    const userId = socket.data.userId;
    const workspaceId = Number(body?.workspaceId);
    if (!Number.isFinite(userId) || !Number.isFinite(workspaceId)) {
      return { ok: false };
    }

    const ok = await this.isUserInWorkspace(userId, workspaceId);
    if (!ok) return { ok: false };

    const payload: UserPresenceEvent = { workspaceId, userId };
    socket
      .to(workspacePresenceRoom(workspaceId))
      .emit('user-presence', payload);

    return { ok: true };
  }

  @SubscribeMessage('workspace-presence-stop')
  async workspacePresenceStop(
    @MessageBody() body: WorkspacePresenceStopBody,
    @ConnectedSocket() socket: WorkspacePresenceSocket,
  ) {
    const userId = socket.data.userId;
    const workspaceId = Number(body?.workspaceId);
    if (!Number.isFinite(userId) || !Number.isFinite(workspaceId)) {
      return { ok: false };
    }

    const ok = await this.isUserInWorkspace(userId, workspaceId);
    if (!ok) return { ok: false };

    const payload: UserPresenceStoppedEvent = { workspaceId, userId };
    socket
      .to(workspacePresenceRoom(workspaceId))
      .emit('user-presence-stopped', payload);

    return { ok: true };
  }
}
