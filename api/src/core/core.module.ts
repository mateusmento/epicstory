import { Global, Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypedConfigModule, dotenvLoader } from 'nest-typed-config';
import { AppConfig } from './app.config';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [
    TypedConfigModule.forRoot({
      isGlobal: true,
      schema: AppConfig,
      load: dotenvLoader({ expandVariables: true }),
    }),
    CqrsModule.forRoot(),
    EventEmitterModule.forRoot({ global: true }),
  ],
  providers: [RedisService],
  exports: [RedisService],
})
export class CoreModule {}
