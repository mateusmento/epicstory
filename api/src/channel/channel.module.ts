import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth';
import { WorkspaceModule } from 'src/workspace/workspace.module';
import * as controllers from './application/controllers';
import * as features from './application/features';
import * as gateways from './application/gateways';
import * as services from './application/services';
import * as entities from './domain/entities';
import * as repositories from './infrastructure/repositories';

@Module({
  imports: [
    TypeOrmModule.forFeature(Object.values(entities)),
    AuthModule,
    WorkspaceModule,
  ],
  controllers: Object.values(controllers),
  providers: [
    ...Object.values(repositories),
    ...Object.values(services),
    ...Object.values(features),
    ...Object.values(gateways),
  ].flat(),
})
export class ChannelModule {}
