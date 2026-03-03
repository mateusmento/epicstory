import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ChannelModule } from './channel/channel.module';
import { CoreModule } from './core/core.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ProjectModule } from './project/project.module';
import { SearchModule } from './search/search.module';
import { WorkspaceModule } from './workspace/workspace.module';

@Module({
  imports: [
    AuthModule,
    CoreModule,
    WorkspaceModule,
    ProjectModule,
    ChannelModule,
    SearchModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
