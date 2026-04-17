import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth';
import * as controllers from './application/controllers';
import * as features from './application/features';
import * as gateways from './application/gateways';
import * as reactions from './application/reactions';
import * as services from './application/services';
import * as entities from './domain/entities';
import * as repositories from './infrastructure/repositories';

@Module({
  imports: [TypeOrmModule.forFeature(Object.values(entities)), AuthModule],
  controllers: Object.values(controllers),
  providers: [
    ...Object.values(services),
    ...Object.values(repositories),
    ...Object.values(features),
    ...Object.values(reactions),
    ...Object.values(gateways),
  ],
  exports: [...Object.values(repositories), services.AttachmentService],
})
export class WorkspaceModule {}
