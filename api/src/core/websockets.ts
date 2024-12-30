import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { RedisClientOptions, createClient } from 'redis';
import { ServerOptions } from 'socket.io';
import * as cookie from 'cookie';

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
        (req as any).user = user;
        decide('', true);
      } catch (ex) {
        decide('Unauthorized', false);
      }
    }

    return super.createIOServer(port, {
      ...options,
      allowRequest,
      ...this.options,
    });
  }
}

export async function createRedisAdapter(options: RedisClientOptions) {
  const pub = createClient(options);
  const sub = pub.duplicate();
  await Promise.all([pub.connect(), sub.connect()]);
  return createAdapter(pub, sub);
}
