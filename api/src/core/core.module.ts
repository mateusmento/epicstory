import { Global, Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypedConfigModule, dotenvLoader } from 'nest-typed-config';
import { AppConfig } from 'src/app.config';
import { AuthUserService } from './auth-user.service';

@Global()
@Module({
  imports: [
    TypedConfigModule.forRoot({
      isGlobal: true,
      schema: AppConfig,
      load: dotenvLoader({
        expandVariables: true,
      }),
    }),
    CqrsModule.forRoot(),
    EventEmitterModule.forRoot({ global: true }),
  ],
  providers: [AuthUserService],
  exports: [AuthUserService],
})
export class CoreModule {}
