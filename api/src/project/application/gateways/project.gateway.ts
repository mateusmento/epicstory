import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

const projectRoom = (projectId: number) => `project:${projectId}`;

@WebSocketGateway()
export class ProjectGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('subscribe-project')
  async subscribeProject(
    @MessageBody() { projectId }: { projectId: number },
    @ConnectedSocket() socket: Socket,
  ) {
    socket.join(projectRoom(projectId));
    return { success: true, projectId };
  }

  @SubscribeMessage('unsubscribe-project')
  async unsubscribeProject(
    @MessageBody() { projectId }: { projectId: number },
    @ConnectedSocket() socket: Socket,
  ) {
    socket.leave(projectRoom(projectId));
    return { success: true, projectId };
  }

  emitIssueUpdated(projectId: number, issue: any) {
    this.server.to(projectRoom(projectId)).emit('issue-updated', {
      issue,
      projectId,
    });
  }
}
