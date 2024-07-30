import { Global, Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypedConfigModule, dotenvLoader } from 'nest-typed-config';
import { AppConfig } from './app.config';
import { JwtStrategy } from './auth/jwt.strategy';
import { AuthModule } from 'src/auth';

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
    AuthModule,
  ],
  providers: [JwtStrategy],
})
export class CoreModule {}
