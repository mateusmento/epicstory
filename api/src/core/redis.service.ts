import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient } from 'redis';
import { AppConfig } from './app.config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private _client?: ReturnType<typeof createClient>;

  constructor(private config: AppConfig) {}

  get client(): ReturnType<typeof createClient> {
    if (!this._client) throw new Error('Redis client not initialized');
    return this._client;
  }

  async onModuleInit() {
    if (this._client) return;
    const client = createClient({ url: this.config.REDIS_URL });
    client.on('error', (err) => console.error('Redis client error', err));
    await client.connect();
    this._client = client;
  }

  async onModuleDestroy() {
    try {
      await this._client?.quit();
    } finally {
      this._client = undefined;
    }
  }
}
