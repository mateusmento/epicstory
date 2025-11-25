import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CoreModule } from './core/core.module';
import { WorkspaceModule } from './workspace/workspace.module';
import { ChannelModule } from './channel/channel.module';
import { typeorm } from './core/typeorm';
import { ProjectModule } from './project/project.module';
import { NotificationsModule } from './notifications/notifications.module';

import entities from './core/typeorm/entities';
import { migrations } from './core/typeorm/migrations';

@Module({
  imports: [
    CoreModule,
    typeorm.createModule(
      typeorm.postgres((config) => ({
        logging: config.DEBUG ? 'all' : false,
        autoLoadEntities: false,
        entities,
        migrations: migrations(),
      })),
    ),
    AuthModule,
    WorkspaceModule,
    ProjectModule,
    ChannelModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
