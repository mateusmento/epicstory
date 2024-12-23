import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CoreModule } from './core/core.module';
import { WorkspaceModule } from './workspace/workspace.module';
import { ChannelModule } from './channel/channel.module';
import { typeorm } from './core/typeorm';
import { ProjectModule } from './project/project.module';

@Module({
  imports: [
    CoreModule,
    typeorm.createModule(
      typeorm.postgres(() => ({
        synchronize: true,
      })),
    ),
    AuthModule,
    WorkspaceModule,
    ProjectModule,
    ChannelModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
