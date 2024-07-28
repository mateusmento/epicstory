import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CoreModule } from './core/core.module';
import { createTypeOrmModule } from './core/typeorm';
import { WorkspaceModule } from './workspace/workspace.module';
import { ChannelModule } from './channel/channel.module';

@Module({
  imports: [
    CoreModule,
    createTypeOrmModule(),
    AuthModule,
    WorkspaceModule,
    ChannelModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
