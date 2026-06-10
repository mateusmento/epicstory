import type {
  IIssue,
  SubscribeProjectBody,
  UnsubscribeProjectBody,
} from '@epicstory/contracts';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { EpicstoryServer } from 'src/core';

const projectRoom = (projectId: number) => `project:${projectId}`;

@WebSocketGateway()
export class ProjectGateway {
  @WebSocketServer()
  server: EpicstoryServer;

  @SubscribeMessage('subscribe-project')
  async subscribeProject(
    @MessageBody() { projectId }: SubscribeProjectBody,
    @ConnectedSocket() socket: Socket,
  ) {
    socket.join(projectRoom(projectId));
    return { success: true, projectId };
  }

  @SubscribeMessage('unsubscribe-project')
  async unsubscribeProject(
    @MessageBody() { projectId }: UnsubscribeProjectBody,
    @ConnectedSocket() socket: Socket,
  ) {
    socket.leave(projectRoom(projectId));
    return { success: true, projectId };
  }

  emitIssueUpdated(projectId: number, issue: unknown) {
    this.server.to(projectRoom(projectId)).emit('issue-updated', {
      issue: issue as IIssue,
      projectId,
    });
  }
}
