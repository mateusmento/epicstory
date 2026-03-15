import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CoreModule } from './core/core.module';
import { WorkspaceModule } from './workspace/workspace.module';
import { ChannelModule } from './channel/channel.module';
import { ProjectModule } from './project/project.module';
import { NotificationsModule } from './notifications/notifications.module';
import { LinearIntegrationModule } from './integrations/linear/linear.module';

@Module({
  imports: [
    AuthModule,
    CoreModule,
    WorkspaceModule,
    ProjectModule,
    ChannelModule,
    NotificationsModule,
    LinearIntegrationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
