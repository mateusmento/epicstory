import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as entities from './entities';
import * as controllers from './controllers';
import * as repositories from './repositories';
import * as features from './features';
import * as jobs from './jobs';

@Module({
  imports: [TypeOrmModule.forFeature(Object.values(entities))],
  controllers: [...Object.values(controllers)],
  providers: [
    ...Object.values(repositories),
    ...Object.values(features),
    ...Object.values(jobs),
  ],
  exports: [...Object.values(repositories)],
})
export class SchedulingModule {}
