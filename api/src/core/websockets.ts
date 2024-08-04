import { INestApplication } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { RedisClientOptions, createClient } from 'redis';
import { ServerOptions } from 'socket.io';

export class SocketIoAdapter extends IoAdapter {
  constructor(
    app: INestApplication,
    private options: Partial<ServerOptions>,
  ) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions) {
    return super.createIOServer(port, { ...options, ...this.options });
  }
}

export async function createRedisAdapter(options: RedisClientOptions) {
  const pub = createClient(options);
  const sub = pub.duplicate();
  await Promise.all([pub.connect(), sub.connect()]);
  return createAdapter(pub, sub);
}
