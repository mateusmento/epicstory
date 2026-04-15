import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import * as cookie from 'cookie';
import { RedisClientOptions, createClient } from 'redis';
import { ServerOptions, Socket } from 'socket.io';

export type AuthenticatedSocket = Socket & {
  data: {
    userId: number;
  };
};

export class SocketIoAdapter extends IoAdapter {
  constructor(
    private app: INestApplication,
    private options: Partial<ServerOptions>,
  ) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions) {
    const jwtService = this.app.get(JwtService);

    async function allowRequest(req, decide) {
      try {
        const { token = '' } = cookie.parse(req.headers.cookie);
        const user = await jwtService.verifyAsync(token.replace('Bearer ', ''));

        if (!Number.isFinite(user?.id)) {
          return decide('Unauthorized', false);
        }

        req.user = user;
        req.userId = user.id;
        decide('', true);
      } catch (ex) {
        decide('Unauthorized', false);
      }
    }

    const server = super.createIOServer(port, {
      ...options,
      allowRequest,
      ...this.options,
    });

    server.use((socket, next) => {
      const { userId } = socket.request;
      if (!Number.isFinite(userId)) {
        return next(new Error('Unauthorized'));
      }
      socket.data.userId = Number(userId);
      next();
    });

    return server;
  }
}

export async function createRedisAdapter(options: RedisClientOptions) {
  const pub = createClient(options);
  const sub = pub.duplicate();
  await Promise.all([pub.connect(), sub.connect()]);
  return createAdapter(pub, sub);
}
